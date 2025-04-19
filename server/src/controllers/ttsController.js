const { textToSpeechConverter } = require('../services/ttsService');

// Convert text to speech
const synthesizeSpeech = async (req, res) => {
  try {
    const { text, language, voice } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const audioContent = await textToSpeechConverter(text, language, voice);
    
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
