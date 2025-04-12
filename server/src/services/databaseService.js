const db = require('../db/database');

// Function to print database contents in JSON format
const printDatabaseContents = () => {
  console.log("\n--- Database Contents (JSON) ---");

  const tables = [
    { name: "users", query: "SELECT * FROM users" },
    { name: "progress", query: "SELECT * FROM progress" },
    { name: "exercises_multiple_choice", query: "SELECT * FROM exercises_multiple_choice" }
  ];

  const databaseContents = {};
  let pendingQueries = tables.length;

  tables.forEach(table => {
    db.all(table.query, [], (err, rows) => {
      if (err) {
        console.error(`Error querying table ${table.name}:`, err.message);
        databaseContents[table.name] = { error: err.message };
      } else {
        databaseContents[table.name] = rows;
      }

      pendingQueries--;
      if (pendingQueries === 0) {
        console.log(JSON.stringify(databaseContents, null, 2));
        console.log("\n--- End of Database Contents ---\n");
      }
    });
  });
};

module.exports = { printDatabaseContents };