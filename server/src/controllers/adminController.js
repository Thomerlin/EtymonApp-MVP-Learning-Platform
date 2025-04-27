const db = require('../db/database');
const { processContentAudio } = require('../services/ttsService');
const logger = require('../utils/logger');
const { resetRandomLevelCache } = require('../services/articleService');

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

/**
 * Deletes an article and all associated content from the database
 * Only accessible by admin users with appropriate permissions
 */
const deleteArticle = async (req, res) => {
  try {
    const { articleId } = req.params;
    
    if (!articleId) {
      return res.status(400).json({ error: 'ID do artigo não fornecido' });
    }

    // Log detailed information including permissions
    logger.info({
      userId: req.user.id,
      articleId,
      action: 'delete_article',
      role: req.user.role,
      permissions: req.user.permissions
    }, 'Admin article deletion attempt');

    // Start a transaction for data consistency
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // First check if the article exists
      db.get('SELECT id FROM articles WHERE id = ?', [articleId], (err, article) => {
        if (err) {
          logger.error({ err, userId: req.user.id }, 'Database error checking article');
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Erro ao verificar artigo no banco de dados' });
        }

        if (!article) {
          db.run('ROLLBACK');
          return res.status(404).json({ error: 'Artigo não encontrado' });
        }

        // Get all levels associated with the article
        db.all('SELECT id FROM levels WHERE article_id = ?', [articleId], (err, levels) => {
          if (err) {
            logger.error({ err, userId: req.user.id }, 'Error fetching article levels');
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Erro ao buscar níveis do artigo' });
          }

          const levelIds = levels.map(level => level.id);
          const deleteOperations = [];
          
          // If there are levels, delete all exercises for each level
          if (levelIds.length > 0) {
            const tables = [
              'exercises_multiple_choice',
              'exercises_fill_in_the_blanks',
              'exercises_true_false',
              'exercises_vocabulary_matching',
              'exercises_writing_with_audio'
            ];
            
            tables.forEach(table => {
              deleteOperations.push(new Promise((resolve, reject) => {
                const placeholders = levelIds.map(() => '?').join(',');
                db.run(`DELETE FROM ${table} WHERE level_id IN (${placeholders})`, levelIds, (err) => {
                  if (err) {
                    logger.error({ err, table }, `Error deleting from ${table}`);
                    reject(err);
                  } else {
                    resolve();
                  }
                });
              }));
            });
          }

          // Execute all delete operations for exercises
          Promise.all(deleteOperations)
            .then(() => {
              // Delete levels associated with the article
              db.run('DELETE FROM levels WHERE article_id = ?', [articleId], (err) => {
                if (err) {
                  logger.error({ err, articleId }, 'Error deleting article levels');
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Erro ao deletar níveis do artigo' });
                }

                // Finally delete the article
                db.run('DELETE FROM articles WHERE id = ?', [articleId], function(err) {
                  if (err) {
                    logger.error({ err, articleId }, 'Error deleting article');
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Erro ao deletar artigo' });
                  }

                  // If article was successfully deleted
                  if (this.changes > 0) {
                    // Reset the random level cache since an article was deleted
                    resetRandomLevelCache();

                    db.run('COMMIT');
                    logger.info({ 
                      userId: req.user.id,
                      articleId, 
                      levelsDeleted: levelIds.length 
                    }, 'Article successfully deleted');
                    return res.status(200).json({
                      success: true,
                      message: 'Artigo e todo seu conteúdo associado foram deletados com sucesso',
                      articleId: articleId,
                      levelsDeleted: levelIds.length
                    });
                  } else {
                    db.run('ROLLBACK');
                    return res.status(404).json({ error: 'Artigo não encontrado ou já foi deletado' });
                  }
                });
              });
            })
            .catch(err => {
              logger.error({ err }, 'Error during exercise deletion');
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Erro ao deletar exercícios' });
            });
        });
      });
    });
  } catch (error) {
    logger.error({ error }, 'Error processing article deletion');
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Updates an existing article with all its associated content
 * Only accessible by admin users with appropriate permissions
 * Access control is enforced via the requireAdmin middleware in the route definition
 */
const updateArticle = async (req, res) => {
  try {
    const { articleId } = req.params;
    const articleData = req.body;

    logger.info({
      userId: req.user.id,
      articleId,
      action: 'update_article',
      contentType: req.body.type,
      role: req.user.role // Log the role explicitly to confirm admin access
    }, 'Admin article update attempt');

    // Additional verification that user has admin role (defensive coding)
    if (req.user.role !== 'admin') {
      logger.warn({
        userId: req.user.id,
        attemptedAction: 'update_article',
        role: req.user.role
      }, 'Non-admin user attempted to update article');
      return res.status(403).json({ error: 'Permissão negada. Apenas administradores podem editar artigos.' });
    }

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

    // Verify article exists before attempting update
    const articleExists = await new Promise((resolve) => {
      db.get('SELECT id FROM articles WHERE id = ?', [articleId], (err, row) => {
        if (err || !row) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });

    if (!articleExists) {
      return res.status(404).json({ error: 'Artigo não encontrado' });
    }

    // Start a transaction for data consistency
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // Update the article details
      db.run(
        'UPDATE articles SET title = ?, article_link = ?, summary = ?, created_date = ? WHERE id = ?',
        [articleData.title, articleData.article_link, articleData.summary, articleData.created_date, articleId],
        function(err) {
          if (err) {
            logger.error({ err, userId: req.user.id, articleId }, 'Failed to update article');
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Erro ao atualizar artigo no banco de dados' });
          }

          if (this.changes === 0) {
            db.run('ROLLBACK');
            return res.status(404).json({ error: 'Artigo não encontrado' });
          }

          // Get existing levels to determine which to update, delete or create
          db.all('SELECT id, level FROM levels WHERE article_id = ?', [articleId], async (err, existingLevels) => {
            if (err) {
              logger.error({ err, articleId }, 'Error fetching existing levels');
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Erro ao buscar níveis existentes' });
            }

            // Create a map of existing levels by level code
            const existingLevelMap = {};
            existingLevels.forEach(level => {
              existingLevelMap[level.level] = level.id;
            });

            // Track which levels to keep (for cleanup later)
            const levelsToKeep = new Set();
            let processedLevels = 0;
            const levelKeys = Object.keys(articleData.levels);
            const totalLevels = levelKeys.length;
            let successCount = 0;
            let errorCount = 0;

            // Process each level
            for (const levelKey of levelKeys) {
              try {
                const level = articleData.levels[levelKey];

                if (!level.text || !level.text.content) {
                  errorCount++;
                  processedLevels++;
                  logger.error(`Conteúdo textual ausente para o nível ${levelKey}`);
                  checkCompletion();
                  continue;
                }

                // Generate audio content using TTS service
                let audioContent = null;
                try {
                  // Determine language based on level prefix
                  const language = determineLanguageFromLevel(levelKey);
                  const voice = determineVoiceFromLanguage(language);
                  
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

                // Check if level exists
                if (existingLevelMap[levelKey]) {
                  // Update existing level
                  const levelId = existingLevelMap[levelKey];
                  levelsToKeep.add(levelId);
                  
                  // Update level content
                  db.run(
                    'UPDATE levels SET content = ?, phonetics = ?, audio_content = ? WHERE id = ?',
                    [level.text.content, level.text.phonetics || '', audioContent, levelId],
                    async function(err) {
                      if (err) {
                        errorCount++;
                        logger.error(`Erro ao atualizar nível ${levelKey}:`, err.message);
                      } else {
                        // Delete existing exercises for this level and insert new ones
                        try {
                          await deleteExercisesForLevel(levelId);
                          await insertExercises(levelId, level.exercises);
                          successCount++;
                        } catch (exerciseError) {
                          errorCount++;
                          logger.error(`Error updating exercises for level ${levelKey}:`, exerciseError);
                        }
                      }
                      
                      processedLevels++;
                      checkCompletion();
                    }
                  );
                } else {
                  // Insert new level
                  db.run(
                    'INSERT INTO levels (article_id, level, content, phonetics, audio_content) VALUES (?, ?, ?, ?, ?)',
                    [articleId, levelKey, level.text.content, level.text.phonetics || '', audioContent],
                    async function(err) {
                      if (err) {
                        errorCount++;
                        logger.error(`Erro ao inserir novo nível ${levelKey}:`, err.message);
                      } else {
                        const levelId = this.lastID;
                        levelsToKeep.add(levelId);
                        
                        // Insert exercises for new level
                        try {
                          await insertExercises(levelId, level.exercises);
                          successCount++;
                        } catch (exerciseError) {
                          errorCount++;
                          logger.error(`Error inserting exercises for new level ${levelKey}:`, exerciseError);
                        }
                      }
                      
                      processedLevels++;
                      checkCompletion();
                    }
                  );
                }
              } catch (levelError) {
                logger.error(`Error processing level ${levelKey}:`, levelError);
                errorCount++;
                processedLevels++;
                checkCompletion();
              }
            }

            // Check if all levels have been processed
            function checkCompletion() {
              if (processedLevels === totalLevels) {
                // Delete levels that are not in the updated article
                const levelIdsToDelete = existingLevels
                  .filter(level => !levelsToKeep.has(level.id))
                  .map(level => level.id);
                
                if (levelIdsToDelete.length > 0) {
                  deleteLevels(levelIdsToDelete)
                    .then(() => finishTransaction())
                    .catch(error => {
                      logger.error({ error }, 'Error deleting obsolete levels');
                      errorCount++;
                      finishTransaction();
                    });
                } else {
                  finishTransaction();
                }
              }
            }

            // Delete levels that are no longer needed
            async function deleteLevels(levelIds) {
              // Delete all exercises first
              await deleteExercisesForLevels(levelIds);
              
              // Then delete the levels
              return new Promise((resolve, reject) => {
                const placeholders = levelIds.map(() => '?').join(',');
                db.run(`DELETE FROM levels WHERE id IN (${placeholders})`, levelIds, (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve();
                  }
                });
              });
            }

            // Function to complete the transaction
            function finishTransaction() {
              if (errorCount > 0) {
                logger.warn(`Partial update: ${successCount} successful levels, ${errorCount} errors`);
                if (successCount > 0) {
                  // Still commit partial changes if some were successful
                  db.run('COMMIT');
                  resetRandomLevelCache();
                  return res.status(207).json({
                    partialSuccess: true,
                    message: 'Artigo parcialmente atualizado',
                    articleId: articleId,
                    successCount,
                    errorCount
                  });
                } else {
                  db.run('ROLLBACK');
                  return res.status(500).json({ 
                    error: 'Nenhum nível pôde ser atualizado',
                    successCount,
                    errorCount
                  });
                }
              }

              db.run('COMMIT');
              resetRandomLevelCache();
              logger.info({ articleId }, 'Article updated successfully');
              return res.status(200).json({
                success: true,
                message: 'Artigo atualizado com sucesso',
                articleId: articleId
              });
            }
          });
        }
      );
    });
  } catch (error) {
    logger.error('Erro ao processar a atualização de artigo:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Fetches complete article details by ID for editing
 * Only accessible by admin users
 */
const getArticleById = async (req, res) => {
  try {
    const { articleId } = req.params;
    
    if (!articleId) {
      return res.status(400).json({ error: 'ID do artigo não fornecido' });
    }

    logger.info({
      userId: req.user.id,
      articleId,
      action: 'get_article_details',
      role: req.user.role
    }, 'Admin requesting article details');

    // Get the article details
    db.get('SELECT id, title, article_link, summary, created_date FROM articles WHERE id = ?', 
      [articleId], async (err, article) => {
        if (err) {
          logger.error({ err, userId: req.user.id }, 'Database error fetching article');
          return res.status(500).json({ error: 'Erro ao buscar artigo no banco de dados' });
        }

        if (!article) {
          return res.status(404).json({ error: 'Artigo não encontrado' });
        }

        // Format the article object
        const formattedArticle = {
          id: article.id,
          title: article.title,
          article_link: article.article_link,
          summary: article.summary,
          created_date: article.created_date,
          levels: {}
        };

        // Get all levels for this article
        db.all('SELECT id, level, content, phonetics FROM levels WHERE article_id = ?', 
          [articleId], async (err, levels) => {
            if (err) {
              logger.error({ err, articleId }, 'Error fetching article levels');
              return res.status(500).json({ error: 'Erro ao buscar níveis do artigo' });
            }

            // Process each level and get their exercises
            for (const level of levels) {
              formattedArticle.levels[level.level] = {
                text: {
                  content: level.content,
                  phonetics: level.phonetics || ''
                },
                exercises: {}
              };

              // Fetch and add each exercise type
              try {
                // Multiple choice exercises
                const multipleChoiceExercises = await fetchExercises(
                  'exercises_multiple_choice', 
                  level.id, 
                  ['question', 'options', 'answer']
                );
                if (multipleChoiceExercises.length > 0) {
                  formattedArticle.levels[level.level].exercises.multiple_choice = 
                    multipleChoiceExercises.map(ex => ({
                      question: ex.question,
                      options: JSON.parse(ex.options),
                      answer: ex.answer
                    }));
                }

                // Fill in the blanks exercises
                const fillBlanksExercises = await fetchExercises(
                  'exercises_fill_in_the_blanks', 
                  level.id, 
                  ['sentence', 'answer', 'hint']
                );
                if (fillBlanksExercises.length > 0) {
                  formattedArticle.levels[level.level].exercises.fill_in_the_blanks = fillBlanksExercises;
                }

                // True/false exercises
                const trueFalseExercises = await fetchExercises(
                  'exercises_true_false', 
                  level.id, 
                  ['statement', 'answer']
                );
                if (trueFalseExercises.length > 0) {
                  formattedArticle.levels[level.level].exercises.true_false = trueFalseExercises;
                }

                // Vocabulary matching exercises
                const vocabExercises = await fetchExercises(
                  'exercises_vocabulary_matching', 
                  level.id, 
                  ['word', 'definition', 'example']
                );
                if (vocabExercises.length > 0) {
                  formattedArticle.levels[level.level].exercises.vocabulary_matching = vocabExercises;
                }

                // Writing with audio exercises
                const writingExercises = await fetchExercises(
                  'exercises_writing_with_audio', 
                  level.id, 
                  ['sentence']
                );
                if (writingExercises.length > 0) {
                  formattedArticle.levels[level.level].exercises.writing_with_audio = writingExercises;
                }
              } catch (exerciseErr) {
                logger.error({ exerciseErr, levelId: level.id }, 'Error fetching exercises');
                // Continue with partial data rather than failing completely
              }
            }

            // Return the complete article with all levels and exercises
            logger.info({ articleId, levelCount: levels.length }, 'Article details fetched successfully');
            return res.status(200).json(formattedArticle);
          });
      });
  } catch (error) {
    logger.error({ error }, 'Error processing get article details request');
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Helper function to fetch exercises by type
async function fetchExercises(tableName, levelId, fields) {
  return new Promise((resolve, reject) => {
    const fieldsStr = fields.join(', ');
    db.all(`SELECT ${fieldsStr} FROM ${tableName} WHERE level_id = ?`, [levelId], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

/**
 * Get a list of all articles for admin management
 * Only accessible by admin users
 */
const getArticlesList = async (req, res) => {
  try {
    logger.info({
      userId: req.user.id,
      action: 'get_articles_list'
    }, 'Admin requesting articles list');

    db.all('SELECT id, title, summary, created_date FROM articles ORDER BY created_date DESC', (err, articles) => {
      if (err) {
        logger.error({ err, userId: req.user.id }, 'Database error fetching articles list');
        return res.status(500).json({ error: 'Erro ao buscar lista de artigos' });
      }

      logger.info({ count: articles.length }, 'Articles list fetched successfully');
      return res.status(200).json(articles);
    });
  } catch (error) {
    logger.error({ error }, 'Error processing get articles list request');
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Helper function to delete all exercises for a specific level
async function deleteExercisesForLevel(levelId) {
  const tables = [
    'exercises_multiple_choice',
    'exercises_fill_in_the_blanks',
    'exercises_true_false',
    'exercises_vocabulary_matching',
    'exercises_writing_with_audio'
  ];
  
  const promises = tables.map(table => {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM ${table} WHERE level_id = ?`, [levelId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
  
  return Promise.all(promises);
}

// Helper function to delete all exercises for multiple levels
async function deleteExercisesForLevels(levelIds) {
  if (!levelIds || levelIds.length === 0) return Promise.resolve();
  
  const tables = [
    'exercises_multiple_choice',
    'exercises_fill_in_the_blanks',
    'exercises_true_false',
    'exercises_vocabulary_matching',
    'exercises_writing_with_audio'
  ];
  
  const promises = tables.map(table => {
    return new Promise((resolve, reject) => {
      const placeholders = levelIds.map(() => '?').join(',');
      db.run(`DELETE FROM ${table} WHERE level_id IN (${placeholders})`, levelIds, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
  
  return Promise.all(promises);
}

// Helper function to insert exercises for a level
async function insertExercises(levelId, exercises) {
  if (!exercises) return Promise.resolve();
  
  const promises = [];

  // Insert multiple choice exercises
  if (exercises.multiple_choice && Array.isArray(exercises.multiple_choice)) {
    exercises.multiple_choice.forEach(exercise => {
      promises.push(new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO exercises_multiple_choice (level_id, question, options, answer) VALUES (?, ?, ?, ?)',
          [levelId, exercise.question, JSON.stringify(exercise.options), exercise.answer],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      }));
    });
  }

  // Insert fill in the blanks exercises
  if (exercises.fill_in_the_blanks && Array.isArray(exercises.fill_in_the_blanks)) {
    exercises.fill_in_the_blanks.forEach(exercise => {
      promises.push(new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO exercises_fill_in_the_blanks (level_id, sentence, answer, hint) VALUES (?, ?, ?, ?)',
          [levelId, exercise.sentence, exercise.answer, exercise.hint || ''],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      }));
    });
  }

  // Insert true/false exercises
  if (exercises.true_false && Array.isArray(exercises.true_false)) {
    exercises.true_false.forEach(exercise => {
      promises.push(new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO exercises_true_false (level_id, statement, answer) VALUES (?, ?, ?)',
          [levelId, exercise.statement, exercise.answer],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      }));
    });
  }

  // Insert vocabulary matching exercises
  if (exercises.vocabulary_matching && Array.isArray(exercises.vocabulary_matching)) {
    exercises.vocabulary_matching.forEach(exercise => {
      promises.push(new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO exercises_vocabulary_matching (level_id, word, definition, example) VALUES (?, ?, ?, ?)',
          [levelId, exercise.word, exercise.definition, exercise.example || ''],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      }));
    });
  }

  // Insert writing with audio exercises
  if (exercises.writing_with_audio && Array.isArray(exercises.writing_with_audio)) {
    exercises.writing_with_audio.forEach(exercise => {
      promises.push(new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO exercises_writing_with_audio (level_id, sentence) VALUES (?, ?)',
          [levelId, exercise.sentence],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      }));
    });
  }

  return Promise.all(promises);
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

module.exports = {
  insertContent,
  deleteArticle,
  updateArticle,
  getArticleById,
  getArticlesList
};
