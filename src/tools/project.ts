import { getProjectPath, setProjectPath } from '../config.js';
import { formatProjectPath } from '../format.js';
import type { ResponseFormat } from '../types.js';

export async function handleSetProjectPath(args: unknown): Promise<{ projectKey: string; localPath: string }> {
  if (!args || typeof args !== 'object') {
    throw new Error('jira_set_project_path requires jiraProject and localPath');
  }

  const projectKey = String((args as Record<string, unknown>).jiraProject || '').trim();
  const localPath = String((args as Record<string, unknown>).localPath || '').trim();
  if (!projectKey || !localPath) {
    throw new Error('jira_set_project_path requires jiraProject and localPath');
  }

  return setProjectPath(projectKey, localPath);
}

export async function handleGetProjectPath(args: unknown): Promise<{ text: string; data: { projectKey: string; localPath: string | null } }> {
  if (!args || typeof args !== 'object') {
    throw new Error('jira_get_project_path requires jiraProject');
  }

  const projectKey = String((args as Record<string, unknown>).jiraProject || '').trim().toUpperCase();
  const responseFormat = ((args as Record<string, unknown>).response_format || 'json') as ResponseFormat;
  if (!projectKey) {
    throw new Error('jira_get_project_path requires jiraProject');
  }

  const payload = {
    projectKey,
    localPath: await getProjectPath(projectKey),
  };
  return {
    text: formatProjectPath(responseFormat, payload),
    data: payload,
  };
}
