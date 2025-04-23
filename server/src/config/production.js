/**
 * Production environment specific configurations
 */
const logger = require('../utils/logger');

/**
 * Configure production settings
 * Call this function when running in production mode
 */
const configureProduction = (app) => {
  if (process.env.NODE_ENV !== 'production') {
    logger.warn('Production configuration called but NODE_ENV is not set to production');
    return;
  }

  logger.info('Configuring server for production environment');
  
  // Trust proxy - required when running behind a reverse proxy like Nginx
  app.set('trust proxy', 1);
  
  // Additional HTTPS-related headers
  app.use((req, res, next) => {
    // Set strict transport security header for enhanced security
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    // Protection against XSS attacks
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // When in production, don't allow embedding on other sites
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
    
    next();
  });
  
  logger.info('Production configuration complete');
};

module.exports = {
  configureProduction
};
