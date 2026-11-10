import pg from 'pg';
import { attachDatabasePool } from '@vercel/functions';
import { config } from './config.js';

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : false, // une URL avec ?sslmode=require (Neon) active SSL d'elle-même
  max: 5,
  idleTimeoutMillis: 5000,
});

// Sur Vercel : ferme proprement les connexions inutilisées avant que la fonction soit mise en veille. Sans effet ailleurs.
attachDatabasePool(pool);

export const query = (text, params) => pool.query(text, params);
