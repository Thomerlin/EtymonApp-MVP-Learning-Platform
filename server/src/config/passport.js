const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./database');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Verificar configurações do OAuth no início
logger.info('Google OAuth config:', {
    clientID: process.env.GOOGLE_CLIENT_ID ? 'Configurado' : 'AUSENTE!',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Configurado' : 'AUSENTE!',
    callbackURL: `${process.env.SERVER_URL}/api/auth/google/callback`
});

// Lista de admins configurada por env var (mais seguro que confiar apenas no banco)
const ADMIN_EMAILS = process.env.EMAIL_ADM ? process.env.EMAIL_ADM.split(',').map(email => email.trim().toLowerCase()) : [];
logger.info(`Admin emails configured: ${ADMIN_EMAILS.length}`);

// Generate secure random ID for users
const generateSecureId = () => {
    return crypto.randomBytes(16).toString('hex');
};

// Roles e suas permissões
const ROLES = {
    USER: 'user',
    ADMIN: 'admin'
};

// Função para gerar JWT com claims de autorização
const generateToken = (user) => {
    // Verificar se existe JWT_SECRET
    if (!process.env.JWT_SECRET) {
        logger.error('JWT_SECRET não configurado - isso é um problema crítico de segurança');
        throw new Error('JWT_SECRET environment variable is not set');
    }

    // Determinar o papel do usuário baseado nos emails de admin
    const role = ADMIN_EMAILS.includes(user.email.toLowerCase()) ? ROLES.ADMIN : ROLES.USER;
    
    // Criar objeto de permissões baseado no papel
    const permissions = {
        canReadContent: true,
        canWriteContent: role === ROLES.ADMIN,
        canManageUsers: role === ROLES.ADMIN,
        canManageSystem: role === ROLES.ADMIN
    };

    logger.info({
        userId: user.id,
        role: role
    }, 'Generating token for user');

    // Admin tokens still expire in 15 minutes, regular user tokens in 24 hours
    const expiresIn = role === ROLES.ADMIN ? '15m' : '24h';
    
    return jwt.sign(
        { 
            id: user.id,
            email: user.email,
            name: user.display_name || user.email.split('@')[0],
            role,
            permissions,
            jti: crypto.randomBytes(8).toString('hex') // ID único do token para permitir revogação
        },
        process.env.JWT_SECRET,
        { 
            expiresIn: expiresIn,
            audience: process.env.JWT_AUDIENCE || 'etymon-app',
            issuer: process.env.JWT_ISSUER || 'etymon-auth-service'
        }
    );
};

passport.serializeUser((user, done) => {
    logger.debug('Serializando usuário:', user.id);
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    logger.debug('Deserializando usuário:', id);
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
        if (err) logger.error('Erro ao deserializar usuário:', err);
        if (!user) logger.warn('Usuário não encontrado durante deserialização:', id);
        
        if (user) {
            // Não confiar no is_admin do banco, em vez disso, calcular dinamicamente
            user.is_admin = ADMIN_EMAILS.includes(user.email.toLowerCase());
        }
        
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.SERVER_URL}/api/auth/google/callback`,
    passReqToCallback: true
},
    function (req, accessToken, refreshToken, profile, done) {
        logger.info({
            googleId: profile.id,
            email: profile.emails?.[0]?.value
        }, 'Google authentication attempt');

        // Check if user already exists
        db.get('SELECT * FROM users WHERE google_id = ?', [profile.id], (err, user) => {
            if (err) {
                logger.error('Erro ao buscar usuário pelo google_id:', err);
                return done(err);
            }

            const email = profile.emails?.[0]?.value;
            if (!email) {
                logger.error('Email não fornecido pelo Google');
                return done(new Error('Email not provided by Google'));
            }
            
            // Verificar se o email está na lista de admins (agora separado do banco)
            const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
            
            if (user) {
                logger.info('Usuário existente encontrado:', user.id);
                // Update existing user info, but not admin status in DB
                db.run(
                    'UPDATE users SET display_name = ?, profile_picture = ? WHERE id = ?',
                    [profile.displayName, profile.photos?.[0]?.value, user.id],
                    (err) => {
                        if (err) {
                            logger.error('Erro ao atualizar usuário:', err);
                            return done(err);
                        }
                        
                        // Set admin status dynamically, not from DB
                        user.is_admin = isAdmin;
                        return done(null, user);
                    }
                );
            } else {
                // Check if we have a user with the same email
                db.get('SELECT * FROM users WHERE email = ?', [email], (err, existingUser) => {
                    if (err) {
                        logger.error('Erro ao buscar usuário pelo email:', err);
                        return done(err);
                    }

                    if (existingUser) {
                        logger.info('Usuário com mesmo email encontrado:', existingUser.id);
                        // Link Google to existing account
                        db.run(
                            'UPDATE users SET google_id = ?, display_name = ?, profile_picture = ? WHERE id = ?',
                            [profile.id, profile.displayName, profile.photos?.[0]?.value, existingUser.id],
                            (err) => {
                                if (err) {
                                    logger.error('Erro ao vincular conta Google:', err);
                                    return done(err);
                                }
                                
                                // Set admin status dynamically
                                existingUser.is_admin = isAdmin;
                                return done(null, existingUser);
                            }
                        );
                    } else {
                        logger.info('Criando novo usuário para:', email);
                        // Create new user with secure random ID
                        const userId = generateSecureId();
                        const displayName = profile.displayName || email.split('@')[0];
                        const profilePicture = profile.photos?.[0]?.value || '';

                        db.run(
                            'INSERT INTO users (id, email, google_id, display_name, profile_picture) VALUES (?, ?, ?, ?, ?)',
                            [userId, email, profile.id, displayName, profilePicture],
                            function (err) {
                                if (err) {
                                    logger.error('Erro ao criar usuário:', err);
                                    return done(err);
                                }

                                const newUser = {
                                    id: userId,
                                    email,
                                    google_id: profile.id,
                                    display_name: displayName,
                                    profile_picture: profilePicture,
                                    is_admin: isAdmin // Definido dinamicamente, não armazenado no banco
                                };

                                logger.info({
                                    userId: userId,
                                    isAdmin: isAdmin
                                }, 'Novo usuário criado');
                                return done(null, newUser);
                            }
                        );
                    }
                });
            }
        });
    }
));

// Middleware para verificar permissões em rotas protegidas
const checkPermission = (permission) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                logger.warn('Tentativa de acesso sem autenticação');
                return res.status(401).json({ error: 'Não autenticado' });
            }
            
            // Verificar se a permissão existe nos dados do usuário
            if (!req.user.permissions || !req.user.permissions[permission]) {
                logger.warn({
                    userId: req.user.id,
                    permission: permission,
                    role: req.user.role
                }, 'Permissão negada');
                return res.status(403).json({ error: 'Permissão negada' });
            }
            
            logger.debug({
                userId: req.user.id,
                permission: permission
            }, 'Permissão concedida');
            next();
        } catch (error) {
            logger.error('Erro ao verificar permissão:', error);
            return res.status(403).json({ error: 'Acesso negado' });
        }
    };
};

module.exports = {
    passport,
    generateToken,
    checkPermission,
    ROLES,
    ADMIN_EMAILS,
    generateSecureId
};
