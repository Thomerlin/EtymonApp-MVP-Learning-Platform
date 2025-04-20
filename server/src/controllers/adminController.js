const db = require('../db/database');

/**
 * Inserts a complete article with all its associated content into the database
 * Only accessible by admin users
 */
const insertContent = async (req, res) => {
  console.log('passou aqui');
  try {
    const articleData = req.body;

    // Validate the required fields
    if (!articleData.title || !articleData.article_link || !articleData.summary || !articleData.created_date) {
      return res.status(400).json({ 
        error: 'Dados incompletos do artigo', 
        required: ['title', 'article_link', 'summary', 'created_date', 'levels'] 
      });
    }

    if (!articleData.levels || Object.keys(articleData.levels).length === 0) {
      return res.status(400).json({ error: 'Níveis de conteúdo não fornecidos' });
    }

    // Start a transaction for data consistency
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      db.run(
        'INSERT INTO articles (title, article_link, summary, created_date) VALUES (?, ?, ?, ?)',
        [articleData.title, articleData.article_link, articleData.summary, articleData.created_date],
        function(err) {
          if (err) {
            console.error('Erro ao inserir artigo:', err.message);
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Erro ao inserir artigo no banco de dados' });
          }

          const articleId = this.lastID;
          let successCount = 0;
          let errorCount = 0;
          const levelKeys = Object.keys(articleData.levels);
          let processedLevels = 0;

          // Insert each level
          levelKeys.forEach(levelKey => {
            const level = articleData.levels[levelKey];

            if (!level.text || !level.text.content) {
              errorCount++;
              processedLevels++;
              console.error(`Conteúdo textual ausente para o nível ${levelKey}`);
              if (processedLevels === levelKeys.length) {
                finishTransaction();
              }
              return;
            }

            // Insert level
            db.run(
              'INSERT INTO levels (article_id, level, content, phonetics) VALUES (?, ?, ?, ?)',
              [
                articleId,
                levelKey,
                level.text.content,
                level.text.phonetics || ''
              ],
              function(err) {
                if (err) {
                  errorCount++;
                  console.error(`Erro ao inserir nível ${levelKey}:`, err.message);
                } else {
                  const levelId = this.lastID;
                  insertExercises(levelId, level.exercises);
                  successCount++;
                }

                processedLevels++;
                if (processedLevels === levelKeys.length) {
                  finishTransaction();
                }
              }
            );
          });

          // Function to insert exercises for a level
          function insertExercises(levelId, exercises) {
            // Insert multiple choice exercises
            if (exercises.multiple_choice && Array.isArray(exercises.multiple_choice)) {
              exercises.multiple_choice.forEach(exercise => {
                db.run(
                  'INSERT INTO exercises_multiple_choice (level_id, question, options, answer) VALUES (?, ?, ?, ?)',
                  [levelId, exercise.question, JSON.stringify(exercise.options), exercise.answer]
                );
              });
            }

            // Insert fill in the blanks exercises
            if (exercises.fill_in_the_blanks && Array.isArray(exercises.fill_in_the_blanks)) {
              exercises.fill_in_the_blanks.forEach(exercise => {
                db.run(
                  'INSERT INTO exercises_fill_in_the_blanks (level_id, sentence, answer, hint) VALUES (?, ?, ?, ?)',
                  [levelId, exercise.sentence, exercise.answer, exercise.hint || '']
                );
              });
            }

            // Insert true/false exercises
            if (exercises.true_false && Array.isArray(exercises.true_false)) {
              exercises.true_false.forEach(exercise => {
                db.run(
                  'INSERT INTO exercises_true_false (level_id, statement, answer) VALUES (?, ?, ?)',
                  [levelId, exercise.statement, exercise.answer]
                );
              });
            }

            // Insert vocabulary matching exercises
            if (exercises.vocabulary_matching && Array.isArray(exercises.vocabulary_matching)) {
              exercises.vocabulary_matching.forEach(exercise => {
                db.run(
                  'INSERT INTO exercises_vocabulary_matching (level_id, word, definition, example) VALUES (?, ?, ?, ?)',
                  [levelId, exercise.word, exercise.definition, exercise.example || '']
                );
              });
            }

            // Insert writing with audio exercises
            if (exercises.writing_with_audio && Array.isArray(exercises.writing_with_audio)) {
              exercises.writing_with_audio.forEach(exercise => {
                db.run(
                  'INSERT INTO exercises_writing_with_audio (level_id, sentence) VALUES (?, ?)',
                  [levelId, exercise.sentence]
                );
              });
            }
          }

          // Function to complete the transaction
          function finishTransaction() {
            if (errorCount > 0) {
              console.error(`Transação abortada: ${errorCount} erros encontrados`);
              db.run('ROLLBACK');
              return res.status(500).json({ 
                error: 'Alguns níveis ou exercícios não puderam ser inseridos',
                success: successCount,
                errors: errorCount
              });
            }

            db.run('COMMIT');
            return res.status(201).json({
              success: true,
              message: 'Conteúdo inserido com sucesso',
              articleId: articleId
            });
          }
        }
      );
    });
  } catch (error) {
    console.error('Erro ao processar a inserção de conteúdo:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  insertContent
};
