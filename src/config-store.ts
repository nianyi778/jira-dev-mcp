import type { Env, AppConfig } from './types';

/**
 * KV key prefixes for config
 */
const CONFIG_KEYS = {
  PARENT_ISSUES: 'config:parent_issues',
  DRY_RUN: 'config:dry_run',
  EMAIL_INTERNAL: 'config:email:internal',
  EMAIL_DEFAULT_CLIENT: 'config:email:default_client',
  EMAIL_DEFAULT_CC: 'config:email:default_cc',
  REVIEW_TOKEN_TTL: 'config:review_token_ttl',
  FEATURE_EMAIL_REPORT: 'config:feature:email_report',
  FEATURE_SLACK_REMINDER: 'config:feature:slack_reminder',
  SLACK_CHANNEL_NAME: 'config:slack:channel_name',
} as const;

/**
 * Default values for optional config
 */
const DEFAULTS: Partial<AppConfig> = {
  dryRun: false,
  defaultClientEmail: '',
  defaultCcEmail: '',
  reviewTokenTtl: 86400, // 24 hours
  featureEmailReport: true,
  featureSlackReminder: true,
  slackChannelName: '',
};

/**
 * Get a single config value from KV
 */
export async function getConfigValue(
  key: keyof typeof CONFIG_KEYS,
  env: Env
): Promise<string | null> {
  return await env.REPORT_KV.get(CONFIG_KEYS[key]);
}

/**
 * Set a single config value in KV
 */
export async function setConfigValue(
  key: keyof typeof CONFIG_KEYS,
  value: string,
  env: Env
): Promise<void> {
  await env.REPORT_KV.put(CONFIG_KEYS[key], value);
}

/**
 * Delete a config value from KV
 */
export async function deleteConfigValue(
  key: keyof typeof CONFIG_KEYS,
  env: Env
): Promise<void> {
  await env.REPORT_KV.delete(CONFIG_KEYS[key]);
}

/**
 * Get all config from KV with defaults
 */
export async function getConfig(env: Env): Promise<AppConfig> {
  const [
    parentIssues,
    dryRun,
    internalEmail,
    defaultClientEmail,
    defaultCcEmail,
    reviewTokenTtl,
    featureEmailReport,
    featureSlackReminder,
    slackChannelName,
  ] = await Promise.all([
    env.REPORT_KV.get(CONFIG_KEYS.PARENT_ISSUES),
    env.REPORT_KV.get(CONFIG_KEYS.DRY_RUN),
    env.REPORT_KV.get(CONFIG_KEYS.EMAIL_INTERNAL),
    env.REPORT_KV.get(CONFIG_KEYS.EMAIL_DEFAULT_CLIENT),
    env.REPORT_KV.get(CONFIG_KEYS.EMAIL_DEFAULT_CC),
    env.REPORT_KV.get(CONFIG_KEYS.REVIEW_TOKEN_TTL),
    env.REPORT_KV.get(CONFIG_KEYS.FEATURE_EMAIL_REPORT),
    env.REPORT_KV.get(CONFIG_KEYS.FEATURE_SLACK_REMINDER),
    env.REPORT_KV.get(CONFIG_KEYS.SLACK_CHANNEL_NAME),
  ]);

  return {
    parentIssues: parentIssues || '',
    dryRun: dryRun === 'true',
    internalEmail: internalEmail || '',
    defaultClientEmail: defaultClientEmail || DEFAULTS.defaultClientEmail!,
    defaultCcEmail: defaultCcEmail || DEFAULTS.defaultCcEmail!,
    reviewTokenTtl: reviewTokenTtl ? parseInt(reviewTokenTtl, 10) : DEFAULTS.reviewTokenTtl!,
    featureEmailReport: featureEmailReport !== 'false',
    featureSlackReminder: featureSlackReminder !== 'false',
    slackChannelName: slackChannelName || DEFAULTS.slackChannelName!,
  };
}

/**
 * Set all config values at once
 */
