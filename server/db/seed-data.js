// Contenu du portfolio. Modifie ce fichier puis lance `npm run db:seed` (le déploiement le fait aussi).
// Couleurs en hexadécimal (0xRRGGBB). Coiffures : short | long | bun | bob | cap | curly.
// Accessoires : none | headset | glasses | tie | badge. Voix : g = 'f' ou 'm' (null = première voix française).
// Écrans animés : chat | docs | chart | mail | news | code | hire | transfer | flight | shop | score.

const OWNER = 'Paul';

export const profile = {
  owner: OWNER,
  role: 'Data Engineer · IA & Data',
  pitch: 'je construis des plateformes web, des assistants IA et des projets data.',
  bio: "Je construis des plateformes web en production (MoveCash, MoveColis), des assistants IA qui citent leurs sources, des agents de veille autonomes et des projets data pour l'inclusion financière en Côte d'Ivoire.",
  skills: ['Python', 'SQL', 'PostgreSQL', 'Node.js', 'React', 'Docker', 'LangChain', 'Claude', 'pandas', 'scikit-learn'],
  experience: [
    { role: 'Data Engineer · stage', org: 'Progistack', start: 'Octobre 2026', current: true },
  ],
  github: 'Junior2601',
  contact: {
    email: 'pauljuniornguessanyao@gmail.com',
    whatsapp: '2250594301754',            // indicatif + numéro, sans « + » ni espaces (format wa.me)
    whatsappLabel: '+225 05 94 30 17 54',
  },
  look: { skin: 0x8d5a3c, hair: 0x15100d, hairStyle: 'curly', shirt: 0x26233d, pants: 0x3a3f58, acc: 'none', g: null, accent: 0xff3d8b },
  // Ce que je dis dans la salle de formation (au fond de la bibliothèque)
  lines: [
    `Salut, moi c'est ${OWNER} ! Bienvenue dans ma salle de formation.`,
    "J'ai commencé par une licence MIAGE à l'Université Polytechnique de Bingerville, en Côte d'Ivoire.",
    "Ensuite, un master en Machine Learning et Big Data à l'Université d'État de Rostov, en Russie.",
    "Et un stage de formation sur les LLM chez Sberbank. Aujourd'hui, je suis Data Engineer en stage chez Progistack.",
    "Clique sur une formation pour en savoir plus. Et pour me rencontrer, Bienvenue prend mes rendez-vous à l'accueil !",
  ],
  // Mes formations : affichées sur l'écran de la salle de formation. `about` = ce que je dis quand on en choisit une.
  // period (facultatif) : par exemple '2019 – 2022'.
  education: [
    {
      title: 'Licence MIAGE', school: 'Université Polytechnique de Bingerville', place: "Côte d'Ivoire", icon: '🎓', period: '',
      about: "Ma base : l'informatique appliquée à la gestion des entreprises. Développement, bases de données et systèmes d'information.",
    },
    {
      title: 'Master Machine Learning et Big Data', school: "Université d'État de Rostov", place: 'Russie', icon: '🎓', period: '',
      about: "Là, je me suis spécialisé en apprentissage automatique et en traitement de grands volumes de données.",
    },
    {
      title: 'Stage de formation LLM', school: 'Sberbank', place: 'Russie', icon: '🧠', period: '',
      about: 'Un stage de formation consacré aux grands modèles de langage, les LLM, au sein de la plus grande banque de Russie.',
    },
  ],
  // L'agent Bienvenue, à l'accueil : il parle à l'arrivée, puis prend les rendez-vous et les questions dans le chat.
  // Chaque demande est enregistrée en base et envoyée par e-mail (voir RESEND_API_KEY et CONTACT_TO dans .env).
  reception: {
    agent: { name: 'Bienvenue', role: "Agent d'accueil", shirt: 0xd6457a, pants: 0x2d2a44, skin: 0x6b4226, hair: 0x120c0a, hairStyle: 'long', acc: 'headset', g: 'f', blip: 600 },
    lines: [
      "Bienvenue ! Et c'est aussi mon prénom : moi, c'est Bienvenue, l'agent d'accueil du studio.",
      `Derrière moi, la bibliothèque et la salle de formation de ${OWNER}. À côté, l'espace cowork : chaque bureau y présente un de ses projets.`,
      `Tu veux un rendez-vous avec ${OWNER}, ou tu as une question ? Écris-moi dans le chat : je lui transmets tout par e-mail.`,
      'Sinon, je te propose une visite guidée, ou tu explores à ton rythme ?',
    ],
  },
  // La bibliothèque. ⚠️ Liste de départ à remplacer par tes vraies recommandations.
  // Chaque livre apparaît sur l'étagère (color = sa couverture) et Zoé lit `why` à voix haute.
  library: {
    tagline: 'Les livres que je recommande.',
    description: 'Choisis un livre : il sort de l’étagère et Zoé te dit pourquoi il est là.',
    agent: { name: 'Zoé', role: 'Bibliothécaire', shirt: 0x6a7bd9, pants: 0x2d2a44, skin: 0xa86b45, hair: 0x2a1a12, hairStyle: 'bun', acc: 'glasses', g: 'f', blip: 470 },
    lines: [
      'Bienvenue à la bibliothèque ! Moi c’est Zoé.',
      `Ici, je garde les livres que ${OWNER} recommande.`,
      'Choisis-en un dans la liste, ou clique directement sur l’étagère. Il viendra jusqu’à toi !',
    ],
    books: [
      { title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', color: 0x8b4a5e, why: 'La référence pour comprendre les bases de données, la réplication et les systèmes distribués.' },
      { title: 'Fundamentals of Data Engineering', author: 'Joe Reis et Matt Housley', color: 0x2f7f8a, why: 'Une vue d’ensemble du cycle de vie de la donnée, de l’ingestion jusqu’à son utilisation.' },
      { title: 'AI Engineering', author: 'Chip Huyen', color: 0x6a5ac4, why: 'Comment construire de vraies applications sur des modèles de langage : RAG, agents et évaluation.' },
      { title: 'Python for Data Analysis', author: 'Wes McKinney', color: 0x2f8f5b, why: 'pandas expliqué par son créateur, avec des manipulations de données concrètes.' },
      { title: 'The Pragmatic Programmer', author: 'Andrew Hunt et David Thomas', color: 0xc47a2c, why: 'Des habitudes simples pour mieux écrire et maintenir du code, projet après projet.' },
      { title: 'The Lean Startup', author: 'Eric Ries', color: 0xc2453d, why: 'Tester une idée vite et à petit prix avant d’y investir, en apprenant de ses utilisateurs.' },
    ],
  },
};

const LOOKS = {
  kali: { name: 'Kali', role: 'Support client', shirt: 0xff7a59, pants: 0x2f3a56, skin: 0xf0c4a0, hair: 0x2b1b12, hairStyle: 'bun', acc: 'headset', g: 'f', blip: 560 },
  rhea: { name: 'Rhéa', role: 'Assistante RH', shirt: 0x8b6cf0, pants: 0x3a3358, skin: 0xb9784f, hair: 0x1c1310, hairStyle: 'long', acc: 'glasses', g: 'f', blip: 500 },
  hugo: { name: 'Hugo', role: 'Data scientist', shirt: 0x2fb39f, pants: 0x2b3a4a, skin: 0xe2b08a, hair: 0x4a2e1c, hairStyle: 'short', acc: 'glasses', g: 'm', blip: 300 },
  biz: { name: 'Biz', role: 'Chasseur de business', shirt: 0xf2b134, pants: 0x3b3b46, skin: 0x6e4428, hair: 0x120d0a, cap: 0x2a5bd7, hairStyle: 'cap', acc: 'none', g: 'm', blip: 380 },
  rex: { name: 'Rex', role: 'Reporter tech', shirt: 0x4a8fe0, pants: 0x262f44, skin: 0xf2cfae, hair: 0xb5651d, hairStyle: 'short', acc: 'tie', g: 'm', blip: 340 },
  lina: { name: 'Lina', role: 'Ingénieure web', shirt: 0x0fb5c9, pants: 0x2d3142, skin: 0xd9a27c, hair: 0x6a2c1a, hairStyle: 'bob', acc: 'none', g: 'f', blip: 520 },
  nova: { name: 'Nova', role: 'Recrutement', shirt: 0xff4f9a, pants: 0x2d2a44, skin: 0x9a623d, hair: 0xf4d35e, hairStyle: 'bob', acc: 'badge', g: 'f', blip: 620 },
  awa: { name: 'Awa', role: 'Opératrice transferts', shirt: 0x1faa59, pants: 0x263238, skin: 0x5c3a24, hair: 0x0d0907, hairStyle: 'bun', acc: 'headset', g: 'f', blip: 540 },
  kofi: { name: 'Kofi', role: 'Logisticien', shirt: 0xa8754b, pants: 0x2f3a56, skin: 0x7a4a2e, hair: 0x0f0b09, cap: 0xff8c1a, hairStyle: 'cap', acc: 'none', g: 'm', blip: 330 },
  amara: { name: 'Amara', role: 'Community manager', shirt: 0xd94848, pants: 0x2d2a44, skin: 0x8a5634, hair: 0x140e0b, hairStyle: 'long', acc: 'none', g: 'f', blip: 510 },
  issa: { name: 'Issa', role: 'Data scientist', shirt: 0xff8c1a, pants: 0x2b3a4a, skin: 0x6b4226, hair: 0x0f0b09, hairStyle: 'short', acc: 'glasses', g: 'm', blip: 310 },
};

// Les bureaux, dans l'ordre. github = 'pseudo/dépôt' : le serveur lit la date de mise à jour et les étoiles.
export const projects = [
  {
    slug: 'movecash', title: 'MoveCash', short: 'MoveCash', icon: '💸', agent: LOOKS.awa, screen: 'transfer', file: 'movecash.site',
    github: 'Junior2601/Cashmove', repo: 'https://github.com/Junior2601/Cashmove', demo: 'https://movecash.site', images: [],
    tagline: 'Transferts d’argent rapides entre la Russie et l’Afrique, suivis en direct.',
    description: "Plateforme de transfert d'argent entre la Russie et l'Afrique. Chaque transfert se suit en temps réel, avec notifications push et e-mails. Application web installable (PWA) : front React, API Node.js / Express, base PostgreSQL et temps réel avec Socket.io.",
    stack: ['React', 'Tailwind', 'Node.js', 'Express', 'PostgreSQL', 'Socket.io', 'PWA'], status: 'En production',
    lines: [
      "Salut, moi c'est Awa ! Je m'occupe de MoveCash, une plateforme de transfert d'argent.",
      "On envoie de l'argent entre la Russie et l'Afrique, rapidement, et chaque transfert se suit en direct.",
      'Sous le capot : React côté client, Node.js et PostgreSQL côté serveur, et Socket.io pour le temps réel.',
      "Le site est en ligne sur movecash.site. Va voir, il s'installe même comme une appli !",
    ],
  },
  {
    slug: 'movecolis', title: 'MoveColis', short: 'MoveColis', icon: '📦', agent: LOOKS.kofi, screen: 'flight', file: 'movecolis.com',
    github: 'Junior2601/ColisMove', repo: 'https://github.com/Junior2601/ColisMove', demo: 'https://movecolis.com', images: ['https://movecolis.com/brand/og-image.png'],
    tagline: 'Réserve des kilos sur les vols des voyageurs et suis tes colis.',
    description: "Plateforme qui met en relation voyageurs et expéditeurs : on réserve des kilos libres dans les bagages d'un voyageur, puis on suit son colis. Mise en production complète : conteneurs Docker, pipeline GitHub Actions avec retour arrière, VPS avec Nginx et HTTPS, PostgreSQL managé et sauvegardes quotidiennes.",
    stack: ['React', 'Node.js', 'PostgreSQL', 'Socket.io', 'Docker', 'GitHub Actions', 'Nginx'], status: 'En production',
    lines: [
      "Kofi, logistique ! Ici, c'est MoveColis.",
      'Le principe : des voyageurs ont des kilos libres dans leurs valises, et toi tu as un colis à envoyer.',
      "Tu réserves tes kilos sur leur vol, puis tu suis ton colis jusqu'à l'arrivée.",
      'En coulisses : Docker, GitHub Actions et un VPS. Chaque push sur main part en production, avec retour arrière possible.',
    ],
  },
  {
    slug: 'afrobridge', title: 'Afrobridge', short: 'Afrobridge', icon: '🌍', agent: LOOKS.amara, screen: 'shop', file: 'afrobridge/api',
    github: 'Junior2601/Afrobridge', repo: 'https://github.com/Junior2601/Afrobridge', demo: '', images: [],
    tagline: 'La marketplace des Africains vivant en Russie.',
    description: "Plateforme qui permet aux Africains vivant en Russie d'acheter et de vendre des articles entre eux. Projet mené en équipe, avec une API Node.js / Express sécurisée (JWT, Helmet) sur une base PostgreSQL.",
    stack: ['Node.js', 'Express', 'PostgreSQL', 'JWT', 'Travail en équipe'], status: 'Projet collaboratif',
    lines: [
      "Bienvenue sur Afrobridge ! Moi c'est Amara.",
      "Quand on est Africain et qu'on vit en Russie, trouver ou revendre un article, ce n'est pas toujours simple.",
      "Afrobridge, c'est une marketplace pensée pour cette communauté : on achète et on vend entre nous.",
      `C'est un projet d'équipe, et ${OWNER} fait partie des collaborateurs.`,
    ],
  },
  {
    // À compléter quand le dépôt sera public : description, stack, lien
    slug: 'wadi-app', title: 'Wadi-App', short: 'Wadi-App', icon: '📱', agent: LOOKS.lina, screen: 'code', file: 'wadi-app',
    github: '', repo: '', demo: '', images: [],
    tagline: 'Une application en cours de développement.',
    description: "Le dépôt n'est pas encore public : la présentation détaillée de Wadi-App arrive bientôt.",
    stack: ['Bientôt'], status: 'Bientôt',
    lines: [
      "Salut, moi c'est Lina, je m'occupe de Wadi-App.",
      "Le dépôt n'est pas encore public, alors je garde encore quelques secrets…",
      'Repasse bientôt : la présentation complète arrive !',
    ],
  },
  {
    slug: 'ivoscore', title: 'IvoScore', short: 'IvoScore', icon: '📊', agent: LOOKS.issa, screen: 'score', file: '01_exploration.ipynb',
    github: 'Junior2601/ivoscore', repo: 'https://github.com/Junior2601/ivoscore', demo: '', images: [],
    tagline: 'Un score de crédit alternatif à partir des données mobile money.',
    description: "Credit scoring alternatif pour l'inclusion financière en Côte d'Ivoire : estimer le risque de défaut de personnes sans historique bancaire à partir de leur comportement mobile money (Orange Money, Wave, MTN MoMo, Moov Money). Première étape : un jeu de données synthétique de 10 000 clients au comportement réaliste, puis l'exploration des données.",
    stack: ['Python', 'pandas', 'scikit-learn', 'Jupyter', 'Faker'], status: 'En cours',
    lines: [
      'Issa, data scientist. Ici, on travaille sur IvoScore.',
      "En Côte d'Ivoire, beaucoup de gens n'ont pas d'historique bancaire… mais ils utilisent le mobile money tous les jours.",
      "L'idée : estimer le risque de crédit à partir de ce comportement. Régularité des revenus, recharges, ancienneté…",
      'On a généré 10 000 clients synthétiques réalistes pour commencer. Prochaine étape : le modèle !',
    ],
  },
  {
    slug: 'kalia-support', title: 'Kalia Support', short: 'Support RAG', icon: '💬', agent: LOOKS.kali, screen: 'chat', file: 'support_bot.py',
    github: '', repo: '', demo: '', images: [],
    tagline: 'Un chatbot RAG qui répond aux clients 24 h/24, sources à l’appui.',
    description: "Assistant de support pour Kalia, une marketplace avec transfert d'argent (fictive) en France, au Sénégal et en Côte d'Ivoire. Il répond en français à partir de la FAQ, des CGU, des politiques de livraison et des grilles tarifaires, cite la politique utilisée, filtre par pays et type de compte, et transfère à un humain quand il n'a pas de réponse fiable.",
    stack: ['Python', 'LangChain', 'ChromaDB', 'Claude', 'RAG'], status: 'Projet d’apprentissage',
    lines: [
      "Salut ! Moi c'est Kali, je réponds aux clients de Kalia, jour et nuit.",
      'Une question sur un remboursement Wave ? Je fouille la FAQ, les CGU et les grilles tarifaires…',
      '…puis je réponds en citant la politique utilisée. Pas de devinette !',
      "Et si je ne suis pas sûre de moi, je passe la main à un humain. C'est ça, un support fiable.",
    ],
  },
  {
    slug: 'rhea', title: 'Rhéa — assistante RH', short: 'Assistante RH', icon: '🗂️', agent: LOOKS.rhea, screen: 'docs', file: 'rhea/chat.py',
    github: '', repo: '', demo: '', images: [],
    tagline: 'L’assistante RH qui lit les PDF à ta place, et respecte les droits d’accès.',
    description: "Rhéa répond aux questions des 162 salariés de Vélorance (entreprise fictive) à partir des documents RH officiels, en PDF et DOCX. Elle cite ses sources, applique les droits d'accès salarié, manager et RH, et dit clairement quand elle ne sait pas. Code testé avec pytest, sans jamais appeler le vrai LLM.",
    stack: ['LangChain 1.x', 'Claude', 'uv', 'pytest', 'Ruff'], status: 'En cours',
    lines: [
      "Bonjour, je suis Rhéa, l'assistante RH de Vélorance.",
      'Congés, mutuelle, télétravail : je réponds à partir des documents officiels, PDF et Word, en citant mes sources.',
      "Et je respecte les droits d'accès : un salarié ne voit pas ce que voit la RH.",
      'Mes tests tournent sans jamais appeler le vrai modèle. Propre, non ?',
    ],
  },
  {
    slug: 'hydrelis', title: 'Prévision de stock — Hydrelis', short: 'Prévision stock', icon: '📈', agent: LOOKS.hugo, screen: 'chart', file: 'prevision.ipynb',
    github: '', repo: '', demo: '', images: [],
    tagline: 'Prévoir les besoins en composants pour en finir avec les ruptures.',
    description: "Mission d'IA prédictive pour une usine fictive de pompes à eau (environ 250 pompes par jour ouvré). Objectif : remplacer des points de commande fixés « à l'expérience » par une prévision des besoins fondée sur les séries temporelles, en tenant compte de la montée en puissance de la nouvelle gamme Solaire.",
    stack: ['Python', 'pandas', 'Séries temporelles', 'Jupyter', 'uv'], status: 'En cours',
    lines: [
      "Ici Hugo, data scientist à l'usine Hydrelis.",
      "On fabrique environ 250 pompes à eau par jour. Un composant en rupture, et toute la chaîne s'arrête.",
      'Mon job : prévoir les besoins grâce aux séries temporelles, saisonnalité et nouvelle gamme Solaire comprises.',
      "Regarde l'écran : la courbe en pointillés, c'est la prévision. Le projet avance, phase par phase !",
    ],
  },
  {
    slug: 'paulbusiness', title: 'PaulBusiness', short: 'Veille business', icon: '💡', agent: LOOKS.biz, screen: 'mail', file: 'PAULBUSINESS.md',
    github: '', repo: '', demo: '', images: [],
    tagline: 'Un agent IA qui déniche chaque matin des business à petit budget.',
    description: "Agent de veille autonome : chaque jour à 9 h, il parcourt le web, sélectionne des idées de business rentables sans gros investissement (environ 70 % en Côte d'Ivoire, 30 % ailleurs ou en ligne), les note sur 10, écarte les doublons grâce à son historique et envoie un e-mail structuré.",
    stack: ['Claude', 'Agents IA', 'Veille web', 'Tâches planifiées', 'E-mail'], status: 'En production',
    lines: [
      "Yo ! Moi c'est Biz. Chaque matin à 9 h, je pars à la chasse aux bonnes idées.",
      "Je fouille le web pour trouver des business rentables sans gros budget, surtout en Côte d'Ivoire.",
      'Je note chaque idée sur 10 : en dessous de 7, poubelle. Et je garde un historique pour ne jamais me répéter.',
      "Résultat : un mail clair, prêt à l'action, avant même le premier café.",
    ],
  },
  {
    slug: 'reporteur', title: 'Reporteur', short: 'Veille tech', icon: '📰', agent: LOOKS.rex, screen: 'news', file: 'reporteur.html',
    github: '', repo: '', demo: '', images: [],
    tagline: 'Un journaliste tech personnel, spécialisé IA.',
    description: "Agent de veille technologique : il scrute le web, sélectionne les actualités tech les plus importantes, l'IA en priorité, et les envoie dans un e-mail HTML clair et structuré, en français, avec un historique pour éviter les redites.",
    stack: ['Claude', 'Agents IA', 'Veille tech', 'E-mail HTML'], status: 'En production',
    lines: [
      "Rex, reporter tech. Je lis l'actu pour que tu n'aies pas à le faire.",
      "Nouveaux modèles, frameworks d'agents, outils : je trie, je résume, je vérifie.",
      "Et j'envoie le tout dans un e-mail HTML bien rangé, en français. Bonne lecture !",
    ],
  },
  {
    slug: 'bureau-libre', title: 'Ton projet ici ?', short: 'Bureau libre', icon: '🚀', agent: LOOKS.nova, screen: 'hire', file: 'TON_PROJET.md', contact: true,
    github: '', repo: '', demo: '', images: [],
    tagline: 'Ce bureau attend le prochain projet.',
    description: "Une idée, une mission freelance, un stage ou une alternance ? Ce bureau est encore libre, et l'agent qui l'occupera dépend peut-être de toi.",
    stack: ['Ouvert aux missions', 'IA', 'Data', 'Agents'], status: 'Disponible',
    lines: [
      'Oh, un visiteur ! Je suis Nova. Ce bureau est encore vide…',
      `Il attend le prochain projet de ${OWNER}. Peut-être le tien ?`,
      'Mission, stage, collaboration : écris-lui sur WhatsApp ou par e-mail, je transmets !',
    ],
  },
];
