import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendInternalNotification, sendNoTasksNotification } from './email';
import { createMockEnv, createDryRunEnv } from '../test/mocks/env';
import type { StoredReport, DailyReport, AppConfig } from './types';

describe('email', () => {
  let env: ReturnType<typeof createMockEnv>;
  let config: AppConfig;

  const mockDailyReport: DailyReport = {
    date: '2024年1月15日',
    reports: [
      {
        parentKey: 'AT-100',
        parentSummary: 'Main Project Task',
        completedToday: [
          {
            key: 'AT-101',
            summary: 'Subtask 1',
            assignee: 'Test User',
            completedAt: '2024-01-15 14:30',
            completedAtDate: new Date('2024-01-15T05:30:00Z'),
          },
        ],
        totalSubtasks: 10,
        completedSubtasks: 7,
        progressPercent: 70,
      },
    ],
    totalCompletedToday: 1,
  };

  const mockStoredReport: StoredReport = {
    id: 'test-token-123',
    createdAt: '2024-01-15T10:00:00Z',
    expiresAt: '2024-01-16T10:00:00Z',
    dailyReport: mockDailyReport,
    defaultTo: 'client@test.com',
    defaultCc: 'cc@test.com',
    defaultSubject: 'Test Subject',
    defaultBody: 'Test Body',
  };

  beforeEach(() => {
    env = createMockEnv();
    config = {
      parentIssues: 'AT-100',
      dryRun: false,
      internalEmail: 'internal@test.com',
      defaultClientEmail: 'client@test.com',
      defaultCcEmail: 'cc@test.com',
      reviewTokenTtl: 86400,
      featureEmailReport: true,
      featureSlackReminder: true,
      slackChannelName: '#general',
    };
    vi.clearAllMocks();
  });

  describe('sendInternalNotification', () => {
    const reviewUrl = 'https://example.com/review/test-token-123';

    it('should send email via Resend API', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'email-123' }), { status: 200 })
      );
      globalThis.fetch = mockFetch;
      
      await sendInternalNotification(mockStoredReport, reviewUrl, env, config);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should include correct recipient', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'email-123' }), { status: 200 })
      );
      globalThis.fetch = mockFetch;
      
      await sendInternalNotification(mockStoredReport, reviewUrl, env, config);
      
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.to).toContain('internal@test.com');
    });

    it('should include review URL in body', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'email-123' }), { status: 200 })
      );
      globalThis.fetch = mockFetch;
      
      await sendInternalNotification(mockStoredReport, reviewUrl, env, config);
      
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.text).toContain(reviewUrl);
      expect(callBody.html).toContain(reviewUrl);
    });

    it('should throw if internal email not configured', async () => {
      config.internalEmail = '';
      
      await expect(
        sendInternalNotification(mockStoredReport, reviewUrl, env, config)
      ).rejects.toThrow('Internal email is not configured');
    });

    it('should throw if RESEND_FROM_EMAIL not configured', async () => {
      const envWithoutResend = createDryRunEnv();
      
      await expect(
        sendInternalNotification(mockStoredReport, reviewUrl, envWithoutResend, config)
      ).rejects.toThrow('RESEND_FROM_EMAIL is not configured');
    });

    it('should throw if RESEND_API_KEY not configured', async () => {
      const envWithoutKey = createMockEnv({
        overrides: { RESEND_API_KEY: undefined },
      });
      
      await expect(
        sendInternalNotification(mockStoredReport, reviewUrl, envWithoutKey, config)
      ).rejects.toThrow('RESEND_API_KEY is not configured');
    });

    it('should throw on Resend API error', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Invalid API key' }), { status: 401 })
      );
      globalThis.fetch = mockFetch;
      
      await expect(
        sendInternalNotification(mockStoredReport, reviewUrl, env, config)
      ).rejects.toThrow('Resend API error');
    });

    it('should handle multiple recipient emails', async () => {
      config.internalEmail = 'user1@test.com, user2@test.com';
      
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'email-123' }), { status: 200 })
      );
      globalThis.fetch = mockFetch;
      
      await sendInternalNotification(mockStoredReport, reviewUrl, env, config);
      
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.to).toHaveLength(2);
      expect(callBody.to).toContain('user1@test.com');
      expect(callBody.to).toContain('user2@test.com');
    });

    it('should generate appropriate subject', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'email-123' }), { status: 200 })
      );
      globalThis.fetch = mockFetch;
      
      await sendInternalNotification(mockStoredReport, reviewUrl, env, config);
      
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.subject).toContain('要確認');
      expect(callBody.subject).toContain('2024年1月15日');
    });
  });

  describe('sendNoTasksNotification', () => {
    it('should send email for no tasks completed', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'email-123' }), { status: 200 })
      );
      globalThis.fetch = mockFetch;
      
      await sendNoTasksNotification('2024年1月15日', ['AT-100'], env, config);
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should include parent issues in body', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'email-123' }), { status: 200 })
      );
      globalThis.fetch = mockFetch;
      
      await sendNoTasksNotification('2024年1月15日', ['AT-100', 'AT-200'], env, config);
      
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.text).toContain('AT-100');
      expect(callBody.text).toContain('AT-200');
    });

    it('should have appropriate subject indicating no tasks', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'email-123' }), { status: 200 })
      );
      globalThis.fetch = mockFetch;
      
      await sendNoTasksNotification('2024年1月15日', ['AT-100'], env, config);
      
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.subject).toContain('本日完了なし');
    });

    it('should throw if internal email not configured', async () => {
      config.internalEmail = '';
      
      await expect(
        sendNoTasksNotification('2024年1月15日', ['AT-100'], env, config)
      ).rejects.toThrow('Internal email is not configured');
    });

    it('should send both text and HTML versions', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'email-123' }), { status: 200 })
      );
      globalThis.fetch = mockFetch;
      
      await sendNoTasksNotification('2024年1月15日', ['AT-100'], env, config);
      
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.text).toBeDefined();
      expect(callBody.html).toBeDefined();
      expect(callBody.html).toContain('<!DOCTYPE html>');
    });
  });
});
