# jira-dev-mcp

Jira Cloud 連携のローカル MCP サーバー。Claude Code、OpenCode、Codex などの MCP クライアントから Jira の Issue 検索、タスク詳細読み込み、添付ファイル解析、ローカルリポジトリとのマッピングができます。

[![npm version](https://img.shields.io/npm/v/jira-dev-mcp.svg)](https://www.npmjs.com/package/jira-dev-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**他の言語：** [English](README.md) · [中文](README.zh.md)

## 機能

- キーワードまたは生の JQL で Issue を検索
- タスクの全詳細を取得：説明、サブタスク、変更履歴、コメント、添付ファイル一覧
- Python で CSV、XLSX、XLS、PDF 添付ファイルを解析
- 画像・バイナリファイルは base64 で AI クライアントに返却
- Jira プロジェクトキーとローカルリポジトリパスのマッピング
- OAuth 2.0 (3LO) ブラウザログイン — トークンの手動管理不要
- OAuth トークンの有効期限前に自動リフレッシュ
- デフォルトで Jira への読み取り専用アクセス

## インストール

```bash
npm install -g jira-dev-mcp
```

## 認証設定

### 方法 A：OAuth 2.0（推奨）

1. [developer.atlassian.com/console/myapps](https://developer.atlassian.com/console/myapps/) で OAuth 2.0 アプリを作成
   - コールバック URL を追加：`http://localhost:3737/callback`
   - スコープを追加：`read:jira-work`、`read:jira-user`、`offline_access`

2. ログインコマンドを実行：

```bash
export JIRA_CLIENT_ID=<your-client-id>
export JIRA_CLIENT_SECRET=<your-client-secret>
jira-mcp-login
```

トークンは `~/.jira-dev/config.json` に保存され、期限前に自動更新されます。

### 方法 B：API トークン（Basic 認証）

```bash
export JIRA_BASE_URL="https://your-domain.atlassian.net"
export JIRA_EMAIL="you@example.com"
export JIRA_TOKEN="your-jira-api-token"
```

macOS キーチェーンへの保存（推奨）：

```bash
security add-generic-password -a "$USER" -s "jira-dev-mcp:JIRA_TOKEN" -w "your-token"
```

## MCP クライアント設定

### Claude Code（`~/.claude/mcp.json`）

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

## ツール一覧

| ツール | 説明 |
|--------|------|
| `jira_search_issues` | キーワードまたは JQL で検索 |
| `jira_read_task` | Issue の全詳細を取得 |
| `jira_download_attachment` | 添付ファイルをダウンロード・解析 |
| `jira_my_tasks` | 自分に割り当てられたタスク一覧 |
| `jira_set_project_path` | Jira プロジェクトとローカルパスをマッピング |
| `jira_get_project_path` | プロジェクトのローカルパスを取得 |

## 標準的な使用フロー

**ステップ 1 — 初回設定：プロジェクトパスのマッピング**

```
jira_set_project_path(jiraProject: "AT", localPath: "/path/to/your/repo")
```

**ステップ 2 — 担当タスクを確認**

```
jira_my_tasks(status: "In Progress")
```

またはキーワード / JQL で検索：

```
jira_search_issues(query: "ログインタイムアウト バグ")
jira_search_issues(query: "project = AT AND sprint in openSprints()")
```

**ステップ 3 — タスク詳細を読み込む**

```
jira_read_task(key: "AT-123", includeComments: true)
```

返却内容：説明、サブタスク、変更履歴、コメント、添付ファイル一覧、ローカルリポジトリパス。

**ステップ 4 — 必要に応じて添付ファイルをダウンロード**

```
jira_download_attachment(key: "AT-123", filename: "spec.xlsx")
```

CSV / XLSX / XLS / PDF は構造化テキストとして解析されます。画像は base64 で返却。

**ステップ 5 — AI が修正を実装**

タスク詳細とローカルリポジトリパスを踏まえて Claude Code に依頼：

- 根本原因の分析
- 修正方針と影響範囲の提案
- 修正の実装
- テストケースの作成

## セキュリティ

- OAuth トークンは `~/.jira-dev/config.json` に保存（パーミッション `600`）
- API トークンは環境変数または macOS キーチェーン推奨
- ダウンロード前にファイルサイズと MIME タイプのホワイトリストを検証
- 機密情報はログに出力しない

## ローカル開発

```bash
git clone https://github.com/nianyi778/jira-dev-mcp.git
cd jira-dev-mcp
npm install
npm test
npm run build
```

インタラクティブなデバッグ：

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## ライセンス

MIT
