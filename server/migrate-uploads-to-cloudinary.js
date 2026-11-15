import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { getPool } from './db.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/uploads');
const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env;
if (!cloudName || !apiKey || !apiSecret) throw new Error('Cloudinary is not fully configured in .env.');
const pool = getPool();
if (!pool) throw new Error('MySQL is not configured. Set DATABASE_URL or DB_HOST in .env.');

function sign(params) {
  const data = Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('&');
  return createHash('sha1').update(`${data}${apiSecret}`).digest('hex');
}

const mimeByExtension = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
  '.avif': 'image/avif', '.heic': 'image/heic', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
};

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch((error) => error.code === 'ENOENT' ? [] : Promise.reject(error));
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

async function uploadFile(file) {
  const relative = path.relative(root, file).split(path.sep).join('/');
  const ext = path.extname(file).toLowerCase();
  const mime = mimeByExtension[ext];
  if (!mime) throw new Error(`Unsupported uploaded file type: ${relative}`);
  const type = mime.startsWith('video/') ? 'video' : 'image';
  const folder = relative.startsWith('references/') ? 'especially-for-u/references' : 'especially-for-u/studio';
  const publicId = `legacy-${createHash('sha256').update(relative).digest('hex').slice(0, 24)}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder, public_id: publicId, timestamp };
  const form = new FormData();
  form.set('file', new Blob([await fs.readFile(file)], { type: mime }), path.basename(file));
  form.set('api_key', apiKey);
  form.set('folder', folder);
  form.set('public_id', publicId);
  form.set('timestamp', String(timestamp));
  form.set('signature', sign(params));
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${type}/upload`, { method: 'POST', body: form });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.secure_url) throw new Error(`Cloudinary upload failed for ${relative}: ${result.error?.message || response.statusText}`);
  return { localUrl: `/uploads/${relative}`, cloudUrl: result.secure_url };
}

function replaceLinks(value, urls) {
  if (typeof value === 'string') {
    try {
      const parsed = new URL(value, 'http://local');
      const replacement = urls.get(parsed.pathname);
      return replacement ? (value.startsWith('http') ? replacement : replacement) : value;
    } catch { return value; }
  }
  if (Array.isArray(value)) return value.map((item) => replaceLinks(item, urls));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceLinks(item, urls)]));
  return value;
}

const localFiles = await walk(root);
if (localFiles.length === 0) {
  console.log('No local uploads found. Nothing to migrate.');
  await pool.end();
  process.exit(0);
}

const urlMap = new Map();
let transactionStarted = false;
try {
  for (const file of localFiles) {
    const uploaded = await uploadFile(file);
    urlMap.set(uploaded.localUrl, uploaded.cloudUrl);
    console.log(`Uploaded ${path.relative(root, file)}`);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    let changes = 0;
    for (const table of ['products', 'categories']) {
      const [rows] = await connection.query(`SELECT id, image FROM ${table}`);
      for (const row of rows) {
        const next = replaceLinks(row.image, urlMap);
        if (next !== row.image) {
          await connection.query(`UPDATE ${table} SET image = ? WHERE id = ?`, [next, row.id]);
          changes++;
        }
      }
    }
    const [settings] = await connection.query('SELECT id, upi_qr_image FROM site_settings WHERE upi_qr_image IS NOT NULL');
    for (const row of settings) {
      const next = replaceLinks(row.upi_qr_image, urlMap);
      if (next !== row.upi_qr_image) {
        await connection.query('UPDATE site_settings SET upi_qr_image = ? WHERE id = ?', [next, row.id]);
        changes++;
      }
    }
    const [requests] = await connection.query('SELECT id, reference_urls_json FROM custom_requests');
    for (const row of requests) {
      const before = typeof row.reference_urls_json === 'string' ? JSON.parse(row.reference_urls_json) : row.reference_urls_json;
      const after = replaceLinks(before, urlMap);
      if (JSON.stringify(after) !== JSON.stringify(before)) {
        await connection.query('UPDATE custom_requests SET reference_urls_json = ? WHERE id = ?', [JSON.stringify(after), row.id]);
        changes++;
      }
    }
    const [items] = await connection.query('SELECT id, customization_json FROM order_items');
    for (const row of items) {
      const before = typeof row.customization_json === 'string' ? JSON.parse(row.customization_json) : row.customization_json;
      const after = replaceLinks(before, urlMap);
      if (JSON.stringify(after) !== JSON.stringify(before)) {
        await connection.query('UPDATE order_items SET customization_json = ? WHERE id = ?', [JSON.stringify(after), row.id]);
        changes++;
      }
    }
    const [messages] = await connection.query('SELECT id, message FROM conversation_messages');
    for (const row of messages) {
      const next = replaceLinks(row.message, urlMap);
      if (next !== row.message) {
        await connection.query('UPDATE conversation_messages SET message = ? WHERE id = ?', [next, row.id]);
        changes++;
      }
    }
    await connection.commit();
    transactionStarted = false;
    console.log(`Updated ${changes} database records to Cloudinary URLs.`);
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await Promise.all(localFiles.map((file) => fs.rm(file)));
  for (const dir of ['references']) await fs.rm(path.join(root, dir), { recursive: true, force: true });
  console.log(`Migration complete: ${localFiles.length} files moved to Cloudinary. Local upload copies removed.`);
} finally {
  await pool.end();
}
