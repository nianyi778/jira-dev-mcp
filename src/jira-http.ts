import type { ResolvedConfig } from './types.js';

export function buildAuthHeader(config: ResolvedConfig): string {
  if (config.jira.authMode === 'basic') {
    return `Basic ${Buffer.from(`${config.jira.email}:${config.jira.token}`).toString('base64')}`;
  }
  return `Bearer ${config.jira.token}`;
}

export function sanitizeErrorBody(text: string): string {
  if (!text) { return ''; }
  return text
    .replace(/[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[redacted-jwt]')
    .replace(/[A-Za-z0-9_\-]{20,}/g, '[redacted]')
    .slice(0, 500);
}

export function matchesMimeType(mimeType: string, allowed: string[]): boolean {
  return allowed.some((pattern) => {
    if (pattern.endsWith('/*')) {
      return mimeType.startsWith(pattern.slice(0, -1));
    }
    return mimeType === pattern;
  });
}

export function isTextMimeType(mimeType: string): boolean {
  return mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType.endsWith('+json');
}

const RETRYABLE_STATUSES = new Set([429, 503]);
const MAX_RETRIES = 2;

export async function jiraRequest<T>(config: ResolvedConfig, path: string, init?: RequestInit): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 1s, 2s
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
    }

    const response = await fetch(`${config.jira.baseUrl}${path}`, {
      ...init,
      signal: AbortSignal.timeout(30000),
      headers: {
        Authorization: buildAuthHeader(config),
        Accept: 'application/json',
        ...(init?.headers || {}),
      },
    });

    if (RETRYABLE_STATUSES.has(response.status)) {
      lastError = new Error(`Jira API error ${response.status}: ${sanitizeErrorBody(await response.text())}`);
      continue;
    }

    if (!response.ok) {
      throw new Error(`Jira API error ${response.status}: ${sanitizeErrorBody(await response.text())}`);
    }

    return response.json() as Promise<T>;
  }

  throw lastError ?? new Error('Jira request failed after retries');
}
