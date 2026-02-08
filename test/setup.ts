/**
 * Vitest test setup file
 * This file runs before all tests
 */

import { vi, beforeEach, afterEach } from 'vitest';

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Clean up after each test
afterEach(() => {
  vi.restoreAllMocks();
});

// Mock global fetch for all tests
const originalFetch = globalThis.fetch;

beforeEach(() => {
  // Default fetch mock that throws if not explicitly mocked
  globalThis.fetch = vi.fn().mockRejectedValue(
    new Error('fetch not mocked - please mock fetch for this test')
  );
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// Utility to create a mock Response
export function mockResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

// Utility to create a mock Request
export function mockRequest(
  url: string,
  options?: RequestInit & { headers?: Record<string, string> }
): Request {
  const headers = new Headers(options?.headers);
  return new Request(url, { ...options, headers });
}
