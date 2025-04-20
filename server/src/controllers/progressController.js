const { getArticleLevelProgress, getProgress } = require("../services/progressService");

const getUserProgress = async (req, res) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  try {
    const progressData = await getProgress(userId);
    res.json(progressData);
  } catch (err) {
    console.error("Error fetching user progress:", err);
    res.status(500).json({ error: "Error fetching progress data" });
  }
};

const getArticleLevelProgressHandler = async (req, res) => {
  const userId = req.user?.id;
  const { articleId, level } = req.query;

  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!articleId || !level) {
    return res.status(400).json({ error: "articleId and level are required" });
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
