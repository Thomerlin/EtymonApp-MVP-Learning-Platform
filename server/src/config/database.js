const sqlite3 = require('sqlite3').verbose();

const database = new sqlite3.Database('./database.db', (err) => {
	if (err) {
		console.error('Erro ao conectar ao SQLite (database):', err.message);
	} else {
		console.log('Conectado ao SQLite (database)');
	}
});

module.exports = database;