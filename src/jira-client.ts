import type {
  DownloadAttachmentInput,
  DownloadedAttachment,
  IssueAttachmentSummary,
  IssueChangelogSummary,
  IssueCommentSummary,
  IssueDetail,
  IssueSummary,
  JiraAttachment,
  JiraCommentPage,
  JiraIssue,
  JiraSearchResponse,
  MyTasksInput,
  ReadIssueInput,
  ResolvedConfig,
  SearchIssuesInput,
} from './types.js';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const DEFAULT_FIELDS = [
  'summary',
  'description',
  'status',
  'assignee',
  'issuetype',
  'priority',
  'labels',
  'attachment',
  'parent',
  'subtasks',
].join(',');
const MAX_INLINE_ATTACHMENT_BYTES = 1024 * 1024;
const PARSEABLE_ATTACHMENT_MIME_TYPES = new Set([
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf',
]);
let parserDependenciesInstalled = false;

export function adfToPlainText(node: unknown): string {
  if (!node || typeof node !== 'object') {
    return '';
  }

  const record = node as { type?: string; text?: string; content?: unknown[] };
  if (record.type === 'text') {
    return record.text || '';
  }
  if (!Array.isArray(record.content)) {
    return '';
  }

  const content = record.content.map(adfToPlainText).filter(Boolean);
  if (record.type === 'paragraph' || record.type === 'heading') {
    return content.join('');
  }
  if (record.type === 'listItem') {
    return `- ${content.join('')}`;
  }
  return content.join('\n');
}

function truncateText(text: string, maxBytes: number): { content: string; truncated: boolean } {
  const buffer = Buffer.from(text, 'utf8');
  if (buffer.length <= maxBytes) {
    return { content: text, truncated: false };
  }

  return {
    content: `${buffer.subarray(0, maxBytes).toString('utf8')}\n... (truncated, total ${buffer.length} bytes)`,
    truncated: true,
  };
}

async function installParserDependencies(): Promise<void> {
  if (parserDependenciesInstalled) {
    return;
  }

  const requirementsPath = new URL('../scripts/requirements.txt', import.meta.url);
  await execFileAsync('python3', ['-m', 'pip', 'install', '-r', fileURLToPath(requirementsPath)], {
    maxBuffer: 2 * 1024 * 1024,
  });
  parserDependenciesInstalled = true;
}

async function parseAttachmentWithPythonOnce(filename: string, input: Buffer): Promise<{
  parsed: DownloadedAttachment['parsed'];
  content: string;
  truncated: boolean;
  error?: string;
} | null> {
  const tempDir = await mkdtemp(join(tmpdir(), 'jira-mcp-server-'));
  const tempPath = join(tempDir, filename);

  try {
    await writeFile(tempPath, input);
    const scriptPath = new URL('../scripts/parse_attachment.py', import.meta.url);
    const { stdout } = await execFileAsync('python3', [fileURLToPath(scriptPath), tempPath], {
      maxBuffer: 2 * 1024 * 1024,
    });
    const parsed = JSON.parse(stdout) as {
      ok: boolean;
      format?: string;
      summary?: string;
      content?: string;
      truncated?: boolean;
      error?: string;
    };
    if (!parsed.ok) {
      return {
        parsed: { format: 'unknown', parser: 'python', summary: '' },
        content: '',
        truncated: false,
        error: parsed.error || 'unknown parser error',
      };
    }
    if (!parsed.format || !parsed.summary || typeof parsed.content !== 'string') {
      return null;
    }

    return {
      parsed: {
        format: parsed.format,
        parser: 'python',
        summary: parsed.summary,
      },
      content: parsed.content,
      truncated: Boolean(parsed.truncated),
    };
  } catch {
    return null;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function parseAttachmentWithPython(filename: string, input: Buffer): Promise<{
  parsed: DownloadedAttachment['parsed'];
  content: string;
  truncated: boolean;
} | null> {
  const firstAttempt = await parseAttachmentWithPythonOnce(filename, input);
  if (!firstAttempt) {
    return null;
  }
  if (!firstAttempt.error) {
    return firstAttempt;
  }

  if (!/required to parse/i.test(firstAttempt.error)) {
    return null;
  }

  try {
    await installParserDependencies();
  } catch {
    return null;
  }

  const secondAttempt = await parseAttachmentWithPythonOnce(filename, input);
  if (!secondAttempt || secondAttempt.error) {
    return null;
  }
  return secondAttempt;
}

function buildAuthHeader(config: ResolvedConfig): string {
  if (config.jira.authMode === 'basic') {
    return `Basic ${Buffer.from(`${config.jira.email}:${config.jira.token}`).toString('base64')}`;
  }

  return `Bearer ${config.jira.token}`;
}

function sanitizeErrorBody(text: string): string {
  if (!text) {
    return '';
  }
  return text.replace(/[A-Za-z0-9_\-]{20,}/g, '[redacted]').slice(0, 500);
}


function matchesMimeType(mimeType: string, allowed: string[]): boolean {
  return allowed.some((pattern) => {
    if (pattern.endsWith('/*')) {
      return mimeType.startsWith(pattern.slice(0, -1));
    }
    return mimeType === pattern;
  });
}

function isTextMimeType(mimeType: string): boolean {
  return mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType.endsWith('+json');
}

export function buildSearchJql(query: string): string {
  const trimmed = query.trim();
  const looksLikeJql = /\b(order\s+by|\s+and\s+|\s+or\s+|project\s*=|assignee\s*=|status\s*=|type\s*=|issuetype\s*=|key\s*=|text\s*~)\b/i.test(trimmed);
  if (looksLikeJql) {
    return trimmed;
  }

  const escaped = trimmed.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `text ~ "${escaped}" ORDER BY updated DESC`;
}

async function jiraRequest<T>(config: ResolvedConfig, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${config.jira.baseUrl}${path}`, {
    ...init,
    signal: AbortSignal.timeout(30000),
    headers: {
      Authorization: buildAuthHeader(config),
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Jira API error ${response.status}: ${sanitizeErrorBody(await response.text())}`);
  }

  return response.json() as Promise<T>;
}

