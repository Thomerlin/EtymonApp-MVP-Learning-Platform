const db = require('../db/database');
const logger = require('../utils/logger');

/**
 * Print database contents for debugging purposes
 * Only used in development environment
 */
function printDatabaseContents() {
  logger.debug('Fetching database contents for debug purposes');
  
  // Get list of tables
  db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
    if (err) {
      logger.error({ err }, 'Error getting database tables');
      return;
    }
    
    tables.forEach(tableObj => {
      const tableName = tableObj.name;
      if (tableName !== 'sqlite_sequence') {
        db.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
          if (err) {
            logger.error({ err, table: tableName }, 'Error fetching table data');
            return;
          }
          
          if (rows.length > 0) {
            logger.debug({ table: tableName, count: rows.length }, `Table ${tableName} contents`);
            // Use trace level for detailed data without direct bunyan reference
            logger.trace({ rows }, `${tableName} data`);
          }
        });
      }
    });
  });
}

module.exports = {
  printDatabaseContents
};