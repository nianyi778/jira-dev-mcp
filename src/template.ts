import type { DailyReport, ParentTaskReport, StoredReport } from './types';

/**
 * Generate email subject line in Japanese
 * Format: 2026/02/09 - 不具合releaseレポート
 */
export function generateSubject(report: DailyReport): string {
  // Convert "2026年02月09日" to "2026/02/09"
  const dateSlash = report.date.replace(/年|月/g, '/').replace(/日/, '');
  return `${dateSlash} - 不具合releaseレポート`;
}

/**
 * Generate full email body in Japanese (plain text)
 */
export function generateEmailBody(report: DailyReport, releaseTime?: string): string {
  const separator = '━'.repeat(40);
  
  // Collect all completed tasks from all parent reports
  let taskList = '';
  let totalCompleted = 0;
  
  for (const parentReport of report.reports) {
    for (const task of parentReport.completedToday) {
      taskList += `  ✅ ${task.summary}\n`;
    }
    totalCompleted += parentReport.completedToday.length;
  }

  // Use provided releaseTime or generate current time (format: 2026/02/09 18:23)
  const releaseTimeStr = releaseTime || new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  // Convert "2026年02月09日" to "2026/02/09"
  const dateSlash = report.date.replace(/年|月/g, '/').replace(/日/, '');

  return `お疲れ様です。

${dateSlash} - 不具合releaseレポート

${taskList}
  📊 本日完了: ${totalCompleted} 件
  🚀 release時刻: ${releaseTimeStr}

${separator}
※ このメールは自動送信されています。
`;
}

/**
 * Generate HTML email body for better formatting
 * Design: Clean, professional, minimal - no AI aesthetics
 */