function mapIssueSummary(issue: JiraIssue): IssueSummary {
  return {
    key: issue.key,
    summary: issue.fields.summary,
    status: issue.fields.status?.name || null,
    assignee: issue.fields.assignee?.displayName || null,
    issueType: issue.fields.issuetype?.name || null,
    parentKey: issue.fields.parent?.key || null,
  };
}

function mapAttachmentSummary(attachment: JiraAttachment): IssueAttachmentSummary {
  return {
    filename: attachment.filename,
    mimeType: attachment.mimeType,
    size: attachment.size,
    created: attachment.created || null,
    author: attachment.author?.displayName || null,
  };
}

function mapCommentSummary(comment: JiraCommentPage['comments'][number]): IssueCommentSummary {
  return {
    id: comment.id,
    author: comment.author?.displayName || null,
    created: comment.created,
    updated: comment.updated || null,
    bodyPlainText: adfToPlainText(comment.body),
  };
}

function paginateChangelog(issue: JiraIssue, startAt: number, maxResults: number): { total: number; items: IssueChangelogSummary[] } {
  const histories = issue.changelog?.histories || [];
  const slice = histories.slice(startAt, startAt + maxResults);
  return {
    total: histories.length,
    items: slice.map((history) => ({
      id: history.id,
      author: history.author?.displayName || null,
      created: history.created,
      items: history.items.map((item) => ({
        field: item.field,
        from: item.fromString || item.from || null,
        to: item.toString || item.to || null,
      })),
    })),
  };
}

export async function searchIssues(config: ResolvedConfig, input: SearchIssuesInput): Promise<{ query: string; startAt: number; maxResults: number; total: number; issues: IssueSummary[] }> {
  const maxResults = Math.min(Math.max(input.maxResults || 10, 1), 50);
  const startAt = Math.max(input.startAt || 0, 0);
  const jql = buildSearchJql(input.query);
  const params = new URLSearchParams({
    jql,
    startAt: String(startAt),
    maxResults: String(maxResults),
    fields: 'summary,status,assignee,issuetype,parent',
  });

  const data = await jiraRequest<JiraSearchResponse>(config, `/rest/api/3/search?${params.toString()}`);
  return {
    query: jql,
    startAt: data.startAt,
    maxResults: data.maxResults,
    total: data.total,
    issues: data.issues.map(mapIssueSummary),
  };
}

async function getIssue(config: ResolvedConfig, key: string): Promise<JiraIssue> {
  const params = new URLSearchParams({
    fields: DEFAULT_FIELDS,
    expand: 'changelog',
  });
  return jiraRequest<JiraIssue>(config, `/rest/api/3/issue/${encodeURIComponent(key)}?${params.toString()}`);
}

async function getComments(config: ResolvedConfig, key: string, startAt: number, maxResults: number): Promise<JiraCommentPage> {
  const params = new URLSearchParams({
    startAt: String(startAt),
    maxResults: String(maxResults),
    orderBy: '-created',
  });
  return jiraRequest<JiraCommentPage>(config, `/rest/api/3/issue/${encodeURIComponent(key)}/comment?${params.toString()}`);
}

