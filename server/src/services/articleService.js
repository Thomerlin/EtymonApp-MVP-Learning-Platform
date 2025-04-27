const db = require('../db/database');
const logger = require('../utils/logger');

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
    
    logger.debug({ userId, articleId, type, exerciseCount: exerciseIds.length }, 'Checking answered correctly flags');
    
    db.all(query, params, (err, rows) => {
      if (err) {
        logger.error({ err, userId, articleId, type }, 'Error in getAnsweredCorrectlyFlag');
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
      
      logger.debug({
        userId,
        articleId,
        type,
        answeredCount: rows.length,
      }, 'AnsweredCorrectly flags applied');
      
      resolve();
    });
  });
};

const getArticlesSummary = (userId) => {
  return new Promise((resolve, reject) => {
    logger.info({ userId: userId || 'anonymous' }, 'Retrieving articles summary');
    
    const queryArticles = `SELECT id, title, summary, created_date FROM articles`;
    db.all(queryArticles, [], (err, articles) => {
      if (err) {
        logger.error({ err }, 'Error retrieving articles');
        return reject(err);
      }

      const queryLevels = `SELECT article_id, level FROM levels`;
      db.all(queryLevels, [], (err, levels) => {
        if (err) {
          logger.error({ err }, 'Error retrieving levels');
          return reject(err);
        }

        // If no userId, return articles without progress
        if (!userId) {
          logger.debug('No user ID provided, returning articles without progress');
          
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
        logger.debug({ userId }, 'Retrieving progress for articles');
        const queryProgress = `
          SELECT article_id, level, COUNT(DISTINCT exercise_number) AS completed, 
               COUNT(DISTINCT exercise_number) * 100.0 / (4 * 5) AS totalPercentage
          FROM progress
          WHERE user_id = ?
          GROUP BY article_id, level
        `;
        db.all(queryProgress, [userId], (err, progress) => {
          if (err) {
            logger.error({ err, userId }, 'Error retrieving progress data');
            return reject(err);
          }

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

          logger.info({
            userId,
            articlesCount: summarizedArticles.length
          }, 'Articles summary with progress retrieved');
          
          resolve(summarizedArticles);
        });
      });
    });
  });
};

let randomLevelCache = null;
let dateCache = null;

const resetRandomLevelCache = () => {
  randomLevelCache = null;
  dateCache = null;
  logger.debug('Random level cache reset');
};

const getRandomLevel = () => {
  const today = new Date().toISOString().split('T')[0];

  if (dateCache === today && randomLevelCache) {
    // Verify that the cached article still exists before using it
    return new Promise((resolve, reject) => {
      db.get('SELECT id FROM articles WHERE id = ?', [randomLevelCache.article_id], (err, article) => {
        if (err) {
          logger.error({ err }, 'Error verifying cached article existence');
          resetRandomLevelCache(); // Reset cache on error
          getRandomLevel().then(resolve).catch(reject); // Try again with fresh data
          return;
        }
        
        if (article) {
          logger.debug('Using cached daily random level - article verified');
          resolve(randomLevelCache);
        } else {
          logger.warn({ articleId: randomLevelCache.article_id }, 'Cached article no longer exists, selecting new one');
          resetRandomLevelCache(); // Reset cache since article doesn't exist
          getRandomLevel().then(resolve).catch(reject); // Try again with fresh data
        }
      });
    });
  }

  logger.info('Selecting new random level for today');
  
  return new Promise((resolve, reject) => {
    // Get the latest article that still exists in the database
    const queryLatestArticle = `SELECT id, title, summary FROM articles ORDER BY created_date DESC LIMIT 1`;
    db.get(queryLatestArticle, [], (err, article) => {
      if (err) {
        logger.error({ err }, 'Error retrieving latest article');
        return reject(err);
      }
      if (!article) {
        logger.warn('No article found for random level');
        return reject(new Error("No article found"));
      }

      logger.debug({ articleId: article.id, title: article.title }, 'Latest article found for random level');

      const queryLevels = `SELECT * FROM levels WHERE article_id = ?`;
      db.all(queryLevels, [article.id], (err, levels) => {
        if (err) {
          logger.error({ err, articleId: article.id }, 'Error retrieving levels');
          return reject(err);
        }
        if (levels.length === 0) {
          logger.warn({ articleId: article.id }, 'No levels found for latest article, looking for another article');
          
          // Attempt to find another article with levels
          const queryAnotherArticle = `
            SELECT a.id, a.title, a.summary 
            FROM articles a
            WHERE EXISTS (SELECT 1 FROM levels l WHERE l.article_id = a.id)
            ORDER BY a.created_date DESC
            LIMIT 1
          `;
          
          db.get(queryAnotherArticle, [], (err, alternativeArticle) => {
            if (err || !alternativeArticle) {
              logger.error({ err }, 'Could not find any article with levels');
              return reject(new Error("No articles with levels found"));
            }
            
            // Now get levels for the alternative article
            db.all(queryLevels, [alternativeArticle.id], (err, alternativeLevels) => {
              if (err || alternativeLevels.length === 0) {
                logger.error({ err }, 'Error retrieving levels for alternative article');
                return reject(new Error("Could not retrieve levels for alternative article"));
              }
              
              const randomLevel = alternativeLevels[Math.floor(Math.random() * alternativeLevels.length)];
              randomLevelCache = { 
                ...randomLevel, 
                title: alternativeArticle.title, 
                summary: alternativeArticle.summary,
                isAlternativeArticle: true
              };
              dateCache = today;
              
              logger.info({ 
                level: randomLevel.level,
                articleId: alternativeArticle.id,
                levelId: randomLevel.id
              }, 'Random level selected from alternative article');
              
              resolve(randomLevelCache);
            });
          });
          return;
        }

        // Normal flow when levels are found for the latest article
        const randomLevel = levels[Math.floor(Math.random() * levels.length)];
        randomLevelCache = { 
          ...randomLevel, 
          title: article.title, 
          summary: article.summary,
          isLatestArticle: true 
        };
        dateCache = today;
        
        logger.info({ 
          level: randomLevel.level,
          articleId: article.id,
          levelId: randomLevel.id,
          levelsCount: levels.length
        }, 'Random level selected from latest article');
        
        resolve(randomLevelCache);
      });
    });
  });
};

module.exports = {
  getAnsweredCorrectlyFlag,
  getArticlesSummary,
  getRandomLevel,
  resetRandomLevelCache
};
