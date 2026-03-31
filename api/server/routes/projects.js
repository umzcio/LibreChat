const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { sanitizeFilename } = require('@librechat/api');
const { FileSources } = require('librechat-data-provider');
const { logger } = require('@librechat/data-schemas');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');
const db = require('~/models');

const router = express.Router();
router.use(requireJwtAuth);

/**
 * List projects for the authenticated user.
 * @route GET /api/projects
 */
router.get('/', async (req, res) => {
  try {
    const { cursor, limit, isArchived, search } = req.query;
    const result = await db.getProjectsByCursor(req.user.id, {
      cursor: cursor || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      isArchived: isArchived === 'true',
      search: search || undefined,
    });
    return res.status(200).json(result);
  } catch (error) {
    logger.error('[GET /projects]', error);
    return res.status(500).json({ message: 'Error listing projects' });
  }
});

/**
 * Create a new project.
 * @route POST /api/projects
 */
router.post('/', async (req, res) => {
  try {
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
  } catch (error) {
    logger.error('[POST /projects]', error);
    return res.status(500).json({ message: 'Error creating project' });
  }
});

/**
 * Get a project by ID.
 * @route GET /api/projects/:projectId
 */
router.get('/:projectId', async (req, res) => {
  try {
    const project = await db.getProject(req.params.projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    return res.status(200).json(project);
  } catch (error) {
    logger.error('[GET /projects/:projectId]', error);
    return res.status(500).json({ message: 'Error getting project' });
  }
});

/**
 * Update a project.
 * @route PATCH /api/projects/:projectId
 */
router.patch('/:projectId', async (req, res) => {
  try {
    const project = await db.updateProject(req.params.projectId, req.user.id, req.body);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    return res.status(200).json(project);
  } catch (error) {
    logger.error('[PATCH /projects/:projectId]', error);
    return res.status(500).json({ message: 'Error updating project' });
  }
});

/**
 * Delete a project.
 * @route DELETE /api/projects/:projectId
 */
router.delete('/:projectId', async (req, res) => {
  try {
    const result = await db.deleteProject(req.params.projectId, req.user.id);
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    return res.status(200).json({ message: 'Project deleted' });
  } catch (error) {
    logger.error('[DELETE /projects/:projectId]', error);
    return res.status(500).json({ message: 'Error deleting project' });
  }
});

/**
 * Get knowledge base files for a project.
 * @route GET /api/projects/:projectId/files
 */
router.get('/:projectId/files', async (req, res) => {
  try {
    const project = await db.getProject(req.params.projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const files = await db.getProjectFiles(req.params.projectId);
    return res.status(200).json(files);
  } catch (error) {
    logger.error('[GET /projects/:projectId/files]', error);
    return res.status(500).json({ message: 'Error getting project files' });
  }
});

/**
 * Assign conversations to a project.
 * @route POST /api/projects/:projectId/conversations
 */
router.post('/:projectId/conversations', async (req, res) => {
  try {
    const { conversationIds } = req.body;
    if (!Array.isArray(conversationIds) || conversationIds.length === 0) {
      return res.status(400).json({ message: 'conversationIds array is required' });
    }

    const project = await db.getProject(req.params.projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const Conversation = db.default?.models?.Conversation || require('mongoose').models.Conversation;
    await Conversation.updateMany(
      { conversationId: { $in: conversationIds }, user: req.user.id },
      { $set: { projectId: req.params.projectId } },
    );

    return res.status(200).json({ message: 'Conversations assigned to project' });
  } catch (error) {
    logger.error('[POST /projects/:projectId/conversations]', error);
    return res.status(500).json({ message: 'Error assigning conversations' });
  }
});

/**
 * Remove a conversation from a project.
 * @route DELETE /api/projects/:projectId/conversations/:conversationId
 */
router.delete('/:projectId/conversations/:conversationId', async (req, res) => {
  try {
    const Conversation = db.default?.models?.Conversation || require('mongoose').models.Conversation;
    await Conversation.updateOne(
      {
        conversationId: req.params.conversationId,
        user: req.user.id,
        projectId: req.params.projectId,
      },
      { $unset: { projectId: '' } },
    );

    return res.status(200).json({ message: 'Conversation removed from project' });
  } catch (error) {
    logger.error('[DELETE /projects/:projectId/conversations/:conversationId]', error);
    return res.status(500).json({ message: 'Error removing conversation from project' });
  }
});

/**
 * Upload a file to a project's knowledge base.
 * @route POST /api/projects/:projectId/files
 */
const projectFileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const outputPath = path.join(
      req.config?.paths?.uploads || '/app/uploads',
      'temp',
      req.user.id,
    );
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
    cb(null, outputPath);
  },
  filename: function (req, file, cb) {
    req.file_id = crypto.randomUUID();
    file.originalname = decodeURIComponent(file.originalname);
    cb(null, sanitizeFilename(file.originalname));
  },
});

const projectUpload = multer({ storage: projectFileStorage });

router.post('/:projectId/files', projectUpload.single('file'), async (req, res) => {
  try {
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
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (['.txt', '.md', '.csv', '.json', '.xml', '.yaml', '.yml', '.html'].includes(ext)) {
        text = fs.readFileSync(filepath, 'utf-8');
      }
    } catch (readErr) {
      logger.warn('[POST /projects/:projectId/files] Could not extract text', readErr);
    }

    const fileDoc = await db.createFile(
      {
        user: req.user._id || req.user.id,
        file_id: req.file_id,
        filename: req.file.originalname,
        filepath: filepath,
        bytes: req.file.size,
        type: req.file.mimetype,
        source: FileSources.local,
        projectId: req.params.projectId,
        text: text || undefined,
        object: 'file',
        usage: 0,
      },
      true,
    );

    return res.status(201).json(fileDoc);
  } catch (error) {
    logger.error('[POST /projects/:projectId/files]', error);
    return res.status(500).json({ message: 'Error uploading file' });
  }
});

/**
 * Delete a file from a project's knowledge base.
 * @route DELETE /api/projects/:projectId/files/:fileId
 */
router.delete('/:projectId/files/:fileId', async (req, res) => {
  try {
    const project = await db.getProject(req.params.projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await db.deleteFile({ file_id: req.params.fileId });
    return res.status(200).json({ message: 'File deleted' });
  } catch (error) {
    logger.error('[DELETE /projects/:projectId/files/:fileId]', error);
    return res.status(500).json({ message: 'Error deleting file' });
  }
});

module.exports = router;
