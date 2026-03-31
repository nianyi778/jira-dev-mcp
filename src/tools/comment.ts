import { z } from 'zod';
import { ensureJiraCredentials, loadResolvedConfig } from '../config.js';
import { addCommentWithConfirmation, editCommentWithConfirmation } from '../jira-client.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';

export const addCommentSchema = z.object({
  key: z.string().describe('Jira issue key (e.g. AT-123)'),
  body: z.string().describe('Comment text (plain text, will be wrapped in ADF paragraph)'),
  confirm_token: z.string().optional().describe('Confirmation token returned by the preview step in manual mode'),
});

export const editCommentSchema = z.object({
  key: z.string().describe('Jira issue key (e.g. AT-123)'),
  commentId: z.string().describe('Existing Jira comment id'),
  body: z.string().describe('Updated comment text (plain text, will be wrapped in ADF paragraph)'),
  confirm_token: z.string().optional().describe('Confirmation token returned by the preview step in manual mode'),
});

export async function handleAddComment(
  args: unknown,
  extra?: RequestHandlerExtra<ServerRequest, ServerNotification>,
) {
  const { key: rawKey, body: rawBody, confirm_token } = addCommentSchema.parse(args);
  const key = rawKey.trim().toUpperCase();
  const body = rawBody.trim();

  if (!key || !body) {
    throw new Error('jira_add_comment requires key and body');
  }

  const config = await loadResolvedConfig();
  ensureJiraCredentials(config);

  return addCommentWithConfirmation(config, { key, body, confirmToken: confirm_token?.trim() }, extra?.sessionId);
}

export async function handleEditComment(
  args: unknown,
  extra?: RequestHandlerExtra<ServerRequest, ServerNotification>,
) {
  const { key: rawKey, commentId: rawCommentId, body: rawBody, confirm_token } = editCommentSchema.parse(args);
  const key = rawKey.trim().toUpperCase();
  const commentId = rawCommentId.trim();
  const body = rawBody.trim();

  if (!key || !commentId || !body) {
    throw new Error('jira_edit_comment requires key, commentId, and body');
  }

  const config = await loadResolvedConfig();
  ensureJiraCredentials(config);

  return editCommentWithConfirmation(config, { key, commentId, body, confirmToken: confirm_token?.trim() }, extra?.sessionId);
}
