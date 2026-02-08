import type { Env, TokenData, AuthResult, LogEntry } from './types';

// Cookie name for session
const SESSION_COOKIE_NAME = 'jira_monitor_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;
  
  const match = authHeader.match(/^Bearer\s+(\d{6})$/i);
  return match ? match[1] : null;
}

/**
 * Extract session token from Cookie
 */
export function extractSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === SESSION_COOKIE_NAME && value) {
      return value;
    }
  }
  return null;
}

/**
 * Validate a token (either from Bearer header or Cookie)
 */
async function validateToken(
  token: string,
  env: Env,
  request: Request,
  logUsage: boolean = true
): Promise<AuthResult> {
  // Check super admin token first
  if (env.SUPER_ADMIN_TOKEN && token === env.SUPER_ADMIN_TOKEN) {
    return {
      valid: true,
      isSuperAdmin: true,
      token,
      note: 'Super Admin',
    };
  }

  // Check D1 token
  const result = await env.TOKEN_DB.prepare(
    'SELECT token, note, created_at, expires_at, last_used_at, is_disabled FROM tokens WHERE token = ? LIMIT 1'
  ).bind(token).first<{ token: string; note: string; created_at: number; expires_at: number | null; last_used_at: number | null; is_disabled: number }>();

  if (!result) {
    return { valid: false, error: 'Invalid token' };
  }

  if (result.is_disabled) {
    return { valid: false, error: 'Token disabled' };
  }

  if (result.expires_at && result.expires_at < Date.now()) {
    return { valid: false, error: 'Token expired' };
  }

  const nowMs = Date.now();
  await env.TOKEN_DB.prepare(
    'UPDATE tokens SET last_used_at = ? WHERE token = ?'
  ).bind(nowMs, token).run();

  if (logUsage) {
    logTokenUsage(token, result.note, request, env).catch(console.error);
  }

  return {
    valid: true,
    isSuperAdmin: false,
    token,
    note: result.note,
  };
}

/**
 * Authenticate request
 * Checks in order: 1) Bearer token header, 2) Session cookie, 3) Super admin from env
 */
export async function authenticate(
  request: Request,
  env: Env
): Promise<AuthResult> {
  // 1. Check Bearer token first (for API calls)
  const bearerToken = extractBearerToken(request);
  if (bearerToken) {
    return validateToken(bearerToken, env, request, true);
  }
  
  // 2. Check session cookie (for web pages)
  const sessionToken = extractSessionToken(request);
  if (sessionToken) {
    return validateToken(sessionToken, env, request, false); // Don't log page views
  }
  
  // 3. No authentication provided
  return { valid: false, error: 'Missing authentication' };
}

/**
 * Log token usage to D1
 */
async function logTokenUsage(
  token: string,
  note: string,
  request: Request,
  env: Env
): Promise<void> {
  const nowMs = Date.now();
  const ip = request.headers.get('CF-Connecting-IP') ||
             request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
             'unknown';
  const url = new URL(request.url);

  await env.TOKEN_DB.prepare(
    'INSERT INTO token_logs (token, note, endpoint, method, ip, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(token, note, url.pathname, request.method, ip, nowMs).run();
}

/**
 * Require authentication middleware helper
 * For API calls: returns JSON error
 * For web pages: redirects to login
 */
export async function requireAuth(
  request: Request,
  env: Env,
  options: { redirectToLogin?: boolean; redirectPath?: string } = {}
): Promise<{ auth: AuthResult; errorResponse: Response | null }> {
  const auth = await authenticate(request, env);
  
  if (!auth.valid) {
    const { redirectToLogin = false, redirectPath } = options;
    
    if (redirectToLogin) {
      // Redirect to login page for web requests
      const url = new URL(request.url);
      const redirect = redirectPath || url.pathname;
      return {
        auth,
        errorResponse: Response.redirect(
          `${url.origin}/login?redirect=${encodeURIComponent(redirect)}`,
          302
        ),
      };
    }
    
    // Return JSON error for API requests
    return {
      auth,
      errorResponse: new Response(
        JSON.stringify({ error: 'Unauthorized', message: auth.error }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer',
          },
        }
      ),
    };
  }
  
  return { auth, errorResponse: null };
}

/**
 * Create session cookie header value
 */
