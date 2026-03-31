import { z } from 'zod';
import { ensureJiraCredentials, getProjectPath, loadResolvedConfig } from '../config.js';
import { readIssue } from '../jira-client.js';
import { formatAnalysisWorkflow } from '../format-analysis.js';

export const analyzeTaskSchema = z.object({
  input: z.string().describe('Jira issue key (e.g. AT-123) or full browse URL (e.g. https://xxx.atlassian.net/browse/AT-123)'),
  auto_comment: z.boolean().optional().describe('Automatically post the completed analysis as a comment without asking for confirmation (default true)'),
  response_format: z.enum(['json', 'markdown']).optional().describe('Output format (default markdown)'),
});

export function parseIssueKey(input: string): string {
  const trimmed = input.trim();

  // Full Atlassian browse URL: https://xxx.atlassian.net/browse/AT-123
  const urlMatch = trimmed.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/i);
  if (urlMatch) {
    return urlMatch[1].toUpperCase();
  }

  // Plain key: AT-123
  const keyMatch = trimmed.match(/^([A-Z][A-Z0-9]+-\d+)$/i);
  if (keyMatch) {
    return keyMatch[1].toUpperCase();
  }

  throw new Error(
    `Cannot parse issue key from: "${input}". Accepted formats: "AT-123" or "https://xxx.atlassian.net/browse/AT-123"`
  );
}

function inferProjectKey(key: string): string {
  const match = key.match(/^([A-Z][A-Z0-9]+)-\d+$/);
  return match ? match[1] : key;
}

export async function handleAnalyzeTask(args: unknown) {
  const { input: rawInput, auto_comment: autoCommentRaw, response_format } = analyzeTaskSchema.parse(args);
  const trimmedInput = rawInput.trim();
  if (!trimmedInput) {
    throw new Error('jira_analyze_task requires input (issue key or URL)');
  }
  const autoComment = autoCommentRaw !== false && autoCommentRaw !== null;
  const responseFormat = response_format ?? 'markdown';

  const key = parseIssueKey(trimmedInput);
  const projectKey = inferProjectKey(key);

  const config = await loadResolvedConfig();
  ensureJiraCredentials(config);

  const issue = await readIssue(config, {
    key,
    includeComments: true,
    commentMaxResults: 50,
    changelogMaxResults: 5,
  });

  const localPath = await getProjectPath(projectKey);

  // Match all three type-specific template headers to avoid false positives
  // from normal comments that happen to reference the issue key like 【AT-123】
  const analysisMarkers = [
    `【${key}】バグ修正分析`,
    `【${key}】機能実装分析`,
    `【${key}】タスク実装分析`,
  ];
  const existingComment = issue.comments.items.find(
    (c) => analysisMarkers.some((m) => c.bodyPlainText.includes(m))
  ) || null;

  const payload = {
    issue,
    project: { key: projectKey, localPath, needsUserInput: !localPath },
    autoComment,
    existingAnalysisCommentId: existingComment ? existingComment.id : null,
    warnings: config.warnings,
  };

  return {
    text: formatAnalysisWorkflow(responseFormat, payload),
    data: payload,
  };
}
