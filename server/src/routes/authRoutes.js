const express = require('express');
const passport = require('passport');
const router = express.Router();
const { googleCallback, getCurrentUser, logout } = require('../controllers/authController');
const { authenticateJWT, checkUserExists } = require('../middleware/auth');

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
      callbackURL: `${process.env.SERVER_URL || 'http://localhost:3000'}/api/auth/google/callback`
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
    currentSession: {
      isAuthenticated: !!req.user,
      userData: req.user ? {
        id: req.user.id,
        email: req.user.email
      } : null
    }
  };

  res.json({
    status: 'Auth system diagnostic',
    config: authConfig,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;