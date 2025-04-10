const path = require('path');

const serveIndex = (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/client/index.html"));
};

module.exports = { serveIndex };