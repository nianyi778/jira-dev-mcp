import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRegisterDefaultClients = vi.fn();

vi.mock('./client-setup.js', () => ({
  registerDefaultClients: mockRegisterDefaultClients,
}));

describe('cmdSetup', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('prints registration summary when setup succeeds', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit');
    }) as never);

    mockRegisterDefaultClients.mockResolvedValue({
      registered: ['Claude Code'],
      alreadyRegistered: ['OpenCode'],
      errors: [],
    });

    const { cmdSetup } = await import('./cli.js');
    await cmdSetup();

    expect(mockRegisterDefaultClients).toHaveBeenCalledWith('jira', { command: 'jira-dev', args: ['server'] });
    expect(logSpy).toHaveBeenCalledWith('✓ Registered in Claude Code');
    expect(logSpy).toHaveBeenCalledWith('✓ Already registered in OpenCode');
    expect(logSpy).toHaveBeenCalledWith('\nRestart your MCP client to load the server.');
    expect(errorSpy).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('exits when setup reports config errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit');
    }) as never);

    mockRegisterDefaultClients.mockResolvedValue({
      registered: [],
      alreadyRegistered: [],
      errors: ['Claude Code: Config file is not valid JSON: /tmp/.claude.json'],
    });

    const { cmdSetup } = await import('./cli.js');
    await expect(cmdSetup()).rejects.toThrow('process.exit');
    expect(errorSpy).toHaveBeenCalledWith('✗ Claude Code: Config file is not valid JSON: /tmp/.claude.json');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
