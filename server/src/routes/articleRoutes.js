const express = require('express');
const router = express.Router();
const { 
  getArticle,
  getArticlesSummaryHandler,
  getRandomLevelHandler,
  getLevelAudio // New route for audio content
} = require('../controllers/articleController');
const { updateReadingTimeHandler } = require('../controllers/exerciseController');
const { authenticateJWT, optionalAuthJWT } = require('../middleware/auth');

// Public routes - accessible without authentication
router.get('/articles/:id', optionalAuthJWT, getArticle); // Updated to use optional authentication
router.get('/articles-summary', getArticlesSummaryHandler);
router.get('/random-level', getRandomLevelHandler);
router.get('/audio/:levelId', getLevelAudio); // New route for audio content

// Protected route - requires authentication
router.post('/track-reading-time', authenticateJWT, updateReadingTimeHandler);

module.exports = router;