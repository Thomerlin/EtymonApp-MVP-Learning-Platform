const express = require('express');
const router = express.Router();
const { serveIndex } = require('../controllers/indexController');

router.get('*', serveIndex);

module.exports = router;