const express = require('express');
const router = express.Router();
const { User, Balance, Conversation, Message, Transaction, File } = require('~/db/models');
const { logger } = require('@librechat/data-schemas');

/**
 * GET /api/admin/detailed-analytics/messages
 * Get detailed message analytics
 */
router.get('/messages', async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const userFilter = userId ? { user: userId } : {};
    const filter = { ...dateFilter, ...userFilter };

    // Total message count
    const totalMessages = await Message.countDocuments(filter);

    // User messages vs AI messages
    const userMessages = await Message.countDocuments({ ...filter, isCreatedByUser: true });
    const aiMessages = await Message.countDocuments({ ...filter, isCreatedByUser: false });

    // Messages with errors
    const errorMessages = await Message.countDocuments({ ...filter, error: true });

    // Token usage aggregation
    const tokenStats = await Message.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalTokens: { $sum: '$tokenCount' },
          avgTokens: { $avg: '$tokenCount' },
          maxTokens: { $max: '$tokenCount' },
          minTokens: { $min: '$tokenCount' },
        },
      },
    ]);

    // Messages per user
    const messagesPerUser = await Message.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$user',
          messageCount: { $sum: 1 },
          totalTokens: { $sum: '$tokenCount' },
        },
      },
      { $sort: { messageCount: -1 } },
      { $limit: 10 },
    ]);

    // Populate user details
    const userIds = messagesPerUser.map(m => m._id);
    const users = await User.find({ _id: { $in: userIds } }).select('email username');
    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = { email: u.email, username: u.username };
    });

    const topUsers = messagesPerUser.map(m => ({
      userId: m._id,
      email: userMap[m._id.toString()]?.email || 'Unknown',
      username: userMap[m._id.toString()]?.username || 'Unknown',
      messageCount: m.messageCount,
      totalTokens: m.totalTokens || 0,
    }));

    // Messages over time (daily)
    const messagesOverTime = await Message.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
          tokens: { $sum: '$tokenCount' },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]);

    res.json({
      totalMessages,
      userMessages,
      aiMessages,
      errorMessages,
      errorRate: totalMessages > 0 ? (errorMessages / totalMessages * 100).toFixed(2) : 0,
      tokenStats: tokenStats[0] || { totalTokens: 0, avgTokens: 0, maxTokens: 0, minTokens: 0 },
      topUsers,
      messagesOverTime: messagesOverTime.map(m => ({
        date: m._id,
        count: m.count,
        tokens: m.tokens || 0,
      })),
    });
  } catch (error) {
    logger.error('[Admin Analytics] Error fetching message analytics:', error);
    res.status(500).json({ message: 'Error fetching message analytics', error: error.message });
  }
});

/**
 * GET /api/admin/detailed-analytics/conversations
 * Get conversation analytics
 */
router.get('/conversations', async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const userFilter = userId ? { user: userId } : {};
    const filter = { ...dateFilter, ...userFilter };

    // Total conversations
    const totalConversations = await Conversation.countDocuments(filter);

    // Active vs expired
    const activeConversations = await Conversation.countDocuments({
      ...filter,
      $or: [{ expiredAt: { $exists: false } }, { expiredAt: { $gt: new Date() } }],
    });
    const expiredConversations = totalConversations - activeConversations;

    // Average messages per conversation
    const conversationStats = await Conversation.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'messages',
          localField: 'conversationId',
          foreignField: 'conversationId',
          as: 'messagesList',
        },
      },
      {
        $project: {
          messageCount: { $size: '$messagesList' },
        },
      },
      {
        $group: {
          _id: null,
          avgMessages: { $avg: '$messageCount' },
          maxMessages: { $max: '$messageCount' },
          totalMessages: { $sum: '$messageCount' },
        },
      },
    ]);

    // Conversations per user
    const conversationsPerUser = await Conversation.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$user',
          conversationCount: { $sum: 1 },
        },
      },
      { $sort: { conversationCount: -1 } },
      { $limit: 10 },
    ]);

    // Populate user details
    const userIds = conversationsPerUser.map(c => c._id);
    const users = await User.find({ _id: { $in: userIds } }).select('email username');
    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = { email: u.email, username: u.username };
    });

    const topUsers = conversationsPerUser.map(c => ({
      userId: c._id,
      email: userMap[c._id.toString()]?.email || 'Unknown',
      username: userMap[c._id.toString()]?.username || 'Unknown',
      conversationCount: c.conversationCount,
    }));

    // Conversations over time (daily)
    const conversationsOverTime = await Conversation.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]);

    res.json({
      totalConversations,
      activeConversations,
      expiredConversations,
      conversationStats: conversationStats[0] || { avgMessages: 0, maxMessages: 0, totalMessages: 0 },
      topUsers,
      conversationsOverTime: conversationsOverTime.map(c => ({
        date: c._id,
        count: c.count,
      })),
    });
  } catch (error) {
    logger.error('[Admin Analytics] Error fetching conversation analytics:', error);
    res.status(500).json({ message: 'Error fetching conversation analytics', error: error.message });
  }
});

/**
 * GET /api/admin/detailed-analytics/models
 * Get model usage distribution
 */
