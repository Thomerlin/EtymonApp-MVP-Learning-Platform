const { getArticleLevelProgress, getProgress } = require("../services/progressService");

const getUserProgress = async (req, res) => {
  const userId = req.query.userId || 1; // Default to 1 for now, should get from auth
  
  try {
    const progressData = await getProgress(userId);
    res.json(progressData);
  } catch (err) {
    console.error("Error fetching user progress:", err);
    res.status(500).json({ error: "Error fetching progress data" });
  }
};

const getArticleLevelProgressHandler = async (req, res) => {
  const { userId, articleId, level } = req.query;

  if (!userId || !articleId || !level) {
    return res.status(400).json({ error: "userId, articleId, and level are required" });
  }

  try {
    const progress = await getArticleLevelProgress(userId, articleId, level);
    res.json(progress);
  } catch (err) {
    const status = err.message === "No progress data found" ? 404 : 500;
    res.status(status).json({ error: err.message });
  }
};


module.exports = { 
  getUserProgress,
  getArticleLevelProgressHandler 
};
