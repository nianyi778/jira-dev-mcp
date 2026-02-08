/**
 * Mock Env factory for testing
 */

import type { Env } from '../../src/types';
import { createMockKV, type MockKVNamespace } from './kv';

type TokenRow = {
  token: string;
  note: string;
  created_at: number;
  expires_at: number | null;
  last_used_at: number | null;
  is_disabled: number;
};

type LogRow = {
  token: string;
  note: string;
  endpoint: string;
  method: string;
  ip: string;
  timestamp: number;
};

function createMockD1(): D1Database {
  const tokens: TokenRow[] = [];
  const logs: LogRow[] = [];

  const statement = (sql: string) => {
    let bound: Array<string | number | null> = [];
    const bind = (...args: Array<string | number | null>) => {
      bound = args;
      return api;
    };

    const first = async <T>() => {
      if (sql.includes('FROM tokens') && sql.includes('WHERE token = ?')) {
        const token = bound[0] as string;
        const row = tokens.find(t => t.token === token);
        return (row ? (row as unknown as T) : null) as T | null;
      }
      return null as T | null;
    };

    const all = async <T>() => {
      if (sql.includes('FROM tokens')) {
        return { results: tokens.slice().sort((a, b) => b.created_at - a.created_at) as unknown as T[] };
      }
      if (sql.includes('FROM token_logs')) {
        let result = logs.slice();
        if (sql.includes('timestamp BETWEEN')) {
          const start = bound[0] as number;
          const end = bound[1] as number;
          result = result.filter(l => l.timestamp >= start && l.timestamp <= end);
          return { results: result as unknown as T[] };
        }
        return { results: result as unknown as T[] };
      }
      return { results: [] as T[] };
    };

    const run = async () => {
      if (sql.startsWith('INSERT INTO tokens')) {
        const [token, note, created_at, expires_at, last_used_at] = bound as [string, string, number, number | null, number | null];
        tokens.push({ token, note, created_at, expires_at, last_used_at, is_disabled: 0 });
      } else if (sql.startsWith('UPDATE tokens SET last_used_at')) {
        const [last_used_at, token] = bound as [number, string];
        const row = tokens.find(t => t.token === token);
        if (row) row.last_used_at = last_used_at;
      } else if (sql.startsWith('UPDATE tokens SET is_disabled = 1')) {
        const token = bound[0] as string;
        const row = tokens.find(t => t.token === token);
        if (row) row.is_disabled = 1;
      } else if (sql.startsWith('UPDATE tokens SET is_disabled = 0')) {
        const token = bound[0] as string;
        const row = tokens.find(t => t.token === token);
        if (row) row.is_disabled = 0;
      } else if (sql.startsWith('INSERT INTO token_logs')) {
        const [token, note, endpoint, method, ip, timestamp] = bound as [string, string, string, string, string, number];
        logs.push({ token, note, endpoint, method, ip, timestamp });
      } else if (sql.startsWith('DELETE FROM token_logs')) {
        const cutoff = bound[0] as number;
        for (let i = logs.length - 1; i >= 0; i--) {
          if (logs[i].timestamp < cutoff) logs.splice(i, 1);
        }
      }
      return { success: true };
    };

    const api = { bind, first, all, run };
    return api;
  };

  return {
    prepare: (sql: string) => statement(sql),
  } as unknown as D1Database;
}

export interface MockEnvOptions {
  /** Override default env values */
  overrides?: Partial<Env>;
  /** Initial KV data */
  kvData?: Record<string, string>;
}

/**
 * Default test environment values
 */
const DEFAULT_ENV: Omit<Env, 'REPORT_KV' | 'TOKEN_DB'> = {
  JIRA_BASE_URL: 'https://test.atlassian.net',
  TIMEZONE: 'Asia/Tokyo',
  WORKER_BASE_URL: 'https://test-worker.example.com',
  SUPER_ADMIN_TOKEN: '999999',
  BRAND_NAME: 'Test Brand',
  BRAND_URL: 'https://example.com',
  SUPPORT_EMAIL: 'admin@example.com',
  JIRA_EMAIL: 'test@example.com',
  JIRA_API_TOKEN: 'test-jira-token',
  RESEND_API_KEY: 'test-resend-key',
  RESEND_FROM_EMAIL: 'Test <test@example.com>',
  SLACK_WEBHOOK_URL: 'https://hooks.slack.com/test',
};

/**
 * Creates a mock Env object for testing
 */
export function createMockEnv(options: MockEnvOptions = {}): Env & { REPORT_KV: MockKVNamespace } {
  const mockKV = createMockKV({ initialData: options.kvData }) as MockKVNamespace;
  
  return {
    ...DEFAULT_ENV,
    ...options.overrides,
    REPORT_KV: mockKV,
    TOKEN_DB: createMockD1(),
  };
}

/**
 * Creates a minimal mock Env with only required fields
 */
export function createMinimalEnv(kvData?: Record<string, string>): Env & { REPORT_KV: MockKVNamespace } {
  const mockKV = createMockKV({ initialData: kvData }) as MockKVNamespace;
  
  return {
    JIRA_BASE_URL: 'https://test.atlassian.net',
    TIMEZONE: 'Asia/Tokyo',
    WORKER_BASE_URL: 'https://test-worker.example.com',
    SUPER_ADMIN_TOKEN: '123456',
    BRAND_NAME: 'Test Brand',
    BRAND_URL: 'https://example.com',
    SUPPORT_EMAIL: 'admin@example.com',
    JIRA_EMAIL: 'test@example.com',
    JIRA_API_TOKEN: 'test-token',
    REPORT_KV: mockKV,
    TOKEN_DB: createMockD1(),
  };
}

/**
 * Creates a mock Env without optional secrets (for dry run tests)
 */
export function createDryRunEnv(kvData?: Record<string, string>): Env & { REPORT_KV: MockKVNamespace } {
  const mockKV = createMockKV({ initialData: kvData }) as MockKVNamespace;
  
  return {
    JIRA_BASE_URL: 'https://test.atlassian.net',
    TIMEZONE: 'Asia/Tokyo',
    WORKER_BASE_URL: 'https://test-worker.example.com',
    SUPER_ADMIN_TOKEN: '123456',
    BRAND_NAME: 'Test Brand',
    BRAND_URL: 'https://example.com',
    SUPPORT_EMAIL: 'admin@example.com',
    JIRA_EMAIL: 'test@example.com',
    JIRA_API_TOKEN: 'test-token',
    REPORT_KV: mockKV,
    TOKEN_DB: createMockD1(),
    // No RESEND_API_KEY, RESEND_FROM_EMAIL, or SLACK_WEBHOOK_URL
  };
}
