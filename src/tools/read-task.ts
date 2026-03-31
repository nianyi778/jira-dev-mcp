import { ensureJiraCredentials, getProjectPath, loadResolvedConfig } from '../config.js';
import { formatIssueDetail } from '../format.js';
import { readIssue } from '../jira-client.js';
import type { ResponseFormat } from '../types.js';

function inferProjectKey(key: string): string {
  const match = key.toUpperCase().match(/^([A-Z][A-Z0-9]+)-\d+$/);
  if (!match) {
    return key.toUpperCase();
  }
  return match[1];
}

export async function handleReadTask(args: unknown) {
  if (!args || typeof args !== 'object') {
    throw new Error('jira_read_task requires key');
  }

  const key = String((args as Record<string, unknown>).key || '').trim().toUpperCase();
  if (!key) {
    throw new Error('jira_read_task requires key');
  }

  const includeComments = Boolean((args as Record<string, unknown>).includeComments);
  const commentStartAt = Number((args as Record<string, unknown>).commentStartAt || 0);
  const commentMaxResults = Number((args as Record<string, unknown>).commentMaxResults || 20);
  const changelogStartAt = Number((args as Record<string, unknown>).changelogStartAt || 0);
  const changelogMaxResults = Number((args as Record<string, unknown>).changelogMaxResults || 20);
  const responseFormat = ((args as Record<string, unknown>).response_format || 'json') as ResponseFormat;

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
    text: formatIssueDetail(responseFormat, payload),
    data: payload,
  };
}
