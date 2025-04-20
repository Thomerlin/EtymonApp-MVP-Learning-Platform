const express = require('express');
const router = express.Router();
const { 
  getUserProgress,
  getArticleLevelProgressHandler 
} = require('../controllers/progressController');
const { authenticateJWT } = require('../middleware/auth');

// Protect all progress routes with authentication
router.use(authenticateJWT);

router.get('/article', getUserProgress);
router.get('/exercise', getArticleLevelProgressHandler);

module.exports = router;