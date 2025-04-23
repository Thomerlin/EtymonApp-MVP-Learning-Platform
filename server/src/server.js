const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { initializeDatabase } = require('./db/init');
const corsMiddleware = require('./middleware/cors');
const { printDatabaseContents } = require('./services/databaseService');
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const logger = require('./utils/logger');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' })); // Increased limit for larger content uploads
app.use(cookieParser()); // Add cookie parser for handling tokens in cookies
app.use(express.static(path.join(__dirname, "client/dist/client")));

// Create public directory for audio files
app.use('/audio', express.static(path.join(__dirname, '../public/audio')));

// Initialize database
initializeDatabase();

// Configure session and passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'defaultsecret',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

require('./config/passport');

// Routes
const articleRoutes = require('./routes/articleRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const progressRoutes = require('./routes/progressRoutes');
const ttsRoutes = require('./routes/ttsRoutes');
const indexRoutes = require('./routes/indexRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes'); // Add admin routes

app.use('/api/article', articleRoutes);
app.use('/api/exercise', exerciseRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/auth', authRoutes); 
app.use('/api/admin', adminRoutes); // Mount admin routes
app.use('/', indexRoutes);

// Log DB contents only in development environment
if (process.env.NODE_ENV === 'development') {
  setTimeout(printDatabaseContents, 2000);
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

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
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