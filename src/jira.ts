import type {
  Env,
  JiraIssue,
  JiraSearchResponse,
  CompletedSubtask,
  ParentTaskReport,
  IncompleteSubtask,
  IncompleteTasksReport,
} from './types';
import { translateToJapanese } from './translate';

/**
 * Create Basic Auth header for Jira API
 */
function createAuthHeader(email: string, apiToken: string): string {
  const credentials = btoa(`${email}:${apiToken}`);
  return `Basic ${credentials}`;
}

/**
 * Fetch subtasks for a parent issue with changelog
 * Using the new /rest/api/3/search/jql endpoint (Jira Cloud migration)
 */
async function fetchSubtasks(
  parentKey: string,
  env: Env
): Promise<JiraIssue[]> {
  const jql = encodeURIComponent(`parent = ${parentKey}`);
  const fields = 'summary,status,assignee,priority';
  const url = `${env.JIRA_BASE_URL}/rest/api/3/search/jql?jql=${jql}&maxResults=100&expand=changelog&fields=${fields}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: createAuthHeader(env.JIRA_EMAIL, env.JIRA_API_TOKEN),
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Jira API error (${response.status}): ${errorText}`
    );
  }

  const data: JiraSearchResponse | JiraIssue[] = await response.json();
  
  // Handle response - could be { issues: [...] } or direct array
  if (Array.isArray(data)) {
    return data;
  }
  if ('issues' in data && data.issues) {
    return data.issues;
  }
  
  console.log('Unexpected response structure:', JSON.stringify(data).slice(0, 500));
  return [];
}

/**
 * Fetch parent issue details
 */
async function fetchParentIssue(
  issueKey: string,
  env: Env
): Promise<JiraIssue> {
  const url = `${env.JIRA_BASE_URL}/rest/api/3/issue/${issueKey}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: createAuthHeader(env.JIRA_EMAIL, env.JIRA_API_TOKEN),
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Jira API error (${response.status}): ${errorText}`
    );
  }

  const data: JiraIssue | JiraSearchResponse = await response.json();
  
  // Handle both old and new API response formats
  // New API might return issues in a different structure
  if ('issues' in data && data.issues && data.issues.length > 0) {
    return data.issues[0];
  }
  
  return data as JiraIssue;
}

/**
 * Check if a date is today in the specified timezone
 */
function isToday(dateString: string, timezone: string): boolean {
  const date = new Date(dateString);
  const today = new Date();

  // Format both dates in the target timezone and compare date parts
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const dateInTz = dateFormatter.format(date);
  const todayInTz = dateFormatter.format(today);

  return dateInTz === todayInTz;
}

/**
 * Format date in Japanese style
 */
