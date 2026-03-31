import { ensureJiraCredentials, loadResolvedConfig } from '../config.js';
import { formatAttachment } from '../format.js';
import { downloadAttachment } from '../jira-client.js';
import type { ResponseFormat } from '../types.js';

export async function handleDownloadAttachment(args: unknown) {
  if (!args || typeof args !== 'object') {
    throw new Error('jira_download_attachment requires key and filename');
  }

  const key = String((args as Record<string, unknown>).key || '').trim().toUpperCase();
  const filename = String((args as Record<string, unknown>).filename || '').trim();
  const responseFormat = ((args as Record<string, unknown>).response_format || 'json') as ResponseFormat;
  if (!key || !filename) {
    throw new Error('jira_download_attachment requires key and filename');
  }

  const config = await loadResolvedConfig();
  ensureJiraCredentials(config);
  const attachment = await downloadAttachment(config, { key, filename });

  const payload = {
    attachment,
    warnings: config.warnings,
  };
  return {
    text: formatAttachment(responseFormat, payload),
    data: payload,
  };
}
