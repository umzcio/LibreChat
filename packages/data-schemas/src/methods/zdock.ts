import logger from '~/config/winston';
import { escapeRegExp } from '~/utils/string';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import type { IMongoFile, IZdock } from '~/types';

export interface ZdockMethods {
  createZdock(userId: string, data: Partial<IZdock> & { zdockId: string; name: string }): Promise<IZdock>;
  getZdock(zdockId: string, userId?: string): Promise<IZdock | null>;
  getZdocksByCursor(
    userId: string,
    options?: {
      cursor?: string | null;
      limit?: number;
      isArchived?: boolean;
      search?: string;
    },
  ): Promise<{ projects: IZdock[]; nextCursor: string | null }>;
  updateZdock(zdockId: string, userId: string, update: Partial<IZdock>): Promise<IZdock | null>;
  deleteZdock(zdockId: string, userId: string): Promise<{ deletedCount: number }>;
  getZdockFiles(zdockId: string, userId?: string): Promise<IMongoFile[]>;
  getZdockConversationCount(zdockId: string, userId: string): Promise<number>;
}

export function createZdockMethods(mongoose: typeof import('mongoose')): ZdockMethods {
  async function createZdock(
    userId: string,
    data: Partial<IZdock> & { zdockId: string; name: string },
  ): Promise<IZdock> {
    const Project = mongoose.models.Zdock as Model<IZdock>;
    const project = await Project.create({ ...data, author: userId });
    return project;
  }

  async function getZdock(zdockId: string, userId?: string): Promise<IZdock | null> {
    const Project = mongoose.models.Zdock as Model<IZdock>;
    const filter: FilterQuery<IZdock> = { zdockId };
    if (userId) {
      filter.author = userId;
    }
    return Project.findOne(filter).lean();
  }

  async function getZdocksByCursor(
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
  ): Promise<{ projects: IZdock[]; nextCursor: string | null }> {
    const Project = mongoose.models.Zdock as Model<IZdock>;
    const filters: FilterQuery<IZdock>[] = [{ author: userId } as FilterQuery<IZdock>];

    if (isArchived) {
      filters.push({ isArchived: true } as FilterQuery<IZdock>);
    } else {
      filters.push({
        $or: [{ isArchived: false }, { isArchived: { $exists: false } }],
      } as FilterQuery<IZdock>);
    }

    if (search) {
      const escaped = escapeRegExp(search);
      filters.push({
        $or: [
          { name: { $regex: escaped, $options: 'i' } },
          { description: { $regex: escaped, $options: 'i' } },
        ],
      } as FilterQuery<IZdock>);
    }

    let cursorFilter: FilterQuery<IZdock> | null = null;
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
        } as FilterQuery<IZdock>;
      } catch {
        logger.warn('[getZdocksByCursor] Invalid cursor format, starting from beginning');
      }
      if (cursorFilter) {
        filters.push(cursorFilter);
      }
    }

    const query: FilterQuery<IZdock> =
      filters.length === 1 ? filters[0] : ({ $and: filters } as FilterQuery<IZdock>);

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
      logger.error('[getZdocksByCursor] Error getting projects', error);
      throw new Error('Error getting projects');
    }
  }

  async function updateZdock(
    zdockId: string,
    userId: string,
    update: Partial<IZdock>,
  ): Promise<IZdock | null> {
    const Project = mongoose.models.Zdock as Model<IZdock>;
    return Project.findOneAndUpdate(
      { zdockId, author: userId },
      { $set: update },
      { new: true },
    ).lean();
  }

  async function deleteZdock(
    zdockId: string,
    userId: string,
  ): Promise<{ deletedCount: number }> {
    const Project = mongoose.models.Zdock as Model<IZdock>;
    const result = await Project.deleteOne({ zdockId, author: userId });
    return { deletedCount: result.deletedCount };
  }

  async function getZdockFiles(zdockId: string, userId?: string): Promise<IMongoFile[]> {
    const File = mongoose.models.File as Model<IMongoFile>;
    const filter: FilterQuery<IMongoFile> = { zdockId, conversationId: { $exists: false } };
    if (userId) {
      filter.user = userId;
    }
    return File.find(filter).lean();
  }

  async function getZdockConversationCount(zdockId: string, userId: string): Promise<number> {
    const Conversation = mongoose.models.Conversation as Model<unknown>;
    return Conversation.countDocuments({ zdockId, user: userId });
  }

  return {
    createZdock,
    getZdock,
    getZdocksByCursor,
    updateZdock,
    deleteZdock,
    getZdockFiles,
    getZdockConversationCount,
  };
}
