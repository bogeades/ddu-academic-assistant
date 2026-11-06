/**
 * Re-export and adapter layer for services/aiGateway.js
 * Ensures backwards compatibility across codebase while adhering strictly to Phase 2 specifications.
 */

const aiGateway = require('./aiGateway');

module.exports = aiGateway;
