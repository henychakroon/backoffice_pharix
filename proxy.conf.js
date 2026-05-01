const fs = require('fs');
const path = require('path');

// Load .env from project root (one level above FrontEendPharix/)
const envFile = path.resolve(__dirname, '../.env');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split(/\r?\n/).forEach(line => {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  });
}

const target = process.env['BACKEND_URL'] || 'http://localhost:8082';

module.exports = {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
    logLevel: 'debug'
  },
  '/ws': {
    target,
    secure: false,
    changeOrigin: true,
    ws: true,
    logLevel: 'debug'
  }
};
