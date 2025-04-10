// const express = require('express');
// const router = express.Router();
// const database = require('../db/database');

// const cooldowns = {}; // In-memory cache to track cooldowns (exerciseId -> timestamp)

// // Helper function to apply cooldown
// const applyCooldown = (exerciseId, res) => {
//   cooldowns[exerciseId] = Date.now() + 30000; // 30 seconds cooldown
//   res.status(400).json({ error: "Incorrect answer. Try again in 30 seconds." });
// };

// // Helper function to save progress
// const saveProgress = (userId, articleId, level, exerciseId, type, correct, res) => {
//   const insertQuery = `INSERT INTO progress (user_id, article_id, level, exercise_number, exercise_type, score) VALUES (?, ?, ?, ?, ?, ?)`;
//   database.run(insertQuery, [userId, articleId, level, exerciseId, type, correct ? 1 : 0], function (err) {
//     if (err) {
//       console.log('Error saving progress:', err.message);
//       return res.status(500).json({ error: "Error saving progress" });
//     }
//     res.json({ message: "Correct answer! Progress saved." });
//   });
// };

// // Helper function to check if an exercise has already been answered correctly
// const checkIfAnsweredCorrectly = (userId, articleId, level, exerciseId, type, callback) => {
//   const query = `SELECT score FROM progress WHERE user_id = ? AND article_id = ? AND level = ? AND exercise_number = ? AND exercise_type = ? AND score = 1`;
//   database.get(query, [userId, articleId, level, exerciseId, type], (err, row) => {
//     if (err) {
//       console.log('Error checking progress:', err.message);
//       return callback(err, null);
//     }
//     callback(null, !!row); // Return true if the exercise was answered correctly
//   });
// };

// // Updated validation functions to prevent re-answering correctly answered exercises
// const validateExercise = (exerciseId, answer, articleId, level, type, res, validationQuery, correctCondition) => {
//   const userId = 1; // Replace with actual user ID logic
//   checkIfAnsweredCorrectly(userId, articleId, level, exerciseId, type, (err, alreadyAnswered) => {
//     if (err) {
//       return res.status(500).json({ error: "Error checking progress" });
//     }
//     if (alreadyAnswered) {
//       return res.status(400).json({ error: "Exercise already answered correctly" });
//     }

//     database.get(validationQuery, [exerciseId], (err, row) => {
//       if (err) {
//         return res.status(500).json({ error: "Error validating answer" });
//       }
//       if (row) {
//         const correct = correctCondition(row, answer);
//         if (correct) {
//           saveProgress(userId, articleId, level, exerciseId, type, true, res);
//         } else {
//           applyCooldown(exerciseId, res);
//         }
//       } else {
//         res.status(404).json({ error: "Exercise not found" });
//       }
//     });
//   });
// };

// const validateMultipleChoice = (exerciseId, answer, articleId, level, type, res) => {
//   const query = `SELECT answer FROM exercises_multiple_choice WHERE id = ?`;
//   validateExercise(exerciseId, answer, articleId, level, type, res, query, (row, answer) => row.answer === answer);
// };

// const validateGapFill = (exerciseId, answer, articleId, level, type, res) => {
//   const query = `SELECT answer FROM exercises_fill_in_the_blanks WHERE id = ?`;
//   validateExercise(exerciseId, answer, articleId, level, type, res, query, (row, answer) => row.answer === answer);
// };

// const validateTrueFalse = (exerciseId, answer, articleId, level, type, res) => {
//   const query = `SELECT answer FROM exercises_true_false WHERE id = ?`;
//   validateExercise(exerciseId, answer, articleId, level, type, res, query, (row, answer) => row.answer === answer);
// };

// const validateVocabularyMatching = (exerciseId, answer, articleId, level, type, res) => {
//   const query = `SELECT definition FROM exercises_vocabulary_matching WHERE id = ?`;
//   validateExercise(exerciseId, answer, articleId, level, type, res, query, (row, answer) => row.definition === answer);
// };

