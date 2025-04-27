const express = require('express');
const router = express.Router();
const { authenticateJWT, requireAdmin } = require('../middleware/auth');
const { insertContent, deleteArticle, updateArticle, getArticleById } = require('../controllers/adminController');
const logger = require('../utils/logger');

// All admin routes require authentication first
router.use(authenticateJWT);

// Add the requireAdmin middleware to ensure only users with admin privileges can access any route
// This middleware verifies against the ADMIN_EMAILS whitelist in config/passport.js
router.use(requireAdmin);

// Content management routes - all protected by admin authentication
router.post('/content', insertContent);
router.delete('/article/:articleId', deleteArticle);
router.delete('/content/:articleId', deleteArticle); // Adding alternative path for backward compatibility
router.put('/article/:articleId', updateArticle); // Only admins can update articles
router.get('/article/:articleId', getArticleById); // Route to get article details

// System management routes
router.get('/status', (req, res) => {
  logger.info({
    userId: req.user.id,
    role: req.user.role,
    permissions: req.user.permissions
  }, 'Admin API status check');
  
  res.json({
    success: true,
    message: 'Admin API is working',
    timestamp: new Date().toISOString(),
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      permissions: req.user.permissions
    }
  });
});

module.exports = router;
