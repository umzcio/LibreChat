const fs = require('fs');
const path = require('path');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { parseDocument } = require('@librechat/api');
const { FileSources } = require('librechat-data-provider');
const { logger } = require('@librechat/data-schemas');
const { uploadVectors, deleteVectors } = require('~/server/services/Files/VectorDB/crud');
const { requireJwtAuth, configMiddleware } = require('~/server/middleware');
const asyncHandler = require('~/server/middleware/asyncHandler');
const db = require('~/models');

const router = express.Router();
router.use(requireJwtAuth);
router.use(configMiddleware);

/**
 * List projects for the authenticated user.
 * @route GET /api/projects
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { cursor, limit, isArchived, search } = req.query;
    const result = await db.getProjectsByCursor(req.user.id, {
      cursor: cursor || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      isArchived: isArchived === 'true',
      search: search || undefined,
    });
    return res.status(200).json(result);
  }),
);

/**
 * Create a new project.
 * @route POST /api/projects
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, description, instructions, color, icon, conversationDefaults, pinnedAgents } =
      req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    const project = await db.createProject(req.user.id, {
      projectId: `project_${uuidv4()}`,
      name: name.trim(),
      description,
      instructions,
      color,
      icon,
      conversationDefaults,
      pinnedAgents,
    });

    return res.status(201).json(project);
  }),
);

/**
 * Get a project by ID.
 * @route GET /api/projects/:projectId
 */
