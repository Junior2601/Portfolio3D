/* Réponses rapides du chat de l'accueil, façon RAG mais sans modèle de langage :
   le contenu du portfolio est découpé en fiches, la question est comparée aux fiches (BM25 + synonymes),
   et la réponse reprend la fiche trouvée en citant d'où elle vient. Tout se passe dans le navigateur. */

const STOP = new Set(`a ai as au aux avec c ca ce ces cet cette ci d dans de des du elle elles en es est et etc
  eu il ils j je l la le les leur leurs lui m ma me mes moi mon n ne nos notre nous on ont ou par pas peu peut peux
  plus pour qu que quel quelle quelles quels qui quoi s sa se ses si son sont sur t ta te tes toi ton tous tout
  tres tu un une vos votre vous y comment combien pourquoi est-ce dit dis fait faire fais avoir etre ete deja
  aussi bien alors donc mais car cela celui sait savoir connait connaitre peux-tu parle parler moi-meme
  the of and to in is what which who how does do`.split(/\s+/));

// Suffixes retirés pour rapprocher les formes d'un même mot (formations → form, données → donn)
const SUFFIXES = ['ements', 'ement', 'ations', 'ation', 'euses', 'euse', 'eurs', 'eur', 'ees', 'ee', 'es', 'er', 'e', 's', 'x'];
const stem = (t) => {
  if (/\d/.test(t)) return t;
  for (const s of SUFFIXES) if (t.endsWith(s) && t.length - s.length >= 4) return t.slice(0, -s.length);
  return t;
};

