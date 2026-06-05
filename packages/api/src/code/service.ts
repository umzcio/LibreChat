import { promises as fs } from 'fs';
import crypto from 'crypto';
import path from 'path';
import { Types } from 'mongoose';
import { FileSources } from 'librechat-data-provider';
import type {
  IConversation,
  IMongoFile,
  IZdock,
  IWorkspaceFileBinding,
  IWorkspaceSession,
} from '@librechat/data-schemas';
import { sanitizeFilename } from '~/utils/files';

const DEFAULT_WORKSPACE_ROOT = process.env.LIBRECODE_WORKSPACE_ROOT || '/workspaces/librecode';

type CodeChangeStatus = 'modified' | 'new' | 'deleted' | 'unchanged';

export interface CodeDirectoryEntry {
  name: string;
  path: string;
  size: number;
  type: 'file' | 'directory';
}

export interface CodeWorkspaceSessionView {
  activeFile?: string;
  conversationId: string;
  hasProject: boolean;
  mode: 'code';
  openFiles: string[];
  zdockId?: string | null;
}

export interface CodeChange {
  fileId?: string;
  filename?: string;
  path: string;
  status: CodeChangeStatus;
}

export interface CodeDiff extends CodeChange {
  originalContent: string;
  workingContent: string;
}

export interface CodeRenameResult {
  newPath: string;
  path: string;
  renamed: true;
}

export interface CodeServiceDeps {
  createZdock: (
    userId: string,
    data: Partial<IZdock> & { zdockId: string; name: string },
  ) => Promise<IZdock>;
  createFile: (
    data: Partial<IMongoFile>,
    disableTTL?: boolean,
  ) => Promise<IMongoFile | null>;
  deleteFileByFilter: (
    filter: Record<string, unknown>,
  ) => Promise<IMongoFile | null>;
  findFileById: (
    fileId: string,
    options?: Record<string, unknown>,
  ) => Promise<IMongoFile | null>;
  getConvo: (userId: string, conversationId: string) => Promise<IConversation | null>;
  getZdock: (zdockId: string, userId?: string) => Promise<IZdock | null>;
  getZdockFiles: (zdockId: string, userId?: string) => Promise<IMongoFile[]>;
  getWorkspaceSession: (
    userId: string,
    conversationId: string,
  ) => Promise<IWorkspaceSession | null>;
  saveConvo: (
    ctx: { userId: string; isTemporary?: boolean; interfaceConfig?: unknown },
    data: { conversationId: string; newConversationId?: string; [key: string]: unknown },
    metadata?: { context?: string; unsetFields?: Record<string, number>; noUpsert?: boolean },
  ) => Promise<IConversation | { message: string } | null>;
  upsertWorkspaceSession: (
    userId: string,
    conversationId: string,
    update: Partial<IWorkspaceSession>,
  ) => Promise<IWorkspaceSession | null>;
  updateFile: (data: Partial<IMongoFile> & { file_id: string }) => Promise<IMongoFile | null>;
}

function normalizeRelativePath(inputPath = ''): string {
  const normalized = inputPath.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = normalized
    .split('/')
    .filter(Boolean)
    .map((segment) => sanitizeFilename(segment));

  return parts.join('/');
}

function toClientPath(relativePath: string): string {
  return relativePath ? `/${relativePath}` : '/';
}

function hasPathPrefix(targetPath: string, prefix: string): boolean {
  return targetPath === prefix || targetPath.startsWith(`${prefix}/`);
}

function rewritePrefixedPath(targetPath: string, fromPath: string, toPath: string): string {
  if (!hasPathPrefix(targetPath, fromPath)) {
    return targetPath;
  }

  if (targetPath === fromPath) {
    return toPath;
  }

  return `${toPath}/${targetPath.slice(fromPath.length + 1)}`;
}

function inferTextMime(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case '.ts':
      return 'text/typescript';
    case '.tsx':
      return 'text/tsx';
    case '.js':
      return 'text/javascript';
    case '.jsx':
      return 'text/jsx';
    case '.json':
      return 'application/json';
    case '.md':
      return 'text/markdown';
    case '.html':
      return 'text/html';
    case '.css':
      return 'text/css';
    case '.yml':
    case '.yaml':
      return 'text/yaml';
    case '.py':
      return 'text/x-python';
    case '.sh':
      return 'text/x-shellscript';
    default:
      return 'text/plain';
  }
}

