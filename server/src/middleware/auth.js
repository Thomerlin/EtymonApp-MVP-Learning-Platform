const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { safeDbGet } = require('../utils/databaseHelpers');
const logger = require('../utils/logger');
const { ADMIN_EMAILS } = require('../config/passport');

// Middleware para verificar tokens JWT com logs detalhados
const authenticateJWT = (req, res, next) => {
  // Verificar token em diversos locais
  const token = extractTokenFromRequest(req);
  
  if (!token) {
    logger.warn('authenticateJWT: Nenhum token fornecido');
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }

  // Log do token para debug (remova em produção!)
  logger.debug('authenticateJWT: Token recebido para verificação');

  try {
    // Verificar se o SECRET existe
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET não está definido nas variáveis de ambiente');
      return res.status(500).json({ error: 'Erro de configuração do servidor' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.debug({ userId: decoded.id }, 'Token verificado para usuário');
    
    // Verificar se o token não expirou
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      logger.warn('Token expirado');
      return res.status(401).json({ error: 'Token expirado' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Erro na verificação JWT:', error.message);
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Extract token from multiple locations with detailed logging
const extractTokenFromRequest = (req) => {
  // Verificar headers
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    logger.debug('Token encontrado no header Authorization');
    return authHeader.split(' ')[1];
  }
  
  // Verificar cookies
  if (req.cookies && req.cookies.token) {
    logger.debug('Token encontrado nos cookies');
    return req.cookies.token;
  }
  
  // Verificar query parameter
  if (req.query && req.query.token) {
    logger.debug('Token encontrado na query string');
    return req.query.token;
  }
  
  logger.warn('Nenhum token encontrado na requisição');
  return null;
};

// Verificar usuário no banco com tratamento de erros apropriado
const checkUserExists = async (req, res, next) => {
  if (!req.user || !req.user.id) {
    logger.warn('checkUserExists: Usuário não autenticado');
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  try {
    const user = await safeDbGet('SELECT id, email, display_name FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      logger.warn('Usuário não encontrado no banco:', req.user.id);
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    logger.debug({ userId: user.id }, 'Usuário encontrado no banco');
    // Não expõe dados sensíveis
    req.dbUser = {
      id: user.id,
      email: user.email,
      display_name: user.display_name
    };
    
    next();
  } catch (error) {
    logger.error('Erro de banco de dados em checkUserExists:', error.message);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Middleware to require admin privileges - uses admin emails from config
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      logger.warn('requireAdmin: Usuário não autenticado');
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Get user email from database to verify against admin list
    const user = await safeDbGet('SELECT email FROM users WHERE id = ?', [req.user.id]);
    
    if (!user) {
      logger.warn('requireAdmin: Usuário não encontrado:', req.user.id);
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Check if user's email is in the admin list (case insensitive)
    const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());
    
    if (!isAdmin) {
      logger.warn('requireAdmin: Acesso de admin negado para usuário:', req.user.id);
      return res.status(403).json({ error: 'Permissão de administrador negada' });
    }
    
    // Add admin permissions to the user object
    if (!req.user.permissions) req.user.permissions = {};
    
    // Grant all admin permissions
    req.user.permissions.canManageContent = true;
    req.user.permissions.canWriteContent = true;
    req.user.permissions.canManageUsers = true;
    req.user.permissions.canViewAnalytics = true;
    req.user.permissions.canManageSystem = true;
    req.user.role = 'admin';
    
    logger.debug({ 
      userId: req.user.id, 
      permissions: req.user.permissions,
      role: req.user.role
    }, 'requireAdmin: Acesso de admin permitido para usuário com permissões');
    
    next();
  } catch (error) {
    logger.error('Erro em requireAdmin:', error.message);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Check specific permission based on token data
const checkPermission = (permission) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        logger.warn(`checkPermission(${permission}): Usuário não autenticado`);
        return res.status(401).json({ error: 'Não autenticado' });
      }
      
      // Check if user has the required permission
      if (!req.user.permissions || !req.user.permissions[permission]) {
        logger.warn({
          userId: req.user.id,
          permission,
          role: req.user.role
        }, 'Permissão negada');
        return res.status(403).json({ error: 'Permissão negada' });
      }
      
      logger.debug({
        userId: req.user.id,
        permission
      }, 'Permissão concedida');
      next();
    } catch (error) {
      logger.error('Erro ao verificar permissão:', error);
      return res.status(403).json({ error: 'Acesso negado' });
    }
  };
};

// Optional JWT authentication - doesn't reject request if token is missing/invalid
const optionalAuthJWT = (req, res, next) => {
  const token = extractTokenFromRequest(req);
  
  if (!token) {
    logger.debug('optionalAuthJWT: No token provided, continuing as unauthenticated');
    return next();
  }

  try {
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET not defined in environment variables');
      return next();
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    logger.debug({ userId: req.user.id }, 'optionalAuthJWT: User authenticated');
  } catch (error) {
    logger.warn('optionalAuthJWT: Invalid token, continuing as unauthenticated');
    // Don't reject the request, just continue without user object
  }
  
  next();
};

module.exports = {
  authenticateJWT,
  checkUserExists,
  extractTokenFromRequest,
  requireAdmin,
  optionalAuthJWT,
  checkPermission
};
