// Load environment variables
require('dotenv').config();

const app = require('./app');
const logger = require('./utils/logger');

// Port from environment or fallback
const PORT = process.env.PORT || 3000;

// Start the server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`API URL: ${process.env.SERVER_URL}`);
  logger.info(`Client URL: ${process.env.CLIENT_URL}`);
  
  // Show environment
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});
