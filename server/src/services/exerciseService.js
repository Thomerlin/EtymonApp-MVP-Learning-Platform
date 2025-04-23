const database = require('../db/database');
const logger = require('../utils/logger');

// Helper function to save progress - only for correct answers
const saveProgress = (userId, articleId, level, exerciseId, type, res) => {
  // Check if we already have a record for this exercise
  const checkQuery = `SELECT id FROM progress 
                     WHERE user_id = ? AND article_id = ? AND level = ? 
                     AND exercise_number = ? AND exercise_type = ?`;
  
  logger.debug({ userId, articleId, level, exerciseId, type }, 'Checking existing progress');
  
  database.get(checkQuery, [userId, articleId, level, exerciseId, type], (err, row) => {
    if (err) {
      logger.error({ err, userId, exerciseId }, 'Error checking existing progress');
      return res.status(500).json({ error: "Error checking progress" });
    }
    
    if (row) {
      // Update existing record to set score to 1
      const updateQuery = `UPDATE progress 
                          SET score = 1 
                          WHERE user_id = ? AND article_id = ? AND level = ? 
                          AND exercise_number = ? AND exercise_type = ?`;
      
      logger.debug({ userId, exerciseId, progressId: row.id }, 'Updating existing progress record');
      
      database.run(updateQuery, [userId, articleId, level, exerciseId, type], function (err) {
        if (err) {
          logger.error({ err, userId, exerciseId }, 'Error updating progress');
          return res.status(500).json({ error: "Error updating progress" });
        }
        logger.info({ userId, exerciseId, type }, 'Progress updated for correct answer');
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
      
      logger.debug({ userId, articleId, level, exerciseId, type }, 'Creating new progress record');
      
      database.run(insertQuery, [userId, articleId, level, exerciseId, type], function (err) {
        if (err) {
          logger.error({ err, userId, exerciseId }, 'Error saving progress');
          return res.status(500).json({ error: "Error saving progress" });
        }
        logger.info({ userId, exerciseId, type }, 'Progress created for correct answer');
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
  
  logger.debug({ userId, exerciseId, type }, 'Checking if exercise already answered correctly');
  
  database.get(query, [userId, articleId, level, exerciseId, type], (err, row) => {
    if (err) {
      logger.error({ err, userId, exerciseId }, 'Error checking if exercise answered correctly');
      return callback(err, null);
    }
    callback(null, !!row); // Return true if the exercise was answered correctly
  });
};

// Updated validation function that only saves progress for correct answers
const validateExercise = (exerciseId, answer, articleId, level, type, userId, res, validationQuery, correctCondition) => {
  if (!userId) {
    logger.warn('Authentication required for validating exercise');
    return res.status(401).json({ error: "Authentication required to save progress" });
  }

  checkIfAnsweredCorrectly(userId, articleId, level, exerciseId, type, (err, alreadyAnswered) => {
    if (err) {
      return res.status(500).json({ error: "Error checking progress" });
    }
    if (alreadyAnswered) {
      logger.debug({ userId, exerciseId }, 'Exercise already answered correctly');
      return res.status(400).json({ error: "Exercise already answered correctly" });
    }

    database.get(validationQuery, [exerciseId], (err, row) => {
      if (err) {
        logger.error({ err, exerciseId }, 'Error validating answer');
        return res.status(500).json({ error: "Error validating answer" });
      }
      if (row) {
        const correct = correctCondition(row, answer);
        
        if (correct) {
          logger.debug({ userId, exerciseId }, 'Answer is correct, saving progress');
          // Save progress only for correct answers
          saveProgress(userId, articleId, level, exerciseId, type, res);
        } else {
          logger.debug({ userId, exerciseId }, 'Answer is incorrect');
          // For incorrect answers, just return an error response without saving
          return res.status(400).json({
            error: "Incorrect answer. Try again.",
            correct: false,
            exerciseId,
            answeredCorrectly: false
          });
        }
      } else {
        logger.warn({ exerciseId }, 'Exercise not found');
        res.status(404).json({ error: "Exercise not found" });
      }
    });
  });
};

// Track article reading time
const updateReadingTime = (userId, articleId, level, seconds) => {
  return new Promise((resolve, reject) => {
    logger.debug({ userId, articleId, level, seconds }, 'Updating reading time');
    
    // Look for an existing record for this article/level/user to track reading time
    const checkQuery = `
      SELECT id FROM progress 
      WHERE user_id = ? AND article_id = ? AND level = ? AND exercise_type = 'reading'
    `;
    
    database.get(checkQuery, [userId, articleId, level], (err, row) => {
      if (err) {
        logger.error({ err, userId, articleId }, 'Error checking reading time record');
        return reject(err);
      }
      
      if (row) {
        // Update existing record
        const updateQuery = `
          UPDATE progress 
          SET reading_time = reading_time + ?
          WHERE id = ?
        `;
        
        logger.debug({ userId, articleId, progressId: row.id, seconds }, 'Updating existing reading time');
        
        database.run(updateQuery, [seconds, row.id], (err) => {
          if (err) {
            logger.error({ err, userId, articleId, progressId: row.id }, 'Error updating reading time');
            return reject(err);
          }
          logger.info({ userId, articleId, seconds }, 'Reading time updated');
          resolve({ updated: true });
        });
      } else {
        // Create a new record specifically for tracking reading time
        const insertQuery = `
          INSERT INTO progress 
          (user_id, article_id, level, exercise_type, exercise_number, score, reading_time) 
          VALUES (?, ?, ?, 'reading', 0, 0, ?)
        `;
        
        logger.debug({ userId, articleId, level, seconds }, 'Creating new reading time record');
        
        database.run(insertQuery, [userId, articleId, level, seconds], function (err) {
          if (err) {
            logger.error({ err, userId, articleId }, 'Error creating reading time record');
            return reject(err);
          }
          logger.info({ userId, articleId, seconds, newId: this.lastID }, 'New reading time record created');
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