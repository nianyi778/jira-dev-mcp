import { ensureJiraCredentials, loadResolvedConfig } from '../config.js';
import { addCommentWithConfirmation, editCommentWithConfirmation } from '../jira-client.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';

export async function handleAddComment(
  args: unknown,
  extra?: RequestHandlerExtra<ServerRequest, ServerNotification>,
) {
  if (!args || typeof args !== 'object') {
    throw new Error('jira_add_comment requires key and body');
  }

  const key = String((args as Record<string, unknown>).key || '').trim().toUpperCase();
  const body = String((args as Record<string, unknown>).body || '').trim();
  const confirmToken = typeof (args as Record<string, unknown>).confirm_token === 'string'
    ? String((args as Record<string, unknown>).confirm_token).trim()
    : undefined;

  if (!key || !body) {
    throw new Error('jira_add_comment requires key and body');
  }

  const config = await loadResolvedConfig();
  ensureJiraCredentials(config);

  return addCommentWithConfirmation(config, { key, body, confirmToken }, extra?.sessionId);
}

export async function handleEditComment(
  args: unknown,
  extra?: RequestHandlerExtra<ServerRequest, ServerNotification>,
) {
  if (!args || typeof args !== 'object') {
    throw new Error('jira_edit_comment requires key, commentId, and body');
  }

  const key = String((args as Record<string, unknown>).key || '').trim().toUpperCase();
  const commentId = String((args as Record<string, unknown>).commentId || '').trim();
  const body = String((args as Record<string, unknown>).body || '').trim();
  const confirmToken = typeof (args as Record<string, unknown>).confirm_token === 'string'
    ? String((args as Record<string, unknown>).confirm_token).trim()
    : undefined;

  if (!key || !commentId || !body) {
    throw new Error('jira_edit_comment requires key, commentId, and body');
  }

  const config = await loadResolvedConfig();
  ensureJiraCredentials(config);

  return editCommentWithConfirmation(config, { key, commentId, body, confirmToken }, extra?.sessionId);
}
