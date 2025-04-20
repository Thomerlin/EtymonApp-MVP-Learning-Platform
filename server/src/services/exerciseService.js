const database = require('../db/database');

// Helper function to save progress - only for correct answers
const saveProgress = (userId, articleId, level, exerciseId, type, res) => {
  // Check if we already have a record for this exercise
  const checkQuery = `SELECT id FROM progress 
                     WHERE user_id = ? AND article_id = ? AND level = ? 
                     AND exercise_number = ? AND exercise_type = ?`;
  
  database.get(checkQuery, [userId, articleId, level, exerciseId, type], (err, row) => {
    if (err) {
      console.error('Error checking existing progress:', err.message);
      return res.status(500).json({ error: "Error checking progress" });
    }
    
    if (row) {
      // Update existing record to set score to 1
      const updateQuery = `UPDATE progress 
                          SET score = 1 
                          WHERE user_id = ? AND article_id = ? AND level = ? 
                          AND exercise_number = ? AND exercise_type = ?`;
      
      database.run(updateQuery, [userId, articleId, level, exerciseId, type], function (err) {
        if (err) {
          console.error('Error updating progress:', err.message);
          return res.status(500).json({ error: "Error updating progress" });
        }
        return res.json({ 
          message: "Correct answer! Progress saved.",
          correct: true,
          exerciseId,
          answeredCorrectly: true
        });
      });
    } else {
      // Insert new record with score 1
      const insertQuery = `INSERT INTO progress 
                          (user_id, article_id, level, exercise_number, exercise_type, score) 
                          VALUES (?, ?, ?, ?, ?, 1)`;
      
      database.run(insertQuery, [userId, articleId, level, exerciseId, type], function (err) {
        if (err) {
          console.error('Error saving progress:', err.message);
          return res.status(500).json({ error: "Error saving progress" });
        }
        return res.json({
          message: "Correct answer! Progress saved.",
          correct: true,
          exerciseId,
          answeredCorrectly: true
        });
      });
    }
  });
};

// Helper function to check if an exercise has already been answered correctly
const checkIfAnsweredCorrectly = (userId, articleId, level, exerciseId, type, callback) => {
  const query = `SELECT score FROM progress WHERE user_id = ? AND article_id = ? AND level = ? AND exercise_number = ? AND exercise_type = ? AND score = 1`;
  database.get(query, [userId, articleId, level, exerciseId, type], (err, row) => {
    if (err) {
      console.log('Error checking progress:', err.message);
      return callback(err, null);
    }
    callback(null, !!row); // Return true if the exercise was answered correctly
  });
};

// Updated validation function that only saves progress for correct answers
const validateExercise = (exerciseId, answer, articleId, level, type, res, validationQuery, correctCondition) => {
  const userId = 1; // Replace with actual user ID logic
  checkIfAnsweredCorrectly(userId, articleId, level, exerciseId, type, (err, alreadyAnswered) => {
    if (err) {
      return res.status(500).json({ error: "Error checking progress" });
    }
    if (alreadyAnswered) {
      return res.status(400).json({ error: "Exercise already answered correctly" });
    }

    database.get(validationQuery, [exerciseId], (err, row) => {
      if (err) {
        return res.status(500).json({ error: "Error validating answer" });
      }
      if (row) {
        const correct = correctCondition(row, answer);
        
        if (correct) {
          // Save progress only for correct answers
          saveProgress(userId, articleId, level, exerciseId, type, res);
        } else {
          // For incorrect answers, just return an error response without saving
          return res.status(400).json({
            error: "Incorrect answer. Try again.",
            correct: false,
            exerciseId,
            answeredCorrectly: false
          });
        }
      } else {
        res.status(404).json({ error: "Exercise not found" });
      }
    });
  });
};

// Track article reading time
const updateReadingTime = (userId, articleId, level, seconds) => {
  return new Promise((resolve, reject) => {
    // Look for an existing record for this article/level/user to track reading time
    const checkQuery = `
      SELECT id FROM progress 
      WHERE user_id = ? AND article_id = ? AND level = ? AND exercise_type = 'reading'
    `;
    
    database.get(checkQuery, [userId, articleId, level], (err, row) => {
      if (err) {
        return reject(err);
      }
      
      if (row) {
        // Update existing record
        const updateQuery = `
          UPDATE progress 
          SET reading_time = reading_time + ?
          WHERE id = ?
        `;
        
        database.run(updateQuery, [seconds, row.id], (err) => {
          if (err) return reject(err);
          resolve({ updated: true });
        });
      } else {
        // Create a new record specifically for tracking reading time
        const insertQuery = `
          INSERT INTO progress 
          (user_id, article_id, level, exercise_type, exercise_number, score, reading_time) 
          VALUES (?, ?, ?, 'reading', 0, 0, ?)
        `;
        
        database.run(insertQuery, [userId, articleId, level, seconds], function (err) {
          if (err) return reject(err);
          resolve({ inserted: true, id: this.lastID });
        });
      }
    });
  });
};

module.exports = { 
  saveProgress, 
  checkIfAnsweredCorrectly, 
  validateExercise,
  updateReadingTime 
};