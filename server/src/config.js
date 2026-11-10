import { fileURLToPath } from 'node:url';

// En local, les variables viennent du fichier .env à la racine du projet.
// En production (Render, VPS…), elles sont fournies par la plateforme.
try {
  process.loadEnvFile(fileURLToPath(new URL('../../.env', import.meta.url)));
} catch {
  /* pas de .env : on utilise les variables d'environnement existantes */
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  isProd: process.env.NODE_ENV === 'production',
  databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL, // POSTGRES_URL : nom donné par certaines intégrations Vercel
  databaseSsl: process.env.DATABASE_SSL === 'true',
  githubToken: process.env.GITHUB_TOKEN || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
  contactTo: process.env.CONTACT_TO || '',
  mailFrom: process.env.MAIL_FROM || 'Portfolio <onboarding@resend.dev>',
};

if (!config.databaseUrl) {
  console.error('✖ DATABASE_URL manquant : copie .env.example en .env et renseigne ta base PostgreSQL.');
  process.exit(1);
}
