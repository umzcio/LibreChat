const express = require('express');
const { logger } = require('@librechat/data-schemas');
const { Constants } = require('librechat-data-provider');
const { createCodeWorkspaceService } = require('@librechat/api');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');
const db = require('~/models');

const router = express.Router();

const service = createCodeWorkspaceService({
  createZdock: db.createZdock,
  createFile: db.createFile,
  deleteFileByFilter: db.deleteFileByFilter,
  findFileById: db.findFileById,
  getConvo: db.getConvo,
  getZdock: db.getZdock,
  getZdockFiles: db.getZdockFiles,
  getWorkspaceSession: db.getWorkspaceSession,
  saveConvo: db.saveConvo,
  updateFile: db.updateFile,
  upsertWorkspaceSession: db.upsertWorkspaceSession,
});

router.use(requireJwtAuth);

function normalizeWorkspacePath(filePath) {
  return typeof filePath === 'string' ? filePath.replace(/^\/+/, '') : undefined;
}

function getConversationId(source = {}) {
  const conversationId = source.conversationId;

  return typeof conversationId === 'string' ? conversationId : '';
}

function sendError(res, error, context) {
  logger.error(context, error);

  if (error.message === 'Invalid path') {
    return res.status(400).json({ error: error.message });
  }

  if (error.message === 'Conversation not found') {
    return res.status(404).json({ error: error.message });
  }

  if (error.message === 'Project not found') {
    return res.status(404).json({ error: error.message });
  }

  if (
    error.message === 'Path not found' ||
    error.message === 'Path already exists' ||
    error.message === 'Invalid rename target'
  ) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(500).json({ error: error.message || 'Unexpected code workspace error' });
}

router.get('/session', async (req, res) => {
  try {
    const conversationId = getConversationId(req.query);

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' });
    }

    if (conversationId === Constants.NEW_CONVO) {
      return res.status(200).json({
        activeFile: undefined,
        conversationId,
        hasProject: false,
        mode: 'code',
        openFiles: [],
        pendingConversation: true,
        zdockId: null,
      });
    }

    const session = await service.bootstrapWorkspace(req.user.id, conversationId);
    return res.status(200).json(session);
  } catch (error) {
    return sendError(res, error, '[code] GET /session');
  }
});

router.patch('/session', express.json(), async (req, res) => {
  try {
    const conversationId = getConversationId(req.body);
    const { activeFile, openFiles } = req.body;

    if (!conversationId || conversationId === Constants.NEW_CONVO) {
      return res.status(400).json({ error: 'A persisted conversationId is required' });
    }

    await service.bootstrapWorkspace(req.user.id, conversationId);
    const session = await db.upsertWorkspaceSession(req.user.id, conversationId, {
      activeFile: normalizeWorkspacePath(activeFile),
      openFiles: Array.isArray(openFiles)
        ? openFiles
            .filter((value) => typeof value === 'string')
            .map((value) => normalizeWorkspacePath(value))
            .filter(Boolean)
        : undefined,
    });

    return res.status(200).json({
      activeFile: session?.activeFile ? `/${session.activeFile}` : undefined,
      conversationId,
      mode: 'code',
      openFiles: (session?.openFiles ?? []).map((filePath) => `/${filePath}`),
    });
  } catch (error) {
    return sendError(res, error, '[code] PATCH /session');
  }
});

router.get('/files', async (req, res) => {
  try {
    const conversationId = getConversationId(req.query);

    if (!conversationId || conversationId === Constants.NEW_CONVO) {
      return res.status(400).json({ error: 'A persisted conversationId is required' });
    }

    const result = await service.listFiles(
      req.user.id,
      conversationId,
      typeof req.query.path === 'string' ? req.query.path : '',
    );

    return res.status(200).json(result);
  } catch (error) {
    return sendError(res, error, '[code] GET /files');
  }
});

router.get('/files/content', async (req, res) => {
  try {
    const conversationId = getConversationId(req.query);
    const filePath = typeof req.query.path === 'string' ? req.query.path : '';

    if (!conversationId || !filePath || conversationId === Constants.NEW_CONVO) {
      return res.status(400).json({ error: 'conversationId and path are required' });
    }

    const result = await service.getFileContent(req.user.id, conversationId, filePath);
    return res.status(200).json(result);
  } catch (error) {
    return sendError(res, error, '[code] GET /files/content');
  }
});

router.put('/files/content', express.json({ limit: '5mb' }), async (req, res) => {
  try {
    const conversationId = getConversationId(req.body);
    const filePath = typeof req.body.path === 'string' ? req.body.path : '';
    const content = typeof req.body.content === 'string' ? req.body.content : null;

    if (!conversationId || !filePath || content == null || conversationId === Constants.NEW_CONVO) {
      return res.status(400).json({ error: 'conversationId, path, and content are required' });
    }

    const result = await service.saveFileContent(req.user.id, conversationId, filePath, content);
    return res.status(200).json(result);
  } catch (error) {
    return sendError(res, error, '[code] PUT /files/content');
  }
});

