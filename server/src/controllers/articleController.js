const db = require('../db/database');
const { getAnsweredCorrectlyFlag, getArticlesSummary, getRandomLevel } = require('../services/articleService');


const getArticle = async (req, res) => {
  const articleId = req.params.id;
  const userId = 1;

  try {
    const article = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM articles WHERE id = ?`, [articleId], (err, row) => {
        if (err) reject(err);
        if (!row) reject(new Error("Article not found"));
        resolve(row);
      });
    });

    const levels = await new Promise((resolve, reject) => {
      db.all(`SELECT * FROM levels WHERE article_id = ?`, [articleId], (err, rows) => {
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

    await Promise.all(levels.map(level => [
      getAnsweredCorrectlyFlag(userId, articleId, levels, exercises.multiple_choice.filter(e => e.level_id === level.id), 'multiple_choice'),
      getAnsweredCorrectlyFlag(userId, articleId, levels, exercises.fill_in_the_blanks.filter(e => e.level_id === level.id), 'fill_in_the_blanks'),
      getAnsweredCorrectlyFlag(userId, articleId, levels, exercises.true_false.filter(e => e.level_id === level.id), 'true_false'),
      getAnsweredCorrectlyFlag(userId, articleId, levels, exercises.writing_with_audio.filter(e => e.level_id === level.id), 'writing_with_audio')
    ]).flat());

    const articleLevels = levels.map(level => ({
      ...level,
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

    res.json(completeArticle);
  } catch (err) {
    res.status(err.message === "Article not found" ? 404 : 500).json({ error: err.message });
  }
};

const getArticlesSummaryHandler = async (req, res) => {
  try {
    const articles = await getArticlesSummary();
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: "Error fetching articles summary" });
  }
};

const getRandomLevelHandler = async (req, res) => {
  try {
    const level = await getRandomLevel();
    res.json(level);
  } catch (err) {
    const status = err.message === "No article found" || err.message === "No levels found" ? 404 : 500;
    res.status(status).json({ error: err.message });
  }
};

module.exports = { 
  getArticle,
  getArticlesSummaryHandler,
  getRandomLevelHandler 
};
