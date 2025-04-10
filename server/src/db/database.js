const database = require('../config/database');

module.exports = {
  get: database.get.bind(database),
  all: database.all.bind(database),
  run: database.run.bind(database)
};