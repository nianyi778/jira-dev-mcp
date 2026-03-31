import type { DownloadAttachmentInput, DownloadedAttachment, ResolvedConfig } from './types.js';
import { buildAuthHeader, fetchWithRetry, isTextMimeType, matchesMimeType } from './jira-http.js';
import {
  parseAttachmentWithPython,
  truncateText,
  MAX_INLINE_ATTACHMENT_BYTES,
  PARSEABLE_ATTACHMENT_MIME_TYPES,
} from './jira-attachment.js';
import { getIssue } from './jira-issue-read.js';

export async function downloadAttachment(config: ResolvedConfig, input: DownloadAttachmentInput): Promise<DownloadedAttachment> {
  const issue = await getIssue(config, input.key);
  const attachment = (issue.fields.attachment || []).find((item) => item.filename === input.filename);
  if (!attachment) { throw new Error(`Attachment not found on ${input.key}: ${input.filename}`); }
  if (attachment.size > config.security.maxAttachmentSizeBytes) {
    throw new Error(`Attachment exceeds max size limit of ${config.security.maxAttachmentSizeBytes} bytes`);
  }
  if (!matchesMimeType(attachment.mimeType, config.security.allowedMimeTypes)) {
    throw new Error(`Attachment MIME type not allowed: ${attachment.mimeType}`);
  }

  const response = await fetchWithRetry(attachment.content, {
    headers: { Authorization: buildAuthHeader(config), Accept: '*/*' },
  }, {
    timeoutMs: 30_000,
    requestLabel: 'Attachment download',
  });

  const buffer = Buffer.from(await response.arrayBuffer());

  if (PARSEABLE_ATTACHMENT_MIME_TYPES.has(attachment.mimeType)) {
    const parsed = await parseAttachmentWithPython(attachment.filename, buffer);
    if (parsed) {
      return { issueKey: issue.key, filename: attachment.filename, mimeType: attachment.mimeType, size: attachment.size, encoding: 'utf8', content: parsed.content, truncated: parsed.truncated, parsed: parsed.parsed };
    }
  }

  if (isTextMimeType(attachment.mimeType)) {
    const truncated = truncateText(buffer.toString('utf8'), MAX_INLINE_ATTACHMENT_BYTES);
    return { issueKey: issue.key, filename: attachment.filename, mimeType: attachment.mimeType, size: attachment.size, encoding: 'utf8', content: truncated.content, truncated: truncated.truncated };
  }

  const base64Content = buffer.toString('base64');
  const maxBase64Length = Math.floor((MAX_INLINE_ATTACHMENT_BYTES * 4) / 3);
  const truncated = base64Content.length > maxBase64Length;
  return { issueKey: issue.key, filename: attachment.filename, mimeType: attachment.mimeType, size: attachment.size, encoding: 'base64', content: truncated ? `${base64Content.slice(0, maxBase64Length)}... (truncated)` : base64Content, truncated };
}
