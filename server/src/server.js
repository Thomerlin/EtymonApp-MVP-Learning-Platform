const dotenv = require('dotenv');
// Load environment variables before anything else
dotenv.config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const { initializeDatabase } = require('./db/init');
const corsMiddleware = require('./middleware/cors');
const { printDatabaseContents } = require('./services/databaseService');
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const logger = require('./utils/logger');
const { configureProduction } = require('./config/production');

logger.info('Environment variables loaded:');
logger.info(`- NODE_ENV: ${process.env.NODE_ENV}`);
logger.info(`- ALLOWED_ORIGINS: ${process.env.ALLOWED_ORIGINS}`);
logger.info(`- CLIENT_URL: ${process.env.CLIENT_URL}`);
logger.info(`- SERVER_URL: ${process.env.SERVER_URL}`);

const app = express();
const PORT = process.env.PORT || 3000;

// Basic security
app.use(helmet());

// CORS
app.use(corsMiddleware);

// Parse JSON bodies with increased limit for larger content uploads
app.use(express.json({ limit: '10mb' })); 

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Add cookie parser for handling tokens in cookies
app.use(cookieParser());

// Static file serving
app.use(express.static(path.join(__dirname, "client/dist/client")));

// Create public directory for audio files
app.use('/audio', express.static(path.join(__dirname, '../public/audio')));

// Initialize database
initializeDatabase();

// Configure session and passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'defaultsecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.NODE_ENV === 'production' ? 'etymonapp.com' : undefined
  }
}));

app.use(passport.initialize());
app.use(passport.session());

require('./config/passport');

// If in production, apply production configurations
if (process.env.NODE_ENV === 'production') {
  configureProduction(app);
  logger.info('Server running in PRODUCTION mode');
} else {
  logger.info('Server running in DEVELOPMENT mode');
}

// Request logging middleware
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip
  }, 'Incoming request');
  next();
});

// Routes
const articleRoutes = require('./routes/articleRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const progressRoutes = require('./routes/progressRoutes');
const ttsRoutes = require('./routes/ttsRoutes');
const indexRoutes = require('./routes/indexRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/api/article', articleRoutes);
app.use('/api/exercise', exerciseRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/auth', authRoutes); 
app.use('/api/admin', adminRoutes);
app.use('/', indexRoutes);

// Log DB contents only in development environment
if (process.env.NODE_ENV === 'development') {
  setTimeout(printDatabaseContents, 2000);
}

// 404 handler - place this after all your routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error({ 
    err, 
    method: req.method,
    url: req.url,
    body: req.body
  }, 'Error processing request');
  
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start the server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`API URL: ${process.env.SERVER_URL}`);
  logger.info(`Client URL: ${process.env.CLIENT_URL}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});