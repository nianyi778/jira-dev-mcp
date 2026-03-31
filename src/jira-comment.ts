import type { AddCommentInput, AddCommentResult, ResolvedConfig } from './types.js';
import { jiraRequest } from './jira-http.js';

export async function addComment(config: ResolvedConfig, input: AddCommentInput): Promise<AddCommentResult> {
  const body = { body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: input.body }] }] } };
  const data = await jiraRequest<{ id: string }>(config, `/rest/api/3/issue/${encodeURIComponent(input.key)}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const browseBase = config.jira.browseUrl
    ?? (config.jira.baseUrl?.startsWith('https://api.atlassian.com') ? '' : config.jira.baseUrl)
    ?? '';
  const url = browseBase ? `${browseBase}/browse/${input.key}?focusedCommentId=${data.id}` : '';
  return { commentId: data.id, url };
}
