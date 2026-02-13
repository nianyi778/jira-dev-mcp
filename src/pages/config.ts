/**
 * Configuration Page
 * Manage system settings: feature toggles, schedule times, recipients, Slack settings
 */

export interface SystemConfig {
  // Feature toggles
  featureEmailReport: boolean;
  featureSlackReminder: boolean;
  
  // Schedule settings
  slackCronHour: number;
  slackCronMinute: number;
  emailCronHour: number;
  emailCronMinute: number;
  
  // Email Recipients
  internalEmail: string;
  defaultClientEmail: string;
  defaultCcEmail: string;
  
  // Slack settings
  slackChannelName: string;
  slackWebhookConfigured: boolean;
  
  // Jira settings
  parentIssues: string;
  jiraBaseUrl: string;
  
  // Other
  timezone: string;
  reviewTokenTtl: number;
}

/**
 * Config input for page generation (passed from index.ts)
 */
export interface ConfigPageInput {
  JIRA_BASE_URL: string;
  TIMEZONE: string;
  WORKER_BASE_URL: string;
  PARENT_ISSUES: string;
  DRY_RUN: string;
  INTERNAL_EMAIL: string;
  DEFAULT_CLIENT_EMAIL: string;
  DEFAULT_CC_EMAIL: string;
  REVIEW_TOKEN_TTL: string;
  FEATURE_EMAIL_REPORT: string;
  FEATURE_SLACK_REMINDER: string;
  SLACK_CHANNEL_NAME: string;
  SLACK_WEBHOOK_URL?: string;
  USER_NOTE?: string;
  IS_SUPER_ADMIN?: boolean;
}

/**
 * Get current config from input
 */
export function getCurrentConfig(input: ConfigPageInput): SystemConfig {
  return {
    featureEmailReport: input.FEATURE_EMAIL_REPORT !== 'false',
    featureSlackReminder: input.FEATURE_SLACK_REMINDER !== 'false',
    slackCronHour: 18,
    slackCronMinute: 35,
    emailCronHour: 18,
    emailCronMinute: 30,
    internalEmail: input.INTERNAL_EMAIL || '',
    defaultClientEmail: input.DEFAULT_CLIENT_EMAIL || '',
    defaultCcEmail: input.DEFAULT_CC_EMAIL || '',
    slackChannelName: input.SLACK_CHANNEL_NAME || '',
    slackWebhookConfigured: !!input.SLACK_WEBHOOK_URL,
    parentIssues: input.PARENT_ISSUES || '',
    jiraBaseUrl: input.JIRA_BASE_URL || '',
    timezone: input.TIMEZONE || 'Asia/Tokyo',
    reviewTokenTtl: parseInt(input.REVIEW_TOKEN_TTL || '86400', 10),
  };
}

/**
 * Generate the configuration page HTML
 */
