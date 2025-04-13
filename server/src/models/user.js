const db = require('../config/database');

class User {
  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row);
      });
    });
  }

  static findByGoogleId(googleId) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE google_id = ?', [googleId], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row);
      });
    });
  }

  static findByEmail(email) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row);
      });
    });
  }

  static create(userData) {
    return new Promise((resolve, reject) => {
      const { email, googleId, displayName, profilePicture } = userData;
      
      db.run(
        'INSERT INTO users (email, google_id, display_name, profile_picture) VALUES (?, ?, ?, ?)',
        [email, googleId, displayName, profilePicture],
        function(err) {
          if (err) {
            return reject(err);
          }
          
          resolve({
            id: this.lastID,
            email,
            google_id: googleId,
            display_name: displayName,
            profile_picture: profilePicture
          });
        }
      );
    });
  }

  static update(id, userData) {
    return new Promise((resolve, reject) => {
      const { displayName, profilePicture, googleId } = userData;
      
      db.run(
        'UPDATE users SET display_name = ?, profile_picture = ?, google_id = ? WHERE id = ?',
        [displayName, profilePicture, googleId, id],
        (err) => {
          if (err) {
            return reject(err);
          }
          resolve(true);
        }
      );
    });
  }
}

module.exports = User;
