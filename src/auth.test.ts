import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  extractBearerToken,
  extractSessionToken,
  authenticate,
  requireAuth,
  createSessionCookie,
  createLogoutCookie,
  generateToken,
  createToken,
  deleteToken,
  listTokens,
  getLogs,
  getRecentLogs,
} from './auth';
import { createMockEnv } from '../test/mocks/env';
import type { TokenData } from './types';

describe('auth', () => {
  describe('extractBearerToken', () => {
    it('should extract valid 6-digit token from Authorization header', () => {
      const request = new Request('https://example.com', {
        headers: { Authorization: 'Bearer 123456' },
      });
      expect(extractBearerToken(request)).toBe('123456');
    });

    it('should handle lowercase bearer', () => {
      const request = new Request('https://example.com', {
        headers: { Authorization: 'bearer 654321' },
      });
      expect(extractBearerToken(request)).toBe('654321');
    });

    it('should return null for missing Authorization header', () => {
      const request = new Request('https://example.com');
      expect(extractBearerToken(request)).toBeNull();
    });

    it('should return null for invalid token format (not 6 digits)', () => {
      const request = new Request('https://example.com', {
        headers: { Authorization: 'Bearer 12345' },
      });
      expect(extractBearerToken(request)).toBeNull();
    });

    it('should return null for token with letters', () => {
      const request = new Request('https://example.com', {
        headers: { Authorization: 'Bearer abc123' },
      });
      expect(extractBearerToken(request)).toBeNull();
    });

    it('should return null for non-Bearer auth', () => {
      const request = new Request('https://example.com', {
        headers: { Authorization: 'Basic dXNlcjpwYXNz' },
      });
      expect(extractBearerToken(request)).toBeNull();
    });
  });

  describe('extractSessionToken', () => {
    it('should extract token from session cookie', () => {
      const request = new Request('https://example.com', {
        headers: { Cookie: 'jira_monitor_session=123456' },
      });
      expect(extractSessionToken(request)).toBe('123456');
    });

    it('should extract token from multiple cookies', () => {
      const request = new Request('https://example.com', {
        headers: { Cookie: 'other=value; jira_monitor_session=654321; another=test' },
      });
      expect(extractSessionToken(request)).toBe('654321');
    });

    it('should return null for missing Cookie header', () => {
      const request = new Request('https://example.com');
      expect(extractSessionToken(request)).toBeNull();
    });

    it('should return null when session cookie not present', () => {
      const request = new Request('https://example.com', {
        headers: { Cookie: 'other=value; another=test' },
      });
      expect(extractSessionToken(request)).toBeNull();
    });
  });

  describe('authenticate', () => {
    let env: ReturnType<typeof createMockEnv>;

    beforeEach(() => {
      env = createMockEnv();
    });

    it('should authenticate with super admin token via Bearer', async () => {
      const request = new Request('https://example.com', {
        headers: { Authorization: 'Bearer 999999' },
      });
      
      const result = await authenticate(request, env);
      
      expect(result.valid).toBe(true);
      expect(result.isSuperAdmin).toBe(true);
      expect(result.token).toBe('999999');
      expect(result.note).toBe('Super Admin');
    });

    it('should authenticate with valid KV token via Bearer', async () => {
      const tokenData: TokenData = {
        note: 'Test Token',
        createdAt: new Date().toISOString(),
        expiresAt: null,
        lastUsedAt: null,
      };
      await env.REPORT_KV.put('token:111111', JSON.stringify(tokenData));

      const request = new Request('https://example.com', {
        headers: { Authorization: 'Bearer 111111' },
      });
      
      const result = await authenticate(request, env);
      
      expect(result.valid).toBe(true);
      expect(result.isSuperAdmin).toBe(false);
      expect(result.token).toBe('111111');
      expect(result.note).toBe('Test Token');
    });

    it('should reject expired token', async () => {
      const tokenData: TokenData = {
        note: 'Expired Token',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        expiresAt: new Date(Date.now() - 86400000).toISOString(), // Expired yesterday
        lastUsedAt: null,
      };
      await env.REPORT_KV.put('token:222222', JSON.stringify(tokenData));

      const request = new Request('https://example.com', {
        headers: { Authorization: 'Bearer 222222' },
      });
      
      const result = await authenticate(request, env);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token expired');
    });

    it('should reject invalid token', async () => {
      const request = new Request('https://example.com', {
        headers: { Authorization: 'Bearer 000000' },
      });
      
      const result = await authenticate(request, env);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
    });

    it('should authenticate via session cookie', async () => {
      const tokenData: TokenData = {
        note: 'Session Token',
        createdAt: new Date().toISOString(),
        expiresAt: null,
        lastUsedAt: null,
      };
      await env.REPORT_KV.put('token:333333', JSON.stringify(tokenData));

      const request = new Request('https://example.com', {
        headers: { Cookie: 'jira_monitor_session=333333' },
      });
      
      const result = await authenticate(request, env);
      
      expect(result.valid).toBe(true);
      expect(result.token).toBe('333333');
    });

    it('should prefer Bearer token over session cookie', async () => {
      const tokenData: TokenData = {
        note: 'Cookie Token',
        createdAt: new Date().toISOString(),
        expiresAt: null,
        lastUsedAt: null,
      };
      await env.REPORT_KV.put('token:444444', JSON.stringify(tokenData));

      const request = new Request('https://example.com', {
        headers: {
          Authorization: 'Bearer 999999', // Super admin
          Cookie: 'jira_monitor_session=444444',
        },
      });
      
      const result = await authenticate(request, env);
      
      expect(result.valid).toBe(true);
      expect(result.isSuperAdmin).toBe(true);
      expect(result.token).toBe('999999');
    });

    it('should return error when no authentication provided', async () => {
      const request = new Request('https://example.com');
      
      const result = await authenticate(request, env);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing authentication');
    });

    it('should update lastUsedAt on successful KV token auth', async () => {
      const tokenData: TokenData = {
        note: 'Test Token',
        createdAt: new Date().toISOString(),
        expiresAt: null,
        lastUsedAt: null,
      };
      await env.REPORT_KV.put('token:555555', JSON.stringify(tokenData));

      const request = new Request('https://example.com', {
        headers: { Authorization: 'Bearer 555555' },
      });
      
      await authenticate(request, env);
      
      const updatedData = await env.REPORT_KV.get<TokenData>('token:555555', 'json');
      expect(updatedData?.lastUsedAt).not.toBeNull();
    });
  });

  describe('requireAuth', () => {
    let env: ReturnType<typeof createMockEnv>;

    beforeEach(() => {
      env = createMockEnv();
    });

    it('should return null errorResponse for valid auth', async () => {
      const request = new Request('https://example.com/api/test', {
        headers: { Authorization: 'Bearer 999999' },
      });
      
      const { auth, errorResponse } = await requireAuth(request, env);
      
      expect(auth.valid).toBe(true);
      expect(errorResponse).toBeNull();
    });

    it('should return JSON error for API request without auth', async () => {
      const request = new Request('https://example.com/api/test');
      
      const { auth, errorResponse } = await requireAuth(request, env);
      
      expect(auth.valid).toBe(false);
      expect(errorResponse).not.toBeNull();
      expect(errorResponse?.status).toBe(401);
      expect(errorResponse?.headers.get('Content-Type')).toBe('application/json');
    });

    it('should redirect to login for web request with redirectToLogin option', async () => {
      const request = new Request('https://example.com/config');
      
      const { auth, errorResponse } = await requireAuth(request, env, {
        redirectToLogin: true,
      });
      
      expect(auth.valid).toBe(false);
      expect(errorResponse).not.toBeNull();
      expect(errorResponse?.status).toBe(302);
      expect(errorResponse?.headers.get('Location')).toContain('/login');
    });

    it('should include redirect path in login URL', async () => {
      const request = new Request('https://example.com/config');
      
      const { errorResponse } = await requireAuth(request, env, {
        redirectToLogin: true,
        redirectPath: '/custom/path',
      });
      
      expect(errorResponse?.headers.get('Location')).toContain(
        encodeURIComponent('/custom/path')
      );
    });
  });

  describe('createSessionCookie', () => {
    it('should create valid session cookie', () => {
      const cookie = createSessionCookie('123456');
      
      expect(cookie).toContain('jira_monitor_session=123456');
      expect(cookie).toContain('Path=/');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Max-Age=');
    });
  });

  describe('createLogoutCookie', () => {
    it('should create cookie that clears session', () => {
      const cookie = createLogoutCookie();
      
      expect(cookie).toContain('jira_monitor_session=');
      expect(cookie).toContain('Max-Age=0');
    });
  });

  describe('generateToken', () => {
    it('should generate 6-digit numeric string', () => {
      const token = generateToken();
      
      expect(token).toMatch(/^\d{6}$/);
    });

    it('should generate different tokens on multiple calls', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateToken());
      }
      // Should have mostly unique tokens (allow some collisions)
      expect(tokens.size).toBeGreaterThan(90);
    });
  });

  describe('createToken', () => {
    let env: ReturnType<typeof createMockEnv>;

    beforeEach(() => {
      env = createMockEnv();
    });

    it('should create token with note', async () => {
      const { token, data } = await createToken('Test Note', env);
      
      expect(token).toMatch(/^\d{6}$/);
      expect(data.note).toBe('Test Note');
      expect(data.createdAt).toBeDefined();
      expect(data.expiresAt).toBeNull();
      expect(data.lastUsedAt).toBeNull();
    });

    it('should create token with expiration', async () => {
      const { token, data } = await createToken('Expiring Token', env, 7);
      
      expect(data.expiresAt).not.toBeNull();
      const expiresAt = new Date(data.expiresAt!);
      const expectedExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      // Allow 1 minute tolerance
      expect(Math.abs(expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(60000);
    });

    it('should store token in KV', async () => {
      const { token } = await createToken('Stored Token', env);
      
      const stored = await env.REPORT_KV.get(`token:${token}`);
      expect(stored).not.toBeNull();
    });
  });

  describe('deleteToken', () => {
    let env: ReturnType<typeof createMockEnv>;

    beforeEach(() => {
      env = createMockEnv();
    });

    it('should delete existing token', async () => {
      const tokenData: TokenData = {
        note: 'To Delete',
        createdAt: new Date().toISOString(),
        expiresAt: null,
        lastUsedAt: null,
      };
      await env.REPORT_KV.put('token:666666', JSON.stringify(tokenData));
      
      const result = await deleteToken('666666', env);
      
      expect(result).toBe(true);
      expect(await env.REPORT_KV.get('token:666666')).toBeNull();
    });

    it('should return false for non-existent token', async () => {
      const result = await deleteToken('000000', env);
      
      expect(result).toBe(false);
    });
  });

  describe('listTokens', () => {
    let env: ReturnType<typeof createMockEnv>;

    beforeEach(() => {
      env = createMockEnv();
    });

    it('should list all tokens', async () => {
      const token1: TokenData = {
        note: 'Token 1',
        createdAt: new Date().toISOString(),
        expiresAt: null,
        lastUsedAt: null,
      };
      const token2: TokenData = {
        note: 'Token 2',
        createdAt: new Date().toISOString(),
        expiresAt: null,
        lastUsedAt: null,
      };
      
      await env.REPORT_KV.put('token:111111', JSON.stringify(token1));
      await env.REPORT_KV.put('token:222222', JSON.stringify(token2));
      
      const tokens = await listTokens(env);
      
      expect(tokens).toHaveLength(2);
      expect(tokens.map(t => t.token).sort()).toEqual(['111111', '222222']);
    });

    it('should return empty array when no tokens', async () => {
      const tokens = await listTokens(env);
      
      expect(tokens).toHaveLength(0);
    });
  });

  describe('getLogs', () => {
    let env: ReturnType<typeof createMockEnv>;

    beforeEach(() => {
      env = createMockEnv();
    });

    it('should return logs for specific date', async () => {
      const logs = [
        { token: '123456', note: 'Test', endpoint: '/api', method: 'GET', ip: '1.2.3.4', timestamp: '2024-01-15T10:00:00Z' },
      ];
      await env.REPORT_KV.put('log:2024-01-15', JSON.stringify(logs));
      
      const result = await getLogs('2024-01-15', env);
      
      expect(result).toHaveLength(1);
      expect(result[0].token).toBe('123456');
    });

    it('should return empty array for date without logs', async () => {
      const result = await getLogs('2024-01-01', env);
      
      expect(result).toHaveLength(0);
    });
  });

  describe('getRecentLogs', () => {
    let env: ReturnType<typeof createMockEnv>;

    beforeEach(() => {
      env = createMockEnv();
    });

    it('should return logs for recent days', async () => {
      const today = new Date().toISOString().split('T')[0];
      const logs = [
        { token: '123456', note: 'Test', endpoint: '/api', method: 'GET', ip: '1.2.3.4', timestamp: new Date().toISOString() },
      ];
      await env.REPORT_KV.put(`log:${today}`, JSON.stringify(logs));
      
      const result = await getRecentLogs(7, env);
      
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].date).toBe(today);
    });
  });
});
