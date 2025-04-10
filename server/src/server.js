// const express = require('express');
// const path = require('path');
// const cors = require('cors');
// const dotenv = require('dotenv');
// const sqlite3 = require('sqlite3').verbose();
// const fs = require('fs');

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 3000;

// app.use(cors());
// app.use(express.json());
// app.use(express.static(path.join(__dirname, "../client/dist/client"))); // Update this path

// // Connect to the unified database
// const db = new sqlite3.Database('./database.db', (err) => {
//   if (err) {
//     console.error('Error connecting to SQLite (database):', err.message);
//   } else {
//     console.log('Connected to SQLite (database)');
//   }
// });

// // Create tables in the unified database
// db.run(`CREATE TABLE IF NOT EXISTS users (
//   id INTEGER PRIMARY KEY AUTOINCREMENT,
//   email TEXT UNIQUE NOT NULL,
//   password TEXT NOT NULL
// )`, (err) => {
//   if (err) {
//     console.error('Error creating table users:', err.message);
//   } else {
//     const genericEmail = "testuser@example.com";
//     const genericPassword = "testpassword";
//     db.run(`INSERT OR IGNORE INTO users (email, password) VALUES (?, ?)`,
//       [genericEmail, genericPassword], (err) => {
//         if (err) {
//           console.error('Error inserting generic user:', err.message);
//         } else {
//           console.log('Generic user created: email=testuser@example.com, password=testpassword');
//         }
//       });
//   }
// });

// db.run(`CREATE TABLE IF NOT EXISTS progress (
//   id INTEGER PRIMARY KEY AUTOINCREMENT,
//   user_id INTEGER NOT NULL,
//   article_id INTEGER NOT NULL,
//   level TEXT NOT NULL,
//   exercise_type TEXT NOT NULL,
//   exercise_number INTEGER NOT NULL,
//   score INTEGER NOT NULL,
//   FOREIGN KEY(user_id) REFERENCES users(id),
//   FOREIGN KEY(article_id) REFERENCES articles(id)
// )`, (err) => {
//   if (err) {
//     console.error('Error creating table progress:', err.message);
//   }
// });

// db.run(`CREATE TABLE IF NOT EXISTS articles (
//   id INTEGER PRIMARY KEY AUTOINCREMENT,
//   title TEXT NOT NULL,
//   article_link TEXT NOT NULL,
//   summary TEXT NOT NULL,
//   created_date TEXT NOT NULL
// )`, (err) => {
//   if (err) {
//     console.error('Error creating table articles:', err.message);
//   } else {
//     db.run(`CREATE TABLE IF NOT EXISTS levels (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       article_id INTEGER NOT NULL,
//       level TEXT NOT NULL,
//       content TEXT NOT NULL,
//       phonetics TEXT NOT NULL,
//       FOREIGN KEY(article_id) REFERENCES articles(id)
//     )`, (err) => {
//       if (err) {
//         console.error('Error creating table levels:', err.message);
//       } else {
//         db.run(`CREATE TABLE IF NOT EXISTS exercises_multiple_choice (
//           id INTEGER PRIMARY KEY AUTOINCREMENT,
//           level_id INTEGER NOT NULL,
//           question TEXT NOT NULL,
//           options TEXT NOT NULL,
//           answer TEXT NOT NULL,
//           FOREIGN KEY(level_id) REFERENCES levels(id)
//         )`, (err) => {
//           if (err) {
//             console.error('Error creating table exercises_multiple_choice:', err.message);
//           }
//         });

//         db.run(`CREATE TABLE IF NOT EXISTS exercises_fill_in_the_blanks (
//           id INTEGER PRIMARY KEY AUTOINCREMENT,
//           level_id INTEGER NOT NULL,
//           sentence TEXT NOT NULL,
//           answer TEXT NOT NULL,
//           hint TEXT NOT NULL,
//           FOREIGN KEY(level_id) REFERENCES levels(id)
//         )`, (err) => {
//           if (err) {
//             console.error('Error creating table exercises_fill_in_the_blanks:', err.message);
//           }
//         });

