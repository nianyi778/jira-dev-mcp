# Jira Subtask Monitor

[![Test](https://github.com/nianyi778/jira-monitor/actions/workflows/test.yml/badge.svg)](https://github.com/nianyi778/jira-monitor/actions/workflows/test.yml)
[![Deploy](https://github.com/nianyi778/jira-monitor/actions/workflows/deploy.yml/badge.svg)](https://github.com/nianyi778/jira-monitor/actions/workflows/deploy.yml)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

Cloudflare Worker that monitors Jira subtasks and sends daily reports with a review flow.
Built for small teams that want lightweight status reporting without maintaining servers.

## Features
- Jira subtasks scan by parent issue keys
- Daily email report (JST 20:00) with review link
- Slack incomplete tasks reminder (JST 18:30)
- Web admin UI at `/config` (feature toggles, recipients, tokens, logs)
- Token-based auth (session or bearer)
- Logs stored in D1 with 30-day retention
- Theme toggle (light/dark)

## Architecture

**Runtime**: Cloudflare Workers

**Storage**
- KV: reports, config, review link tokens
- D1: auth tokens and access logs

**Auth**
- Web UI: session cookie
- API calls: Bearer token

## Project Layout
```
src/
  index.ts        # Router + handlers
  auth.ts         # Token auth + logs
  config-store.ts # Config in KV
  jira.ts         # Jira API
  email.ts        # Resend email
  slack.ts        # Slack webhook
  storage.ts      # Reports in KV
  pages/          # HTML pages
schema/
  token_db.sql    # D1 schema (tokens + logs)
```

## Contributing
See `CONTRIBUTING.md`.

## Changelog
See `CHANGELOG.md`.

## Docker / DevContainer
- Docker: `docker build -t jira-monitor . && docker run -p 8787:8787 jira-monitor`
- DevContainer: open the repo in VS Code and select “Reopen in Container”

## Quickstart (Local)
1) Install deps
```bash
pnpm install
```

2) Copy `wrangler.toml` and set placeholders

3) Create `.dev.vars` for local secrets
```ini
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=your-jira-api-token
RESEND_API_KEY=your-resend-key
RESEND_FROM_EMAIL="Name <email@domain.com>"
GMAIL_CLIENT_ID=your-google-oauth-client-id
GMAIL_CLIENT_SECRET=your-google-oauth-client-secret
GMAIL_REFRESH_TOKEN=your-google-oauth-refresh-token
GMAIL_SENDER_EMAIL=kai.li@elestyle.jp
GMAIL_SENDER_NAME=kai.li
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
```

4) Run dev server
```bash
pnpm run dev
```

## Design System
See `DESIGN_SYSTEM.md` for UI/UX standards.

## Deployment (Simple)
For a step-by-step guide, see `DEPLOYMENT.md`.
1) Create KV namespace
```bash
wrangler kv:namespace create REPORT_KV
```
Copy the id into `wrangler.toml`.

2) Create D1 database
```bash
wrangler d1 create jira_monitor_DB
```
Copy the database id into `wrangler.toml`.

3) Create D1 tables
```bash
wrangler d1 execute jira_monitor_DB --file schema/token_db.sql --remote
```

4) Set secrets
```bash
wrangler secret put JIRA_EMAIL
wrangler secret put JIRA_API_TOKEN
wrangler secret put RESEND_API_KEY
wrangler secret put RESEND_FROM_EMAIL
wrangler secret put GMAIL_CLIENT_ID
wrangler secret put GMAIL_CLIENT_SECRET
wrangler secret put GMAIL_REFRESH_TOKEN
wrangler secret put GMAIL_SENDER_EMAIL
wrangler secret put GMAIL_SENDER_NAME
wrangler secret put SLACK_WEBHOOK_URL
```

5) Deploy
```bash
pnpm run deploy
```

## Configuration

### wrangler.toml (vars)
| Variable | Description |
|---|---|
| `JIRA_BASE_URL` | Jira instance URL |
| `TIMEZONE` | e.g. `Asia/Tokyo` |
| `WORKER_BASE_URL` | Public base URL |
| `SUPER_ADMIN_TOKEN` | 6-digit admin code |

### Secrets
| Secret | Description |
|---|---|
| `JIRA_EMAIL` | Jira account email |
| `JIRA_API_TOKEN` | Jira API token |
| `RESEND_API_KEY` | Resend API key (internal emails) |
| `RESEND_FROM_EMAIL` | Sender email (internal emails) |
| `GMAIL_CLIENT_ID` | Google OAuth client id |
| `GMAIL_CLIENT_SECRET` | Google OAuth client secret |
| `GMAIL_REFRESH_TOKEN` | Google OAuth refresh token |
| `GMAIL_SENDER_EMAIL` | Sender email |
| `GMAIL_SENDER_NAME` | Sender display name |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook |

## Admin UI
- `/config` for settings and admin tools
- Tokens and logs are inside `/config` sections

## API Docs
- `/docs` includes auth badges per endpoint
- `/admin/*` endpoints require session or bearer

## Security Notes
- Do not commit real account IDs, tokens, or domains
- Use placeholders in `wrangler.toml`
- Use secrets for credentials

## Testing
```bash
pnpm test
```

## License
ISC
