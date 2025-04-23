const db = require('../db/database');
const logger = require('../utils/logger');

const getProgress = (userId) => {
	return new Promise((resolve, reject) => {
		logger.info({ userId }, 'Getting user progress');
		
		// Query to get total exercises solved
		const exercisesQuery = `
			SELECT COUNT(*) as totalExercises, 
				   SUM(CASE WHEN score > 0 THEN 1 ELSE 0 END) as solvedExercises 
			FROM progress 
			WHERE user_id = ?
		`;
		
		// Query to get exercises solved by level
		const exercisesByLevelQuery = `
			SELECT level, COUNT(*) as totalExercises, 
				   SUM(CASE WHEN score > 0 THEN 1 ELSE 0 END) as solvedExercises 
			FROM progress 
			WHERE user_id = ? 
			GROUP BY level
		`;
		
		// Query to get read articles
		const articlesQuery = `
			SELECT DISTINCT article_id 
			FROM progress 
			WHERE user_id = ?
		`;
		
		// Query to get article titles and reading time
		const articleDetailsQuery = `
			SELECT a.id, a.title, SUM(p.reading_time) as totalReadingTime
			FROM articles a
			INNER JOIN (
				SELECT DISTINCT article_id, reading_time 
				FROM progress 
				WHERE user_id = ? AND reading_time > 0
			) p ON a.id = p.article_id
			GROUP BY a.id, a.title
		`;
		
		Promise.all([
			new Promise((resolve, reject) => {
				db.get(exercisesQuery, [userId], (err, row) => {
					if (err) {
						logger.error({ err, userId }, 'Error getting exercises data');
						reject(err);
					} else resolve(row);
				});
			}),
			new Promise((resolve, reject) => {
				db.all(exercisesByLevelQuery, [userId], (err, rows) => {
					if (err) {
						logger.error({ err, userId }, 'Error getting exercises by level');
						reject(err);
					} else resolve(rows);
				});
			}),
			new Promise((resolve, reject) => {
				db.all(articlesQuery, [userId], (err, rows) => {
					if (err) {
						logger.error({ err, userId }, 'Error getting read articles');
						reject(err);
					} else resolve(rows.length);
				});
			}),
			new Promise((resolve, reject) => {
				db.all(articleDetailsQuery, [userId], (err, rows) => {
					if (err) {
						logger.error({ err, userId }, 'Error getting article details');
						reject(err);
					} else resolve(rows);
				});
			})
		])
		.then(([exercisesData, exercisesByLevel, readArticlesCount, articlesDetails]) => {
			const totalReadingTime = articlesDetails.reduce((sum, article) => sum + article.totalReadingTime, 0);
			
			const result = {
				totalExercises: exercisesData.totalExercises || 0,
				solvedExercises: exercisesData.solvedExercises || 0,
				exercisesByLevel: exercisesByLevel,
				readArticles: {
					count: readArticlesCount || 0,
					details: articlesDetails
				},
				totalReadingTime: totalReadingTime || 0, // in seconds
				readingTimeFormatted: formatReadingTime(totalReadingTime)
			};
			
			logger.info({
				userId, 
				totalExercises: result.totalExercises, 
				solvedExercises: result.solvedExercises,
				readArticlesCount: result.readArticles.count
			}, 'Progress data collected');
			
			resolve(result);
		})
		.catch(err => {
			logger.error({ err, userId }, 'Error collecting progress data');
			reject(err);
		});
	});
};

// Helper function to format reading time
function formatReadingTime(seconds) {
	if (!seconds) return '0 minutes';
	
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	
	let result = '';
	if (hours > 0) {
		result += `${hours} hour${hours > 1 ? 's' : ''}`;
	}
	if (minutes > 0) {
		if (result) result += ' ';
		result += `${minutes} minute${minutes > 1 ? 's' : ''}`;
	}
	
	return result || '0 minutes';
}

const getArticleLevelProgress = (userId, articleId, level) => {
	const totalExercisesPerType = 5;
	const exerciseTypes = ["multiple_choice", "fill_in_the_blanks", "true_false", "writing_with_audio"];

	logger.debug({ userId, articleId, level }, 'Getting article level progress');

	return new Promise((resolve, reject) => {
		const query = `
		SELECT exercise_type, COUNT(DISTINCT exercise_number) AS completed, AVG(score) AS averageScore
		FROM progress
		WHERE user_id = ? AND article_id = ? AND level = ?
		GROUP BY exercise_type
	  `;

		db.all(query, [userId, articleId, level], (err, rows) => {
			if (err) {
				logger.error({ err, userId, articleId, level }, 'Error retrieving article level progress');
				return reject(err);
			}
			if (!rows || rows.length === 0) {
				logger.warn({ userId, articleId, level }, 'No progress data found');
				return reject(new Error("No progress data found"));
			}

			const exercises = exerciseTypes.map(type => {
				const row = rows.find(r => r.exercise_type === type);
				const completed = row ? row.completed : 0;
				const averageScore = row ? Math.round(row.averageScore) : 0;
				return {
					type,
					completed,
					total: totalExercisesPerType,
					percentage: Math.round((completed / totalExercisesPerType) * 100),
					averageScore
				};
			});

			const totalExercises = totalExercisesPerType * exerciseTypes.length;
			const totalCompleted = exercises.reduce((sum, ex) => sum + ex.completed, 0);
			const totalPercentage = Math.round((totalCompleted / totalExercises) * 100);

			const result = {
				articleId,
				level,
				exercises,
				totalCompleted,
				totalExercises,
				totalPercentage
			};
			
			logger.info({
				userId,
				articleId,
				level,
				totalCompleted,
				totalPercentage
			}, 'Article level progress retrieved');
			
			resolve(result);
		});
	});
};

module.exports = {
	getProgress,
	getArticleLevelProgress
};