//         db.run(`CREATE TABLE IF NOT EXISTS exercises_true_false (
//           id INTEGER PRIMARY KEY AUTOINCREMENT,
//           level_id INTEGER NOT NULL,
//           statement TEXT NOT NULL,
//           answer TEXT NOT NULL,
//           FOREIGN KEY(level_id) REFERENCES levels(id)
//         )`, (err) => {
//           if (err) {
//             console.error('Error creating table exercises_true_false:', err.message);
//           }
//         });

//         db.run(`CREATE TABLE IF NOT EXISTS exercises_writing_with_audio (
//           id INTEGER PRIMARY KEY AUTOINCREMENT,
//           level_id INTEGER NOT NULL,
//           sentence TEXT NOT NULL,
//           FOREIGN KEY(level_id) REFERENCES levels(id)
//         )`, (err) => {
//           if (err) {
//             console.error('Error creating table exercises_writing_with_audio:', err.message);
//           }
//         });

//         db.run(`CREATE TABLE IF NOT EXISTS exercises_vocabulary_matching (
//           id INTEGER PRIMARY KEY AUTOINCREMENT,
//           level_id INTEGER NOT NULL,
//           word TEXT NOT NULL,
//           definition TEXT NOT NULL,
//           example TEXT NOT NULL,
//           FOREIGN KEY(level_id) REFERENCES levels(id)
//         )`, (err) => {
//           if (err) {
//             console.error('Error creating table exercises_vocabulary_matching:', err.message);
//           }
//         });

//         // Insert data from JSON into tables
//         const articles = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/articles.json'), 'utf8'));
//         console.log('Articles read from JSON:', articles); // Log to check the read data
//         articles.forEach(article => {
//           db.run(`INSERT INTO articles (title, article_link, summary, created_date) VALUES (?, ?, ?, ?)`,
//             [article.title, article.article_link, article.summary, article.created_date], function (err) {
//               if (err) {
//                 console.error('Error inserting article:', err.message);
//               } else {
//                 const articleId = this.lastID;
//                 console.log(`Article inserted with ID: ${articleId}`); // Log to check the article ID
//                 Object.keys(article.levels).forEach(levelKey => {
//                   const level = article.levels[levelKey];
//                   db.run(`INSERT INTO levels (article_id, level, content, phonetics) VALUES (?, ?, ?, ?)`,
//                     [articleId, levelKey, level.text.content, level.text.phonetics], function (err) {
//                       if (err) {
//                         console.error('Error inserting level:', err.message);
//                       } else {
//                         const levelId = this.lastID;
//                         console.log(`Level inserted with ID: ${levelId}`); // Log to check the level ID
//                         level.exercises.multiple_choice.forEach(exercise => {
//                           db.run(`INSERT INTO exercises_multiple_choice (level_id, question, options, answer) VALUES (?, ?, ?, ?)`,
//                             [levelId, exercise.question, JSON.stringify(exercise.options), exercise.answer], (err) => {
//                               if (err) {
//                                 console.error('Error inserting multiple choice exercise:', err.message);
//                               } else {
//                                 console.log('Multiple choice exercise inserted successfully');
//                               }
//                             });
//                         });
//                         level.exercises.fill_in_the_blanks.forEach(exercise => {
//                           db.run(`INSERT INTO exercises_fill_in_the_blanks (level_id, sentence, answer, hint) VALUES (?, ?, ?, ?)`,
//                             [levelId, exercise.sentence, exercise.answer, exercise.hint], (err) => {
//                               if (err) {
//                                 console.error('Error inserting fill-in-the-blanks exercise:', err.message);
//                               } else {
//                                 console.log('Fill-in-the-blanks exercise inserted successfully');
//                               }
//                             });
//                         });
//                         level.exercises.true_false.forEach(exercise => {
//                           db.run(`INSERT INTO exercises_true_false (level_id, statement, answer) VALUES (?, ?, ?)`,
//                             [levelId, exercise.statement, exercise.answer], (err) => {
//                               if (err) {
//                                 console.error('Error inserting true/false exercise:', err.message);
//                               } else {
//                                 console.log('True/false exercise inserted successfully');
//                               }
//                             });
//                         });
//                         level.exercises.vocabulary_matching.forEach(exercise => {
//                           db.run(`INSERT INTO exercises_vocabulary_matching (level_id, word, definition, example) VALUES (?, ?, ?, ?)`,
//                             [levelId, exercise.word, exercise.definition, exercise.example], (err) => {
//                               if (err) {
//                                 console.error('Error inserting vocabulary matching exercise:', err.message);
//                               } else {
//                                 console.log('Vocabulary matching exercise inserted successfully');
//                               }
//                             });
//                         });

