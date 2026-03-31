import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { realpathSync } from 'node:fs';
import { z } from 'zod';
import { handleJiraSearch } from './tools/search.js';
import { handleReadTask } from './tools/read-task.js';
import { handleDownloadAttachment } from './tools/attachment.js';
import { handleMyTasks } from './tools/my-tasks.js';
import { handleSetProjectPath, handleGetProjectPath } from './tools/project.js';
import { handleAddComment } from './tools/comment.js';

function textContent(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

const TOOL_DEFINITIONS = [
  {
    name: 'jira_search_issues',
    description: 'Search Jira issues using natural language keywords or raw JQL. Returns issue keys, summaries, statuses, and assignees.',
    inputSchema: {
      query: z.string().describe('Search query (keywords or JQL)'),
      maxResults: z.number().int().min(1).max(50).optional().describe('Max results to return (1-50, default 10)'),
      startAt: z.number().int().min(0).optional().describe('Pagination offset (default 0)'),
      response_format: z.enum(['json', 'markdown']).optional().describe('Output format (default json)'),
    },
    handler: async (args: unknown) => {
      const result = await handleJiraSearch(args);
      return textContent(result.text);
    },
  },
  {
    name: 'jira_read_task',
    description: 'Read full details of a Jira issue including description, subtasks, changelog, labels, priority, parent, and attachments list.',
    inputSchema: {
      key: z.string().describe('Jira issue key (e.g. AT-123)'),
      includeComments: z.boolean().optional().describe('Include comments (default false)'),
      commentStartAt: z.number().int().min(0).optional().describe('Comment pagination offset'),
      commentMaxResults: z.number().int().min(1).max(50).optional().describe('Max comments (1-50, default 20)'),
      changelogStartAt: z.number().int().min(0).optional().describe('Changelog pagination offset'),
      changelogMaxResults: z.number().int().min(1).max(100).optional().describe('Max changelog entries (1-100, default 20)'),
      response_format: z.enum(['json', 'markdown']).optional().describe('Output format (default json)'),
    },
    handler: async (args: unknown) => {
      const result = await handleReadTask(args);
      return textContent(result.text);
    },
  },
  {
    name: 'jira_download_attachment',
    description: 'Download an attachment from a Jira issue. Text files (txt, md, json, log) are returned inline. CSV, XLS, XLSX, PDF are parsed by Python and returned as structured text. Images and other binary files are returned as base64.',
    inputSchema: {
      key: z.string().describe('Jira issue key (e.g. AT-123)'),
      filename: z.string().describe('Attachment filename as listed in jira_read_task'),
      response_format: z.enum(['json', 'markdown']).optional().describe('Output format (default json)'),
    },
    handler: async (args: unknown) => {
      const result = await handleDownloadAttachment(args);
      return textContent(result.text);
    },
  },
  {
    name: 'jira_my_tasks',
    description: 'List Jira issues assigned to the currently authenticated user, optionally filtered by status.',
    inputSchema: {
      status: z.string().optional().describe('Filter by status name (e.g. "In Progress", "To Do")'),
      maxResults: z.number().int().min(1).max(50).optional().describe('Max results (1-50, default 10)'),
      startAt: z.number().int().min(0).optional().describe('Pagination offset (default 0)'),
      response_format: z.enum(['json', 'markdown']).optional().describe('Output format (default json)'),
    },
    handler: async (args: unknown) => {
      const result = await handleMyTasks(args);
      return textContent(result.text);
    },
  },
  {
    name: 'jira_set_project_path',
    description: 'Map a Jira project key to a local repository path. This enables jira_read_task to include the local path hint for code exploration.',
    inputSchema: {
      jiraProject: z.string().describe('Jira project key (e.g. AT)'),
      localPath: z.string().describe('Absolute local path to the project repository'),
    },
    handler: async (args: unknown) => {
      const result = await handleSetProjectPath(args);
      return textContent(JSON.stringify(result, null, 2));
    },
  },
  {
    name: 'jira_get_project_path',
    description: 'Get the local repository path mapped to a Jira project key.',
    inputSchema: {
      jiraProject: z.string().describe('Jira project key (e.g. AT)'),
      response_format: z.enum(['json', 'markdown']).optional().describe('Output format (default json)'),
    },
    handler: async (args: unknown) => {
      const result = await handleGetProjectPath(args);
      return textContent(result.text);
    },
  },
  {
    name: 'jira_add_comment',
    description: 'Post a comment on a Jira issue. Returns the comment URL so you can verify it directly.',
    inputSchema: {
      key: z.string().describe('Jira issue key (e.g. AT-123)'),
      body: z.string().describe('Comment text (plain text, will be wrapped in ADF paragraph)'),
    },
    handler: async (args: unknown) => {
      const result = await handleAddComment(args);
      return textContent(`Comment posted successfully.\n\nView comment: ${result.url}`);
    },
  },
] as const;

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'jira-dev-mcp',
    version: '1.1.6',
  });

  for (const tool of TOOL_DEFINITIONS) {
    server.registerTool(tool.name, {
      description: tool.description,
      inputSchema: tool.inputSchema,
    }, tool.handler);
  }

  return server;
}

export async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (process.argv[1] && realpathSync(resolve(process.argv[1])) === fileURLToPath(import.meta.url)) {
  main().catch((err: unknown) => {
    process.stderr.write(`MCP server error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
