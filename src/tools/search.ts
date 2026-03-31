import { ensureJiraCredentials, loadResolvedConfig } from '../config.js';
import { formatIssueList } from '../format.js';
import { searchIssues } from '../jira-client.js';
import type { ResponseFormat } from '../types.js';

export async function handleJiraSearch(args: unknown) {
  if (!args || typeof args !== 'object') {
    throw new Error('jira_search_issues requires query');
  }

  const query = String((args as Record<string, unknown>).query || '').trim();
  const maxResults = Number((args as Record<string, unknown>).maxResults || 10);
  const startAt = Number((args as Record<string, unknown>).startAt || 0);
  const responseFormat = ((args as Record<string, unknown>).response_format || 'json') as ResponseFormat;
  if (!query) {
    throw new Error('jira_search_issues requires query');
  }

  const config = await loadResolvedConfig();
  ensureJiraCredentials(config);
  const result = await searchIssues(config, { query, maxResults, startAt });
  const nextOffset = result.startAt + result.issues.length;
  const payload = {
    ...result,
    has_more: result.issues.length > 0 && nextOffset < result.total,
    next_offset: result.issues.length > 0 && nextOffset < result.total ? nextOffset : null,
    warnings: config.warnings,
  };
  return {
    text: formatIssueList('Jira Search Results', responseFormat, payload),
    data: payload,
  };
}
