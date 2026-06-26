const multer = require('multer');
const express = require('express');
const { sleep } = require('@librechat/agents');
const {
  isEnabled,
  resolveImportMaxFileSize,
  restoreTenantContextFromReq,
  deleteAllSharedLinksWithCleanup,
  deleteConvoSharedLinksWithCleanup,
} = require('@librechat/api');
const { logger } = require('@librechat/data-schemas');
const { CacheKeys, EModelEndpoint } = require('librechat-data-provider');
const {
  createImportLimiters,
  validateConvoAccess,
  createForkLimiters,
  configMiddleware,
} = require('~/server/middleware');
const { forkConversation, duplicateConversation } = require('~/server/utils/import/fork');
const { storage, importFileFilter } = require('~/server/routes/files/multer');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');
const { importConversations } = require('~/server/utils/import');
const asyncHandler = require('~/server/middleware/asyncHandler');
const getLogStores = require('~/cache/getLogStores');
const db = require('~/models');

const assistantClients = {
  [EModelEndpoint.azureAssistants]: require('~/server/services/Endpoints/azureAssistants'),
  [EModelEndpoint.assistants]: require('~/server/services/Endpoints/assistants'),
};

const router = express.Router();
router.use(requireJwtAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 25;
    const cursor = req.query.cursor;
    const isArchived = isEnabled(req.query.isArchived);
    const search = req.query.search ? decodeURIComponent(req.query.search) : undefined;
    const sortBy = req.query.sortBy || 'updatedAt';
    const sortDirection = req.query.sortDirection || 'desc';
    const zdockId = Array.isArray(req.query.zdockId)
      ? req.query.zdockId[0]
      : req.query.zdockId;

    let tags;
    if (req.query.tags) {
      tags = Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags];
    }

    const result = await db.getConvosByCursor(req.user.id, {
      cursor,
      limit,
      isArchived,
      tags,
      search,
      sortBy,
      sortDirection,
      zdockId,
    });
    res.status(200).json(result);
  }),
);

router.get(
  '/:conversationId',
  asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const convo = await db.getConvo(req.user.id, conversationId);

    if (convo) {
      res.status(200).json(convo);
    } else {
      res.status(404).end();
    }
  }),
);

router.get(
  '/gen_title/:conversationId',
  asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const titleCache = getLogStores(CacheKeys.GEN_TITLE);
    const key = `${req.user.id}-${conversationId}`;
    let title = await titleCache.get(key);

    if (!title) {
      const delays = [500, 1000, 2000, 4000, 8000];
      for (const delay of delays) {
        await sleep(delay);
        title = await titleCache.get(key);
        if (title) {
          break;
        }
      }
    }

    if (title) {
      await titleCache.delete(key);
      res.status(200).json({ title });
    } else {
      res.status(404).json({
        message: "Title not found or method not implemented for the conversation's endpoint",
      });
    }
  }),
);

router.delete(
  '/',
  asyncHandler(async (req, res) => {
    let filter = {};
    const { conversationId, source, thread_id, endpoint } = req.body?.arg ?? {};

    if (!conversationId && !source && !thread_id && !endpoint) {
      return res.status(400).json({
        error: 'no parameters provided',
      });
    }

    if (conversationId) {
      filter = { conversationId };
    } else if (source === 'button') {
      return res.status(200).send('No conversationId provided');
    }

    if (
      typeof endpoint !== 'undefined' &&
      Object.prototype.propertyIsEnumerable.call(assistantClients, endpoint)
    ) {
      /** @type {{ openai: OpenAI }} */
      const { openai } = await assistantClients[endpoint].initializeClient({ req, res });
      try {
        const response = await openai.beta.threads.delete(thread_id);
        logger.debug('Deleted OpenAI thread:', response);
      } catch (error) {
        logger.error('Error deleting OpenAI thread:', error);
      }
    }

    const dbResponse = await db.deleteConvos(req.user.id, filter);
    if (filter.conversationId) {
      await db.deleteToolCalls(req.user.id, filter.conversationId);
      await deleteConvoSharedLinksWithCleanup(req.user.id, filter.conversationId);
    }
    res.status(201).json(dbResponse);
  }),
);

router.delete(
  '/all',
  asyncHandler(async (req, res) => {
    const dbResponse = await db.deleteConvos(req.user.id, {});
    await db.deleteToolCalls(req.user.id);
    await deleteAllSharedLinksWithCleanup(req.user.id);
    res.status(201).json(dbResponse);
  }),
);

/**
 * Archives or unarchives a conversation.
 * @route POST /archive
 */
