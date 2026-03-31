# jira-dev-mcp

A local MCP server for Jira Cloud-driven development. Connects Claude Code, OpenCode, Codex, and other MCP clients to your Jira instance — search issues, read task details, parse attachments, and map Jira projects to local repositories.

[![npm version](https://img.shields.io/npm/v/jira-dev-mcp.svg)](https://www.npmjs.com/package/jira-dev-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Features

- Search Jira issues with natural language or raw JQL
- Read full task details: description, subtasks, changelog, comments, attachments
- Download and parse CSV, XLSX, XLS, PDF attachments via Python
- Images and binary files passed to AI client as base64
- Map Jira project keys to local repository paths
- OAuth 2.0 (3LO) browser-based login — no manual token management
- Auto-refresh OAuth tokens before expiry
- Read-only Jira access by default

## Install

```bash
npm install -g jira-dev-mcp
```

## Authentication

### Option A: OAuth 2.0 (Recommended)

1. Create an OAuth 2.0 app at [developer.atlassian.com/console/myapps](https://developer.atlassian.com/console/myapps/)
   - Add callback URL: `http://localhost:3737/callback`
   - Add scopes: `read:jira-work`, `read:jira-user`, `offline_access`

2. Run the login command:

```bash
export JIRA_CLIENT_ID=<your-client-id>
export JIRA_CLIENT_SECRET=<your-client-secret>
jira-mcp-login
```

Tokens are saved to `~/.jira-dev/config.json` and auto-refreshed.

### Option B: API Token (Basic Auth)

```bash
export JIRA_BASE_URL="https://your-domain.atlassian.net"
export JIRA_EMAIL="you@example.com"
export JIRA_TOKEN="your-jira-api-token"
```

Optional — store token in macOS Keychain instead of env var:

```bash
security add-generic-password -a "$USER" -s "jira-dev-mcp:JIRA_TOKEN" -w "your-token"
```

## MCP Client Configuration

### Claude Code (`~/.claude/mcp.json`)

```json
{
  "mcpServers": {
    "jira": {
      "command": "jira-mcp-server"
    }
  }
}
```

### OpenCode / Codex

```json
{
  "mcpServers": {
    "jira": {
      "command": "jira-mcp-server"
    }
  }
}
```

### With environment variables

```json
{
  "mcpServers": {
    "jira": {
      "command": "jira-mcp-server",
      "env": {
        "JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "JIRA_EMAIL": "you@example.com",
        "JIRA_TOKEN": "your-token"
      }
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `jira_search_issues` | Search by keywords or JQL |
| `jira_read_task` | Read full issue details |
| `jira_download_attachment` | Download and parse attachments |
| `jira_my_tasks` | List issues assigned to you |
| `jira_set_project_path` | Map a Jira project to a local repo path |
| `jira_get_project_path` | Get the local path for a project |

## Development Workflow

1. `jira_my_tasks` — find what to work on
2. `jira_read_task` — read task details and attachment list
3. `jira_download_attachment` — parse specs, CSV data, or PDFs
4. AI reads local code via `project.localPath` from step 2
5. Implement, test, done

## Project Path Mapping

Map a Jira project key to a local repo so the AI knows where to look:

```
jira_set_project_path(jiraProject: "AT", localPath: "/Users/you/projects/my-app")
```

## Python Dependency (Attachment Parsing)

Python 3 is required for CSV, XLSX, XLS, and PDF parsing. For XLS and PDF, additional packages are auto-installed on first use, or install manually:

```bash
python3 -m pip install -r $(npm root -g)/jira-dev-mcp/scripts/requirements.txt
```

## Security

- OAuth tokens stored at `~/.jira-dev/config.json` with `600` permissions
- API tokens: prefer env vars or macOS Keychain over config file
- Attachment size and MIME type allowlist enforced before download
- Secrets are never written to logs

## Local Development

```bash
git clone https://github.com/nianyi778/jira-dev-mcp.git
cd jira-dev-mcp
npm install
npm test
npm run build
```

Inspect tools interactively:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## License

MIT
