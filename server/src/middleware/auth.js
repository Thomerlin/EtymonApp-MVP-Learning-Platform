const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { safeDbGet } = require('../utils/databaseHelpers');

// Middleware para verificar tokens JWT com logs detalhados
const authenticateJWT = (req, res, next) => {
  // Verificar token em diversos locais
  const token = extractTokenFromRequest(req);
  
  if (!token) {
    console.log('authenticateJWT: Nenhum token fornecido');
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }

  // Log do token para debug (remova em produção!)
  console.log('authenticateJWT: Token recebido para verificação');

  try {
    // Verificar se o SECRET existe
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET não está definido nas variáveis de ambiente');
      return res.status(500).json({ error: 'Erro de configuração do servidor' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verificado para usuário:', decoded.id);
    
    // Verificar se o token não expirou
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      console.log('Token expirado');
      return res.status(401).json({ error: 'Token expirado' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Erro na verificação JWT:', error.message);
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Extract token from multiple locations with detailed logging
const extractTokenFromRequest = (req) => {
  // Verificar headers
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('Token encontrado no header Authorization');
    return authHeader.split(' ')[1];
  }
  
  // Verificar cookies
  if (req.cookies && req.cookies.token) {
    console.log('Token encontrado nos cookies');
    return req.cookies.token;
  }
  
  // Verificar query parameter
  if (req.query && req.query.token) {
    console.log('Token encontrado na query string');
    return req.query.token;
  }
  
  console.log('Nenhum token encontrado na requisição');
  return null;
};

// Verificar usuário no banco com tratamento de erros apropriado
const checkUserExists = async (req, res, next) => {
  if (!req.user || !req.user.id) {
    console.log('checkUserExists: Usuário não autenticado');
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  try {
    const user = await safeDbGet('SELECT id, email, display_name FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      console.warn('Usuário não encontrado no banco:', req.user.id);
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    console.log('Usuário encontrado no banco:', user.id);
    // Não expõe dados sensíveis
    req.dbUser = {
      id: user.id,
      email: user.email,
      display_name: user.display_name
    };
    
    next();
  } catch (error) {
    console.error('Erro de banco de dados em checkUserExists:', error.message);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Middleware to require admin privileges - always check database
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      console.log('requireAdmin: Usuário não autenticado');
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Always check the database for admin status, regardless of token content
    const user = await safeDbGet('SELECT is_admin FROM users WHERE id = ? AND is_admin = 1', [req.user.id]);
    
    if (!user) {
      console.warn('requireAdmin: Acesso de admin negado para usuário:', req.user.id);
      return res.status(403).json({ error: 'Permissão de administrador negada' });
    }
    
    console.log('requireAdmin: Acesso de admin permitido para usuário:', req.user.id);
    next();
  } catch (error) {
    console.error('Erro em requireAdmin:', error.message);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Optional JWT authentication - doesn't reject request if token is missing/invalid
const optionalAuthJWT = (req, res, next) => {
  const token = extractTokenFromRequest(req);
  
  if (!token) {
    console.log('optionalAuthJWT: No token provided, continuing as unauthenticated');
    return next();
  }

  try {
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not defined in environment variables');
      return next();
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log('optionalAuthJWT: User authenticated:', req.user.id);
  } catch (error) {
    console.log('optionalAuthJWT: Invalid token, continuing as unauthenticated');
    // Don't reject the request, just continue without user object
  }
  
  next();
};

module.exports = {
  authenticateJWT,
  checkUserExists,
  extractTokenFromRequest,
  requireAdmin,
  optionalAuthJWT
};
