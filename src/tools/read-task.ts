import { z } from 'zod';
import { ensureJiraCredentials, getProjectPath, loadResolvedConfig } from '../config.js';
import { formatIssueDetail } from '../format.js';
import { readIssue } from '../jira-client.js';

export const readTaskSchema = z.object({
  key: z.string().describe('Jira issue key (e.g. AT-123)'),
  includeComments: z.boolean().optional().describe('Include comments (default false)'),
  commentStartAt: z.number().int().min(0).optional().describe('Comment pagination offset'),
  commentMaxResults: z.number().int().min(1).max(50).optional().describe('Max comments (1-50, default 20)'),
  changelogStartAt: z.number().int().min(0).optional().describe('Changelog pagination offset'),
  changelogMaxResults: z.number().int().min(1).max(100).optional().describe('Max changelog entries (1-100, default 20)'),
  response_format: z.enum(['json', 'markdown']).optional().describe('Output format (default json)'),
});

function inferProjectKey(key: string): string {
  const match = key.toUpperCase().match(/^([A-Z][A-Z0-9]+)-\d+$/);
  if (!match) {
    return key.toUpperCase();
  }
  return match[1];
}

export async function handleReadTask(args: unknown) {
  const { key: rawKey, includeComments, commentStartAt, commentMaxResults, changelogStartAt, changelogMaxResults, response_format } = readTaskSchema.parse(args);
  const key = rawKey.trim().toUpperCase();
  if (!key) {
    throw new Error('jira_read_task requires key');
  }

  const config = await loadResolvedConfig();
  ensureJiraCredentials(config);

  const issue = await readIssue(config, {
    key,
    includeComments,
    commentStartAt,
    commentMaxResults,
    changelogStartAt,
    changelogMaxResults,
  });
  const projectKey = inferProjectKey(key);
  const localPath = await getProjectPath(projectKey);

  const payload = {
    issue,
    project: {
      key: projectKey,
      localPath,
      needsUserInput: !localPath,
    },
    nextStepHint: localPath
      ? `Read code under ${localPath} and explain root cause, plan, impact, and test cases.`
      : `Project path for ${projectKey} is missing. Ask the user to provide it with jira_set_project_path.`,
    warnings: config.warnings,
  };
  return {
    text: formatIssueDetail(response_format ?? 'json', payload),
    data: payload,
  };
}
