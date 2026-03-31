import type { DownloadedAttachment, IssueDetail, IssueSummary, ResponseFormat } from './types.js';

function jsonText(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function formatIssueList(
  title: string,
  responseFormat: ResponseFormat,
  payload: { query: string; startAt: number; maxResults: number; total: number; has_more: boolean; next_offset: number | null; issues: IssueSummary[]; warnings?: string[] }
): string {
  if (responseFormat === 'json') {
    return jsonText(payload);
  }

  const lines = [
    `# ${title}`,
    '',
    `- Query: ${payload.query}`,
    `- Total: ${payload.total}`,
    `- Offset: ${payload.startAt}`,
    `- Limit: ${payload.maxResults}`,
    `- Has more: ${payload.has_more ? 'yes' : 'no'}`,
    '',
  ];

  for (const issue of payload.issues) {
    lines.push(`## ${issue.key} ${issue.summary}`);
    lines.push(`- Status: ${issue.status || 'Unknown'}`);
    lines.push(`- Assignee: ${issue.assignee || 'Unassigned'}`);
    lines.push(`- Type: ${issue.issueType || 'Unknown'}`);
    if (issue.parentKey) {
      lines.push(`- Parent: ${issue.parentKey}`);
    }
    lines.push('');
  }

  if (payload.warnings?.length) {
    lines.push('## Warnings');
    for (const warning of payload.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  return lines.join('\n');
}

export function formatIssueDetail(
  responseFormat: ResponseFormat,
  payload: {
    issue: IssueDetail;
    project: { key: string; localPath: string | null; needsUserInput: boolean };
    nextStepHint: string;
    warnings?: string[];
  }
): string {
  if (responseFormat === 'json') {
    return jsonText(payload);
  }

  const { issue, project, nextStepHint } = payload;
  const lines = [
    `# ${issue.key} ${issue.summary}`,
    '',
    `- Status: ${issue.status || 'Unknown'}`,
    `- Assignee: ${issue.assignee || 'Unassigned'}`,
    `- Type: ${issue.issueType || 'Unknown'}`,
    `- Priority: ${issue.priority || 'Unknown'}`,
    `- Project path: ${project.localPath || 'Not configured'}`,
    '',
    '## Description',
    issue.descriptionPlainText || '(empty)',
    '',
    `## Attachments (${issue.attachments.length})`,
  ];

  for (const attachment of issue.attachments) {
    lines.push(`- ${attachment.filename} (${attachment.mimeType}, ${attachment.size} bytes)`);
  }

  lines.push('');
  lines.push(`## Subtasks (${issue.subtasks.length})`);
  for (const subtask of issue.subtasks) {
    lines.push(`- ${subtask.key} ${subtask.summary} [${subtask.status || 'Unknown'}]`);
  }

  if (issue.comments.enabled) {
    lines.push('');
    lines.push(`## Comments (${issue.comments.items.length}/${issue.comments.total})`);
    for (const comment of issue.comments.items) {
      lines.push(`- ${comment.author || 'Unknown'} @ ${comment.created}`);
      lines.push(`  ${comment.bodyPlainText || '(empty)'}`);
    }
  }

  lines.push('');
  lines.push(`## Changelog (${issue.changelog.items.length}/${issue.changelog.total})`);
  for (const history of issue.changelog.items) {
    lines.push(`- ${history.author || 'Unknown'} @ ${history.created}`);
    for (const item of history.items) {
      lines.push(`  ${item.field}: ${item.from || 'null'} -> ${item.to || 'null'}`);
    }
  }

  lines.push('');
  lines.push('## Next Step');
  lines.push(nextStepHint);

  if (payload.warnings?.length) {
    lines.push('');
    lines.push('## Warnings');
    for (const warning of payload.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  return lines.join('\n');
}

export function formatAttachment(
  responseFormat: ResponseFormat,
  payload: { attachment: DownloadedAttachment; warnings?: string[] }
): string {
  if (responseFormat === 'json') {
    return jsonText(payload);
  }

  const { attachment } = payload;
  const lines = [
    `# Attachment ${attachment.filename}`,
    '',
    `- Issue: ${attachment.issueKey}`,
    `- MIME type: ${attachment.mimeType}`,
    `- Size: ${attachment.size}`,
    `- Encoding: ${attachment.encoding}`,
  ];

  lines.push(`- Truncated: ${attachment.truncated ? 'yes' : 'no'}`);

  if (attachment.parsed) {
    lines.push(`- Parsed format: ${attachment.parsed.format}`);
    lines.push(`- Parser: ${attachment.parsed.parser}`);
    lines.push('');
    lines.push('## Parsed Summary');
    lines.push(attachment.parsed.summary);
  }

  lines.push('');
  lines.push('## Content');
  lines.push(attachment.content);

  return lines.join('\n');
}

export function formatProjectPath(
  responseFormat: ResponseFormat,
  payload: { projectKey: string; localPath: string | null }
): string {
  if (responseFormat === 'json') {
    return jsonText(payload);
  }

  return payload.localPath
    ? `Project ${payload.projectKey} is mapped to ${payload.localPath}`
    : `Project ${payload.projectKey} has no configured local path.`;
}
