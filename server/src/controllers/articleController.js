const db = require('../db/database');
const { getAnsweredCorrectlyFlag, getArticlesSummary, getRandomLevel } = require('../services/articleService');
const logger = require('../utils/logger');

const getArticle = async (req, res) => {
  const articleId = req.params.id;
  // Extract user ID from req.user (if authenticated) or from query parameter
  const userId = req.user?.id || req.query.userId || null;

  logger.info({ articleId, userId: userId || 'anonymous' }, 'Article request received');

  try {
    const article = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM articles WHERE id = ?`, [articleId], (err, row) => {
        if (err) reject(err);
        if (!row) reject(new Error("Article not found"));
        resolve(row);
      });
    });

    const levels = await new Promise((resolve, reject) => {
      db.all(`SELECT id, level, content, phonetics FROM levels WHERE article_id = ?`, [articleId], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });

    const exerciseQueries = {
      multiple_choice: `SELECT id, level_id, question, options FROM exercises_multiple_choice WHERE level_id IN (SELECT id FROM levels WHERE article_id = ?)`,
      fill_in_the_blanks: `SELECT id, level_id, sentence, hint FROM exercises_fill_in_the_blanks WHERE level_id IN (SELECT id FROM levels WHERE article_id = ?)`,
      true_false: `SELECT id, level_id, statement FROM exercises_true_false WHERE level_id IN (SELECT id FROM levels WHERE article_id = ?)`,
      vocabulary_matching: `SELECT id, level_id, word, definition, example FROM exercises_vocabulary_matching WHERE level_id IN (SELECT id FROM levels WHERE article_id = ?)`,
      writing_with_audio: `SELECT id, level_id, sentence FROM exercises_writing_with_audio WHERE level_id IN (SELECT id FROM levels WHERE article_id = ?)`
    };

    const exercises = {};
    for (const [type, query] of Object.entries(exerciseQueries)) {
      exercises[type] = await new Promise((resolve, reject) => {
        db.all(query, [articleId], (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      });
    }

    // Only get progress flags if user is authenticated
    if (userId) {
      await Promise.all(levels.map(level => [
        getAnsweredCorrectlyFlag(userId, articleId, levels, exercises.multiple_choice.filter(e => e.level_id === level.id), 'multiple_choice'),
        getAnsweredCorrectlyFlag(userId, articleId, levels, exercises.fill_in_the_blanks.filter(e => e.level_id === level.id), 'fill_in_the_blanks'),
        getAnsweredCorrectlyFlag(userId, articleId, levels, exercises.true_false.filter(e => e.level_id === level.id), 'true_false'),
        getAnsweredCorrectlyFlag(userId, articleId, levels, exercises.writing_with_audio.filter(e => e.level_id === level.id), 'writing_with_audio')
      ]).flat());
    } else {
      // For unauthenticated users, set answeredCorrectly to false for all exercises
      Object.values(exercises).forEach(exerciseType => {
        exerciseType.forEach(ex => ex.answeredCorrectly = false);
      });
    }

    const articleLevels = levels.map(level => ({
      ...level,
      hasAudio: true, // Indicate that audio is available
      exercises: {
        multiple_choice: exercises.multiple_choice.filter(e => e.level_id === level.id),
        fill_in_the_blanks: exercises.fill_in_the_blanks.filter(e => e.level_id === level.id),
        true_false: exercises.true_false.filter(e => e.level_id === level.id),
        vocabulary_matching: exercises.vocabulary_matching.filter(e => e.level_id === level.id),
        writing_with_audio: exercises.writing_with_audio.filter(e => e.level_id === level.id)
      }
    }));

    const completeArticle = { ...article, levels: articleLevels };
    completeArticle.levels.forEach(level => {
      level.exercises.multiple_choice.forEach(ex => delete ex.answer);
      level.exercises.fill_in_the_blanks.forEach(ex => delete ex.answer);
      level.exercises.true_false.forEach(ex => delete ex.answer);
    });

    logger.info({ 
      articleId, 
      userId: userId || 'anonymous',
      levelsCount: levels.length
    }, 'Article retrieved successfully');
    
    res.json(completeArticle);
  } catch (err) {
    logger.error({ err, articleId }, 'Error retrieving article');
    res.status(err.message === "Article not found" ? 404 : 500).json({ error: err.message });
  }
};

const getLevelAudio = async (req, res) => {
  const levelId = req.params.levelId;

  try {
    logger.debug({ levelId }, 'Retrieving audio for level');
    
    db.get(`SELECT audio_content FROM levels WHERE id = ?`, [levelId], (err, row) => {
      if (err) {
        logger.error({ err, levelId }, 'Error retrieving audio content');
        return res.status(500).json({ error: 'Error retrieving audio content' });
      }
      
      if (!row || !row.audio_content) {
        logger.warn({ levelId }, 'Audio content not found');
        return res.status(404).json({ error: 'Audio content not found' });
      }
      
      res.set('Content-Type', 'audio/mp3');
      res.send(row.audio_content);
    });
  } catch (err) {
    logger.error({ err, levelId }, 'Error in getLevelAudio');
    res.status(500).json({ error: 'Server error' });
  }
};

const getArticlesSummaryHandler = async (req, res) => {
  // Allow both authenticated and non-authenticated users
  const userId = req.user?.id; // Optional - will be undefined for anonymous users
  
  logger.info({ userId: userId || 'anonymous' }, 'Retrieving articles summary');
  
  try {
    const articles = await getArticlesSummary(userId);
    logger.debug({ articlesCount: articles.length }, 'Articles summary retrieved');
    res.json(articles);
  } catch (err) {
    logger.error({ err }, 'Error fetching articles summary');
    res.status(500).json({ error: "Error fetching articles summary" });
  }
};

const getRandomLevelHandler = async (req, res) => {
  try {
    logger.info('Retrieving random level for daily practice');
    const level = await getRandomLevel();
    res.json(level);
  } catch (err) {
    logger.error({ err }, 'Error getting random level');
    const status = err.message === "No article found" || err.message === "No levels found" ? 404 : 500;
    res.status(status).json({ error: err.message });
  }
};

module.exports = { 
  getArticle,
  getArticlesSummaryHandler,
  getRandomLevelHandler,
  getLevelAudio
};