router.post('/files', express.json(), async (req, res) => {
  try {
    const conversationId = getConversationId(req.body);
    const filePath = typeof req.body.path === 'string' ? req.body.path : '';
    const type = req.body.type;

    if (
      !conversationId ||
      !filePath ||
      (type !== 'directory' && type !== 'file') ||
      conversationId === Constants.NEW_CONVO
    ) {
      return res
        .status(400)
        .json({ error: 'conversationId, path, and a valid type are required' });
    }

    const result = await service.createItem(req.user.id, conversationId, filePath, type);
    return res.status(201).json(result);
  } catch (error) {
    return sendError(res, error, '[code] POST /files');
  }
});

router.delete('/files', async (req, res) => {
  try {
    const conversationId = getConversationId(req.query);
    const filePath = typeof req.query.path === 'string' ? req.query.path : '';

    if (!conversationId || !filePath || conversationId === Constants.NEW_CONVO) {
      return res.status(400).json({ error: 'conversationId and path are required' });
    }

    const result = await service.deleteItem(req.user.id, conversationId, filePath);
    return res.status(200).json(result);
  } catch (error) {
    return sendError(res, error, '[code] DELETE /files');
  }
});

router.patch('/files', express.json(), async (req, res) => {
  try {
    const conversationId = getConversationId(req.body);
    const filePath = typeof req.body.path === 'string' ? req.body.path : '';
    const nextPath = typeof req.body.newPath === 'string' ? req.body.newPath : '';

    if (!conversationId || !filePath || !nextPath || conversationId === Constants.NEW_CONVO) {
      return res.status(400).json({ error: 'conversationId, path, and newPath are required' });
    }

    const result = await service.renameItem(req.user.id, conversationId, filePath, nextPath);
    return res.status(200).json(result);
  } catch (error) {
    return sendError(res, error, '[code] PATCH /files');
  }
});

router.get('/changes', async (req, res) => {
  try {
    const conversationId = getConversationId(req.query);

    if (!conversationId || conversationId === Constants.NEW_CONVO) {
      return res.status(400).json({ error: 'A persisted conversationId is required' });
    }

    const changes = await service.listChanges(req.user.id, conversationId);
    return res.status(200).json({ changes });
  } catch (error) {
    return sendError(res, error, '[code] GET /changes');
  }
});

router.get('/diff', async (req, res) => {
  try {
    const conversationId = getConversationId(req.query);
    const filePath = typeof req.query.path === 'string' ? req.query.path : '';

    if (!conversationId || !filePath || conversationId === Constants.NEW_CONVO) {
      return res.status(400).json({ error: 'conversationId and path are required' });
    }

    const diff = await service.getDiff(req.user.id, conversationId, filePath);
    return res.status(200).json(diff);
  } catch (error) {
    return sendError(res, error, '[code] GET /diff');
  }
});

router.post('/apply', express.json(), async (req, res) => {
  try {
    const conversationId = getConversationId(req.body);

    if (!conversationId || conversationId === Constants.NEW_CONVO) {
      return res.status(400).json({ error: 'A persisted conversationId is required' });
    }

    const paths = Array.isArray(req.body.paths)
      ? req.body.paths.filter((value) => typeof value === 'string')
      : undefined;
    const session = await service.applyChanges(req.user.id, conversationId, paths);
    return res.status(200).json(session);
  } catch (error) {
    return sendError(res, error, '[code] POST /apply');
  }
});

router.post('/discard', express.json(), async (req, res) => {
  try {
    const conversationId = getConversationId(req.body);

    if (!conversationId || conversationId === Constants.NEW_CONVO) {
      return res.status(400).json({ error: 'A persisted conversationId is required' });
    }

    const paths = Array.isArray(req.body.paths)
      ? req.body.paths.filter((value) => typeof value === 'string')
      : undefined;
    const result = await service.discardChanges(req.user.id, conversationId, paths);
    return res.status(200).json(result);
  } catch (error) {
    return sendError(res, error, '[code] POST /discard');
  }
});

router.post('/promote', express.json(), async (req, res) => {
  try {
    const conversationId = getConversationId(req.body);

    if (!conversationId || conversationId === Constants.NEW_CONVO) {
      return res.status(400).json({ error: 'A persisted conversationId is required' });
    }

    if (
      typeof req.body.zdockId !== 'string' &&
      typeof req.body.projectName !== 'string'
    ) {
      return res.status(400).json({ error: 'zdockId or projectName is required' });
    }

    const session = await service.promoteWorkspace(req.user.id, conversationId, {
      zdockId: typeof req.body.zdockId === 'string' ? req.body.zdockId : undefined,
      projectName: typeof req.body.projectName === 'string' ? req.body.projectName : undefined,
    });

    return res.status(200).json(session);
  } catch (error) {
    return sendError(res, error, '[code] POST /promote');
  }
});

module.exports = router;
