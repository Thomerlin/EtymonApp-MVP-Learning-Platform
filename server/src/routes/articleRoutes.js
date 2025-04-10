const express = require('express');
const router = express.Router();
const { 
  getArticle,
  getArticlesSummaryHandler,
  getRandomLevelHandler 
} = require('../controllers/articleController');

router.get('/articles/:id', getArticle);
router.get('/articles-summary', getArticlesSummaryHandler);
router.get('/random-level', getRandomLevelHandler);

module.exports = router;