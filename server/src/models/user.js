// Schema definition (could be expanded with validation)
const userSchema = {
	id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
	email: 'TEXT UNIQUE NOT NULL',
	password: 'TEXT NOT NULL'
  };
  
  module.exports = { userSchema };