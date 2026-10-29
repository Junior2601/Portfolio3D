import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { query } from './db.js';
import { portfolio } from './routes/portfolio.js';
import { contact } from './routes/contact.js';

const CLIENT_DIST = fileURLToPath(new URL('../../client/dist', import.meta.url));

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // derrière Render / Nginx : la vraie IP du visiteur pour la limite d'envoi

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'blob:', 'https:'],
        'connect-src': ["'self'"],
        'upgrade-insecure-requests': config.isProd ? [] : null,
      },
    },
  }));
  app.use(compression());
  app.use(express.json({ limit: '20kb' }));

  app.get('/api/health', async (req, res) => {
    try {
      await query('SELECT 1');
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false });
    }
  });
  app.use('/api', portfolio, contact);
  app.use('/api', (req, res) => res.status(404).json({ error: 'Route inconnue' }));

  // En production, le même serveur sert le site React compilé
  if (existsSync(CLIENT_DIST)) {
    app.use('/assets', express.static(join(CLIENT_DIST, 'assets'), { immutable: true, maxAge: '1y' }));
    app.use(express.static(CLIENT_DIST, { index: false, maxAge: '1h' }));
    app.get('*', (req, res) => {
      res.set('Cache-Control', 'no-cache');
      res.sendFile(join(CLIENT_DIST, 'index.html'));
    });
  }

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur, réessaie plus tard.' });
  });
  return app;
}