router.get('/models', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Model usage from messages
    const modelUsage = await Message.aggregate([
      { $match: { ...dateFilter, model: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$model',
          count: { $sum: 1 },
          totalTokens: { $sum: '$tokenCount' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Endpoint usage from messages
    const endpointUsage = await Message.aggregate([
      { $match: { ...dateFilter, endpoint: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$endpoint',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({
      modelUsage: modelUsage.map(m => ({
        model: m._id,
        messageCount: m.count,
        totalTokens: m.totalTokens || 0,
      })),
      endpointUsage: endpointUsage.map(e => ({
        endpoint: e._id,
        messageCount: e.count,
      })),
    });
  } catch (error) {
    logger.error('[Admin Analytics] Error fetching model analytics:', error);
    res.status(500).json({ message: 'Error fetching model analytics', error: error.message });
  }
});

/**
 * GET /api/admin/detailed-analytics/storage
 * Get file & storage analytics
 */
router.get('/storage', async (req, res) => {
  try {
    const { userId } = req.query;
    const userFilter = userId ? { user: userId } : {};

    // Total storage used
    const storageStats = await File.aggregate([
      { $match: userFilter },
      {
        $group: {
          _id: null,
          totalBytes: { $sum: '$bytes' },
          totalFiles: { $sum: 1 },
          avgFileSize: { $avg: '$bytes' },
        },
      },
    ]);

    // Storage per user
    const storagePerUser = await File.aggregate([
      { $match: {} },
      {
        $group: {
          _id: '$user',
          totalBytes: { $sum: '$bytes' },
          fileCount: { $sum: 1 },
        },
      },
      { $sort: { totalBytes: -1 } },
      { $limit: 10 },
    ]);

    // Populate user details
    const userIds = storagePerUser.map(s => s._id);
    const users = await User.find({ _id: { $in: userIds } }).select('email username');
    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = { email: u.email, username: u.username };
    });

    const topUsers = storagePerUser.map(s => ({
      userId: s._id,
      email: userMap[s._id.toString()]?.email || 'Unknown',
      username: userMap[s._id.toString()]?.username || 'Unknown',
      totalBytes: s.totalBytes,
      totalMB: (s.totalBytes / (1024 * 1024)).toFixed(2),
      fileCount: s.fileCount,
    }));

    // File types distribution
    const fileTypeDistribution = await File.aggregate([
      { $match: userFilter },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalBytes: { $sum: '$bytes' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const stats = storageStats[0] || { totalBytes: 0, totalFiles: 0, avgFileSize: 0 };

    res.json({
      totalBytes: stats.totalBytes,
      totalMB: (stats.totalBytes / (1024 * 1024)).toFixed(2),
      totalGB: (stats.totalBytes / (1024 * 1024 * 1024)).toFixed(2),
      totalFiles: stats.totalFiles,
      avgFileSize: stats.avgFileSize,
      avgFileSizeMB: ((stats.avgFileSize || 0) / (1024 * 1024)).toFixed(2),
      topUsers,
      fileTypeDistribution: fileTypeDistribution.map(f => ({
        type: f._id,
        count: f.count,
        totalBytes: f.totalBytes,
        totalMB: (f.totalBytes / (1024 * 1024)).toFixed(2),
      })),
    });
  } catch (error) {
    logger.error('[Admin Analytics] Error fetching storage analytics:', error);
    res.status(500).json({ message: 'Error fetching storage analytics', error: error.message });
  }
});

/**
 * GET /api/admin/detailed-analytics/transactions
 * Get cost & transaction history
 */
router.get('/transactions', async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const userFilter = userId ? { user: userId } : {};
    const filter = { ...dateFilter, ...userFilter };

    // Total transactions
    const totalTransactions = await Transaction.countDocuments(filter);

    // Transaction statistics
    const transactionStats = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$tokenType',
          count: { $sum: 1 },
          totalTokens: { $sum: '$rawAmount' },
          totalValue: { $sum: '$tokenValue' },
        },
      },
    ]);

    // Transactions per user
    const transactionsPerUser = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$user',
          transactionCount: { $sum: 1 },
          totalTokens: { $sum: '$rawAmount' },
          totalValue: { $sum: '$tokenValue' },
        },
      },
      { $sort: { totalValue: -1 } },
      { $limit: 10 },
    ]);

    // Populate user details
    const userIds = transactionsPerUser.map(t => t._id);
    const users = await User.find({ _id: { $in: userIds } }).select('email username');
    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = { email: u.email, username: u.username };
    });

    const topUsers = transactionsPerUser.map(t => ({
      userId: t._id,
      email: userMap[t._id.toString()]?.email || 'Unknown',
      username: userMap[t._id.toString()]?.username || 'Unknown',
      transactionCount: t.transactionCount,
      totalTokens: t.totalTokens || 0,
      totalValue: t.totalValue || 0,
    }));

    // Transactions over time
    const transactionsOverTime = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
          totalTokens: { $sum: '$rawAmount' },
          totalValue: { $sum: '$tokenValue' },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]);

    res.json({
      totalTransactions,
      transactionStats: transactionStats.map(t => ({
        tokenType: t._id,
        count: t.count,
        totalTokens: t.totalTokens || 0,
        totalValue: t.totalValue || 0,
      })),
      topUsers,
      transactionsOverTime: transactionsOverTime.map(t => ({
        date: t._id,
        count: t.count,
        totalTokens: t.totalTokens || 0,
        totalValue: t.totalValue || 0,
      })),
    });
  } catch (error) {
    logger.error('[Admin Analytics] Error fetching transaction analytics:', error);
    res.status(500).json({ message: 'Error fetching transaction analytics', error: error.message });
  }
});

