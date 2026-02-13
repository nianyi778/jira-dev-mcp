/**
 * API Documentation Page Generator
 * Modern dark theme with refined aesthetics
 */

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
  responseType?: string;
  responseJson?: object;
  example?: string;
  auth?: 'public' | 'session' | 'bearer' | 'session-or-bearer';
}

export interface ApiModule {
  name: string;
  nameEn: string;
  icon: string;
  color: string;
  description: string;
  endpoints: ApiEndpoint[];
}

/**
 * Define all API modules and endpoints
 */
export function getApiModules(baseUrl: string, supportEmail?: string): ApiModule[] {
  return [
    {
      name: '系统状态',
      nameEn: 'System',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg>`,
      color: '#10b981',
      description: '系统健康检查和基本信息',
      endpoints: [
        {
          method: 'GET',
          path: '/',
          description: '系统首页入口，包含配置和文档两个入口',
          responseType: 'HTML',
          auth: 'public',
        },
        {
          method: 'GET',
          path: '/health',
          description: '健康检查，用于监控系统是否正常运行',
          responseJson: {
            status: 'ok'
          },
          example: `curl ${baseUrl}/health`,
          auth: 'public',
        },
        {
          method: 'GET',
          path: '/api',
          description: '获取 API 端点列表（JSON 格式）',
          responseJson: {
            service: 'Jira Subtask Monitor',
            endpoints: {
              '/': 'Home page',
              '/docs': 'API documentation',
              '/config': 'System configuration',
              '/health': 'Health check',
              '...': '...'
            },
            cron: {
              email: 'JST 18:30 Mon-Fri',
              slack: 'JST 18:35 Mon-Fri'
            }
          },
          example: `curl ${baseUrl}/api`,
          auth: 'public',
        },
        {
          method: 'GET',
          path: '/config',
          description: '系统配置页面（Web 管理界面）',
          responseType: 'HTML',
          auth: 'session',
        },
      ],
    },
    {
      name: '邮件报告',
      nameEn: 'Email',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
      color: '#f59e0b',
      description: '每日完成任务的邮件报告功能（JST 18:30 自动触发）',
      endpoints: [
        {
          method: 'GET',
          path: '/manual',
          description: '手动触发完整流程：扫描 Jira → 存储报告 → 发送内部通知邮件',
          params: [
            {
              name: 'skip_email',
              type: 'boolean',
              required: false,
              description: '设为 true 跳过发送邮件，仅返回预览链接',
            },
          ],
          responseJson: {
            success: true,
            message: 'Report generated and internal notification sent',
            reviewUrl: `${baseUrl}/review/abc123-def456`,
            date: '2024年2月8日',
            totalCompleted: 5,
            parentTasks: ['AT-878']
          },
          example: `curl ${baseUrl}/manual?skip_email=true`,
          auth: 'bearer',
        },
        {
          method: 'GET',
          path: '/review/:token',
          description: '查看报告详情页面，用户可在此页面预览并发送给客户',
          params: [
            {
              name: 'token',
              type: 'string',
              required: true,
              description: '报告的唯一标识符（UUID），有效期 24 小时',
            },
          ],
          responseType: 'HTML 报告预览页面',
          example: `${baseUrl}/review/abc123-def456`,
          auth: 'public',
        },
        {
          method: 'POST',
          path: '/review/:token/send',
          description: '在 review 页面发送客户邮件（通过 Gmail API 统一发送）',
          params: [
            {
              name: 'token',
              type: 'string',
              required: true,
              description: '报告的唯一标识符（UUID），与 review 页面 URL 中的 token 一致',
            },
          ],
          responseJson: {
            success: true,
          },
          example: `curl -X POST -H "Content-Type: application/json" -d '{"to":"client@example.com","subject":"Test","body":"Hello"}' ${baseUrl}/review/abc123-def456/send`,
          auth: 'public',
        },
        {
          method: 'POST',
          path: '/review/:token/confirm',
          description: '确认邮件已发送。用户在 review 页面点击「我已发送」后调用，记录确认时间并更新扫描区间起点',
          params: [
            {
              name: 'token',
              type: 'string',
              required: true,
              description: '报告的唯一标识符（UUID），与 review 页面 URL 中的 token 一致',
            },
          ],
          responseJson: {
            success: true,
            confirmedAt: '2024-02-08T09:30:00.000Z',
          },
          example: `curl -X POST ${baseUrl}/review/abc123-def456/confirm`,
          auth: 'public',
        },
        {
          method: 'GET',
          path: '/test/email',
          description: '使用模拟数据测试邮件发送功能',
          responseJson: {
            success: true,
            message: 'Test email sent successfully',
            sentTo: supportEmail || 'admin@example.com',
            reviewUrl: `${baseUrl}/review/test-token-123`
          },
          example: `curl ${baseUrl}/test/email`,
          auth: 'bearer',
        },
        {
          method: 'GET',
          path: '/test/review',
          description: '使用模拟数据预览报告页面，用于测试页面样式',
          responseType: 'HTML 模拟报告页面',
          example: `${baseUrl}/test/review`,
          auth: 'bearer',
        },
        {
          method: 'POST',
          path: '/api/email/send',
          description: '从配置页面手动触发邮件发送，记录操作人。若当天已手动发送，自动触发将跳过',
          responseJson: {
            success: true,
            message: 'Report generated and email sent',
            reviewUrl: `${baseUrl}/review/abc123-def456`,
            date: '2024年2月8日',
            totalCompleted: 5,
            operator: 'admin'
          },
          example: `curl -X POST -H "Authorization: Bearer <TOKEN>" ${baseUrl}/api/email/send`,
          auth: 'session-or-bearer',
        },
      ],
    },
    {
      name: 'Slack 通知',
      nameEn: 'Slack',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="13" y="2" width="3" height="8" rx="1.5"/><path d="M19 8.5V10h1.5A1.5 1.5 0 1 0 19 8.5"/><rect x="8" y="14" width="3" height="8" rx="1.5"/><path d="M5 15.5V14H3.5A1.5 1.5 0 1 0 5 15.5"/><rect x="14" y="13" width="8" height="3" rx="1.5"/><path d="M15.5 19H14v1.5a1.5 1.5 0 1 0 1.5-1.5"/><rect x="2" y="8" width="8" height="3" rx="1.5"/><path d="M8.5 5H10V3.5A1.5 1.5 0 1 0 8.5 5"/></svg>`,
      color: '#8b5cf6',
      description: '未完成任务的 Slack 提醒功能（JST 18:35 自动触发）',
      endpoints: [
        {
          method: 'GET',
          path: '/slack/test',
          description: '手动触发 Slack 通知，发送当前所有未完成任务到 Slack 频道',
          responseJson: {
            success: true,
            parentIssues: ['AT-878'],
            totalIncomplete: 4,
            messagePreview: '未完了タスク一覧 - 2024年2月8日 18:30 - 4件の未完了タスクがあります'
          },
          example: `curl ${baseUrl}/slack/test`,
          auth: 'bearer',
        },
        {
          method: 'GET',
          path: '/slack/incomplete',
          description: '查看未完成任务列表（JSON 格式），不发送 Slack 通知',
          params: [
            {
              name: 'parent',
              type: 'string',
              required: false,
              description: '指定父任务 Key（如 AT-878），不指定则使用配置的所有父任务',
            },
          ],
          responseJson: {
            success: true,
            parentIssues: ['AT-878'],
            reports: [
              {
                parentKey: 'AT-878',
                parentSummary: '【生产】问题汇总',
                incompleteTasks: [
                  {
                    key: 'AT-952',
                    summary: '【顾客】批量导入问题',
                    assignee: '李凯',
                    status: '待办 TODO',
                    statusCategory: 'new',
                    priority: 'Medium'
                  },
                  {
                    key: 'AT-944',
                    summary: 'Biz顾客-查看详细',
                    assignee: '薛勇',
                    status: 'READY RELEASE',
                    statusCategory: 'indeterminate',
                    priority: 'Medium'
                  }
                ],
                totalSubtasks: 40,
                completedSubtasks: 36,
                progressPercent: 90
              }
            ],
            totalIncomplete: 4,
            messagePreview: '未完了タスク一覧 - 4件の未完了タスクがあります'
          },
          example: `curl ${baseUrl}/slack/incomplete?parent=AT-878`,
        },
      ],
    },
    {
      name: '调试工具',
      nameEn: 'Debug',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>`,
      color: '#ec4899',
      description: '用于调试和排查问题的工具端点',
      endpoints: [
        {
          method: 'GET',
          path: '/debug/subtasks',
          description: '查看父任务下所有子任务的详细信息，包括状态变更历史',
          params: [
            {
              name: 'parent',
              type: 'string',
              required: true,
              description: '父任务 Key（如 AT-878）',
            },
          ],
          responseJson: {
            parentKey: 'AT-878',
            parentSummary: '【生产】问题汇总',
            parentStatus: 'In Progress',
            totalSubtasks: 40,
            completedSubtasks: 36,
            progressPercent: 90,
            subtasks: [
              {
                key: 'AT-900',
                summary: '任务标题示例',
                status: 'Done',
                assignee: '李凯',
                priority: 'Medium',
                statusChanges: [
                  {
                    from: 'TODO',
                    to: 'Done',
                    changedAt: '2024-02-08T10:30:00.000Z',
                    changedAtFormatted: '2024/02/08 19:30',
                    isToday: true
                  }
                ]
              }
            ],
            completedToday: [
              {
                key: 'AT-900',
                summary: '任务标题示例',
                status: 'Done',
                assignee: '李凯',
                priority: 'Medium',
                statusChanges: []
              }
            ],
            todayDate: '2024年2月8日',
            timezone: 'Asia/Tokyo'
          },
          example: `curl ${baseUrl}/debug/subtasks?parent=AT-878`,
        },
      ],
    },
    {
      name: '管理接口',
      nameEn: 'Admin',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
      color: '#3b82f6',
      description: '管理后台与日志查询接口（需要鉴权）',
      endpoints: [
        {
          method: 'GET',
          path: '/admin/tokens',
          description: '授权码管理接口（JSON）',
          responseJson: {
            success: true,
            count: 1,
            tokens: [{ token: '123456', note: 'CI/CD', createdAt: '...', expiresAt: null, lastUsedAt: null, isDisabled: false }]
          },
          auth: 'session-or-bearer',
          example: `curl -H "Authorization: Bearer <TOKEN>" ${baseUrl}/admin/tokens`,
        },
        {
          method: 'POST',
          path: '/admin/tokens',
          description: '创建授权码',
          responseJson: { success: true, token: '123456' },
          auth: 'session-or-bearer',
          example: `curl -X POST -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{"note":"CI"}' ${baseUrl}/admin/tokens`,
        },
        {
          method: 'DELETE',
          path: '/admin/tokens/:code',
          description: '禁用授权码',
          responseJson: { success: true, message: 'Token disabled' },
          auth: 'session-or-bearer',
        },
        {
          method: 'POST',
          path: '/admin/tokens/:code/enable',
          description: '启用授权码',
          responseJson: { success: true, message: 'Token enabled' },
          auth: 'session-or-bearer',
        },
        {
          method: 'GET',
          path: '/admin/logs/query',
          description: '查询访问日志（date/token/endpoint）',
          responseJson: { success: true, count: 0, logs: [] },
          auth: 'session-or-bearer',
        },
        {
          method: 'GET',
          path: '/admin/email-logs',
          description: '查询邮件发送记录，包括触发方式和操作人',
          params: [
            {
              name: 'days',
              type: 'number',
              required: false,
              description: '查询天数（默认 30，最大 90）',
            },
          ],
          responseJson: {
            success: true,
            days: 30,
            count: 2,
            logs: [
              { id: 1, date: '2024-02-08', triggerType: 'manual', operator: 'admin', success: true, details: '5 tasks completed', reviewUrl: `${baseUrl}/review/abc123`, timestamp: '2024-02-08T09:30:00.000Z' },
              { id: 2, date: '2024-02-07', triggerType: 'auto', operator: 'System (Cron)', success: true, details: 'Auto-triggered at 18:30 JST', reviewUrl: null, timestamp: '2024-02-07T09:30:00.000Z' },
            ]
          },
          example: `curl -H "Authorization: Bearer <TOKEN>" ${baseUrl}/admin/email-logs?days=7`,
          auth: 'session-or-bearer',
        },
      ],
    },
  ];
}

