import { readFile } from 'node:fs/promises';
import { pool } from '../src/db.js';

const sql = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
try {
  await pool.query(sql);
  console.log('✔ Schéma à jour');
} finally {
  await pool.end();
}
