/**
 * Home Page - Entry point with two main sections
 * 1. Configuration - Manage settings
 * 2. API Documentation - View API docs
 */

export function generateHomePage(baseUrl: string, brandName?: string, brandUrl?: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jira Monitor - 任务监控系统</title>
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
      --bg-card: #14141e;
      --border: rgba(255, 255, 255, 0.06);
      --border-light: rgba(255, 255, 255, 0.12);
      --text-primary: #f0f0f5;
      --text-secondary: #a0a0b0;
      --text-muted: #606070;
      --accent-green: #10b981;
      --accent-blue: #3b82f6;
      --accent-purple: #8b5cf6;
      --accent-orange: #f59e0b;
      --accent-pink: #ec4899;
      --accent-cyan: #06b6d4;
    }

    :root[data-theme="light"] {
      --bg-primary: #f6f6f9;
      --bg-secondary: #ffffff;
      --bg-tertiary: #f1f2f6;
      --bg-card: #ffffff;
      --border: rgba(15, 23, 42, 0.08);
      --border-light: rgba(15, 23, 42, 0.16);
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --text-muted: #7b8794;
    }
    
    html {
      scroll-behavior: smooth;
    }
    
    body {
      font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
      overflow-x: hidden;
    }
    
    /* Animated background */
    .bg-effects {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
    }
    
    .bg-gradient {
      position: absolute;
      top: -50%;
      left: -50%;
      right: -50%;
      bottom: -50%;
      background: 
        radial-gradient(ellipse 40% 30% at 70% 20%, rgba(139, 92, 246, 0.12), transparent),
        radial-gradient(ellipse 50% 40% at 30% 80%, rgba(59, 130, 246, 0.08), transparent),
        radial-gradient(ellipse 30% 25% at 80% 70%, rgba(236, 72, 153, 0.06), transparent);
      animation: bgMove 20s ease-in-out infinite;
    }
    
    @keyframes bgMove {
      0%, 100% { transform: translate(0, 0) rotate(0deg); }
      33% { transform: translate(2%, 1%) rotate(1deg); }
      66% { transform: translate(-1%, 2%) rotate(-1deg); }
    }
    
    .grid-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: 
        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size: 60px 60px;
      mask-image: radial-gradient(ellipse 80% 50% at 50% 0%, black, transparent);
    }
    
    .container {
      position: relative;
      z-index: 1;
      max-width: 1100px;
      margin: 0 auto;
      padding: 60px 24px 80px;
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

    .theme-toggle-floating {
      position: fixed;
      top: 20px;
      right: 20px;
    }
    
    /* Header */
    .header {
      text-align: center;
      margin-bottom: 72px;
      animation: fadeSlideDown 0.6s ease;
    }
    
    .logo {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue));
      border-radius: 24px;
      margin-bottom: 28px;
      box-shadow: 
        0 8px 32px rgba(139, 92, 246, 0.3),
        0 0 0 1px rgba(255, 255, 255, 0.1);
      animation: float 6s ease-in-out infinite;
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    
    .logo svg {
      width: 40px;
      height: 40px;
      color: white;
    }
    
    .header h1 {
      font-size: 48px;
      font-weight: 700;
      letter-spacing: -1.5px;
      margin-bottom: 16px;
      background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .header p {
      font-size: 18px;
      color: var(--text-secondary);
      max-width: 480px;
      margin: 0 auto;
    }
    
    /* Status bar */
    .status-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 24px;
      margin-top: 32px;
      padding: 14px 28px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 100px;
      display: inline-flex;
    }
    
    .status-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    
    .status-dot.online {
      background: var(--accent-green);
      box-shadow: 0 0 8px var(--accent-green);
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .status-divider {
      width: 1px;
      height: 20px;
      background: var(--border-light);
    }
    
    .status-item code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      padding: 4px 10px;
      background: var(--bg-tertiary);
      border-radius: 6px;
      color: var(--accent-blue);
    }
    
    /* Main cards */
    .cards {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
      margin-bottom: 64px;
    }
    
    .card {
      position: relative;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 32px;
      text-decoration: none;
      color: inherit;
      overflow: hidden;
      transition: all 0.25s ease;
      animation: fadeSlideUp 0.6s ease backwards;
    }
    
    .card:nth-child(1) { animation-delay: 0.1s; }
    .card:nth-child(2) { animation-delay: 0.2s; }
    
    .card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--card-gradient);
      opacity: 0;
      transition: opacity 0.2s;
    }
    
    .card::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--card-gradient);
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 0;
    }
    
    .card:hover {
      border-color: var(--border-light);
      transform: translateY(-3px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }
    
    .card:hover::before {
      opacity: 1;
    }
    
    .card:hover::after {
      opacity: 0.03;
    }
    
    .card-content {
      position: relative;
      z-index: 1;
    }
    
    .card.config {
      --card-gradient: linear-gradient(135deg, var(--accent-orange), var(--accent-pink));
    }
    
    .card.docs {
      --card-gradient: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
    }
    
    .card-icon {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
      transition: transform 0.2s;
    }
    
    .card:hover .card-icon {
      transform: scale(1.05);
    }
    
    .card.config .card-icon {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(236, 72, 153, 0.15));
      color: var(--accent-orange);
    }
    
    .card.docs .card-icon {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15));
      color: var(--accent-blue);
    }
    
    .card-icon svg {
      width: 32px;
      height: 32px;
    }
    
    .card h2 {
      font-size: 26px;
      font-weight: 600;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
    }
    
    .card p {
      font-size: 15px;
      color: var(--text-secondary);
      line-height: 1.7;
      margin-bottom: 28px;
    }
    
    .card-features {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 28px;
    }
    
    .card-feature {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: var(--bg-tertiary);
      border-radius: 10px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    .card-feature svg {
      width: 16px;
      height: 16px;
      color: var(--text-muted);
    }
    
    .card-action {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-size: 15px;
      font-weight: 500;
      color: var(--text-primary);
      transition: gap 0.2s;
    }
    
    .card:hover .card-action {
      gap: 14px;
    }
    
    .card-action svg {
      width: 20px;
      height: 20px;
      transition: transform 0.2s;
    }
    
    .card:hover .card-action svg {
      transform: translateX(4px);
    }
    
    /* Schedule section */
    .schedule-section {
      margin-bottom: 64px;
      animation: fadeSlideUp 0.6s ease backwards;
      animation-delay: 0.3s;
    }
    
    .section-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .section-icon {
      width: 44px;
      height: 44px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
    }
    
    .section-icon svg {
      width: 22px;
      height: 22px;
    }
    
    .section-header h3 {
      font-size: 20px;
      font-weight: 600;
    }
    
    .schedule-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    
    .schedule-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 22px;
      display: flex;
      align-items: flex-start;
      gap: 18px;
      transition: all 0.2s;
    }
    
    .schedule-card:hover {
      border-color: var(--border-light);
    }
    
    .schedule-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    
    .schedule-card.slack .schedule-icon {
      background: rgba(139, 92, 246, 0.12);
      color: var(--accent-purple);
    }
    
    .schedule-card.email .schedule-icon {
      background: rgba(245, 158, 11, 0.12);
      color: var(--accent-orange);
    }
    
    .schedule-icon svg {
      width: 24px;
      height: 24px;
    }
    
    .schedule-info h4 {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .schedule-info p {
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 10px;
    }
    
    .schedule-time {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      padding: 4px 8px;
      background: var(--bg-tertiary);
      border-radius: 8px;
      color: var(--text-muted);
    }
    
    .schedule-time strong {
      color: var(--text-primary);
      font-weight: 600;
    }
    
    /* Footer */
    .footer {
      text-align: center;
      padding-top: 32px;
      border-top: 1px solid var(--border);
      animation: fadeIn 0.6s ease backwards;
      animation-delay: 0.4s;
    }
    
    .footer p {
      font-size: 13px;
      color: var(--text-muted);
    }
    
    .footer a {
      color: var(--text-secondary);
      text-decoration: none;
      transition: color 0.2s;
    }
    
    .footer a:hover {
      color: var(--text-primary);
    }
    
    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes fadeSlideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes fadeSlideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .container {
        padding: 40px 16px 60px;
      }
      
      .header h1 {
        font-size: 32px;
      }
      
      .header p {
        font-size: 16px;
      }
      
      .status-bar {
        flex-direction: column;
        gap: 12px;
        padding: 16px 24px;
        border-radius: 16px;
      }
      
      .status-divider {
        width: 100%;
        height: 1px;
      }
      
      .cards {
        grid-template-columns: 1fr;
      }
      
      .card {
        padding: 28px;
      }
      
      .schedule-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="bg-effects">
    <div class="bg-gradient"></div>
    <div class="grid-overlay"></div>
  </div>

  <button class="theme-toggle theme-toggle-floating" id="themeToggle" type="button" title="切换主题">
    <span class="theme-icon" aria-hidden="true"></span>
    <span class="theme-label">暗色</span>
  </button>
  
  <div class="container">
    <header class="header">
      <div class="logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <h1>Jira Monitor</h1>
      <p>监控 Jira 子任务完成情况，自动发送邮件报告和 Slack 提醒</p>
      
      <div class="status-bar">
        <div class="status-item">
          <span class="status-dot online"></span>
          <span>系统运行中</span>
        </div>
        <div class="status-divider"></div>
        <div class="status-item">
          <span>Base URL:</span>
          <code>${baseUrl}</code>
        </div>
      </div>
    </header>
    
    <div class="cards">
      <a href="/config" class="card config">
        <div class="card-content">
          <div class="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v10"/>
              <path d="m4.22 4.22 4.24 4.24m7.08 7.08 4.24 4.24"/>
              <path d="M1 12h6m6 0h10"/>
              <path d="m4.22 19.78 4.24-4.24m7.08-7.08 4.24-4.24"/>
            </svg>
          </div>
          <h2>系统配置</h2>
          <p>管理定时任务时间、邮件收件人、抄送人、审核人等系统设置</p>
          <div class="card-features">
            <span class="card-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              定时任务
            </span>
            <span class="card-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              收件人
            </span>
            <span class="card-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              权限管理
            </span>
          </div>
          <span class="card-action">
            进入配置
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14"/>
              <path d="m12 5 7 7-7 7"/>
            </svg>
          </span>
        </div>
      </a>
      
      <a href="/docs" class="card docs">
        <div class="card-content">
          <div class="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <path d="M14 2v6h6"/>
              <path d="M16 13H8"/>
              <path d="M16 17H8"/>
              <path d="M10 9H8"/>
            </svg>
          </div>
          <h2>API 文档</h2>
          <p>查看所有 API 端点、参数说明、请求示例和响应格式</p>
          <div class="card-features">
            <span class="card-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="4 17 10 11 4 5"/>
                <line x1="12" y1="19" x2="20" y2="19"/>
              </svg>
              端点列表
            </span>
            <span class="card-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              </svg>
              请求示例
            </span>
            <span class="card-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              使用指南
            </span>
          </div>
          <span class="card-action">
            查看文档
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14"/>
              <path d="m12 5 7 7-7 7"/>
            </svg>
          </span>
        </div>
      </a>
    </div>
    
    <section class="schedule-section">
      <div class="section-header">
        <div class="section-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </div>
        <h3>定时任务</h3>
      </div>
      
      <div class="schedule-grid">
        <div class="schedule-card slack">
          <div class="schedule-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="13" y="2" width="3" height="8" rx="1.5"/>
              <path d="M19 8.5V10h1.5A1.5 1.5 0 1 0 19 8.5"/>
              <rect x="8" y="14" width="3" height="8" rx="1.5"/>
              <path d="M5 15.5V14H3.5A1.5 1.5 0 1 0 5 15.5"/>
            </svg>
          </div>
          <div class="schedule-info">
            <h4>Slack 未完成任务提醒</h4>
            <p>发送 @channel 通知到 Slack 频道</p>
            <div class="schedule-time">
              <strong>18:35</strong> JST · 周一至周五
            </div>
          </div>
        </div>
        
        <div class="schedule-card email">
          <div class="schedule-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>
          <div class="schedule-info">
            <h4>每日完成任务邮件报告</h4>
            <p>汇总当日完成任务并生成报告</p>
            <div class="schedule-time">
              <strong>18:30</strong> JST · 周一至周五
            </div>
          </div>
        </div>
      </div>
    </section>
    
    <footer class="footer">
        <p>Powered by <a href="https://workers.cloudflare.com" target="_blank">Cloudflare Workers</a>${brandName && brandUrl ? ` · <a href="${brandUrl}" target="_blank">${brandName}</a>` : ''}</p>
    </footer>
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
