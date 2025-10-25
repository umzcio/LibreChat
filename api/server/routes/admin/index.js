const express = require('express');
const router = express.Router();
const requireAdmin = require('~/server/middleware/requireAdmin');
const middleware = require('~/server/middleware');

// Import all admin route modules
const statsRouter = require('./stats');
const usersRouter = require('./users');
const analyticsRouter = require('./analytics');
const violationsRouter = require('./violations');

// Apply JWT auth first (populates req.user), then admin check
router.use(middleware.requireJwtAuth);
router.use(requireAdmin);

// Mount route modules
router.use('/stats', statsRouter);
router.use('/users', usersRouter);
router.use('/analytics', analyticsRouter);
router.use('/violations', violationsRouter);

module.exports = router;
