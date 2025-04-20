const express = require('express');
const router = express.Router();
const { authenticateJWT, requireAdmin } = require('../middleware/auth');
const { insertContent } = require('../controllers/adminController');

// All admin routes require authentication and admin privileges
router.use(authenticateJWT);
router.use(requireAdmin);

// POST route to insert content (protected for admin only)
router.post('/content', insertContent);

// Health check route for admin API
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'Admin API is working',
    timestamp: new Date().toISOString(),
    user: {
      id: req.user.id,
      email: req.user.email
    }
  });
});

module.exports = router;
