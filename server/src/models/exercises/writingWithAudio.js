const writingWithAudioSchema = {
	id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
	level_id: 'INTEGER NOT NULL',
	sentence: 'TEXT NOT NULL',
	foreignKeys: {
	  level_id: 'REFERENCES levels(id)'
	}
  };
  
  module.exports = { writingWithAudioSchema };