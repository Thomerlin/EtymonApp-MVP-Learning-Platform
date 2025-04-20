const express = require('express');
const router = express.Router();
const { 
  getArticle,
  getArticlesSummaryHandler,
  getRandomLevelHandler 
} = require('../controllers/articleController');
const { updateReadingTimeHandler } = require('../controllers/exerciseController');

router.get('/articles/:id', getArticle);
router.get('/articles-summary', getArticlesSummaryHandler);
router.get('/random-level', getRandomLevelHandler);
router.post('/track-reading-time', updateReadingTimeHandler);

module.exports = router;