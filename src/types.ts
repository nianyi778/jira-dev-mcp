// Cloudflare Worker Environment
export interface Env {
  // Static variables (from wrangler.toml [vars])
  JIRA_BASE_URL: string;
  TIMEZONE: string;
  WORKER_BASE_URL: string; // Base URL for review links (e.g., "https://your-domain.example.com")
  SUPER_ADMIN_TOKEN: string; // Super admin 6-digit token

  // Secrets (set via wrangler secret put)
  JIRA_EMAIL: string;
  JIRA_API_TOKEN: string;
  RESEND_API_KEY?: string; // Optional in DRY_RUN mode
  RESEND_FROM_EMAIL?: string; // Optional in DRY_RUN mode (e.g., "Name <email@domain.com>")
  SLACK_WEBHOOK_URL?: string; // Slack incoming webhook URL for notifications

  // KV namespace binding (stores reports, config, tokens, logs)
  REPORT_KV: KVNamespace;

  // D1 database for tokens and logs
  TOKEN_DB: D1Database;
}

// Application config (stored in KV)
export interface AppConfig {
  parentIssues: string; // Comma-separated parent issue keys (e.g., "AT-878,AT-900")
  dryRun: boolean; // Skip email sending
  internalEmail: string; // Internal notification email
  defaultClientEmail: string; // Default client email for review page
  defaultCcEmail: string; // Default CC email for review page
  reviewTokenTtl: number; // Token TTL in seconds (default 86400 = 24h)
  featureEmailReport: boolean; // Enable daily email report
  featureSlackReminder: boolean; // Enable Slack incomplete tasks reminder
  slackChannelName: string; // Slack channel name for display
}

// Token data (stored in KV as "token:XXXXXX")
export interface TokenData {
  note: string; // Required description (e.g., "李凯的手机", "CI/CD")
  createdAt: string; // ISO timestamp
  expiresAt: string | null; // ISO timestamp or null for never expires
  lastUsedAt: string | null; // ISO timestamp of last use
  isDisabled?: boolean; // Token disabled flag
}

// Log entry (stored in KV as "log:YYYY-MM-DD")
export interface LogEntry {
  token: string; // 6-digit token
  note: string; // Token note for quick identification
  endpoint: string; // Requested endpoint
  method: string; // HTTP method
  ip: string; // Client IP
  timestamp: string; // ISO timestamp
}

// Authentication result
export interface AuthResult {
  valid: boolean;
  isSuperAdmin?: boolean;
  token?: string;
  note?: string;
  error?: string;
}

// Jira API Types
export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
}

export interface JiraStatus {
  name: string;
  statusCategory: {
    key: string;
    name: string;
  };
}

export interface JiraIssueFields {
  summary: string;
  status: JiraStatus;
  assignee: JiraUser | null;
  priority: {
    name: string;
  };
  parent?: {
    key: string;
    fields: {
      summary: string;
    };
  };
}

export interface JiraChangelogItem {
  field: string;
  fieldtype: string;
  from: string | null;
  fromString: string | null;
  to: string | null;
  toString: string | null;
}

export interface JiraChangelogHistory {
  id: string;
  author: JiraUser;
  created: string;
  items: JiraChangelogItem[];
}

export interface JiraChangelog {
  startAt: number;
  maxResults: number;
  total: number;
  histories: JiraChangelogHistory[];
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: JiraIssueFields;
  changelog?: JiraChangelog;
}

export interface JiraSearchResponse {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

// Processed Data Types
export interface CompletedSubtask {
  key: string;
  summary: string;
  assignee: string;
  completedAt: string;
  completedAtDate: Date;
}

export interface ParentTaskReport {
  parentKey: string;
  parentSummary: string;
  completedToday: CompletedSubtask[];
  totalSubtasks: number;
  completedSubtasks: number;
  progressPercent: number;
}

export interface DailyReport {
  date: string;
  reports: ParentTaskReport[];
  totalCompletedToday: number;
}

// Stored Report in KV
export interface StoredReport {
  id: string; // Unique token (UUID)
  createdAt: string; // ISO timestamp
  expiresAt: string; // Expiration timestamp
  dailyReport: DailyReport; // Full report data
  defaultTo: string; // Default recipient email
  defaultCc: string; // Default CC email
  defaultSubject: string; // Default email subject
  defaultBody: string; // Default email body (plain text)
}

// Resend Types
export interface ResendEmailRequest {
  from: string; // "Name <email@domain.com>" format
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

// Incomplete Tasks Types (for Slack notification)
export interface IncompleteSubtask {
  key: string;
  summary: string;
  assignee: string;
  status: string;
  statusCategory: string;
  priority: string;
}

export interface IncompleteTasksReport {
  parentKey: string;
  parentSummary: string;
  incompleteTasks: IncompleteSubtask[];
  totalSubtasks: number;
  completedSubtasks: number;
  progressPercent: number;
}

// Slack Types
export interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: { type: string; text: string }[];
}

export interface SlackMessage {
  text: string; // Fallback text for notifications
  blocks?: SlackBlock[];
}
