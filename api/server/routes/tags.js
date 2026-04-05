const express = require('express');
const { generateCheckAccess } = require('@librechat/api');
const { PermissionTypes, Permissions } = require('librechat-data-provider');
const {
  updateTagsForConversation,
  updateConversationTag,
  createConversationTag,
  deleteConversationTag,
  getConversationTags,
  getRoleByName,
} = require('~/models');
const { requireJwtAuth } = require('~/server/middleware');
const asyncHandler = require('~/server/middleware/asyncHandler');

const router = express.Router();

const checkBookmarkAccess = generateCheckAccess({
  permissionType: PermissionTypes.BOOKMARKS,
  permissions: [Permissions.USE],
  getRoleByName,
});

router.use(requireJwtAuth);
router.use(checkBookmarkAccess);

/**
 * GET /
 * Retrieves all conversation tags for the authenticated user.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const tags = await getConversationTags(req.user.id);
    if (tags) {
      res.status(200).json(tags);
    } else {
      res.status(404).end();
    }
  }),
);

/**
 * POST /
 * Creates a new conversation tag for the authenticated user.
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const tag = await createConversationTag(req.user.id, req.body);
    res.status(200).json(tag);
  }),
);

/**
 * PUT /:tag
 * Updates an existing conversation tag for the authenticated user.
 */
router.put(
  '/:tag',
  asyncHandler(async (req, res) => {
    const decodedTag = decodeURIComponent(req.params.tag);
    const tag = await updateConversationTag(req.user.id, decodedTag, req.body);
    if (tag) {
      res.status(200).json(tag);
    } else {
      res.status(404).json({ error: 'Tag not found' });
    }
  }),
);

/**
 * DELETE /:tag
 * Deletes a conversation tag for the authenticated user.
 */
router.delete(
  '/:tag',
  asyncHandler(async (req, res) => {
    const decodedTag = decodeURIComponent(req.params.tag);
    const tag = await deleteConversationTag(req.user.id, decodedTag);
    if (tag) {
      res.status(200).json(tag);
    } else {
      res.status(404).json({ error: 'Tag not found' });
    }
  }),
);

/**
 * PUT /convo/:conversationId
 * Updates the tags for a conversation.
 */
router.put(
  '/convo/:conversationId',
  asyncHandler(async (req, res) => {
    const conversationTags = await updateTagsForConversation(
      req.user.id,
      req.params.conversationId,
      req.body.tags,
    );
    res.status(200).json(conversationTags);
  }),
);

module.exports = router;
