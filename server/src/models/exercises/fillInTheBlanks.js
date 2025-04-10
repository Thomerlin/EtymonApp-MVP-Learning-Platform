const fillInTheBlanksSchema = {
	id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
	level_id: 'INTEGER NOT NULL',
	sentence: 'TEXT NOT NULL',
	answer: 'TEXT NOT NULL',
	hint: 'TEXT NOT NULL',
	foreignKeys: {
		level_id: 'REFERENCES levels(id)'
	}
};

module.exports = { fillInTheBlanksSchema };