const path = require('node:path');

// Loads src files (in dependency order) into globalThis.CD, the same way
// the browser's <script> tags do, and returns the namespace.
function load(...files) {
  for (const f of files) require(path.join(__dirname, '..', 'src', f + '.js'));
  return globalThis.CD;
}

module.exports = { load };
