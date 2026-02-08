/**
 * Login Page
 * Simple 6-digit code input for authentication
 */

export interface LoginPageOptions {
  error?: string;
  redirect?: string;
}

export function generateLoginPage(baseUrl: string, options: LoginPageOptions = {}): string {
  const { error, redirect } = options;
  const redirectParam = redirect ? `?redirect=${encodeURIComponent(redirect)}` : '';
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>登录 - Jira Monitor</title>
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
      --bg-input: #0f0f16;
      --border: rgba(255, 255, 255, 0.06);
      --border-light: rgba(255, 255, 255, 0.12);
      --border-focus: rgba(139, 92, 246, 0.5);
      --text-primary: #f0f0f5;
      --text-secondary: #a0a0b0;
      --text-muted: #606070;
      --accent-green: #10b981;
      --accent-blue: #3b82f6;
      --accent-purple: #8b5cf6;
      --accent-red: #ef4444;
    }

    :root[data-theme="light"] {
      --bg-primary: #f6f6f9;
      --bg-secondary: #ffffff;
      --bg-tertiary: #f1f2f6;
      --bg-input: #f7f7fb;
      --border: rgba(15, 23, 42, 0.08);
      --border-light: rgba(15, 23, 42, 0.16);
      --border-focus: rgba(59, 130, 246, 0.4);
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --text-muted: #7b8794;
    }
    
    body {
      font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    /* Background */
    .bg-effects {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 0;
      background: 
        radial-gradient(ellipse 50% 50% at 50% 0%, rgba(139, 92, 246, 0.1), transparent),
        radial-gradient(ellipse 40% 40% at 50% 100%, rgba(59, 130, 246, 0.08), transparent);
    }
    
    /* Login card */
    .login-card {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 420px;
      margin: 24px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 40px 36px;
      animation: fadeSlideUp 0.5s ease;
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
    
    /* Header */
    .login-header {
      text-align: center;
      margin-bottom: 40px;
    }
    
    .login-icon {
      width: 72px;
      height: 72px;
      background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue));
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      box-shadow: 0 8px 32px rgba(139, 92, 246, 0.3);
    }
    
    .login-icon svg {
      width: 36px;
      height: 36px;
      color: white;
    }
    
    .login-header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    
    .login-header p {
      font-size: 15px;
      color: var(--text-secondary);
    }
    
    /* Error message */
    .error-message {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 28px;
      display: flex;
      align-items: center;
      gap: 12px;
      animation: shake 0.4s ease;
    }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-6px); }
      40%, 80% { transform: translateX(6px); }
    }
    
    .error-message svg {
      width: 20px;
      height: 20px;
      color: var(--accent-red);
      flex-shrink: 0;
    }
    
    .error-message span {
      font-size: 14px;
      color: var(--accent-red);
    }
    
    /* Code input */
    .code-input-wrapper {
      margin-bottom: 32px;
    }
    
    .code-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      margin-bottom: 12px;
      text-align: center;
    }
    
    .code-inputs {
      display: flex;
      justify-content: center;
      gap: 10px;
    }
    
    .code-input {
      width: 48px;
      height: 52px;
      background: var(--bg-input);
      border: 2px solid var(--border);
      border-radius: 10px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 24px;
      font-weight: 600;
      color: var(--text-primary);
      text-align: center;
      transition: all 0.2s;
      -moz-appearance: textfield;
    }
    
    .code-input::-webkit-outer-spin-button,
    .code-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    
    .code-input:focus {
      outline: none;
      border-color: var(--accent-purple);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
    }
    
    .code-input.filled {
      border-color: var(--accent-green);
      background: rgba(16, 185, 129, 0.05);
    }
    
    .code-input.error {
      border-color: var(--accent-red);
      animation: shake 0.4s ease;
    }
    
    /* Submit button */
    .submit-btn {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue));
      border: none;
      border-radius: 10px;
      color: white;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    
    .submit-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(139, 92, 246, 0.35);
    }
    
    .submit-btn:active:not(:disabled) {
      transform: translateY(0);
    }
    
    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .submit-btn svg {
      width: 20px;
      height: 20px;
    }
    
    .submit-btn .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* Footer */
    .login-footer {
      margin-top: 32px;
      text-align: center;
    }
    
    .login-footer p {
      font-size: 13px;
      color: var(--text-muted);
    }
    
    .login-footer a {
      color: var(--accent-purple);
      text-decoration: none;
      transition: color 0.2s;
    }
    
    .login-footer a:hover {
      color: var(--accent-blue);
    }
    
    /* Back link */
    .back-link {
      position: absolute;
      top: 24px;
      left: 24px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--text-muted);
      text-decoration: none;
      transition: color 0.2s;
    }
    
    .back-link:hover {
      color: var(--text-primary);
    }
    
    .back-link svg {
      width: 18px;
      height: 18px;
    }

    .theme-toggle {
      position: fixed;
      top: 20px;
      right: 20px;
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
      z-index: 2;
    }

    .theme-toggle-floating {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2;
    }

    .theme-toggle:hover {
      background: var(--bg-secondary);
      color: var(--text-primary);
      border-color: var(--border-light);
    }

    .theme-toggle .theme-icon svg {
      width: 16px;
      height: 16px;
    }
    
    /* Responsive */
    @media (max-width: 480px) {
      .login-card {
        padding: 40px 28px;
        margin: 16px;
      }
      
      .code-input {
        width: 42px;
        height: 52px;
        font-size: 20px;
      }
      
      .code-inputs {
        gap: 8px;
      }
    }
  </style>
