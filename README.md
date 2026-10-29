# paul.studio — Portfolio 3D (PERN)

Un open-space en 3D où chaque bureau présente un projet, animé par un agent qui parle.

| Couche | Rôle |
|---|---|
| **P**ostgreSQL | profil, projets (agents, dialogues), cache GitHub, messages de contact |
| **E**xpress | API (`/api/portfolio`, `/api/contact`, `/api/health`) + sert le site compilé |
| **R**eact (Vite) | interface : accueil, bulle, panneau, dock, fenêtre de contact |
| **N**ode.js 20.12+ | exécution |

La scène 3D est en Three.js (`client/src/studio/`), pilotée par React via un petit store zustand.

```
client/                 site React (Vite)
  src/studio/           moteur 3D : local, agents, écrans animés, dialogues, voix
  src/components/       interface React
server/
  db/schema.sql         tables
  db/seed-data.js       ← LE CONTENU DU PORTFOLIO (profil, contacts, projets)
  src/                  API Express
prototype/index.html    première version (fichier unique), gardée pour référence
```

## Lancer en local

Il faut Node.js 20.12 ou plus récent et une base PostgreSQL (ton PostgreSQL 18 local suffit).

```bash
npm install
cp .env.example .env          # puis renseigne DATABASE_URL
createdb paul_studio          # ou crée la base depuis pgAdmin
npm run db:setup              # tables + contenu
npm run dev:server            # API sur http://localhost:4000
npm run dev:client            # site sur http://localhost:5173 (dans un 2e terminal)
```

Sans installer PostgreSQL, si Docker est installé : `docker compose up --build`, puis ouvre http://localhost:4000.

## Modifier le contenu

Tout est dans `server/db/seed-data.js` : bio, compétences, parcours, e-mail et WhatsApp, et chaque bureau (textes, stack, liens, agent, phrases).
Ensuite :

```bash
npm run db:seed
```

Un projet retiré du fichier est masqué du studio (pas supprimé). En production, le seed est relancé à chaque déploiement.

**Ajouter une capture d'écran** : place l'image dans `client/public/images/` puis ajoute `images: ['/images/mon-projet.png']`.
Une image hébergée sur le site s'affiche aussi sur l'écran 3D du bureau. Une image venant d'un autre site (comme celle de MoveColis) s'affiche seulement dans le panneau.

## Mise en ligne

### Option A — Render (le plus simple)

1. Pousse le projet sur GitHub (dépôt privé ou public, `.env` n'est jamais envoyé).
2. Sur Render : **New → PostgreSQL** (région Frankfurt). Copie l'**Internal Database URL**.
3. **New → Web Service** → ton dépôt, puis :
   - Runtime : **Docker** (le `Dockerfile` fait tout), ou Node avec :
     - Build command : `npm ci && npm run build`
     - Start command : `npm run db:setup && npm start`
   - Variables d'environnement : `DATABASE_URL` (URL interne), `NODE_ENV=production`.
     Ajoute `DATABASE_SSL=true` seulement si tu utilises l'URL **externe**.
   - Health check path : `/api/health`
4. Ajoute ton nom de domaine dans **Settings → Custom Domains** (HTTPS automatique).

### Option B — ton VPS (comme MoveColis)

```bash
docker build -t paul-studio .
docker run -d --name paul-studio --restart unless-stopped -p 127.0.0.1:4100:4000 \
  -e DATABASE_URL='postgres://…' -e DATABASE_SSL=true paul-studio
```

Puis un site Nginx qui fait `proxy_pass http://127.0.0.1:4100;` pour ton domaine, avec Certbot pour le HTTPS.
`trust proxy` est déjà activé dans Express, donc la limite d'envoi du formulaire voit la vraie IP des visiteurs.

## Variables d'environnement

| Variable | Obligatoire | Rôle |
|---|---|---|
| `DATABASE_URL` | oui | connexion PostgreSQL |
| `DATABASE_SSL` | non | `true` si l'hébergeur impose SSL |
| `PORT` | non | 4000 par défaut (Render le fournit) |
| `NODE_ENV` | en prod | `production` active `upgrade-insecure-requests` |
| `GITHUB_TOKEN` | non | relève la limite de l'API GitHub (jeton sans aucun droit) |
| `RESEND_API_KEY`, `CONTACT_TO`, `MAIL_FROM` | non | e-mail à chaque message reçu via le formulaire |

## Lire les messages reçus

Sans Resend, les messages du formulaire sont seulement enregistrés en base :

```sql
SELECT created_at, name, email, message FROM contact_messages ORDER BY created_at DESC;
```

## API

- `GET /api/portfolio` : profil + projets publiés (étoiles et date GitHub rafraîchies toutes les 6 h, en arrière-plan)
- `POST /api/contact` : `{ name, email, message }`, 5 envois par IP toutes les 15 minutes
- `GET /api/health` : vérifie la connexion à la base
