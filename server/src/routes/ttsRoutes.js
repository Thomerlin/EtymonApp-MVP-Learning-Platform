const express = require('express');
const router = express.Router();
const { synthesizeSpeech, getAvailableVoices } = require('../controllers/ttsController');

// Route to convert text to speech
router.post('/synthesize', synthesizeSpeech);

// Route to get available voices
router.get('/voices', getAvailableVoices);

module.exports = router;
