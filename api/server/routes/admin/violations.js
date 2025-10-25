const express = require('express');
const router = express.Router();
const { getViolationsByUser, getRecentViolations } = require('~/cache');
const { User } = require('~/db/models');
const { logger } = require('@librechat/data-schemas');

/**
 * GET /api/admin/violations
 * Get recent violations
 */
router.get('/', async (req, res) => {
  try {
    // Get recent violations from cache
    const violations = await getRecentViolations(100);

    // Populate user data
    const violationsWithUsers = await Promise.all(
      violations.map(async (violation) => {
        if (!violation.userId) {
          return violation;
        }

        const user = await User.findById(violation.userId)
          .select('username email')
          .lean();

        return {
          ...violation,
          userId: user || { _id: violation.userId, username: 'Unknown', email: 'N/A' },
        };
      })
    );

    res.json(violationsWithUsers);
  } catch (error) {
    logger.error('[Admin Violations] Error fetching violations:', error);
    res.status(500).json({ message: 'Error fetching violations', error: error.message });
  }
});

/**
 * GET /api/admin/violations/user/:userId
 * Get violations for a specific user
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const violations = await getViolationsByUser(userId);

    res.json(violations);
  } catch (error) {
    logger.error('[Admin Violations] Error fetching user violations:', error);
    res.status(500).json({ message: 'Error fetching user violations', error: error.message });
  }
});

/**
 * GET /api/admin/moderation/stats
 * Get moderation statistics
 */
router.get('/moderation/stats', async (req, res) => {
  try {
    const allViolations = await getRecentViolations(1000);
    const bannedUsers = await User.countDocuments({ isEnabled: false });

    const stats = {
      totalViolations: allViolations.length,
      flaggedMessages: allViolations.filter(v => v.type === 'MODERATION').length,
      bannedUsers,
      activePolicies: 5, // This would come from config
    };

    res.json(stats);
  } catch (error) {
    logger.error('[Admin Moderation] Error fetching moderation stats:', error);
    res.status(500).json({ message: 'Error fetching moderation stats', error: error.message });
  }
});

module.exports = router;
