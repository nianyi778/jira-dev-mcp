import type { Env, IncompleteTasksReport, SlackMessage } from './types';

/**
 * Status priority for sorting (higher = more urgent, show first)
 */
const STATUS_PRIORITY: Record<string, number> = {
  '進行中': 100,
  'In Progress': 100,
  'READY RELEASE': 80,
  'Ready Release': 80,
  'TODO': 50,
  'To Do': 50,
  'Open': 40,
  'Backlog': 30,
};

/**
 * Get status priority for sorting
 */
function getStatusPriority(status: string): number {
  return STATUS_PRIORITY[status] ?? 20;
}

/**
 * Format current date/time in Japanese
 */
function formatCurrentDateTimeJapanese(timezone: string): string {
  const now = new Date();
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);
}

/**
 * Build Slack message for incomplete tasks
 */
export function buildIncompleteTasksMessage(
  reports: IncompleteTasksReport[],
  jiraBaseUrl: string,
  timezone: string
): SlackMessage {
  const dateTime = formatCurrentDateTimeJapanese(timezone);
  
  // Check if all tasks are completed
  const totalIncomplete = reports.reduce((sum, r) => sum + r.incompleteTasks.length, 0);
  
  if (totalIncomplete === 0) {
    // All tasks completed message
    return buildAllCompletedMessage(reports, dateTime);
  }
  
  // Build message with incomplete tasks
  return buildIncompleteMessage(reports, jiraBaseUrl, dateTime);
}

/**
 * Build message when all tasks are completed
 */
function buildAllCompletedMessage(
  reports: IncompleteTasksReport[],
  dateTime: string
): SlackMessage {
  const lines: string[] = [
    '<!channel>',
    '',
    '━━━━━━━━━━━━━━━━━━━━',
    'タスク進捗報告',
    dateTime,
    '━━━━━━━━━━━━━━━━━━━━',
    '',
  ];

  for (const report of reports) {
    lines.push(`【${report.parentKey}】${report.parentSummary}`);
    lines.push('');
    lines.push(':tada: 全タスク完了しました！');
    lines.push(`進捗: ${report.completedSubtasks}/${report.totalSubtasks} (100%)`);
    lines.push('');
  }

  return {
    text: `タスク進捗報告 - ${dateTime} - 全タスク完了しました！`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: lines.join('\n'),
        },
      },
    ],
  };
}

/**
 * Build message with incomplete tasks list
 */
function buildIncompleteMessage(
  reports: IncompleteTasksReport[],
  jiraBaseUrl: string,
  dateTime: string
): SlackMessage {
  const lines: string[] = [
    '<!channel>',
    '',
    '━━━━━━━━━━━━━━━━━━━━',
    '未完了タスク一覧',
    dateTime,
    '━━━━━━━━━━━━━━━━━━━━',
    '',
  ];

  for (const report of reports) {
    const remaining = report.totalSubtasks - report.completedSubtasks;
    
    lines.push(`【${report.parentKey}】${report.parentSummary}`);
    lines.push(`進捗: ${report.completedSubtasks}/${report.totalSubtasks} (${report.progressPercent}%) ｜ 残り: ${remaining} 件`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Sort tasks by status priority (進行中 > READY RELEASE > TODO > others)
    const sortedTasks = [...report.incompleteTasks].sort(
      (a, b) => getStatusPriority(b.status) - getStatusPriority(a.status)
    );

    for (const task of sortedTasks) {
      const taskUrl = `${jiraBaseUrl}/browse/${task.key}`;
      lines.push(`[${task.status}] <${taskUrl}|${task.key}>`);
      lines.push(`${task.summary}`);
      lines.push(`担当: ${task.assignee}`);
      lines.push('');
    }
  }

  const totalIncomplete = reports.reduce((sum, r) => sum + r.incompleteTasks.length, 0);

  return {
    text: `未完了タスク一覧 - ${dateTime} - ${totalIncomplete}件の未完了タスクがあります`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: lines.join('\n'),
        },
      },
    ],
  };
}

/**
 * Send message to Slack via webhook
 */
export async function sendSlackMessage(
  message: SlackMessage,
  env: Env
): Promise<{ success: boolean; error?: string }> {
  if (!env.SLACK_WEBHOOK_URL) {
    return { success: false, error: 'SLACK_WEBHOOK_URL is not configured' };
  }

  try {
    const response = await fetch(env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Slack API error (${response.status}): ${errorText}` };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Send incomplete tasks notification to Slack
 */
export async function sendIncompleteTasksNotification(
  reports: IncompleteTasksReport[],
  env: Env
): Promise<{ success: boolean; error?: string; messagePreview?: string }> {
  const message = buildIncompleteTasksMessage(
    reports,
    env.JIRA_BASE_URL,
    env.TIMEZONE
  );

  const result = await sendSlackMessage(message, env);
  
  return {
    ...result,
    messagePreview: message.text,
  };
}