/**
 * GET /api/admin/detailed-analytics/engagement
 * Get user engagement metrics
 */
router.get('/engagement', async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total users
    const totalUsers = await User.countDocuments();

    // New users (last 30 days)
    const newUsersLast30Days = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Active users (users with messages in last 7 days)
    const activeUserIds = await Message.distinct('user', {
      createdAt: { $gte: sevenDaysAgo },
    });
    const activeUsers = activeUserIds.length;

    // Active users (last 30 days)
    const activeUserIds30Days = await Message.distinct('user', {
      createdAt: { $gte: thirtyDaysAgo },
    });
    const activeUsers30Days = activeUserIds30Days.length;

    // User registration over time
    const userRegistrations = await User.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]);

    // Get last activity for all users
    const lastActivityData = await Message.aggregate([
      {
        $group: {
          _id: '$user',
          lastActivity: { $max: '$createdAt' },
        },
      },
    ]);

    const lastActivityMap = {};
    lastActivityData.forEach(item => {
      lastActivityMap[item._id] = item.lastActivity;
    });

    // Get all users with their last activity
    const users = await User.find({}).select('email username createdAt');
    const userEngagement = users.map(user => ({
      userId: user._id,
      email: user.email,
      username: user.username,
      joinedAt: user.createdAt,
      lastActivity: lastActivityMap[user._id.toString()] || null,
      daysSinceLastActivity: lastActivityMap[user._id.toString()]
        ? Math.floor((now - new Date(lastActivityMap[user._id.toString()])) / (1000 * 60 * 60 * 24))
        : null,
    }));

    // Inactive users (no activity in last 30 days)
    const inactiveUsers = userEngagement.filter(
      u => !u.lastActivity || u.daysSinceLastActivity > 30
    ).length;

    res.json({
      totalUsers,
      newUsersLast30Days,
      activeUsersLast7Days: activeUsers,
      activeUsersLast30Days: activeUsers30Days,
      inactiveUsers,
      retentionRate: totalUsers > 0 ? ((activeUsers30Days / totalUsers) * 100).toFixed(2) : 0,
      userRegistrations: userRegistrations.map(r => ({
        date: r._id,
        count: r.count,
      })),
      recentInactiveUsers: userEngagement
        .filter(u => u.daysSinceLastActivity !== null && u.daysSinceLastActivity > 7)
        .sort((a, b) => b.daysSinceLastActivity - a.daysSinceLastActivity)
        .slice(0, 10),
    });
  } catch (error) {
    logger.error('[Admin Analytics] Error fetching engagement analytics:', error);
    res.status(500).json({ message: 'Error fetching engagement analytics', error: error.message });
  }
});

/**
 * GET /api/admin/detailed-analytics/user/:userId
 * Get detailed analytics for a specific user
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user details
    const user = await User.findById(userId).select('-password -refreshToken');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get balance
    const balance = await Balance.findOne({ user: userId });

    // Message stats
    const messageCount = await Message.countDocuments({ user: userId });
    const tokenUsage = await Message.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalTokens: { $sum: '$tokenCount' },
        },
      },
    ]);

    // Conversation stats
    const conversationCount = await Conversation.countDocuments({ user: userId });

    // File stats
    const fileStats = await File.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalBytes: { $sum: '$bytes' },
        },
      },
    ]);

    // Transaction stats
    const transactionStats = await Transaction.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalTokens: { $sum: '$rawAmount' },
        },
      },
    ]);

    // Last activity
    const lastMessage = await Message.findOne({ user: userId })
      .sort({ createdAt: -1 })
      .select('createdAt');

    res.json({
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        isEnabled: user.isEnabled,
        createdAt: user.createdAt,
      },
      balance: balance?.tokenCredits || 0,
      messageCount,
      totalTokens: tokenUsage[0]?.totalTokens || 0,
      conversationCount,
      fileCount: fileStats[0]?.totalFiles || 0,
      storageBytes: fileStats[0]?.totalBytes || 0,
      storageMB: ((fileStats[0]?.totalBytes || 0) / (1024 * 1024)).toFixed(2),
      transactionCount: transactionStats[0]?.totalTransactions || 0,
      transactionTokens: transactionStats[0]?.totalTokens || 0,
      lastActivity: lastMessage?.createdAt || null,
    });
  } catch (error) {
    logger.error('[Admin Analytics] Error fetching user analytics:', error);
    res.status(500).json({ message: 'Error fetching user analytics', error: error.message });
  }
});

module.exports = router;
