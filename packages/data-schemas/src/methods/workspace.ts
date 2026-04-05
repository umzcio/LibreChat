import type { FilterQuery, Model } from 'mongoose';
import type { IWorkspaceSession } from '~/types';

export interface WorkspaceMethods {
  getWorkspaceSession(userId: string, conversationId: string): Promise<IWorkspaceSession | null>;
  upsertWorkspaceSession(
    userId: string,
    conversationId: string,
    update: Partial<IWorkspaceSession>,
  ): Promise<IWorkspaceSession | null>;
  deleteWorkspaceSession(
    userId: string,
    conversationId: string,
  ): Promise<IWorkspaceSession | null>;
}

export function createWorkspaceMethods(mongoose: typeof import('mongoose')): WorkspaceMethods {
  async function getWorkspaceSession(userId: string, conversationId: string) {
    const WorkspaceSession = mongoose.models.WorkspaceSession as Model<IWorkspaceSession>;
    return WorkspaceSession.findOne({ user: userId, conversationId }).lean();
  }

  async function upsertWorkspaceSession(
    userId: string,
    conversationId: string,
    update: Partial<IWorkspaceSession>,
  ) {
    const WorkspaceSession = mongoose.models.WorkspaceSession as Model<IWorkspaceSession>;
    const filter: FilterQuery<IWorkspaceSession> = { user: userId, conversationId };
    return WorkspaceSession.findOneAndUpdate(
      filter,
      {
        $set: {
          ...update,
          user: userId,
          conversationId,
          mode: 'code',
        },
      },
      {
        new: true,
        upsert: true,
      },
    ).lean();
  }

  async function deleteWorkspaceSession(userId: string, conversationId: string) {
    const WorkspaceSession = mongoose.models.WorkspaceSession as Model<IWorkspaceSession>;
    return WorkspaceSession.findOneAndDelete({ user: userId, conversationId }).lean();
  }

  return {
    getWorkspaceSession,
    upsertWorkspaceSession,
    deleteWorkspaceSession,
  };
}
