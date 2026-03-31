import { ensureJiraCredentials, loadResolvedConfig } from '../config.js';
import { formatIssueList } from '../format.js';
import { getMyTasks } from '../jira-client.js';
import type { ResponseFormat } from '../types.js';

export async function handleMyTasks(args: unknown) {
  const rawArgs = (args || {}) as Record<string, unknown>;
  const status = typeof rawArgs.status === 'string' ? rawArgs.status.trim() : undefined;
  const maxResults = Number(rawArgs.maxResults || 10);
  const startAt = Number(rawArgs.startAt || 0);
  const responseFormat = (rawArgs.response_format || 'json') as ResponseFormat;

  const config = await loadResolvedConfig();
  ensureJiraCredentials(config);
  const result = await getMyTasks(config, { status, maxResults, startAt });

  const nextOffset = result.startAt + result.issues.length;
  const payload = {
    ...result,
    has_more: result.issues.length > 0 && nextOffset < result.total,
    next_offset: result.issues.length > 0 && nextOffset < result.total ? nextOffset : null,
    warnings: config.warnings,
  };
  return {
    text: formatIssueList('My Jira Tasks', responseFormat, payload),
    data: payload,
  };
}
