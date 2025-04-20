const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./database');
const crypto = require('crypto');

// Verificar configurações do OAuth no início
console.log('Google OAuth config:', {
	clientID: process.env.GOOGLE_CLIENT_ID ? 'Configurado' : 'AUSENTE!',
	clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Configurado' : 'AUSENTE!',
	callbackURL: `${process.env.SERVER_URL || 'http://localhost:3000'}/api/auth/google/callback`
});

// Generate secure random ID for users
const generateSecureId = () => {
	return crypto.randomBytes(16).toString('hex');
};

passport.serializeUser((user, done) => {
	console.log('Serializando usuário:', user.id);
	done(null, user.id);
});

passport.deserializeUser((id, done) => {
	console.log('Deserializando usuário:', id);
	db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
		if (err) console.error('Erro ao deserializar usuário:', err);
		if (!user) console.warn('Usuário não encontrado durante deserialização:', id);
		done(err, user);
	});
});

passport.use(new GoogleStrategy({
	clientID: process.env.GOOGLE_CLIENT_ID,
	clientSecret: process.env.GOOGLE_CLIENT_SECRET,
	callbackURL: `${process.env.SERVER_URL || 'http://localhost:3000'}/api/auth/google/callback`,
	passReqToCallback: true
},
	function (req, accessToken, refreshToken, profile, done) {
		console.log('Perfil Google recebido:', {
			id: profile.id,
			email: profile.emails?.[0]?.value,
			displayName: profile.displayName
		});

		// Check if user already exists
		db.get('SELECT * FROM users WHERE google_id = ?', [profile.id], (err, user) => {
			if (err) {
				console.error('Erro ao buscar usuário pelo google_id:', err);
				return done(err);
			}

			const email = profile.emails?.[0]?.value;
			// Check if user is admin based on EMAIL_ADM environment variable
			const isAdmin = email === process.env.EMAIL_ADM;
			
			if (user) {
				console.log('Usuário existente encontrado:', user.id);
				// Update existing user and set admin status
				db.run(
					'UPDATE users SET display_name = ?, profile_picture = ?, is_admin = ? WHERE id = ?',
					[profile.displayName, profile.photos?.[0]?.value, isAdmin ? 1 : 0, user.id],
					(err) => {
						if (err) {
							console.error('Erro ao atualizar usuário:', err);
							return done(err);
						}
						
						// Update user object with admin status
						user.is_admin = isAdmin;
						return done(null, user);
					}
				);
			} else {
				// Check if we have a user with the same email
				if (!email) {
					console.error('Email não fornecido pelo Google');
					return done(new Error('Email not provided by Google'));
				}

				db.get('SELECT * FROM users WHERE email = ?', [email], (err, existingUser) => {
					if (err) {
						console.error('Erro ao buscar usuário pelo email:', err);
						return done(err);
					}

					if (existingUser) {
						console.log('Usuário com mesmo email encontrado:', existingUser.id);
						// Link Google to existing account and update admin status
						db.run(
							'UPDATE users SET google_id = ?, display_name = ?, profile_picture = ?, is_admin = ? WHERE id = ?',
							[profile.id, profile.displayName, profile.photos?.[0]?.value, isAdmin ? 1 : 0, existingUser.id],
							(err) => {
								if (err) {
									console.error('Erro ao vincular conta Google:', err);
									return done(err);
								}
								
								existingUser.is_admin = isAdmin;
								return done(null, existingUser);
							}
						);
					} else {
						console.log('Criando novo usuário para:', email);
						// Create new user with secure random ID and admin status
						const userId = generateSecureId();
						const displayName = profile.displayName || email.split('@')[0];
						const profilePicture = profile.photos?.[0]?.value || '';

						db.run(
							'INSERT INTO users (id, email, google_id, display_name, profile_picture, is_admin) VALUES (?, ?, ?, ?, ?, ?)',
							[userId, email, profile.id, displayName, profilePicture, isAdmin ? 1 : 0],
							function (err) {
								if (err) {
									console.error('Erro ao criar usuário:', err);
									return done(err);
								}

								const newUser = {
									id: userId,
									email,
									google_id: profile.id,
									display_name: displayName,
									profile_picture: profilePicture,
									is_admin: isAdmin
								};

								console.log('Novo usuário criado:', userId, isAdmin ? '(Admin)' : '');
								return done(null, newUser);
							}
						);
					}
				});
			}
		});
	}
));
