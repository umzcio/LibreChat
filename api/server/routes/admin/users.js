const express = require('express');
const router = express.Router();
const { User, Balance } = require('~/db/models');
const { createTransaction } = require('~/models/Transaction');
const { isEnabled, getBalanceConfig } = require('@librechat/api');
const { getAppConfig } = require('~/server/services/Config');
const { logger } = require('@librechat/data-schemas');

/**
 * GET /api/admin/users
 * Get all users with optional search
 */
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Get balance for each user
    const usersWithBalance = await Promise.all(
      users.map(async (user) => {
        const balance = await Balance.findOne({ user: user._id }).lean();
        return {
          ...user,
          balance,
        };
      })
    );

    res.json(usersWithBalance);
  } catch (error) {
    logger.error('[Admin Users] Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

/**
 * POST /api/admin/users/:userId/ban
 * Ban a user
 */
router.post('/:userId/ban', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      { isEnabled: false },
      { new: true }
    ).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    logger.info(`[Admin] User ${user.email} banned by ${req.user.email}`);
    res.json({ message: 'User banned successfully', user });
  } catch (error) {
    logger.error('[Admin Users] Error banning user:', error);
    res.status(500).json({ message: 'Error banning user', error: error.message });
  }
});

/**
 * POST /api/admin/users/:userId/unban
 * Unban a user
 */
router.post('/:userId/unban', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      { isEnabled: true },
      { new: true }
    ).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    logger.info(`[Admin] User ${user.email} unbanned by ${req.user.email}`);
    res.json({ message: 'User unbanned successfully', user });
  } catch (error) {
    logger.error('[Admin Users] Error unbanning user:', error);
    res.status(500).json({ message: 'Error unbanning user', error: error.message });
  }
});

/**
 * DELETE /api/admin/users/:userId
 * Delete a user
 */
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't allow deleting admin users
    if (user.role === 'ADMIN') {
      return res.status(403).json({ message: 'Cannot delete admin users' });
    }

    await User.findByIdAndDelete(userId);

    logger.info(`[Admin] User ${user.email} deleted by ${req.user.email}`);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('[Admin Users] Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
});

/**
 * POST /api/admin/users/:userId/balance
 * Add balance to a user
 */
router.post('/:userId/balance', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;

    if (!amount || typeof amount !== 'number') {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if balance system is enabled
    const appConfig = await getAppConfig();
    const balanceConfig = getBalanceConfig(appConfig);

    if (!isEnabled(balanceConfig?.enabled)) {
      return res.status(400).json({ message: 'Balance system is not enabled' });
    }

    // Create transaction to update balance
    const result = await createTransaction({
      user: userId,
      tokenType: 'credits',
      context: 'admin',
      rawAmount: +amount,
      balance: balanceConfig,
    });

    if (!result?.balance) {
      throw new Error('Failed to update balance');
    }

    logger.info(`[Admin] Added ${amount} tokens to user ${user.email} by ${req.user.email}. New balance: ${result.balance}`);
    res.json({
      message: 'Balance updated successfully',
      balance: result.balance,
    });
  } catch (error) {
    logger.error('[Admin Users] Error updating balance:', error);
    res.status(500).json({ message: 'Error updating balance', error: error.message });
  }
});

module.exports = router;
