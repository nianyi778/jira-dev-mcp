/**
 * Mock Env factory for testing
 */

import type { Env } from '../../src/types';
import { createMockKV, type MockKVNamespace } from './kv';

export interface MockEnvOptions {
  /** Override default env values */
  overrides?: Partial<Env>;
  /** Initial KV data */
  kvData?: Record<string, string>;
}

/**
 * Default test environment values
 */
const DEFAULT_ENV: Omit<Env, 'REPORT_KV'> = {
  JIRA_BASE_URL: 'https://test.atlassian.net',
  TIMEZONE: 'Asia/Tokyo',
  WORKER_BASE_URL: 'https://test-worker.example.com',
  SUPER_ADMIN_TOKEN: '999999',
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
    JIRA_EMAIL: 'test@example.com',
    JIRA_API_TOKEN: 'test-token',
    REPORT_KV: mockKV,
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
    JIRA_EMAIL: 'test@example.com',
    JIRA_API_TOKEN: 'test-token',
    REPORT_KV: mockKV,
    // No RESEND_API_KEY, RESEND_FROM_EMAIL, or SLACK_WEBHOOK_URL
  };
}
