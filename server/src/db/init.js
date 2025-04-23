const db = require('./database');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Helper function to check if a table exists
const tableExists = (tableName) => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!row);
        }
      }
    );
  });
};

// Create table if it doesn't exist
const createTableIfNotExists = (tableName, schema) => {
  return tableExists(tableName).then(exists => {
    if (!exists) {
      return new Promise((resolve, reject) => {
        logger.info(`Creating table ${tableName}...`);
        db.run(schema, (err) => {
          if (err) {
            logger.error(`Error creating table ${tableName}:`, err.message);
            reject(err);
          } else {
            logger.info(`Table ${tableName} created successfully`);
            resolve();
          }
        });
      });
    } else {
      logger.info(`Table ${tableName} already exists, skipping creation`);
      return Promise.resolve();
    }
  }).catch(err => {
    logger.error(`Error checking if table ${tableName} exists:`, err.message);
    return Promise.reject(err);
  });
};

const initializeDatabase = async () => {
  logger.info('Initializing database...');

  try {
    // Users table
    await createTableIfNotExists('users', `CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      google_id TEXT UNIQUE,
      display_name TEXT,
      profile_picture TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Progress table
    await createTableIfNotExists('progress', `CREATE TABLE progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      article_id INTEGER NOT NULL,
      level TEXT NOT NULL,
      exercise_type TEXT NOT NULL,
      exercise_number INTEGER NOT NULL,
      score INTEGER NOT NULL,
      reading_time INTEGER DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(article_id) REFERENCES articles(id)
    )`);

    // Articles table
    await createTableIfNotExists('articles', `CREATE TABLE articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      article_link TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_date TEXT NOT NULL
    )`);

    // After ensuring the articles table exists, initialize nested tables
    await initializeNestedTables();

    logger.info('Database initialization complete');
  } catch (error) {
    logger.error('Database initialization failed:', error.message);
  }
};

const initializeNestedTables = async () => {
  try {
    // Levels table
    await createTableIfNotExists('levels', `CREATE TABLE levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      level TEXT NOT NULL,
      content TEXT NOT NULL,
      phonetics TEXT NOT NULL,
      audio_content BLOB,
      FOREIGN KEY(article_id) REFERENCES articles(id)
    )`);

    // Multiple choice exercises table
    await createTableIfNotExists('exercises_multiple_choice', `CREATE TABLE exercises_multiple_choice (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      options TEXT NOT NULL,
      answer TEXT NOT NULL,
      FOREIGN KEY(level_id) REFERENCES levels(id)
    )`);

    // Fill in the blanks exercises table
    await createTableIfNotExists('exercises_fill_in_the_blanks', `CREATE TABLE exercises_fill_in_the_blanks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level_id INTEGER NOT NULL,
      sentence TEXT NOT NULL,
      answer TEXT NOT NULL,
      hint TEXT NOT NULL,
      FOREIGN KEY(level_id) REFERENCES levels(id)
    )`);

    // True/false exercises table
    await createTableIfNotExists('exercises_true_false', `CREATE TABLE exercises_true_false (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level_id INTEGER NOT NULL,
      statement TEXT NOT NULL,
      answer TEXT NOT NULL,
      FOREIGN KEY(level_id) REFERENCES levels(id)
    )`);

    // Writing with audio exercises table
    await createTableIfNotExists('exercises_writing_with_audio', `CREATE TABLE exercises_writing_with_audio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level_id INTEGER NOT NULL,
      sentence TEXT NOT NULL,
      FOREIGN KEY(level_id) REFERENCES levels(id)
    )`);

    // Vocabulary matching exercises table
    await createTableIfNotExists('exercises_vocabulary_matching', `CREATE TABLE exercises_vocabulary_matching (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level_id INTEGER NOT NULL,
      word TEXT NOT NULL,
      definition TEXT NOT NULL,
      example TEXT NOT NULL,
      FOREIGN KEY(level_id) REFERENCES levels(id)
    )`);
  } catch (error) {
    logger.error('Failed to initialize nested tables:', error.message);
  }
};

module.exports = { initializeDatabase };