</head>
<body>
  <div class="bg-effects"></div>

  <button class="theme-toggle theme-toggle-floating" id="themeToggle" type="button" title="切换主题">
    <span class="theme-icon" aria-hidden="true"></span>
    <span class="theme-label">暗色</span>
  </button>
  
  <div class="login-card">
    <a href="/" class="back-link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H5"/>
        <path d="m12 19-7-7 7-7"/>
      </svg>
      返回首页
    </a>
    
    <div class="login-header">
      <div class="login-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <h1>系统登录</h1>
      <p>请输入 6 位数字授权码以继续</p>
    </div>
    
    ${error ? `
    <div class="error-message">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>${error}</span>
    </div>
    ` : ''}
    
    <form id="loginForm" action="/login${redirectParam}" method="POST">
      <div class="code-input-wrapper">
        <label class="code-label">授权码</label>
        <div class="code-inputs">
          <input type="text" class="code-input" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off" data-index="0" />
          <input type="text" class="code-input" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off" data-index="1" />
          <input type="text" class="code-input" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off" data-index="2" />
          <input type="text" class="code-input" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off" data-index="3" />
          <input type="text" class="code-input" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off" data-index="4" />
          <input type="text" class="code-input" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off" data-index="5" />
        </div>
        <input type="hidden" name="code" id="codeInput" />
      </div>
      
      <button type="submit" class="submit-btn" id="submitBtn" disabled>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
          <polyline points="10 17 15 12 10 7"/>
          <line x1="15" y1="12" x2="3" y2="12"/>
        </svg>
        <span>登 录</span>
      </button>
    </form>
    
    <div class="login-footer">
      <p>没有授权码？请联系管理员</p>
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

    const inputs = document.querySelectorAll('.code-input');
    const codeInput = document.getElementById('codeInput');
    const submitBtn = document.getElementById('submitBtn');
    const form = document.getElementById('loginForm');
    
    // Focus first input on load
    inputs[0].focus();
    
    // Update hidden input and button state
    function updateCode() {
      const code = Array.from(inputs).map(i => i.value).join('');
      codeInput.value = code;
      submitBtn.disabled = code.length !== 6;
      
      // Update filled state
      inputs.forEach(input => {
        if (input.value) {
          input.classList.add('filled');
        } else {
          input.classList.remove('filled');
        }
      });
    }
    
    // Handle input
    inputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        const value = e.target.value;
        
        // Only allow digits
        if (!/^\\d*$/.test(value)) {
          input.value = '';
          return;
        }
        
        // Move to next input
        if (value && index < 5) {
          inputs[index + 1].focus();
        }
        
        updateCode();
      });
      
      // Handle backspace
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && index > 0) {
          inputs[index - 1].focus();
        }
        
        // Handle paste
        if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          navigator.clipboard.readText().then(text => {
            const digits = text.replace(/\\D/g, '').slice(0, 6);
            digits.split('').forEach((digit, i) => {
              if (inputs[i]) {
                inputs[i].value = digit;
              }
            });
            updateCode();
            if (digits.length === 6) {
              inputs[5].focus();
            } else if (inputs[digits.length]) {
              inputs[digits.length].focus();
            }
          });
        }
        
        // Auto submit on Enter if code is complete
        if (e.key === 'Enter' && codeInput.value.length === 6) {
          form.submit();
        }
      });
      
      // Handle focus
      input.addEventListener('focus', () => {
        input.select();
      });
    });
    
    // Handle form submit
    form.addEventListener('submit', (e) => {
      if (codeInput.value.length !== 6) {
        e.preventDefault();
        return;
      }
      
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<div class="spinner"></div><span>验证中...</span>';
    });
    
    // Handle paste on document
    document.addEventListener('paste', (e) => {
      if (document.activeElement.classList.contains('code-input')) return;
      
      const text = e.clipboardData.getData('text');
      const digits = text.replace(/\\D/g, '').slice(0, 6);
      if (digits.length > 0) {
        digits.split('').forEach((digit, i) => {
          if (inputs[i]) {
            inputs[i].value = digit;
          }
        });
        updateCode();
        if (digits.length === 6) {
          inputs[5].focus();
        } else if (inputs[digits.length]) {
          inputs[digits.length].focus();
        }
      }
    });
  </script>
</body>
</html>`;
}
