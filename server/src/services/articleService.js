const db = require('../db/database');

const getAnsweredCorrectlyFlag = (userId, articleId, levels, exercises, type) => {
  // Skip if no user is authenticated
  if (!userId) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const exerciseIds = exercises.map(ex => ex.id);
    if (exerciseIds.length === 0) {
      // If there are no exercises, resolve immediately
      resolve();
      return;
    }
    
    const placeholders = exerciseIds.map(() => '?').join(',');
    const query = `
      SELECT exercise_number, level FROM progress
      WHERE user_id = ? AND article_id = ? AND exercise_type = ? AND score = 1
      AND exercise_number IN (${placeholders})
    `;
    
    // Add exercise IDs to the parameters array
    const params = [userId, articleId, type, ...exerciseIds];
    
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error in getAnsweredCorrectlyFlag:', err);
        return reject(err);
      }
      
      const answeredCorrectlyMap = new Map();
      
      // Create mapping of answered exercises
      rows.forEach(row => {
        answeredCorrectlyMap.set(`${row.exercise_number}-${row.level}`, true);
      });
      
      // Update each exercise with answeredCorrectly flag
      exercises.forEach(ex => {
        const levelValue = levels.find(l => l.id === ex.level_id)?.level;
        ex.answeredCorrectly = answeredCorrectlyMap.has(`${ex.id}-${levelValue}`);
      });
      
      resolve();
    });
  });
};

const getArticlesSummary = (userId) => {
  return new Promise((resolve, reject) => {
    const queryArticles = `SELECT id, title, summary, created_date FROM articles`;
    db.all(queryArticles, [], (err, articles) => {
      if (err) return reject(err);

      const queryLevels = `SELECT article_id, level FROM levels`;
      db.all(queryLevels, [], (err, levels) => {
        if (err) return reject(err);

        // If no userId, return articles without progress
        if (!userId) {
          const summarizedArticles = articles.map(article => {
            const articleLevels = levels
              .filter(level => level.article_id === article.id)
              .map(level => ({
                level: level.level,
                totalPercentage: 0
              }));

            return {
              ...article,
              totalPercentage: 0,
              levels: articleLevels
            };
          });
          
          return resolve(summarizedArticles);
        }

        // With userId, include progress information
        const queryProgress = `
          SELECT article_id, level, COUNT(DISTINCT exercise_number) AS completed, 
               COUNT(DISTINCT exercise_number) * 100.0 / (4 * 5) AS totalPercentage
          FROM progress
          WHERE user_id = ?
          GROUP BY article_id, level
        `;
        db.all(queryProgress, [userId], (err, progress) => {
          if (err) return reject(err);

          const summarizedArticles = articles.map(article => {
            const articleLevels = levels
              .filter(level => level.article_id === article.id)
              .map(level => {
                const levelProgress = progress.find(p => p.article_id === article.id && p.level === level.level);
                return {
                  level: level.level,
                  totalPercentage: levelProgress ? Math.round(levelProgress.totalPercentage) : 0
                };
              });

            const totalPercentage = articleLevels.length
              ? Math.round(articleLevels.reduce((sum, level) => sum + level.totalPercentage, 0) / articleLevels.length)
              : 0;

            return {
              ...article,
              totalPercentage,
              levels: articleLevels
            };
          });

          resolve(summarizedArticles);
        });
      });
    });
  });
};

let randomLevelCache = null;
let dateCache = null;

const getRandomLevel = () => {
  const today = new Date().toISOString().split('T')[0];

  if (dateCache === today && randomLevelCache) {
    return Promise.resolve(randomLevelCache);
  }

  return new Promise((resolve, reject) => {
    const queryLatestArticle = `SELECT id, title, summary FROM articles ORDER BY created_date DESC LIMIT 1`;
    db.get(queryLatestArticle, [], (err, article) => {
      if (err) return reject(err);
      if (!article) return reject(new Error("No article found"));

      const queryLevels = `SELECT * FROM levels WHERE article_id = ?`;
      db.all(queryLevels, [article.id], (err, levels) => {
        if (err) return reject(err);
        if (levels.length === 0) return reject(new Error("No levels found"));

        const randomLevel = levels[Math.floor(Math.random() * levels.length)];
        randomLevelCache = { ...randomLevel, title: article.title, summary: article.summary };
        dateCache = today;
        resolve(randomLevelCache);
      });
    });
  });
};

module.exports = {
  getAnsweredCorrectlyFlag,
  getArticlesSummary,
  getRandomLevel
};
