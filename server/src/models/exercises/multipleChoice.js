const multipleChoiceSchema = {
	id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
	level_id: 'INTEGER NOT NULL',
	question: 'TEXT NOT NULL',
	options: 'TEXT NOT NULL',
	answer: 'TEXT NOT NULL'
  };
  
  module.exports = { multipleChoiceSchema };