function ensurePathWithinRoot(rootPath: string, relativePath = ''): string {
  const safeRelativePath = normalizeRelativePath(relativePath);
  const resolved = path.resolve(rootPath, safeRelativePath);
  const relative = path.relative(rootPath, resolved);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Invalid path');
  }

  return resolved;
}

function getUserWorkspaceRoot(userId: string): string {
  return path.join(DEFAULT_WORKSPACE_ROOT, sanitizeFilename(userId));
}

function getConversationWorkspaceRoot(userId: string, conversationId: string): string {
  return path.join(getUserWorkspaceRoot(userId), 'sessions', sanitizeFilename(conversationId));
}

function getProjectStorageRoot(userId: string, zdockId: string): string {
  return path.join(
    getUserWorkspaceRoot(userId),
    'projects',
    sanitizeFilename(zdockId),
  );
}

function getProjectStoragePath(userId: string, zdockId: string, relativePath: string): string {
  return ensurePathWithinRoot(getProjectStorageRoot(userId, zdockId), relativePath);
}

function getUniqueRelativePath(inputName: string, usedPaths: Set<string>): string {
  const sanitized = normalizeRelativePath(inputName || 'untitled.txt') || 'untitled.txt';

  if (!usedPaths.has(sanitized)) {
    usedPaths.add(sanitized);
    return sanitized;
  }

  const parsed = path.posix.parse(sanitized);
  let index = 2;
  let candidate = sanitized;

  while (usedPaths.has(candidate)) {
    candidate = path.posix.join(parsed.dir, `${parsed.name}-${index}${parsed.ext}`);
    index += 1;
  }

  usedPaths.add(candidate);
  return candidate;
}

async function readTextFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf8');
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectWorkspaceFiles(rootPath: string, relativePath = ''): Promise<string[]> {
  const currentPath = ensurePathWithinRoot(rootPath, relativePath);
  const entries = await fs.readdir(currentPath, { withFileTypes: true }).catch(() => []);

  const nested = await Promise.all(
    entries.map(async (entry) => {
      const nextRelativePath = relativePath
        ? path.posix.join(relativePath, entry.name)
        : entry.name;

      if (entry.isDirectory()) {
        return collectWorkspaceFiles(rootPath, nextRelativePath);
      }

      return [normalizeRelativePath(nextRelativePath)];
    }),
  );

  return nested.flat();
}

async function removeEmptyParents(rootPath: string, relativePath: string): Promise<void> {
  let currentPath = path.dirname(ensurePathWithinRoot(rootPath, relativePath));

  while (currentPath !== rootPath && currentPath.startsWith(rootPath)) {
    const children = await fs.readdir(currentPath).catch(() => null);

    if (children == null || children.length > 0) {
      return;
    }

    await fs.rmdir(currentPath).catch(() => {});
    currentPath = path.dirname(currentPath);
  }
}

function buildSessionView(
  session: IWorkspaceSession,
  zdockId?: string | null,
): CodeWorkspaceSessionView {
  return {
    activeFile: session.activeFile ? toClientPath(session.activeFile) : undefined,
    conversationId: session.conversationId,
    hasProject: Boolean(zdockId),
    mode: 'code',
    openFiles: (session.openFiles ?? []).map((filePath) => toClientPath(filePath)),
    zdockId: zdockId ?? null,
  };
}

