import logger from '~/config/winston';
import { escapeRegExp } from '~/utils/string';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import type { IMongoFile, IProject } from '~/types';

export interface ProjectMethods {
  createProject(userId: string, data: Partial<IProject> & { projectId: string; name: string }): Promise<IProject>;
  getProject(projectId: string, userId?: string): Promise<IProject | null>;
  getProjectsByCursor(
    userId: string,
    options?: {
      cursor?: string | null;
      limit?: number;
      isArchived?: boolean;
      search?: string;
    },
  ): Promise<{ projects: IProject[]; nextCursor: string | null }>;
  updateProject(projectId: string, userId: string, update: Partial<IProject>): Promise<IProject | null>;
  deleteProject(projectId: string, userId: string): Promise<{ deletedCount: number }>;
  getProjectFiles(projectId: string, userId?: string): Promise<IMongoFile[]>;
  getProjectConversationCount(projectId: string, userId: string): Promise<number>;
}

export function createProjectMethods(mongoose: typeof import('mongoose')): ProjectMethods {
  async function createProject(
    userId: string,
    data: Partial<IProject> & { projectId: string; name: string },
  ): Promise<IProject> {
    const Project = mongoose.models.Project as Model<IProject>;
    const project = await Project.create({ ...data, author: userId });
    return project;
  }

  async function getProject(projectId: string, userId?: string): Promise<IProject | null> {
    const Project = mongoose.models.Project as Model<IProject>;
    const filter: FilterQuery<IProject> = { projectId };
    if (userId) {
      filter.author = userId;
    }
    return Project.findOne(filter).lean();
  }

  async function getProjectsByCursor(
    userId: string,
    {
      cursor,
      limit = 25,
      isArchived = false,
      search,
    }: {
      cursor?: string | null;
      limit?: number;
      isArchived?: boolean;
      search?: string;
    } = {},
  ): Promise<{ projects: IProject[]; nextCursor: string | null }> {
    const Project = mongoose.models.Project as Model<IProject>;
    const filters: FilterQuery<IProject>[] = [{ author: userId } as FilterQuery<IProject>];

    if (isArchived) {
      filters.push({ isArchived: true } as FilterQuery<IProject>);
    } else {
      filters.push({
        $or: [{ isArchived: false }, { isArchived: { $exists: false } }],
      } as FilterQuery<IProject>);
    }

    if (search) {
      const escaped = escapeRegExp(search);
      filters.push({
        $or: [
          { name: { $regex: escaped, $options: 'i' } },
          { description: { $regex: escaped, $options: 'i' } },
        ],
      } as FilterQuery<IProject>);
    }

    let cursorFilter: FilterQuery<IProject> | null = null;
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString());
        const { primary, secondary } = decoded;
        const primaryValue = new Date(primary);
        const secondaryValue = new mongoose.Types.ObjectId(secondary);
        cursorFilter = {
          $or: [
            { updatedAt: { $lt: primaryValue } },
            { updatedAt: primaryValue, _id: { $lt: secondaryValue } },
          ],
        } as FilterQuery<IProject>;
      } catch {
        logger.warn('[getProjectsByCursor] Invalid cursor format, starting from beginning');
      }
      if (cursorFilter) {
        filters.push(cursorFilter);
      }
    }

    const query: FilterQuery<IProject> =
      filters.length === 1 ? filters[0] : ({ $and: filters } as FilterQuery<IProject>);

    try {
      const sortObj: Record<string, SortOrder> = { updatedAt: -1, _id: -1 };
      const projects = await Project.find(query).sort(sortObj).limit(limit + 1).lean();

      let nextCursor: string | null = null;
      if (projects.length > limit) {
        projects.pop();
        const last = projects[projects.length - 1] as Record<string, unknown>;
        const composite = {
          primary: (last.updatedAt as Date).toISOString(),
          secondary: String(last._id),
        };
        nextCursor = Buffer.from(JSON.stringify(composite)).toString('base64');
      }

      return { projects, nextCursor };
    } catch (error) {
      logger.error('[getProjectsByCursor] Error getting projects', error);
      throw new Error('Error getting projects');
    }
  }

  async function updateProject(
    projectId: string,
    userId: string,
    update: Partial<IProject>,
  ): Promise<IProject | null> {
    const Project = mongoose.models.Project as Model<IProject>;
    return Project.findOneAndUpdate(
      { projectId, author: userId },
      { $set: update },
      { new: true },
    ).lean();
  }

  async function deleteProject(
    projectId: string,
    userId: string,
  ): Promise<{ deletedCount: number }> {
    const Project = mongoose.models.Project as Model<IProject>;
    const result = await Project.deleteOne({ projectId, author: userId });
    return { deletedCount: result.deletedCount };
  }

  async function getProjectFiles(projectId: string, userId?: string): Promise<IMongoFile[]> {
    const File = mongoose.models.File as Model<IMongoFile>;
    const filter: FilterQuery<IMongoFile> = { projectId, conversationId: { $exists: false } };
    if (userId) {
      filter.user = userId;
    }
    return File.find(filter).lean();
  }

  async function getProjectConversationCount(projectId: string, userId: string): Promise<number> {
    const Conversation = mongoose.models.Conversation as Model<unknown>;
    return Conversation.countDocuments({ projectId, user: userId });
  }

  return {
    createProject,
    getProject,
    getProjectsByCursor,
    updateProject,
    deleteProject,
    getProjectFiles,
    getProjectConversationCount,
  };
}
