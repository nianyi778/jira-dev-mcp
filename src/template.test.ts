import { describe, it, expect } from 'vitest';
import {
  generateSubject,
  generateEmailBody,
  generateEmailBodyHtml,
  generateInternalNotificationSubject,
  generateInternalNotificationBody,
  generateInternalNotificationBodyHtml,
  generateNoTasksNotificationSubject,
  generateNoTasksNotificationBody,
  generateNoTasksNotificationBodyHtml,
} from './template';
import type { DailyReport, StoredReport } from './types';

describe('template', () => {
  const mockDailyReport: DailyReport = {
    date: '2024年01月15日',
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
          {
            key: 'AT-102',
            summary: 'Subtask 2',
            assignee: 'Another User',
            completedAt: '2024-01-15 16:00',
            completedAtDate: new Date('2024-01-15T07:00:00Z'),
          },
        ],
        totalSubtasks: 10,
        completedSubtasks: 7,
        progressPercent: 70,
      },
    ],
    totalCompletedToday: 2,
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

  describe('generateSubject', () => {
    it('should include date in slash format and report title', () => {
      const subject = generateSubject(mockDailyReport);
      
      expect(subject).toContain('2024/01/15');
      expect(subject).toContain('不具合releaseレポート');
    });

    it('should have correct format: date - title', () => {
      const subject = generateSubject(mockDailyReport);
      
      expect(subject).toBe('2024/01/15 - 不具合releaseレポート');
    });
  });

  describe('generateEmailBody', () => {
    it('should include greeting', () => {
      const body = generateEmailBody(mockDailyReport);
      
      expect(body).toContain('お疲れ様です');
    });

    it('should include date in title', () => {
      const body = generateEmailBody(mockDailyReport);
      
      expect(body).toContain('2024/01/15 - 不具合releaseレポート');
    });

    it('should include completed subtasks', () => {
      const body = generateEmailBody(mockDailyReport);
      
      expect(body).toContain('Subtask 1');
      expect(body).toContain('Subtask 2');
    });

    it('should include progress stats', () => {
      const body = generateEmailBody(mockDailyReport);
      
      expect(body).toContain('本日完了: 2 件');
      expect(body).toContain('release時刻');
    });

    it('should include checkmark emoji for completed tasks', () => {
      const body = generateEmailBody(mockDailyReport);
      
      expect(body).toContain('✅');
    });

    it('should include auto-generated notice', () => {
      const body = generateEmailBody(mockDailyReport);
      
      expect(body).toContain('自動送信');
    });
  });

  describe('generateEmailBodyHtml', () => {
    it('should return valid HTML', () => {
      const html = generateEmailBodyHtml(mockDailyReport);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
    });

    it('should include inline styles', () => {
      const html = generateEmailBodyHtml(mockDailyReport);
      
      expect(html).toContain('<style>');
      expect(html).toContain('font-family');
    });

    it('should include task data', () => {
      const html = generateEmailBodyHtml(mockDailyReport);
      
      expect(html).toContain('AT-100');
      expect(html).toContain('Subtask 1');
    });

    it('should include progress stats', () => {
      const html = generateEmailBodyHtml(mockDailyReport);
      
      expect(html).toContain('本日完了');
    });
  });

  describe('generateInternalNotificationSubject', () => {
    it('should include date and indication of action required', () => {
      const subject = generateInternalNotificationSubject(mockDailyReport);
      
      expect(subject).toContain('ACQ リリース内容報告');
      expect(subject).toContain('2024年01月15日');
    });
  });

  describe('generateInternalNotificationBody', () => {
    const reviewUrl = 'https://example.com/review/test-token-123';

    it('should include review URL', () => {
      const body = generateInternalNotificationBody(mockStoredReport, reviewUrl);
      
      expect(body).toContain(reviewUrl);
    });

    it('should include report summary', () => {
      const body = generateInternalNotificationBody(mockStoredReport, reviewUrl);
      
      expect(body).toContain('2024年01月15日');
      expect(body).toContain('AT-100');
      expect(body).toContain('2件');
    });

    it('should include expiration notice', () => {
      const body = generateInternalNotificationBody(mockStoredReport, reviewUrl);
      
      expect(body).toContain('24時間');
    });

    it('should include editing instructions', () => {
      const body = generateInternalNotificationBody(mockStoredReport, reviewUrl);
      
      expect(body).toContain('編集');
    });
  });

  describe('generateInternalNotificationBodyHtml', () => {
    const reviewUrl = 'https://example.com/review/test-token-123';

    it('should return valid HTML', () => {
    const html = generateInternalNotificationBodyHtml(mockStoredReport, reviewUrl, 'https://example.atlassian.net');
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
    });

    it('should include clickable button with review URL', () => {
    const html = generateInternalNotificationBodyHtml(mockStoredReport, reviewUrl, 'https://example.atlassian.net');
      
      expect(html).toContain(`href="${reviewUrl}"`);
      expect(html).toContain('確認ページを開く');
    });

    it('should include summary stats', () => {
    const html = generateInternalNotificationBodyHtml(mockStoredReport, reviewUrl, 'https://example.atlassian.net');
      
      expect(html).toContain('完了タスク');
      expect(html).toContain('2'); // totalCompletedToday
    });

    it('should include task list', () => {
    const html = generateInternalNotificationBodyHtml(mockStoredReport, reviewUrl, 'https://example.atlassian.net');
      
      expect(html).toContain('Subtask 1');
      expect(html).toContain('AT-101');
      expect(html).toContain('https://example.atlassian.net/browse/AT-101');
    });
  });

  describe('generateNoTasksNotificationSubject', () => {
    it('should indicate no tasks completed', () => {
      const subject = generateNoTasksNotificationSubject('2024年1月15日');
      
      expect(subject).toContain('ACQ リリース内容報告');
      expect(subject).toContain('2024年1月15日');
    });
  });

  describe('generateNoTasksNotificationBody', () => {
    it('should indicate no tasks completed', () => {
      const body = generateNoTasksNotificationBody('2024年1月15日', ['AT-100', 'AT-200']);
      
      expect(body).toContain('本日完了したサブタスクはありません');
      expect(body).toContain('2024年1月15日');
    });

    it('should list parent issues', () => {
      const body = generateNoTasksNotificationBody('2024年1月15日', ['AT-100', 'AT-200']);
      
      expect(body).toContain('AT-100');
      expect(body).toContain('AT-200');
    });

    it('should handle empty parent issues', () => {
      const body = generateNoTasksNotificationBody('2024年1月15日', []);
      
      expect(body).toContain('未設定');
    });
  });

  describe('generateNoTasksNotificationBodyHtml', () => {
    it('should return valid HTML', () => {
      const html = generateNoTasksNotificationBodyHtml('2024年1月15日', ['AT-100']);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
    });

    it('should show zero count prominently', () => {
      const html = generateNoTasksNotificationBodyHtml('2024年1月15日', ['AT-100']);
      
      expect(html).toContain('0');
    });

    it('should include parent issues', () => {
      const html = generateNoTasksNotificationBodyHtml('2024年1月15日', ['AT-100', 'AT-200']);
      
      expect(html).toContain('AT-100, AT-200');
    });

    it('should handle empty parent issues', () => {
      const html = generateNoTasksNotificationBodyHtml('2024年1月15日', []);
      
      expect(html).toContain('未設定');
    });
  });
});
