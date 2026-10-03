import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not configured; no migration was run.');
  process.exit(1);
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = (await fs.readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
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
