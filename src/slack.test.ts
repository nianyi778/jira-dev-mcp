import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildIncompleteTasksMessage,
  sendSlackMessage,
  sendIncompleteTasksNotification,
} from './slack';
import { createMockEnv } from '../test/mocks/env';
import type { IncompleteTasksReport, SlackMessage } from './types';

describe('slack', () => {
  let env: ReturnType<typeof createMockEnv>;

  const mockIncompleteReport: IncompleteTasksReport = {
    parentKey: 'AT-100',
    parentSummary: 'Main Project Task',
    incompleteTasks: [
      {
        key: 'AT-101',
        summary: 'Incomplete Task 1',
        assignee: 'Test User',
        status: '進行中',
        statusCategory: 'indeterminate',
        priority: 'High',
      },
      {
        key: 'AT-102',
        summary: 'Incomplete Task 2',
        assignee: 'Another User',
        status: 'TODO',
        statusCategory: 'new',
        priority: 'Medium',
      },
    ],
    totalSubtasks: 10,
    completedSubtasks: 8,
    progressPercent: 80,
  };

  beforeEach(() => {
    env = createMockEnv();
    vi.clearAllMocks();
  });

  describe('buildIncompleteTasksMessage', () => {
    it('should build message with incomplete tasks', () => {
      const message = buildIncompleteTasksMessage(
        [mockIncompleteReport],
        'https://test.atlassian.net',
        'Asia/Tokyo'
      );
      
      expect(message.text).toContain('未完了タスク');
      expect(message.blocks).toBeDefined();
      expect(message.blocks).toHaveLength(1);
    });

    it('should include parent task info', () => {
      const message = buildIncompleteTasksMessage(
        [mockIncompleteReport],
        'https://test.atlassian.net',
        'Asia/Tokyo'
      );
      
      const text = message.blocks?.[0]?.text?.text || '';
      expect(text).toContain('AT-100');
      expect(text).toContain('Main Project Task');
    });

    it('should include task links to Jira', () => {
      const message = buildIncompleteTasksMessage(
        [mockIncompleteReport],
        'https://test.atlassian.net',
        'Asia/Tokyo'
      );
      
      const text = message.blocks?.[0]?.text?.text || '';
      expect(text).toContain('<https://test.atlassian.net/browse/AT-101|AT-101>');
    });

    it('should include assignee info', () => {
      const message = buildIncompleteTasksMessage(
        [mockIncompleteReport],
        'https://test.atlassian.net',
        'Asia/Tokyo'
      );
      
      const text = message.blocks?.[0]?.text?.text || '';
      expect(text).toContain('Test User');
      expect(text).toContain('担当');
    });

    it('should include progress stats', () => {
      const message = buildIncompleteTasksMessage(
        [mockIncompleteReport],
        'https://test.atlassian.net',
        'Asia/Tokyo'
      );
      
      const text = message.blocks?.[0]?.text?.text || '';
      expect(text).toContain('8/10');
      expect(text).toContain('80%');
    });

    it('should sort tasks by status priority (進行中 first)', () => {
      const message = buildIncompleteTasksMessage(
        [mockIncompleteReport],
        'https://test.atlassian.net',
        'Asia/Tokyo'
      );
      
      const text = message.blocks?.[0]?.text?.text || '';
      const inProgressIndex = text.indexOf('進行中');
      const todoIndex = text.indexOf('TODO');
      
      // 進行中 should appear before TODO
      expect(inProgressIndex).toBeLessThan(todoIndex);
    });

    it('should build all-completed message when no incomplete tasks', () => {
      const completedReport: IncompleteTasksReport = {
        ...mockIncompleteReport,
        incompleteTasks: [],
        completedSubtasks: 10,
        progressPercent: 100,
      };
      
      const message = buildIncompleteTasksMessage(
        [completedReport],
        'https://test.atlassian.net',
        'Asia/Tokyo'
      );
      
      const text = message.blocks?.[0]?.text?.text || '';
      expect(text).toContain('全タスク完了');
      expect(text).toContain(':tada:');
    });

    it('should include channel mention', () => {
      const message = buildIncompleteTasksMessage(
        [mockIncompleteReport],
        'https://test.atlassian.net',
        'Asia/Tokyo'
      );
      
      const text = message.blocks?.[0]?.text?.text || '';
      expect(text).toContain('<!channel>');
    });

    it('should handle multiple parent tasks', () => {
      const secondReport: IncompleteTasksReport = {
        parentKey: 'AT-200',
        parentSummary: 'Second Project',
        incompleteTasks: [
          {
            key: 'AT-201',
            summary: 'Task from second project',
            assignee: 'Third User',
            status: 'TODO',
            statusCategory: 'new',
            priority: 'Low',
          },
        ],
        totalSubtasks: 5,
        completedSubtasks: 4,
        progressPercent: 80,
      };
      
      const message = buildIncompleteTasksMessage(
        [mockIncompleteReport, secondReport],
        'https://test.atlassian.net',
        'Asia/Tokyo'
      );
      
      const text = message.blocks?.[0]?.text?.text || '';
      expect(text).toContain('AT-100');
      expect(text).toContain('AT-200');
    });
  });

  describe('sendSlackMessage', () => {
    const mockMessage: SlackMessage = {
      text: 'Test message',
      blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Test' } }],
    };

    it('should return error if SLACK_WEBHOOK_URL not configured', async () => {
      const envWithoutSlack = createMockEnv({
        overrides: { SLACK_WEBHOOK_URL: undefined },
      });
      
      const result = await sendSlackMessage(mockMessage, envWithoutSlack);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('SLACK_WEBHOOK_URL');
    });

    it('should send message to webhook', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response('ok', { status: 200 })
      );
      globalThis.fetch = mockFetch;
      
      const result = await sendSlackMessage(mockMessage, env);
      
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        env.SLACK_WEBHOOK_URL,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockMessage),
        })
      );
    });

    it('should return error on non-ok response', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response('invalid_token', { status: 403 })
      );
      globalThis.fetch = mockFetch;
      
      const result = await sendSlackMessage(mockMessage, env);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('403');
      expect(result.error).toContain('invalid_token');
    });

    it('should return error on fetch failure', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      globalThis.fetch = mockFetch;
      
      const result = await sendSlackMessage(mockMessage, env);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('sendIncompleteTasksNotification', () => {
    it('should build and send message', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response('ok', { status: 200 })
      );
      globalThis.fetch = mockFetch;
      
      const result = await sendIncompleteTasksNotification(
        [mockIncompleteReport],
        env
      );
      
      expect(result.success).toBe(true);
      expect(result.messagePreview).toContain('未完了タスク');
    });

    it('should return message preview on success', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response('ok', { status: 200 })
      );
      globalThis.fetch = mockFetch;
      
      const result = await sendIncompleteTasksNotification(
        [mockIncompleteReport],
        env
      );
      
      expect(result.messagePreview).toBeDefined();
      expect(typeof result.messagePreview).toBe('string');
    });

    it('should return message preview on failure too', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Failed'));
      globalThis.fetch = mockFetch;
      
      const result = await sendIncompleteTasksNotification(
        [mockIncompleteReport],
        env
      );
      
      expect(result.success).toBe(false);
      expect(result.messagePreview).toBeDefined();
    });
  });
});