export function generateConfigPage(input: ConfigPageInput, baseUrl: string): string {
  const config = getCurrentConfig(input);
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>系统配置 - Jira Monitor</title>
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
      --bg-hover: #1e1e2a;
      --border: rgba(255, 255, 255, 0.06);
      --border-light: rgba(255, 255, 255, 0.12);
      --border-focus: rgba(139, 92, 246, 0.5);
      --text-primary: #f0f0f5;
      --text-secondary: #a0a0b0;
      --text-muted: #606070;
      --accent-green: #10b981;
      --accent-blue: #3b82f6;
      --accent-purple: #8b5cf6;
      --accent-orange: #f59e0b;
      --accent-pink: #ec4899;
      --accent-red: #ef4444;
    }

    :root[data-theme="light"] {
      --bg-primary: #f6f6f9;
      --bg-secondary: #ffffff;
      --bg-tertiary: #f1f2f6;
      --bg-input: #f7f7fb;
      --bg-hover: #eceef4;
      --border: rgba(15, 23, 42, 0.08);
      --border-light: rgba(15, 23, 42, 0.16);
      --border-focus: rgba(59, 130, 246, 0.4);
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --text-muted: #7b8794;
    }

    @media (prefers-color-scheme: light) {
      :root:not([data-theme]) {
        --bg-primary: #f6f6f9;
        --bg-secondary: #ffffff;
        --bg-tertiary: #f1f2f6;
        --bg-input: #f7f7fb;
        --bg-hover: #eceef4;
        --border: rgba(15, 23, 42, 0.08);
        --border-light: rgba(15, 23, 42, 0.16);
        --border-focus: rgba(59, 130, 246, 0.4);
        --text-primary: #0f172a;
        --text-secondary: #475569;
        --text-muted: #7b8794;
      }
    }
    
    body {
      font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
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
        radial-gradient(ellipse 50% 30% at 20% 10%, rgba(245, 158, 11, 0.08), transparent),
        radial-gradient(ellipse 40% 30% at 80% 90%, rgba(236, 72, 153, 0.06), transparent);
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
      background: var(--bg-tertiary);
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
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }

    .nav-item:hover .nav-icon {
      color: var(--accent);
    }

    .nav-item.active {
      background: var(--bg-hover);
      color: var(--text-primary);
      border: 1px solid var(--border-light);
    }

    .nav-item.active .nav-icon {
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
    
    .sidebar-footer {
      padding: 12px 16px 20px;
      border-top: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .logout-link {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 10px;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s;
      width: 100%;
      white-space: nowrap;
      height: 40px;
    }

    .logout-link svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .logout-link:hover {
      background: rgba(239, 68, 68, 0.08);
      border-color: rgba(239, 68, 68, 0.3);
      color: var(--accent-red);
    }
    
    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 10px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    .user-info svg {
      width: 16px;
      height: 16px;
      color: var(--accent-green);
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
      width: 100%;
      justify-content: center;
      white-space: nowrap;
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

    .theme-toggle .theme-label {
      white-space: nowrap;
    }

    
    .save-btn {
      padding: 10px 24px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text-muted);
      font-size: 14px;
      font-weight: 500;
      cursor: not-allowed;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .save-btn.active {
      background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue));
      border: none;
      color: white;
      cursor: pointer;
    }
    
    .save-btn.active:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
    }
    
    .save-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
    
    .save-btn svg {
      width: 18px;
      height: 18px;
    }
    
    .logout-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text-muted);
      text-decoration: none;
      transition: all 0.2s;
    }
    
    .logout-btn:hover {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.3);
      color: var(--accent-red);
    }
    
    .logout-btn svg {
      width: 18px;
      height: 18px;
    }
    
    /* Main content */
    .main {
      flex: 1;
      margin-left: 280px;
      padding: 40px 60px 80px;
      max-width: 960px;
    }
    
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 32px;
      animation: fadeIn 0.5s ease;
    }
    
    .page-title h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    
    .page-title p {
      font-size: 14px;
      color: var(--text-secondary);
    }
    
    .page-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    
    /* Section */
    .section {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 32px;
      margin-bottom: 24px;
      animation: fadeSlideUp 0.5s ease backwards;
    }

    .config-section {
      display: none;
    }

    #feature {
      display: block;
    }

    .config-section:target {
      display: block;
    }

    :root:has(.config-section:target:not(#feature)) #feature {
      display: none;
    }
    
    .section:nth-child(1) { animation-delay: 0.05s; }
    .section:nth-child(2) { animation-delay: 0.1s; }
    .section:nth-child(3) { animation-delay: 0.15s; }
    .section:nth-child(4) { animation-delay: 0.2s; }
    .section:nth-child(5) { animation-delay: 0.25s; }
    .section:nth-child(6) { animation-delay: 0.3s; }
    
    .section-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
    }
    
    .section-icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    
    .section-icon.feature {
      background: rgba(16, 185, 129, 0.12);
      color: var(--accent-green);
    }
    
    .section-icon.schedule {
      background: rgba(139, 92, 246, 0.12);
      color: var(--accent-purple);
    }
    
    .section-icon.email {
      background: rgba(245, 158, 11, 0.12);
      color: var(--accent-orange);
    }
    
    .section-icon.slack {
      background: rgba(236, 72, 153, 0.12);
      color: var(--accent-pink);
    }
    
    .section-icon.jira {
      background: rgba(59, 130, 246, 0.12);
      color: var(--accent-blue);
    }
    
    .section-icon.other {
      background: rgba(139, 92, 246, 0.12);
      color: var(--accent-purple);
    }
    
    .section-icon svg {
      width: 24px;
      height: 24px;
    }
    
    .section-info {
      flex: 1;
    }
    
    .section-info h2 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .section-info p {
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    /* Form elements */
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .form-group.full-width {
      grid-column: 1 / -1;
    }
    
    .form-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .form-label .required {
      color: var(--accent-red);
    }
    
    .form-input {
      padding: 12px 16px;
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text-primary);
      font-size: 14px;
      font-family: inherit;
      transition: all 0.2s;
    }
    
    .form-input:focus {
      outline: none;
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    }
    
    .form-input::placeholder {
      color: var(--text-muted);
    }
    
    .form-input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .form-input.mono {
      font-family: 'JetBrains Mono', monospace;
    }
    
    .form-hint {
      font-size: 12px;
      color: var(--text-muted);
    }
    
    /* Toggle Switch */
    .toggle-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .toggle-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: var(--bg-tertiary);
      border-radius: 14px;
      transition: all 0.2s;
    }
    
    .toggle-item:hover {
      background: var(--bg-hover, #1e1e2a);
    }
    
    .toggle-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    
    .toggle-icon.email {
      background: rgba(245, 158, 11, 0.15);
      color: var(--accent-orange);
    }
    
    .toggle-icon.slack {
      background: rgba(139, 92, 246, 0.15);
      color: var(--accent-purple);
    }
    
    .toggle-icon svg {
      width: 22px;
      height: 22px;
    }
    
    .toggle-info {
      flex: 1;
    }
    
    .toggle-info h3 {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .toggle-info p {
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    .toggle-switch {
      position: relative;
      width: 52px;
      height: 28px;
      flex-shrink: 0;
    }
    
    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 14px;
      transition: all 0.3s;
    }
    
    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 3px;
      bottom: 3px;
      background: var(--text-muted);
      border-radius: 50%;
      transition: all 0.3s;
    }
    
    .toggle-switch input:checked + .toggle-slider {
      background: var(--accent-green);
      border-color: var(--accent-green);
    }
    
    .toggle-switch input:checked + .toggle-slider:before {
      transform: translateX(24px);
      background: white;
    }
    
    .toggle-status {
      font-size: 12px;
      font-weight: 500;
      padding: 4px 10px;
      border-radius: 6px;
      margin-left: 12px;
    }
    
    .toggle-status.on {
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent-green);
    }
    
    .toggle-status.off {
      background: rgba(239, 68, 68, 0.15);
      color: var(--accent-red);
    }
    
    /* Time picker */
    .time-picker {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .time-picker input {
      width: 70px;
      text-align: center;
      font-family: 'JetBrains Mono', monospace;
    }
    
    .time-picker span {
      color: var(--text-muted);
      font-size: 18px;
    }
    
    .time-picker .tz {
      font-size: 13px;
      color: var(--text-muted);
      margin-left: 8px;
    }
    
    /* Status badge */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 6px;
      margin-left: auto;
    }
    
    .status-badge.success {
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent-green);
    }
    
    .status-badge.warning {
      background: rgba(245, 158, 11, 0.15);
      color: var(--accent-orange);
    }
    
    .status-badge.error {
      background: rgba(239, 68, 68, 0.15);
      color: var(--accent-red);
    }
    
    .status-badge svg {
      width: 14px;
      height: 14px;
    }
    
    /* Info box */
    .info-box {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.15);
      border-radius: 12px;
      margin-top: 16px;
    }
    
    .info-box.warning {
      background: rgba(245, 158, 11, 0.08);
      border-color: rgba(245, 158, 11, 0.15);
    }
    
    .info-box svg {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      color: var(--accent-blue);
    }
    
    .info-box.warning svg {
      color: var(--accent-orange);
    }
    
    .info-box p {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.6;
    }
    
    .info-box code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      padding: 2px 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
    
    /* Token management */
    .token-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }

    .token-count {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .token-count span {
      font-weight: 600;
      color: var(--text-primary);
      margin-left: 6px;
    }

    .token-create-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: linear-gradient(135deg, var(--accent-red), var(--accent-orange));
      border: none;
      border-radius: 10px;
      color: white;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .token-create-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(239, 68, 68, 0.3);
    }

    .email-send-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: linear-gradient(135deg, var(--accent-orange), #f97316);
      border: none;
      border-radius: 10px;
      color: white;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .email-send-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(245, 158, 11, 0.3);
    }

    .email-send-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .email-send-btn svg {
      width: 16px;
      height: 16px;
    }

    .email-logs-table-wrap {
      overflow-x: auto;
      margin-top: 16px;
    }

    .email-logs-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .email-logs-table th {
      text-align: left;
      padding: 10px 12px;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }

    .email-logs-table td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      color: var(--text-secondary);
    }

    .email-logs-table tr:hover td {
      background: var(--bg-tertiary);
    }

    .log-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .log-badge.auto {
      background: rgba(16, 185, 129, 0.12);
      color: var(--accent-green);
    }

    .log-badge.manual {
      background: rgba(59, 130, 246, 0.12);
      color: var(--accent-blue);
    }

    .log-badge.confirmed {
      background: rgba(6, 182, 212, 0.12);
      color: #06b6d4;
    }

    .log-badge.success {
      background: rgba(16, 185, 129, 0.12);
      color: var(--accent-green);
    }

    .log-badge.fail {
      background: rgba(239, 68, 68, 0.12);
      color: var(--accent-red);
    }

    .email-logs-loading,
    .email-logs-empty {
      text-align: center;
      padding: 32px 16px;
      color: var(--text-muted);
      font-size: 13px;
    }

    .email-logs-empty svg {
      width: 36px;
      height: 36px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    .token-loading,
    .token-empty {
      text-align: center;
      padding: 32px 16px;
      color: var(--text-muted);
      font-size: 13px;
    }

    .token-empty svg {
      width: 36px;
      height: 36px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    .token-table-wrap {
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
      background: var(--bg-primary);
    }

    .token-table {
      width: 100%;
      border-collapse: collapse;
    }

    .token-table th {
      text-align: left;
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-tertiary);
    }

    .token-table td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
      font-size: 13px;
      color: var(--text-secondary);
    }

    .token-table tr:last-child td {
      border-bottom: none;
    }

    .token-row:hover {
      background: var(--bg-secondary);
    }

    .token-row.expired {
      opacity: 0.6;
    }

    .token-row.disabled {
      opacity: 0.6;
    }

    .token-code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 2px;
      color: var(--accent-red);
      background: rgba(239, 68, 68, 0.1);
      padding: 6px 10px;
      border-radius: 8px;
    }

    .token-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .token-filters {
      display: inline-flex;
      gap: 8px;
      padding: 4px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 12px;
    }

    .token-filter-btn {
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-secondary);
      font-size: 12px;
      cursor: pointer;
    }

    .token-filter-btn.active {
      background: var(--bg-secondary);
      border-color: var(--border-light);
      color: var(--text-primary);
    }

    .token-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      margin-left: 8px;
      background: rgba(239, 68, 68, 0.12);
      color: var(--accent-red);
    }

    .log-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .log-filters {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }

    .log-actions {
      display: flex;
      gap: 10px;
    }

    .log-btn {
      padding: 10px 16px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }

    .log-btn.primary {
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-green));
      border: none;
      color: white;
    }

    .log-table-wrap {
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
      background: var(--bg-primary);
    }

    .log-table {
      width: 100%;
      border-collapse: collapse;
    }

    .log-table th {
      text-align: left;
      padding: 12px 14px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      background: var(--bg-tertiary);
      border-bottom: 1px solid var(--border);
    }

    .log-table td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
      font-size: 13px;
      color: var(--text-secondary);
      vertical-align: top;
    }

    .log-table tr:last-child td {
      border-bottom: none;
    }

    .log-empty {
      text-align: center;
      padding: 36px 0;
      color: var(--text-muted);
      font-size: 13px;
    }

    .token-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.2s;
    }

    .token-icon-btn:hover {
      border-color: var(--border-light);
      color: var(--text-primary);
      background: var(--bg-tertiary);
    }

    .token-icon-btn.danger:hover {
      color: var(--accent-red);
      border-color: rgba(239, 68, 68, 0.4);
      background: rgba(239, 68, 68, 0.08);
    }

    .token-icon-btn svg {
      width: 16px;
      height: 16px;
    }

    .token-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 15, 20, 0.6);
      backdrop-filter: blur(6px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1200;
    }

    .token-modal-overlay.show {
      display: flex;
    }

    .token-modal {
      width: 100%;
      max-width: 460px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 28px;
      animation: fadeSlideUp 0.3s ease;
    }

    .confirm-modal {
      width: 100%;
      max-width: 420px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 26px;
      text-align: center;
      animation: fadeSlideUp 0.3s ease;
    }

    .confirm-icon {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      background: rgba(239, 68, 68, 0.12);
      color: var(--accent-red);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }

    .confirm-icon svg {
      width: 26px;
      height: 26px;
    }

    .confirm-modal h3 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .confirm-modal p {
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 20px;
    }

    .confirm-actions {
      display: flex;
      gap: 12px;
    }

    .token-modal h3 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 6px;
    }

    .token-modal p {
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 20px;
    }

    .token-modal .form-group {
      margin-bottom: 16px;
    }

    .token-modal .form-label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }

    .token-modal .form-input {
      width: 100%;
      padding: 12px 14px;
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text-primary);
      font-size: 14px;
      transition: all 0.2s;
    }

    .token-modal .form-input:focus {
      outline: none;
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
    }

    .token-modal .form-hint {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 6px;
    }

    .token-modal-actions {
      display: flex;
      gap: 12px;
      margin-top: 22px;
    }

    .token-btn-secondary {
      flex: 1;
      padding: 10px 16px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .token-btn-secondary:hover {
      background: var(--bg-input);
      color: var(--text-primary);
    }

    .token-btn-primary {
      flex: 1;
      padding: 10px 16px;
      background: linear-gradient(135deg, var(--accent-red), var(--accent-orange));
      border: none;
      border-radius: 10px;
      color: white;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .token-btn-primary:hover {
      box-shadow: 0 6px 18px rgba(239, 68, 68, 0.3);
    }

    .token-btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      box-shadow: none;
    }

    .token-success {
      text-align: center;
      padding: 12px 8px;
    }

    .token-success .token-display {
      font-family: 'JetBrains Mono', monospace;
      font-size: 28px;
      font-weight: 600;
      letter-spacing: 6px;
      color: var(--accent-green);
      background: rgba(16, 185, 129, 0.1);
      padding: 16px 20px;
      border-radius: 12px;
      margin: 16px 0;
    }

    .token-success .hint {
      font-size: 12px;
      color: var(--text-muted);
    }
    
    /* Toast notification */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 14px 20px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s ease;
      z-index: 1000;
    }
    
    .toast.show {
      transform: translateY(0);
      opacity: 1;
    }
    
    .toast.success {
      border-color: rgba(16, 185, 129, 0.3);
    }
    
    .toast.error {
      border-color: rgba(239, 68, 68, 0.3);
    }
    
    .toast svg {
      width: 20px;
      height: 20px;
    }
    
    .toast.success svg {
      color: var(--accent-green);
    }
    
    .toast.error svg {
      color: var(--accent-red);
    }
    
    .toast span {
      font-size: 14px;
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
      
      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .log-filters {
        grid-template-columns: 1fr;
      }
    }
    
    @media (max-width: 640px) {
      .section {
        padding: 24px 20px;
      }
      
      .form-grid {
        grid-template-columns: 1fr;
      }
      
      .save-btn span {
        display: none;
      }
      
      .toggle-item {
        flex-wrap: wrap;
      }
      
      .toggle-info {
        flex: 1 1 calc(100% - 76px);
      }
    }
  </style>
