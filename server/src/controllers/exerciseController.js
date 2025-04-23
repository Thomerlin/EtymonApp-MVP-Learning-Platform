const { validateExercise, updateReadingTime } = require('../services/exerciseService');
const logger = require('../utils/logger');

const validate = async (req, res) => {
  const { exerciseId, answer, type, articleId, level } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    logger.warn('Authentication required for exercise validation');
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!exerciseId || !answer || !type || !articleId || !level) {
    logger.warn({ userId, type, articleId, level }, 'Missing required exercise validation parameters');
    return res.status(400).json({ error: "exerciseId, answer, type, articleId, and level are required" });
  }

  logger.info({
    userId, 
    exerciseId, 
    type, 
    articleId, 
    level 
  }, 'Validating exercise answer');

  // Call the appropriate validation based on the type
  switch (type) {
    case "multiple_choice":
      validateMultipleChoice(exerciseId, answer, articleId, level, type, userId, res);
      break;
    case "fill_in_the_blanks":
      validateGapFill(exerciseId, answer, articleId, level, type, userId, res);
      break;
    case "true_false":
      validateTrueFalse(exerciseId, answer, articleId, level, type, userId, res);
      break;
    case "vocabulary_matching":
      validateVocabularyMatching(exerciseId, answer, articleId, level, type, userId, res);
      break;
    case "writing_with_audio":
      validateWriting(exerciseId, answer, articleId, level, type, userId, res);
      break;
    default:
      logger.warn({ type }, 'Invalid exercise type');
      res.status(400).json({ error: "Invalid exercise type" });
  }
};

const validateMultipleChoice = (exerciseId, answer, articleId, level, type, userId, res) => {
  const query = `SELECT answer FROM exercises_multiple_choice WHERE id = ?`;
  validateExercise(exerciseId, answer, articleId, level, type, userId, res, query, (row, answer) => row.answer === answer);
};

const validateGapFill = (exerciseId, answer, articleId, level, type, userId, res) => {
  const query = `SELECT answer FROM exercises_fill_in_the_blanks WHERE id = ?`;
  validateExercise(exerciseId, answer, articleId, level, type, userId, res, query, (row, answer) => {
    const correctAnswer = row.answer.trim().toLowerCase();
    const userInput = answer.trim().toLowerCase();
    return correctAnswer === userInput;
  });
};

const validateTrueFalse = (exerciseId, answer, articleId, level, type, userId, res) => {
  const query = `SELECT answer FROM exercises_true_false WHERE id = ?`;
  validateExercise(exerciseId, answer, articleId, level, type, userId, res, query, (row, answer) => row.answer === answer);
};

const validateVocabularyMatching = (exerciseId, answer, articleId, level, type, userId, res) => {
  const query = `SELECT definition FROM exercises_vocabulary_matching WHERE id = ?`;
  validateExercise(exerciseId, answer, articleId, level, type, userId, res, query, (row, answer) => row.definition === answer);
};

const validateWriting = (exerciseId, answer, articleId, level, type, userId, res) => {
  const query = `SELECT sentence FROM exercises_writing_with_audio WHERE id = ?`;
  validateExercise(exerciseId, answer, articleId, level, type, userId, res, query, (row, answer) => {
    const correctAnswer = row.sentence.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    const userInput = answer.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    return correctAnswer === userInput;
  });
};

const updateReadingTimeHandler = async (req, res) => {
  const userId = req.user?.id;
  const { articleId, level, seconds } = req.body;

  if (!userId) {
    logger.warn('Authentication required for updating reading time');
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!articleId || !level || seconds === undefined) {
    logger.warn({ userId, articleId, level, seconds }, 'Missing required parameters for updating reading time');
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    logger.info({ userId, articleId, level, seconds }, 'Updating reading time');
    await updateReadingTime(userId, articleId, level, seconds);
    res.json({ success: true, message: "Reading time updated" });
  } catch (err) {
    logger.error({ err, userId, articleId }, 'Error updating reading time');
    res.status(500).json({ error: "Failed to update reading time" });
  }
};

module.exports = { validate, updateReadingTimeHandler };