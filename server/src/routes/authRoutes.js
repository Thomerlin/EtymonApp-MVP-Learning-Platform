const express = require('express');
const passport = require('passport');
const router = express.Router();
const { googleCallback, getCurrentUser, logout } = require('../controllers/authController');
const { authenticateJWT, checkUserExists, checkPermission } = require('../middleware/auth');
const { ADMIN_EMAILS } = require('../config/passport');
const db = require('../config/database');
const logger = require('../utils/logger');

// Google Auth Routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login?error=google_auth_failed',
    session: false
  }),
  googleCallback
);

// Get current user info
router.get('/me', authenticateJWT, getCurrentUser);

// Logout route
router.get('/logout', logout);

// Rota de diagnóstico para verificar o estado da configuração de autenticação
router.get('/status', (req, res) => {
  const authConfig = {
    googleOAuth: {
      clientConfigured: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL}/api/auth/google/callback`
    },
    jwt: {
      secretConfigured: !!process.env.JWT_SECRET,
      audience: process.env.JWT_AUDIENCE || 'etymon-app',
      issuer: process.env.JWT_ISSUER || 'etymon-auth-service'
    },
    session: {
      secretConfigured: !!process.env.SESSION_SECRET,
      secure: process.env.NODE_ENV === 'production'
    },
    roles: {
      adminEmails: process.env.EMAIL_ADM ? 'Configured' : 'Not configured'
    },
    currentSession: {
      isAuthenticated: !!req.user,
      userData: req.user ? {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      } : null
    }
  };

  res.json({
    status: 'Auth system diagnostic',
    config: authConfig,
    timestamp: new Date().toISOString()
  });
});

// Admin-only route using the permission middleware
router.get('/admin-check', authenticateJWT, checkPermission('canManageSystem'), (req, res) => {
  res.json({
    success: true,
    message: 'Você possui acesso de administrador',
    role: req.user.role,
    permissions: req.user.permissions
  });
});

// Route to check specific permissions
router.get('/permissions', authenticateJWT, (req, res) => {
  res.json({
    success: true,
    role: req.user.role,
    permissions: req.user.permissions || {}
  });
});

module.exports = router;