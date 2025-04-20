const express = require('express');
const router = express.Router();
const { 
  getArticle,
  getArticlesSummaryHandler,
  getRandomLevelHandler 
} = require('../controllers/articleController');
const { updateReadingTimeHandler } = require('../controllers/exerciseController');
const { authenticateJWT } = require('../middleware/auth');

// Public routes - accessible without authentication
router.get('/articles/:id', getArticle);
router.get('/articles-summary', getArticlesSummaryHandler);
router.get('/random-level', getRandomLevelHandler);

// Protected route - requires authentication
router.post('/track-reading-time', authenticateJWT, updateReadingTimeHandler);

module.exports = router;