const articleSchema = {
	id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
	title: 'TEXT NOT NULL',
	article_link: 'TEXT NOT NULL',
	summary: 'TEXT NOT NULL',
	created_date: 'TEXT NOT NULL'
  };
  
  module.exports = { articleSchema };