export const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/tableaux? de bord/g, 'dashboard').replace(/[’']/g, ' ').replace(/[^a-z0-9.+#]+/g, ' ').trim();
const words = (s) => norm(s).split(' ').map((w) => w.replace(/^\.+|\.+$/g, '')).filter((w) => w && !STOP.has(w));
const tokens = (s) => words(s).map(stem);

// Mots proches : une question qui en contient un cherche aussi les autres (poids réduit)
const SYN = Object.entries({
  ia: 'intelligence artificielle ai llm genai generative modele',
  llm: 'ia modele langage claude genai',
  rag: 'chatbot assistant source document',
  chatbot: 'rag assistant bot conversationnel',
  assistant: 'chatbot rag',
  agent: 'autonome veille',
  dashboard: 'visualisation tableau power bi',
  dataviz: 'visualisation tableau power bi',
  visualisation: 'dataviz tableau power bi',
  graphique: 'visualisation dataviz',
  web: 'site react node plateforme',
  site: 'web plateforme',
  argent: 'transfert paiement mobile money',
  paiement: 'transfert argent',
  colis: 'livraison expedition kilo voyageur',
  credit: 'score scoring risque defaut',
  finance: 'financier banque credit',
  rh: 'ressources humaines salarie conge',
  deploiement: 'docker production github actions vps nginx',
  devops: 'docker deploiement github actions nginx',
  data: 'donnee',
  donnee: 'data',
  avion: 'british airways maintenance aviation',
  aviation: 'british airways maintenance avion',
  conseil: 'deloitte bcg consulting',
  marketplace: 'vente achat boutique',
  prevision: 'serie temporelle stock',
  stock: 'prevision inventaire',
  diplome: 'formation licence master universite',
  etude: 'formation universite diplome',
  ecole: 'formation universite',
  job: 'emploi poste travail',
  emploi: 'job poste travail',
  livre: 'lecture bibliotheque',
}).reduce((m, [k, v]) => m.set(stem(k), tokens(v)), new Map());

const listFr = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} et ${a[a.length - 1]}`);
const sentences = (s, n) => (String(s).match(/[^.!?]+[.!?]+/g) ?? [s]).slice(0, n).join(' ').trim();

/* Les fiches : une par projet, formation, simulation, livre, plus le profil, les compétences, le contact… */
export function buildDocs({ profile, stations }) {
  const owner = profile.owner, docs = [];
  const at = (type) => stations.find((s) => s.type === type);
  const training = at('training'), library = at('library'), host = at('host');
  const add = (d) => docs.push({ names: [], keys: '', techs: [], ...d });

  add({
    id: 'bio', kind: 'profil', title: `Qui est ${owner}`, station: training?.idx, cite: 'Profil',
    text: `${owner} est ${profile.role}. ${profile.bio}`,
    keys: 'qui presente presentation profil parcours bio role metier personne',
  });
  add({
    id: 'skills', kind: 'profil', title: 'Compétences', station: training?.idx, cite: 'Profil · compétences',
    text: `Ses outils du quotidien : ${listFr(profile.skills ?? [])}.`, techs: profile.skills ?? [],
    keys: 'competence stack technologie techno outil langage maitrise expertise',
  });
  for (const e of profile.experience ?? []) {
    add({
      id: `exp-${e.org}`, kind: 'profil', title: `${e.role} chez ${e.org}`, names: [e.org], station: training?.idx, cite: 'Profil · expérience',
      text: `${e.current ? 'En ce moment, ' : ''}${owner} est ${e.role} chez ${e.org}${e.start ? ` (depuis ${e.start.toLowerCase()})` : ''}.`,
      keys: 'experience poste emploi travail actuellement entreprise stage job travaille boulot',
    });
  }
  const c = profile.contact ?? {};
  add({
    id: 'contact', kind: 'contact', title: 'Contact', cite: 'Profil · contact', action: 'contact',
    text: [`Pour joindre ${owner} :`, c.email && `✉️ ${c.email}`, c.whatsappLabel && `💬 WhatsApp : ${c.whatsappLabel}`, 'Je peux aussi lui transmettre ton message ou prendre un rendez-vous.'].filter(Boolean).join('\n'),
    keys: 'contact contacter joindre email mail adresse telephone whatsapp numero ecrire appeler coordonnees',
  });
  add({
    id: 'rdv', kind: 'contact', title: 'Rendez-vous', cite: 'Accueil', action: 'rdv', station: host?.idx,
    text: `Je prends les rendez-vous de ${owner} : en visio, par téléphone ou sur WhatsApp. Tu veux qu'on en fixe un ?`,
    keys: 'rendez vous rdv rencontrer rencontre meeting entretien appel visio reunion echanger',
  });
  for (const co of training?.project.courses ?? []) {
    const sim = co.group === 'sim';
    add({
      id: `course-${co.title}`, kind: sim ? 'simulation' : 'formation', title: co.title, station: training?.idx,
      names: sim ? [co.company, co.company.split(' ')[0]] : [co.school, co.title], techs: co.skills ?? [],
      cite: sim ? 'Salle de formation · Forage' : 'Salle de formation',
      text: sim
        ? `${co.company} · ${co.role} : une simulation de poste sur Forage (${co.duration}). ${co.about}\n\nAu programme :\n${co.tasks.map((t, k) => `${k + 1}. ${t}`).join('\n')}`
        : `${co.title}, ${co.school}${co.place ? ` (${co.place})` : ''}. ${co.about ?? ''}`.trim(),
      keys: `${sim ? 'forage simulation job virtuelle mise situation' : 'formation diplome etude universite ecole cursus'} ${co.place ?? ''} ${(co.skills ?? []).join(' ')}`,
    });
  }
  for (const st of stations.filter((s) => s.type === 'desk')) {
    const p = st.project;
    add({
      id: `desk-${p.slug}`, kind: p.contact ? 'contact' : 'projet', title: p.title, station: st.idx,
      names: [p.title, p.short, p.slug.replace(/-/g, ' '), st.look.name].filter((n) => n && n.length > 2),
      techs: p.contact ? [] : p.stack ?? [], demo: p.demo, cite: `Bureau ${st.num} · ${p.short}`,
      text: p.contact
        ? `${p.description} Je peux transmettre ta proposition à ${owner}, ou prendre un rendez-vous.`
        : `${p.title} : ${p.tagline}\n\n${sentences(p.description, 2)}\n\nStack : ${(p.stack ?? []).join(', ')}.${p.status ? ` Statut : ${p.status}.` : ''}`,
      keys: `${p.description} ${(p.lines ?? []).join(' ')} ${p.contact ? 'disponible dispo mission freelance stage alternance emploi recrute recrutement embauche collaboration cdi' : 'projet'}`,
    });
  }
  const books = library?.project.books ?? [];
  if (books.length) {
    add({
      id: 'library', kind: 'livres', title: 'Bibliothèque', station: library.idx, cite: 'Bibliothèque',
      text: `${owner} recommande ${books.length} livres :\n${books.map((b) => `📖 ${b.title}, de ${b.author}`).join('\n')}\n\n${library.look.name} les présente à la bibliothèque.`,
      keys: 'livre livres lecture lire recommande recommandation bibliotheque conseil bouquin',
    });
    for (const b of books) {
      add({
        id: `book-${b.title}`, kind: 'livre', title: b.title, names: [b.title, b.author], station: library.idx, cite: 'Bibliothèque',
        text: `« ${b.title} », de ${b.author} : ${b.why}`, keys: 'livre lecture',
      });
    }
  }
  add({
    id: 'studio', kind: 'profil', title: 'Ce portfolio', cite: 'Le studio',
    text: `Ce portfolio est un open-space en 3D : chaque bureau présente un projet de ${owner}, et un agent t'y attend pour te l'expliquer. Il est construit avec React, Three.js, Node.js / Express et PostgreSQL.`,
    keys: 'portfolio site studio 3d construit three open space bureau visite',
  });
  return docs;
}

