import { query } from '../db.js';
import { config } from '../config.js';

// Met à jour étoiles et date de dernier push, au plus toutes les 6 h par dépôt.
// Côté serveur, la limite de l'API GitHub (60 requêtes/h sans jeton) n'est pas consommée par chaque visiteur.
let running = null;

export function refreshGithubStats() {
  running ??= doRefresh().finally(() => { running = null; });
  return running;
}

async function doRefresh() {
  const { rows } = await query(
    `SELECT id, github FROM projects
     WHERE published AND github IS NOT NULL AND github <> ''
       AND (gh_checked_at IS NULL OR gh_checked_at < now() - interval '6 hours')`,
  );
  await Promise.all(rows.map(async ({ id, github }) => {
    try {
      const res = await fetch(`https://api.github.com/repos/${github}`, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'paul-studio-portfolio',
          ...(config.githubToken && { Authorization: `Bearer ${config.githubToken}` }),
        },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        await query('UPDATE projects SET gh_checked_at = now() WHERE id = $1', [id]);
        return;
      }
      const repo = await res.json();
      await query(
        `UPDATE projects SET gh_stars = $2, gh_pushed_at = $3, gh_checked_at = now(),
                repo_url = COALESCE(NULLIF(repo_url, ''), $4)
         WHERE id = $1`,
        [id, repo.stargazers_count, repo.pushed_at, repo.html_url],
      );
    } catch (err) {
      console.warn(`GitHub ${github} :`, err.message);
    }
  }));
}
