const express = require('express');
const router = express.Router();
const { Transaction, Message, User } = require('~/db/models');
const { logger } = require('@librechat/data-schemas');

/**
 * GET /api/admin/analytics
 * Get detailed analytics data
 */
router.get('/', async (req, res) => {
  try {
    // Token usage by endpoint
    const tokensByEndpoint = await Transaction.aggregate([
      {
        $group: {
          _id: '$context',
          total: { $sum: '$tokenUsage' },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]);

    // Daily usage for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dailyUsage = await Message.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          messages: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get token usage for same days
    const dailyTokens = await Transaction.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          tokens: { $sum: '$tokenUsage' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Merge daily usage data
    const dailyUsageMap = new Map(dailyUsage.map(d => [d._id, d.messages]));
    const dailyTokensMap = new Map(dailyTokens.map(d => [d._id, d.tokens]));

    const allDates = new Set([...dailyUsageMap.keys(), ...dailyTokensMap.keys()]);
    const mergedDailyUsage = Array.from(allDates).sort().map(date => ({
      date,
      messages: dailyUsageMap.get(date) || 0,
      tokens: dailyTokensMap.get(date) || 0,
    }));

    // Top users by token usage
    const topUsers = await Transaction.aggregate([
      {
        $group: {
          _id: '$user',
          tokensUsed: { $sum: '$tokenUsage' },
        },
      },
      { $sort: { tokensUsed: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      { $unwind: '$userDetails' },
      {
        $project: {
          _id: 1,
          tokensUsed: 1,
          email: '$userDetails.email',
          username: '$userDetails.username',
        },
      },
    ]);

    // Get message and conversation counts for top users
    const topUsersWithStats = await Promise.all(
      topUsers.map(async (user) => {
        const messageCount = await Message.countDocuments({ user: user._id });
        const conversationCount = await Message.distinct('conversationId', { user: user._id });

        return {
          ...user,
          messageCount,
          conversationCount: conversationCount.length,
        };
      })
    );

    res.json({
      tokensByEndpoint,
      dailyUsage: mergedDailyUsage,
      topUsers: topUsersWithStats,
    });
  } catch (error) {
    logger.error('[Admin Analytics] Error fetching analytics:', error);
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
});

module.exports = router;
