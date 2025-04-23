const cors = require('cors');
const logger = require('../utils/logger');

// Parse allowed origins from environment variable
const parseAllowedOrigins = () => {
  const origins = process.env.ALLOWED_ORIGINS || '';
  return origins.split(',').filter(origin => origin.trim().length > 0);
};

const allowedOrigins = parseAllowedOrigins();

logger.info(`CORS configured with allowed origins: ${JSON.stringify(allowedOrigins)}`);

// Add proper debugging for CORS issues
const corsOptions = {
  origin: function (origin, callback) {
    // Always allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      logger.debug('CORS: Request with no origin allowed');
      return callback(null, true);
    }
    
    // Check if origin is allowed
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      logger.debug(`CORS: Origin ${origin} is allowed`);
      callback(null, true);
    } else {
      logger.warn(`CORS: Origin ${origin} rejected - not in allowed list: ${JSON.stringify(allowedOrigins)}`);
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token', 'Origin', 'Accept', 'Range'],
  exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length', 'Accept-Ranges', 'Cache-Control'],
  maxAge: 86400 // 24 hours
};

// Export a function that includes a fallback for development environments
module.exports = function(req, res, next) {
  // Special handling for audio requests to ensure CORS headers are properly set
  if (req.path.startsWith('/api/article/audio/')) {
    // Set CORS headers explicitly for audio requests
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
    res.header('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type, Content-Length, Accept-Ranges');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  }

  // In development, if CORS fails, we'll try a permissive fallback
  const corsMiddleware = cors(corsOptions);
  
  corsMiddleware(req, res, (err) => {
    if (err && process.env.NODE_ENV !== 'production') {
      logger.warn(`CORS error caught for ${req.headers.origin}: ${err.message}`);
      logger.warn('Applying permissive CORS fallback in development mode');
      
      // Apply permissive CORS in development as fallback
      const permissiveCors = cors({
        origin: true, // Allow all origins in development
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token', 'Origin', 'Accept', 'Range'],
        exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length', 'Accept-Ranges', 'Cache-Control'],
        maxAge: 86400
      });
      
      return permissiveCors(req, res, next);
    }
    
    // Normal flow if no error or production mode
    next(err);
  });
};