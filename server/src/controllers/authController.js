const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');
const { generateToken, ADMIN_EMAILS } = require('../config/passport');
const logger = require('../utils/logger');

// Google callback handler with admin handling
const googleCallback = (req, res) => {
  try {
    logger.info('Google callback: req.user presente?', !!req.user);

    if (!req.user) {
      logger.error('req.user não está definido no callback do Google');
      return res.redirect(`${process.env.CLIENT_URL}/login?error=no_user_data`);
    }

    // Use the token generator from passport.js
    const token = generateToken(req.user);
    
    // Verificar se o usuário é admin dinamicamente
    const isAdmin = ADMIN_EMAILS.includes(req.user.email.toLowerCase());
    logger.info(`Token JWT gerado com sucesso ${isAdmin ? '(Admin)' : ''}`);

    // Set cookie expiration based on admin status
    const maxAge = isAdmin ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000;

    // Enviar token em cookies HTTPOnly
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: maxAge, // 15 min for admin, 24h for regular users
      domain: process.env.NODE_ENV === 'production' ? 'etymonapp.com' : undefined // Use domain for production
    });

    // Também envie no redirecionamento para compatibilidade
    const redirectUrl = `${process.env.CLIENT_URL}/auth-callback?token=${token}`;
    logger.info('Redirecionando para:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    logger.error('Erro ao gerar token:', error);
    res.redirect(`${process.env.CLIENT_URL}/login?error=${encodeURIComponent(error.message)}`);
  }
};

// Get current user info - with role information but without exposing admin status directly
const getCurrentUser = (req, res) => {
  try {
    // Verificar cabeçalho de autorização
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('getCurrentUser: Token não fornecido no header Authorization');
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    logger.debug('Token recebido para verificação');

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      logger.error('Erro na verificação do token:', err.message);
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    if (!decoded || !decoded.id) {
      logger.error('Token decodificado não contém ID de usuário');
      return res.status(401).json({ error: 'Token inválido (sem ID)' });
    }

    logger.debug({ userId: decoded.id }, 'Token verificado para o usuário');

    db.get('SELECT id, email, display_name, profile_picture FROM users WHERE id = ?', [decoded.id], (err, user) => {
      if (err) {
        logger.error('Erro ao buscar usuário do banco:', err);
        return res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
      }

      if (!user) {
        logger.warn('Usuário no token não encontrado no banco:', decoded.id);
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Determine role and permissions dynamically
      const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());
      logger.debug('Usuário encontrado e retornando dados', isAdmin ? '(Admin)' : '');
      
      // Return user data with role info but without explicit admin flag
      res.json({
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        profile_picture: user.profile_picture,
        // role: decoded.role,              // Send role from token
        // permissions: decoded.permissions // Send permissions from token
      });
    });
  } catch (error) {
    logger.error('Erro não tratado em getCurrentUser:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Logout handler with improved security
const logout = (req, res) => {
  // Limpar cookie do token
  res.clearCookie('token');

  // Encerrar sessão se estiver usando
  if (req.logout) {
    req.logout(function (err) {
      if (err) {
        logger.error('Error during logout:', err);
        return res.status(500).json({ error: 'Error during logout' });
      }
      res.json({ success: true });
    });
  } else {
    res.json({ success: true });
  }
};

module.exports = {
  googleCallback,
  getCurrentUser,
  logout
};
