/**
 * Test fixtures for Jira API responses
 */

import type {
  JiraIssue,
  JiraSearchResponse,
  JiraUser,
  JiraChangelogHistory,
} from '../../src/types';

/**
 * Create a mock Jira user
 */
export function createMockUser(overrides: Partial<JiraUser> = {}): JiraUser {
  return {
    accountId: 'user-123',
    displayName: 'Test User',
    emailAddress: 'test@example.com',
    ...overrides,
  };
}

/**
 * Create a mock changelog history entry
 */
export function createMockHistory(
  field: string,
  from: string | null,
  to: string | null,
  createdAt: string
): JiraChangelogHistory {
  return {
    id: `history-${Math.random().toString(36).substr(2, 9)}`,
    author: createMockUser(),
    created: createdAt,
    items: [
      {
        field,
        fieldtype: 'jira',
        from: from ? `id-${from}` : null,
        fromString: from,
        to: to ? `id-${to}` : null,
        toString: to,
      },
    ],
  };
}

/**
 * Create a mock Jira issue (subtask)
 */
export function createMockSubtask(overrides: {
  key?: string;
  summary?: string;
  status?: string;
  statusCategory?: string;
  assignee?: JiraUser | null;
  priority?: string;
  changelog?: JiraChangelogHistory[];
} = {}): JiraIssue {
  const {
    key = 'AT-101',
    summary = 'Test Subtask',
    status = 'TODO',
    statusCategory = 'new',
    assignee = createMockUser(),
    priority = 'Medium',
    changelog = [],
  } = overrides;

  return {
    id: `issue-${key}`,
    key,
    fields: {
      summary,
      status: {
        name: status,
        statusCategory: {
          key: statusCategory,
          name: statusCategory,
        },
      },
      assignee,
      priority: {
        name: priority,
      },
    },
    changelog: {
      startAt: 0,
      maxResults: 100,
      total: changelog.length,
      histories: changelog,
    },
  };
}

/**
 * Create a mock parent issue
 */
export function createMockParentIssue(overrides: {
  key?: string;
  summary?: string;
  status?: string;
} = {}): JiraIssue {
  const {
    key = 'AT-100',
    summary = 'Parent Task',
    status = 'In Progress',
  } = overrides;

  return {
    id: `issue-${key}`,
    key,
    fields: {
      summary,
      status: {
        name: status,
        statusCategory: {
          key: 'indeterminate',
          name: 'In Progress',
        },
      },
      assignee: createMockUser(),
      priority: {
        name: 'High',
      },
    },
  };
}

/**
 * Create a mock Jira search response
 */
export function createMockSearchResponse(
  issues: JiraIssue[],
  total?: number
): JiraSearchResponse {
  return {
    expand: 'changelog',
    startAt: 0,
    maxResults: 100,
    total: total ?? issues.length,
    issues,
  };
}

/**
 * Get ISO date string for today at specified hour (in timezone)
 */
export function getTodayAt(hour: number, timezone = 'Asia/Tokyo'): string {
  const now = new Date();
  // Create date in the target timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [year, month, day] = formatter.format(now).split('-').map(Number);
  
  // Construct ISO string assuming Tokyo timezone (UTC+9)
  const utcHour = hour - 9;
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeStr = `${String((utcHour + 24) % 24).padStart(2, '0')}:00:00.000Z`;
  
  return `${dateStr}T${timeStr}`;
}

/**
 * Get ISO date string for yesterday at specified hour
 */
export function getYesterdayAt(hour: number, timezone = 'Asia/Tokyo'): string {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [year, month, day] = formatter.format(yesterday).split('-').map(Number);
  
  const utcHour = hour - 9;
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeStr = `${String((utcHour + 24) % 24).padStart(2, '0')}:00:00.000Z`;
  
  return `${dateStr}T${timeStr}`;
}

/**
 * Create a subtask that was completed today
 */
export function createCompletedTodaySubtask(
  key: string,
  summary: string,
  completedAtHour = 14
): JiraIssue {
  const completedAt = getTodayAt(completedAtHour);
  
  return createMockSubtask({
    key,
    summary,
    status: 'Done',
    statusCategory: 'done',
    changelog: [
      createMockHistory('status', 'In Progress', 'Done', completedAt),
    ],
  });
}

/**
 * Create a subtask that was completed yesterday (not today)
 */
export function createCompletedYesterdaySubtask(
  key: string,
  summary: string
): JiraIssue {
  const completedAt = getYesterdayAt(14);
  
  return createMockSubtask({
    key,
    summary,
    status: 'Done',
    statusCategory: 'done',
    changelog: [
      createMockHistory('status', 'In Progress', 'Done', completedAt),
    ],
  });
}

/**
 * Create a subtask that is in progress (not done)
 */
export function createInProgressSubtask(
  key: string,
  summary: string
): JiraIssue {
  return createMockSubtask({
    key,
    summary,
    status: 'In Progress',
    statusCategory: 'indeterminate',
  });
}

/**
 * Create a subtask that was done but reverted
 */
export function createRevertedSubtask(
  key: string,
  summary: string
): JiraIssue {
  const doneAt = getTodayAt(10);
  const revertedAt = getTodayAt(12);
  
  return createMockSubtask({
    key,
    summary,
    status: 'In Progress', // Currently not done
    statusCategory: 'indeterminate',
    changelog: [
      createMockHistory('status', 'In Progress', 'Done', doneAt),
      createMockHistory('status', 'Done', 'In Progress', revertedAt),
    ],
  });
}