export function generateEmailBodyHtml(report: DailyReport): string {
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Meiryo', sans-serif;
      line-height: 1.7;
      color: #1a1a1a;
      background: #ffffff;
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
    }
    .date {
      font-size: 13px;
      color: #666;
      margin-bottom: 8px;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      color: #1a1a1a;
      margin: 0 0 24px 0;
      padding-bottom: 16px;
      border-bottom: 1px solid #e5e5e5;
    }
    .greeting {
      margin-bottom: 24px;
      color: #333;
    }
    .section {
      margin-bottom: 32px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title::before {
      content: '';
      display: inline-block;
      width: 3px;
      height: 14px;
      background: #0066cc;
      border-radius: 2px;
    }
    .task-list {
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      overflow: hidden;
    }
    .task-item {
      padding: 14px 16px;
      border-bottom: 1px solid #e5e5e5;
      background: #fafafa;
    }
    .task-item:last-child {
      border-bottom: none;
    }
    .task-item:nth-child(odd) {
      background: #ffffff;
    }
    .task-header {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 6px;
    }
    .task-summary {
      font-size: 14px;
      color: #1a1a1a;
      flex: 1;
    }
    .task-meta {
      font-size: 12px;
      color: #666;
    }
    .stats-row {
      display: flex;
      gap: 24px;
      margin-top: 16px;
      padding: 12px 16px;
      background: #f5f5f5;
      border-radius: 6px;
    }
    .stat {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }
    .stat-value {
      font-size: 18px;
      font-weight: 600;
      color: #1a1a1a;
    }
    .stat-label {
      font-size: 12px;
      color: #666;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      font-size: 12px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="date">${report.date}</div>
    <h1>サブタスク完了レポート</h1>
    <div class="greeting">
      お疲れ様です。<br>
      本日完了したサブタスクをご報告いたします。
    </div>
`;

  for (const parentReport of report.reports) {
    html += `
    <div class="section">
      <div class="section-title">${parentReport.parentKey} ${parentReport.parentSummary}</div>
      <div class="task-list">
`;

    for (const task of parentReport.completedToday) {
      html += `
        <div class="task-item">
          <div class="task-header">
            <span class="task-summary">${task.summary}</span>
          </div>
          <div class="task-meta">${task.completedAt}</div>
        </div>
`;
    }

    html += `
      </div>
      <div class="stats-row">
        <div class="stat">
          <span class="stat-value">${parentReport.completedToday.length}</span>
          <span class="stat-label">本日完了</span>
        </div>
      </div>
    </div>
`;
  }

  html += `
    <div class="footer">
      このメールは自動送信されています
    </div>
  </div>
</body>
</html>
`;

  return html;
}

/**
 * Generate internal notification email subject
 */
export function generateInternalNotificationSubject(report: DailyReport): string {
  return `【${report.date}】ACQ リリース内容報告`;
}

/**
 * Generate internal notification email body (plain text)
 */
export function generateInternalNotificationBody(
  storedReport: StoredReport,
  reviewUrl: string
): string {
  const { dailyReport } = storedReport;
  const parentKeys = dailyReport.reports.map((r) => r.parentKey).join(', ');
  const separator = '━'.repeat(40);

  return `お疲れ様です。

本日のJira進捗報告が生成されました。

${separator}
📊 レポート概要
${separator}
日付: ${dailyReport.date}
対象タスク: ${parentKeys}
完了サブタスク: ${dailyReport.totalCompletedToday}件

${separator}

以下のリンクをクリックして内容を確認し、
問題なければ送信してください：

👉 ${reviewUrl}

※ このリンクは24時間有効です
※ リンク先で宛先・件名・本文を編集できます

${separator}
このメールは自動送信されています。
`;
}

/**
 * Generate internal notification email body (HTML)
 * Design: Clean, professional, minimal - no AI aesthetics
 */
export function generateInternalNotificationBodyHtml(
  storedReport: StoredReport,
  reviewUrl: string,
  jiraBaseUrl: string
): string {
  const { dailyReport } = storedReport;
  const parentKeys = dailyReport.reports.map((r) => r.parentKey).join(', ');
  const baseUrl = jiraBaseUrl.replace(/\/$/, '');

  // Generate task list HTML
  let taskListHtml = '';
  for (const report of dailyReport.reports) {
    taskListHtml += `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
          <div style="font-weight: 600; color: #1a1a1a; margin-bottom: 8px;">${report.parentKey} ${report.parentSummary}</div>
    `;
    for (const task of report.completedToday) {
      const issueUrl = `${baseUrl}/browse/${task.key}`;
      taskListHtml += `
          <div style="padding: 8px 12px; background: #f9f9f9; border-radius: 4px; margin-bottom: 6px;">
            <div style="margin-bottom: 4px;">
              <a href="${issueUrl}" style="font-size: 13px; color: #1a1a1a; text-decoration: none;">[${task.key}] ${task.summary}</a>
            </div>
            <div style="font-size: 11px; color: #666;">${task.assignee} / ${task.completedAt}</div>
          </div>
      `;
    }
    taskListHtml += `
        </td>
      </tr>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Meiryo', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #e5e5e5;">
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">${dailyReport.date}</div>
              <h1 style="margin: 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">リリース進捗報告</h1>
            </td>
          </tr>
          
          <!-- Summary -->
          <tr>
            <td style="padding: 24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="33%" style="text-align: center; padding: 16px 0; background: #f9f9f9; border-radius: 6px 0 0 6px;">
                    <div style="font-size: 28px; font-weight: 600; color: #1a1a1a;">${dailyReport.totalCompletedToday}</div>
                    <div style="font-size: 11px; color: #666; margin-top: 4px;">完了タスク</div>
                  </td>
                  <td width="34%" style="text-align: center; padding: 16px 0; background: #f9f9f9; border-left: 1px solid #e5e5e5; border-right: 1px solid #e5e5e5;">
                    <div style="font-size: 28px; font-weight: 600; color: #1a1a1a;">${dailyReport.reports.length}</div>
                    <div style="font-size: 11px; color: #666; margin-top: 4px;">対象プロジェクト</div>
                  </td>
                  <td width="33%" style="text-align: center; padding: 16px 0; background: #f9f9f9; border-radius: 0 6px 6px 0;">
                    <div style="font-size: 14px; font-weight: 600; color: #0066cc;">${parentKeys}</div>
                    <div style="font-size: 11px; color: #666; margin-top: 4px;">タスクID</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Task List -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="font-size: 13px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; display: flex; align-items: center;">
                <span style="display: inline-block; width: 3px; height: 12px; background: #0066cc; border-radius: 2px; margin-right: 8px;"></span>
                本日完了したタスク
              </div>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${taskListHtml}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9f9f9; border-radius: 6px; padding: 24px; text-align: center;">
                <tr>
                  <td style="padding: 24px;">
                    <div style="font-size: 13px; color: #333; margin-bottom: 16px;">内容を確認し、問題なければ送信してください</div>
                    <a href="${reviewUrl}" style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 500;">確認ページを開く</a>
                    <div style="font-size: 11px; color: #999; margin-top: 16px; line-height: 1.6;">
                      リンクは24時間有効です<br>
                      宛先・件名・本文を編集できます
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background: #f9f9f9; text-align: center; font-size: 11px; color: #999;">
              このメールは自動送信されています
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Generate subject for no-tasks notification
 */
export function generateNoTasksNotificationSubject(date: string): string {
  return `【${date}】ACQ リリース内容報告`;
}

/**
 * Generate plain text body for no-tasks notification
 */
export function generateNoTasksNotificationBody(
  date: string,
  parentIssues: string[]
): string {
  const parentList = parentIssues.length > 0 
    ? parentIssues.join(', ')
    : '（未設定）';

  return `お疲れ様です。

${date}の進捗報告です。

本日完了したサブタスクはありませんでした。

対象タスク: ${parentList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
このメールは自動送信されています。
`;
}

/**
 * Generate HTML body for no-tasks notification
 */
export function generateNoTasksNotificationBodyHtml(
  date: string,
  parentIssues: string[]
): string {
  const parentList = parentIssues.length > 0 
    ? parentIssues.join(', ')
    : '（未設定）';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Meiryo', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #e5e5e5;">
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">${date}</div>
              <h1 style="margin: 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">リリース進捗報告</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <div style="text-align: center; padding: 24px 0;">
                <div style="font-size: 14px; color: #666; margin-bottom: 8px;">本日完了したサブタスク</div>
                <div style="font-size: 48px; font-weight: 600; color: #999;">0</div>
              </div>
              
              <div style="background: #f9f9f9; border-radius: 6px; padding: 16px; margin-top: 16px;">
                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">対象タスク</div>
                <div style="font-size: 14px; color: #1a1a1a; font-weight: 500;">${parentList}</div>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background: #f9f9f9; text-align: center; font-size: 11px; color: #999;">
              このメールは自動送信されています
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}
