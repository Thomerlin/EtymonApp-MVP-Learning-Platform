const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { initializeDatabase } = require('./db/init');
const corsMiddleware = require('./middleware/cors');
const { printDatabaseContents } = require('./services/databaseService');
const passport = require('passport');
const session = require('express-session');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(corsMiddleware);
app.use(express.json());
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

app.use('/api/article', articleRoutes);
app.use('/api/exercise', exerciseRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/auth', authRoutes); 
app.use('/', indexRoutes);

// Print database contents after 2 seconds
setTimeout(printDatabaseContents, 2000);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});