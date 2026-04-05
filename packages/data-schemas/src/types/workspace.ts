import type { Document, Types } from 'mongoose';

export interface IWorkspaceFileBinding {
  fileId?: string;
  filename: string;
  relativePath: string;
}

// Workspace sessions only store operational editor state.
// Project-scoped memory and context resolve from the linked conversation.
export interface IWorkspaceSession extends Document {
  user: Types.ObjectId;
  conversationId: string;
  mode: 'code';
  workingCopyRoot: string;
  openFiles?: string[];
  activeFile?: string;
  fileBindings?: IWorkspaceFileBinding[];
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
