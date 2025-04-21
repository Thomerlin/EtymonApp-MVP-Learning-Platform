const { textToSpeechConverter } = require('../services/ttsService');

// Convert text to speech
const synthesizeSpeech = async (req, res) => {
  try {
    const { text, language, voice, speakingRate } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Use slower speaking rate (0.8) by default for direct API requests
    // Allow custom rate if specified in the request
    const rate = speakingRate !== undefined ? parseFloat(speakingRate) : 0.7;
    
    // Validate speaking rate is within reasonable bounds
    const validRate = Math.max(0.5, Math.min(2.0, rate));
    
    const audioContent = await textToSpeechConverter(text, language, voice, validRate);
    
    // Send audio as binary response
    res.set({
      'Content-Type': 'audio/mp3',
      'Content-Length': audioContent.length
    });
    
    res.send(audioContent);
  } catch (error) {
    console.error('Error in TTS controller:', error);
    res.status(500).json({ 
      error: 'Failed to convert text to speech',
      details: error.message 
    });
  }
};

// Get available voices
const getAvailableVoices = (req, res) => {
  const voices = {
    'en-US': ['en-US-Standard-A', 'en-US-Standard-B', 'en-US-Wavenet-A', 'en-US-Casual-K'],
    'es-ES': ['es-ES-Standard-A', 'es-ES-Standard-B', 'es-ES-Wavenet-A']
    // Add more languages and voices as needed
  };
  
  res.json({ voices });
};

module.exports = {
  synthesizeSpeech,
  getAvailableVoices
};
