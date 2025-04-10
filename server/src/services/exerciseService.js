const database = require('../db/database');

// Helper function to save progress
const saveProgress = (userId, articleId, level, exerciseId, type, correct, res) => {
  const insertQuery = `INSERT INTO progress (user_id, article_id, level, exercise_number, exercise_type, score) VALUES (?, ?, ?, ?, ?, ?)`;
  database.run(insertQuery, [userId, articleId, level, exerciseId, type, correct ? 1 : 0], function (err) {
    if (err) {
      console.log('Error saving progress:', err.message);
      return res.status(500).json({ error: "Error saving progress" });
    }
    res.json({ message: "Correct answer! Progress saved." });
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

// Updated validation functions to prevent re-answering correctly answered exercises
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
          saveProgress(userId, articleId, level, exerciseId, type, true, res);
        } 
      } else {
        res.status(404).json({ error: "Exercise not found" });
      }
    });
  });
};

module.exports = { saveProgress, checkIfAnsweredCorrectly, validateExercise };