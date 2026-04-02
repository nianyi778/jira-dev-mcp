import type { AddCommentInput, AddCommentResult, EditCommentInput, ResolvedConfig } from './types.js';
import { jiraRequest } from './jira-http.js';
import { randomUUID } from 'node:crypto';

const DEFAULT_REMINDER_CONTEXT = 'default';
const CONFIRMATION_TTL_MS = 10 * 60 * 1000;
const remindedContexts = new Set<string>();

// In-process store for pending confirmation tokens.
// Intentionally in-memory: tokens expire after CONFIRMATION_TTL_MS (10 min) and are
// only meaningful within a single server session. If the server restarts, all pending
// tokens are cleared and the user must request a new preview — this is expected behavior.
const pendingCommentConfirmations = new Map<string, {
  action: 'add' | 'edit';
  key: string;
  commentId?: string;
  body: string;
  contextKey: string;
  expiresAt: number;
}>();

function buildContextKey(contextKey?: string): string {
  return contextKey || DEFAULT_REMINDER_CONTEXT;
}

function evictExpiredConfirmations(): void {
  const now = Date.now();
  for (const [token, pending] of pendingCommentConfirmations) {
    if (pending.expiresAt < now) {
      pendingCommentConfirmations.delete(token);
    }
  }
}

function createCommentPreview(
  input: AddCommentInput | EditCommentInput,
  contextKey?: string,
  action: 'add' | 'edit' = 'add',
): AddCommentResult {
  evictExpiredConfirmations();

  const resolvedContextKey = buildContextKey(contextKey);
  const confirmationToken = randomUUID();
  pendingCommentConfirmations.set(confirmationToken, {
    action,
    key: input.key,
    commentId: 'commentId' in input ? input.commentId : undefined,
    body: input.body,
    contextKey: resolvedContextKey,
    expiresAt: Date.now() + CONFIRMATION_TTL_MS,
  });

  // When contextKey is undefined (no sessionId from transport), always show the reminder —
  // we cannot track per-session state without an identifier.
  const hasSession = Boolean(contextKey);
  const reminder = !hasSession || !remindedContexts.has(resolvedContextKey)
    ? '当前为手动确认模式。发送评论前我会先列出拟发送内容并等待确认。这个行为可配置为自动发送。'
    : undefined;
  if (hasSession) {
    if (remindedContexts.size > 500) { remindedContexts.clear(); }
    remindedContexts.add(resolvedContextKey);
  }

  return {
    posted: false,
    requiresConfirmation: true,
    commentId: '',
    url: '',
    preview: {
      key: input.key,
      commentId: 'commentId' in input ? input.commentId : undefined,
      body: input.body,
    },
    mode: 'manual',
    reminder,
    confirmationToken,
  };
}

function buildCommentUrl(config: ResolvedConfig, issueKey: string, commentId: string): string {
  const browseBase = config.jira.browseUrl
    ?? (config.jira.baseUrl?.startsWith('https://api.atlassian.com') ? '' : config.jira.baseUrl)
    ?? '';
  return browseBase ? `${browseBase}/browse/${issueKey}?focusedCommentId=${commentId}` : '';
}

function buildAdfBody(text: string) {
  return {
    body: {
      type: 'doc',
      version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
    },
  };
}

export async function addComment(
  config: ResolvedConfig,
  input: AddCommentInput,
  contextKey?: string,
): Promise<AddCommentResult> {
  const mode = config.preferences.commentMode;
  if (mode === 'manual') {
    return createCommentPreview(input, contextKey, 'add');
  }

  const data = await jiraRequest<{ id: string }>(config, `/rest/api/3/issue/${encodeURIComponent(input.key)}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildAdfBody(input.body)),
  });

  return {
    posted: true,
    requiresConfirmation: false,
    commentId: data.id,
    url: buildCommentUrl(config, input.key, data.id),
    preview: {
      key: input.key,
      body: input.body,
    },
    mode,
  };
}

export async function editComment(
  config: ResolvedConfig,
  input: EditCommentInput,
  contextKey?: string,
): Promise<AddCommentResult> {
  const mode = config.preferences.commentMode;
  if (mode === 'manual') {
    return createCommentPreview(input, contextKey, 'edit');
  }

  await jiraRequest<{ id: string }>(
    config,
    `/rest/api/3/issue/${encodeURIComponent(input.key)}/comment/${encodeURIComponent(input.commentId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildAdfBody(input.body)),
    },
  );

  return {
    posted: true,
    requiresConfirmation: false,
    commentId: input.commentId,
    url: buildCommentUrl(config, input.key, input.commentId),
    preview: {
      key: input.key,
      commentId: input.commentId,
      body: input.body,
    },
    mode,
  };
}

export async function addCommentWithConfirmation(
  config: ResolvedConfig,
  input: AddCommentInput,
  contextKey?: string,
): Promise<AddCommentResult> {
  if (config.preferences.commentMode === 'manual') {
    if (!input.confirmToken) {
      return createCommentPreview(input, contextKey, 'add');
    }

    const pending = pendingCommentConfirmations.get(input.confirmToken);
    if (!pending || pending.expiresAt < Date.now()) {
      pendingCommentConfirmations.delete(input.confirmToken);
      // Token expired or server restarted — generate a fresh preview
      return createCommentPreview(input, contextKey, 'add');
    }

    const resolvedContextKey = buildContextKey(contextKey);
    if (pending.action !== 'add' || pending.key !== input.key || pending.body !== input.body || pending.contextKey !== resolvedContextKey) {
      pendingCommentConfirmations.delete(input.confirmToken);
      throw new Error('Confirmation token does not match the pending comment. The comment body or issue key may have changed. Please request a new preview.');
    }

    pendingCommentConfirmations.delete(input.confirmToken);
  }

  const nextConfig = config.preferences.commentMode === 'manual'
    ? {
        ...config,
        preferences: {
          ...config.preferences,
          commentMode: 'auto' as const,
        },
      }
    : config;
  return addComment(nextConfig, input, contextKey);
}

export async function editCommentWithConfirmation(
  config: ResolvedConfig,
  input: EditCommentInput,
  contextKey?: string,
): Promise<AddCommentResult> {
  if (config.preferences.commentMode === 'manual') {
    if (!input.confirmToken) {
      return createCommentPreview(input, contextKey, 'edit');
    }

    const pending = pendingCommentConfirmations.get(input.confirmToken);
    if (!pending || pending.expiresAt < Date.now()) {
      pendingCommentConfirmations.delete(input.confirmToken);
      // Token expired or server restarted — generate a fresh preview
      return createCommentPreview(input, contextKey, 'edit');
    }

    const resolvedContextKey = buildContextKey(contextKey);
    if (
      pending.action !== 'edit'
      || pending.key !== input.key
      || pending.commentId !== input.commentId
      || pending.body !== input.body
      || pending.contextKey !== resolvedContextKey
    ) {
      pendingCommentConfirmations.delete(input.confirmToken);
      throw new Error('Confirmation token does not match the pending edit. The comment body, issue key, or comment ID may have changed. Please request a new preview.');
    }

    pendingCommentConfirmations.delete(input.confirmToken);
  }

  const nextConfig = config.preferences.commentMode === 'manual'
    ? {
        ...config,
        preferences: {
          ...config.preferences,
          commentMode: 'auto' as const,
        },
      }
    : config;
  return editComment(nextConfig, input, contextKey);
}
