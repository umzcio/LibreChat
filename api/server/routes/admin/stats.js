const express = require('express');
const router = express.Router();
const { User, Conversation, Message, Transaction, File } = require('~/models');
const { logger } = require('@librechat/data-schemas');

/**
 * GET /api/admin/stats
 * Get system-wide statistics for the dashboard
 */
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get user counts
    const totalUsers = await User.countDocuments();
    const activeUsers24h = await User.countDocuments({
      lastLoginAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    const activeUsers7d = await User.countDocuments({
      lastLoginAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });
    const activeUsers30d = await User.countDocuments({
      lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });

    // Get conversation and message counts
    const totalConversations = await Conversation.countDocuments();
    const totalMessages = await Message.countDocuments();
    const averageMessagesPerConvo = totalConversations > 0
      ? totalMessages / totalConversations
      : 0;

    // Get token usage from transactions
    const tokensToday = await Transaction.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$tokenUsage' } } },
    ]);

    const tokensThisMonth = await Transaction.aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$tokenUsage' } } },
    ]);

    const totalTokens = await Transaction.aggregate([
      { $group: { _id: null, total: { $sum: '$tokenUsage' } } },
    ]);

    // Get storage usage
    const storageUsed = await File.aggregate([
      { $group: { _id: null, total: { $sum: '$bytes' } } },
    ]);

    const stats = {
      totalUsers,
      activeUsers24h,
      activeUsers7d,
      activeUsers30d,
      totalConversations,
      totalMessages,
      averageMessagesPerConvo: Math.round(averageMessagesPerConvo * 10) / 10,
      tokensToday: tokensToday[0]?.total || 0,
      tokensThisMonth: tokensThisMonth[0]?.total || 0,
      totalTokens: totalTokens[0]?.total || 0,
      storageUsed: storageUsed[0]?.total || 0,
    };

    res.json(stats);
  } catch (error) {
    logger.error('[Admin Stats] Error fetching system stats:', error);
    res.status(500).json({ message: 'Error fetching system statistics', error: error.message });
  }
});

module.exports = router;
