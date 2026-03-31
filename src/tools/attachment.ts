import { z } from 'zod';
import { ensureJiraCredentials, loadResolvedConfig } from '../config.js';
import { formatAttachment } from '../format.js';
import { downloadAttachment } from '../jira-client.js';

export const downloadAttachmentSchema = z.object({
  key: z.string().describe('Jira issue key (e.g. AT-123)'),
  filename: z.string().describe('Attachment filename as listed in jira_read_task'),
  response_format: z.enum(['json', 'markdown']).optional().describe('Output format (default json)'),
});

export async function handleDownloadAttachment(args: unknown) {
  const { key: rawKey, filename: rawFilename, response_format } = downloadAttachmentSchema.parse(args);
  const key = rawKey.trim().toUpperCase();
  const filename = rawFilename.trim();
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
    text: formatAttachment(response_format ?? 'json', payload),
    data: payload,
  };
}
