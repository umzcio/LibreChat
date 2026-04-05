import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';

const USER_ID = '507f1f77bcf86cd799439011';

describe('createCodeWorkspaceService', () => {
  let workspaceRoot: string;
  let createCodeWorkspaceService: typeof import('./service').createCodeWorkspaceService;

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'librecode-'));
    process.env.LIBRECODE_WORKSPACE_ROOT = workspaceRoot;
    jest.resetModules();
    ({ createCodeWorkspaceService } = await import('./service'));
  });

  afterEach(async () => {
    delete process.env.LIBRECODE_WORKSPACE_ROOT;
    await fs.rm(workspaceRoot, { recursive: true, force: true });
    jest.resetModules();
  });

  it('derives project context from the conversation instead of the workspace session', async () => {
    const sessionRoot = path.join(workspaceRoot, USER_ID, 'sessions', 'convo_1');
    await fs.mkdir(sessionRoot, { recursive: true });

    const deps = {
      createProject: jest.fn(),
      createFile: jest.fn(),
      deleteFileByFilter: jest.fn(),
      findFileById: jest.fn(),
      getConvo: jest.fn().mockResolvedValue({
        conversationId: 'convo_1',
        projectId: 'project_1',
      }),
      getProject: jest.fn(),
      getProjectFiles: jest.fn().mockResolvedValue([]),
      getWorkspaceSession: jest.fn().mockResolvedValue({
        conversationId: 'convo_1',
        mode: 'code',
        workingCopyRoot: sessionRoot,
        openFiles: ['README.md'],
        activeFile: 'README.md',
        fileBindings: [],
      }),
      saveConvo: jest.fn(),
      upsertWorkspaceSession: jest.fn(),
      updateFile: jest.fn(),
    };

    const service = createCodeWorkspaceService(deps as never);
    const result = await service.bootstrapWorkspace(USER_ID, 'convo_1');

    expect(result).toEqual({
      activeFile: '/README.md',
      conversationId: 'convo_1',
      hasProject: true,
      mode: 'code',
      openFiles: ['/README.md'],
      projectId: 'project_1',
    });
    expect(deps.getProjectFiles).not.toHaveBeenCalled();
  });

  it('clears active and open file state when a workspace file is deleted', async () => {
    const sessionRoot = path.join(workspaceRoot, USER_ID, 'sessions', 'convo_2');
    await fs.mkdir(path.join(sessionRoot, 'src'), { recursive: true });
    await fs.writeFile(path.join(sessionRoot, 'src', 'app.ts'), 'console.log("hi");', 'utf8');
    await fs.writeFile(path.join(sessionRoot, 'README.md'), '# docs', 'utf8');

    const session = {
      conversationId: 'convo_2',
      mode: 'code',
      workingCopyRoot: sessionRoot,
      openFiles: ['src/app.ts', 'README.md'],
      activeFile: 'src/app.ts',
      fileBindings: [],
    };

    const deps = {
      createProject: jest.fn(),
      createFile: jest.fn(),
      deleteFileByFilter: jest.fn(),
      findFileById: jest.fn(),
      getConvo: jest.fn().mockResolvedValue({ conversationId: 'convo_2' }),
      getProject: jest.fn(),
      getProjectFiles: jest.fn().mockResolvedValue([]),
      getWorkspaceSession: jest.fn().mockResolvedValue(session),
      saveConvo: jest.fn(),
      upsertWorkspaceSession: jest.fn().mockResolvedValue({
        ...session,
        activeFile: undefined,
        openFiles: ['README.md'],
      }),
      updateFile: jest.fn(),
    };

    const service = createCodeWorkspaceService(deps as never);
    const result = await service.deleteItem(USER_ID, 'convo_2', '/src/app.ts');

    expect(result).toEqual({ deleted: true, path: '/src/app.ts' });
    await expect(fs.access(path.join(sessionRoot, 'src', 'app.ts'))).rejects.toThrow();
    expect(deps.upsertWorkspaceSession).toHaveBeenCalledWith(
      USER_ID,
      'convo_2',
      expect.objectContaining({
        activeFile: undefined,
        openFiles: ['README.md'],
      }),
    );
  });

  it('links the conversation to a project before importing workspace files on promotion', async () => {
    const sessionRoot = path.join(workspaceRoot, USER_ID, 'sessions', 'convo_3');
    await fs.mkdir(sessionRoot, { recursive: true });
    await fs.writeFile(path.join(sessionRoot, 'index.ts'), 'console.log("hi");', 'utf8');

    const session = {
      conversationId: 'convo_3',
      mode: 'code',
      workingCopyRoot: sessionRoot,
      openFiles: ['index.ts'],
      activeFile: 'index.ts',
      fileBindings: [],
    };

    const deps = {
      createProject: jest.fn().mockResolvedValue({
        name: 'API Playground',
        projectId: 'project_promoted',
      }),
      createFile: jest.fn().mockResolvedValue({
        file_id: 'file_1',
      }),
      deleteFileByFilter: jest.fn(),
      findFileById: jest.fn(),
      getConvo: jest
        .fn()
        .mockResolvedValueOnce({
          conversationId: 'convo_3',
          title: 'API Playground',
        })
        .mockResolvedValue({
          conversationId: 'convo_3',
          projectId: 'project_promoted',
          title: 'API Playground',
        }),
      getProject: jest.fn().mockResolvedValue(null),
      getProjectFiles: jest.fn().mockResolvedValue([]),
      getWorkspaceSession: jest.fn().mockResolvedValue(session),
      saveConvo: jest.fn().mockResolvedValue({
        conversationId: 'convo_3',
        projectId: 'project_promoted',
      }),
      upsertWorkspaceSession: jest.fn().mockImplementation(async (_userId, _conversationId, update) => ({
        ...session,
        ...update,
      })),
      updateFile: jest.fn(),
    };

    const service = createCodeWorkspaceService(deps as never);
    const result = await service.promoteWorkspace(USER_ID, 'convo_3', {
      projectName: 'API Playground',
    });

    expect(result).toMatchObject({
      activeFile: '/index.ts',
      conversationId: 'convo_3',
      hasProject: true,
      projectId: 'project_promoted',
    });
    expect(deps.saveConvo).toHaveBeenCalledWith(
      { userId: USER_ID },
      { conversationId: 'convo_3', projectId: 'project_promoted' },
      expect.objectContaining({
        context: '[code] promote workspace to project',
        noUpsert: true,
      }),
    );
    expect(deps.createFile).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'index.ts',
        projectId: 'project_promoted',
        source: 'local',
        text: 'console.log("hi");',
      }),
      true,
    );
    expect(deps.saveConvo.mock.invocationCallOrder[0]).toBeLessThan(
      deps.createFile.mock.invocationCallOrder[0],
    );
  });
});