export async function readIssue(config: ResolvedConfig, input: ReadIssueInput): Promise<IssueDetail> {
  const commentStartAt = Math.max(input.commentStartAt || 0, 0);
  const commentMaxResults = Math.min(Math.max(input.commentMaxResults || 20, 1), 50);
  const changelogStartAt = Math.max(input.changelogStartAt || 0, 0);
  const changelogMaxResults = Math.min(Math.max(input.changelogMaxResults || 20, 1), 100);
  const issue = await getIssue(config, input.key);
  const commentPage = input.includeComments
    ? await getComments(config, input.key, commentStartAt, commentMaxResults)
    : null;
  const changelog = paginateChangelog(issue, changelogStartAt, changelogMaxResults);

  return {
    key: issue.key,
    summary: issue.fields.summary,
    descriptionPlainText: adfToPlainText(issue.fields.description),
    status: issue.fields.status?.name || null,
    assignee: issue.fields.assignee?.displayName || null,
    issueType: issue.fields.issuetype?.name || null,
    priority: issue.fields.priority?.name || null,
    labels: issue.fields.labels || [],
    parent: issue.fields.parent
      ? {
          key: issue.fields.parent.key,
          summary: issue.fields.parent.fields?.summary || null,
        }
      : null,
    subtasks: (issue.fields.subtasks || []).map((subtask) => ({
      key: subtask.key,
      summary: subtask.fields.summary,
      status: subtask.fields.status?.name || null,
      assignee: subtask.fields.assignee?.displayName || null,
      issueType: 'Sub-task',
      parentKey: issue.key,
    })),
    attachments: (issue.fields.attachment || []).map(mapAttachmentSummary),
    comments: {
      enabled: Boolean(input.includeComments),
      startAt: commentPage?.startAt || 0,
      maxResults: commentPage?.maxResults || 0,
      total: commentPage?.total || 0,
      items: (commentPage?.comments || []).map(mapCommentSummary),
    },
    changelog: {
      startAt: changelogStartAt,
      maxResults: changelogMaxResults,
      total: changelog.total,
      items: changelog.items,
    },
  };
}

export async function downloadAttachment(config: ResolvedConfig, input: DownloadAttachmentInput): Promise<DownloadedAttachment> {
  const issue = await getIssue(config, input.key);
  const attachment = (issue.fields.attachment || []).find((item) => item.filename === input.filename);
  if (!attachment) {
    throw new Error(`Attachment not found on ${input.key}: ${input.filename}`);
  }
  if (attachment.size > config.security.maxAttachmentSizeBytes) {
    throw new Error(`Attachment exceeds max size limit of ${config.security.maxAttachmentSizeBytes} bytes`);
  }
  if (!matchesMimeType(attachment.mimeType, config.security.allowedMimeTypes)) {
    throw new Error(`Attachment MIME type not allowed: ${attachment.mimeType}`);
  }

  const response = await fetch(attachment.content, {
    headers: {
      Authorization: buildAuthHeader(config),
      Accept: '*/*',
    },
  });
  if (!response.ok) {
    throw new Error(`Attachment download failed with status ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (PARSEABLE_ATTACHMENT_MIME_TYPES.has(attachment.mimeType)) {
    const parsed = await parseAttachmentWithPython(attachment.filename, buffer);
    if (parsed) {
      return {
        issueKey: issue.key,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: attachment.size,
        encoding: 'utf8',
        content: parsed.content,
        truncated: parsed.truncated,
        parsed: parsed.parsed,
      };
    }
  }

  if (isTextMimeType(attachment.mimeType)) {
    const truncated = truncateText(buffer.toString('utf8'), MAX_INLINE_ATTACHMENT_BYTES);
    return {
      issueKey: issue.key,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      encoding: 'utf8',
      content: truncated.content,
      truncated: truncated.truncated,
    };
  }

  const base64Content = buffer.toString('base64');
  const maxBase64Length = Math.floor((MAX_INLINE_ATTACHMENT_BYTES * 4) / 3);
  const truncated = base64Content.length > maxBase64Length;
  return {
    issueKey: issue.key,
    filename: attachment.filename,
    mimeType: attachment.mimeType,
    size: attachment.size,
    encoding: 'base64',
    content: truncated ? `${base64Content.slice(0, maxBase64Length)}... (truncated)` : base64Content,
    truncated,
  };
}

export async function getMyTasks(config: ResolvedConfig, input: MyTasksInput): Promise<{ query: string; startAt: number; maxResults: number; total: number; issues: IssueSummary[] }> {
  const clauses = ['assignee = currentUser()'];
  if (input.status) {
    clauses.push(`status = "${input.status.replace(/"/g, '\\"')}"`);
  }

  return searchIssues(config, {
    query: `${clauses.join(' AND ')} ORDER BY updated DESC`,
    maxResults: input.maxResults,
    startAt: input.startAt,
  });
}