/* Index BM25 : le titre et les noms comptent plus que le corps du texte */
export function buildIndex(docs) {
  const N = docs.length, df = new Map();
  const rows = docs.map((d) => {
    const toks = [...tokens(d.title), ...tokens(d.title), ...tokens(d.names.join(' ')), ...tokens(d.names.join(' ')), ...tokens(d.keys), ...tokens(d.text), ...tokens(d.techs.join(' '))];
    const tf = new Map();
    for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    return { d, tf, len: toks.length };
  });
  const avg = rows.reduce((s, r) => s + r.len, 0) / Math.max(1, N);
  const idf = (t) => Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
  const names = docs.flatMap((d) => d.names.map((n) => ({ d, n: norm(n) }))).filter(({ n }) => n.length > 2).sort((a, b) => b.n.length - a.n.length);
  // Technologies citées dans les stacks, avec leurs variantes courtes (node.js → node)
  const techs = new Map();
  for (const d of docs) for (const label of d.techs) {
    const t = norm(label);
    if (t.length < 2) continue;
    for (const v of [t, t.replace(/\.js$/, '')]) if (!techs.has(v)) techs.set(v, t);
  }
  return {
    docs, names, techs,
    search(q, filter = () => true) {
      const base = tokens(q), weights = new Map();
      for (const t of base) weights.set(t, 1);
      for (const t of base) for (const s of SYN.get(t) ?? []) if (!weights.has(s)) weights.set(s, 0.45);
      return rows.filter((r) => filter(r.d)).map((r) => {
        let score = 0, hits = 0;
        for (const [t, w] of weights) {
          const f = r.tf.get(t);
          if (!f) continue;
          if (w === 1) hits++;
          score += w * idf(t) * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * r.len / avg));
        }
        return { d: r.d, score, hits };
      }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
    },
  };
}

const has = (q, phrase) => new RegExp(`(^| )${phrase.replace(/[.+#]/g, '\\$&')}( |$)`).test(q);
// Entrées de « stack » qui ne sont pas des technologies : pas de réponse « Oui, X fait partie de son parcours »
const NOT_TECH = /^(e mail|e mail html|bientot|travail en equipe|ouvert aux missions|communication|veille .*|taches planifiees|redaction de rapport)$/;
const CONTACT = /(contacter|joindre|coordonnee|numero|telephone|whatsapp|github|linkedin|(son|ton|votre|ses|l|une) (adresse )?e ?mail|ecrire a|appeler)/;
const MONEY = /\b(salaire|remuneration|pretentions?|tarifs?|tjm|taux journalier|combien (il )?(coute|prend|facture))\b/;
const RDV = /(rendez vous|\brdv\b|rencontrer|un appel|entretien|visio|reunion)/;
const WHO = /(qui est|c est qui|qui es|presente|presentation|parle moi de lui|son profil|en bref)/;
const AGGREGATE = [
  ['simulations', /\b(forage|simulations?)\b/],
  ['formation', /\b(formations?|diplomes?|etud\w*|cursus|universite|ecoles?)\b/],
  ['skills', /\b(competences?|stack|technos?|technologies?|outils|langages?|skills)\b/],
  ['projects', /\b(projets?|realisations?|travaux)\b/],
];

const KINDS = { projet: /\bprojets?\b/, simulation: /\bsimulations?\b/, formation: /\bformations?\b/, livre: /\blivres?\b/ };

