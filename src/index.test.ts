import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRegisterTool = vi.fn();
const mockConnect = vi.fn();
const mockServerCtor = vi.fn(function(this: { registerTool: typeof mockRegisterTool; connect: typeof mockConnect }) {
  this.registerTool = mockRegisterTool;
  this.connect = mockConnect;
});

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: mockServerCtor,
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(),
}));

vi.mock('./tools/search.js', () => ({
  handleJiraSearch: vi.fn().mockResolvedValue({ text: 'search result' }),
}));
vi.mock('./tools/read-task.js', () => ({
  handleReadTask: vi.fn().mockResolvedValue({ text: 'read result' }),
}));
vi.mock('./tools/attachment.js', () => ({
  handleDownloadAttachment: vi.fn().mockResolvedValue({ text: 'attachment result' }),
}));
vi.mock('./tools/my-tasks.js', () => ({
  handleMyTasks: vi.fn().mockResolvedValue({ text: 'my tasks result' }),
}));
vi.mock('./tools/project.js', () => ({
  handleSetProjectPath: vi.fn().mockResolvedValue({ projectKey: 'AT', localPath: '/tmp/at' }),
  handleGetProjectPath: vi.fn().mockResolvedValue({ text: 'project path result' }),
}));
vi.mock('./tools/comment.js', () => ({
  handleAddComment: vi.fn().mockResolvedValue({ commentId: 'c-1', url: 'https://example/comment' }),
}));

describe('createServer', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('registers all supported tools with the expected server metadata', async () => {
    const { createServer } = await import('./index.js');
    createServer();

    expect(mockServerCtor).toHaveBeenCalledWith({ name: 'jira-dev-mcp', version: '1.1.5' });
    expect(mockRegisterTool).toHaveBeenCalledTimes(7);
    expect(mockRegisterTool.mock.calls.map((call) => call[0])).toEqual([
      'jira_search_issues',
      'jira_read_task',
      'jira_download_attachment',
      'jira_my_tasks',
      'jira_set_project_path',
      'jira_get_project_path',
      'jira_add_comment',
    ]);
  });

  it('wraps handler output into MCP text content', async () => {
    const { createServer } = await import('./index.js');
    createServer();

    const searchToolHandler = mockRegisterTool.mock.calls.find((call) => call[0] === 'jira_search_issues')?.[2];
    const commentToolHandler = mockRegisterTool.mock.calls.find((call) => call[0] === 'jira_add_comment')?.[2];

    await expect(searchToolHandler({ query: 'login' })).resolves.toEqual({
      content: [{ type: 'text', text: 'search result' }],
    });
    await expect(commentToolHandler({ key: 'AT-1', body: 'ok' })).resolves.toEqual({
      content: [{ type: 'text', text: 'Comment posted successfully.\n\nView comment: https://example/comment' }],
    });
  });
});
