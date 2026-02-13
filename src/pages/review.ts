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
export function generateReviewPage(report: StoredReport, senderEmail: string): string {
  const { dailyReport, defaultTo, defaultCc, defaultSubject, defaultBody } = report;
  const signatureText = [
    '--------------------',
    'ELESTYLE 株式会社',
    '陳 剣 / CHEN.J / TIN.K',
    'WEB : https://www.elestyle.jp',
    `MAIL : ${senderEmail}`,
    'TEL : 03-6222-9557',
    '〒110-0006',
    '東京都台東区秋葉原1-1',
    '秋葉原ビジネスセンター6階',
    '--------------------',
  ].join('\n');

  // Calculate summary
  const parentTasks = dailyReport.reports.map((r) => r.parentKey).join(', ');
  const totalCompleted = dailyReport.totalCompletedToday;

  return `<!DOCTYPE html>
<html lang="ja" data-theme="light">
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

    .btn:disabled {
      cursor: not-allowed;
      opacity: 0.6;
      transform: none;
    }
    
    .btn-primary {
      background: var(--button-bg);
      color: var(--button-text);
    }
    
    .btn-primary:hover {
      background: var(--button-hover);
    }

    .btn-primary:disabled {
      background: var(--button-bg);
      box-shadow: none;
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
    
    .confirm-section {
      padding: 0 32px 24px;
      text-align: center;
      animation: confirmFadeIn 0.3s ease-out;
    }

    @keyframes confirmFadeIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .confirm-hint {
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 12px;
      line-height: 1.5;
    }

    .confirm-send-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 12px 20px;
      border: none;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #fff;
      transition: opacity 0.2s, transform 0.1s, box-shadow 0.2s;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);
    }

    .confirm-send-btn:hover:not(:disabled) {
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.35);
      opacity: 0.95;
    }

    .confirm-send-btn:active:not(:disabled) {
      transform: scale(0.98);
    }

    .confirm-send-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      box-shadow: none;
    }

    .confirm-send-btn.confirmed {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      box-shadow: none;
    }

    .confirm-send-btn svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .confirm-notification {
      margin-top: 12px;
      padding: 10px 16px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 500;
      line-height: 1.4;
      animation: confirmFadeIn 0.3s ease-out;
    }

    .confirm-notification.success {
      background: rgba(16, 185, 129, 0.12);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .confirm-notification.error {
      background: var(--error-bg);
      color: var(--error-text);
      border: 1px solid rgba(248, 113, 113, 0.2);
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(2, 6, 23, 0.45);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      z-index: 20;
      backdrop-filter: blur(6px);
    }

    .modal {
      width: min(720px, 100%);
      background: #ffffff;
      color: #0f172a;
      border-radius: 16px;
      border: 1px solid rgba(15, 23, 42, 0.12);
      box-shadow: 0 28px 70px rgba(15, 23, 42, 0.35);
      overflow: hidden;
    }

    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid rgba(15, 23, 42, 0.12);
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
    }

    .modal-body {
      padding: 20px 24px;
      display: grid;
      gap: 12px;
      font-size: 14px;
      color: #475569;
    }

    .modal-row {
      display: grid;
      gap: 6px;
    }

    .modal-label {
      font-size: 12px;
      color: #64748b;
    }

    .modal-value {
      color: #0f172a;
      font-weight: 500;
      word-break: break-word;
    }

    .modal-body pre {
      background: #f8fafc;
      border: 1px solid rgba(15, 23, 42, 0.12);
      border-radius: 12px;
      padding: 12px;
      max-height: 280px;
      overflow: auto;
      white-space: pre-wrap;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 12px;
      color: #0f172a;
    }

    .modal-actions {
      padding: 16px 24px 24px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      border-top: 1px solid rgba(15, 23, 42, 0.12);
    }

    .btn-secondary {
      background: transparent;
      color: #0f172a;
      border: 1px solid rgba(15, 23, 42, 0.2);
      box-shadow: none;
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
        <div class="summary-item">
          <div class="summary-value" id="releaseTime">--:--</div>
          <div class="summary-label">release時刻</div>
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
        <textarea id="signatureData" style="display: none;">${escapeHtml(signatureText)}</textarea>
      </div>
      
      <div class="actions">
        <span class="actions-hint" id="sendHint">クリックするとメールが送信されます</span>
        <button type="button" class="btn btn-primary" id="sendEmailBtn" onclick="openPreview()">
          メールを送信
        </button>
      </div>
      
      <div class="confirm-section" id="confirmSection" style="display: none;">
        <p class="confirm-hint" id="confirmSendLabel">已发送邮件，正在记录发送确认。</p>
        <div id="confirmNotification"></div>
      </div>

      <div class="modal-overlay" id="previewModal" aria-hidden="true">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="previewTitle">
          <div class="modal-header" id="previewTitle">送信前プレビュー</div>
          <div class="modal-body">
            <div class="modal-row">
              <div class="modal-label">To</div>
              <div class="modal-value" id="previewTo"></div>
            </div>
            <div class="modal-row">
              <div class="modal-label">CC</div>
              <div class="modal-value" id="previewCc"></div>
            </div>
            <div class="modal-row">
              <div class="modal-label">件名</div>
              <div class="modal-value" id="previewSubject"></div>
            </div>
            <div class="modal-row">
              <div class="modal-label">本文</div>
              <pre id="previewBody"></pre>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closePreview()">キャンセル</button>
            <button type="button" class="btn btn-primary" id="confirmSendBtn" onclick="sendClientEmail()">送信する</button>
          </div>
        </div>
      </div>

      <div class="footer">
        有効期限: ${escapeHtml(new Date(report.expiresAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }))}
      </div>
    </div>
  </div>
  
  <script>
    // Set release time on page load
    (function setReleaseTime() {
      const el = document.getElementById('releaseTime');
      if (el) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('ja-JP', {
          timeZone: 'Asia/Tokyo',
          hour: '2-digit',
          minute: '2-digit'
        });
        el.textContent = timeStr;
      }
    })();

    (function initTheme() {
      const root = document.documentElement;
      const storageKey = 'theme';
      root.setAttribute('data-theme', 'light');
      localStorage.setItem(storageKey, 'light');

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

    function getExternalSignature() {
      var el = document.getElementById('signatureData');
      return el ? el.value : '';
    }

    function appendSignatureIfMissing(body) {
      if (body.indexOf('https://www.elestyle.jp') !== -1) {
        return body;
      }
      return body.replace(/\\s*$/, '') + '\\n\\n' + getExternalSignature();
    }

    function openPreview() {
      var sendBtn = document.getElementById('sendEmailBtn');
      if (sendBtn && sendBtn.disabled) return;

      var to = document.getElementById('to').value.trim();
      var cc = document.getElementById('cc').value.trim();
      var subject = document.getElementById('subject').value.trim();
      var body = document.getElementById('body').value;
      var finalBody = appendSignatureIfMissing(body);

      if (!to) {
        alert('宛先を入力してください');
        return;
      }
      if (!subject) {
        alert('件名を入力してください');
        return;
      }

      var modal = document.getElementById('previewModal');
      var previewTo = document.getElementById('previewTo');
      var previewCc = document.getElementById('previewCc');
      var previewSubject = document.getElementById('previewSubject');
      var previewBody = document.getElementById('previewBody');
      if (previewTo) previewTo.textContent = to;
      if (previewCc) previewCc.textContent = cc || '-';
      if (previewSubject) previewSubject.textContent = subject;
      if (previewBody) previewBody.textContent = finalBody;
      if (modal) {
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
      }
    }

    function closePreview() {
      var modal = document.getElementById('previewModal');
      if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
      }
    }

    function sendClientEmail() {
      closePreview();
      const to = document.getElementById('to').value.trim();
      const cc = document.getElementById('cc').value.trim();
      const subject = document.getElementById('subject').value.trim();
      const body = document.getElementById('body').value;
      var sendBtn = document.getElementById('sendEmailBtn');
      var cs = document.getElementById('confirmSection');
      var notif = document.getElementById('confirmNotification');
      var label = document.getElementById('confirmSendLabel');
      var hint = document.getElementById('sendHint');
      var confirmBtn = document.getElementById('confirmSendBtn');
      if (sendBtn) sendBtn.disabled = true;
      if (confirmBtn) confirmBtn.disabled = true;
      
      if (!to) {
        alert('宛先を入力してください');
        if (sendBtn) sendBtn.disabled = false;
        return;
      }
      
      if (!subject) {
        alert('件名を入力してください');
        if (sendBtn) sendBtn.disabled = false;
        return;
      }
      
      var token = window.location.pathname.split('/')[2];
      fetch('/review/' + token + '/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: to, cc: cc, subject: subject, body: body })
      })
        .then(function(res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function() {
          if (cs) cs.style.display = 'block';
          if (label) label.textContent = '发送成功，正在记录发送确认。';
          if (notif) {
            notif.className = 'confirm-notification';
            notif.textContent = '';
          }
          confirmEmailSent();
        })
        .catch(function(err) {
          if (sendBtn) sendBtn.disabled = false;
          if (confirmBtn) confirmBtn.disabled = false;
          if (cs) cs.style.display = 'block';
          if (label) label.textContent = '发送失败，未记录确认。';
          if (hint) hint.textContent = '发送失败，请检查配置后重试';
          if (notif) {
            notif.className = 'confirm-notification error';
            notif.textContent = '发送失败: ' + err.message;
          }
        });
    }

    function confirmEmailSent() {
      var label = document.getElementById('confirmSendLabel');
      var notif = document.getElementById('confirmNotification');
      if (!label || !notif) return;

      label.textContent = '确认中...';

      var token = window.location.pathname.split('/')[2];
      fetch('/review/' + token + '/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
        .then(function(res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function() {
          label.textContent = '✓ 发送确认已记录';
          notif.className = 'confirm-notification success';
          notif.textContent = '发送确认已记录，感谢！';
          fetchSendStatus();
        })
        .catch(function(err) {
          label.textContent = '确认失败';
          notif.className = 'confirm-notification error';
          notif.textContent = '确认失败: ' + err.message;
        });
    }

    function fetchSendStatus() {
      var token = window.location.pathname.split('/')[2];
      var sendBtn = document.getElementById('sendEmailBtn');
      var confirmBtn = document.getElementById('confirmSendBtn');
      var cs = document.getElementById('confirmSection');
      var label = document.getElementById('confirmSendLabel');
      var notif = document.getElementById('confirmNotification');
      var hint = document.getElementById('sendHint');

      fetch('/review/' + token + '/status')
        .then(function(res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function(data) {
          if (!data || !data.sent) return;
          if (sendBtn) sendBtn.disabled = true;
          if (confirmBtn) confirmBtn.disabled = true;
          if (hint) hint.textContent = '邮件已发送，发送按钮已锁定';
          if (cs) cs.style.display = 'block';
          var sentAt = data.sentAt ? new Date(data.sentAt) : null;
          var sentAtText = sentAt
            ? sentAt.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
            : '--';
          var operator = data.operator || 'Unknown';
          if (label) label.textContent = '✓ 已发送';
          if (notif) {
            notif.className = 'confirm-notification success';
            notif.textContent = '发送人: ' + operator + ' / 发送时间: ' + sentAtText;
          }
        })
        .catch(function() {});
    }

    fetchSendStatus();
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
