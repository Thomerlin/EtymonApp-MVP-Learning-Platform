const db = require('./database');
const fs = require('fs');
const path = require('path');

const initializeDatabase = () => {
  // Create users table with is_admin field
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    google_id TEXT UNIQUE,
    display_name TEXT,
    profile_picture TEXT,
    is_admin BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating table users:', err.message);
    }
  });;

  db.run(`CREATE TABLE IF NOT EXISTS progress (
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
  )`, (err) => {
    if (err) console.error('Error creating table progress:', err.message);
  });

  db.run(`CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    article_link TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_date TEXT NOT NULL
  )`, (err) => {
    if (err) {
      console.error('Error creating table articles:', err.message);
    } else {
      initializeNestedTables();
    }
  });
};

const initializeNestedTables = () => {
  db.run(`CREATE TABLE IF NOT EXISTS levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    level TEXT NOT NULL,
    content TEXT NOT NULL,
    phonetics TEXT NOT NULL,
    FOREIGN KEY(article_id) REFERENCES articles(id)
  )`, (err) => {
    if (err) console.error('Error creating table levels:', err.message);
  });

  db.run(`CREATE TABLE IF NOT EXISTS exercises_multiple_choice (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level_id INTEGER NOT NULL,
    question TEXT NOT NULL,
    options TEXT NOT NULL,
    answer TEXT NOT NULL,
    FOREIGN KEY(level_id) REFERENCES levels(id)
  )`, (err) => {
    if (err) console.error('Error creating table exercises_multiple_choice:', err.message);
  });

  db.run(`CREATE TABLE IF NOT EXISTS exercises_fill_in_the_blanks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level_id INTEGER NOT NULL,
    sentence TEXT NOT NULL,
    answer TEXT NOT NULL,
    hint TEXT NOT NULL,
    FOREIGN KEY(level_id) REFERENCES levels(id)
  )`, (err) => {
    if (err) console.error('Error creating table exercises_fill_in_the_blanks:', err.message);
  });

  db.run(`CREATE TABLE IF NOT EXISTS exercises_true_false (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level_id INTEGER NOT NULL,
    statement TEXT NOT NULL,
    answer TEXT NOT NULL,
    FOREIGN KEY(level_id) REFERENCES levels(id)
  )`, (err) => {
    if (err) console.error('Error creating table exercises_true_false:', err.message);
  });

  db.run(`CREATE TABLE IF NOT EXISTS exercises_writing_with_audio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level_id INTEGER NOT NULL,
    sentence TEXT NOT NULL,
    FOREIGN KEY(level_id) REFERENCES levels(id)
  )`, (err) => {
    if (err) console.error('Error creating table exercises_writing_with_audio:', err.message);
  });

  db.run(`CREATE TABLE IF NOT EXISTS exercises_vocabulary_matching (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level_id INTEGER NOT NULL,
    word TEXT NOT NULL,
    definition TEXT NOT NULL,
    example TEXT NOT NULL,
    FOREIGN KEY(level_id) REFERENCES levels(id)
  )`, (err) => {
    if (err) console.error('Error creating table exercises_vocabulary_matching:', err.message);
  });

  // Insert initial data
  const articles = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/articles.json'), 'utf8'));
  articles.forEach(article => {
    db.run(`INSERT INTO articles (title, article_link, summary, created_date) VALUES (?, ?, ?, ?)`,
      [article.title, article.article_link, article.summary, article.created_date], function (err) {
        if (err) {
          console.error('Error inserting article:', err.message);
          return;
        }
        const articleId = this.lastID;

        Object.keys(article.levels).forEach(levelKey => {
          const level = article.levels[levelKey];
          db.run(`INSERT INTO levels (article_id, level, content, phonetics) VALUES (?, ?, ?, ?)`,
            [articleId, levelKey, level.text.content, level.text.phonetics], function (err) {
              if (err) {
                console.error('Error inserting level:', err.message);
                return;
              }
              const levelId = this.lastID;

              level.exercises.multiple_choice.forEach(exercise => {
                db.run(`INSERT INTO exercises_multiple_choice (level_id, question, options, answer) VALUES (?, ?, ?, ?)`,
                  [levelId, exercise.question, JSON.stringify(exercise.options), exercise.answer]);
              });

              level.exercises.fill_in_the_blanks.forEach(exercise => {
                db.run(`INSERT INTO exercises_fill_in_the_blanks (level_id, sentence, answer, hint) VALUES (?, ?, ?, ?)`,
                  [levelId, exercise.sentence, exercise.answer, exercise.hint]);
              });

              level.exercises.true_false.forEach(exercise => {
                db.run(`INSERT INTO exercises_true_false (level_id, statement, answer) VALUES (?, ?, ?)`,
                  [levelId, exercise.statement, exercise.answer]);
              });

              level.exercises.vocabulary_matching.forEach(exercise => {
                db.run(`INSERT INTO exercises_vocabulary_matching (level_id, word, definition, example) VALUES (?, ?, ?, ?)`,
                  [levelId, exercise.word, exercise.definition, exercise.example]);
              });

              if (level.exercises.writing_with_audio) {
                level.exercises.writing_with_audio.forEach(exercise => {
                  db.run(`INSERT INTO exercises_writing_with_audio (level_id, sentence) VALUES (?, ?)`,
                    [levelId, exercise.sentence]);
                });
              }
            });
        });
      });
  });
};

module.exports = { initializeDatabase };