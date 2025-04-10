const express = require('express');
const router = express.Router();
const { 
  getUserProgress,
  getArticleLevelProgressHandler 
} = require('../controllers/progressController');

router.get('/article', getUserProgress);
router.get('/exercise', getArticleLevelProgressHandler);

module.exports = router;