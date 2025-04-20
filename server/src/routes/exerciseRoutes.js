const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateJWT } = require('../middleware/auth');
const { validate } = require('../controllers/exerciseController');
const { checkCooldown } = require('../middleware/cooldown');

// Public route - exercise retrieval doesn't require auth
router.get('/:level_id/:type', (req, res) => {
  const { level_id, type } = req.params;
  
  let tableName;
  switch(type) {
    case 'multiple_choice':
      tableName = 'exercises_multiple_choice';
      break;
    case 'fill_in_the_blanks':
      tableName = 'exercises_fill_in_the_blanks';
      break;
    case 'true_false':
      tableName = 'exercises_true_false';
      break;
    case 'writing_with_audio':
      tableName = 'exercises_writing_with_audio';
      break;
    case 'vocabulary_matching':
      tableName = 'exercises_vocabulary_matching';
      break;
    default:
      return res.status(400).json({ message: 'Invalid exercise type' });
  }
  
  db.all(`SELECT * FROM ${tableName} WHERE level_id = ?`, [level_id], (err, exercises) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    res.json(exercises);
  });
});

// Protected route - validation requires auth
router.post('/validate', authenticateJWT, checkCooldown, validate);

module.exports = router;