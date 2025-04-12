const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs').promises;
const path = require('path');

// Creates a client
const client = new textToSpeech.TextToSpeechClient();

/**
 * Convert text to speech using Google's TTS API
 * @param {string} text - The text to convert to speech
 * @param {boolean} isSSML - Whether the text is SSML formatted
 * @param {string} languageCode - The language code (default: 'en-US')
 * @param {string} name - Voice name (default: 'en-US-Casual-K')
 * @param {string} gender - Voice gender (default: 'MALE')
 * @returns {Promise<Buffer>} - Audio buffer
 */
async function synthesizeSpeech(text, isSSML = false, languageCode = 'en-US', name = 'en-US-Casual-K', gender = 'MALE') {
  // Construct the request
  const request = {
    input: isSSML ? { ssml: text } : { text },
    voice: {
      languageCode,
      name,
      ssmlGender: gender
    },
    audioConfig: {
      audioEncoding: 'MP3',
    },
  };

  // Performs the text-to-speech request
  const [response] = await client.synthesizeSpeech(request);
  return response.audioContent;
}

/**
 * Save audio to a file and return the file path
 * @param {Buffer} audioBuffer - Audio data buffer
 * @param {string} filename - Name to save the file as
 * @returns {Promise<string>} - Path to the saved file
 */
async function saveAudioToFile(audioBuffer, filename) {
  const outputDir = path.join(__dirname, '../../public/audio');
  
  // Ensure the directory exists
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch (error) {
    console.error('Error creating audio directory:', error);
  }
  
  const outputFile = path.join(outputDir, filename);
  await fs.writeFile(outputFile, audioBuffer);
  return `/audio/${filename}`;
}

/**
 * Generate SSML markup for better pronunciation
 * @param {string} text - Plain text to convert to SSML
 * @param {string} language - The language code
 * @returns {string} - SSML formatted text
 */
function generateSSML(text, language = 'en-US') {
  // Basic SSML template - can be extended with more features
  return `<speak>
    <prosody rate="0.9" pitch="+0.0st">
      ${text}
    </prosody>
  </speak>`;
}

module.exports = {
  synthesizeSpeech,
  saveAudioToFile,
  generateSSML
};