</head>
<body>
  <div class="bg-effects"></div>
  
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
          <h1>系统配置</h1>
          <p>Jira Monitor</p>
        </div>
      </div>
      
      <nav class="nav">
        <div class="nav-label">Settings</div>
        <a href="#feature" class="nav-item" data-target="feature" style="--delay: 0.05s; --accent: var(--accent-green);">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
            </svg>
          </span>
          <span class="nav-text">功能开关</span>
        </a>
        <a href="#schedule" class="nav-item" data-target="schedule" style="--delay: 0.1s; --accent: var(--accent-purple);">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </span>
          <span class="nav-text">定时任务</span>
        </a>
        <a href="#slack" class="nav-item" data-target="slack" style="--delay: 0.15s; --accent: var(--accent-pink);">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="13" y="2" width="3" height="8" rx="1.5"/>
              <path d="M19 8.5V10h1.5A1.5 1.5 0 1 0 19 8.5"/>
              <rect x="8" y="14" width="3" height="8" rx="1.5"/>
              <path d="M5 15.5V14H3.5A1.5 1.5 0 1 0 5 15.5"/>
            </svg>
          </span>
          <span class="nav-text">Slack 设置</span>
        </a>
        <a href="#email" class="nav-item" data-target="email" style="--delay: 0.2s; --accent: var(--accent-orange);">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </span>
          <span class="nav-text">邮件收件人</span>
        </a>
        <a href="#email-logs" class="nav-item" data-target="email-logs" style="--delay: 0.25s; --accent: var(--accent-cyan);">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </span>
          <span class="nav-text">邮件发送记录</span>
        </a>
        <a href="#jira" class="nav-item" data-target="jira" style="--delay: 0.3s; --accent: var(--accent-blue);">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </span>
          <span class="nav-text">Jira 配置</span>
        </a>
        <a href="#other" class="nav-item" data-target="other" style="--delay: 0.35s; --accent: var(--accent-purple);">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </span>
          <span class="nav-text">其他设置</span>
        </a>
        ${input.IS_SUPER_ADMIN ? `
        <a href="#tokens" class="nav-item" data-target="tokens" style="--delay: 0.4s; --accent: var(--accent-red);">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </span>
          <span class="nav-text">授权码管理</span>
        </a>
        <a href="#logs" class="nav-item" data-target="logs" style="--delay: 0.45s; --accent: var(--accent-blue);">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 3v18h18"/>
              <path d="M7 15l4-4 4 3 5-6"/>
            </svg>
          </span>
          <span class="nav-text">访问日志</span>
        </a>
        ` : ''}
      </nav>
      
      <div class="sidebar-footer">
        <button class="theme-toggle" id="themeToggle" type="button" title="切换主题">
          <span class="theme-icon" aria-hidden="true"></span>
          <span class="theme-label">暗色</span>
        </button>
        <a href="/logout" class="logout-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          退出登录
        </a>
      </div>
    </aside>
    
    <main class="main">
      <div class="page-header">
        <div class="page-title">
          <h1>系统配置</h1>
          <p>管理功能开关、定时任务、收件人和其他设置</p>
        </div>
        <div class="page-actions">
          ${input.USER_NOTE ? `
          <div class="user-info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>${input.USER_NOTE}</span>
          </div>
          ` : ''}
          <button class="save-btn" onclick="saveConfig()" id="saveBtn" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            <span>保存配置</span>
          </button>
        </div>
      </div>
      
      <!-- Feature Toggles -->
      <div class="section config-section" id="feature">
      <div class="section-header">
        <div class="section-icon feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
          </svg>
        </div>
        <div class="section-info">
          <h2>功能开关</h2>
          <p>开启或关闭系统功能</p>
        </div>
      </div>
      
      <div class="toggle-list">
        <div class="toggle-item">
          <div class="toggle-icon email">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>
          <div class="toggle-info">
            <h3>每日邮件报告</h3>
            <p>每天 18:30 JST 汇总完成的任务并发送邮件报告</p>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="featureEmailReport" ${config.featureEmailReport ? 'checked' : ''} onchange="updateToggleStatus(this)">
            <span class="toggle-slider"></span>
          </label>
          <span class="toggle-status ${config.featureEmailReport ? 'on' : 'off'}" id="statusEmailReport">${config.featureEmailReport ? '已开启' : '已关闭'}</span>
        </div>
        
        <div class="toggle-item">
          <div class="toggle-icon slack">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="13" y="2" width="3" height="8" rx="1.5"/>
              <path d="M19 8.5V10h1.5A1.5 1.5 0 1 0 19 8.5"/>
              <rect x="8" y="14" width="3" height="8" rx="1.5"/>
              <path d="M5 15.5V14H3.5A1.5 1.5 0 1 0 5 15.5"/>
              <rect x="14" y="13" width="8" height="3" rx="1.5"/>
              <path d="M15.5 19H14v1.5a1.5 1.5 0 1 0 1.5-1.5"/>
              <rect x="2" y="8" width="8" height="3" rx="1.5"/>
              <path d="M8.5 5H10V3.5A1.5 1.5 0 1 0 8.5 5"/>
            </svg>
          </div>
          <div class="toggle-info">
            <h3>Slack 未完成任务提醒</h3>
            <p>每天 18:35 JST 发送未完成任务提醒到 Slack 频道</p>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="featureSlackReminder" ${config.featureSlackReminder ? 'checked' : ''} onchange="updateToggleStatus(this)">
            <span class="toggle-slider"></span>
          </label>
          <span class="toggle-status ${config.featureSlackReminder ? 'on' : 'off'}" id="statusSlackReminder">${config.featureSlackReminder ? '已开启' : '已关闭'}</span>
        </div>
      </div>
    </div>
    
      <!-- Schedule Settings -->
      <div class="section config-section" id="schedule">
      <div class="section-header">
        <div class="section-icon schedule">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </div>
        <div class="section-info">
          <h2>定时任务</h2>
          <p>设置 Slack 提醒和邮件报告的发送时间</p>
        </div>
      </div>
      
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Slack 提醒时间</label>
          <div class="time-picker">
            <input type="number" class="form-input" id="slackHour" value="${config.slackCronHour}" min="0" max="23" disabled />
            <span>:</span>
            <input type="number" class="form-input" id="slackMinute" value="${config.slackCronMinute}" min="0" max="59" disabled />
            <span class="tz">JST</span>
          </div>
          <span class="form-hint">发送未完成任务提醒到 Slack 频道</span>
        </div>
        
        <div class="form-group">
          <label class="form-label">邮件报告时间</label>
          <div class="time-picker">
            <input type="number" class="form-input" id="emailHour" value="${config.emailCronHour}" min="0" max="23" disabled />
            <span>:</span>
            <input type="number" class="form-input" id="emailMinute" value="${config.emailCronMinute}" min="0" max="59" disabled />
            <span class="tz">JST</span>
          </div>
          <span class="form-hint">发送每日完成任务邮件报告</span>
        </div>
      </div>
      
      <div class="info-box warning">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <p>定时任务时间的修改需要更新 <code>wrangler.toml</code> 并重新部署。当前仅供查看。</p>
      </div>
    </div>
    
      <!-- Slack Settings -->
      <div class="section config-section" id="slack">
      <div class="section-header">
        <div class="section-icon slack">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="13" y="2" width="3" height="8" rx="1.5"/>
            <path d="M19 8.5V10h1.5A1.5 1.5 0 1 0 19 8.5"/>
            <rect x="8" y="14" width="3" height="8" rx="1.5"/>
            <path d="M5 15.5V14H3.5A1.5 1.5 0 1 0 5 15.5"/>
          </svg>
        </div>
        <div class="section-info">
          <h2>Slack 设置</h2>
          <p>配置 Slack 通知相关设置</p>
        </div>
        <span class="status-badge ${config.slackWebhookConfigured ? 'success' : 'error'}">
          ${config.slackWebhookConfigured ? `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Webhook 已配置
          ` : `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            Webhook 未配置
          `}
        </span>
      </div>
      
      <div class="form-grid">
        <div class="form-group full-width">
          <label class="form-label">Slack 频道名称</label>
          <input type="text" class="form-input" id="slackChannelName" value="${config.slackChannelName}" placeholder="#jira-notifications" />
          <span class="form-hint">用于显示的频道名称（如 #jira-notifications）</span>
        </div>
        
        <div class="form-group full-width">
          <label class="form-label">Webhook URL</label>
          <input type="text" class="form-input mono" value="${config.slackWebhookConfigured ? '••••••••••••••••••••••••••••••••' : '未配置'}" disabled />
          <span class="form-hint">Slack Webhook URL 需通过 <code>wrangler secret put SLACK_WEBHOOK_URL</code> 配置</span>
        </div>
      </div>
      
      ${!config.slackWebhookConfigured ? `
      <div class="info-box warning">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <p>Slack Webhook URL 尚未配置。请运行以下命令配置：<br><code>wrangler secret put SLACK_WEBHOOK_URL</code></p>
      </div>
      ` : ''}
    </div>
    
      <!-- Email Recipients -->
      <div class="section config-section" id="email">
      <div class="section-header">
        <div class="section-icon email">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div class="section-info">
          <h2>邮件收件人</h2>
          <p>配置内部通知、客户邮件和抄送人</p>
        </div>
      </div>
      
      <div class="form-grid">
        <div class="form-group full-width">
          <label class="form-label">
            内部通知邮箱
            <span class="required">*</span>
          </label>
          <input type="email" class="form-input mono" id="internalEmail" value="${config.internalEmail}" placeholder="your@company.com" />
          <span class="form-hint">每日报告首先发送到此邮箱进行审核</span>
        </div>
        
        <div class="form-group full-width">
          <label class="form-label">默认客户邮箱</label>
          <input type="email" class="form-input mono" id="clientEmail" value="${config.defaultClientEmail}" placeholder="client@example.com" />
          <span class="form-hint">报告审核页面中的默认收件人</span>
        </div>
        
        <div class="form-group full-width">
          <label class="form-label">默认抄送邮箱</label>
          <input type="text" class="form-input mono" id="ccEmail" value="${config.defaultCcEmail}" placeholder="cc1@example.com, cc2@example.com" />
          <span class="form-hint">多个邮箱用逗号分隔</span>
        </div>
      </div>

      <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border);">
        <button class="email-send-btn" type="button" id="manualEmailSendBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
          <span id="manualEmailSendLabel">手动发送邮件</span>
        </button>
        <span class="form-hint" style="margin-top: 8px; display: block;">立即触发邮件报告发送。手动发送后，当天的自动定时发送将跳过。</span>
      </div>
    </div>
    
      <!-- Email Send Logs -->
      <div class="section config-section" id="email-logs">
      <div class="section-header">
        <div class="section-icon" style="background: rgba(6, 182, 212, 0.12); color: var(--accent-cyan);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div class="section-info">
          <h2>邮件发送记录</h2>
          <p>查看邮件发送历史，包括触发方式和操作人</p>
        </div>
      </div>

      <div class="email-logs-loading" id="emailLogsLoading">
        <p>加载中...</p>
      </div>
      <div class="email-logs-empty" id="emailLogsEmpty" style="display: none;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
        </svg>
        <p>暂无发送记录</p>
      </div>
      <div class="email-logs-table-wrap" id="emailLogsTableWrap" style="display: none;">
        <table class="email-logs-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>触发方式</th>
              <th>操作人</th>
              <th>状态</th>
              <th>详情</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody id="emailLogsTableBody"></tbody>
        </table>
      </div>
    </div>
    
      <!-- Jira Settings -->
      <div class="section config-section" id="jira">
      <div class="section-header">
        <div class="section-icon jira">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div class="section-info">
          <h2>Jira 配置</h2>
          <p>Jira 连接和监控任务设置</p>
        </div>
      </div>
      
      <div class="form-grid">
        <div class="form-group full-width">
          <label class="form-label">Jira Base URL</label>
          <input type="url" class="form-input mono" id="jiraBaseUrl" value="${config.jiraBaseUrl}" disabled />
          <span class="form-hint">Jira 实例地址（需在 wrangler.toml 中修改）</span>
        </div>
        
        <div class="form-group full-width">
          <label class="form-label">
            监控的父任务
            <span class="required">*</span>
          </label>
          <input type="text" class="form-input mono" id="parentIssues" value="${config.parentIssues}" placeholder="AT-123, AT-456" />
          <span class="form-hint">多个任务 Key 用逗号分隔，系统将监控这些任务下的所有子任务</span>
        </div>
      </div>
    </div>
    
      <!-- Other Settings -->
      <div class="section config-section" id="other">
      <div class="section-header">
        <div class="section-icon other">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </div>
        <div class="section-info">
          <h2>其他设置</h2>
          <p>时区和报告链接有效期</p>
        </div>
      </div>
      
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">时区</label>
          <input type="text" class="form-input" id="timezone" value="${config.timezone}" disabled />
          <span class="form-hint">系统时区设置</span>
        </div>
        
        <div class="form-group">
          <label class="form-label">报告链接有效期</label>
          <input type="number" class="form-input" id="tokenTtl" value="${Math.floor(config.reviewTokenTtl / 3600)}" min="1" max="168" />
          <span class="form-hint">单位：小时（1-168）</span>
        </div>
      </div>
    </div>
    
      ${input.IS_SUPER_ADMIN ? `
      <!-- Token Management (Super Admin Only) -->
      <div class="section config-section" id="tokens">
      <div class="section-header">
        <div class="section-icon" style="background: rgba(239, 68, 68, 0.12); color: var(--accent-red);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div class="section-info">
          <h2>授权码管理</h2>
          <p>发行和管理 API 访问授权码</p>
        </div>
        <span class="status-badge warning">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          仅限 Super Admin
        </span>
      </div>
      
      <div class="token-toolbar">
        <div class="token-count">已发行的授权码 <span id="tokenCount">0</span></div>
        <div class="token-filters" role="tablist" aria-label="授权码筛选">
          <button class="token-filter-btn active" type="button" data-filter="all">全部</button>
          <button class="token-filter-btn" type="button" data-filter="active">启用</button>
          <button class="token-filter-btn" type="button" data-filter="disabled">禁用</button>
        </div>
        <button class="token-create-btn" type="button" id="tokenCreateBtn">
          发行新授权码
        </button>
      </div>

      <div class="token-loading" id="tokenLoading">正在加载授权码...</div>
      <div class="token-empty" id="tokenEmpty" style="display: none;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <div>暂无授权码，点击右上角发行新的授权码</div>
      </div>
      <div class="token-table-wrap" id="tokenTableWrap" style="display: none;">
        <table class="token-table">
          <thead>
            <tr>
              <th>授权码</th>
              <th>备注</th>
              <th>创建时间</th>
              <th>过期时间</th>
              <th>最后使用</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="tokenTableBody"></tbody>
        </table>
      </div>
      </div>

      <div class="section config-section" id="logs">
        <div class="section-header">
          <div class="section-icon" style="background: rgba(59, 130, 246, 0.12); color: var(--accent-blue);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 3v18h18"/>
              <path d="M7 15l4-4 4 3 5-6"/>
            </svg>
          </div>
          <div class="section-info">
            <h2>访问日志</h2>
            <p>查询授权码使用记录与接口访问轨迹</p>
          </div>
        </div>

        <div class="log-panel">
          <div class="log-filters">
            <div class="form-group">
              <label class="form-label">日期</label>
              <input class="form-input" type="date" id="logDate" />
            </div>
            <div class="form-group">
              <label class="form-label">授权码</label>
              <input class="form-input mono" type="text" id="logToken" placeholder="例如 123456" />
            </div>
            <div class="form-group">
              <label class="form-label">Endpoint</label>
              <input class="form-input mono" type="text" id="logEndpoint" placeholder="/admin/tokens" />
            </div>
          </div>
          <div class="log-actions">
            <button class="log-btn primary" type="button" id="logSearchBtn">查询</button>
            <button class="log-btn" type="button" id="logResetBtn">清空</button>
          </div>
          <div class="log-table-wrap">
            <table class="log-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>授权码</th>
                  <th>备注</th>
                  <th>Endpoint</th>
                  <th>方法</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody id="logBody"></tbody>
            </table>
          </div>
          <div class="log-empty" id="logEmpty" style="display:none;">暂无日志</div>
        </div>
      </div>

      <div class="token-modal-overlay" id="tokenModal">
        <div class="token-modal">
          <div id="tokenForm">
            <h3>发行新授权码</h3>
            <p>创建一个 6 位数字授权码用于 API 访问或 Web 登录</p>
            <div class="form-group">
              <label class="form-label">备注说明 *</label>
              <input type="text" class="form-input" id="tokenNote" placeholder="例如：李凯的手机、CI/CD 自动化" />
              <div class="form-hint">用于识别此授权码的用途或使用者</div>
            </div>
            <div class="form-group">
              <label class="form-label">有效期（天）</label>
              <input type="number" class="form-input" id="tokenExpiry" placeholder="留空表示永不过期" min="1" max="365" />
              <div class="form-hint">1-365 天，留空表示永不过期</div>
            </div>
            <div class="token-modal-actions">
              <button class="token-btn-secondary" type="button" id="tokenCancelBtn">取消</button>
              <button class="token-btn-primary" type="button" id="tokenSubmitBtn">发行授权码</button>
            </div>
          </div>
          <div id="tokenSuccess" style="display: none;">
            <div class="token-success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:42px;height:42px;color:var(--accent-green);margin-bottom:12px;">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <h3 style="margin-bottom:6px;">授权码已生成</h3>
              <div class="token-display" id="tokenDisplay"></div>
              <p class="hint">请妥善保存此授权码，关闭后无法再次查看完整码</p>
              <div class="token-modal-actions" style="margin-top:20px;">
                <button class="token-btn-secondary" type="button" id="tokenCopyCloseBtn">复制并关闭</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="token-modal-overlay" id="confirmModal">
        <div class="confirm-modal">
          <div class="confirm-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h3 id="confirmTitle">确认操作</h3>
          <p id="confirmMessage">确定要继续吗？</p>
          <div class="confirm-actions">
            <button class="token-btn-secondary" type="button" id="confirmCancelBtn">取消</button>
            <button class="token-btn-primary" type="button" id="confirmOkBtn">确认</button>
          </div>
        </div>
      </div>
      ` : ''}
    </main>
  </div>
  
  <div class="toast" id="toast">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
    <span id="toastMessage">配置已保存</span>
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

    function initSectionNav() {
      const navItems = Array.from(document.querySelectorAll('.nav-item[data-target]'));
      const tokenSection = document.getElementById('tokens');

      function applyActiveFromHash() {
        const hash = window.location.hash.replace('#', '');
        const activeId = hash && document.getElementById(hash) ? hash : 'feature';
        navItems.forEach(item => {
          item.classList.toggle('active', item.getAttribute('data-target') === activeId);
        });
        if (activeId === 'tokens') {
          loadTokens();
        }
        if (activeId === 'logs') {
          fetchLogs();
        }
        if (activeId === 'email-logs') {
          loadEmailLogs();
        }
      }

      applyActiveFromHash();
      window.addEventListener('hashchange', applyActiveFromHash);

      navItems.forEach(item => {
        item.addEventListener('click', (event) => {
          event.preventDefault();
          const target = item.getAttribute('data-target');
          if (!target) return;
          window.location.hash = target;
          applyActiveFromHash();
        });
      });
    }

    let tokensLoaded = false;
    let latestTokenValue = '';
    let tokenFilter = 'all';
    let tokensCache = [];

    function escapeHtml(text) {
      return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function formatDateTime(value, fallback) {
      if (!value) return fallback || '-';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return fallback || '-';
      return date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    }

    function setTokenView(state) {
      const loading = document.getElementById('tokenLoading');
      const empty = document.getElementById('tokenEmpty');
      const table = document.getElementById('tokenTableWrap');
      if (!loading || !empty || !table) return;
      loading.style.display = state === 'loading' ? 'block' : 'none';
      empty.style.display = state === 'empty' ? 'block' : 'none';
      table.style.display = state === 'table' ? 'block' : 'none';
    }

    function renderTokens(tokens, totalCount) {
      const body = document.getElementById('tokenTableBody');
      const count = document.getElementById('tokenCount');
      if (!body || !count) return;
      count.textContent = String(totalCount ?? tokens.length);

      if (tokens.length === 0) {
        body.innerHTML = '';
        setTokenView('empty');
        return;
      }

      body.innerHTML = '';
      tokens.forEach(token => {
        const expiresAt = token.expiresAt ? formatDateTime(token.expiresAt) : '永不过期';
        const lastUsed = token.lastUsedAt ? formatDateTime(token.lastUsedAt) : '从未使用';
        const createdAt = formatDateTime(token.createdAt);
        const isExpired = token.expiresAt && new Date(token.expiresAt) < new Date();
        const isDisabled = !!token.isDisabled;

        const row = document.createElement('tr');
        row.className = 'token-row' + (isExpired ? ' expired' : '') + (isDisabled ? ' disabled' : '');

        const codeCell = document.createElement('td');
        const codeSpan = document.createElement('span');
        codeSpan.className = 'token-code';
        codeSpan.textContent = token.token;
        codeCell.appendChild(codeSpan);

        const noteCell = document.createElement('td');
        noteCell.textContent = token.note || '';
        if (isDisabled) {
          const badge = document.createElement('span');
          badge.className = 'token-badge';
          badge.textContent = '已禁用';
          noteCell.appendChild(badge);
        }

        const createdCell = document.createElement('td');
        createdCell.textContent = createdAt;

        const expiresCell = document.createElement('td');
        expiresCell.textContent = expiresAt;

        const lastUsedCell = document.createElement('td');
        lastUsedCell.textContent = lastUsed;

        const actionCell = document.createElement('td');
        const actionWrap = document.createElement('div');
        actionWrap.className = 'token-actions';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'token-icon-btn';
        copyBtn.type = 'button';
        copyBtn.title = '复制';
        copyBtn.setAttribute('data-action', 'copy');
        copyBtn.setAttribute('data-token', token.token);
        copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

        const actionBtn = document.createElement('button');
        actionBtn.className = 'token-icon-btn danger';
        actionBtn.type = 'button';
        actionBtn.setAttribute('data-token', token.token);
        if (isDisabled) {
          actionBtn.title = '启用';
          actionBtn.setAttribute('data-action', 'enable');
          actionBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
        } else {
          actionBtn.title = '禁用';
          actionBtn.setAttribute('data-action', 'disable');
          actionBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
        }

        actionWrap.appendChild(copyBtn);
        actionWrap.appendChild(actionBtn);
        actionCell.appendChild(actionWrap);

        row.appendChild(codeCell);
        row.appendChild(noteCell);
        row.appendChild(createdCell);
        row.appendChild(expiresCell);
        row.appendChild(lastUsedCell);
        row.appendChild(actionCell);
        body.appendChild(row);
      });
      setTokenView('table');
    }

    function applyTokenFilter() {
      let filtered = tokensCache;
      if (tokenFilter === 'active') {
        filtered = tokensCache.filter(token => !token.isDisabled);
      } else if (tokenFilter === 'disabled') {
        filtered = tokensCache.filter(token => token.isDisabled);
      }
      renderTokens(filtered, tokensCache.length);
    }

    async function loadTokens(force = false) {
      const body = document.getElementById('tokenTableBody');
      if (!body) return;
      if (tokensLoaded && !force) return;

      setTokenView('loading');
      let didFinish = false;
      const timeoutId = setTimeout(() => {
        if (!didFinish) {
          setTokenView('empty');
          showToast('加载超时，请刷新重试', 'error');
        }
      }, 8000);
      try {
        const response = await fetch('/admin/tokens', {
          headers: { 'Accept': 'application/json' },
        });
        if (response.ok) {
          const data = await response.json();
          tokensCache = data.tokens || [];
          applyTokenFilter();
          tokensLoaded = true;
        } else if (response.status === 401) {
          window.location.href = '/login?redirect=/config#tokens&error=' + encodeURIComponent('会话已过期，请重新登录');
        } else if (response.status === 403) {
          showToast('仅 Super Admin 可查看授权码', 'error');
          setTokenView('empty');
        } else {
          showToast('加载授权码失败', 'error');
          setTokenView('empty');
        }
      } catch (error) {
        showToast('网络错误，请重试', 'error');
        setTokenView('empty');
      } finally {
        didFinish = true;
        clearTimeout(timeoutId);
      }
    }

    function openTokenModal() {
      const modal = document.getElementById('tokenModal');
      const form = document.getElementById('tokenForm');
      const success = document.getElementById('tokenSuccess');
      if (!modal || !form || !success) return;
      modal.classList.add('show');
      form.style.display = 'block';
      success.style.display = 'none';
      const note = document.getElementById('tokenNote');
      const expiry = document.getElementById('tokenExpiry');
      if (note) note.value = '';
      if (expiry) expiry.value = '';
      if (note) note.focus();
    }

    function closeTokenModal() {
      const modal = document.getElementById('tokenModal');
      if (modal) modal.classList.remove('show');
    }

    async function createToken() {
      const noteInput = document.getElementById('tokenNote');
      const expiryInput = document.getElementById('tokenExpiry');
      const submitBtn = document.getElementById('tokenSubmitBtn');
      if (!noteInput || !expiryInput || !submitBtn) return;

      const note = noteInput.value.trim();
      const expiryValue = expiryInput.value.trim();
      const expiresInDays = expiryValue ? parseInt(expiryValue, 10) : null;

      if (!note) {
        showToast('请输入备注说明', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = '创建中...';

      try {
        const response = await fetch('/admin/tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note, expiresInDays }),
        });

        if (response.ok) {
          const data = await response.json();
          latestTokenValue = data.token;
          const display = document.getElementById('tokenDisplay');
          const form = document.getElementById('tokenForm');
          const success = document.getElementById('tokenSuccess');
          if (display) display.textContent = data.token;
          if (form) form.style.display = 'none';
          if (success) success.style.display = 'block';
          await loadTokens(true);
        } else if (response.status === 401) {
          window.location.href = '/login?redirect=/config#tokens&error=' + encodeURIComponent('会话已过期，请重新登录');
        } else {
          const error = await response.json();
          showToast(error.message || error.error || '创建失败', 'error');
        }
      } catch (error) {
        showToast('网络错误，请重试', 'error');
      }

      submitBtn.disabled = false;
      submitBtn.textContent = '发行授权码';
    }

    function copyToken(token) {
      if (!token) return;
      navigator.clipboard.writeText(token).then(() => {
        showToast('已复制到剪贴板');
      });
    }

    function copyTokenAndClose() {
      if (!latestTokenValue) {
        closeTokenModal();
        return;
      }
      navigator.clipboard.writeText(latestTokenValue).then(() => {
        showToast('授权码已复制');
        closeTokenModal();
      });
    }

    let pendingConfirmAction = null;

    function showConfirm(title, message, action) {
      const modal = document.getElementById('confirmModal');
      const titleEl = document.getElementById('confirmTitle');
      const messageEl = document.getElementById('confirmMessage');
      if (!modal || !titleEl || !messageEl) return;
      titleEl.textContent = title;
      messageEl.textContent = message;
      pendingConfirmAction = action;
      modal.classList.add('show');
    }

    function closeConfirm() {
      const modal = document.getElementById('confirmModal');
      if (modal) modal.classList.remove('show');
      pendingConfirmAction = null;
    }

    async function deleteToken(token) {
      if (!token) return;
      showConfirm(
        '禁用授权码',
        '确定要禁用此授权码吗？此操作可恢复。',
        async () => {
          try {
            const response = await fetch('/admin/tokens/' + token, { method: 'DELETE' });
            if (response.ok) {
              showToast('授权码已禁用');
              await loadTokens(true);
            } else if (response.status === 401) {
              window.location.href = '/login?redirect=/config#tokens&error=' + encodeURIComponent('会话已过期，请重新登录');
            } else {
              const error = await response.json();
              showToast(error.message || error.error || '禁用失败', 'error');
            }
          } catch (error) {
            showToast('网络错误，请重试', 'error');
          }
        }
      );
    }

    async function enableToken(token) {
      if (!token) return;
      try {
        const response = await fetch('/admin/tokens/' + token + '/enable', { method: 'POST' });
        if (response.ok) {
          showToast('授权码已启用');
          await loadTokens(true);
        } else if (response.status === 401) {
          window.location.href = '/login?redirect=/config#tokens&error=' + encodeURIComponent('会话已过期，请重新登录');
        } else {
          const error = await response.json();
          showToast(error.message || error.error || '启用失败', 'error');
        }
      } catch (error) {
        showToast('网络错误，请重试', 'error');
      }
    }

    function formatLogDate(value) {
      return new Date(value).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    }

    function renderLogs(logs) {
      const logBody = document.getElementById('logBody');
      const logEmpty = document.getElementById('logEmpty');
      if (!logBody || !logEmpty) return;
      logBody.innerHTML = '';
      if (!logs || logs.length === 0) {
        logEmpty.style.display = 'block';
        return;
      }
      logEmpty.style.display = 'none';
      logs.forEach(log => {
        const row = document.createElement('tr');
        row.innerHTML = '' +
          '<td class="mono">' + formatLogDate(log.timestamp) + '</td>' +
          '<td class="mono">' + log.token + '</td>' +
          '<td>' + (log.note || '') + '</td>' +
          '<td class="mono">' + log.endpoint + '</td>' +
          '<td class="mono">' + log.method + '</td>' +
          '<td class="mono">' + (log.ip || '') + '</td>';
        logBody.appendChild(row);
      });
    }

    async function fetchLogs() {
      const logBody = document.getElementById('logBody');
      const dateInput = document.getElementById('logDate');
      const tokenInput = document.getElementById('logToken');
      const endpointInput = document.getElementById('logEndpoint');
      if (!logBody || !dateInput || !tokenInput || !endpointInput) return;
      const params = new URLSearchParams();
      if (dateInput.value) params.set('date', dateInput.value);
      if (tokenInput.value.trim()) params.set('token', tokenInput.value.trim());
      if (endpointInput.value.trim()) params.set('endpoint', endpointInput.value.trim());
      const url = '/admin/logs/query' + (params.toString() ? '?' + params.toString() : '');
      const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!response.ok) {
        renderLogs([]);
        return;
      }
      const data = await response.json();
      renderLogs(data.logs || []);
    }

    const tokenModal = document.getElementById('tokenModal');
    if (tokenModal) {
      tokenModal.addEventListener('click', (event) => {
        if (event.target === tokenModal) {
          closeTokenModal();
        }
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeTokenModal();
        closeConfirm();
      }
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSectionNav);
    } else {
      initSectionNav();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        const createBtn = document.getElementById('tokenCreateBtn');
        const cancelBtn = document.getElementById('tokenCancelBtn');
        const submitBtn = document.getElementById('tokenSubmitBtn');
        const copyCloseBtn = document.getElementById('tokenCopyCloseBtn');
        const tableBody = document.getElementById('tokenTableBody');
        const confirmCancelBtn = document.getElementById('confirmCancelBtn');
        const confirmOkBtn = document.getElementById('confirmOkBtn');
        const confirmModal = document.getElementById('confirmModal');
        const filterButtons = document.querySelectorAll('.token-filter-btn');
        const logSearchBtn = document.getElementById('logSearchBtn');
        const logResetBtn = document.getElementById('logResetBtn');
        const logDateInput = document.getElementById('logDate');
        const logTokenInput = document.getElementById('logToken');
        const logEndpointInput = document.getElementById('logEndpoint');

        if (createBtn) createBtn.addEventListener('click', openTokenModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeTokenModal);
        if (submitBtn) submitBtn.addEventListener('click', createToken);
        if (copyCloseBtn) copyCloseBtn.addEventListener('click', copyTokenAndClose);

        if (tableBody) {
          tableBody.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-action]');
            if (!button) return;
            const action = button.getAttribute('data-action');
            const token = button.getAttribute('data-token');
            if (!token) return;
            if (action === 'copy') {
              copyToken(token);
            } else if (action === 'disable') {
              deleteToken(token);
            } else if (action === 'enable') {
              enableToken(token);
            }
          });
        }

        if (confirmCancelBtn) {
          confirmCancelBtn.addEventListener('click', closeConfirm);
        }

        if (confirmOkBtn) {
          confirmOkBtn.addEventListener('click', async () => {
            const action = pendingConfirmAction;
            closeConfirm();
            if (typeof action === 'function') {
              await action();
            }
          });
        }

        if (confirmModal) {
          confirmModal.addEventListener('click', (event) => {
            if (event.target === confirmModal) {
              closeConfirm();
            }
          });
        }

        if (logSearchBtn) {
          logSearchBtn.addEventListener('click', fetchLogs);
        }

        if (logResetBtn) {
          logResetBtn.addEventListener('click', () => {
            if (logDateInput) logDateInput.value = '';
            if (logTokenInput) logTokenInput.value = '';
            if (logEndpointInput) logEndpointInput.value = '';
            fetchLogs();
          });
        }

        if (logDateInput && !logDateInput.value) {
          logDateInput.value = new Date().toISOString().slice(0, 10);
        }

        filterButtons.forEach(button => {
          button.addEventListener('click', () => {
            tokenFilter = button.getAttribute('data-filter') || 'all';
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            applyTokenFilter();
          });
        });

        const tokenSection = document.getElementById('tokens');
        if (tokenSection && window.location.hash === '#tokens') {
          loadTokens();
        }
      });
    } else {
      const createBtn = document.getElementById('tokenCreateBtn');
      const cancelBtn = document.getElementById('tokenCancelBtn');
      const submitBtn = document.getElementById('tokenSubmitBtn');
      const copyCloseBtn = document.getElementById('tokenCopyCloseBtn');
      const tableBody = document.getElementById('tokenTableBody');
      const confirmCancelBtn = document.getElementById('confirmCancelBtn');
      const confirmOkBtn = document.getElementById('confirmOkBtn');
      const confirmModal = document.getElementById('confirmModal');
      const filterButtons = document.querySelectorAll('.token-filter-btn');
      const logSearchBtn = document.getElementById('logSearchBtn');
      const logResetBtn = document.getElementById('logResetBtn');
      const logDateInput = document.getElementById('logDate');
      const logTokenInput = document.getElementById('logToken');
      const logEndpointInput = document.getElementById('logEndpoint');

      if (createBtn) createBtn.addEventListener('click', openTokenModal);
      if (cancelBtn) cancelBtn.addEventListener('click', closeTokenModal);
      if (submitBtn) submitBtn.addEventListener('click', createToken);
      if (copyCloseBtn) copyCloseBtn.addEventListener('click', copyTokenAndClose);

      if (tableBody) {
        tableBody.addEventListener('click', (event) => {
          const button = event.target.closest('button[data-action]');
          if (!button) return;
          const action = button.getAttribute('data-action');
          const token = button.getAttribute('data-token');
          if (!token) return;
          if (action === 'copy') {
            copyToken(token);
          } else if (action === 'disable') {
            deleteToken(token);
          } else if (action === 'enable') {
            enableToken(token);
          }
        });
      }

      if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener('click', closeConfirm);
      }

      if (confirmOkBtn) {
        confirmOkBtn.addEventListener('click', async () => {
          const action = pendingConfirmAction;
          closeConfirm();
          if (typeof action === 'function') {
            await action();
          }
        });
      }

      if (confirmModal) {
        confirmModal.addEventListener('click', (event) => {
          if (event.target === confirmModal) {
            closeConfirm();
          }
        });
      }

      if (logSearchBtn) {
        logSearchBtn.addEventListener('click', fetchLogs);
      }

      if (logResetBtn) {
        logResetBtn.addEventListener('click', () => {
          if (logDateInput) logDateInput.value = '';
          if (logTokenInput) logTokenInput.value = '';
          if (logEndpointInput) logEndpointInput.value = '';
          fetchLogs();
        });
      }

      if (logDateInput && !logDateInput.value) {
        logDateInput.value = new Date().toISOString().slice(0, 10);
      }

      filterButtons.forEach(button => {
        button.addEventListener('click', () => {
          tokenFilter = button.getAttribute('data-filter') || 'all';
          filterButtons.forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');
          applyTokenFilter();
        });
      });

      const tokenSection = document.getElementById('tokens');
      if (tokenSection && window.location.hash === '#tokens') {
        loadTokens();
      }
    }

    // Store initial values for change detection
    const initialValues = {
      featureEmailReport: ${config.featureEmailReport},
      featureSlackReminder: ${config.featureSlackReminder},
      slackChannelName: ${JSON.stringify(config.slackChannelName)},
      internalEmail: ${JSON.stringify(config.internalEmail)},
      clientEmail: ${JSON.stringify(config.defaultClientEmail)},
      ccEmail: ${JSON.stringify(config.defaultCcEmail)},
      parentIssues: ${JSON.stringify(config.parentIssues)},
      tokenTtl: ${Math.floor(config.reviewTokenTtl / 3600)},
    };
    
    function checkForChanges() {
      const current = {
        featureEmailReport: document.getElementById('featureEmailReport').checked,
        featureSlackReminder: document.getElementById('featureSlackReminder').checked,
        slackChannelName: document.getElementById('slackChannelName').value,
        internalEmail: document.getElementById('internalEmail').value,
        clientEmail: document.getElementById('clientEmail').value,
        ccEmail: document.getElementById('ccEmail').value,
        parentIssues: document.getElementById('parentIssues').value,
        tokenTtl: parseInt(document.getElementById('tokenTtl').value) || 0,
      };
      
      const hasChanges = Object.keys(initialValues).some(key => initialValues[key] !== current[key]);
      const saveBtn = document.getElementById('saveBtn');
      
      if (hasChanges) {
        saveBtn.classList.add('active');
        saveBtn.disabled = false;
      } else {
        saveBtn.classList.remove('active');
        saveBtn.disabled = true;
      }
    }
    
    // Attach change listeners to all form inputs
    document.addEventListener('DOMContentLoaded', () => {
      const inputs = document.querySelectorAll('input:not([disabled])');
      inputs.forEach(input => {
        input.addEventListener('input', checkForChanges);
        input.addEventListener('change', checkForChanges);
      });
    });
    
    function updateToggleStatus(checkbox) {
      const id = checkbox.id;
      const statusMap = {
        featureEmailReport: 'statusEmailReport',
        featureSlackReminder: 'statusSlackReminder',
      };
      const statusEl = document.getElementById(statusMap[id]);
      if (!statusEl) return;
      if (checkbox.checked) {
        statusEl.textContent = '已开启';
        statusEl.className = 'toggle-status on';
      } else {
        statusEl.textContent = '已关闭';
        statusEl.className = 'toggle-status off';
      }
      checkForChanges();
    }
    
    function showToast(message, type = 'success') {
      const toast = document.getElementById('toast');
      const toastMessage = document.getElementById('toastMessage');
      toastMessage.textContent = message;
      toast.className = 'toast ' + type + ' show';
      
      const icon = toast.querySelector('svg');
      if (type === 'success') {
        icon.innerHTML = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>';
      } else {
        icon.innerHTML = '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>';
      }
      
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }
    
    async function saveConfig() {
      const btn = document.getElementById('saveBtn');
      btn.disabled = true;
      
      const config = {
        featureEmailReport: document.getElementById('featureEmailReport').checked,
        featureSlackReminder: document.getElementById('featureSlackReminder').checked,
        slackChannelName: document.getElementById('slackChannelName').value,
        internalEmail: document.getElementById('internalEmail').value,
        defaultClientEmail: document.getElementById('clientEmail').value,
        defaultCcEmail: document.getElementById('ccEmail').value,
        parentIssues: document.getElementById('parentIssues').value,
        reviewTokenTtl: parseInt(document.getElementById('tokenTtl').value) * 3600,
      };
      
      try {
        // Session cookie is automatically sent with fetch (credentials: 'same-origin' is default)
        const response = await fetch('/admin/config', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(config),
        });
        
        if (response.ok) {
          showToast('配置已保存', 'success');
          // Update initial values to current values
          initialValues.featureEmailReport = config.featureEmailReport;
          initialValues.featureSlackReminder = config.featureSlackReminder;
          initialValues.slackChannelName = config.slackChannelName;
          initialValues.internalEmail = config.internalEmail;
          initialValues.clientEmail = config.defaultClientEmail;
          initialValues.ccEmail = config.defaultCcEmail;
          initialValues.parentIssues = config.parentIssues;
          initialValues.tokenTtl = parseInt(document.getElementById('tokenTtl').value);
          checkForChanges();
        } else if (response.status === 401) {
          // Session expired, redirect to login
          window.location.href = '/login?redirect=/config&error=' + encodeURIComponent('会话已过期，请重新登录');
        } else {
          const error = await response.json();
          showToast(error.message || error.error || '保存失败', 'error');
        }
      } catch (e) {
        showToast('网络错误，请重试', 'error');
      }
      
      btn.disabled = false;
    }
    let emailLogsLoaded = false;

    function setEmailLogsView(state) {
      const loading = document.getElementById('emailLogsLoading');
      const empty = document.getElementById('emailLogsEmpty');
      const table = document.getElementById('emailLogsTableWrap');
      if (!loading || !empty || !table) return;
      loading.style.display = state === 'loading' ? 'block' : 'none';
      empty.style.display = state === 'empty' ? 'block' : 'none';
      table.style.display = state === 'table' ? 'block' : 'none';
    }

    async function loadEmailLogs() {
      if (emailLogsLoaded) return;
      setEmailLogsView('loading');
      try {
        const res = await fetch('/admin/email-logs?days=30');
        if (res.status === 401) {
          window.location.href = '/login?redirect=/config%23email-logs&error=' + encodeURIComponent('会话已过期，请重新登录');
          return;
        }
        const data = await res.json();
        if (!data.success || !data.logs || data.logs.length === 0) {
          setEmailLogsView('empty');
          emailLogsLoaded = true;
          return;
        }
        renderEmailLogs(data.logs);
        setEmailLogsView('table');
        emailLogsLoaded = true;
      } catch (e) {
        setEmailLogsView('empty');
      }
    }

    function renderEmailLogs(logs) {
      const body = document.getElementById('emailLogsTableBody');
      if (!body) return;
      body.innerHTML = '';
      logs.forEach(function(log) {
        const row = document.createElement('tr');
        var triggerClass = log.triggerType === 'confirmed' ? 'confirmed' : (log.triggerType === 'auto' ? 'auto' : 'manual');
        var triggerLabel = log.triggerType === 'confirmed' ? '已确认' : (log.triggerType === 'auto' ? '自动' : '手动');
        var statusClass = log.success ? 'success' : 'fail';
        var statusLabel = log.success ? '成功' : '失败';
        var ts = new Date(log.timestamp);
        var timeStr = ts.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

        row.innerHTML =
          '<td>' + escapeHtml(log.date) + '</td>' +
          '<td><span class="log-badge ' + triggerClass + '">' + triggerLabel + '</span></td>' +
          '<td>' + escapeHtml(log.operator) + '</td>' +
          '<td><span class="log-badge ' + statusClass + '">' + statusLabel + '</span></td>' +
          '<td>' + escapeHtml(log.details || '-') + '</td>' +
          '<td>' + escapeHtml(timeStr) + '</td>';
        body.appendChild(row);
      });
    }

    (function initManualEmailSend() {
      var btn = document.getElementById('manualEmailSendBtn');
      if (!btn) return;
      btn.addEventListener('click', async function() {
        if (btn.disabled) return;
        btn.disabled = true;
        var label = document.getElementById('manualEmailSendLabel');
        var origText = label.textContent;
        label.textContent = '发送中...';
        try {
          var res = await fetch('/api/email/send', { method: 'POST' });
          if (res.status === 401) {
            window.location.href = '/login?redirect=/config%23email&error=' + encodeURIComponent('会话已过期，请重新登录');
            return;
          }
          var data = await res.json();
          if (data.success) {
            showToast('邮件发送成功' + (data.totalCompleted > 0 ? '（' + data.totalCompleted + ' 个任务）' : ''), 'success');
            emailLogsLoaded = false;
          } else {
            showToast(data.error || '发送失败', 'error');
          }
        } catch (e) {
          showToast('网络错误，请重试', 'error');
        }
        label.textContent = origText;
        btn.disabled = false;
      });
    })();
  </script>
</body>
</html>`;
}
