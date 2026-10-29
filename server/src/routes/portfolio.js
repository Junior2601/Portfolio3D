import { Router } from 'express';
import { query } from '../db.js';
import { refreshGithubStats } from '../services/github.js';

export const portfolio = Router();

const toProject = (r) => ({
  slug: r.slug,
  title: r.title,
  short: r.short,
  icon: r.icon,
  tagline: r.tagline,
  description: r.description,
  stack: r.stack,
  status: r.status,
  repo: r.repo_url || '',
  demo: r.demo_url || '',
  images: r.images,
  screen: r.screen,
  file: r.file,
  contact: r.contact,
  look: r.agent,
  lines: r.lines,
  stars: r.gh_stars,
  updated: r.gh_pushed_at,
});

portfolio.get('/portfolio', async (req, res, next) => {
  try {
    // Rafraîchit le cache GitHub en arrière-plan : la réponse n'attend pas
    refreshGithubStats().catch((err) => console.warn('GitHub :', err.message));
    const [prof, list] = await Promise.all([
      query('SELECT data FROM profile WHERE id = 1'),
      query('SELECT * FROM projects WHERE published ORDER BY position'),
    ]);
    if (!prof.rows[0]) return res.status(503).json({ error: 'Le studio est vide : lance « npm run db:setup ».' });
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ profile: prof.rows[0].data, projects: list.rows.map(toProject) });
  } catch (err) {
    next(err);
  }
});