router.get(
  '/:projectId',
  asyncHandler(async (req, res) => {
    const project = await db.getProject(req.params.projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    return res.status(200).json(project);
  }),
);

/**
 * Update a project.
 * @route PATCH /api/projects/:projectId
 */
const MUTABLE_PROJECT_FIELDS = [
  'name',
  'description',
  'instructions',
  'color',
  'icon',
  'conversationDefaults',
  'pinnedAgents',
  'isArchived',
  'memory',
  'memoryUpdatedAt',
];

router.patch(
  '/:projectId',
  asyncHandler(async (req, res) => {
    const allowedUpdate = Object.fromEntries(
      MUTABLE_PROJECT_FIELDS.filter((k) => req.body[k] !== undefined).map((k) => [k, req.body[k]]),
    );
    const project = await db.updateProject(req.params.projectId, req.user.id, allowedUpdate);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    return res.status(200).json(project);
  }),
);

/**
 * Delete a project.
 * @route DELETE /api/projects/:projectId
 */
router.delete(
  '/:projectId',
  asyncHandler(async (req, res) => {
    const result = await db.deleteProject(req.params.projectId, req.user.id);
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    return res.status(200).json({ message: 'Project deleted' });
  }),
);

/**
 * Get knowledge base files for a project.
 * @route GET /api/projects/:projectId/files
 */
router.get(
  '/:projectId/files',
  asyncHandler(async (req, res) => {
    const project = await db.getProject(req.params.projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const files = await db.getProjectFiles(req.params.projectId);
    return res.status(200).json(files);
  }),
);

/**
 * List conversations belonging to a project.
 * @route GET /api/projects/:projectId/conversations
 */
router.get(
  '/:projectId/conversations',
  asyncHandler(async (req, res) => {
    const project = await db.getProject(req.params.projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const { cursor, limit } = req.query;
    const result = await db.getConvosByCursor(req.user.id, {
      cursor: cursor || undefined,
      limit: limit ? parseInt(limit, 10) : 25,
      projectId: req.params.projectId,
    });
    return res.status(200).json(result);
  }),
);

/**
 * Assign conversations to a project.
 * @route POST /api/projects/:projectId/conversations
 */
router.post(
  '/:projectId/conversations',
  asyncHandler(async (req, res) => {
    const { conversationIds } = req.body;
    if (!Array.isArray(conversationIds) || conversationIds.length === 0) {
      return res.status(400).json({ message: 'conversationIds array is required' });
    }

    const project = await db.getProject(req.params.projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const Conversation =
      db.default?.models?.Conversation || require('mongoose').models.Conversation;
    await Conversation.updateMany(
      { conversationId: { $in: conversationIds }, user: req.user.id },
      { $set: { projectId: req.params.projectId } },
    );

    return res.status(200).json({ message: 'Conversations assigned to project' });
  }),
);

/**
 * Remove a conversation from a project.
 * @route DELETE /api/projects/:projectId/conversations/:conversationId
 */
router.delete(
  '/:projectId/conversations/:conversationId',
  asyncHandler(async (req, res) => {
    const Conversation =
      db.default?.models?.Conversation || require('mongoose').models.Conversation;
    await Conversation.updateOne(
      {
        conversationId: req.params.conversationId,
        user: req.user.id,
        projectId: req.params.projectId,
      },
      { $unset: { projectId: '' } },
    );

    return res.status(200).json({ message: 'Conversation removed from project' });
  }),
);

/**
 * Upload a file to a project's knowledge base.
 * @route POST /api/projects/:projectId/files
 */
const { createMulterInstance } = require('~/server/routes/files/multer');

router.post(
  '/:projectId/files',
  async (req, res, next) => {
    try {
      const upload = await createMulterInstance();
      upload.single('file')(req, res, (err) => {
        if (err) {
          logger.error('[POST /projects/:projectId/files] Multer error', err);
          return res.status(400).json({ message: `Upload error: ${err.message}` });
        }
        next();
      });
    } catch (err) {
      logger.error('[POST /projects/:projectId/files] Upload init error', err);
      return res.status(500).json({ message: 'Error initializing upload' });
    }
  },
  asyncHandler(async (req, res) => {
    logger.info(
      `[POST /projects/:projectId/files] Upload request for project ${req.params.projectId}`,
    );
    const project = await db.getProject(req.params.projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filepath = req.file.path;
    let text = '';

    try {
      const result = await parseDocument({ file: req.file });
      text = result.text || '';
    } catch (_docErr) {
      try {
        const ext = path.extname(req.file.originalname).toLowerCase();
        if (
          [
            '.txt',
            '.md',
            '.csv',
            '.json',
            '.xml',
            '.yaml',
            '.yml',
            '.html',
            '.js',
            '.ts',
            '.py',
            '.sh',
            '.sql',
            '.css',
            '.jsx',
            '.tsx',
          ].includes(ext)
        ) {
          text = fs.readFileSync(filepath, 'utf-8');
        }
      } catch (readErr) {
        logger.warn('[POST /projects/:projectId/files] Could not extract text', readErr);
      }
    }

    let embedded = false;
    if (process.env.RAG_API_URL) {
      try {
        await uploadVectors({
          req,
          file: req.file,
          file_id: req.file_id,
        });
        embedded = true;
        logger.info(
          `[POST /projects/:projectId/files] Embedded ${req.file.originalname} in vector DB`,
        );
      } catch (embedErr) {
        logger.warn(
          `[POST /projects/:projectId/files] Vector embedding failed for ${req.file.originalname}, falling back to text-only`,
          embedErr.message,
        );
      }
    }

    const fileDoc = await db.createFile(
      {
        user: req.user._id || req.user.id,
        file_id: req.file_id,
        filename: req.file.originalname,
        filepath: embedded ? FileSources.vectordb : filepath,
        bytes: req.file.size,
        type: req.file.mimetype,
        source: embedded ? FileSources.vectordb : FileSources.local,
        projectId: req.params.projectId,
        text: text || undefined,
        embedded,
        object: 'file',
        usage: 0,
      },
      true,
    );

    if (embedded) {
      fs.promises.unlink(filepath).catch(() => {});
    }

    return res.status(201).json(fileDoc);
  }),
);

/**
 * Delete a file from a project's knowledge base.
 * @route DELETE /api/projects/:projectId/files/:fileId
 */
router.delete(
  '/:projectId/files/:fileId',
  asyncHandler(async (req, res) => {
    const project = await db.getProject(req.params.projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const file = await db.findFileById(req.params.fileId, {
      projectId: req.params.projectId,
      user: req.user.id,
    });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    if (file.embedded) {
      try {
        await deleteVectors(req, file);
      } catch (vecErr) {
        logger.warn(
          '[DELETE /projects/:projectId/files/:fileId] Error deleting vectors',
          vecErr.message,
        );
      }
    }
    if (file.filepath && file.source !== FileSources.vectordb) {
      fs.promises.unlink(file.filepath).catch(() => {});
    }
    await db.deleteFileByFilter({
      file_id: req.params.fileId,
      projectId: req.params.projectId,
      user: req.user.id,
    });
    return res.status(200).json({ message: 'File deleted' });
  }),
);

/**
 * Get project memory entries.
 * @route GET /api/projects/:projectId/memory
 */
router.get(
  '/:projectId/memory',
  asyncHandler(async (req, res) => {
    const project = await db.getProject(req.params.projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    return res.status(200).json({
      memory: project.memory || [],
      memoryUpdatedAt: project.memoryUpdatedAt || null,
    });
  }),
);

/**
 * Delete a single memory entry by index.
 * @route DELETE /api/projects/:projectId/memory/:index
 */
router.delete(
  '/:projectId/memory/:index',
  asyncHandler(async (req, res) => {
    const project = await db.getProject(req.params.projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const index = Number(req.params.index);
    const memory = project.memory || [];
    if (isNaN(index) || index < 0 || index >= memory.length) {
      return res.status(400).json({ message: 'Invalid memory index' });
    }
    memory.splice(index, 1);
    await db.updateProject(req.params.projectId, req.user.id, {
      memory,
      memoryUpdatedAt: new Date(),
    });
    return res.status(200).json({ message: 'Memory entry deleted' });
  }),
);

/**
 * Clear all memory entries for a project.
 * @route DELETE /api/projects/:projectId/memory
 */
router.delete(
  '/:projectId/memory',
  asyncHandler(async (req, res) => {
    const project = await db.getProject(req.params.projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    await db.updateProject(req.params.projectId, req.user.id, {
      memory: [],
      memoryUpdatedAt: new Date(),
    });
    return res.status(200).json({ message: 'Project memory cleared' });
  }),
);

module.exports = router;
