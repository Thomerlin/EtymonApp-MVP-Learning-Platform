const progressSchema = {
	id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
	user_id: 'INTEGER NOT NULL',
	article_id: 'INTEGER NOT NULL',
	level: 'TEXT NOT NULL',
	exercise_type: 'TEXT NOT NULL',
	exercise_number: 'INTEGER NOT NULL',
	score: 'INTEGER NOT NULL'
  };
  
  module.exports = { progressSchema };