// const validateWriting = (exerciseId, answer, articleId, level, type, res) => {
//   const query = `SELECT sentence FROM exercises_writing_with_audio WHERE id = ?`;
//   validateExercise(exerciseId, answer, articleId, level, type, res, query, (row, answer) => {
//     // Normalize both strings by trimming whitespace and converting to lowercase
//     const correctAnswer = row.sentence.trim().toLowerCase();
//     const userInput = answer.trim().toLowerCase();
//     return correctAnswer === userInput;
//   });
// };

// // Route to validate exercise answer
// router.post('/validate', (req, res) => {
//   const { exerciseId, answer, type, articleId, level } = req.body; // Adicionado level

//   if (!exerciseId || !answer || !type || !articleId || !level) { // Validar level
//     return res.status(400).json({ error: "exerciseId, answer, type, articleId, and level are required" });
//   }

//   // Check if the exercise is on cooldown
//   const now = Date.now();
//   if (cooldowns[exerciseId] && cooldowns[exerciseId] > now) {
//     const remainingTime = Math.ceil((cooldowns[exerciseId] - now) / 1000);
//     return res.status(429).json({ error: `Incorrect exercise. Try again in ${remainingTime} seconds.` });
//   }

//   // Call the appropriate validation based on the type
//   switch (type) {
//     case "multiple_choice":
//       validateMultipleChoice(exerciseId, answer, articleId, level, type, res); // Passar level
//       break;
//     case "fill_in_the_blanks":
//       validateGapFill(exerciseId, answer, articleId, level, type, res); // Passar level
//       break;
//     case "true_false":
//       validateTrueFalse(exerciseId, answer, articleId, level, type, res); // Passar level
//       break;
//     case "vocabulary_matching":
//       validateVocabularyMatching(exerciseId, answer, articleId, level, type, res); // Passar level
//       break;
//     case "writing_with_audio": // Changed from exercises_writing_with_audio for consistency
//       validateWriting(exerciseId, answer, articleId, level, type, res);
//       break;
//     default:
//       res.status(400).json({ error: "Invalid exercise type" });
//   }
// });

// // Route to fetch progress
// router.get('/progress', (req, res) => {
//   const query = `SELECT exercise_number, score FROM progress WHERE user_id = ?`;
//   database.all(query, [1], (err, rows) => { // Hardcoded userId for testing
//     if (err) {
//       return res.status(500).json({ error: "Error fetching progress" });
//     }

//     const correctAnswers = rows.filter(row => row.score).length;
//     const total = rows.length;
//     res.json({ correctAnswers, total });
//   });
// });

// // Route to fetch summarized articles
// router.get('/articles-summary', (req, res) => {
//   const queryArticles = `SELECT id, title, summary, created_date FROM articles`;
//   database.all(queryArticles, [], (err, articles) => {
//     if (err) {
//       return res.status(500).json({ error: "Error fetching articles" });
//     }
//     console.log('Articles fetched from database:', articles);

//     const queryLevels = `SELECT article_id, level FROM levels`;
//     database.all(queryLevels, [], (err, levels) => {
//       if (err) {
//         return res.status(500).json({ error: "Error fetching levels" });
//       }
//       console.log('Levels fetched from database:', levels);

//       const queryProgress = `
//         SELECT article_id, level, COUNT(DISTINCT exercise_number) AS completed, 
//                COUNT(DISTINCT exercise_number) * 100.0 / (4 * 5) AS totalPercentage
//         FROM progress
//         WHERE user_id = ?
//         GROUP BY article_id, level
//       `;
//       database.all(queryProgress, [1], (err, progress) => { // Hardcoded userId for testing
//         if (err) {
//           return res.status(500).json({ error: "Error fetching progress" });
//         }
//         console.log('Progress fetched from database:', progress);

