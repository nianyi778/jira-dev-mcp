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

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: { timeoutMs?: number; requestLabel?: string },
): Promise<Response> {
  let lastError: Error | null = null;
  const timeoutMs = options?.timeoutMs ?? 30_000;
  const requestLabel = options?.requestLabel ?? 'Request';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }

    if (RETRYABLE_STATUSES.has(response.status)) {
      lastError = new Error(`${requestLabel} error ${response.status}: ${sanitizeErrorBody(await response.text())}`);
      continue;
    }

    if (!response.ok) {
      throw new Error(`${requestLabel} error ${response.status}: ${sanitizeErrorBody(await response.text())}`);
    }

    return response;
  }

  throw lastError ?? new Error(`${requestLabel} failed after retries`);
}

export async function jiraRequest<T>(config: ResolvedConfig, path: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithRetry(`${config.jira.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: buildAuthHeader(config),
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  }, {
    timeoutMs: 30_000,
    requestLabel: 'Jira API',
  });

  return response.json() as Promise<T>;
}
