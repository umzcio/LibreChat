const express = require('express');
const { isEnabled } = require('@librechat/api');
const {
  getSharedMessages,
  createSharedLink,
  updateSharedLink,
  deleteSharedLink,
  getSharedLinks,
  getSharedLink,
} = require('~/models');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');
const asyncHandler = require('~/server/middleware/asyncHandler');
const router = express.Router();

/**
 * Shared messages
 */
const allowSharedLinks =
  process.env.ALLOW_SHARED_LINKS === undefined || isEnabled(process.env.ALLOW_SHARED_LINKS);

if (allowSharedLinks) {
  const allowSharedLinksPublic = isEnabled(process.env.ALLOW_SHARED_LINKS_PUBLIC);
  router.get(
    '/:shareId',
    allowSharedLinksPublic ? (req, res, next) => next() : requireJwtAuth,
    asyncHandler(async (req, res) => {
      const share = await getSharedMessages(req.params.shareId);

      if (share) {
        res.status(200).json(share);
      } else {
        res.status(404).end();
      }
    }),
  );
}

/**
 * Shared links
 */
router.get(
  '/',
  requireJwtAuth,
  asyncHandler(async (req, res) => {
    const params = {
      pageParam: req.query.cursor,
      pageSize: Math.max(1, parseInt(req.query.pageSize) || 10),
      isPublic: isEnabled(req.query.isPublic),
      sortBy: ['createdAt', 'title'].includes(req.query.sortBy) ? req.query.sortBy : 'createdAt',
      sortDirection: ['asc', 'desc'].includes(req.query.sortDirection)
        ? req.query.sortDirection
        : 'desc',
      search: req.query.search ? decodeURIComponent(req.query.search.trim()) : undefined,
    };

    const result = await getSharedLinks(
      req.user.id,
      params.pageParam,
      params.pageSize,
      params.isPublic,
      params.sortBy,
      params.sortDirection,
      params.search,
    );

    res.status(200).send({
      links: result.links,
      nextCursor: result.nextCursor,
      hasNextPage: result.hasNextPage,
    });
  }),
);

router.get(
  '/link/:conversationId',
  requireJwtAuth,
  asyncHandler(async (req, res) => {
    const share = await getSharedLink(req.user.id, req.params.conversationId);

    return res.status(200).json({
      success: share.success,
      shareId: share.shareId,
      targetMessageId: share.targetMessageId,
      conversationId: req.params.conversationId,
    });
  }),
);

router.post(
  '/:conversationId',
  requireJwtAuth,
  asyncHandler(async (req, res) => {
    const { targetMessageId } = req.body;
    const created = await createSharedLink(req.user.id, req.params.conversationId, targetMessageId);
    if (created) {
      res.status(200).json(created);
    } else {
      res.status(404).end();
    }
  }),
);

router.patch(
  '/:shareId',
  requireJwtAuth,
  asyncHandler(async (req, res) => {
    const { targetMessageId } = req.body ?? {};
    if (targetMessageId !== undefined && typeof targetMessageId !== 'string') {
      return res.status(400).json({ message: 'targetMessageId must be a string' });
    }

    const updatedShare = await updateSharedLink(req.user.id, req.params.shareId, targetMessageId);
    if (updatedShare) {
      res.status(200).json(updatedShare);
    } else {
      res.status(404).end();
    }
  }),
);

router.delete(
  '/:shareId',
  requireJwtAuth,
  asyncHandler(async (req, res) => {
    const result = await deleteSharedLink(req.user.id, req.params.shareId);

    if (!result) {
      return res.status(404).json({ message: 'Share not found' });
    }

    return res.status(200).json(result);
  }),
);

module.exports = router;