router.post(
  '/archive',
  validateConvoAccess,
  asyncHandler(async (req, res) => {
    const { conversationId, isArchived } = req.body?.arg ?? {};

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' });
    }

    if (typeof isArchived !== 'boolean') {
      return res.status(400).json({ error: 'isArchived must be a boolean' });
    }

    const dbResponse = await db.saveConvo(
      {
        userId: req?.user?.id,
        isTemporary: req?.body?.isTemporary,
        interfaceConfig: req?.config?.interfaceConfig,
      },
      { conversationId, isArchived },
      { context: `POST /api/convos/archive ${conversationId}` },
    );
    res.status(200).json(dbResponse);
  }),
);

router.post('/pin', validateConvoAccess, async (req, res) => {
  const { conversationId, pinned } = req.body?.arg ?? {};

  if (!conversationId) {
    return res.status(400).json({ error: 'conversationId is required' });
  }

  if (pinned === undefined) {
    return res.status(400).json({ error: 'pinned is required' });
  }

  if (typeof pinned !== 'boolean') {
    return res.status(400).json({ error: 'pinned must be a boolean' });
  }

  try {
    const dbResponse = await db.saveConvo(
      { userId: req.user.id },
      { conversationId, pinned },
      { context: `POST /api/convos/pin ${conversationId}` },
    );
    res.status(200).json(dbResponse);
  } catch (error) {
    logger.error('Error pinning conversation', error);
    res.status(500).send('Error pinning conversation');
  }
});

/** Maximum allowed length for conversation titles */
const MAX_CONVO_TITLE_LENGTH = 1024;

/**
 * Updates a conversation's title.
 * @route POST /update
 */
router.post(
  '/update',
  validateConvoAccess,
  asyncHandler(async (req, res) => {
    const { conversationId, title } = req.body?.arg ?? {};

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' });
    }

    if (title === undefined) {
      return res.status(400).json({ error: 'title is required' });
    }

    if (typeof title !== 'string') {
      return res.status(400).json({ error: 'title must be a string' });
    }

    const sanitizedTitle = title.trim().slice(0, MAX_CONVO_TITLE_LENGTH);

    const dbResponse = await db.saveConvo(
      {
        userId: req?.user?.id,
        isTemporary: req?.body?.isTemporary,
        interfaceConfig: req?.config?.interfaceConfig,
      },
      { conversationId, title: sanitizedTitle },
      { context: `POST /api/convos/update ${conversationId}` },
    );
    res.status(201).json(dbResponse);
  }),
);

const { importIpLimiter, importUserLimiter } = createImportLimiters();
/** Fork and duplicate share one rate-limit budget (same "clone" operation class) */
const { forkIpLimiter, forkUserLimiter } = createForkLimiters();
const importMaxFileSize = resolveImportMaxFileSize();
const upload = multer({
  storage,
  fileFilter: importFileFilter,
  limits: { fileSize: importMaxFileSize },
});
const uploadSingle = upload.single('file');

function handleUpload(req, res, next) {
  uploadSingle(req, res, (err) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'File exceeds the maximum allowed size' });
    }
    if (err) {
      return next(err);
    }
    next();
  });
}

/**
 * Imports a conversation from a JSON file and saves it to the database.
 * @route POST /import
 */
router.post(
  '/import',
  importIpLimiter,
  importUserLimiter,
  configMiddleware,
  handleUpload,
  restoreTenantContextFromReq,
  async (req, res) => {
    try {
      /* TODO: optimize to return imported conversations and add manually */
      await importConversations({
        filepath: req.file.path,
        requestUserId: req.user.id,
        userRole: req.user.role,
        interfaceConfig: req.config?.interfaceConfig,
      });
      res.status(201).json({ message: 'Conversation(s) imported successfully' });
    } catch (error) {
      logger.error('Error processing file', error);
      res.status(500).send('Error processing file');
    }
  },
);

/**
 * POST /fork
 * This route handles forking a conversation.
 */
router.post(
  '/fork',
  forkIpLimiter,
  forkUserLimiter,
  asyncHandler(async (req, res) => {
    /** @type {TForkConvoRequest} */
    const { conversationId, messageId, option, splitAtTarget, latestMessageId } = req.body;
    const result = await forkConversation({
      requestUserId: req.user.id,
      originalConvoId: conversationId,
      targetMessageId: messageId,
      latestMessageId,
      records: true,
      splitAtTarget,
      option,
    });

    res.json(result);
  }),
);

router.post(
  '/duplicate',
  forkIpLimiter,
  forkUserLimiter,
  asyncHandler(async (req, res) => {
    const { conversationId, title } = req.body;

    const result = await duplicateConversation({
      userId: req.user.id,
      conversationId,
      title,
    });
    res.status(201).json(result);
  }),
);

module.exports = router;
