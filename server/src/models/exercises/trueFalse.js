const trueFalseSchema = {
	id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
	level_id: 'INTEGER NOT NULL',
	statement: 'TEXT NOT NULL',
	answer: 'TEXT NOT NULL', // Could be constrained to 'true'/'false'
	foreignKeys: {
		level_id: 'REFERENCES levels(id)'
	}
};

module.exports = { trueFalseSchema };