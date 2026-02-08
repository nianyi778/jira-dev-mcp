import type { StoredReport } from '../types';

/**
 * Escape HTML entities to prevent XSS
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate the review page HTML
 * Design: Clean, professional, minimal - no AI aesthetics
 */
export function generateReviewPage(report: StoredReport): string {
  const { dailyReport, defaultTo, defaultCc, defaultSubject, defaultBody } = report;

  // Calculate summary
  const parentTasks = dailyReport.reports.map((r) => r.parentKey).join(', ');
  const totalCompleted = dailyReport.totalCompletedToday;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>送信確認 - Jira進捗報告</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :root {
      --bg: #0b0d11;
      --card-bg: #12141a;
      --border: #20242d;
      --border-strong: #2a2f3a;
      --text-primary: #f5f7fb;
      --text-secondary: #b0b7c3;
      --text-muted: #7f8796;
      --accent: #60a5fa;
      --input-bg: #0f131b;
      --input-border: #2a2f3a;
      --input-focus: #e5e7eb;
      --input-shadow: rgba(96, 165, 250, 0.2);
      --textarea-bg: #0f131b;
      --action-bg: #141823;
      --button-bg: #e5e7eb;
      --button-text: #0b0d11;
      --button-hover: #f8fafc;
      --error-bg: #3b1414;
      --error-text: #fca5a5;
      --error-icon-bg: #3b1414;
      --error-icon: #f87171;
    }

    :root[data-theme="light"] {
      --bg: #f5f5f5;
      --card-bg: #ffffff;
      --border: #e5e5e5;
      --border-strong: #e0e0e0;
      --text-primary: #1a1a1a;
      --text-secondary: #666;
      --text-muted: #999;
      --accent: #0066cc;
      --input-bg: #ffffff;
      --input-border: #e0e0e0;
      --input-focus: #1a1a1a;
      --input-shadow: rgba(0, 0, 0, 0.05);
      --textarea-bg: #fafafa;
      --action-bg: #fafafa;
      --button-bg: #1a1a1a;
      --button-text: #ffffff;
      --button-hover: #333;
      --error-bg: #fee2e2;
      --error-text: #dc2626;
      --error-icon-bg: #fee2e2;
      --error-icon: #dc2626;
    }
    
    body {
      font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Meiryo', sans-serif;
      background: var(--bg);
      min-height: 100vh;
      padding: 40px 20px;
      color: var(--text-primary);
      overflow-x: hidden;
    }

    .bg-effects {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 0;
      background:
        radial-gradient(ellipse 50% 30% at 20% 10%, rgba(59, 130, 246, 0.08), transparent),
        radial-gradient(ellipse 40% 30% at 80% 90%, rgba(16, 185, 129, 0.06), transparent);
    }
    
    .container {
      max-width: 680px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
    }
    
    .card {
      background: var(--card-bg);
      border-radius: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }
    
    .header {
      padding: 24px 32px;
      border-bottom: 1px solid var(--border);
    }
    
    .header-meta {
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 4px;
    }
    
    .header h1 {
      font-size: 20px;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .summary {
      display: flex;
      border-bottom: 1px solid var(--border);
    }
    
    .summary-item {
      flex: 1;
      padding: 20px;
      text-align: center;
      border-right: 1px solid var(--border);
    }
    
    .summary-item:last-child {
      border-right: none;
    }
    
    .summary-value {
      font-size: 24px;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .summary-value.highlight {
      color: var(--accent);
    }
    
    .summary-label {
      font-size: 11px;
      color: var(--text-secondary);
      margin-top: 4px;
    }
    
    .content {
      padding: 32px;
    }
    
    .form-group {
      margin-bottom: 24px;
    }
    
    .form-group:last-child {
      margin-bottom: 0;
    }
    
    .form-group label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary);
      margin-bottom: 8px;
    }
    
    .form-group .hint {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 6px;
    }
    
    input[type="text"],
    textarea {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid var(--input-border);
      border-radius: 10px;
      font-size: 14px;
      font-family: inherit;
      color: var(--text-primary);
      background: var(--input-bg);
      transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    }
    
    input[type="text"]:focus,
    textarea:focus {
      outline: none;
      border-color: var(--input-focus);
      box-shadow: 0 0 0 3px var(--input-shadow);
    }
    
    textarea {
      resize: vertical;
      min-height: 120px;
    }
    
    textarea#body {
      min-height: 280px;
      font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
      font-size: 12px;
      line-height: 1.6;
      background: var(--textarea-bg);
    }
    
    .actions {
      padding: 20px 32px;
      background: var(--action-bg);
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    
    .actions-hint {
      font-size: 12px;
      color: var(--text-muted);
    }
    
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border: none;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s, transform 0.1s;
    }
    
    .btn-primary {
      background: var(--button-bg);
      color: var(--button-text);
    }
    
    .btn-primary:hover {
      background: var(--button-hover);
    }
    
    .btn-primary:active {
      transform: scale(0.98);
    }
    
    .footer {
      padding: 16px 32px;
      text-align: center;
      font-size: 11px;
      color: var(--text-muted);
    }

    .theme-toggle {
      position: fixed;
      top: 20px;
      right: 20px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      z-index: 2;
    }

    .theme-toggle:hover {
      color: var(--text-primary);
      border-color: var(--border-strong);
    }

    .theme-toggle .theme-icon svg {
      width: 16px;
      height: 16px;
    }

    .theme-toggle .theme-label {
      white-space: nowrap;
    }
    
    @media (max-width: 600px) {
      body {
        padding: 16px;
      }
      
      .header, .content, .actions {
        padding: 20px;
      }
      
      .summary {
        flex-direction: column;
      }
      
      .summary-item {
        border-right: none;
        border-bottom: 1px solid var(--border);
        padding: 16px;
      }
      
      .summary-item:last-child {
        border-bottom: none;
      }
      
      .actions {
        flex-direction: column;
        align-items: stretch;
      }
      
      .actions-hint {
        text-align: center;
        order: 2;
      }
      
      .btn {
        width: 100%;
        justify-content: center;
      }
    }
  </style>