export function createSessionCookie(token: string): string {
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_MAX_AGE}`;
}

/**
 * Create logout cookie header value (clears the session)
 */
export function createLogoutCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

/**
 * Generate a random 6-digit token
 */
export function generateToken(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create a new token in D1
 */
export async function createToken(
  note: string,
  env: Env,
  expiresInDays: number | null = null
): Promise<{ token: string; data: TokenData }> {
  // Generate unique token
  let token: string;
  let attempts = 0;
  const maxAttempts = 10;
  
  do {
    token = generateToken();
    const existing = await env.TOKEN_DB.prepare(
      'SELECT token FROM tokens WHERE token = ? LIMIT 1'
    ).bind(token).first<{ token: string }>();
    if (!existing) break;
    attempts++;
  } while (attempts < maxAttempts);
  
  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique token');
  }
  
  const nowMs = Date.now();
  const expiresAtMs = expiresInDays
    ? nowMs + expiresInDays * 24 * 60 * 60 * 1000
    : null;

  await env.TOKEN_DB.prepare(
    'INSERT INTO tokens (token, note, created_at, expires_at, last_used_at, is_disabled) VALUES (?, ?, ?, ?, ?, 0)'
  ).bind(token, note, nowMs, expiresAtMs, null).run();

  const data: TokenData = {
    note,
    createdAt: new Date(nowMs).toISOString(),
    expiresAt: expiresAtMs ? new Date(expiresAtMs).toISOString() : null,
    lastUsedAt: null,
    isDisabled: false,
  };

  return { token, data };
}

/**
 * Delete a token from KV
 */
export async function deleteToken(token: string, env: Env): Promise<boolean> {
  const existing = await env.TOKEN_DB.prepare(
    'SELECT token FROM tokens WHERE token = ? LIMIT 1'
  ).bind(token).first<{ token: string }>();
  if (!existing) return false;

  await env.TOKEN_DB.prepare(
    'UPDATE tokens SET is_disabled = 1 WHERE token = ?'
  ).bind(token).run();
  return true;
}

export async function enableToken(token: string, env: Env): Promise<boolean> {
  const existing = await env.TOKEN_DB.prepare(
    'SELECT token FROM tokens WHERE token = ? LIMIT 1'
  ).bind(token).first<{ token: string }>();
  if (!existing) return false;

  await env.TOKEN_DB.prepare(
    'UPDATE tokens SET is_disabled = 0 WHERE token = ?'
  ).bind(token).run();
  return true;
}

/**
 * List all tokens from KV
 */
export async function listTokens(env: Env): Promise<Array<{ token: string; data: TokenData }>> {
  const results = await env.TOKEN_DB.prepare(
    'SELECT token, note, created_at, expires_at, last_used_at, is_disabled FROM tokens ORDER BY created_at DESC'
  ).all<{ token: string; note: string; created_at: number; expires_at: number | null; last_used_at: number | null; is_disabled: number }>();

  return results.results.map(row => ({
    token: row.token,
    data: {
      note: row.note,
      createdAt: new Date(row.created_at).toISOString(),
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at).toISOString() : null,
      isDisabled: !!row.is_disabled,
    },
  }));
}

/**
 * Get logs for a specific date
 */
export async function getLogs(date: string, env: Env): Promise<LogEntry[]> {
  const start = new Date(`${date}T00:00:00.000Z`).getTime();
  const end = new Date(`${date}T23:59:59.999Z`).getTime();
  const results = await env.TOKEN_DB.prepare(
    'SELECT token, note, endpoint, method, ip, timestamp FROM token_logs WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp ASC'
  ).bind(start, end).all<{ token: string; note: string; endpoint: string; method: string; ip: string; timestamp: number }>();

  return results.results.map(row => ({
    token: row.token,
    note: row.note,
    endpoint: row.endpoint,
    method: row.method,
    ip: row.ip,
    timestamp: new Date(row.timestamp).toISOString(),
  }));
}

export async function getLogsFiltered(
  env: Env,
  params: { date?: string; token?: string; endpoint?: string }
): Promise<LogEntry[]> {
  const clauses: string[] = [];
  const binds: Array<string | number> = [];

  if (params.date) {
    const start = new Date(`${params.date}T00:00:00.000Z`).getTime();
    const end = new Date(`${params.date}T23:59:59.999Z`).getTime();
    clauses.push('timestamp BETWEEN ? AND ?');
    binds.push(start, end);
  }

  if (params.token) {
    clauses.push('token = ?');
    binds.push(params.token);
  }

  if (params.endpoint) {
    clauses.push('endpoint LIKE ?');
    binds.push(`%${params.endpoint}%`);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const statement = `SELECT token, note, endpoint, method, ip, timestamp FROM token_logs ${where} ORDER BY timestamp DESC LIMIT 500`;
  const results = await env.TOKEN_DB.prepare(statement)
    .bind(...binds)
    .all<{ token: string; note: string; endpoint: string; method: string; ip: string; timestamp: number }>();

  return results.results.map(row => ({
    token: row.token,
    note: row.note,
    endpoint: row.endpoint,
    method: row.method,
    ip: row.ip,
    timestamp: new Date(row.timestamp).toISOString(),
  }));
}

/**
 * Get logs for recent days
 */
export async function getRecentLogs(days: number, env: Env): Promise<{ date: string; logs: LogEntry[] }[]> {
  const results: { date: string; logs: LogEntry[] }[] = [];
  const now = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateKey = date.toISOString().split('T')[0];
    const logs = await getLogs(dateKey, env);
    if (logs.length > 0) {
      results.push({ date: dateKey, logs });
    }
  }
  
  return results;
}

/**
 * Cleanup old token logs (D1)
 */
export async function cleanupOldTokenLogs(env: Env, retentionDays: number): Promise<void> {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  await env.TOKEN_DB.prepare(
    'DELETE FROM token_logs WHERE timestamp < ?'
  ).bind(cutoff).run();
}
