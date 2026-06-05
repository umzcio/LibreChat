import { v4 as uuidv4 } from 'uuid';
import { logger } from '@librechat/data-schemas';
import type { Response } from 'express';
import type { ZdockMethods } from '@librechat/data-schemas';
import type { IZdock } from '@librechat/data-schemas';

interface AuthenticatedRequest {
  user?: { id: string };
  params: Record<string, string>;
  body: Record<string, unknown>;
  query: Record<string, string>;
}

export interface ZdockHandlerDeps {
  createZdock: ZdockMethods['createZdock'];
  getZdock: ZdockMethods['getZdock'];
  getZdocksByCursor: ZdockMethods['getZdocksByCursor'];
  updateZdock: ZdockMethods['updateZdock'];
  deleteZdock: ZdockMethods['deleteZdock'];
  getZdockFiles: ZdockMethods['getZdockFiles'];
  getZdockConversationCount: ZdockMethods['getZdockConversationCount'];
}

export function createZdockHandlers(deps: ZdockHandlerDeps) {
  async function create(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { name, description, instructions, color, icon, conversationDefaults, pinnedAgents } =
        req.body as Partial<IZdock> & { name?: string };

      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: 'Project name is required' });
      }

      const project = await deps.createZdock(userId, {
        zdockId: `zdock_${uuidv4()}`,
        name: name.trim(),
        description: description as string | undefined,
        instructions: instructions as string | undefined,
        color: color as string | undefined,
        icon: icon as string | undefined,
        conversationDefaults: conversationDefaults as Record<string, unknown> | undefined,
        pinnedAgents: pinnedAgents as string[] | undefined,
      });

      return res.status(201).json(project);
    } catch (error) {
      logger.error('[projects/create]', error);
      return res.status(500).json({ message: 'Error creating project' });
    }
  }

  async function list(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { cursor, limit, isArchived, search } = req.query;
      const result = await deps.getZdocksByCursor(userId, {
        cursor: cursor || undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        isArchived: isArchived === 'true',
        search: search || undefined,
      });

      return res.status(200).json(result);
    } catch (error) {
      logger.error('[projects/list]', error);
      return res.status(500).json({ message: 'Error listing projects' });
    }
  }

  async function get(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { zdockId } = req.params;
      const project = await deps.getZdock(zdockId, userId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      return res.status(200).json(project);
    } catch (error) {
      logger.error('[projects/get]', error);
      return res.status(500).json({ message: 'Error getting project' });
    }
  }

  async function update(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { zdockId } = req.params;
      const updateData = req.body as Partial<IZdock>;

      const project = await deps.updateZdock(zdockId, userId, updateData);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      return res.status(200).json(project);
    } catch (error) {
      logger.error('[projects/update]', error);
      return res.status(500).json({ message: 'Error updating project' });
    }
  }

  async function remove(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { zdockId } = req.params;
      const result = await deps.deleteZdock(zdockId, userId);
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'Project not found' });
      }

      return res.status(200).json({ message: 'Project deleted' });
    } catch (error) {
      logger.error('[projects/remove]', error);
      return res.status(500).json({ message: 'Error deleting project' });
    }
  }

  async function getFiles(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { zdockId } = req.params;
      const project = await deps.getZdock(zdockId, userId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const files = await deps.getZdockFiles(zdockId);
      return res.status(200).json(files);
    } catch (error) {
      logger.error('[projects/getFiles]', error);
      return res.status(500).json({ message: 'Error getting project files' });
    }
  }

  return { create, list, get, update, remove, getFiles };
}