</head>
<body>
  <div class="bg-effects"></div>
  <button class="theme-toggle" id="themeToggle" type="button" title="切换主题">
    <span class="theme-icon" aria-hidden="true"></span>
    <span class="theme-label">暗色</span>
  </button>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="header-meta">${escapeHtml(dailyReport.date)}</div>
        <h1>Jira 進捗報告</h1>
      </div>
      
      <div class="summary">
        <div class="summary-item">
          <div class="summary-value">${totalCompleted}</div>
          <div class="summary-label">完了タスク</div>
        </div>
        <div class="summary-item">
          <div class="summary-value highlight">${escapeHtml(parentTasks)}</div>
          <div class="summary-label">対象タスク</div>
        </div>
      </div>
      
      <div class="content">
        <form id="emailForm">
          <div class="form-group">
            <label for="to">宛先 (To)</label>
            <input type="text" id="to" value="${escapeHtml(defaultTo)}" />
            <div class="hint">複数の宛先はカンマで区切ってください</div>
          </div>
          
          <div class="form-group">
            <label for="cc">CC</label>
            <input type="text" id="cc" value="${escapeHtml(defaultCc || '')}" />
            <div class="hint">複数の宛先はカンマで区切ってください（任意）</div>
          </div>
          
          <div class="form-group">
            <label for="subject">件名</label>
            <input type="text" id="subject" value="${escapeHtml(defaultSubject)}" />
          </div>
          
          <div class="form-group">
            <label for="body">本文</label>
            <textarea id="body">${escapeHtml(defaultBody)}</textarea>
          </div>
        </form>
      </div>
      
      <div class="actions">
        <span class="actions-hint">クリックするとメールアプリが開きます</span>
        <button type="button" class="btn btn-primary" onclick="openMailClient()">
          メールを作成
        </button>
      </div>
      
      <div class="footer">
        有効期限: ${escapeHtml(new Date(report.expiresAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }))}
      </div>
    </div>
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

    function openMailClient() {
      const to = document.getElementById('to').value.trim();
      const cc = document.getElementById('cc').value.trim();
      const subject = document.getElementById('subject').value.trim();
      const body = document.getElementById('body').value;
      
      if (!to) {
        alert('宛先を入力してください');
        return;
      }
      
      if (!subject) {
        alert('件名を入力してください');
        return;
      }
      
      // Build mailto URL
      // macOS Mail requires specific format: mailto:to?cc=...&subject=...&body=...
      const params = new URLSearchParams();
      if (cc) {
        // Clean up CC addresses - remove spaces after commas
        const cleanCc = cc.split(',').map(e => e.trim()).join(',');
        params.set('cc', cleanCc);
      }
      params.set('subject', subject);
      params.set('body', body);
      
      const mailtoUrl = 'mailto:' + to + '?' + params.toString();
      
      // Debug log
      console.log('Generated mailto URL:', mailtoUrl);
      
      // Open mail client
      window.location.href = mailtoUrl;
    }
  </script>
</body>
</html>`;
}

/**
 * Generate error page HTML
 */
export function generateErrorPage(
  title: string,
  message: string
): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b0d11;
      --card-bg: #12141a;
      --border: #20242d;
      --text-primary: #f5f7fb;
      --text-secondary: #b0b7c3;
      --text-muted: #7f8796;
      --error-bg: #3b1414;
      --error-text: #fca5a5;
      --error-icon-bg: #3b1414;
      --error-icon: #f87171;
    }

    :root[data-theme="light"] {
      --bg: #f5f5f5;
      --card-bg: #ffffff;
      --border: #e5e5e5;
      --text-primary: #1a1a1a;
      --text-secondary: #666;
      --text-muted: #999;
      --error-bg: #fee2e2;
      --error-text: #dc2626;
      --error-icon-bg: #fee2e2;
      --error-icon: #dc2626;
    }

    body {
      font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', sans-serif;
      background: var(--bg);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: var(--text-primary);
      overflow-x: hidden;
    }

    .bg-effects {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 0;
      background:
        radial-gradient(ellipse 50% 30% at 20% 10%, rgba(59, 130, 246, 0.08), transparent),
        radial-gradient(ellipse 40% 30% at 80% 90%, rgba(16, 185, 129, 0.06), transparent);
    }
    
    .error-box {
      background: var(--card-bg);
      border-radius: 16px;
      padding: 48px;
      text-align: center;
      max-width: 400px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }
    
    .error-icon {
      width: 48px;
      height: 48px;
      background: var(--error-icon-bg);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    
    .error-icon svg {
      width: 24px;
      height: 24px;
      color: var(--error-icon);
    }
    
    .error-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 12px;
    }
    
    .error-message {
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.6;
    }

    .theme-toggle {
      position: fixed;
      top: 20px;
      right: 20px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      z-index: 2;
    }

    .theme-toggle:hover {
      color: var(--text-primary);
    }

    .theme-toggle .theme-icon svg {
      width: 16px;
      height: 16px;
    }

    .theme-toggle .theme-label {
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="bg-effects"></div>
  <button class="theme-toggle" id="themeToggle" type="button" title="切换主题">
    <span class="theme-icon" aria-hidden="true"></span>
    <span class="theme-label">暗色</span>
  </button>
  <div class="error-box">
    <div class="error-icon">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
    <h1 class="error-title">${escapeHtml(title)}</h1>
    <p class="error-message">${escapeHtml(message)}</p>
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