//         // Structure articles with their levels and progress
//         const summarizedArticles = articles.map(article => {
//           const articleLevels = levels
//             .filter(level => level.article_id === article.id)
//             .map(level => {
//               const levelProgress = progress.find(p => p.article_id === article.id && p.level === level.level);
//               return {
//                 level: level.level,
//                 totalPercentage: levelProgress ? Math.round(levelProgress.totalPercentage) : 0
//               };
//             });

//           // Calculate totalPercentage for the article
//           const totalPercentage = articleLevels.length
//             ? Math.round(articleLevels.reduce((sum, level) => sum + level.totalPercentage, 0) / articleLevels.length)
//             : 0;

//           return {
//             ...article,
//             totalPercentage, // Add totalPercentage for the article
//             levels: articleLevels
//           };
//         });

//         res.json(summarizedArticles);
//       });
//     });
//   });
// });

// // Helper function to fetch progress for exercises
// const getAnsweredCorrectlyFlag = (userId, articleId, levels, exercises, type, callback) => {
//   const exerciseIds = exercises.map(ex => ex.id);
//   const query = `
//     SELECT exercise_number, level FROM progress
//     WHERE user_id = ? AND article_id = ? AND exercise_type = ? AND score = 1
//     AND exercise_number IN (${exerciseIds.join(',')})
//   `;
//   database.all(query, [userId, articleId, type], (err, rows) => {
//     if (err) {
//       console.error("Error fetching answered correctly flag:", err.message);
//       return callback(err);
//     }
//     const answeredCorrectlyMap = new Map();
//     rows.forEach(row => {
//       answeredCorrectlyMap.set(`${row.exercise_number}-${row.level}`, true);
//     });
//     exercises.forEach(ex => {
//       ex.answeredCorrectly = answeredCorrectlyMap.has(`${ex.id}-${levels.find(l => l.id === ex.level_id)?.level}`);
//     });
//     callback(null);
//   });
// };

// // Route to fetch a specific article by ID
// router.get('/articles/:id', (req, res) => {
//   const articleId = req.params.id;
//   const userId = 1; // Replace with actual user ID logic
//   const queryArticle = `SELECT * FROM articles WHERE id = ?`;
//   database.get(queryArticle, [articleId], (err, article) => {
//     if (err) {
//       return res.status(500).json({ error: "Error fetching article" });
//     }
//     if (!article) {
//       return res.status(404).json({ error: "Article not found" });
//     }
//     console.log('Article fetched from database:', article);

//     const queryLevels = `SELECT * FROM levels WHERE article_id = ?`;
//     database.all(queryLevels, [articleId], (err, levels) => {
//       if (err) {
//         return res.status(500).json({ error: "Error fetching levels" });
//       }
//       console.log('Levels fetched from database:', levels);

//       const queryExercisesMultipleChoice = `SELECT id, level_id, question, options FROM exercises_multiple_choice WHERE level_id IN (SELECT id FROM levels WHERE article_id = ?)`;
//       database.all(queryExercisesMultipleChoice, [articleId], (err, exercisesMultipleChoice) => {
//         if (err) {
//           return res.status(500).json({ error: "Error fetching multiple choice exercises" });
//         }
//         console.log('Multiple choice exercises fetched from database:', exercisesMultipleChoice);

//         const queryExercisesFillInTheBlanks = `SELECT id, level_id, sentence, hint FROM exercises_fill_in_the_blanks WHERE level_id IN (SELECT id FROM levels WHERE article_id = ?)`;
//         database.all(queryExercisesFillInTheBlanks, [articleId], (err, exercisesFillInTheBlanks) => {
//           if (err) {
//             return res.status(500).json({ error: "Error fetching fill in the blanks exercises" });
//           }
//           console.log('Fill in the blanks exercises fetched from database:', exercisesFillInTheBlanks);

//           const queryExercisesTrueFalse = `SELECT id, level_id, statement FROM exercises_true_false WHERE level_id IN (SELECT id FROM levels WHERE article_id = ?)`;
//           database.all(queryExercisesTrueFalse, [articleId], (err, exercisesTrueFalse) => {
//             if (err) {
//               return res.status(500).json({ error: "Error fetching true/false exercises" });
//             }
//             console.log('True/false exercises fetched from database:', exercisesTrueFalse);

