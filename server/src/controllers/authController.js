const jwt = require('jsonwebtoken');
const db = require('../db/database');
const authConfig = require('../config/auth.config');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, authConfig.jwt.secret, {
    expiresIn: authConfig.jwt.expiresIn
  });
};

exports.googleCallback = (req, res) => {
  // This will be called after successful Google authentication
  const { id, emails, displayName, photos } = req.user;
  const email = emails[0].value;
  const picture = photos?.[0]?.value || null;

  // Check if user exists, if not create new user
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }

    if (user) {
      // User exists, update info if needed
      db.run('UPDATE users SET display_name = ?, picture = ?, google_id = ? WHERE id = ?',
        [displayName, picture, id, user.id], (err) => {
          if (err) return res.status(500).json({ message: err.message });
          
          const token = generateToken(user.id);
          return res.redirect(`/?token=${token}`);
        });
    } else {
      // Create new user
      db.run('INSERT INTO users (email, display_name, picture, google_id) VALUES (?, ?, ?, ?)',
        [email, displayName, picture, id], function(err) {
          if (err) return res.status(500).json({ message: err.message });
          
          const token = generateToken(this.lastID);
          return res.redirect(`/?token=${token}`);
        });
    }
  });
};

exports.getProfile = (req, res) => {
  db.get('SELECT id, email, display_name, picture FROM users WHERE id = ?', [req.userId], (err, user) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  });
};
