const textToSpeech = require('@google-cloud/text-to-speech');
const path = require('path');

// Criar cliente TTS com autenticação segura
const client = new textToSpeech.TextToSpeechClient();

// Implementação simples de cache usando Map nativo
class SimpleCache {
  constructor(maxSize = 50 * 1024 * 1024) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.currentSize = 0;
  }

  has(key) {
    return this.cache.has(key);
  }

  get(key) {
    const item = this.cache.get(key);
    if (item && item.expiry < Date.now()) {
      this.delete(key);
      return null;
    }
    return item ? item.value : null;
  }

  set(key, value, ttl = 24 * 60 * 60 * 1000) {
    const size = Buffer.byteLength(value);
    
    // Se o item for maior que o limite do cache, não guarde
    if (size > this.maxSize) {
      return false;
    }
    
    // Limpar espaço se necessário
    if (this.currentSize + size > this.maxSize) {
      this.prune();
    }
    
    // Se ainda não couber, remova os itens mais antigos
    if (this.currentSize + size > this.maxSize) {
      const entries = [...this.cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
      while (this.currentSize + size > this.maxSize && entries.length) {
        const [oldKey] = entries.shift();
        this.delete(oldKey);
      }
    }
    
    this.cache.set(key, {
      value,
      size,
      expiry: Date.now() + ttl,
      timestamp: Date.now()
    });
    
    this.currentSize += size;
    return true;
  }

  delete(key) {
    const item = this.cache.get(key);
    if (item) {
      this.currentSize -= item.size;
      this.cache.delete(key);
    }
  }
  
  // Remove todos os itens expirados
  prune() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expiry < now) {
        this.delete(key);
      }
    }
  }
}

// Criar uma instância de cache
const cache = new SimpleCache();

/**
 * Converts text to speech using Google Cloud TTS with improved security
 */
async function textToSpeechConverter(text, language = 'en-US', voice = "en-US-Casual-K", speakingRate = 0.7) {
  try {
    // Validar entradas
    if (!text) {
      throw new Error('Text must be provided and less than 1000 characters');
    }
    
    if (!language || !voice) {
      throw new Error('Language and voice must be provided');
    }

    const cacheKey = `${text}-${language}-${voice}-${speakingRate}`;
    if (cache.has(cacheKey)) {
      const cachedAudio = cache.get(cacheKey);
      if (cachedAudio) return cachedAudio;
    }

    // Sanitizar texto
    const sanitizedText = sanitizeText(text);

    // Estruturar SSML de forma segura
    const ssmlText = createSafeSSML(sanitizedText);

    // Definir parâmetros de voz com validação
    const voiceParams = {
      languageCode: validateLanguageCode(language),
    };

    if (voice) {
      voiceParams.name = validateVoiceName(voice);
    }

    // Construir request
    const request = {
      input: { ssml: ssmlText },
      voice: voiceParams,
      audioConfig: { 
        audioEncoding: 'MP3',
        speakingRate: speakingRate,
        pitch: 0.0
      },
    };

    // Executar a requisição com timeout
    const [response] = await Promise.race([
      client.synthesizeSpeech(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TTS request timed out')), 15000)
      )
    ]);

    // Guardar resultado no cache
    cache.set(cacheKey, response.audioContent);

    return response.audioContent;
  } catch (error) {
    console.error('Error in TTS service:', error.message);
    throw error;
  }
}

/**
 * Process multiple text chunks for TTS conversion
 * @param {string} text - Text to convert to speech
 * @param {string} language - Language code for TTS
 * @param {string} voice - Voice model to use
 * @param {number} speakingRate - Speaking rate (1.0 is normal speed)
 * @returns {Promise<Buffer>} - Audio content as buffer
 */
async function processContentAudio(text, language = 'en-US', voice = "en-US-Casual-K", speakingRate = 1.0) {
  try {
    // For longer texts, we need to chunk it into manageable segments
    const chunks = chunkText(text, 500);
    const audioBuffers = [];
    
    // Process each chunk sequentially to avoid rate limits
    for (const chunk of chunks) {
      const audioContent = await textToSpeechConverter(chunk, language, voice, speakingRate);
      audioBuffers.push(Buffer.from(audioContent));
    }
    
    // Combine all audio buffers into one
    return Buffer.concat(audioBuffers);
  } catch (error) {
    console.error('Error in batch TTS processing:', error.message);
    throw error;
  }
}

/**
 * Split text into manageable chunks for TTS processing
 * @param {string} text - Text to split into chunks
 * @param {number} maxLength - Maximum length of each chunk
 * @returns {string[]} - Array of text chunks
 */
function chunkText(text, maxLength = 500) {
  const chunks = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = '';
  
  for (const sentence of sentences) {
    // If adding this sentence would exceed the chunk size, start a new chunk
    if (currentChunk.length + sentence.length > maxLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += sentence + ' ';
  }
  
  // Add the last chunk if it has content
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// Funções auxiliares de validação e sanitização

function sanitizeText(text) {
  // Sanitização básica
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function createSafeSSML(text) {
  // Criar SSML com estrutura básica
  return `<speak>${text}</speak>`;
}

function validateLanguageCode(code) {
  // Lista de códigos de idioma suportados
  const supportedLanguages = ['en-US', 'es-ES', 'pt-BR', 'fr-FR', 'de-DE'];
  if (supportedLanguages.includes(code)) {
    return code;
  }
  return 'en-US'; // Default seguro
}

function validateVoiceName(voice) {
  // Verificar se a voz não contém caracteres inválidos
  if (/^[a-zA-Z0-9-]+$/.test(voice)) {
    return voice;
  }
  return 'en-US-Standard-A'; // Default seguro
}

module.exports = {
  textToSpeechConverter,
  processContentAudio
};
