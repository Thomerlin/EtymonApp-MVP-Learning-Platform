const express = require('express');
const router = express.Router();
const { synthesizeSpeech, saveAudioToFile, generateSSML } = require('../services/ttsService');
const crypto = require('crypto');

// Generate speech from plain text
router.post('/synthesize', async (req, res) => {
  try {
    const { text, languageCode = 'en-US', voice = 'en-US-Neural2-F', gender = 'FEMALE' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Generate a unique filename
    const filename = `${crypto.randomBytes(8).toString('hex')}.mp3`;
    
    // Convert text to speech
    const audioBuffer = await synthesizeSpeech(text, false, languageCode, voice, gender);
    
    // Save to file and get the path
    const audioPath = await saveAudioToFile(audioBuffer, filename);
    
    res.json({ 
      success: true,
      audioUrl: audioPath,
      text
    });
  } catch (error) {
    console.error('TTS Synthesis error:', error);
    res.status(500).json({ error: 'Failed to synthesize speech', details: error.message });
  }
});

// Generate speech from SSML
router.post('/synthesize-ssml', async (req, res) => {
  try {
    const { ssml, languageCode = 'en-US', voice = 'en-US-Neural2-F', gender = 'FEMALE' } = req.body;
    
    if (!ssml) {
      return res.status(400).json({ error: 'SSML content is required' });
    }

    // Generate a unique filename
    const filename = `${crypto.randomBytes(8).toString('hex')}.mp3`;
    
    // Convert SSML to speech
    const audioBuffer = await synthesizeSpeech(ssml, true, languageCode, voice, gender);
    
    // Save to file and get the path
    const audioPath = await saveAudioToFile(audioBuffer, filename);
    
    res.json({ 
      success: true,
      audioUrl: audioPath,
      ssml
    });
  } catch (error) {
    console.error('TTS SSML Synthesis error:', error);
    res.status(500).json({ error: 'Failed to synthesize SSML speech', details: error.message });
  }
});

// Helper endpoint to generate SSML from plain text
router.post('/generate-ssml', (req, res) => {
  try {
    const { text, language = 'en-US' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const ssml = generateSSML(text, language);
    res.json({ 
      success: true,
      ssml 
    });
  } catch (error) {
    console.error('SSML generation error:', error);
    res.status(500).json({ error: 'Failed to generate SSML', details: error.message });
  }
});

module.exports = router;
