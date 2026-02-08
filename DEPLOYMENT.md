# Deployment Guide

This guide is minimal and copy-paste friendly.

## 1) Prerequisites
- Cloudflare account
- Wrangler CLI installed

## 2) Configure `wrangler.toml`
Set the placeholders in `wrangler.toml`:
- `account_id`
- `routes` domain
- `REPORT_KV` id
- `TOKEN_DB` database id
- `JIRA_BASE_URL`
- `WORKER_BASE_URL`
- `SUPER_ADMIN_TOKEN`

## 3) Create KV
```bash
wrangler kv:namespace create REPORT_KV
```
Copy the id into `wrangler.toml`.

## 4) Create D1
```bash
wrangler d1 create jira_monitor_DB
```
Copy the database id into `wrangler.toml`.

## 5) Create Tables
```bash
wrangler d1 execute jira_monitor_DB --file schema/token_db.sql --remote
```

## 6) Secrets
```bash
wrangler secret put JIRA_EMAIL
wrangler secret put JIRA_API_TOKEN
wrangler secret put RESEND_API_KEY
wrangler secret put RESEND_FROM_EMAIL
wrangler secret put SLACK_WEBHOOK_URL
```

## 7) Deploy
```bash
pnpm run deploy
```

## 8) Verify
- Open `/config` and log in using the super admin token
- Create a token and verify `/config#tokens` list updates
- Check `/docs` for endpoint auth badges