function formatDateJapanese(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Check if a status name indicates "Done"
 */
function isDoneStatus(statusName: string): boolean {
  const status = statusName.toLowerCase();
  return status === 'done' || status === '完成' || status.includes('done');
}

/**
 * Find subtasks that were completed today
 * Translates Chinese summaries to Japanese
 */
async function findTodayCompletedSubtasks(
  subtasks: JiraIssue[],
  timezone: string
): Promise<CompletedSubtask[]> {
  const completed: CompletedSubtask[] = [];

  for (const subtask of subtasks) {
    // First, check if the current status is Done
    // If not, skip this subtask even if it was temporarily Done today
    const currentStatus = subtask.fields?.status?.name || '';
    if (!isDoneStatus(currentStatus)) {
      continue;
    }

    const changelog = subtask.changelog;
    if (!changelog || !changelog.histories) {
      continue;
    }

    // Find the most recent status change to Done that happened today
    // We need to find when it was changed to the current Done status
    let completedAt: Date | null = null;

    // Sort histories by date (oldest first) to find the transition to current Done status
    const sortedHistories = [...changelog.histories].sort(
      (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime()
    );

    for (const history of sortedHistories) {
      for (const item of history.items) {
        if (item.field === 'status') {
          const toStatus = item.toString || '';
          
          if (isDoneStatus(toStatus) && isToday(history.created, timezone)) {
            // Record this as the completion time
            // Keep updating - we want the latest transition to Done today
            completedAt = new Date(history.created);
          }
        }
      }
    }

    // Only add if we found a Done transition today
    if (completedAt) {
      // Translate Chinese summary to Japanese
      const originalSummary = subtask.fields?.summary || 'Unknown';
      const translatedSummary = await translateToJapanese(originalSummary);
      
      completed.push({
        key: subtask.key,
        summary: translatedSummary,
        assignee: subtask.fields?.assignee?.displayName || '未割り当て',
        completedAt: formatDateJapanese(completedAt, timezone),
        completedAtDate: completedAt,
      });
    }
  }

  // Sort by completion time
  completed.sort(
    (a, b) => a.completedAtDate.getTime() - b.completedAtDate.getTime()
  );

  return completed;
}

/**
 * Calculate progress statistics for subtasks
 */
function calculateProgress(subtasks: JiraIssue[]): {
  total: number;
  completed: number;
  percent: number;
} {
  const total = subtasks.length;
  let completed = 0;

  for (const subtask of subtasks) {
    const statusName = subtask.fields?.status?.name || '';
    if (isDoneStatus(statusName)) {
      completed++;
    }
  }

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, percent };
}

/**
 * Generate report for a single parent task
 */
export async function generateParentTaskReport(
  parentKey: string,
  env: Env
): Promise<ParentTaskReport | null> {
  console.log(`Fetching data for parent task: ${parentKey}`);

  // Fetch parent issue and subtasks in parallel
  const [parentIssue, subtasks] = await Promise.all([
    fetchParentIssue(parentKey, env),
    fetchSubtasks(parentKey, env),
  ]);

  console.log(`Found ${subtasks.length} subtasks for ${parentKey}`);

  // Find today's completed subtasks (with translation)
  const completedToday = await findTodayCompletedSubtasks(subtasks, env.TIMEZONE);
  console.log(
    `Found ${completedToday.length} subtasks completed today for ${parentKey}`
  );

  // If no subtasks completed today, return null
  if (completedToday.length === 0) {
    return null;
  }

  // Calculate progress
  const progress = calculateProgress(subtasks);

  return {
    parentKey,
    parentSummary: parentIssue.fields.summary,
    completedToday,
    totalSubtasks: progress.total,
    completedSubtasks: progress.completed,
    progressPercent: progress.percent,
  };
}

/**
 * Get today's date formatted in Japanese with zero-padding
 * Format: 2026年02月09日
 */
export function getTodayDateJapanese(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  return `${year}年${month}月${day}日`;
}

/**
 * Debug info for a single subtask
 */
export interface SubtaskDebugInfo {
  key: string;
  summary: string;
  status: string;
  assignee: string;
  priority: string;
  statusChanges: {
    from: string | null;
    to: string | null;
    changedAt: string;
    changedAtFormatted: string;
    isToday: boolean;
  }[];
}

/**
 * Debug info for parent task and all subtasks
 */
export interface ParentTaskDebugInfo {
  parentKey: string;
  parentSummary: string;
  parentStatus: string;
  totalSubtasks: number;
  completedSubtasks: number;
  progressPercent: number;
  subtasks: SubtaskDebugInfo[];
  completedToday: SubtaskDebugInfo[];
  todayDate: string;
  timezone: string;
}

/**
 * Get detailed debug info for a parent task and its subtasks
 */
export async function getSubtasksDebugInfo(
  parentKey: string,
  env: Env
): Promise<ParentTaskDebugInfo> {
  // Fetch parent issue and subtasks in parallel
  const [parentIssue, subtasks] = await Promise.all([
    fetchParentIssue(parentKey, env),
    fetchSubtasks(parentKey, env),
  ]);

  // Debug logging
  console.log('Parent issue response:', JSON.stringify(parentIssue).slice(0, 500));
  console.log('Subtasks count:', subtasks.length);
  if (subtasks.length > 0) {
    console.log('First subtask:', JSON.stringify(subtasks[0]).slice(0, 500));
  }

  const timezone = env.TIMEZONE;
  const todayDate = getTodayDateJapanese(timezone);
  
  // Safe access to parent issue fields
  const parentSummary = parentIssue?.fields?.summary || 'Unknown';
  const parentStatus = parentIssue?.fields?.status?.name || 'Unknown';

  // Process subtasks
  const subtaskInfos: SubtaskDebugInfo[] = [];
  const completedTodayInfos: SubtaskDebugInfo[] = [];

  for (const subtask of subtasks) {
    const statusChanges: SubtaskDebugInfo['statusChanges'] = [];
    const currentStatus = subtask.fields?.status?.name || 'Unknown';
    const isCurrentlyDone = isDoneStatus(currentStatus);
    let hasBeenDoneToday = false;

    // Extract status changes from changelog
    if (subtask.changelog?.histories) {
      for (const history of subtask.changelog.histories) {
        for (const item of history.items) {
          if (item.field === 'status') {
            const changedAt = history.created;
            const isTodayChange = isToday(changedAt, timezone);
            const toStatus = item.toString || '';
            
            statusChanges.push({
              from: item.fromString,
              to: item.toString,
              changedAt,
              changedAtFormatted: formatDateJapanese(new Date(changedAt), timezone),
              isToday: isTodayChange,
            });

            // Check if changed to Done today
            if (isDoneStatus(toStatus) && isTodayChange) {
              hasBeenDoneToday = true;
            }
          }
        }
      }
    }

    // Only count as "completed today" if:
    // 1. It was changed to Done today, AND
    // 2. It's still in Done status (not reverted)
    const isCompletedToday = isCurrentlyDone && hasBeenDoneToday;

    // Sort status changes by date (newest first)
    statusChanges.sort((a, b) => 
      new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    );

    const info: SubtaskDebugInfo = {
      key: subtask.key || 'Unknown',
      summary: subtask.fields?.summary || 'Unknown',
      status: subtask.fields?.status?.name || 'Unknown',
      assignee: subtask.fields?.assignee?.displayName || '未割り当て',
      priority: subtask.fields?.priority?.name || 'None',
      statusChanges,
    };

    subtaskInfos.push(info);

    if (isCompletedToday) {
      completedTodayInfos.push(info);
    }
  }

  // Sort subtasks by key
  subtaskInfos.sort((a, b) => a.key.localeCompare(b.key));
  completedTodayInfos.sort((a, b) => a.key.localeCompare(b.key));

  // Calculate progress
  const progress = calculateProgress(subtasks);

  return {
    parentKey,
    parentSummary,
    parentStatus,
    totalSubtasks: progress.total,
    completedSubtasks: progress.completed,
    progressPercent: progress.percent,
    subtasks: subtaskInfos,
    completedToday: completedTodayInfos,
    todayDate,
    timezone,
  };
}

/**
 * Get all incomplete tasks (non-Done status) for a parent issue
 * Used for Slack notifications
 */
export async function getIncompleteTasksReport(
  parentKey: string,
  env: Env
): Promise<IncompleteTasksReport> {
  console.log(`Fetching incomplete tasks for parent: ${parentKey}`);

  // Fetch parent issue and subtasks in parallel
  const [parentIssue, subtasks] = await Promise.all([
    fetchParentIssue(parentKey, env),
    fetchSubtasks(parentKey, env),
  ]);

  console.log(`Found ${subtasks.length} total subtasks for ${parentKey}`);

  // Filter incomplete tasks (not Done)
  const incompleteTasks: IncompleteSubtask[] = [];
  let completedCount = 0;

  for (const subtask of subtasks) {
    const statusName = subtask.fields?.status?.name || 'Unknown';
    const statusCategory = subtask.fields?.status?.statusCategory?.key || 'undefined';

    if (isDoneStatus(statusName)) {
      completedCount++;
    } else {
      incompleteTasks.push({
        key: subtask.key,
        summary: subtask.fields?.summary || 'Unknown',
        assignee: subtask.fields?.assignee?.displayName || '未割り当て',
        status: statusName,
        statusCategory: statusCategory,
        priority: subtask.fields?.priority?.name || 'None',
      });
    }
  }

  const totalSubtasks = subtasks.length;
  const progressPercent = totalSubtasks > 0
    ? Math.round((completedCount / totalSubtasks) * 100)
    : 0;

  console.log(`Incomplete tasks: ${incompleteTasks.length}, Completed: ${completedCount}`);

  return {
    parentKey,
    parentSummary: parentIssue.fields?.summary || 'Unknown',
    incompleteTasks,
    totalSubtasks,
    completedSubtasks: completedCount,
    progressPercent,
  };
}