//             const queryExercisesVocabularyMatching = `SELECT id, level_id, word, definition, example FROM exercises_vocabulary_matching WHERE level_id IN (SELECT id FROM levels WHERE article_id = ?)`;
//             database.all(queryExercisesVocabularyMatching, [articleId], (err, exercisesVocabularyMatching) => {
//               if (err) {
//                 return res.status(500).json({ error: "Error fetching vocabulary matching exercises" });
//               }
//               console.log('Vocabulary matching exercises fetched from database:', exercisesVocabularyMatching);

//               const queryExercisesWritingWithAudio = `SELECT id, level_id, sentence FROM exercises_writing_with_audio WHERE level_id IN (SELECT id FROM levels WHERE article_id = ?)`;
//               database.all(queryExercisesWritingWithAudio, [articleId], (err, exercisesWritingWithAudio) => {
//                 if (err) {
//                   return res.status(500).json({ error: "Error fetching writing exercises with audio" });
//                 }
//                 console.log('Writing exercises with audio fetched from database:', exercisesWritingWithAudio);

//                 // Add answeredCorrectly flag to exercises except vocabulary_matching
//                 const tasks = levels.map(level => [
//                   callback => getAnsweredCorrectlyFlag(userId, articleId, levels, exercisesMultipleChoice.filter(exercise => exercise.level_id === level.id), 'multiple_choice', callback),
//                   callback => getAnsweredCorrectlyFlag(userId, articleId, levels, exercisesFillInTheBlanks.filter(exercise => exercise.level_id === level.id), 'fill_in_the_blanks', callback),
//                   callback => getAnsweredCorrectlyFlag(userId, articleId, levels, exercisesTrueFalse.filter(exercise => exercise.level_id === level.id), 'true_false', callback),
//                   callback => getAnsweredCorrectlyFlag(userId, articleId, levels, exercisesWritingWithAudio.filter(exercise => exercise.level_id === level.id), 'writing_with_audio', callback)
//                 ]).flat();

//                 let completedTasks = 0;
//                 tasks.forEach(task => {
//                   task(err => {
//                     if (err) {
//                       return res.status(500).json({ error: "Error processing exercises" });
//                     }
//                     completedTasks++;
//                     if (completedTasks === tasks.length) {
//                       const articleLevels = levels.map(level => {
//                         const exercisesMultipleChoiceLevel = exercisesMultipleChoice.filter(exercise => exercise.level_id === level.id);
//                         const exercisesFillInTheBlanksLevel = exercisesFillInTheBlanks.filter(exercise => exercise.level_id === level.id);
//                         const exercisesTrueFalseLevel = exercisesTrueFalse.filter(exercise => exercise.level_id === level.id);
//                         const exercisesVocabularyMatchingLevel = exercisesVocabularyMatching.filter(exercise => exercise.level_id === level.id);
//                         const exercisesWritingWithAudioLevel = exercisesWritingWithAudio.filter(exercise => exercise.level_id === level.id);

//                         return {
//                           ...level,
//                           exercises: {
//                             multiple_choice: exercisesMultipleChoiceLevel,
//                             fill_in_the_blanks: exercisesFillInTheBlanksLevel,
//                             true_false: exercisesTrueFalseLevel,
//                             vocabulary_matching: exercisesVocabularyMatchingLevel, // Include vocabulary_matching
//                             writing_with_audio: exercisesWritingWithAudioLevel
//                           }
//                         };
//                       });

//                       const completeArticle = {
//                         ...article,
//                         levels: articleLevels
//                       };

//                       // Remove answers from exercises before sending to frontend
//                       completeArticle.levels.forEach(level => {
//                         level.exercises.multiple_choice.forEach(exercise => {
//                           delete exercise.answer;
//                         });
//                         level.exercises.fill_in_the_blanks.forEach(exercise => {
//                           delete exercise.answer;
//                         });
//                         level.exercises.true_false.forEach(exercise => {
//                           delete exercise.answer;
//                         });
//                       });