//                         if (level.exercises.writing_with_audio) {
//                           level.exercises.writing_with_audio.forEach(exercise => {
//                             db.run(`INSERT INTO exercises_writing_with_audio (level_id, sentence) VALUES (?, ?)`,
//                               [levelId, exercise.sentence], (err) => {
//                                 if (err) {
//                                   console.error('Error inserting writing with audio exercise:', err.message);
//                                 } else {
//                                   console.log('Writing with audio exercise inserted successfully');
//                                 }
//                               });
//                           });
//                         }
//                       }
//                     });
//                 });
//               }
//             });
//         });
//       }
//     });
//   }
// });

// // Function to print database contents in JSON format
// const printDatabaseContents = () => {
//   console.log("\n--- Database Contents (JSON) ---");

//   const tables = [
//     { name: "users", query: "SELECT * FROM users" },
//     { name: "progress", query: "SELECT * FROM progress" },
//     { name: "exercises_multiple_choice", query: "SELECT * FROM exercises_multiple_choice" }
//   ];

//   const databaseContents = {};

//   let pendingQueries = tables.length;

//   tables.forEach(table => {
//     db.all(table.query, [], (err, rows) => {
//       if (err) {
//         console.error(`Error querying table ${table.name}:`, err.message);
//         databaseContents[table.name] = { error: err.message };
//       } else {
//         databaseContents[table.name] = rows;
//       }

//       pendingQueries--;

//       // When all queries are completed, print the JSON
//       if (pendingQueries === 0) {
//         console.log(JSON.stringify(databaseContents, null, 2));
//         console.log("\n--- End of Database Contents ---\n");
//       }
//     });
//   });
// };

// // Call the function to print the data after initialization
// setTimeout(printDatabaseContents, 2000); // Wait 2 seconds to ensure data is inserted

// // app.use('/api/exercises', require('./routes/exercises'));
// const articleRoutes = require('./routes/articleRoutes');
// const exerciseRoutes = require('./routes/exerciseRoutes');
// const progressRoutes = require('./routes/progressRoutes');

// app.use('/api/article', articleRoutes);
// app.use('/api/exercise', exerciseRoutes);
// app.use('/api/progress', progressRoutes);

// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, "../client/dist/client/index.html")); // Update this path
// });

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { initializeDatabase } = require('./db/init');
const corsMiddleware = require('./middleware/cors');
const { printDatabaseContents } = require('./services/databaseService');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(corsMiddleware);
app.use(express.json());
app.use(express.static(path.join(__dirname, "client/dist/client")));

// Initialize database
initializeDatabase();

// Routes
const articleRoutes = require('./routes/articleRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const progressRoutes = require('./routes/progressRoutes');
const indexRoutes = require('./routes/indexRoutes');

app.use('/api/article', articleRoutes);
app.use('/api/exercise', exerciseRoutes);
app.use('/api/progress', progressRoutes);
app.use('/', indexRoutes);

// Print database contents after 2 seconds
setTimeout(printDatabaseContents, 2000);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});