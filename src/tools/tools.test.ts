import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockLoadResolvedConfig = vi.fn();
const mockEnsureJiraCredentials = vi.fn();
const mockGetProjectPath = vi.fn();
const mockSetProjectPath = vi.fn();
const mockSearchIssues = vi.fn();
const mockReadIssue = vi.fn();
const mockDownloadAttachment = vi.fn();
const mockGetMyTasks = vi.fn();
const mockAddComment = vi.fn();

vi.mock('../config.js', () => ({
  loadResolvedConfig: mockLoadResolvedConfig,
  ensureJiraCredentials: mockEnsureJiraCredentials,
  getProjectPath: mockGetProjectPath,
  setProjectPath: mockSetProjectPath,
}));

vi.mock('../jira-client.js', () => ({
  searchIssues: mockSearchIssues,
  readIssue: mockReadIssue,
  downloadAttachment: mockDownloadAttachment,
  getMyTasks: mockGetMyTasks,
  addComment: mockAddComment,
}));

describe('tool handlers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockLoadResolvedConfig.mockResolvedValue({
      jira: {
        baseUrl: 'https://example.atlassian.net',
        authMode: 'basic',
        email: 'dev@example.com',
        token: 'token',
      },
      projects: { AT: '/tmp/backend' },
      security: {
        maxAttachmentSizeBytes: 10485760,
        allowedMimeTypes: ['text/*'],
      },
      warnings: ['plaintext token warning'],
    });
    mockEnsureJiraCredentials.mockImplementation(() => {});
    mockGetProjectPath.mockResolvedValue('/tmp/backend');
  });

  it('handleJiraSearch returns formatted data with pagination metadata', async () => {
    mockSearchIssues.mockResolvedValue({
      query: 'text ~ "login" ORDER BY updated DESC',
      startAt: 0,
      maxResults: 10,
      total: 12,
      issues: [
        {
          key: 'AT-101',
          summary: 'Login page crashes',
          status: 'In Progress',
          assignee: 'Kai Li',
          issueType: 'Bug',
          parentKey: null,
        },
      ],
    });

    const { handleJiraSearch } = await import('./search.js');
    const result = await handleJiraSearch({ query: 'login', response_format: 'json' });

    expect(mockSearchIssues).toHaveBeenCalled();
    expect(result.data.has_more).toBe(true);
    expect(result.data.next_offset).toBe(1);
    expect(result.text).toContain('AT-101');
  });

  it('handleReadTask returns issue data and project path hint', async () => {
    mockReadIssue.mockResolvedValue({
      key: 'AT-101',
      summary: 'Login page crashes',
      descriptionPlainText: 'Crash after oauth callback',
      status: 'In Progress',
      assignee: 'Kai Li',
      issueType: 'Bug',
      priority: 'High',
      labels: ['login'],
      parent: null,
      subtasks: [],
      attachments: [],
      comments: {
        enabled: false,
        startAt: 0,
        maxResults: 0,
        total: 0,
        items: [],
      },
      changelog: {
        startAt: 0,
        maxResults: 20,
        total: 0,
        items: [],
      },
    });

    const { handleReadTask } = await import('./read-task.js');
    const result = await handleReadTask({ key: 'AT-101', response_format: 'markdown' });

    expect(mockReadIssue).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ key: 'AT-101' }));
    expect(result.data.project.localPath).toBe('/tmp/backend');
    expect(result.data.project.needsUserInput).toBe(false);
    expect(result.text).toContain('Read code under /tmp/backend');
  });

  it('handleMyTasks returns paginated tasks with has_more metadata', async () => {
    mockGetMyTasks.mockResolvedValue({
      query: 'assignee = currentUser() ORDER BY updated DESC',
      startAt: 0,
      maxResults: 10,
      total: 5,
      issues: [
        {
          key: 'AT-200',
          summary: 'Fix auth bug',
          status: 'In Progress',
          assignee: 'Kai Li',
          issueType: 'Bug',
          parentKey: null,
        },
      ],
    });

    const { handleMyTasks } = await import('./my-tasks.js');
    const result = await handleMyTasks({ status: 'In Progress', response_format: 'json' });

    expect(mockGetMyTasks).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'In Progress' })
    );
    expect(result.data.has_more).toBe(true);
    expect(result.data.next_offset).toBe(1);
    expect(result.text).toContain('AT-200');
  });

  it('handleDownloadAttachment returns parsed attachment text and data', async () => {
    mockDownloadAttachment.mockResolvedValue({
      issueKey: 'AT-101',
      filename: 'report.csv',
      mimeType: 'text/csv',
      size: 512,
      encoding: 'utf8',
      content: 'col1,col2\nval1,val2',
      truncated: false,
      parsed: { format: 'csv', parser: 'python', summary: 'CSV with 2 rows' },
    });

    const { handleDownloadAttachment } = await import('./attachment.js');
    const result = await handleDownloadAttachment({ key: 'AT-101', filename: 'report.csv', response_format: 'markdown' });

    expect(mockDownloadAttachment).toHaveBeenCalledWith(
      expect.anything(),
      { key: 'AT-101', filename: 'report.csv' }
    );
    expect(result.data.attachment.parsed?.format).toBe('csv');
    expect(result.text).toContain('report.csv');
    expect(result.text).toContain('CSV with 2 rows');
  });

  it('handleDownloadAttachment throws on missing key or filename', async () => {
    const { handleDownloadAttachment } = await import('./attachment.js');
    await expect(handleDownloadAttachment({ key: '', filename: 'file.csv' })).rejects.toThrow('requires key and filename');
    await expect(handleDownloadAttachment({ key: 'AT-101', filename: '' })).rejects.toThrow('requires key and filename');
  });

  it('handleSetProjectPath saves and returns the project mapping', async () => {
    mockSetProjectPath.mockResolvedValue({ projectKey: 'AT', localPath: '/workspace/at-repo' });

    const { handleSetProjectPath } = await import('./project.js');
    const result = await handleSetProjectPath({ jiraProject: 'AT', localPath: '/workspace/at-repo' });

    expect(mockSetProjectPath).toHaveBeenCalledWith('AT', '/workspace/at-repo');
    expect(result.projectKey).toBe('AT');
    expect(result.localPath).toBe('/workspace/at-repo');
  });

  it('handleGetProjectPath returns configured path in json format', async () => {
    mockGetProjectPath.mockResolvedValue('/workspace/at-repo');

    const { handleGetProjectPath } = await import('./project.js');
    const result = await handleGetProjectPath({ jiraProject: 'AT', response_format: 'json' });

    expect(result.data.projectKey).toBe('AT');
    expect(result.data.localPath).toBe('/workspace/at-repo');
  });

  it('handleGetProjectPath returns null when path is not configured', async () => {
    mockGetProjectPath.mockResolvedValue(null);

    const { handleGetProjectPath } = await import('./project.js');
    const result = await handleGetProjectPath({ jiraProject: 'UNKNOWN', response_format: 'markdown' });

    expect(result.data.localPath).toBeNull();
    expect(result.text).toContain('no configured local path');
  });

  it('handleAddComment validates input and forwards the request', async () => {
    mockAddComment.mockResolvedValue({ commentId: 'c-1', url: 'https://example.atlassian.net/browse/AT-101?focusedCommentId=c-1' });

    const { handleAddComment } = await import('./comment.js');
    const result = await handleAddComment({ key: 'at-101', body: 'Looks good' });

    expect(mockAddComment).toHaveBeenCalledWith(expect.anything(), { key: 'AT-101', body: 'Looks good' });
    expect(result.commentId).toBe('c-1');
  });

  it('handleAddComment throws on missing key or body', async () => {
    const { handleAddComment } = await import('./comment.js');
    await expect(handleAddComment({ key: '', body: 'hi' })).rejects.toThrow('requires key and body');
    await expect(handleAddComment({ key: 'AT-101', body: '' })).rejects.toThrow('requires key and body');
  });
});
