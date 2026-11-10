# paul.studio — Portfolio 3D (PERN)

Un open-space en 3D où chaque bureau présente un projet, animé par un agent qui parle.

**La visite se fait à pied, à la première personne** : on entre par la porte, face à l'accueil.
Glisser à la souris (ou au doigt) fait tourner la tête, un clic au sol y emmène en contournant les meubles,
et <kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd> (ou <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>, et les flèches) font marcher.
Cliquer sur un agent y conduit, puis il présente son projet. Le bouton **Vue d'ensemble** (touche <kbd>V</kbd>) passe à la maquette vue d'en haut, et inversement.

Le local est découpé par des cloisons vitrées :

- **l'accueil** (devant, à gauche) : le comptoir avec l'agent **Bienvenue**, le divan, le distributeur et la fontaine à eau.
  Cliquer sur Bienvenue ouvre un **chat** : il répond tout de suite aux questions sur Paul (projets, technos, formation, Forage, livres…)
  en citant d'où vient la réponse, prend les rendez-vous et transmet les messages.
  Chaque demande est enregistrée en base et envoyée par e-mail (voir plus bas) ;
- **la bibliothèque** (au fond, à gauche), avec Zoé et les livres recommandés, et, dans le même compartiment, **la salle de formation** :
  Paul y présente ses diplômes et ses simulations de poste Forage, en deux onglets sur le grand écran ;
- **l'espace cowork** (à droite) : un bureau par projet.

| Couche | Rôle |
|---|---|
| **P**ostgreSQL | profil, projets (agents, dialogues), cache GitHub, messages de contact |
| **E**xpress | API (`/api/portfolio`, `/api/contact`, `/api/health`) + sert le site compilé |
| **R**eact (Vite) | interface : accueil, bulle, panneau, dock, fenêtre de contact |
| **N**ode.js 20.12+ | exécution |

La scène 3D est en Three.js (`client/src/studio/`), pilotée par React via un petit store zustand.

```
client/                 site React (Vite)
  src/studio/           moteur 3D : local, agents, vie du studio (life.js), écrans animés, dialogues, voix,
                        visite à la première personne (firstperson.js)
  src/components/       interface React
  src/reception.js      chat de l'agent d'accueil (rendez-vous, questions)
  src/knowledge.js      réponses du chat : recherche dans le contenu du portfolio (BM25 + synonymes), sans IA externe
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

**Recommandations de lecture** : la liste est dans `profile.library.books` (titre, auteur, couleur de couverture, raison). La bibliothèque s'adapte au nombre de livres, et disparaît si la liste est vide.

**Formations** : `profile.education` (intitulé, établissement, pays, `period` facultatif, et `about`, ce que Paul dit quand on choisit la formation). Les phrases de Paul dans la salle de formation sont dans `profile.lines`.

**Simulations Forage** : `profile.simulations` (entreprise, intitulé, durée, `about`, `tasks` et `skills`). Elles s'affichent dans l'onglet « Forage » de l'écran et dans le panneau, où une simulation choisie déplie ses tâches. Elles restent présentées comme des simulations, pas comme des expériences professionnelles.

**Chat de l'accueil** : il n'a rien à configurer. Ses réponses viennent du contenu ci-dessus (projets, stacks, formations, Forage, livres, contact) : modifier `seed-data.js` suffit à les mettre à jour. Une question sans réponse peut être transmise à Paul par e-mail.

**Agent d'accueil** : `profile.reception` (apparence et nom de l'agent, phrases dites à l'arrivée).

**Ajouter une capture d'écran** : place l'image dans `client/public/images/` puis ajoute `images: ['/images/mon-projet.png']`.
Une image hébergée sur le site s'affiche aussi sur l'écran 3D du bureau. Une image venant d'un autre site (comme celle de MoveColis) s'affiche seulement dans le panneau.

## Mise en ligne

### Option Vercel (site + API serverless + base Neon)

Tout est déjà configuré dans `vercel.json` : le site compilé est servi par le CDN, l'API Express tourne dans une fonction (`api/index.mjs`, région Francfort), et chaque déploiement de production met à jour la base (`npm run db:setup`) avant de compiler.

1. Pousse le projet sur GitHub.
2. Sur [vercel.com](https://vercel.com) : **Add New → Project** → importe le dépôt. Ne change aucun réglage (Root Directory = racine du dépôt), puis **Deploy**.
   Ce premier déploiement échoue avec « DATABASE_URL manquant » : c'est normal, la base n'existe pas encore.
3. Dans le projet : **Storage → Create Database → Neon** (offre gratuite, région **Frankfurt / eu-central-1**), puis connecte-la au projet pour tous les environnements. Vercel ajoute `DATABASE_URL` tout seul (SSL inclus, `DATABASE_SSL` inutile).
4. **Settings → Environment Variables** (facultatif) : `GITHUB_TOKEN`, `RESEND_API_KEY`, `CONTACT_TO`, `MAIL_FROM`.
5. **Deployments → ⋯ → Redeploy**. Le schéma et le contenu sont créés pendant le build.
6. Nom de domaine : **Settings → Domains**.

Ensuite, chaque `git push` sur `main` redéploie le site et remet à jour le contenu de `seed-data.js`. Les autres branches donnent des aperçus sans toucher à la base.
Sur Vercel, la limite d'envoi du formulaire est comptée par instance de la fonction : elle reste utile contre les robots, mais elle est moins stricte qu'avec un serveur unique.

### Option A — Render

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
| `RESEND_API_KEY`, `CONTACT_TO`, `MAIL_FROM` | non | e-mail à chaque demande reçue (formulaire de contact et chat de l'accueil) |

## Recevoir les demandes par e-mail

Le chat de l'accueil et le formulaire de contact envoient un e-mail à `CONTACT_TO` grâce à [Resend](https://resend.com) :

1. crée un compte Resend **avec l'adresse qui doit recevoir les e-mails** (ici pauljuniornguessanyao@gmail.com) ;
2. crée une clé d'API (**API Keys → Create**, droit « Sending access ») ;
3. renseigne `RESEND_API_KEY` dans `.env` (et dans les variables d'environnement de l'hébergeur), avec `CONTACT_TO=pauljuniornguessanyao@gmail.com`.

Avec l'expéditeur de test `onboarding@resend.dev`, Resend n'envoie qu'à l'adresse du compte : c'est suffisant ici. Pour envoyer depuis ton propre domaine, vérifie-le dans Resend puis change `MAIL_FROM`.
Répondre à l'e-mail reçu écrit directement au visiteur.

## Lire les demandes reçues

Toutes les demandes sont aussi enregistrées en base, même sans Resend. `kind` vaut `message` (formulaire), `rdv` (rendez-vous) ou `info` (question) ; `details` contient les créneaux, le format et le téléphone d'un rendez-vous :

```sql
SELECT created_at, kind, name, email, message, details FROM contact_messages ORDER BY created_at DESC;
```

## API

- `GET /api/portfolio` : profil + projets publiés (étoiles et date GitHub rafraîchies toutes les 6 h, en arrière-plan)
- `POST /api/contact` : `{ name, email, message }`, ou depuis le chat de l'accueil `{ kind: 'rdv' | 'info', … }` (un rendez-vous ajoute `when`, `mode`, `phone`) ; 5 envois par IP toutes les 15 minutes
- `GET /api/health` : vérifie la connexion à la base