function inferAuth(path: string): 'public' | 'session' | 'bearer' | 'session-or-bearer' {
  if (path.startsWith('/admin')) return 'session-or-bearer';
  if (path === '/config') return 'session';
  if (path.startsWith('/review')) return 'public';
  if (path === '/' || path === '/docs' || path === '/health' || path === '/login') return 'public';
  return 'bearer';
}

/**
 * Format JSON with syntax highlighting
 */
function formatJsonHtml(obj: object): string {
  const json = JSON.stringify(obj, null, 2);
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
    .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
    .replace(/: (\d+)/g, ': <span class="json-number">$1</span>')
    .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
    .replace(/: (null)/g, ': <span class="json-null">$1</span>');
}

/**
 * Generate the API documentation HTML page
 */
export function generateDocsPage(baseUrl: string, brandName?: string, brandUrl?: string, supportEmail?: string): string {
  const modules = getApiModules(baseUrl, supportEmail);

  const modulesSidebar = modules
    .map(
      (m, i) => `
        <a href="#${encodeURIComponent(m.nameEn.toLowerCase())}" class="nav-item" style="--delay: ${i * 0.05}s; --accent: ${m.color}">
          <span class="nav-icon">${m.icon}</span>
          <span class="nav-text">${m.name}</span>
          <span class="nav-badge">${m.endpoints.length}</span>
        </a>
      `
    )
    .join('');

  const modulesContent = modules
    .map(
      (m, mi) => `
        <section id="${encodeURIComponent(m.nameEn.toLowerCase())}" class="module" style="--accent: ${m.color}; --index: ${mi}">
          <div class="module-header">
            <div class="module-icon-wrap">
              ${m.icon}
            </div>
            <div class="module-info">
              <h2>${m.name}</h2>
              <p>${m.description}</p>
            </div>
            <span class="module-count">${m.endpoints.length} endpoints</span>
          </div>
          
          <div class="endpoints">
            ${m.endpoints
              .map(
                (e, ei) => `
                <div class="endpoint" style="--ei: ${ei}">
                  <div class="endpoint-header">
                    <span class="method method-${e.method.toLowerCase()}">${e.method}</span>
                    <code class="path">${e.path}</code>
                    <span class="auth-badge ${e.auth || inferAuth(e.path)}">${(e.auth || inferAuth(e.path)).replace(/-/g, ' ')}</span>
                    <button class="copy-btn" onclick="navigator.clipboard.writeText('${baseUrl}${e.path.replace(':token', 'xxx')}')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                  </div>
                  <p class="endpoint-desc">${e.description}</p>
                  
                  ${
                    e.params && e.params.length > 0
                      ? `
                    <div class="params">
                      <h4>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>
                        参数
                      </h4>
                      <div class="params-list">
                        ${e.params
                          .map(
                            (p) => `
                          <div class="param-item">
                            <div class="param-name">
                              <code>${p.name}</code>
                              <span class="param-type">${p.type}</span>
                              ${p.required ? '<span class="param-required">必填</span>' : '<span class="param-optional">可选</span>'}
                            </div>
                            <div class="param-desc">${p.description}</div>
                          </div>
                        `
                          )
                          .join('')}
                      </div>
                    </div>
                  `
                      : ''
                  }
                  
                  ${
                    e.responseType
                      ? `
                    <div class="response">
                      <h4>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                        响应
                      </h4>
                      <div class="response-type">${e.responseType}</div>
                    </div>
                  `
                      : ''
                  }
                  
                  ${
                    e.responseJson
                      ? `
                    <div class="response">
                      <h4>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                        响应结构
                        <span class="response-badge">JSON</span>
                      </h4>
                      <div class="json-block">
                        <button class="copy-btn json-copy" onclick="navigator.clipboard.writeText(this.nextElementSibling.textContent)">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </button>
                        <pre class="json-pre"><code class="json-code">${formatJsonHtml(e.responseJson)}</code></pre>
                      </div>
                    </div>
                  `
                      : ''
                  }
                  
                  ${
                    e.example
                      ? `
                    <div class="example">
                      <h4>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                        请求示例
                      </h4>
                      <div class="example-code">
                        <button class="copy-btn" onclick="navigator.clipboard.writeText(\`${e.example}\`)">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </button>
                        <pre><code>${e.example}</code></pre>
                      </div>
                    </div>
                  `
                      : ''
                  }
                </div>
              `
              )
              .join('')}
          </div>
        </section>
      `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API 文档 - Jira Monitor</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    :root {
      --bg-primary: #0a0a0f;
      --bg-secondary: #12121a;
      --bg-tertiary: #1a1a24;
      --bg-hover: #22222e;
      --bg-code: #0d1117;
      --border: rgba(255, 255, 255, 0.06);
      --border-light: rgba(255, 255, 255, 0.1);
      --text-primary: #f0f0f5;
      --text-secondary: #a0a0b0;
      --text-muted: #606070;
      --accent-green: #10b981;
      --accent-blue: #3b82f6;
      --accent-purple: #8b5cf6;
      --accent-orange: #f59e0b;
      --accent-pink: #ec4899;
      --glow: 0 0 20px rgba(139, 92, 246, 0.15);
    }

    :root[data-theme="light"] {
      --bg-primary: #f6f6f9;
      --bg-secondary: #ffffff;
      --bg-tertiary: #f1f2f6;
      --bg-hover: #eceef4;
      --bg-code: #f5f6fa;
      --border: rgba(15, 23, 42, 0.08);
      --border-light: rgba(15, 23, 42, 0.14);
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --text-muted: #7b8794;
      --glow: 0 0 20px rgba(59, 130, 246, 0.12);
    }
    
    html {
      scroll-behavior: smooth;
    }
    
    body {
      font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      overflow-x: hidden;
    }
    
    /* Animated background */
    .bg-gradient {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        radial-gradient(ellipse 80% 50% at 20% -20%, rgba(139, 92, 246, 0.15), transparent),
        radial-gradient(ellipse 60% 40% at 80% 100%, rgba(59, 130, 246, 0.1), transparent);
      pointer-events: none;
      z-index: 0;
    }
    
    .container {
      display: flex;
      min-height: 100vh;
      position: relative;
      z-index: 1;
    }
    
    /* Sidebar */
    .sidebar {
      width: 280px;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border);
      position: fixed;
      height: 100vh;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      backdrop-filter: blur(20px);
    }
    
    .sidebar::-webkit-scrollbar {
      width: 6px;
    }
    
    .sidebar::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .sidebar::-webkit-scrollbar-thumb {
      background: var(--border-light);
      border-radius: 3px;
    }
    
    .logo {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 14px;
    }
    
    .logo-back {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text-secondary);
      text-decoration: none;
      transition: all 0.2s;
    }
    
    .logo-back:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
      border-color: var(--border-light);
    }
    
    .logo-back svg {
      width: 18px;
      height: 18px;
    }
    
    .logo-text h1 {
      font-size: 16px;
      font-weight: 600;
    }
    
    .logo-text p {
      font-size: 11px;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
    }
    
    .nav {
      padding: 16px 12px;
      flex: 1;
    }
    
    .nav-label {
      font-size: 10px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1.2px;
      padding: 12px 12px 8px;
    }
    
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      color: var(--text-secondary);
      text-decoration: none;
      border-radius: 10px;
      transition: all 0.2s ease;
      margin-bottom: 4px;
      position: relative;
      animation: fadeSlideIn 0.4s ease backwards;
      animation-delay: var(--delay);
    }
    
    .nav-item:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
    
    .nav-item:hover .nav-icon {
      color: var(--accent);
    }
    
    .nav-icon {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      transition: color 0.2s;
    }
    
    .nav-icon svg {
      width: 18px;
      height: 18px;
    }
    
    .nav-text {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
    }
    
    .nav-badge {
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
      padding: 2px 8px;
      background: var(--bg-tertiary);
      border-radius: 6px;
      color: var(--text-muted);
    }
    
    /* Status indicator */
    .status {
      padding: 16px 20px;
      margin: 12px;
      background: var(--bg-tertiary);
      border-radius: 12px;
      border: 1px solid var(--border);
    }
    
    .status-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
    }
    
    .status-dot {
      width: 8px;
      height: 8px;
      background: var(--accent-green);
      border-radius: 50%;
      animation: pulse 2s infinite;
      box-shadow: 0 0 8px var(--accent-green);
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .status-text {
      color: var(--text-secondary);
    }
    
    .status-link {
      margin-left: auto;
      color: var(--accent-green);
      text-decoration: none;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
    }

    .theme-toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .theme-toggle:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
      border-color: var(--border-light);
    }

    .theme-toggle .theme-icon svg {
      width: 16px;
      height: 16px;
    }

    .theme-toggle-floating {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2;
    }
    
    /* Main content */
    .main {
      flex: 1;
      margin-left: 280px;
      padding: 40px 60px 80px;
      max-width: 960px;
    }
    
    /* Hero section */
    .hero {
      margin-bottom: 48px;
      animation: fadeIn 0.6s ease;
    }
    
    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      color: var(--accent-purple);
      margin-bottom: 20px;
    }
    
    .hero-badge svg {
      width: 14px;
      height: 14px;
    }
    
    .hero h1 {
      font-size: 42px;
      font-weight: 700;
      letter-spacing: -1px;
      margin-bottom: 16px;
      background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .hero p {
      font-size: 17px;
      color: var(--text-secondary);
      max-width: 520px;
      line-height: 1.7;
    }

    .auth-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 20px;
    }

    .auth-legend .auth-badge {
      font-size: 12px;
    }
    
    /* Base URL card */
    .base-url {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 18px 22px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 14px;
      margin-top: 28px;
      transition: all 0.3s ease;
    }
    
    .base-url:hover {
      border-color: var(--border-light);
      box-shadow: var(--glow);
    }
    
    .base-url-icon {
      width: 42px;
      height: 42px;
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    
    .base-url-icon svg {
      color: white;
      width: 20px;
      height: 20px;
    }
    
    .base-url-content {
      flex: 1;
      min-width: 0;
    }
    
    .base-url-label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    
    .base-url-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 15px;
      color: var(--accent-blue);
      word-break: break-all;
    }
    
    .copy-btn {
      padding: 8px 10px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .copy-btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
      border-color: var(--border-light);
    }
    
    /* Module section */
    .module {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 28px;
      margin-bottom: 28px;
      transition: all 0.2s ease;
      animation: fadeSlideUp 0.5s ease backwards;
      animation-delay: calc(var(--index) * 0.1s);
    }
    
    .module:hover {
      border-color: var(--border-light);
    }
    
    .module-header {
      display: flex;
      align-items: center;
      gap: 18px;
      padding-bottom: 24px;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }
    
    .module-icon-wrap {
      width: 52px;
      height: 52px;
      background: color-mix(in srgb, var(--accent) 15%, transparent);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--accent);
      flex-shrink: 0;
    }
    
    .module-icon-wrap svg {
      width: 24px;
      height: 24px;
    }
    
    .module-info {
      flex: 1;
    }
    
    .module-info h2 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .module-info p {
      font-size: 14px;
      color: var(--text-secondary);
    }
    
    .module-count {
      font-size: 12px;
      font-family: 'JetBrains Mono', monospace;
      padding: 6px 12px;
      background: var(--bg-tertiary);
      border-radius: 8px;
      color: var(--text-muted);
    }
    
    /* Endpoint */
    .endpoint {
      padding: 24px 0;
      border-bottom: 1px solid var(--border);
      animation: fadeIn 0.3s ease backwards;
      animation-delay: calc(var(--ei) * 0.05s);
    }
    
    .endpoint:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    
    .endpoint-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 14px;
    }

    .auth-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid var(--border);
      color: var(--text-muted);
      background: var(--bg-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .auth-badge.public {
      color: var(--accent-green);
      border-color: rgba(16, 185, 129, 0.3);
      background: rgba(16, 185, 129, 0.08);
    }

    .auth-badge.session,
    .auth-badge.session-or-bearer {
      color: var(--accent-blue);
      border-color: rgba(59, 130, 246, 0.3);
      background: rgba(59, 130, 246, 0.08);
    }

    .auth-badge.bearer {
      color: var(--accent-orange);
      border-color: rgba(245, 158, 11, 0.3);
      background: rgba(245, 158, 11, 0.08);
    }
    
    .method {
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .method-get {
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent-green);
    }
    
    .method-post {
      background: rgba(59, 130, 246, 0.15);
      color: var(--accent-blue);
    }
    
    .method-put {
      background: rgba(245, 158, 11, 0.15);
      color: var(--accent-orange);
    }
    
    .method-delete {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }
    
    .path {
      font-family: 'JetBrains Mono', monospace;
      font-size: 15px;
      font-weight: 500;
      color: var(--text-primary);
      flex: 1;
    }
    
    .endpoint-header .copy-btn {
      opacity: 0;
      transition: opacity 0.2s;
    }
    
    .endpoint:hover .endpoint-header .copy-btn {
      opacity: 1;
    }
    
    .endpoint-desc {
      color: var(--text-secondary);
      font-size: 14px;
      line-height: 1.7;
    }
    
    /* Params */
    .params, .response, .example {
      margin-top: 20px;
    }
    
    .params h4, .response h4, .example h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 12px;
    }
    
    .params h4 svg, .response h4 svg, .example h4 svg {
      color: var(--text-muted);
    }
    
    .response-badge {
      font-size: 10px;
      padding: 2px 8px;
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent-green);
      border-radius: 4px;
      margin-left: 8px;
      font-weight: 500;
    }
    
    .params-list {
      background: var(--bg-tertiary);
      border-radius: 12px;
      overflow: hidden;
    }
    
    .param-item {
      padding: 14px 18px;
      border-bottom: 1px solid var(--border);
    }
    
    .param-item:last-child {
      border-bottom: none;
    }
    
    .param-name {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }
    
    .param-name code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary);
    }
    
    .param-type {
      font-size: 11px;
      padding: 2px 8px;
      background: var(--bg-hover);
      border-radius: 4px;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
    }
    
    .param-required {
      font-size: 10px;
      padding: 2px 8px;
      background: rgba(239, 68, 68, 0.15);
      border-radius: 4px;
      color: #ef4444;
      font-weight: 500;
    }
    
    .param-optional {
      font-size: 10px;
      padding: 2px 8px;
      background: var(--bg-hover);
      border-radius: 4px;
      color: var(--text-muted);
    }
    
    .param-desc {
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    .response-type {
      font-size: 13px;
      padding: 12px 16px;
      background: var(--bg-tertiary);
      border-radius: 10px;
      color: var(--text-secondary);
    }
    
    /* JSON Block */
    .json-block {
      position: relative;
      background: var(--bg-code);
      border-radius: 12px;
      border: 1px solid var(--border);
      overflow: hidden;
    }
    
    .json-block .copy-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 10;
      background: rgba(255, 255, 255, 0.08);
      border: none;
      opacity: 0;
      transition: opacity 0.2s;
    }
    
    .json-block:hover .copy-btn {
      opacity: 1;
    }
    
    .json-block .copy-btn:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    
    .json-pre {
      margin: 0;
      padding: 20px;
      overflow-x: auto;
      max-height: 400px;
      overflow-y: auto;
    }
    
    .json-pre::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    
    .json-pre::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .json-pre::-webkit-scrollbar-thumb {
      background: var(--border-light);
      border-radius: 4px;
    }
    
    .json-code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      line-height: 1.6;
      color: #c9d1d9;
    }
    
    .json-key {
      color: #7ee787;
    }
    
    .json-string {
      color: #a5d6ff;
    }
    
    .json-number {
      color: #79c0ff;
    }
    
    .json-boolean {
      color: #ff7b72;
    }
    
    .json-null {
      color: #ff7b72;
    }
    
    .example-code {
      position: relative;
      background: var(--bg-code);
      border-radius: 12px;
      border: 1px solid var(--border);
      overflow: hidden;
    }
    
    .example-code pre {
      margin: 0;
      padding: 18px 20px;
      overflow-x: auto;
    }
    
    .example-code code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: #c9d1d9;
      line-height: 1.6;
    }
    
    .example-code .copy-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(255, 255, 255, 0.08);
      border: none;
      opacity: 0;
    }
    
    .example-code:hover .copy-btn {
      opacity: 1;
    }
    
    .example-code .copy-btn:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    
    /* Footer */
    .footer {
      text-align: center;
      padding: 48px 0 32px;
      color: var(--text-muted);
      font-size: 13px;
    }
    
    .footer a {
      color: var(--text-secondary);
      text-decoration: none;
    }
    
    .footer a:hover {
      color: var(--text-primary);
    }
    
    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes fadeSlideIn {
      from {
        opacity: 0;
        transform: translateX(-10px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    @keyframes fadeSlideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    /* Responsive */
    @media (max-width: 900px) {
      .sidebar {
        display: none;
      }
      
      .main {
        margin-left: 0;
        padding: 28px 20px 60px;
      }
      
      .hero h1 {
        font-size: 32px;
      }
      
      .module {
        padding: 24px 20px;
      }
      
      .module-header {
        flex-wrap: wrap;
      }
      
      .module-count {
        margin-top: 12px;
        width: 100%;
        text-align: center;
      }
    }
  </style>
</head>
<body>
  <div class="bg-gradient"></div>

  <button class="theme-toggle theme-toggle-floating" id="themeToggle" type="button" title="切换主题">
    <span class="theme-icon" aria-hidden="true"></span>
    <span class="theme-label">暗色</span>
  </button>
  
  <div class="container">
    <aside class="sidebar">
      <div class="logo">
        <a href="/" class="logo-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5"/>
            <path d="m12 19-7-7 7-7"/>
          </svg>
        </a>
        <div class="logo-text">
          <h1>API 文档</h1>
          <p>Jira Monitor</p>
        </div>
      </div>
      
      <nav class="nav">
        <div class="nav-label">Modules</div>
        ${modulesSidebar}
      </nav>
      
      <div class="status">
        <div class="status-row">
          <div class="status-dot"></div>
          <span class="status-text">All systems operational</span>
          <a href="/health" class="status-link">/health</a>
        </div>
      </div>

    </aside>
    
    <main class="main">
      <div class="hero">
        <div class="hero-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6"/>
            <path d="M16 13H8"/>
            <path d="M16 17H8"/>
            <path d="M10 9H8"/>
          </svg>
          API Documentation
        </div>
        <h1>API 文档</h1>
        <p>完整的 API 端点参考，包含请求参数和响应结构示例</p>
        <div class="auth-legend">
          <span class="auth-badge public">public</span>
          <span class="auth-badge session">session</span>
          <span class="auth-badge bearer">bearer</span>
          <span class="auth-badge session-or-bearer">session or bearer</span>
        </div>
        
        <div class="base-url">
          <div class="base-url-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </div>
          <div class="base-url-content">
            <div class="base-url-label">Base URL</div>
            <div class="base-url-value">${baseUrl}</div>
          </div>
          <button class="copy-btn" onclick="navigator.clipboard.writeText('${baseUrl}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
        </div>
      </div>
      
      ${modulesContent}
      
      <div class="footer">
        <p>Built with Cloudflare Workers${brandName && brandUrl ? ` · <a href="${brandUrl}" target="_blank">${brandName}</a>` : ''}</p>
      </div>
    </main>
  </div>
  <script>
    (function initTheme() {
      const root = document.documentElement;
      const storageKey = 'theme';
      const stored = localStorage.getItem(storageKey);
      if (stored === 'light' || stored === 'dark') {
        root.setAttribute('data-theme', stored);
      } else if (window.matchMedia) {
        const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
        root.setAttribute('data-theme', prefersLight ? 'light' : 'dark');
      }

      const toggle = document.getElementById('themeToggle');
      if (!toggle) return;
      const sun = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
      const moon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>';

      const label = toggle.querySelector('.theme-label');
      const icon = toggle.querySelector('.theme-icon');

      function render() {
        const isLight = root.getAttribute('data-theme') === 'light';
        toggle.setAttribute('aria-pressed', isLight ? 'true' : 'false');
        if (label) label.textContent = isLight ? '亮色' : '暗色';
        if (icon) icon.innerHTML = isLight ? sun : moon;
      }

      toggle.addEventListener('click', () => {
        const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        root.setAttribute('data-theme', next);
        localStorage.setItem(storageKey, next);
        render();
      });

      render();
    })();
  </script>
</body>
</html>`;
}
