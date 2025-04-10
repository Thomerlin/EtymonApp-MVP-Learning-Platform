const { getArticleLevelProgress } = require("../services/progressService");
const { getProgress } = require("../services/progressService");

const getUserProgress = async (req, res) => {
  try {
    const rows = await getProgress(1); // Hardcoded userId
    const correctAnswers = rows.filter(row => row.score).length;
    const total = rows.length;
    res.json({ correctAnswers, total });
  } catch (err) {
    res.status(500).json({ error: "Error fetching progress" });
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
