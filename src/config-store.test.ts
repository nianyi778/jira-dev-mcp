import { describe, it, expect, beforeEach } from 'vitest';
import {
  getConfigValue,
  setConfigValue,
  deleteConfigValue,
  getConfig,
  setConfig,
  validateConfig,
  initializeConfig,
  getRawConfig,
} from './config-store';
import { createMockEnv } from '../test/mocks/env';

describe('config-store', () => {
  let env: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    env = createMockEnv();
  });

  describe('getConfigValue', () => {
    it('should return config value from KV', async () => {
      await env.REPORT_KV.put('config:parent_issues', 'AT-100,AT-200');
      
      const value = await getConfigValue('PARENT_ISSUES', env);
      
      expect(value).toBe('AT-100,AT-200');
    });

    it('should return null for missing config', async () => {
      const value = await getConfigValue('PARENT_ISSUES', env);
      
      expect(value).toBeNull();
    });
  });

  describe('setConfigValue', () => {
    it('should store config value in KV', async () => {
      await setConfigValue('PARENT_ISSUES', 'AT-300', env);
      
      const stored = await env.REPORT_KV.get('config:parent_issues');
      expect(stored).toBe('AT-300');
    });
  });

  describe('deleteConfigValue', () => {
    it('should delete config value from KV', async () => {
      await env.REPORT_KV.put('config:parent_issues', 'AT-100');
      
      await deleteConfigValue('PARENT_ISSUES', env);
      
      const stored = await env.REPORT_KV.get('config:parent_issues');
      expect(stored).toBeNull();
    });
  });

  describe('getConfig', () => {
    it('should return config with defaults', async () => {
      const config = await getConfig(env);
      
      expect(config.parentIssues).toBe('');
      expect(config.dryRun).toBe(false);
      expect(config.internalEmail).toBe('');
      expect(config.defaultClientEmail).toBe('');
      expect(config.defaultCcEmail).toBe('');
      expect(config.reviewTokenTtl).toBe(86400);
      expect(config.featureEmailReport).toBe(true);
      expect(config.featureSlackReminder).toBe(true);
      expect(config.slackChannelName).toBe('');
    });

    it('should return stored config values', async () => {
      await env.REPORT_KV.put('config:parent_issues', 'AT-100');
      await env.REPORT_KV.put('config:dry_run', 'true');
      await env.REPORT_KV.put('config:email:internal', 'internal@test.com');
      await env.REPORT_KV.put('config:email:default_client', 'client@test.com');
      await env.REPORT_KV.put('config:email:default_cc', 'cc@test.com');
      await env.REPORT_KV.put('config:review_token_ttl', '3600');
      await env.REPORT_KV.put('config:feature:email_report', 'false');
      await env.REPORT_KV.put('config:feature:slack_reminder', 'false');
      await env.REPORT_KV.put('config:slack:channel_name', '#general');
      
      const config = await getConfig(env);
      
      expect(config.parentIssues).toBe('AT-100');
      expect(config.dryRun).toBe(true);
      expect(config.internalEmail).toBe('internal@test.com');
      expect(config.defaultClientEmail).toBe('client@test.com');
      expect(config.defaultCcEmail).toBe('cc@test.com');
      expect(config.reviewTokenTtl).toBe(3600);
      expect(config.featureEmailReport).toBe(false);
      expect(config.featureSlackReminder).toBe(false);
      expect(config.slackChannelName).toBe('#general');
    });

    it('should handle dryRun=false stored value', async () => {
      await env.REPORT_KV.put('config:dry_run', 'false');
      
      const config = await getConfig(env);
      
      expect(config.dryRun).toBe(false);
    });

    it('should default featureEmailReport to true if not explicitly false', async () => {
      await env.REPORT_KV.put('config:feature:email_report', 'true');
      
      const config = await getConfig(env);
      
      expect(config.featureEmailReport).toBe(true);
    });
  });

  describe('setConfig', () => {
    it('should set all provided config values', async () => {
      await setConfig({
        parentIssues: 'AT-500',
        dryRun: true,
        internalEmail: 'new@test.com',
        reviewTokenTtl: 7200,
      }, env);
      
      expect(await env.REPORT_KV.get('config:parent_issues')).toBe('AT-500');
      expect(await env.REPORT_KV.get('config:dry_run')).toBe('true');
      expect(await env.REPORT_KV.get('config:email:internal')).toBe('new@test.com');
      expect(await env.REPORT_KV.get('config:review_token_ttl')).toBe('7200');
    });

    it('should not modify unspecified values', async () => {
      await env.REPORT_KV.put('config:parent_issues', 'AT-100');
      
      await setConfig({ dryRun: true }, env);
      
      expect(await env.REPORT_KV.get('config:parent_issues')).toBe('AT-100');
      expect(await env.REPORT_KV.get('config:dry_run')).toBe('true');
    });

    it('should set boolean values correctly', async () => {
      await setConfig({
        dryRun: false,
        featureEmailReport: true,
        featureSlackReminder: false,
      }, env);
      
      expect(await env.REPORT_KV.get('config:dry_run')).toBe('false');
      expect(await env.REPORT_KV.get('config:feature:email_report')).toBe('true');
      expect(await env.REPORT_KV.get('config:feature:slack_reminder')).toBe('false');
    });
  });

  describe('validateConfig', () => {
    it('should return missing fields when config incomplete', async () => {
      const missing = await validateConfig(env);
      
      expect(missing).toContain('parent_issues');
      expect(missing).toContain('email:internal');
    });

    it('should return empty array when config valid', async () => {
      await env.REPORT_KV.put('config:parent_issues', 'AT-100');
      await env.REPORT_KV.put('config:email:internal', 'internal@test.com');
      
      const missing = await validateConfig(env);
      
      expect(missing).toHaveLength(0);
    });

    it('should only require essential fields', async () => {
      // Only parent_issues and internalEmail are required
      await env.REPORT_KV.put('config:parent_issues', 'AT-100');
      await env.REPORT_KV.put('config:email:internal', 'test@test.com');
      
      const missing = await validateConfig(env);
      
      expect(missing).toEqual([]);
    });
  });

  describe('initializeConfig', () => {
    it('should initialize only missing values', async () => {
      // Pre-set one value
      await env.REPORT_KV.put('config:parent_issues', 'EXISTING');
      
      const result = await initializeConfig({
        parentIssues: 'NEW_VALUE',
        dryRun: true,
        internalEmail: 'init@test.com',
      }, env);
      
      expect(result.initialized).toContain('dryRun');
      expect(result.initialized).toContain('internalEmail');
      expect(result.skipped).toContain('parentIssues');
      
      // Original value should remain
      expect(await env.REPORT_KV.get('config:parent_issues')).toBe('EXISTING');
      // New values should be set
      expect(await env.REPORT_KV.get('config:dry_run')).toBe('true');
    });

    it('should handle empty initial values', async () => {
      const result = await initializeConfig({}, env);
      
      expect(result.initialized).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
    });

    it('should initialize numeric values correctly', async () => {
      await initializeConfig({
        reviewTokenTtl: 3600,
      }, env);
      
      expect(await env.REPORT_KV.get('config:review_token_ttl')).toBe('3600');
    });
  });

  describe('getRawConfig', () => {
    it('should return all config keys with their values', async () => {
      await env.REPORT_KV.put('config:parent_issues', 'AT-100');
      await env.REPORT_KV.put('config:dry_run', 'true');
      
      const raw = await getRawConfig(env);
      
      expect(raw['config:parent_issues']).toBe('AT-100');
      expect(raw['config:dry_run']).toBe('true');
      expect(raw['config:email:internal']).toBeNull();
    });

    it('should return all null values for empty config', async () => {
      const raw = await getRawConfig(env);
      
      expect(raw['config:parent_issues']).toBeNull();
      expect(raw['config:dry_run']).toBeNull();
    });
  });
});
