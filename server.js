const path = require('path');

// Ensure working directory is set to backend so .env, uploads, and local modules resolve properly
const backendDir = path.join(__dirname, 'backend');
process.chdir(backendDir);

// Load and run the backend server
require(path.join(backendDir, 'server.js'));

