import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pool;

export function getDatabaseMode() {
  return (process.env.DATABASE_URL || process.env.DB_HOST) ? 'managed-mysql' : 'memory-fallback';
}

function buildSslOptions() {
  // Check for CA certificate file for Aiven / managed MySQL
  const caPath = process.env.DB_SSL_CA || path.resolve(__dirname, '..', 'ca.pem');
  try {
    if (fs.existsSync(caPath)) {
      return { ca: fs.readFileSync(caPath), rejectUnauthorized: true };
    }
  } catch { /* ignore */ }
  // If DATABASE_URL contains "ssl" or it's an Aiven host, enable SSL without CA
  const url = process.env.DATABASE_URL || '';
  if (url.includes('aivencloud') || url.includes('ssl=') || process.env.DB_SSL === 'true') {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

export function getPool() {
  const hasUrl = Boolean(process.env.DATABASE_URL);
  const hasHost = Boolean(process.env.DB_HOST);
  if (!hasUrl && !hasHost) return null;

  if (!pool) {
    const ssl = buildSslOptions();
    if (hasUrl) {
      pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        connectionLimit: Number(process.env.DB_POOL_SIZE || 5),
        waitForConnections: true,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        ...(ssl ? { ssl } : {}),
      });
    } else {
      pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        connectionLimit: Number(process.env.DB_POOL_SIZE || 5),
        waitForConnections: true,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        ...(ssl ? { ssl } : {}),
      });
    }
  }
  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