export async function setConfig(config: Partial<AppConfig>, env: Env): Promise<void> {
  const updates: Promise<void>[] = [];

  if (config.parentIssues !== undefined) {
    updates.push(env.REPORT_KV.put(CONFIG_KEYS.PARENT_ISSUES, config.parentIssues));
  }
  if (config.dryRun !== undefined) {
    updates.push(env.REPORT_KV.put(CONFIG_KEYS.DRY_RUN, config.dryRun.toString()));
  }
  if (config.internalEmail !== undefined) {
    updates.push(env.REPORT_KV.put(CONFIG_KEYS.EMAIL_INTERNAL, config.internalEmail));
  }
  if (config.defaultClientEmail !== undefined) {
    updates.push(env.REPORT_KV.put(CONFIG_KEYS.EMAIL_DEFAULT_CLIENT, config.defaultClientEmail));
  }
  if (config.defaultCcEmail !== undefined) {
    updates.push(env.REPORT_KV.put(CONFIG_KEYS.EMAIL_DEFAULT_CC, config.defaultCcEmail));
  }
  if (config.reviewTokenTtl !== undefined) {
    updates.push(env.REPORT_KV.put(CONFIG_KEYS.REVIEW_TOKEN_TTL, config.reviewTokenTtl.toString()));
  }
  if (config.featureEmailReport !== undefined) {
    updates.push(env.REPORT_KV.put(CONFIG_KEYS.FEATURE_EMAIL_REPORT, config.featureEmailReport.toString()));
  }
  if (config.featureSlackReminder !== undefined) {
    updates.push(env.REPORT_KV.put(CONFIG_KEYS.FEATURE_SLACK_REMINDER, config.featureSlackReminder.toString()));
  }
  if (config.slackChannelName !== undefined) {
    updates.push(env.REPORT_KV.put(CONFIG_KEYS.SLACK_CHANNEL_NAME, config.slackChannelName));
  }

  await Promise.all(updates);
}

/**
 * Validate required config
 * Returns list of missing required fields
 */
export async function validateConfig(env: Env): Promise<string[]> {
  const config = await getConfig(env);
  const missing: string[] = [];

  if (!config.parentIssues) {
    missing.push('parent_issues');
  }
  if (!config.internalEmail) {
    missing.push('email:internal');
  }

  return missing;
}

/**
 * Initialize config with default values (only if not already set)
 */
export async function initializeConfig(
  initialValues: Partial<AppConfig>,
  env: Env
): Promise<{ initialized: string[]; skipped: string[] }> {
  const initialized: string[] = [];
  const skipped: string[] = [];

  const keyMap: { key: keyof typeof CONFIG_KEYS; configKey: keyof AppConfig }[] = [
    { key: 'PARENT_ISSUES', configKey: 'parentIssues' },
    { key: 'DRY_RUN', configKey: 'dryRun' },
    { key: 'EMAIL_INTERNAL', configKey: 'internalEmail' },
    { key: 'EMAIL_DEFAULT_CLIENT', configKey: 'defaultClientEmail' },
    { key: 'EMAIL_DEFAULT_CC', configKey: 'defaultCcEmail' },
    { key: 'REVIEW_TOKEN_TTL', configKey: 'reviewTokenTtl' },
    { key: 'FEATURE_EMAIL_REPORT', configKey: 'featureEmailReport' },
    { key: 'FEATURE_SLACK_REMINDER', configKey: 'featureSlackReminder' },
    { key: 'SLACK_CHANNEL_NAME', configKey: 'slackChannelName' },
  ];

  for (const { key, configKey } of keyMap) {
    const value = initialValues[configKey];
    if (value === undefined) continue;

    const existing = await env.REPORT_KV.get(CONFIG_KEYS[key]);
    if (existing !== null) {
      skipped.push(configKey);
      continue;
    }

    const strValue = typeof value === 'boolean' ? value.toString() : 
                     typeof value === 'number' ? value.toString() : value;
    await env.REPORT_KV.put(CONFIG_KEYS[key], strValue);
    initialized.push(configKey);
  }

  return { initialized, skipped };
}

/**
 * Get raw config values for display (with KV keys)
 */
export async function getRawConfig(env: Env): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  
  for (const [name, key] of Object.entries(CONFIG_KEYS)) {
    result[key] = await env.REPORT_KV.get(key);
  }
  
  return result;
}
