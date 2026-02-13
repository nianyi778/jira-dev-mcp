import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendInternalNotification, sendNoTasksNotification } from './email';
import { createMockEnv } from '../test/mocks/env';
import type { StoredReport, DailyReport, AppConfig } from './types';

function decodeBase64Url(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '==='.slice((base64.length + 3) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function createGmailFetchMock(options?: {
  tokenOk?: boolean;
  tokenBody?: string;
  sendOk?: boolean;
  sendBody?: string;
}) {
  const tokenOk = options?.tokenOk ?? true;
  const sendOk = options?.sendOk ?? true;
  const tokenBody = options?.tokenBody ?? JSON.stringify({ access_token: 'test-access' });
  const sendBody = options?.sendBody ?? JSON.stringify({ id: 'email-123' });

  return vi.fn().mockImplementation((input: string) => {
    if (input === 'https://oauth2.googleapis.com/token') {
      return Promise.resolve(new Response(tokenBody, { status: tokenOk ? 200 : 400 }));
    }
    if (input === 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send') {
      return Promise.resolve(new Response(sendBody, { status: sendOk ? 200 : 401 }));
    }
    if (input === 'https://api.resend.com/emails') {
      return Promise.resolve(new Response(JSON.stringify({ id: 'email-123' }), { status: 200 }));
    }
    return Promise.resolve(new Response('not found', { status: 404 }));
  });
}

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

    it('should send email via Gmail API', async () => {
      const mockFetch = createGmailFetchMock();
      globalThis.fetch = mockFetch;
      
      await sendInternalNotification(mockStoredReport, reviewUrl, env, config);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(mockFetch).toHaveBeenCalledWith(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-access',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should include correct recipient', async () => {
      const mockFetch = createGmailFetchMock();
      globalThis.fetch = mockFetch;
      
      await sendInternalNotification(mockStoredReport, reviewUrl, env, config);
      
      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      const mime = decodeBase64Url(callBody.raw);
      expect(mime).toContain('To: internal@test.com');
    });

    it('should include review URL in body', async () => {
      const mockFetch = createGmailFetchMock();
      globalThis.fetch = mockFetch;
      
      await sendInternalNotification(mockStoredReport, reviewUrl, env, config);
      
      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      const mime = decodeBase64Url(callBody.raw);
      expect(mime).toContain(reviewUrl);
    });

    it('should throw if internal email not configured', async () => {
      config.internalEmail = '';
      
      await expect(
        sendInternalNotification(mockStoredReport, reviewUrl, env, config)
      ).rejects.toThrow('Internal email is not configured');
    });

    it('should throw if GMAIL_SENDER_EMAIL not configured', async () => {
      const envWithoutSender = createMockEnv({
        overrides: { GMAIL_SENDER_EMAIL: undefined },
      });
      
      await expect(
        sendInternalNotification(mockStoredReport, reviewUrl, envWithoutSender, config)
      ).rejects.toThrow('GMAIL_SENDER_EMAIL is not configured');
    });

    it('should throw if GMAIL_CLIENT_ID not configured', async () => {
      const envWithoutId = createMockEnv({
        overrides: { GMAIL_CLIENT_ID: undefined },
      });
      globalThis.fetch = createGmailFetchMock();
      
      await expect(
        sendInternalNotification(mockStoredReport, reviewUrl, envWithoutId, config)
      ).rejects.toThrow('GMAIL_CLIENT_ID is not configured');
    });

    it('should throw if GMAIL_CLIENT_SECRET not configured', async () => {
      const envWithoutSecret = createMockEnv({
        overrides: { GMAIL_CLIENT_SECRET: undefined },
      });
      globalThis.fetch = createGmailFetchMock();
      
      await expect(
        sendInternalNotification(mockStoredReport, reviewUrl, envWithoutSecret, config)
      ).rejects.toThrow('GMAIL_CLIENT_SECRET is not configured');
    });

    it('should throw if GMAIL_REFRESH_TOKEN not configured', async () => {
      const envWithoutRefresh = createMockEnv({
        overrides: { GMAIL_REFRESH_TOKEN: undefined },
      });
      globalThis.fetch = createGmailFetchMock();
      
      await expect(
        sendInternalNotification(mockStoredReport, reviewUrl, envWithoutRefresh, config)
      ).rejects.toThrow('GMAIL_REFRESH_TOKEN is not configured');
    });

    it('should throw on Gmail token error', async () => {
      const mockFetch = createGmailFetchMock({ tokenOk: false, tokenBody: 'bad token' });
      globalThis.fetch = mockFetch;
      
      await expect(
        sendInternalNotification(mockStoredReport, reviewUrl, env, config)
      ).rejects.toThrow('Gmail token error');
    });

    it('should throw when Gmail token response has no access token', async () => {
      const mockFetch = createGmailFetchMock({ tokenBody: '{}' });
      globalThis.fetch = mockFetch;
      
      await expect(
        sendInternalNotification(mockStoredReport, reviewUrl, env, config)
      ).rejects.toThrow('Gmail token response missing access_token');
    });

    it('should throw on Gmail API error', async () => {
      const mockFetch = createGmailFetchMock({ sendOk: false, sendBody: JSON.stringify({ error: 'Invalid' }) });
      globalThis.fetch = mockFetch;
      
      await expect(
        sendInternalNotification(mockStoredReport, reviewUrl, env, config)
      ).rejects.toThrow('Gmail API error');
    });

    it('should handle multiple recipient emails', async () => {
      config.internalEmail = 'user1@test.com, user2@test.com';
      
      const mockFetch = createGmailFetchMock();
      globalThis.fetch = mockFetch;
      
      await sendInternalNotification(mockStoredReport, reviewUrl, env, config);
      
      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      const mime = decodeBase64Url(callBody.raw);
      expect(mime).toContain('To: user1@test.com, user2@test.com');
    });

    it('should generate appropriate subject', async () => {
      const mockFetch = createGmailFetchMock();
      globalThis.fetch = mockFetch;
      
      await sendInternalNotification(mockStoredReport, reviewUrl, env, config);
      
      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      const mime = decodeBase64Url(callBody.raw);
      expect(mime).toContain('Subject: 【2024年1月15日】ACQ リリース内容報告');
    });
    it('should use Gmail sender name when provided', async () => {
      const mockFetch = createGmailFetchMock();
      globalThis.fetch = mockFetch;
      
      await sendInternalNotification(mockStoredReport, reviewUrl, env, config);
      
      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      const mime = decodeBase64Url(callBody.raw);
      expect(mime).toContain('From: Test Sender <test.sender@example.com>');
    });

    it('should fall back to sender email when name is empty', async () => {
      const envWithoutName = createMockEnv({
        overrides: { GMAIL_SENDER_NAME: '' },
      });
      const mockFetch = createGmailFetchMock();
      globalThis.fetch = mockFetch;
      
      await sendInternalNotification(mockStoredReport, reviewUrl, envWithoutName, config);
      
      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      const mime = decodeBase64Url(callBody.raw);
      expect(mime).toContain('From: test.sender@example.com');
    });

    it('should use Resend when Gmail config is missing', async () => {
      const envWithoutGmail = createMockEnv({
        overrides: {
          GMAIL_CLIENT_ID: undefined,
          GMAIL_CLIENT_SECRET: undefined,
          GMAIL_REFRESH_TOKEN: undefined,
          GMAIL_SENDER_EMAIL: undefined,
          GMAIL_SENDER_NAME: undefined,
        },
      });
      const mockFetch = createGmailFetchMock();
      globalThis.fetch = mockFetch;
      
      await sendInternalNotification(mockStoredReport, reviewUrl, envWithoutGmail, config);
      
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
  });

  describe('sendNoTasksNotification', () => {
    it('should send email for no tasks completed', async () => {
      const mockFetch = createGmailFetchMock();
      globalThis.fetch = mockFetch;
      
      await sendNoTasksNotification('2024年1月15日', ['AT-100'], env, config);
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should include parent issues in body', async () => {
      const mockFetch = createGmailFetchMock();
      globalThis.fetch = mockFetch;
      
      await sendNoTasksNotification('2024年1月15日', ['AT-100', 'AT-200'], env, config);
      
      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      const mime = decodeBase64Url(callBody.raw);
      expect(mime).toContain('AT-100');
      expect(mime).toContain('AT-200');
    });

    it('should have appropriate subject indicating no tasks', async () => {
      const mockFetch = createGmailFetchMock();
      globalThis.fetch = mockFetch;
      
      await sendNoTasksNotification('2024年1月15日', ['AT-100'], env, config);
      
      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      const mime = decodeBase64Url(callBody.raw);
      expect(mime).toContain('Subject: 【2024年1月15日】ACQ リリース内容報告');
    });

    it('should throw if internal email not configured', async () => {
      config.internalEmail = '';
      
      await expect(
        sendNoTasksNotification('2024年1月15日', ['AT-100'], env, config)
      ).rejects.toThrow('Internal email is not configured');
    });

    it('should send both text and HTML versions', async () => {
      const mockFetch = createGmailFetchMock();
      globalThis.fetch = mockFetch;
      
      await sendNoTasksNotification('2024年1月15日', ['AT-100'], env, config);
      
      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      const mime = decodeBase64Url(callBody.raw);
      expect(mime).toContain('Content-Type: text/plain');
      expect(mime).toContain('Content-Type: text/html');
      expect(mime).toContain('<!DOCTYPE html>');
    });
  });
});
