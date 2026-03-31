import { ensureJiraCredentials, loadResolvedConfig } from '../config.js';
import { addComment } from '../jira-client.js';

export async function handleAddComment(args: unknown): Promise<{ commentId: string; url: string }> {
  if (!args || typeof args !== 'object') {
    throw new Error('jira_add_comment requires key and body');
  }

  const key = String((args as Record<string, unknown>).key || '').trim().toUpperCase();
  const body = String((args as Record<string, unknown>).body || '').trim();

  if (!key || !body) {
    throw new Error('jira_add_comment requires key and body');
  }

  const config = await loadResolvedConfig();
  ensureJiraCredentials(config);

  return addComment(config, { key, body });
}
