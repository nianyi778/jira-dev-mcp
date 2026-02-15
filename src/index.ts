import type { Env, DailyReport, ParentTaskReport, IncompleteTasksReport, AppConfig } from './types';
import { generateParentTaskReport, getTodayDateJapanese, getSubtasksDebugInfo, getIncompleteTasksReport } from './jira';
import { sendClientEmail, sendInternalNotification, sendNoTasksNotification } from './email';
import { storeReport, getReport, createMockReport } from './storage';
import { generateReviewPage, generateErrorPage } from './pages/review';
import { sendIncompleteTasksNotification, buildIncompleteTasksMessage } from './slack';
import { generateDocsPage } from './pages/docs';
import { generateHomePage } from './pages/home';
import { generateConfigPage, ConfigPageInput } from './pages/config';
import { generateLoginPage } from './pages/login';
import { 
  requireAuth, 
  createToken, 
  deleteToken, 
  enableToken,
  listTokens, 
  getRecentLogs, 
  getLogs,
  getLogsFiltered,
  cleanupOldTokenLogs,
  authenticate,
  createSessionCookie,
  createLogoutCookie,
  extractSessionToken,
} from './auth';
import { getConfig, setConfig, validateConfig, getRawConfig, initializeConfig } from './config-store';

function getTodayDateKey(timezone: string): string {
  const now = new Date();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

async function logEmailSend(
  env: Env,
  date: string,
  triggerType: 'auto' | 'manual' | 'confirmed',
  operator: string,
  success: boolean,
  details: string,
  reviewUrl?: string
): Promise<void> {
  try {
    await env.TOKEN_DB.prepare(
      'INSERT INTO email_send_logs (date, trigger_type, operator, success, details, review_url, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(date, triggerType, operator, success ? 1 : 0, details, reviewUrl || null, Date.now()).run();
  } catch (error) {
    console.error('Failed to log email send:', error);
  }
}

async function getEmailSendLogs(
  env: Env,
  days: number = 30
): Promise<Array<{ id: number; date: string; triggerType: string; operator: string; success: boolean; details: string; reviewUrl: string | null; timestamp: string }>> {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const results = await env.TOKEN_DB.prepare(
    'SELECT id, date, trigger_type, operator, success, details, review_url, timestamp FROM email_send_logs WHERE timestamp > ? ORDER BY timestamp DESC LIMIT 200'
  ).bind(cutoff).all<{ id: number; date: string; trigger_type: string; operator: string; success: number; details: string; review_url: string | null; timestamp: number }>();

  return results.results.map(row => ({
    id: row.id,
    date: row.date,
    triggerType: row.trigger_type,
    operator: row.operator,
    success: !!row.success,
    details: row.details,
    reviewUrl: row.review_url,
    timestamp: new Date(row.timestamp).toISOString(),
  }));
}

async function getReviewSendStatus(env: Env, reviewUrl: string): Promise<{ operator: string; sentAt: string } | null> {
  const results = await env.TOKEN_DB.prepare(
    'SELECT operator, timestamp FROM email_send_logs WHERE review_url = ? AND success = 1 AND details LIKE ? ORDER BY timestamp DESC LIMIT 1'
  ).bind(reviewUrl, 'Client email sent%').all<{ operator: string; timestamp: number }>();

  if (!results.results.length) {
    return null;
  }

  const row = results.results[0];
  return {
    operator: row.operator,
    sentAt: new Date(row.timestamp).toISOString(),
  };
}

const LAST_CONFIRMED_SEND_TIME_KEY = 'email:lastConfirmedSendTime';

async function getLastConfirmedSendTime(env: Env): Promise<Date | null> {
  const value = await env.REPORT_KV.get(LAST_CONFIRMED_SEND_TIME_KEY);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function setLastConfirmedSendTime(env: Env, time: Date): Promise<void> {
  await env.REPORT_KV.put(LAST_CONFIRMED_SEND_TIME_KEY, time.toISOString());
}

export default {
  /**
   * Scheduled handler - triggered by Cron
   * Two cron schedules:
   * - "30 9 * * 1-5" = JST 18:30 (UTC 09:30) Mon-Fri → Daily completed tasks email
   * - "35 9 * * 1-5" = JST 18:35 (UTC 09:35) Mon-Fri → Slack incomplete tasks reminder
   */
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log('=== Jira Subtask Monitor Started (Cron) ===');
    console.log(`Cron trigger time: ${new Date(event.scheduledTime).toISOString()}`);
    console.log(`Cron pattern: ${event.cron}`);

    // Load config from KV
    const config = await getConfig(env);

    try {
      try {
        await cleanupOldTokenLogs(env, 30);
      } catch (error) {
        console.warn('Token log cleanup failed:', error);
      }
      if (event.cron === '35 9 * * 1-5') {
        // JST 18:35 → Slack incomplete tasks reminder
        if (!config.featureSlackReminder) {
          console.log('Slack reminder is disabled (feature flag). Skipping.');
          return;
        }
        console.log('Running Slack incomplete tasks reminder...');
        await runSlackIncompleteTasksReminder(env, config);
      } else if (event.cron === '30 9 * * 1-5') {
        // JST 18:30 → Daily completed tasks email
        if (!config.featureEmailReport) {
          console.log('Email report is disabled (feature flag). Skipping.');
          return;
        }
        // Check if email was already manually sent today
        const todayKey = getTodayDateKey(env.TIMEZONE);
        const manualSentToday = await env.REPORT_KV.get(`email_sent:${todayKey}:manual`);
        if (manualSentToday) {
          console.log('Email was already manually sent today. Skipping auto trigger.');
          return;
        }
        console.log('Running daily completed tasks email...');
        const sinceTime = await getLastConfirmedSendTime(env);
        await runMonitor(env, config, false, sinceTime || undefined);
        await env.REPORT_KV.put(`email_sent:${todayKey}:auto`, new Date().toISOString(), { expirationTtl: 86400 });
        await logEmailSend(env, todayKey, 'auto', 'System (Cron)', true, 'Auto-triggered at 18:30 JST');
      }
    } catch (error) {
      console.error('Monitor failed:', error);
      throw error;
    }
  },

  /**
   * HTTP handler - for manual testing and review page
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // ============================================
    // PUBLIC ENDPOINTS (no auth required)
    // ============================================

    // Health check
    if (pathname === '/health') {
      const missing = await validateConfig(env);
      return jsonResponse({
        status: missing.length === 0 ? 'ok' : 'warning',
        missingConfig: missing.length > 0 ? missing : undefined,
      });
    }

    // Home page - entry point with two sections
    if (pathname === '/') {
      const html = generateHomePage(env.WORKER_BASE_URL, env.BRAND_NAME, env.BRAND_URL);
      return htmlResponse(html);
    }

    // API Documentation page (HTML)
    if (pathname === '/docs') {
      const html = generateDocsPage(env.WORKER_BASE_URL, env.BRAND_NAME, env.BRAND_URL, env.SUPPORT_EMAIL);
      return htmlResponse(html);
    }

    // Review page for a specific token (token itself is the auth)
    const reviewMatch = pathname.match(/^\/review\/([a-zA-Z0-9-]+)$/);
    if (reviewMatch) {
      const token = reviewMatch[1];
      
      try {
        const report = await getReport(token, env);
        
        if (!report) {
          const html = generateErrorPage(
            'リンクが無効です',
            'このリンクは無効または期限切れです。新しいレポートを生成してください。'
          );
          return htmlResponse(html, 404);
        }

        const html = generateReviewPage(report);
        return htmlResponse(html);
      } catch (error) {
        console.error('Error fetching report:', error);
        const html = generateErrorPage(
          'エラーが発生しました',
          'レポートの取得中にエラーが発生しました。しばらくしてから再度お試しください。'
        );
        return htmlResponse(html, 500);
      }
    }

    const confirmMatch = pathname.match(/^\/review\/([a-zA-Z0-9-]+)\/confirm$/);
    if (confirmMatch && request.method === 'POST') {
      const token = confirmMatch[1];
      try {
        const report = await getReport(token, env);
        if (!report) {
          return jsonResponse({ error: 'Report not found or expired' }, 404);
        }
        const confirmedAt = new Date();
        await setLastConfirmedSendTime(env, confirmedAt);
        const todayKey = getTodayDateKey(env.TIMEZONE);
        await logEmailSend(env, todayKey, 'confirmed', 'Review Page', true, 'Client email send confirmed');
        return jsonResponse({ success: true, confirmedAt: confirmedAt.toISOString() });
      } catch (error) {
        console.error('Error confirming email send:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return jsonResponse({ success: false, error: errorMessage }, 500);
      }
    }

    const statusMatch = pathname.match(/^\/review\/([a-zA-Z0-9-]+)\/status$/);
    if (statusMatch && request.method === 'GET') {
      const token = statusMatch[1];
      try {
        const report = await getReport(token, env);
        if (!report) {
          return jsonResponse({ error: 'Report not found or expired' }, 404);
        }

        const reviewUrl = `${env.WORKER_BASE_URL}/review/${report.id}`;
        const status = await getReviewSendStatus(env, reviewUrl);
        if (!status) {
          return jsonResponse({ sent: false });
        }

        return jsonResponse({
          sent: true,
          operator: status.operator,
          sentAt: status.sentAt,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return jsonResponse({ error: errorMessage }, 500);
      }
    }

    // 授权码验证端点
    const verifyMatch = pathname.match(/^\/review\/([a-zA-Z0-9-]+)\/verify$/);
    if (verifyMatch && request.method === 'POST') {
      const token = verifyMatch[1];
      console.log('[Auth] Verifying auth code for review token:', token);
      try {
        const report = await getReport(token, env);
        if (!report) {
          return jsonResponse({ error: 'Report not found or expired' }, 404);
        }

        let payload: { code?: string } = {};
        try {
          payload = (await request.json()) as { code?: string };
        } catch {
          payload = {};
        }

        const code = payload.code || '';

        if (!/^\d{6}$/.test(code)) {
          return jsonResponse({ error: 'Invalid auth code format' }, 400);
        }

        // 验证授权码
        // 创建一个模拟请求来复用 authenticate 逻辑
        const mockRequest = new Request(request.url, {
          headers: { 'Authorization': `Bearer ${code}` },
        });
        const auth = await authenticate(mockRequest, env);

        if (!auth.valid) {
          return jsonResponse({ error: 'Invalid auth code' }, 401);
        }

        return jsonResponse({ 
          success: true, 
          user: auth.note || 'Unknown'
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return jsonResponse({ error: errorMessage }, 500);
      }
    }

    const sendMatch = pathname.match(/^\/review\/([a-zA-Z0-9-]+)\/send$/);
    if (sendMatch && request.method === 'POST') {
      const token = sendMatch[1];
      try {
        const report = await getReport(token, env);
        if (!report) {
          return jsonResponse({ error: 'Report not found or expired' }, 404);
        }

        let payload: { to?: string; cc?: string; subject?: string; body?: string; authCode?: string } = {};
        try {
          payload = (await request.json()) as { to?: string; cc?: string; subject?: string; body?: string; authCode?: string };
        } catch {
          payload = {};
        }

        const to = (payload.to || report.defaultTo || '').trim();
        const cc = (payload.cc || report.defaultCc || '').trim();
        const subject = (payload.subject || report.defaultSubject || '').trim();
        const body = payload.body || report.defaultBody || '';
        const authCode = payload.authCode || '';

        // 验证授权码
        if (!/^\d{6}$/.test(authCode)) {
          return jsonResponse({ error: 'Auth code is required' }, 401);
        }

        // 验证授权码有效性
        const mockRequest = new Request(request.url, {
          headers: { 'Authorization': `Bearer ${authCode}` },
        });
        const auth = await authenticate(mockRequest, env);

        if (!auth.valid) {
          return jsonResponse({ error: 'Invalid auth code' }, 401);
        }

        if (!to) {
          return jsonResponse({ error: 'Recipient is required' }, 400);
        }
        if (!subject) {
          return jsonResponse({ error: 'Subject is required' }, 400);
        }

        await sendClientEmail(to, cc || null, subject, body, env);

        const todayKey = getTodayDateKey(env.TIMEZONE);
        const reviewUrl = `${env.WORKER_BASE_URL}/review/${report.id}`;
        // 使用授权码对应的用户信息记录发送人
        const operator = auth.note || 'Unknown';
        await logEmailSend(env, todayKey, 'manual', operator, true, 'Client email sent via Gmail', reviewUrl);
        return jsonResponse({ success: true });
      } catch (error) {
        const todayKey = getTodayDateKey(env.TIMEZONE);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const operator = 'Unknown';
        await logEmailSend(env, todayKey, 'manual', operator, false, `Client email failed: ${errorMessage}`);
        return jsonResponse({ success: false, error: errorMessage }, 500);
      }
    }

    // ============================================
    // LOGIN / LOGOUT
    // ============================================

    // Login page (GET)
    if (pathname === '/login' && request.method === 'GET') {
      // Check if already logged in
      const sessionToken = extractSessionToken(request);
      if (sessionToken) {
        const auth = await authenticate(request, env);
        if (auth.valid) {
          // Already logged in, redirect to intended page or config
          const redirect = url.searchParams.get('redirect') || '/config';
          return Response.redirect(`${url.origin}${redirect}`, 302);
        }
      }
      
      const error = url.searchParams.get('error');
      const redirect = url.searchParams.get('redirect');
      const html = generateLoginPage(env.WORKER_BASE_URL, { 
        error: error || undefined, 
        redirect: redirect || undefined,
        supportEmail: env.SUPPORT_EMAIL,
      });
      return htmlResponse(html);
    }

    // Login submit (POST)
    if (pathname === '/login' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const code = formData.get('code')?.toString() || '';
        const redirect = url.searchParams.get('redirect') || '/config';
        
        // Validate code format
        if (!/^\d{6}$/.test(code)) {
          return Response.redirect(
            `${url.origin}/login?error=${encodeURIComponent('请输入6位数字授权码')}&redirect=${encodeURIComponent(redirect)}`,
            302
          );
        }
        
        // Validate token
        // Create a mock request with Bearer header to use existing validation
        const mockRequest = new Request(request.url, {
          headers: { 'Authorization': `Bearer ${code}` },
        });
        const auth = await authenticate(mockRequest, env);
        
        if (!auth.valid) {
          return Response.redirect(
            `${url.origin}/login?error=${encodeURIComponent('授权码无效或已过期')}&redirect=${encodeURIComponent(redirect)}`,
            302
          );
        }
        
        // Create session cookie and redirect
        return new Response(null, {
          status: 302,
          headers: {
            'Location': redirect,
            'Set-Cookie': createSessionCookie(code),
          },
        });
      } catch (error) {
        console.error('Login error:', error);
        return Response.redirect(
          `${url.origin}/login?error=${encodeURIComponent('登录失败，请重试')}`,
          302
        );
      }
    }

    // Logout
    if (pathname === '/logout') {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/',
          'Set-Cookie': createLogoutCookie(),
        },
      });
    }

    // ============================================
    // PROTECTED WEB PAGES (session cookie auth, redirect to login)
    // ============================================

    // Configuration page (HTML) - redirect to login if not authenticated
    if (pathname === '/config') {
      const { auth, errorResponse } = await requireAuth(request, env, { redirectToLogin: true });
      if (errorResponse) {
        return errorResponse;
      }
      
      const config = await getConfig(env);
      const html = await generateConfigPageWithKV(env, config, auth.note, auth.isSuperAdmin);
      return htmlResponse(html);
    }

    // ============================================
    // PROTECTED API ENDPOINTS (Bearer token auth, return JSON error)
    // ============================================

    // All endpoints below require authentication
    const { auth, errorResponse } = await requireAuth(request, env);
    if (errorResponse) {
      return errorResponse;
    }

    // JSON API documentation (for programmatic access)
    if (pathname === '/api') {
      const config = await getConfig(env);
      return jsonResponse({
        service: 'Jira Subtask Monitor',
        authenticatedAs: auth.note,
        endpoints: {
          public: {
            '/': 'Home page (HTML)',
            '/health': 'Health check',
            '/docs': 'API documentation (HTML)',
            '/review/:token': 'Review page for a specific report',
          },
          protected: {
            '/api': 'API documentation (JSON)',
            '/config': 'Configuration page (HTML)',
            '/debug/subtasks?parent=AT-878': 'Debug: View all subtasks for a parent task',
            '/manual': 'Manually trigger full flow (scan → store → send internal email)',
            '/manual?skip_email=true': 'Manually trigger, skip internal email, return review URL',
            '/test/review': 'Test review page with mock data',
            '/slack/test': 'Manually trigger Slack incomplete tasks notification',
            '/slack/incomplete': 'View incomplete tasks as JSON (no Slack send)',
            '/slack/incomplete?parent=AT-878': 'View incomplete tasks for specific parent',
          },
          admin: {
            '/admin/tokens': 'GET: List tokens, POST: Create token (body: {note, expiresInDays?})',
            '/admin/tokens/:code': 'DELETE: Delete token',
            '/admin/config': 'GET: View config, PUT: Update config',
            '/admin/logs': 'GET: View recent logs (?days=7)',
            '/admin/logs/:date': 'GET: View logs for specific date (YYYY-MM-DD)',
            '/admin/init': 'POST: Initialize KV config with current wrangler values',
          },
        },
        cron: {
          email: 'JST 18:30 (UTC 09:30) Mon-Fri - Daily completed tasks email',
          slack: 'JST 18:35 (UTC 09:35) Mon-Fri - Slack incomplete tasks reminder',
        },
        featureFlags: {
          emailReport: config.featureEmailReport,
          slackReminder: config.featureSlackReminder,
        },
      });
    }

    // Test: Send email with mock data
    if (pathname === '/test/email') {
      console.log('=== Test email sending ===');
      const config = await getConfig(env);
      try {
        const mockReport = createMockReport(env, config);
        const storedReport = await storeReport(mockReport.dailyReport, env, config);
        const reviewUrl = `${env.WORKER_BASE_URL}/review/${storedReport.id}`;
        
        await sendInternalNotification(storedReport, reviewUrl, env, config);
        
        return jsonResponse({
          success: true,
          message: 'Test email sent successfully',
          sentTo: config.internalEmail,
          reviewUrl,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return jsonResponse({ success: false, error: errorMessage }, 500);
      }
    }

    // Debug: View subtasks for a parent task
    if (pathname === '/debug/subtasks') {
      const parentKey = url.searchParams.get('parent');
      const config = await getConfig(env);
      
      if (!parentKey) {
        return jsonResponse({
          error: 'Missing required parameter: parent',
          usage: '/debug/subtasks?parent=AT-878',
          hint: `Configured parent issues: ${config.parentIssues}`,
        }, 400);
      }

      try {
        console.log(`Debug: Fetching subtasks for ${parentKey}`);
        const debugInfo = await getSubtasksDebugInfo(parentKey, env);
        return jsonResponse(debugInfo);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return jsonResponse({ 
          success: false, 
          error: errorMessage,
          parentKey,
        }, 500);
      }
    }

    // Manual trigger
    if (pathname === '/manual') {
      console.log('=== Manual trigger via HTTP ===');
      const skipEmail = url.searchParams.get('skip_email') === 'true';
      const config = await getConfig(env);
      const operatorName = auth.note || 'API User';

      try {
        const sinceTime = await getLastConfirmedSendTime(env);
        const result = await runMonitor(env, config, skipEmail, sinceTime || undefined);
        const todayKey = getTodayDateKey(env.TIMEZONE);
        
        if (!skipEmail) {
          await env.REPORT_KV.put(`email_sent:${todayKey}:manual`, new Date().toISOString(), { expirationTtl: 86400 });
          await logEmailSend(env, todayKey, 'manual', operatorName, true, 
            result.hasCompletedTasks ? `${result.totalCompleted} tasks completed` : 'No completed tasks', 
            result.reviewUrl || undefined);
        }

        if (!result.hasCompletedTasks) {
          return jsonResponse({
            success: true,
            message: skipEmail
              ? 'No completed tasks today (email skipped)'
              : 'No completed tasks today, notification sent',
            date: result.date,
            totalCompleted: 0,
            parentTasks: result.parentTasks,
          });
        }

        return jsonResponse({
          success: true,
          message: skipEmail
            ? 'Report generated (email skipped)'
            : 'Report generated and internal notification sent',
          reviewUrl: result.reviewUrl,
          date: result.date,
          totalCompleted: result.totalCompleted,
          parentTasks: result.parentTasks,
        });
      } catch (error) {
        const todayKey = getTodayDateKey(env.TIMEZONE);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await logEmailSend(env, todayKey, 'manual', operatorName, false, errorMessage);
        return jsonResponse({ success: false, error: errorMessage }, 500);
      }
    }

    // Manual email send from config page
    if (pathname === '/api/email/send' && request.method === 'POST') {
      const config = await getConfig(env);
      const operatorName = auth.note || 'Unknown';
      const todayKey = getTodayDateKey(env.TIMEZONE);

      try {
        const sinceTime = await getLastConfirmedSendTime(env);
        const result = await runMonitor(env, config, false, sinceTime || undefined);
        await env.REPORT_KV.put(`email_sent:${todayKey}:manual`, new Date().toISOString(), { expirationTtl: 86400 });
        await logEmailSend(env, todayKey, 'manual', operatorName, true,
          result.hasCompletedTasks ? `${result.totalCompleted} tasks completed` : 'No completed tasks',
          result.reviewUrl || undefined);

        return jsonResponse({
          success: true,
          message: result.hasCompletedTasks
            ? 'Report generated and email sent'
            : 'No completed tasks today, notification sent',
          reviewUrl: result.reviewUrl,
          date: result.date,
          totalCompleted: result.totalCompleted,
          operator: operatorName,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await logEmailSend(env, todayKey, 'manual', operatorName, false, errorMessage);
        return jsonResponse({ success: false, error: errorMessage }, 500);
      }
    }

    // Test review page with mock data
    if (pathname === '/test/review') {
      const config = await getConfig(env);
      const mockReport = createMockReport(env, config);
      const html = generateReviewPage(mockReport);
      return htmlResponse(html);
    }

    // Slack: View incomplete tasks (no send)
    if (pathname === '/slack/incomplete') {
      const parentKey = url.searchParams.get('parent');
      const config = await getConfig(env);
      const parentIssues = parentKey
        ? [parentKey]
        : config.parentIssues.split(',').map(k => k.trim()).filter(k => k.length > 0);

      try {
        const reports: IncompleteTasksReport[] = [];
        for (const key of parentIssues) {
          const report = await getIncompleteTasksReport(key, env);
          reports.push(report);
        }

        // Build message preview
        const messagePreview = buildIncompleteTasksMessage(
          reports,
          env.JIRA_BASE_URL,
          env.TIMEZONE
        );

        return jsonResponse({
          success: true,
          parentIssues,
          reports,
          totalIncomplete: reports.reduce((sum, r) => sum + r.incompleteTasks.length, 0),
          messagePreview: messagePreview.text,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return jsonResponse({ success: false, error: errorMessage }, 500);
      }
    }

    // Slack: Test notification (actually sends to Slack)
    if (pathname === '/slack/test') {
      console.log('=== Slack test notification ===');
      const config = await getConfig(env);
      
      try {
        const result = await runSlackIncompleteTasksReminder(env, config);
        return jsonResponse(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return jsonResponse({ success: false, error: errorMessage }, 500);
      }
    }

    // ============================================
    // ADMIN ENDPOINTS
    // ============================================

    // Admin: Email send logs
    if (pathname === '/admin/email-logs' && request.method === 'GET') {
      const days = parseInt(url.searchParams.get('days') || '30', 10);
      const logs = await getEmailSendLogs(env, Math.min(days, 90));
      return jsonResponse({
        success: true,
        days,
        logs,
        count: logs.length,
      });
    }

    // Admin: Token management page (HTML) - redirect to config section
    if (pathname === '/admin/tokens' && request.method === 'GET' && request.headers.get('Accept')?.includes('text/html')) {
      if (!auth.isSuperAdmin) {
        return jsonResponse({ error: 'Super Admin access required' }, 403);
      }
      return Response.redirect(`${url.origin}/config#tokens`, 302);
    }

    // Admin: Logs page (HTML) - redirect to config section
    if (pathname === '/admin/logs' && request.method === 'GET' && request.headers.get('Accept')?.includes('text/html')) {
      return Response.redirect(`${url.origin}/config#logs`, 302);
    }

    // Admin: List tokens (JSON API)
    if (pathname === '/admin/tokens' && request.method === 'GET') {
      const tokens = await listTokens(env);
      return jsonResponse({
        success: true,
        count: tokens.length,
        tokens: tokens.map(t => ({
          token: t.token,
          note: t.data.note,
          createdAt: t.data.createdAt,
          expiresAt: t.data.expiresAt,
          lastUsedAt: t.data.lastUsedAt,
          isDisabled: t.data.isDisabled || false,
        })),
      });
    }

    // Admin: Create token
    if (pathname === '/admin/tokens' && request.method === 'POST') {
      try {
        const body = await request.json() as { note?: string; expiresInDays?: number };
        
        if (!body.note || body.note.trim().length === 0) {
          return jsonResponse({ success: false, error: 'note is required' }, 400);
        }

        const { token, data } = await createToken(body.note.trim(), env, body.expiresInDays || null);
        
        return jsonResponse({
          success: true,
          message: 'Token created successfully',
          token,
          data,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return jsonResponse({ success: false, error: errorMessage }, 500);
      }
    }

    // Admin: Delete token
    const deleteTokenMatch = pathname.match(/^\/admin\/tokens\/(\d{6})$/);
    if (deleteTokenMatch && request.method === 'DELETE') {
      const tokenToDelete = deleteTokenMatch[1];
      
      // Prevent deleting super admin token
      if (tokenToDelete === env.SUPER_ADMIN_TOKEN) {
        return jsonResponse({ success: false, error: 'Cannot delete super admin token' }, 403);
      }
      
      const deleted = await deleteToken(tokenToDelete, env);
      
      if (!deleted) {
        return jsonResponse({ success: false, error: 'Token not found' }, 404);
      }
      
      return jsonResponse({ success: true, message: 'Token disabled' });
    }

    // Admin: Enable token
    const enableTokenMatch = pathname.match(/^\/admin\/tokens\/(\d{6})\/enable$/);
    if (enableTokenMatch && request.method === 'POST') {
      const tokenToEnable = enableTokenMatch[1];
      const enabled = await enableToken(tokenToEnable, env);
      if (!enabled) {
        return jsonResponse({ success: false, error: 'Token not found' }, 404);
      }
      return jsonResponse({ success: true, message: 'Token enabled' });
    }

    // Admin: Get config
    if (pathname === '/admin/config' && request.method === 'GET') {
      const config = await getConfig(env);
      const rawConfig = await getRawConfig(env);
      
      return jsonResponse({
        success: true,
        config,
        raw: rawConfig,
      });
    }

    // Admin: Update config
    if (pathname === '/admin/config' && request.method === 'PUT') {
      try {
        const body = await request.json() as Partial<AppConfig>;
        await setConfig(body, env);
        const newConfig = await getConfig(env);
        
        return jsonResponse({
          success: true,
          message: 'Config updated',
          config: newConfig,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return jsonResponse({ success: false, error: errorMessage }, 500);
      }
    }

    // Admin: Get logs
    if (pathname === '/admin/logs' && request.method === 'GET') {
      const days = parseInt(url.searchParams.get('days') || '7', 10);
      const logs = await getRecentLogs(Math.min(days, 30), env);
      
      return jsonResponse({
        success: true,
        days,
        logs,
        totalEntries: logs.reduce((sum, d) => sum + d.logs.length, 0),
      });
    }

    // Admin: Query logs
    if (pathname === '/admin/logs/query' && request.method === 'GET') {
      const date = url.searchParams.get('date') || undefined;
      const token = url.searchParams.get('token') || undefined;
      const endpoint = url.searchParams.get('endpoint') || undefined;
      const logs = await getLogsFiltered(env, { date, token, endpoint });
      return jsonResponse({
        success: true,
        date,
        token,
        endpoint,
        logs,
        count: logs.length,
      });
    }

    // Admin: Get logs for specific date
    const logsDateMatch = pathname.match(/^\/admin\/logs\/(\d{4}-\d{2}-\d{2})$/);
    if (logsDateMatch && request.method === 'GET') {
      const date = logsDateMatch[1];
      const logs = await getLogs(date, env);
      
      return jsonResponse({
        success: true,
        date,
        logs,
        count: logs.length,
      });
    }

    // Admin: Initialize config from default values
    if (pathname === '/admin/init' && request.method === 'POST') {
      try {
        const body = await request.json() as Partial<AppConfig>;
        const result = await initializeConfig(body, env);
        
        return jsonResponse({
          success: true,
          message: 'Config initialized',
          initialized: result.initialized,
          skipped: result.skipped,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return jsonResponse({ success: false, error: errorMessage }, 500);
      }
    }

    // 404 Not Found
    return jsonResponse({ error: 'Not Found' }, 404);
  },
};

/**
 * JSON response helper
 */
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * HTML response helper
 */
function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/**
 * Generate config page with KV data
 */
async function generateConfigPageWithKV(env: Env, config: AppConfig, userNote?: string, isSuperAdmin?: boolean): Promise<string> {
  // Create a compatible input object for the page generator
  const lastConfirmed = await getLastConfirmedSendTime(env);
  const input: ConfigPageInput = {
    JIRA_BASE_URL: env.JIRA_BASE_URL,
    TIMEZONE: env.TIMEZONE,
    WORKER_BASE_URL: env.WORKER_BASE_URL,
    // From KV config
    PARENT_ISSUES: config.parentIssues,
    DRY_RUN: config.dryRun ? 'true' : 'false',
    INTERNAL_EMAIL: config.internalEmail,
    DEFAULT_CLIENT_EMAIL: config.defaultClientEmail,
    DEFAULT_CC_EMAIL: config.defaultCcEmail,
    REVIEW_TOKEN_TTL: config.reviewTokenTtl.toString(),
    FEATURE_EMAIL_REPORT: config.featureEmailReport ? 'true' : 'false',
    FEATURE_SLACK_REMINDER: config.featureSlackReminder ? 'true' : 'false',
    SLACK_CHANNEL_NAME: config.slackChannelName,
    LAST_CONFIRMED_SEND_TIME: lastConfirmed ? lastConfirmed.toISOString() : undefined,
    // Secrets status (just check if defined)
    SLACK_WEBHOOK_URL: env.SLACK_WEBHOOK_URL ? '********' : undefined,
    // User info
    USER_NOTE: userNote,
    IS_SUPER_ADMIN: isSuperAdmin,
  };
  
  return generateConfigPage(input, env.WORKER_BASE_URL);
}

/**
 * Main monitor logic
 * Always sends internal notification, even when no tasks completed
 */
async function runMonitor(
  env: Env,
  config: AppConfig,
  skipEmail: boolean = false,
  sinceTime?: Date
): Promise<{
  reviewUrl: string | null;
  date: string;
  totalCompleted: number;
  parentTasks: string[];
  hasCompletedTasks: boolean;
}> {
  const dryRun = config.dryRun;

  if (dryRun) {
    console.log('DRY_RUN mode enabled - will not send email');
  }

  // Parse parent issues from config
  const parentIssues = config.parentIssues
    .split(',')
    .map((key) => key.trim())
    .filter((key) => key.length > 0);

  const todayDate = getTodayDateJapanese(env.TIMEZONE);

  if (parentIssues.length === 0) {
    console.log('No parent issues configured');
    // Still send notification about no config
    if (!dryRun && !skipEmail && config.internalEmail) {
      await sendNoTasksNotification(todayDate, parentIssues, env, config);
    }
    return {
      reviewUrl: null,
      date: todayDate,
      totalCompleted: 0,
      parentTasks: [],
      hasCompletedTasks: false,
    };
  }

  console.log(`Monitoring parent issues: ${parentIssues.join(', ')}`);

  // Generate reports for each parent issue
  const reports: ParentTaskReport[] = [];

  for (const parentKey of parentIssues) {
    try {
      const report = await generateParentTaskReport(parentKey, env, sinceTime);
      if (report) {
        reports.push(report);
        console.log(`${parentKey}: ${report.completedToday.length} tasks completed${sinceTime ? ' since last confirmed send' : ' today'}`);
      } else {
        console.log(`${parentKey}: 0 tasks completed today`);
      }
    } catch (error) {
      console.error(`Error processing ${parentKey}:`, error);
      // Continue with other parent issues
    }
  }

  // Calculate total completed
  const totalCompletedToday = reports.reduce(
    (sum, r) => sum + r.completedToday.length,
    0
  );

  console.log(`Total subtasks completed today: ${totalCompletedToday}`);

  // If no tasks completed today, send "no tasks" notification
  if (reports.length === 0 || totalCompletedToday === 0) {
    console.log('No subtasks completed today');
    
    if (!dryRun && !skipEmail && config.internalEmail) {
      await sendNoTasksNotification(todayDate, parentIssues, env, config);
      console.log('No-tasks notification sent to:', config.internalEmail);
    }

    return {
      reviewUrl: null,
      date: todayDate,
      totalCompleted: 0,
      parentTasks: parentIssues,
      hasCompletedTasks: false,
    };
  }

  // Build daily report
  const dailyReport: DailyReport = {
    date: todayDate,
    reports,
    totalCompletedToday,
  };

  // Store report in KV
  const storedReport = await storeReport(dailyReport, env, config);
  const reviewUrl = `${env.WORKER_BASE_URL}/review/${storedReport.id}`;

  console.log(`Review URL: ${reviewUrl}`);

  // Send internal notification (unless dry run or skip_email)
  if (!dryRun && !skipEmail && config.internalEmail) {
    try {
      await sendInternalNotification(storedReport, reviewUrl, env, config);
      console.log('Internal notification sent to:', config.internalEmail);
    } catch (error) {
      console.error('Failed to send internal notification:', error);
      // Don't throw - the report is still stored
    }
  } else {
    console.log('Skipping internal notification (dry_run or skip_email or no email configured)');
  }

  console.log('=== Monitor completed successfully ===');

  return {
    reviewUrl,
    date: dailyReport.date,
    totalCompleted: totalCompletedToday,
    parentTasks: reports.map((r) => r.parentKey),
    hasCompletedTasks: true,
  };
}

/**
 * Run Slack incomplete tasks reminder
 * Fetches all incomplete tasks and sends notification to Slack
 */
async function runSlackIncompleteTasksReminder(
  env: Env,
  config: AppConfig
): Promise<{
  success: boolean;
  error?: string;
  parentIssues: string[];
  totalIncomplete: number;
  messagePreview?: string;
}> {
  console.log('=== Running Slack Incomplete Tasks Reminder ===');

  // Check if Slack is configured
  if (!env.SLACK_WEBHOOK_URL) {
    console.error('SLACK_WEBHOOK_URL is not configured');
    return {
      success: false,
      error: 'SLACK_WEBHOOK_URL is not configured',
      parentIssues: [],
      totalIncomplete: 0,
    };
  }

  // Parse parent issues from config
  const parentIssues = config.parentIssues
    .split(',')
    .map((key) => key.trim())
    .filter((key) => key.length > 0);

  if (parentIssues.length === 0) {
    console.log('No parent issues configured');
    return {
      success: false,
      error: 'No parent issues configured',
      parentIssues: [],
      totalIncomplete: 0,
    };
  }

  console.log(`Checking parent issues: ${parentIssues.join(', ')}`);

  // Fetch incomplete tasks for each parent
  const reports: IncompleteTasksReport[] = [];

  for (const parentKey of parentIssues) {
    try {
      const report = await getIncompleteTasksReport(parentKey, env);
      reports.push(report);
      console.log(`${parentKey}: ${report.incompleteTasks.length} incomplete tasks`);
    } catch (error) {
      console.error(`Error processing ${parentKey}:`, error);
      // Continue with other parent issues
    }
  }

  // Calculate totals
  const totalIncomplete = reports.reduce((sum, r) => sum + r.incompleteTasks.length, 0);
  console.log(`Total incomplete tasks: ${totalIncomplete}`);

  // Send Slack notification
  const result = await sendIncompleteTasksNotification(reports, env);

  if (result.success) {
    console.log('Slack notification sent successfully');
  } else {
    console.error('Failed to send Slack notification:', result.error);
  }

  console.log('=== Slack Reminder completed ===');

  return {
    success: result.success,
    error: result.error,
    parentIssues,
    totalIncomplete,
    messagePreview: result.messagePreview,
  };
}
