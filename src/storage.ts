import type { Env, StoredReport, DailyReport, AppConfig } from './types';
import { generateSubject, generateEmailBody } from './template';

/**
 * Generate a unique token (UUID v4)
 */
function generateToken(): string {
  return crypto.randomUUID();
}

/**
 * Store a report in KV and return the token
 */
export async function storeReport(
  dailyReport: DailyReport,
  env: Env,
  config: AppConfig
): Promise<StoredReport> {
  const token = generateToken();
  const ttlSeconds = config.reviewTokenTtl;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

  const storedReport: StoredReport = {
    id: token,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    dailyReport,
    defaultTo: config.defaultClientEmail,
    defaultCc: config.defaultCcEmail || '',
    defaultSubject: generateSubject(dailyReport),
    defaultBody: generateEmailBody(dailyReport),
  };

  // Store in KV with TTL
  await env.REPORT_KV.put(
    `report:${token}`,
    JSON.stringify(storedReport),
    { expirationTtl: ttlSeconds }
  );

  console.log(`Report stored with token: ${token}, expires at: ${expiresAt.toISOString()}`);

  return storedReport;
}

/**
 * Retrieve a report from KV by token
 */
export async function getReport(
  token: string,
  env: Env
): Promise<StoredReport | null> {
  const data = await env.REPORT_KV.get(`report:${token}`);

  if (!data) {
    return null;
  }

  try {
    const report: StoredReport = JSON.parse(data);
    
    // Double-check expiration (KV should handle this, but just in case)
    if (new Date(report.expiresAt) < new Date()) {
      console.log(`Report ${token} has expired`);
      return null;
    }

    return report;
  } catch (error) {
    console.error(`Error parsing report ${token}:`, error);
    return null;
  }
}

/**
 * Delete a report from KV (optional, for cleanup)
 */
export async function deleteReport(
  token: string,
  env: Env
): Promise<void> {
  await env.REPORT_KV.delete(`report:${token}`);
  console.log(`Report ${token} deleted`);
}

/**
 * Create a mock report for testing the review page
 * NOTE: This is FAKE DATA for UI testing only!
 */
export function createMockReport(env: Env, config: AppConfig): StoredReport {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 86400 * 1000);

  // Format current time for mock data
  const formatTime = (offsetMinutes: number): string => {
    const time = new Date(now.getTime() - offsetMinutes * 60 * 1000);
    return new Intl.DateTimeFormat('ja-JP', {
      timeZone: env.TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(time).replace(/\//g, '-');
  };

  const mockDailyReport: DailyReport = {
    date: new Intl.DateTimeFormat('ja-JP', {
      timeZone: env.TIMEZONE,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(now),
    reports: [
      {
        parentKey: 'MOCK-001',
        parentSummary: '【テスト】これはダミーデータです - 本番データではありません',
        completedToday: [
          {
            key: 'MOCK-101',
            summary: '【テスト】ダミータスク1 - UIテスト用',
            assignee: 'テスト太郎 / Test User',
            completedAt: formatTime(120), // 2 hours ago
            completedAtDate: new Date(now.getTime() - 120 * 60 * 1000),
          },
          {
            key: 'MOCK-102',
            summary: '【テスト】ダミータスク2 - UIテスト用',
            assignee: 'テスト花子 / Test User 2',
            completedAt: formatTime(30), // 30 minutes ago
            completedAtDate: new Date(now.getTime() - 30 * 60 * 1000),
          },
        ],
        totalSubtasks: 10,
        completedSubtasks: 8,
        progressPercent: 80,
      },
    ],
    totalCompletedToday: 2,
  };

  return {
    id: 'test-mock-token',
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    dailyReport: mockDailyReport,
    defaultTo: config.defaultClientEmail,
    defaultCc: config.defaultCcEmail || '',
    defaultSubject: generateSubject(mockDailyReport),
    defaultBody: generateEmailBody(mockDailyReport),
  };
}
