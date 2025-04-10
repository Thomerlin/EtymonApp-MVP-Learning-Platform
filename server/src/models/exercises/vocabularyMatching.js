const vocabularyMatchingSchema = {
	id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
	level_id: 'INTEGER NOT NULL',
	word: 'TEXT NOT NULL',
	definition: 'TEXT NOT NULL',
	example: 'TEXT NOT NULL',
	foreignKeys: {
	  level_id: 'REFERENCES levels(id)'
	}
  };
  
  module.exports = { vocabularyMatchingSchema };