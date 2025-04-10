const db = require('../db/database');

const getProgress = (userId) => {
	return new Promise((resolve, reject) => {
		const query = `SELECT exercise_number, score FROM progress WHERE user_id = ?`;
		db.all(query, [userId], (err, rows) => {
			if (err) reject(err);
			resolve(rows);
		});
	});
};

const getArticleLevelProgress = (userId, articleId, level) => {
	const totalExercisesPerType = 5;
	const exerciseTypes = ["multiple_choice", "fill_in_the_blanks", "true_false", "writing_with_audio"];

	return new Promise((resolve, reject) => {
		const query = `
		SELECT exercise_type, COUNT(DISTINCT exercise_number) AS completed, AVG(score) AS averageScore
		FROM progress
		WHERE user_id = ? AND article_id = ? AND level = ?
		GROUP BY exercise_type
	  `;

		db.all(query, [userId, articleId, level], (err, rows) => {
			if (err) return reject(err);
			if (!rows || rows.length === 0) return reject(new Error("No progress data found"));

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

			resolve({
				articleId,
				level,
				exercises,
				totalCompleted,
				totalExercises,
				totalPercentage
			});
		});
	});
};

module.exports = {
	getProgress,
	getArticleLevelProgress
};
