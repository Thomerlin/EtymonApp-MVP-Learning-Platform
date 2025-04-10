const levelSchema = {
	id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
	article_id: 'INTEGER NOT NULL',
	level: 'TEXT NOT NULL',
	content: 'TEXT NOT NULL',
	phonetics: 'TEXT NOT NULL'
  };
  
  module.exports = { levelSchema };