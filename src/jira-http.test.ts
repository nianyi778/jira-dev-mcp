import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithRetry } from './jira-http.js';

describe('fetchWithRetry', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('retries retryable responses before succeeding', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const response = await fetchWithRetry('https://files.example/report.txt', undefined, {
      requestLabel: 'Attachment download',
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(await response.text()).toBe('ok');
  });
});
