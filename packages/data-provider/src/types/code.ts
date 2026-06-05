export type TCodeWorkspaceSession = {
  activeFile?: string;
  conversationId: string;
  hasProject: boolean;
  mode: 'code';
  openFiles: string[];
  pendingConversation?: boolean;
  zdockId?: string | null;
};

export type TCodeDirectoryEntry = {
  name: string;
  path: string;
  size: number;
  type: 'file' | 'directory';
};

export type TCodeDirectoryResponse = {
  entries: TCodeDirectoryEntry[];
  path: string;
};

export type TCodeFileResponse = {
  content: string;
  path: string;
};

export type TCodeCreateItemResponse = {
  created: boolean;
  path: string;
  type: 'directory' | 'file';
};

export type TCodeDeleteItemResponse = {
  deleted: boolean;
  path: string;
};

export type TCodeRenameResponse = {
  newPath: string;
  path: string;
  renamed: true;
};

export type TCodeChange = {
  fileId?: string;
  filename?: string;
  path: string;
  status: 'modified' | 'new' | 'deleted' | 'unchanged';
};

export type TCodeChangesResponse = {
  changes: TCodeChange[];
};

export type TCodeDiff = TCodeChange & {
  originalContent: string;
  workingContent: string;
};
