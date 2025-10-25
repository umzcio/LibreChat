const { logger } = require('@librechat/data-schemas');

/**
 * Middleware to check if the authenticated user has admin role
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    logger.warn('[requireAdmin] No user in request');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.user.role !== 'ADMIN') {
    logger.warn(`[requireAdmin] User ${req.user.email} (${req.user._id}) attempted to access admin endpoint without admin role`);
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }

  logger.debug(`[requireAdmin] Admin access granted to ${req.user.email}`);
  next();
};

module.exports = requireAdmin;
