const express = require('express');
const passport = require('passport');
const { verifyToken } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

// Google OAuth routes
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'] 
}));

router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/login',
    session: false 
  }),
  authController.googleCallback
);

// Get user profile
router.get('/profile', verifyToken, authController.getProfile);

// Check if user is authenticated
router.get('/status', (req, res) => {
  res.json({ isAuthenticated: req.isAuthenticated });
});

module.exports = router;
