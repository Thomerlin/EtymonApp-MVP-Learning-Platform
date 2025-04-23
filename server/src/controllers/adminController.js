const db = require('../db/database');
const { processContentAudio } = require('../services/ttsService');
const logger = require('../utils/logger');

/**
 * Inserts a complete article with all its associated content into the database
 * Only accessible by admin users
 */
const insertContent = async (req, res) => {
  try {
    const articleData = req.body;

    logger.info({
      userId: req.user.id,
      contentType: req.body.type,
      action: 'insert_content'
    }, 'Admin content insertion attempt');

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
        async function(err) {
          if (err) {
            logger.error({ err, userId: req.user.id }, 'Failed to insert article');
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Erro ao inserir artigo no banco de dados' });
          }

          const articleId = this.lastID;
          let successCount = 0;
          let errorCount = 0;
          const levelKeys = Object.keys(articleData.levels);
          let processedLevels = 0;

          // Insert each level
          for (const levelKey of levelKeys) {
            try {
              const level = articleData.levels[levelKey];

              if (!level.text || !level.text.content) {
                errorCount++;
                processedLevels++;
                logger.error(`Conteúdo textual ausente para o nível ${levelKey}`);
                if (processedLevels === levelKeys.length) {
                  finishTransaction();
                }
                continue;
              }

              // Generate audio content using TTS service
              logger.info(`Generating audio for level ${levelKey}...`);
              let audioContent = null;
              try {
                // Determine language based on level prefix
                const language = determineLanguageFromLevel(levelKey);
                const voice = determineVoiceFromLanguage(language);
                
                // Use normal speaking rate (1.0) for content audio
                audioContent = await processContentAudio(
                  level.text.content, 
                  language, 
                  voice,
                  0.85  // Normal speaking rate for content
                );
                logger.info(`Audio generated for level ${levelKey}: ${audioContent.length} bytes`);
              } catch (ttsError) {
                logger.error(`Error generating audio for level ${levelKey}:`, ttsError);
                // Continue without audio if TTS fails
              }

              // Insert level with audio content
              db.run(
                'INSERT INTO levels (article_id, level, content, phonetics, audio_content) VALUES (?, ?, ?, ?, ?)',
                [
                  articleId,
                  levelKey,
                  level.text.content,
                  level.text.phonetics || '',
                  audioContent
                ],
                function(err) {
                  if (err) {
                    errorCount++;
                    logger.error(`Erro ao inserir nível ${levelKey}:`, err.message);
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
            } catch (levelError) {
              logger.error(`Error processing level ${levelKey}:`, levelError);
              errorCount++;
              processedLevels++;
              if (processedLevels === levelKeys.length) {
                finishTransaction();
              }
            }
          }

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

          // Helper function to determine language based on level code
          function determineLanguageFromLevel(levelCode) {
            // Default to English
            if (!levelCode || typeof levelCode !== 'string') return 'en-US';
            
            // Check for language code at beginning of level
            if (levelCode.startsWith('pt')) return 'pt-BR';
            if (levelCode.startsWith('es')) return 'es-ES';
            if (levelCode.startsWith('fr')) return 'fr-FR';
            if (levelCode.startsWith('de')) return 'de-DE';
            
            // Default to English if no match
            return 'en-US';
          }
          
          // Helper function to get appropriate voice for language
          function determineVoiceFromLanguage(language) {
            switch (language) {
              case 'pt-BR': return 'pt-BR-Wavenet-A';
              case 'es-ES': return 'es-ES-Wavenet-B';
              case 'fr-FR': return 'fr-FR-Wavenet-C';
              case 'de-DE': return 'de-DE-Wavenet-B';
              default: return 'en-US-Casual-K'; // Default English voice
            }
          }

          // Function to complete the transaction
          function finishTransaction() {
            if (errorCount > 0) {
              logger.error(`Transação abortada: ${errorCount} erros encontrados`);
              db.run('ROLLBACK');
              return res.status(500).json({ 
                error: 'Alguns níveis ou exercícios não puderam ser inseridos',
                success: successCount,
                errors: errorCount
              });
            }

            db.run('COMMIT');
            logger.info({ articleId }, 'Content inserted successfully');
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
    logger.error('Erro ao processar a inserção de conteúdo:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  insertContent
};
