import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storeReport, getReport, deleteReport, createMockReport } from './storage';
import { createMockEnv } from '../test/mocks/env';
import type { DailyReport, AppConfig, StoredReport } from './types';

describe('storage', () => {
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
  });

  describe('storeReport', () => {
    it('should store report and return stored data', async () => {
      const stored = await storeReport(mockDailyReport, env, config);
      
      expect(stored.id).toBeDefined();
      expect(stored.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      expect(stored.dailyReport).toEqual(mockDailyReport);
      expect(stored.defaultTo).toBe('client@test.com');
      expect(stored.defaultCc).toBe('cc@test.com');
    });

    it('should set expiration based on config TTL', async () => {
      const stored = await storeReport(mockDailyReport, env, config);
      
      const createdAt = new Date(stored.createdAt);
      const expiresAt = new Date(stored.expiresAt);
      const ttlMs = expiresAt.getTime() - createdAt.getTime();
      
      // Should be approximately 24 hours (86400 seconds)
      expect(Math.abs(ttlMs - 86400 * 1000)).toBeLessThan(1000);
    });

    it('should generate email subject and body', async () => {
      const stored = await storeReport(mockDailyReport, env, config);
      
      expect(stored.defaultSubject).toContain('不具合releaseレポート');
      expect(stored.defaultBody).toContain('お疲れ様です');
    });

    it('should store report in KV', async () => {
      const stored = await storeReport(mockDailyReport, env, config);
      
      const kvData = await env.REPORT_KV.get(`report:${stored.id}`);
      expect(kvData).not.toBeNull();
      
      const parsed = JSON.parse(kvData!);
      expect(parsed.id).toBe(stored.id);
    });

    it('should handle empty CC email', async () => {
      config.defaultCcEmail = '';
      
      const stored = await storeReport(mockDailyReport, env, config);
      
      expect(stored.defaultCc).toBe('');
    });
  });

  describe('getReport', () => {
    it('should retrieve stored report by token', async () => {
      // Store a report first
      const stored = await storeReport(mockDailyReport, env, config);
      
      const retrieved = await getReport(stored.id, env);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(stored.id);
      // Date objects get serialized to strings in JSON, so compare key fields
      expect(retrieved?.dailyReport.date).toBe(mockDailyReport.date);
      expect(retrieved?.dailyReport.totalCompletedToday).toBe(mockDailyReport.totalCompletedToday);
      expect(retrieved?.dailyReport.reports[0].parentKey).toBe(mockDailyReport.reports[0].parentKey);
    });

    it('should return null for non-existent token', async () => {
      const retrieved = await getReport('non-existent-token', env);
      
      expect(retrieved).toBeNull();
    });

    it('should return null for expired report', async () => {
      // Manually create an expired report
      const expiredReport: StoredReport = {
        id: 'expired-token',
        createdAt: new Date(Date.now() - 86400 * 2 * 1000).toISOString(), // 2 days ago
        expiresAt: new Date(Date.now() - 86400 * 1000).toISOString(), // 1 day ago
        dailyReport: mockDailyReport,
        defaultTo: 'test@test.com',
        defaultCc: '',
        defaultSubject: 'Test',
        defaultBody: 'Test body',
      };
      
      await env.REPORT_KV.put('report:expired-token', JSON.stringify(expiredReport));
      
      const retrieved = await getReport('expired-token', env);
      
      expect(retrieved).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      await env.REPORT_KV.put('report:invalid', 'not valid json');
      
      const retrieved = await getReport('invalid', env);
      
      expect(retrieved).toBeNull();
    });
  });

  describe('deleteReport', () => {
    it('should delete existing report', async () => {
      const stored = await storeReport(mockDailyReport, env, config);
      
      await deleteReport(stored.id, env);
      
      const retrieved = await getReport(stored.id, env);
      expect(retrieved).toBeNull();
    });

    it('should not throw for non-existent report', async () => {
      await expect(deleteReport('non-existent', env)).resolves.not.toThrow();
    });
  });

  describe('createMockReport', () => {
    it('should create mock report with test data', () => {
      const mock = createMockReport(env, config);
      
      expect(mock.id).toBe('test-mock-token');
      expect(mock.dailyReport.reports).toHaveLength(1);
      expect(mock.dailyReport.reports[0].parentKey).toBe('MOCK-001');
    });

    it('should include mock completed tasks', () => {
      const mock = createMockReport(env, config);
      
      const tasks = mock.dailyReport.reports[0].completedToday;
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks[0].key).toContain('MOCK');
    });

    it('should use config default emails', () => {
      const mock = createMockReport(env, config);
      
      expect(mock.defaultTo).toBe(config.defaultClientEmail);
      expect(mock.defaultCc).toBe(config.defaultCcEmail);
    });

    it('should have valid expiration', () => {
      const mock = createMockReport(env, config);
      
      const expiresAt = new Date(mock.expiresAt);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should generate subject and body', () => {
      const mock = createMockReport(env, config);
      
      expect(mock.defaultSubject).toBeDefined();
      expect(mock.defaultSubject.length).toBeGreaterThan(0);
      expect(mock.defaultBody).toBeDefined();
      expect(mock.defaultBody.length).toBeGreaterThan(0);
    });

    it('should indicate test data in content', () => {
      const mock = createMockReport(env, config);
      
      expect(mock.dailyReport.reports[0].parentSummary).toContain('テスト');
      expect(mock.dailyReport.reports[0].parentSummary).toContain('ダミー');
    });
  });
});
