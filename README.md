# jira-mcp-server

`jira-mcp-server` is a local MCP server for Jira Cloud-driven development. It helps Claude Code, OpenCode, Codex, and other MCP clients search Jira issues, read task details, inspect attachments, parse common spreadsheets and PDFs, and map Jira projects to local repositories.

## Features

- Global Jira search with keyword search or raw JQL
- Read full Jira task details, subtasks, recent changelog, and optional comments
- Download attachments with size and MIME allowlist checks
- Parse CSV, XLSX, XLS, and PDF attachments through Python for AI-friendly analysis
- Leave images and other small binary files to the AI client after download
- Remember local project paths in `~/.jira-dev/config.json`
- Read-only Jira access by default

## Security Defaults

- Never store `JIRA_TOKEN` in plaintext config by default.
- Credential priority is `ENV (recommended) > macOS Keychain (optional) > ~/.jira-dev/config.json`.
- Attachments are metadata-only until explicitly downloaded.
- Comments are opt-in and changelog is paginated.
- Secrets are never written to logs.

## Configuration

Create `~/.jira-dev/config.json`:

```json
{
  "jira": {
    "baseUrl": "https://your-domain.atlassian.net",
    "authMode": "basic",
    "email": "you@example.com"
  },
  "projects": {
    "AT": "/Users/likai/elestyle/backend"
  },
  "security": {
    "maxAttachmentSizeBytes": 10485760,
    "allowedMimeTypes": [
      "text/*",
      "application/json",
      "application/pdf",
      "image/*",
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.oasis.opendocument.spreadsheet"
    ]
  }
}
```

Recommended environment variables:

- `JIRA_BASE_URL`
- `JIRA_EMAIL`
- `JIRA_TOKEN`
- `JIRA_AUTH_MODE` (`basic` by default)

Optional compatibility variables:

- `JIRA_API_TOKEN` as a legacy alias for `JIRA_TOKEN`
- `JIRA_AUTH_MODE=bearer` for non-Jira-Cloud environments that really support bearer auth

Optional macOS Keychain entry:

```bash
security add-generic-password -a "$USER" -s "jira-dev-mcp:JIRA_TOKEN" -w "your-jira-token"
```

## Install

```bash
npm install
npm run build
```

Python 3 is used for attachment parsing. Most AI coding environments already have it. For `.csv` and `.xlsx`, the bundled parser works with the Python standard library. For `.xls` and `.pdf`, the server will try to install parser dependencies automatically on first use, or you can install them yourself:

```bash
python3 -m pip install -r scripts/requirements.txt
```

## MCP Client Configuration

Build first so each client points at `dist/index.js`:

```bash
npm run build
```

Use the absolute path for your local checkout:

`/Users/likai/elestyle/backend/scripts/jira-dev-mcp/dist/index.js`

### Claude Code

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": [
        "/Users/likai/elestyle/backend/scripts/jira-dev-mcp/dist/index.js"
      ]
    }
  }
}
```

### OpenCode

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": [
        "/Users/likai/elestyle/backend/scripts/jira-dev-mcp/dist/index.js"
      ]
    }
  }
}
```

### Codex

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": [
        "/Users/likai/elestyle/backend/scripts/jira-dev-mcp/dist/index.js"
      ]
    }
  }
}
```

### Environment Example

```bash
export JIRA_BASE_URL="https://your-domain.atlassian.net"
export JIRA_EMAIL="you@example.com"
export JIRA_TOKEN="your-jira-api-token"
export JIRA_AUTH_MODE="basic"
node /Users/likai/elestyle/backend/scripts/jira-dev-mcp/dist/index.js
```

## Tools

- `jira_search_issues`
- `jira_read_task`
- `jira_download_attachment`
- `jira_list_my_tasks`
- `jira_set_project_path`
- `jira_get_project_path`

## Development Workflow

1. Search issues with `jira_search_issues`
2. Read one issue with `jira_read_task`
3. Resolve the local repo with `jira_get_project_path`
4. Download and parse any useful attachment with `jira_download_attachment`
5. Read code and produce:

- root cause
- plan
- impact scope
- test cases

## Inspector

Local inspector command:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Notes

- `jira_read_task` returns issue data. The AI client should do the code analysis after reading the issue and local project.
- `jira_set_project_path` validates that the path exists and is a directory.
- Large raw attachment payloads are truncated to keep MCP responses usable.
- If Python parsing is unavailable, the server falls back to raw attachment content.
