import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateParentTaskReport,
  getTodayDateJapanese,
  getSubtasksDebugInfo,
  getIncompleteTasksReport,
} from './jira';
import { createMockEnv } from '../test/mocks/env';
import {
  createMockParentIssue,
  createMockSearchResponse,
  createCompletedTodaySubtask,
  createCompletedYesterdaySubtask,
  createInProgressSubtask,
  createRevertedSubtask,
  createMockSubtask,
} from '../test/mocks/fixtures';

describe('jira', () => {
  let env: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    env = createMockEnv();
    vi.clearAllMocks();
  });

  describe('getTodayDateJapanese', () => {
    it('should return date in Japanese format', () => {
      const date = getTodayDateJapanese('Asia/Tokyo');
      
      // Should contain year, month, and day in Japanese
      expect(date).toMatch(/\d{4}年/);
      expect(date).toMatch(/\d{1,2}月/);
      expect(date).toMatch(/\d{1,2}日/);
    });

    it('should respect timezone', () => {
      // This is a basic sanity check - actual timezone behavior depends on runtime
      const tokyoDate = getTodayDateJapanese('Asia/Tokyo');
      expect(tokyoDate).toBeDefined();
    });
  });

  describe('generateParentTaskReport', () => {
    it('should return null when no subtasks completed today', async () => {
      const mockFetch = vi.fn()
        // First call - parent issue
        .mockResolvedValueOnce(
          new Response(JSON.stringify(createMockParentIssue()), { status: 200 })
        )
        // Second call - subtasks search
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify(createMockSearchResponse([
              createCompletedYesterdaySubtask('AT-101', 'Yesterday task'),
              createInProgressSubtask('AT-102', 'In progress task'),
            ])),
            { status: 200 }
          )
        );
      globalThis.fetch = mockFetch;

      const report = await generateParentTaskReport('AT-100', env);

      expect(report).toBeNull();
    });

    it('should return report with today completed subtasks', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(createMockParentIssue()), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify(createMockSearchResponse([
              createCompletedTodaySubtask('AT-101', 'Completed today'),
              createInProgressSubtask('AT-102', 'Still in progress'),
            ])),
            { status: 200 }
          )
        );
      globalThis.fetch = mockFetch;

      const report = await generateParentTaskReport('AT-100', env);

      expect(report).not.toBeNull();
      expect(report?.completedToday).toHaveLength(1);
      expect(report?.completedToday[0].key).toBe('AT-101');
      expect(report?.completedToday[0].summary).toBe('Completed today');
    });

    it('should calculate progress correctly', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(createMockParentIssue()), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify(createMockSearchResponse([
              createCompletedTodaySubtask('AT-101', 'Done 1'),
              createCompletedYesterdaySubtask('AT-102', 'Done 2'),
              createInProgressSubtask('AT-103', 'In progress'),
              createMockSubtask({ key: 'AT-104', status: 'TODO' }),
            ])),
            { status: 200 }
          )
        );
      globalThis.fetch = mockFetch;

      const report = await generateParentTaskReport('AT-100', env);

      expect(report?.totalSubtasks).toBe(4);
      expect(report?.completedSubtasks).toBe(2);
      expect(report?.progressPercent).toBe(50);
    });

    it('should not count reverted tasks as completed today', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(createMockParentIssue()), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify(createMockSearchResponse([
              createRevertedSubtask('AT-101', 'Reverted task'),
              createCompletedTodaySubtask('AT-102', 'Actually completed'),
            ])),
            { status: 200 }
          )
        );
      globalThis.fetch = mockFetch;

      const report = await generateParentTaskReport('AT-100', env);

      expect(report?.completedToday).toHaveLength(1);
      expect(report?.completedToday[0].key).toBe('AT-102');
    });

    it('should throw on Jira API error', async () => {
      // Need separate responses for each fetch call
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(new Response('Not Found', { status: 404 }))
        .mockResolvedValueOnce(new Response('Not Found', { status: 404 }));
      globalThis.fetch = mockFetch;

      await expect(generateParentTaskReport('INVALID', env)).rejects.toThrow('Jira API error');
    });

    it('should include parent task info in report', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify(createMockParentIssue({
              key: 'AT-100',
              summary: 'Main Project Feature',
            })),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify(createMockSearchResponse([
              createCompletedTodaySubtask('AT-101', 'Subtask'),
            ])),
            { status: 200 }
          )
        );
      globalThis.fetch = mockFetch;

      const report = await generateParentTaskReport('AT-100', env);

      expect(report?.parentKey).toBe('AT-100');
      expect(report?.parentSummary).toBe('Main Project Feature');
    });

    it('should format completion time in Japanese', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(createMockParentIssue()), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify(createMockSearchResponse([
              createCompletedTodaySubtask('AT-101', 'Test', 14),
            ])),
            { status: 200 }
          )
        );
      globalThis.fetch = mockFetch;

      const report = await generateParentTaskReport('AT-100', env);

      // Should be formatted with Japanese date/time format
      expect(report?.completedToday[0].completedAt).toMatch(/\d{4}/);
    });
  });

  describe('getSubtasksDebugInfo', () => {
    it('should return detailed debug info', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(createMockParentIssue()), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify(createMockSearchResponse([
              createCompletedTodaySubtask('AT-101', 'Completed task'),
              createInProgressSubtask('AT-102', 'In progress task'),
            ])),
            { status: 200 }
          )
        );
      globalThis.fetch = mockFetch;

      const debug = await getSubtasksDebugInfo('AT-100', env);

      expect(debug.parentKey).toBe('AT-100');
      expect(debug.subtasks).toHaveLength(2);
      expect(debug.completedToday).toHaveLength(1);
      expect(debug.timezone).toBe('Asia/Tokyo');
    });

    it('should include status change history', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(createMockParentIssue()), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify(createMockSearchResponse([
              createCompletedTodaySubtask('AT-101', 'Task with history'),
            ])),
            { status: 200 }
          )
        );
      globalThis.fetch = mockFetch;

      const debug = await getSubtasksDebugInfo('AT-100', env);

      const subtask = debug.subtasks.find(s => s.key === 'AT-101');
      expect(subtask?.statusChanges).toBeDefined();
      expect(subtask?.statusChanges.length).toBeGreaterThan(0);
    });

    it('should include progress stats', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(createMockParentIssue()), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify(createMockSearchResponse([
              createCompletedTodaySubtask('AT-101', 'Done'),
              createInProgressSubtask('AT-102', 'In progress'),
            ])),
            { status: 200 }
          )
        );
      globalThis.fetch = mockFetch;

      const debug = await getSubtasksDebugInfo('AT-100', env);

      expect(debug.totalSubtasks).toBe(2);
      expect(debug.completedSubtasks).toBe(1);
      expect(debug.progressPercent).toBe(50);
    });
  });

  describe('getIncompleteTasksReport', () => {
    it('should return only incomplete tasks', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(createMockParentIssue()), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify(createMockSearchResponse([
              createCompletedTodaySubtask('AT-101', 'Done task'),
              createInProgressSubtask('AT-102', 'In progress task'),
              createMockSubtask({ key: 'AT-103', status: 'TODO', summary: 'Todo task' }),
            ])),
            { status: 200 }
          )
        );
      globalThis.fetch = mockFetch;

      const report = await getIncompleteTasksReport('AT-100', env);

      expect(report.incompleteTasks).toHaveLength(2);
      expect(report.incompleteTasks.map(t => t.key)).toEqual(['AT-102', 'AT-103']);
    });

    it('should include task details', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(createMockParentIssue()), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify(createMockSearchResponse([
              createMockSubtask({
                key: 'AT-101',
                summary: 'Important task',
                status: 'In Progress',
                statusCategory: 'indeterminate',
                priority: 'High',
              }),
            ])),
            { status: 200 }
          )
        );
      globalThis.fetch = mockFetch;

      const report = await getIncompleteTasksReport('AT-100', env);

      expect(report.incompleteTasks[0]).toEqual(
        expect.objectContaining({
          key: 'AT-101',
          summary: 'Important task',
          status: 'In Progress',
          priority: 'High',
        })
      );
    });

    it('should calculate correct completed count', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(createMockParentIssue()), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify(createMockSearchResponse([
              createCompletedTodaySubtask('AT-101', 'Done 1'),
              createCompletedYesterdaySubtask('AT-102', 'Done 2'),
              createInProgressSubtask('AT-103', 'Not done'),
            ])),
            { status: 200 }
          )
        );
      globalThis.fetch = mockFetch;

      const report = await getIncompleteTasksReport('AT-100', env);

      expect(report.totalSubtasks).toBe(3);
      expect(report.completedSubtasks).toBe(2);
      expect(report.progressPercent).toBe(67); // Math.round(2/3 * 100)
    });

    it('should return empty array when all tasks done', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(createMockParentIssue()), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify(createMockSearchResponse([
              createCompletedTodaySubtask('AT-101', 'Done 1'),
              createCompletedYesterdaySubtask('AT-102', 'Done 2'),
            ])),
            { status: 200 }
          )
        );
      globalThis.fetch = mockFetch;

      const report = await getIncompleteTasksReport('AT-100', env);

      expect(report.incompleteTasks).toHaveLength(0);
      expect(report.progressPercent).toBe(100);
    });

    it('should include parent info', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify(createMockParentIssue({
              key: 'AT-100',
              summary: 'Main Feature',
            })),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify(createMockSearchResponse([])),
            { status: 200 }
          )
        );
      globalThis.fetch = mockFetch;

      const report = await getIncompleteTasksReport('AT-100', env);

      expect(report.parentKey).toBe('AT-100');
      expect(report.parentSummary).toBe('Main Feature');
    });

    it('should handle unassigned tasks', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(createMockParentIssue()), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify(createMockSearchResponse([
              createMockSubtask({
                key: 'AT-101',
                summary: 'Unassigned task',
                status: 'TODO',
                assignee: null,
              }),
            ])),
            { status: 200 }
          )
        );
      globalThis.fetch = mockFetch;

      const report = await getIncompleteTasksReport('AT-100', env);

      expect(report.incompleteTasks[0].assignee).toBe('未割り当て');
    });
  });
});
