const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.resolve(__dirname, '../../.env');
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
  raw.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const index = trimmed.indexOf('=');
    if (index === -1) return;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (key && process.env[key] == null) {
      process.env[key] = value;
    }
  });
}

loadEnvFile();

const config = {
  port: Number(process.env.PORT || 8090),
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  supabaseTable: process.env.SUPABASE_TABLE || 'info_registrations'
};

function hasSupabaseConfig() {
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey && config.supabaseTable);
}

module.exports = {
  config,
  hasSupabaseConfig
};