//                       res.json(completeArticle);
//                     }
//                   });
//                 });
//               });
//             });
//           });
//         });
//       });
//     });
//   });
// });

// let randomLevelCache = null; // Cache to store the random level of the day
// let dateCache = null; // Cache to store the date of the last generated level

// // Route to fetch a random level from the latest published article with phonetic content
// router.get('/random-level', (req, res) => {
//   const today = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD format

//   // Check if there is already a stored level for the current day
//   if (dateCache === today && randomLevelCache) {
//     return res.json(randomLevelCache);
//   }

//   const queryLatestArticle = `SELECT id, title, summary FROM articles ORDER BY created_date DESC LIMIT 1`;
//   database.get(queryLatestArticle, [], (err, article) => {
//     if (err) {
//       return res.status(500).json({ error: "Error fetching the latest published article" });
//     }
//     if (!article) {
//       return res.status(404).json({ error: "No article found" });
//     }

//     const queryLevels = `SELECT * FROM levels WHERE article_id = ?`;
//     database.all(queryLevels, [article.id], (err, levels) => {
//       if (err) {
//         return res.status(500).json({ error: "Error fetching article levels" });
//       }
//       if (levels.length === 0) {
//         return res.status(404).json({ error: "No levels found for the latest article" });
//       }

//       // Select a random level
//       const randomLevel = levels[Math.floor(Math.random() * levels.length)];

//       // Update the cache with the level and the current date
//       randomLevelCache = { ...randomLevel, title: article.title, summary: article.summary };
//       dateCache = today;

//       res.json(randomLevelCache);
//     });
//   });
// });

// // Endpoint to fetch detailed progress of a specific article and level
// router.get('/progress/article', (req, res) => {
//   const { userId, articleId, level } = req.query;

//   if (!userId || !articleId || !level) {
//     return res.status(400).json({ error: "userId, articleId, and level are required" });
//   }

//   const totalExercisesPerType = 5; // Each type has 5 exercises
//   const exerciseTypes = ["multiple_choice", "fill_in_the_blanks", "true_false", "writing_with_audio"]; // Replace vocabulary_matching with writing_with_audio
//   const totalExercises = totalExercisesPerType * exerciseTypes.length;

//   const query = `
//     SELECT exercise_type, COUNT(DISTINCT exercise_number) AS completed, AVG(score) AS averageScore
//     FROM progress
//     WHERE user_id = ? AND article_id = ? AND level = ?
//     GROUP BY exercise_type
//   `;

//   database.all(query, [userId, articleId, level], (err, rows) => {
//     if (err) {
//       console.error("SQL Error:", err.message); // SQL error log for debugging
//       return res.status(500).json({ error: "Error fetching progress data" });
//     }

//     if (!rows || rows.length === 0) {
//       return res.status(404).json({ error: "No progress data found" });
//     }

//     const exercises = exerciseTypes.map(type => {
//       const row = rows.find(r => r.exercise_type === type);
//       const completed = row ? row.completed : 0;
//       const averageScore = row ? Math.round(row.averageScore) : 0;
//       return {
//         type,
//         completed,
//         total: totalExercisesPerType,
//         percentage: Math.round((completed / totalExercisesPerType) * 100),
//         averageScore
//       };
//     });

//     const totalCompleted = exercises.reduce((sum, ex) => sum + ex.completed, 0);
//     const totalPercentage = Math.round((totalCompleted / totalExercises) * 100);

//     res.json({
//       articleId,
//       level,
//       exercises,
//       totalCompleted,
//       totalExercises,
//       totalPercentage
//     });
//   });
// });

// module.exports = router;
const express = require('express');
const router = express.Router();
const { validate } = require('../controllers/exerciseController');
const { checkCooldown } = require('../middleware/cooldown');

router.post('/validate', checkCooldown, validate);

module.exports = router;