import { pool } from '../src/db.js';
import { profile, projects } from '../db/seed-data.js';

// Insère ou met à jour le contenu (par slug). Le cache GitHub et les messages reçus ne sont jamais touchés.
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query(
    `INSERT INTO profile (id, data) VALUES (1, $1)
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [profile],
  );
  for (const [position, p] of projects.entries()) {
    await client.query(
      `INSERT INTO projects (slug, position, title, short, icon, tagline, description, stack, status,
                             github, repo_url, demo_url, images, screen, file, contact, agent, lines, published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, true)
       ON CONFLICT (slug) DO UPDATE SET
         position = EXCLUDED.position, title = EXCLUDED.title, short = EXCLUDED.short, icon = EXCLUDED.icon,
         tagline = EXCLUDED.tagline, description = EXCLUDED.description, stack = EXCLUDED.stack,
         status = EXCLUDED.status, github = EXCLUDED.github, repo_url = EXCLUDED.repo_url,
         demo_url = EXCLUDED.demo_url, images = EXCLUDED.images, screen = EXCLUDED.screen,
         file = EXCLUDED.file, contact = EXCLUDED.contact, agent = EXCLUDED.agent, lines = EXCLUDED.lines,
         published = true, updated_at = now()`,
      [p.slug, position, p.title, p.short, p.icon, p.tagline, p.description, p.stack, p.status || null,
        p.github || null, p.repo || null, p.demo || null, p.images || [], p.screen || 'code', p.file || null,
        Boolean(p.contact), p.agent, p.lines],
    );
  }
  // Un projet retiré du fichier disparaît du studio (sans être supprimé de la base)
  const { rowCount } = await client.query(
    'UPDATE projects SET published = false WHERE published AND NOT (slug = ANY($1))',
    [projects.map((p) => p.slug)],
  );
  await client.query('COMMIT');
  console.log(`✔ Profil et ${projects.length} projets enregistrés${rowCount ? ` (${rowCount} masqué${rowCount > 1 ? 's' : ''})` : ''}`);
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
  await pool.end();
}