/* Répond à une question. Renvoie { text, cite?, docs?, action? }, { faq } pour une vue d'ensemble, ou { miss: true } */
export function answer(index, question, owner = '') {
  let q = norm(question);
  if (!q) return { miss: true };
  const n = q.split(' ').length;
  if (/^(bonjour|bonsoir|salut|hello|hey|coucou|yo)\b/.test(q) && n <= 3) return { text: 'Bonjour ! 😊 Pose-moi une question, ou choisis une option ci-dessous.' };
  if (/^(merci|super|top|parfait|genial|ok|d accord|cool)\b/.test(q) && n <= 4) return { text: 'Avec plaisir ! Autre chose ?' };
  if (/^(au revoir|bye|a bientot|bonne journee|bonne soiree)\b/.test(q)) return { text: 'À bientôt ! Bonne visite du studio 👋' };
  const doc = (id) => index.docs.find((d) => d.id === id);

  if (MONEY.test(q)) return { text: `Pour parler rémunération ou tarifs, le mieux est d'en discuter directement avec ${owner}. Je lui transmets ta question, ou on fixe un rendez-vous ?`, action: 'rdv', ask: true };
  if (CONTACT.test(q)) return one(doc('contact'));
  if (RDV.test(q)) return one(doc('rdv'));

  // Le prénom apparaît dans presque toutes les questions : il ne doit pas orienter la recherche
  const me = norm(owner);
  if (me) q = q.replace(new RegExp(`(^| )${me}( |$)`, 'g'), ' ').replace(/\s+/g, ' ').trim();
  if (WHO.test(q) || !tokens(q).length) return one(doc('bio'));

  // 1. Un projet, une entreprise, une école ou un livre cité par son nom
  const named = index.names.filter(({ n: name }) => has(q, name));
  if (named.length) {
    const ids = new Set(named.map(({ d }) => d.id));
    const ranked = index.search(q, (d) => ids.has(d.id));
    const top = ranked[0];
    const close = ranked.filter((r) => top && r.score >= top.score * 0.8 && r.d.kind === top.d.kind);
    return close.length > 1 && ids.size > 1 ? many(close.map((r) => r.d)) : one(top?.d ?? named[0].d);
  }

  // 2. Une ou plusieurs technologies : où apparaissent-elles dans son parcours ? (sauf « un livre sur Python ? »)
  const found = [];
  if (!KINDS.livre.test(q)) for (const [v, t] of [...index.techs].sort((a, b) => b[0].length - a[0].length)) {
    if (!NOT_TECH.test(t) && !found.includes(t) && has(q, v) && !found.some((f) => f.includes(v))) found.push(t);
  }
  if (found.length) {
    const label = (t) => index.docs.flatMap((d) => d.techs).find((x) => norm(x) === t);
    const names = found.map(label);
    const daily = found.filter((t) => doc('skills').techs.some((x) => norm(x) === t));
    const where = index.docs.filter((d) => d.id !== 'skills' && d.techs.some((x) => found.includes(norm(x))));
    const lines = where.slice(0, 5).map((d) => `• ${d.title}${found.length > 1 ? ` (${d.techs.filter((x) => found.includes(norm(x))).join(', ')})` : ''}`);
    const many = names.length > 1;
    return {
      text: [
        `Oui, ${listFr(names)} ${many ? 'font' : 'fait'} partie du parcours de ${owner}.${daily.length ? ` ${daily.length === found.length ? (many ? 'Ce sont' : 'C’est') : `${listFr(daily.map(label))} :`} ${daily.length > 1 ? 'de ses outils' : 'un de ses outils'} du quotidien.` : ''}`,
        lines.length ? `On ${many ? 'les' : 'le'} retrouve dans :\n${lines.join('\n')}` : '',
      ].filter(Boolean).join('\n\n'),
      cite: where.length ? listFr([...new Set(where.slice(0, 3).map((d) => d.cite))]) : 'Profil · compétences',
      docs: where.slice(0, 3),
    };
  }

  // 3. Une vue d'ensemble (« ses projets », « sa formation »…), si la question ne précise rien d'autre
  for (const [faq, re] of AGGREGATE) {
    if (re.test(q) && !tokens(q.replace(new RegExp(re.source, 'g'), ' ')).length) return { faq };
  }

  // 4. Recherche dans les fiches, limitée à un type si la question le précise (« des projets d'IA ? »)
  const kind = Object.entries(KINDS).find(([, re]) => re.test(q))?.[0];
  let ranked = kind ? index.search(q.replace(new RegExp(KINDS[kind].source, 'g'), ' '), (d) => d.kind === kind) : [];
  const typed = ranked.length > 0; // le type demandé est déjà connu : on peut être moins exigeant
  if (!typed) ranked = index.search(q);
  const top = ranked[0];
  if (globalThis.RAG_DEBUG) console.log('   ', ranked.slice(0, 3).map((r) => `${r.d.id}:${r.score.toFixed(2)}/${r.hits}`).join('  '));
  // Seuil de confiance : sans mot de la question retrouvé tel quel, seuls les synonymes très nets comptent
  if (!top || top.score < (typed ? 1 : top.hits ? 1.8 : 3)) return { miss: true };
  const close = ranked.filter((r) => r.score >= top.score * (typed ? 0.45 : 0.62) && r.d.kind === top.d.kind).slice(0, 4);
  if (close.length > 1 && ['projet', 'simulation', 'formation', 'livre'].includes(top.d.kind)) return many(close.map((r) => r.d));
  return one(top.d);
}

function one(d) {
  return { text: d.text, cite: d.cite, docs: [d], action: d.action };
}

function many(docs) {
  const intro = { projet: 'Plusieurs projets correspondent :', simulation: 'Plusieurs simulations Forage correspondent :', formation: 'Côté formation :', livre: 'Plusieurs livres correspondent :' }[docs[0].kind] ?? 'Voici ce que j’ai trouvé :';
  const lines = docs.map((d) => `• ${d.title}${d.kind === 'projet' ? ` : ${d.text.split('\n')[0].split(' : ').slice(1).join(' : ')}` : ''}`);
  return { text: `${intro}\n\n${lines.join('\n')}`, cite: listFr([...new Set(docs.map((d) => d.cite))].slice(0, 3)), docs };
}
