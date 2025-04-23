const bunyan = require('bunyan');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Configure the logger
const logger = bunyan.createLogger({
  name: 'etymon-app',
  streams: [
    {
      level: 'info',
      stream: process.stdout
    },
    {
      level: 'error',
      path: path.join(logsDir, 'error.log')
    },
    {
      level: 'debug',
      path: path.join(logsDir, 'debug.log') 
    }
  ],
  serializers: bunyan.stdSerializers,
});

module.exports = logger;