export function createCodeWorkspaceService(deps: CodeServiceDeps) {
  async function loadConversation(userId: string, conversationId: string) {
    const conversation = await deps.getConvo(userId, conversationId);

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    return conversation;
  }

  async function materializeProjectFiles(
    userId: string,
    conversationId: string,
    zdockId: string,
  ) {
    const workspaceRoot = getConversationWorkspaceRoot(userId, conversationId);
    await fs.mkdir(workspaceRoot, { recursive: true });

    const projectFiles = await deps.getZdockFiles(zdockId, userId);
    const usedPaths = new Set<string>();
    const fileBindings: IWorkspaceFileBinding[] = [];

    await Promise.all(
      projectFiles
        .filter((file) => typeof file.text === 'string')
        .map(async (file) => {
          const relativePath = getUniqueRelativePath(file.filename, usedPaths);
          const absolutePath = ensurePathWithinRoot(workspaceRoot, relativePath);
          await fs.mkdir(path.dirname(absolutePath), { recursive: true });
          await fs.writeFile(absolutePath, file.text ?? '', 'utf8');
          fileBindings.push({
            fileId: file.file_id,
            filename: file.filename,
            relativePath,
          });
        }),
    );

    return {
      activeFile: fileBindings[0]?.relativePath,
      fileBindings,
      openFiles: fileBindings[0] ? [fileBindings[0].relativePath] : [],
      workingCopyRoot: workspaceRoot,
    };
  }

  async function ensureWorkspaceSession(userId: string, conversationId: string) {
    const conversation = await loadConversation(userId, conversationId);
    const existingSession = await deps.getWorkspaceSession(userId, conversationId);

    if (existingSession) {
      await fs.mkdir(existingSession.workingCopyRoot, { recursive: true });
      return {
        conversation,
        session: existingSession,
      };
    }

    const workingCopyRoot = getConversationWorkspaceRoot(userId, conversationId);
    await fs.mkdir(workingCopyRoot, { recursive: true });

    const sessionUpdate: Partial<IWorkspaceSession> = {
      activeFile: undefined,
      fileBindings: [],
      openFiles: [],
      workingCopyRoot,
    };

    if (conversation.zdockId) {
      Object.assign(
        sessionUpdate,
        await materializeProjectFiles(userId, conversationId, conversation.zdockId),
      );
    }

    const session = await deps.upsertWorkspaceSession(userId, conversationId, sessionUpdate);

    if (!session) {
      throw new Error('Unable to create workspace session');
    }

    return {
      conversation,
      session,
    };
  }

  async function bootstrapWorkspace(userId: string, conversationId: string) {
    const { conversation, session } = await ensureWorkspaceSession(userId, conversationId);

    return buildSessionView(session, conversation.zdockId);
  }

  async function listFiles(
    userId: string,
    conversationId: string,
    relativePath = '',
  ): Promise<{ entries: CodeDirectoryEntry[]; path: string }> {
    const { session } = await ensureWorkspaceSession(userId, conversationId);
    const directoryPath = ensurePathWithinRoot(session.workingCopyRoot, relativePath);
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });

    const result = await Promise.all(
      entries.map(async (entry) => {
        const entryRelativePath = normalizeRelativePath(
          relativePath ? path.posix.join(relativePath, entry.name) : entry.name,
        );
        const entryAbsolutePath = ensurePathWithinRoot(session.workingCopyRoot, entryRelativePath);
        const stat = await fs.stat(entryAbsolutePath);

        return {
          name: entry.name,
          path: toClientPath(entryRelativePath),
          size: stat.size,
          type: entry.isDirectory() ? 'directory' : 'file',
        } as CodeDirectoryEntry;
      }),
    );

    result.sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === 'directory' ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    });

    return {
      entries: result,
      path: toClientPath(normalizeRelativePath(relativePath)),
    };
  }

  async function getFileContent(
    userId: string,
    conversationId: string,
    relativePath: string,
  ) {
    const { session } = await ensureWorkspaceSession(userId, conversationId);
    const normalizedPath = normalizeRelativePath(relativePath);
    const absolutePath = ensurePathWithinRoot(session.workingCopyRoot, normalizedPath);

    return {
      content: await readTextFile(absolutePath),
      path: toClientPath(normalizedPath),
    };
  }

  async function saveFileContent(
    userId: string,
    conversationId: string,
    relativePath: string,
    content: string,
  ) {
    const { session } = await ensureWorkspaceSession(userId, conversationId);
    const normalizedPath = normalizeRelativePath(relativePath);
    const absolutePath = ensurePathWithinRoot(session.workingCopyRoot, normalizedPath);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, 'utf8');
    await deps.upsertWorkspaceSession(userId, conversationId, {
      activeFile: normalizedPath,
      openFiles: Array.from(new Set([...(session.openFiles ?? []), normalizedPath])),
    });

    return { path: toClientPath(normalizedPath), saved: true };
  }

  async function createItem(
    userId: string,
    conversationId: string,
    relativePath: string,
    type: 'directory' | 'file',
  ) {
    const { session } = await ensureWorkspaceSession(userId, conversationId);
    const normalizedPath = normalizeRelativePath(relativePath);
    const absolutePath = ensurePathWithinRoot(session.workingCopyRoot, normalizedPath);

    if (await exists(absolutePath)) {
      throw new Error('Path already exists');
    }

    if (type === 'directory') {
      await fs.mkdir(absolutePath, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, '', 'utf8');
    }

    return { created: true, path: toClientPath(normalizedPath), type };
  }

  async function renameItem(
    userId: string,
    conversationId: string,
    relativePath: string,
    nextRelativePath: string,
  ): Promise<CodeRenameResult> {
    const { session } = await ensureWorkspaceSession(userId, conversationId);
    const normalizedPath = normalizeRelativePath(relativePath);
    const normalizedNextPath = normalizeRelativePath(nextRelativePath);

    if (!normalizedPath || !normalizedNextPath || normalizedPath === normalizedNextPath) {
      throw new Error('Invalid rename target');
    }

    const absolutePath = ensurePathWithinRoot(session.workingCopyRoot, normalizedPath);
    const nextAbsolutePath = ensurePathWithinRoot(session.workingCopyRoot, normalizedNextPath);

    if (!(await exists(absolutePath))) {
      throw new Error('Path not found');
    }

    if (await exists(nextAbsolutePath)) {
      throw new Error('Path already exists');
    }

    await fs.mkdir(path.dirname(nextAbsolutePath), { recursive: true });
    await fs.rename(absolutePath, nextAbsolutePath);
    await removeEmptyParents(session.workingCopyRoot, normalizedPath);

    const nextBindings = (session.fileBindings ?? []).map((binding) => ({
      ...binding,
      filename: rewritePrefixedPath(binding.filename, normalizedPath, normalizedNextPath),
      relativePath: rewritePrefixedPath(binding.relativePath, normalizedPath, normalizedNextPath),
    }));
    const nextOpenFiles = (session.openFiles ?? []).map((filePath) =>
      rewritePrefixedPath(filePath, normalizedPath, normalizedNextPath),
    );
    const nextActiveFile = session.activeFile
      ? rewritePrefixedPath(session.activeFile, normalizedPath, normalizedNextPath)
      : undefined;

    await deps.upsertWorkspaceSession(userId, conversationId, {
      activeFile: nextActiveFile,
      fileBindings: nextBindings,
      openFiles: Array.from(new Set(nextOpenFiles)),
    });

    return {
      newPath: toClientPath(normalizedNextPath),
      path: toClientPath(normalizedPath),
      renamed: true,
    };
  }

  async function deleteItem(userId: string, conversationId: string, relativePath: string) {
    const { session } = await ensureWorkspaceSession(userId, conversationId);
    const normalizedPath = normalizeRelativePath(relativePath);
    const absolutePath = ensurePathWithinRoot(session.workingCopyRoot, normalizedPath);
    const stat = await fs.stat(absolutePath);

    if (stat.isDirectory()) {
      await fs.rm(absolutePath, { force: true, recursive: true });
    } else {
      await fs.unlink(absolutePath);
      await removeEmptyParents(session.workingCopyRoot, normalizedPath);
    }

    const nextOpenFiles = (session.openFiles ?? []).filter(
      (filePath) => !hasPathPrefix(filePath, normalizedPath),
    );
    const nextActiveFile =
      session.activeFile && hasPathPrefix(session.activeFile, normalizedPath)
        ? undefined
        : session.activeFile;

    await deps.upsertWorkspaceSession(userId, conversationId, {
      activeFile: nextActiveFile,
      openFiles: nextOpenFiles,
    });

    return { deleted: true, path: toClientPath(normalizedPath) };
  }

  async function listChanges(userId: string, conversationId: string): Promise<CodeChange[]> {
    const { conversation, session } = await ensureWorkspaceSession(userId, conversationId);

    if (!conversation.zdockId) {
      return [];
    }

    const projectFiles = await deps.getZdockFiles(conversation.zdockId, userId);
    const fileMap = new Map(projectFiles.map((file) => [file.file_id, file]));
    const bindings = session.fileBindings ?? [];
    const workspaceFiles = new Set(await collectWorkspaceFiles(session.workingCopyRoot));
    const changes: CodeChange[] = [];

    for (const binding of bindings) {
      const file = binding.fileId ? fileMap.get(binding.fileId) ?? null : null;
      const absolutePath = ensurePathWithinRoot(session.workingCopyRoot, binding.relativePath);
      const workspaceExists = await exists(absolutePath);

      if (!workspaceExists) {
        changes.push({
          fileId: binding.fileId,
          filename: binding.filename,
          path: toClientPath(binding.relativePath),
          status: 'deleted',
        });
        continue;
      }

      workspaceFiles.delete(binding.relativePath);
      const workingContent = await readTextFile(absolutePath);
      const originalContent = file?.text ?? '';

      if (workingContent !== originalContent) {
        changes.push({
          fileId: binding.fileId,
          filename: binding.filename,
          path: toClientPath(binding.relativePath),
          status: 'modified',
        });
      }
    }

    for (const relativePath of workspaceFiles) {
      changes.push({
        filename: relativePath,
        path: toClientPath(relativePath),
        status: 'new',
      });
    }

    changes.sort((left, right) => left.path.localeCompare(right.path));
    return changes;
  }

  async function getDiff(
    userId: string,
    conversationId: string,
    relativePath: string,
  ): Promise<CodeDiff> {
    const { conversation, session } = await ensureWorkspaceSession(userId, conversationId);
    const normalizedPath = normalizeRelativePath(relativePath);
    const binding = (session.fileBindings ?? []).find((item) => item.relativePath === normalizedPath);
    const absolutePath = ensurePathWithinRoot(session.workingCopyRoot, normalizedPath);
    const workspaceExists = await exists(absolutePath);
    const workingContent = workspaceExists ? await readTextFile(absolutePath) : '';
    const originalFile =
      conversation.zdockId && binding?.fileId
        ? await deps.findFileById(binding.fileId, {
            zdockId: conversation.zdockId,
            user: userId,
          })
        : null;
    const originalContent = originalFile?.text ?? '';

    let status: CodeChangeStatus = 'unchanged';
    if (!binding) {
      status = workspaceExists ? 'new' : 'unchanged';
    } else if (!workspaceExists) {
      status = 'deleted';
    } else if (workingContent !== originalContent) {
      status = 'modified';
    }

    return {
      fileId: binding?.fileId,
      filename: binding?.filename ?? normalizedPath,
      originalContent,
      path: toClientPath(normalizedPath),
      status,
      workingContent,
    };
  }

  async function applyChanges(
    userId: string,
    conversationId: string,
    relativePaths?: string[],
  ) {
    const { conversation, session } = await ensureWorkspaceSession(userId, conversationId);

    if (!conversation.zdockId) {
      throw new Error('Conversation is not linked to a project');
    }

    const targets =
      relativePaths?.length && relativePaths[0]
        ? relativePaths.map((filePath) => normalizeRelativePath(filePath))
        : (await listChanges(userId, conversationId)).map((change) =>
            normalizeRelativePath(change.path),
          );
    const bindings = [...(session.fileBindings ?? [])];
    const bindingMap = new Map(bindings.map((binding) => [binding.relativePath, binding]));
    const updates: IWorkspaceFileBinding[] = [];

    for (const relativePath of targets) {
      const binding = bindingMap.get(relativePath);
      const workingPath = ensurePathWithinRoot(session.workingCopyRoot, relativePath);
      const workspaceExists = await exists(workingPath);

      if (!workspaceExists && binding?.fileId) {
        const deletedFile = await deps.deleteFileByFilter({
          file_id: binding.fileId,
          zdockId: conversation.zdockId,
          user: userId,
        });

        if (deletedFile?.filepath && deletedFile.source === FileSources.local) {
          await fs.unlink(deletedFile.filepath).catch(() => {});
        }

        bindingMap.delete(relativePath);
        continue;
      }

      if (!workspaceExists) {
        continue;
      }

      const content = await readTextFile(workingPath);
      const bytes = Buffer.byteLength(content, 'utf8');
      const managedPath = getProjectStoragePath(userId, conversation.zdockId, relativePath);

      await fs.mkdir(path.dirname(managedPath), { recursive: true });
      await fs.writeFile(managedPath, content, 'utf8');

      if (binding?.fileId) {
        await deps.updateFile({
          bytes,
          embedded: false,
          file_id: binding.fileId,
          filename: relativePath,
          filepath: managedPath,
          zdockId: conversation.zdockId,
          source: FileSources.local,
          text: content,
          type: inferTextMime(relativePath),
        });
        updates.push({
          fileId: binding.fileId,
          filename: relativePath,
          relativePath,
        });
        continue;
      }

      const fileId = crypto.randomUUID();
      await deps.createFile(
        {
          bytes,
          embedded: false,
          file_id: fileId,
          filename: relativePath,
          filepath: managedPath,
          object: 'file',
          zdockId: conversation.zdockId,
          source: FileSources.local,
          text: content,
          type: inferTextMime(relativePath),
          usage: 0,
          user: new Types.ObjectId(userId),
        },
        true,
      );
      updates.push({
        fileId,
        filename: relativePath,
        relativePath,
      });
    }

    const nextBindings = [
      ...Array.from(bindingMap.values()).filter((binding) => !targets.includes(binding.relativePath)),
      ...updates,
    ].sort((left, right) => left.relativePath.localeCompare(right.relativePath));

    const updatedSession = await deps.upsertWorkspaceSession(userId, conversationId, {
      activeFile: session.activeFile,
      fileBindings: nextBindings,
      openFiles: session.openFiles ?? [],
    });

    return buildSessionView(updatedSession ?? session, conversation.zdockId);
  }

  async function discardChanges(
    userId: string,
    conversationId: string,
    relativePaths?: string[],
  ) {
    const { conversation, session } = await ensureWorkspaceSession(userId, conversationId);
    const bindings = session.fileBindings ?? [];
    const targets =
      relativePaths?.length && relativePaths[0]
        ? relativePaths.map((filePath) => normalizeRelativePath(filePath))
        : (await listChanges(userId, conversationId)).map((change) =>
            normalizeRelativePath(change.path),
          );

    for (const relativePath of targets) {
      const binding = bindings.find((item) => item.relativePath === relativePath);
      const absolutePath = ensurePathWithinRoot(session.workingCopyRoot, relativePath);

      if (!binding) {
        if (await exists(absolutePath)) {
          await fs.unlink(absolutePath).catch(() => {});
          await removeEmptyParents(session.workingCopyRoot, relativePath);
        }
        continue;
      }

      const originalFile =
        conversation.zdockId && binding.fileId
          ? await deps.findFileById(binding.fileId, {
              zdockId: conversation.zdockId,
              user: userId,
            })
          : null;

      if (!originalFile) {
        await fs.unlink(absolutePath).catch(() => {});
        await removeEmptyParents(session.workingCopyRoot, relativePath);
        continue;
      }

      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, originalFile.text ?? '', 'utf8');
    }

    return {
      discarded: true,
    };
  }

  async function promoteWorkspace(
    userId: string,
    conversationId: string,
    options?: { zdockId?: string; projectName?: string },
  ) {
    const { conversation, session } = await ensureWorkspaceSession(userId, conversationId);

    if (conversation.zdockId) {
      return buildSessionView(session, conversation.zdockId);
    }

    let targetProject = options?.zdockId
      ? await deps.getZdock(options.zdockId, userId)
      : null;

    if (options?.zdockId && !targetProject) {
      throw new Error('Project not found');
    }

    if (!targetProject) {
      const nextProjectName =
        options?.projectName?.trim() ||
        (typeof conversation.title === 'string' && conversation.title.trim()
          ? conversation.title.trim()
          : 'Code Workspace');

      targetProject = await deps.createZdock(userId, {
        name: nextProjectName,
        zdockId: `zdock_${crypto.randomUUID()}`,
      });
    }

    const updatedConversation = await deps.saveConvo(
      { userId },
      { conversationId, zdockId: targetProject.zdockId },
      {
        context: '[code] promote workspace to project',
        noUpsert: true,
      },
    );

    if (!updatedConversation || 'message' in updatedConversation) {
      throw new Error('Unable to link conversation to project');
    }

    const importedSession = await applyChanges(userId, conversationId);
    return {
      ...importedSession,
      zdockId: targetProject.zdockId,
    };
  }

  return {
    applyChanges,
    bootstrapWorkspace,
    createItem,
    deleteItem,
    discardChanges,
    getDiff,
    getFileContent,
    listChanges,
    listFiles,
    renameItem,
    promoteWorkspace,
    saveFileContent,
  };
}
