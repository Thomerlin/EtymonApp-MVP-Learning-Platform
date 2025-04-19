const jwt = require('jsonwebtoken');
const db = require('../db/database'); // Usar db diretamente para diagnosticar
const { v4: uuidv4 } = require('uuid');

// Generate JWT token with improved security
const generateToken = (user) => {
  // Verificar se existe JWT_SECRET
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET não configurado - isso é um problema crítico de segurança');
    throw new Error('JWT_SECRET environment variable is not set');
  }

  console.log('Gerando token para usuário:', {
    id: user.id,
    email: user.email,
    name: user.display_name || user.email.split('@')[0]
  });

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.display_name || user.email.split('@')[0],
      jti: uuidv4() // ID único do token para permitir revogação
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '24h', // Aumentado para facilitar testes
      audience: process.env.JWT_AUDIENCE || 'etymon-app',
      issuer: process.env.JWT_ISSUER || 'etymon-auth-service'
    }
  );
};

// Google callback handler com mais logs para diagnóstico
const googleCallback = (req, res) => {
  try {
    console.log('Google callback: req.user presente?', !!req.user);

    if (!req.user) {
      console.error('req.user não está definido no callback do Google');
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:4200'}/login?error=no_user_data`);
    }

    const token = generateToken(req.user);
    console.log('Token JWT gerado com sucesso');

    // Enviar token em cookies HTTPOnly
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Alterado para lax para funcionar com redirecionamentos
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    });

    // Também envie no redirecionamento para compatibilidade
    const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:4200'}/auth-callback?token=${token}`;
    console.log('Redirecionando para:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Erro ao gerar token:', error);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:4200'}/login?error=${encodeURIComponent(error.message)}`);
  }
};

// Get current user info with improved security
const getCurrentUser = (req, res) => {
  try {
    // Verificar cabeçalho de autorização
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('getCurrentUser: Token não fornecido no header Authorization');
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token recebido para verificação');

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'seu_jwt_secret');
    } catch (err) {
      console.error('Erro na verificação do token:', err.message);
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    if (!decoded || !decoded.id) {
      console.error('Token decodificado não contém ID de usuário');
      return res.status(401).json({ error: 'Token inválido (sem ID)' });
    }

    console.log('Token verificado para o usuário ID:', decoded.id);

    db.get('SELECT id, email, display_name, profile_picture FROM users WHERE id = ?', [decoded.id], (err, user) => {
      if (err) {
        console.error('Erro ao buscar usuário do banco:', err);
        return res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
      }

      if (!user) {
        console.warn('Usuário no token não encontrado no banco:', decoded.id);
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      console.log('Usuário encontrado e retornando dados');
      // Não enviar dados sensíveis
      res.json({
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        profile_picture: user.profile_picture
      });
    });
  } catch (error) {
    console.error('Erro não tratado em getCurrentUser:', error);
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
  logout,
  generateToken
};
