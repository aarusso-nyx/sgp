const fs = require('node:fs');
const path = require('node:path');

function loadDotEnv() {
  const file = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function getRequiredEnv() {
  loadDotEnv();
  const required = ['APP_BASE_URL', 'APP_LOGIN', 'APP_PASSWORD'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required runtime values: ${missing.join(', ')}`);
  }

  return {
    baseUrl: process.env.APP_BASE_URL,
    login: process.env.APP_LOGIN,
    password: process.env.APP_PASSWORD,
    moduleName: process.env.MODULE_NAME || ''
  };
}

module.exports = {
  getRequiredEnv
};
