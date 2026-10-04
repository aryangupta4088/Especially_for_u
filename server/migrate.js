import 'dotenv/config';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const hasUrl = Boolean(process.env.DATABASE_URL);
const hasHost = Boolean(process.env.DB_HOST);
if (!hasUrl && !hasHost) {
  console.error('DATABASE_URL (or DB_HOST) is not configured; no migration was run.');
  process.exit(1);
}

function buildSslOptions() {
  const caPath = process.env.DB_SSL_CA || path.resolve(__dirname, '..', 'ca.pem');
  try {
    if (fs.existsSync(caPath)) {
      return { ca: fs.readFileSync(caPath), rejectUnauthorized: true };
    }
  } catch { /* ignore */ }
  const url = process.env.DATABASE_URL || '';
  if (url.includes('aivencloud') || url.includes('ssl=') || process.env.DB_SSL === 'true') {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

const ssl = buildSslOptions();
const connOpts = hasUrl
  ? { uri: process.env.DATABASE_URL, ...(ssl ? { ssl } : {}) }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ...(ssl ? { ssl } : {}),
    };

const connection = await mysql.createConnection(connOpts);
try {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = (await fsp.readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const sql = await fsp.readFile(path.join(migrationsDir, file), 'utf8');
    for (const statement of sql.split(';').map((item) => item.trim()).filter(Boolean)) {
      try {
        await connection.query(statement);
      } catch (err) {
        console.error(`[warn] migration ${file} statement failed: ${err.message}`);
      }
    }
    console.log(`Applied server/migrations/${file}`);
  }
} finally {
  await connection.end();
}
