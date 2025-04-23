const express = require('express');
const router = express.Router();
const { authenticateJWT, checkPermission } = require('../middleware/auth');
const { insertContent } = require('../controllers/adminController');
const logger = require('../utils/logger');

// All admin routes require authentication
router.use(authenticateJWT);

// Use specific permissions for different operations
router.post('/content', checkPermission('canWriteContent'), insertContent);

// System management routes
router.get('/status', checkPermission('canManageSystem'), (req, res) => {
  logger.info({
    userId: req.user.id,
    role: req.user.role
  }, 'Admin API status check');
  
  res.json({
    success: true,
    message: 'Admin API is working',
    timestamp: new Date().toISOString(),
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Add a user management endpoint
router.get('/users', checkPermission('canManageUsers'), (req, res) => {
  // This would typically fetch users from database
  // Simplified response for now
  res.json({
    success: true,
    message: 'You have permission to manage users',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
