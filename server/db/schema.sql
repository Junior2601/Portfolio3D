-- Schéma du portfolio. Relancer ce fichier est sans danger (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS profile (
  id         smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- une seule ligne
  data       jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id            serial PRIMARY KEY,
  slug          text UNIQUE NOT NULL,
  position      integer NOT NULL,                 -- ordre des bureaux
  title         text NOT NULL,
  short         text NOT NULL,                    -- nom court (dock, enseigne)
  icon          text NOT NULL DEFAULT '✨',
  tagline       text NOT NULL DEFAULT '',
  description   text NOT NULL DEFAULT '',
  stack         text[] NOT NULL DEFAULT '{}',
  status        text,
  github        text,                             -- 'pseudo/dépôt' : étoiles et date lues sur GitHub
  repo_url      text,
  demo_url      text,
  images        text[] NOT NULL DEFAULT '{}',
  screen        text NOT NULL DEFAULT 'code',     -- animation de l'écran du bureau
  file          text,
  contact       boolean NOT NULL DEFAULT false,   -- bureau qui propose de me contacter
  agent         jsonb NOT NULL,                   -- apparence et voix de l'agent
  lines         text[] NOT NULL,                  -- ce que dit l'agent
  published     boolean NOT NULL DEFAULT true,
  gh_stars      integer,
  gh_pushed_at  timestamptz,
  gh_checked_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_published_position_idx ON projects (position) WHERE published;

CREATE TABLE IF NOT EXISTS contact_messages (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  email      text NOT NULL,
  message    text NOT NULL,
  ip         text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
