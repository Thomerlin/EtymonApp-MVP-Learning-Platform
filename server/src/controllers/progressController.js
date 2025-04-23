const { getArticleLevelProgress, getProgress } = require("../services/progressService");
const logger = require('../utils/logger');

const getUserProgress = async (req, res) => {
  const userId = req.user?.id;
  
  if (!userId) {
    logger.warn('Authentication required for accessing progress');
    return res.status(401).json({ error: "Authentication required" });
  }
  
  try {
    logger.info({ userId }, 'Getting user progress data');
    const progressData = await getProgress(userId);
    res.json(progressData);
  } catch (err) {
    logger.error({ err, userId }, 'Error fetching user progress');
    res.status(500).json({ error: "Error fetching progress data" });
  }
};

const getArticleLevelProgressHandler = async (req, res) => {
  const userId = req.user?.id;
  const { articleId, level } = req.query;

  if (!userId) {
    logger.warn('Authentication required for accessing article level progress');
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!articleId || !level) {
    logger.warn({ userId, articleId, level }, 'Missing parameters for article level progress');
    return res.status(400).json({ error: "articleId and level are required" });
  }

  try {
    logger.info({ userId, articleId, level }, 'Getting article level progress');
    const progress = await getArticleLevelProgress(userId, articleId, level);
    res.json(progress);
  } catch (err) {
    logger.error({ err, userId, articleId, level }, 'Error fetching article level progress');
    const status = err.message === "No progress data found" ? 404 : 500;
    res.status(status).json({ error: err.message });
  }
};

module.exports = { 
  getUserProgress,
  getArticleLevelProgressHandler 
};
