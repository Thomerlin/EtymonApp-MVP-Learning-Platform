const express = require('express');
const path = require('path');
const router = express.Router();

// Serve the main index.html for any route not matched by the API
router.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/client/index.html'));
});

module.exports = router;