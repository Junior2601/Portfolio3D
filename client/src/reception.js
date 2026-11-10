import { create } from 'zustand';
import { useStudio } from './store.js';
import { sendContact } from './api.js';
import { focusStation, nudgeHost, showCourses, startTour } from './controller.js';
import { answer, buildDocs, buildIndex } from './knowledge.js';
import { reduceMotion } from './studio/utils.js';

/* Le chat de l'accueil : l'agent Bienvenue répond aux questions à partir du contenu du portfolio (knowledge.js),
   prend un rendez-vous ou un message, récapitule, puis envoie la demande au serveur (enregistrée en base et transmise par e-mail) */
export const useChat = create(() => ({
  messages: [], // { id, from: 'bot' | 'me', text, recap?: [[libellé, valeur], ...], cite?: 'source de la réponse' }
  quick: [], // réponses proposées : { label, cmd }, { label, text } ou { label, href } (lien externe)
  step: null, // ce que l'agent attend : une clé de ASK, ou null (choisir une réponse proposée)
  typing: false,
  form: {},
}));

const set = useChat.setState, get = useChat.getState;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[\d\s().-]{8,20}$/;
let uid = 0, run = 0; // run : numéro de la conversation en cours, pour abandonner une réponse dépassée
let kb = null, lastQuestion = ''; // index des fiches du portfolio, construit à la première question

const studio = () => {
  const { profile, stations } = useStudio.getState();
  return { profile, owner: profile.owner, host: stations[0]?.look ?? { name: 'Bienvenue' }, stations };
};
const cmd = (label, c) => ({ label, cmd: c });
const say = (label) => ({ label, text: label });
const RDV = cmd('📅 Prendre rendez-vous', 'rdv'), ASK_Q = cmd('✉️ Lui écrire', 'info');
const MENU = [RDV, cmd('💼 Ses projets', 'projects'), cmd('🧰 Ses compétences', 'skills'), cmd('🎓 Sa formation', 'formation'), ASK_Q];

/* L'agent écrit ses messages un par un, avec « … » le temps de taper */
async function bot(lines, { quick = [], step = null } = {}) {
  const my = run;
  set({ quick: [], step: null });
  for (const line of [].concat(lines)) {
    const msg = typeof line === 'string' ? { text: line } : line;
    set({ typing: true });
    await new Promise((r) => setTimeout(r, reduceMotion ? 120 : Math.min(1300, 420 + msg.text.length * 12)));
    if (my !== run) return;
    set((s) => ({ typing: false, messages: [...s.messages, { id: ++uid, from: 'bot', ...msg }] }));
    nudgeHost();
  }
  set({ quick, step });
}

const me = (text) => set((s) => ({ messages: [...s.messages, { id: ++uid, from: 'me', text }] }));
const remember = (data) => set((s) => ({ form: { ...s.form, ...data } }));
const atLeast = (n, msg) => (t) => (t.length >= n ? '' : msg);

function askName() {
  return bot("C'est noté ! Comment t'appelles-tu ?", { step: 'name' });
}

function recap() {
  const f = get().form, rdv = f.kind === 'rdv';
  const rows = rdv
    ? [['Objet', f.topic], ['Disponibilités', f.when], ['Format', f.mode], f.phone && ['Téléphone', f.phone], ['Nom', f.name], ['E-mail', f.email]]
    : [['Question', f.message], ['Nom', f.name], ['E-mail', f.email]];
  return bot([
    { text: rdv ? 'Je récapitule ta demande de rendez-vous :' : 'Je récapitule ta question :', recap: rows.filter(Boolean) },
    `Je l'envoie à ${studio().owner} ?`,
  ], { quick: [cmd('✅ Envoyer', 'send'), cmd('✏️ Recommencer', 'restart')], step: 'confirm' });
}

/* Ce que l'agent attend à chaque étape : vérification, puis suite de la conversation */
const ASK = {
  menu: { // texte libre : une question sur Paul, à laquelle l'agent répond tout de suite
    placeholder: 'Pose ta question (ex. : il connaît Docker ?)',
    check: () => '',
    next: (t) => ask(t),
  },
  topic: {
    placeholder: 'Ex. : mission data, stage, collaboration…',
    check: atLeast(2, 'Dis-m’en un peu plus sur l’objet du rendez-vous.'),
    next: (t) => {
      remember({ topic: t });
      return bot('Quand serais-tu disponible ? Donne-moi un ou plusieurs créneaux (jour, heure et fuseau horaire).', {
        quick: [say('Dès que possible'), say('Je suis flexible')], step: 'when',
      });
    },
  },
  when: {
    placeholder: 'Ex. : mardi 14 h – 16 h (heure de Paris)',
    check: atLeast(2, 'Indique au moins un jour ou un créneau.'),
    next: (t) => {
      remember({ when: t });
      return bot('On se parle comment ?', { quick: [say('🎥 Visio'), say('📞 Téléphone'), say('💬 WhatsApp')], step: 'mode' });
    },
  },
  mode: {
    placeholder: 'Visio, téléphone, WhatsApp…',
    check: atLeast(2, 'Visio, téléphone ou WhatsApp ?'),
    next: (t) => {
      remember({ mode: t.replace(/^\W+\s*/u, '') });
      if (/t[ée]l[ée]phone|whats|appel/i.test(t)) return bot('Ton numéro, avec l’indicatif du pays ?', { step: 'phone' });
      remember({ phone: '' });
      return askName();
    },
  },
  phone: {
    placeholder: '+225 07 00 00 00 00', type: 'tel',
    check: (t) => (PHONE_RE.test(t) ? '' : 'Ce numéro ne semble pas valide. Ajoute l’indicatif du pays, par exemple +225…'),
    next: (t) => { remember({ phone: t }); return askName(); },
  },
  question: {
    placeholder: 'Ta question…',
    check: atLeast(10, 'Peux-tu m’en dire un peu plus ? (10 caractères minimum)'),
    next: (t) => { remember({ message: t }); return askName(); },
  },
  name: {
    placeholder: 'Ton nom', autoComplete: 'name',
    check: atLeast(2, 'J’ai besoin d’au moins deux lettres 🙂'),
    next: (t) => {
      remember({ name: t });
      return bot(`Merci, ${t} ! Ton adresse e-mail, pour que ${studio().owner} puisse te répondre ?`, { step: 'email' });
    },
  },
  email: {
    placeholder: 'ton@email.com', type: 'email', autoComplete: 'email',
    check: (t) => (EMAIL_RE.test(t) ? '' : 'Cette adresse ne semble pas valide, peux-tu vérifier ?'),
    next: (t) => { remember({ email: t }); return recap(); },
  },
  confirm: {
    placeholder: 'Envoyer ?',
    check: () => '',
    next: (t) => (/^(oui|ok|d'accord|vas-y|envoie|yes|go)/i.test(t)
      ? send()
      : bot('Clique sur « Envoyer », ou sur « Recommencer » pour changer quelque chose.', { quick: get().quick, step: 'confirm' })),
  },
};
export const askFor = (step) => ASK[step];

async function send() {
  const f = get().form, { owner } = studio(), my = run;
  set({ quick: [], step: null, typing: true });
  try {
    await sendContact({
      kind: f.kind, name: f.name, email: f.email, message: f.kind === 'rdv' ? f.topic : f.message,
      when: f.when, mode: f.mode, phone: f.phone, website: '',
    });
    if (my !== run) return;
    set({ form: {} });
    await bot([`C'est envoyé ✅ Ta demande est bien transmise à ${owner}.`, `Il te répondra à ${f.email} au plus vite. Autre chose ?`], { quick: MENU, step: 'menu' });
  } catch (err) {
    if (my !== run) return;
    await bot(`Oups, l'envoi n'a pas fonctionné : ${err.message}`, { quick: [cmd('↻ Réessayer', 'send'), cmd('✏️ Recommencer', 'restart')], step: 'confirm' });
  }
}

/* Réponse à une question tapée : la fiche du portfolio la plus proche, avec sa source et de quoi aller voir */
function ask(question) {
  const { profile, owner, stations } = studio();
  lastQuestion = question;
  kb ??= buildIndex(buildDocs({ profile, stations }));
  const a = answer(kb, question, owner);
  if (a.faq) return faq(a.faq);
  if (a.miss) {
    return bot(`Je n'ai pas trouvé la réponse dans le portfolio de ${owner}. Tu veux que je lui transmette ta question ?`, {
      quick: [cmd('✉️ Oui, transmettre', 'forward'), RDV], step: 'menu',
    });
  }
  const quick = [];
  if (a.action === 'rdv') quick.push(RDV);
  for (const d of a.docs ?? []) {
    const st = stations[d.station];
    if (!st || st.type === 'host' || quick.some((q) => q.cmd === `go:${st.idx}`) || quick.length >= 3) continue;
    const where = { desk: `le bureau ${st.project.short}`, library: 'la bibliothèque', training: 'la salle de formation' }[st.type];
    quick.push(cmd(`👀 Voir ${where}`, `go:${st.idx}`));
  }
  const demo = a.docs?.length === 1 && a.docs[0].demo;
  if (demo) quick.push({ label: '🌐 Ouvrir le site', href: demo });
  if (a.ask || a.docs?.length) quick.push(cmd(`✉️ Demander à ${owner}`, 'forward'));
  return bot({ text: a.text, cite: a.cite }, { quick: quick.length ? quick : MENU, step: 'menu' });
}

/* Réponses immédiates, à partir du profil : formation (diplômes et Forage), compétences, projets */
function faq(topic) {
  const { profile, owner, stations } = studio();
  if (topic === 'formation' || topic === 'simulations') {
    const room = stations.find((s) => s.type === 'training'), courses = room?.project.courses ?? [];
    const edu = courses.filter((c) => c.group !== 'sim'), sims = courses.filter((c) => c.group === 'sim');
    const lines = [];
    if (topic === 'formation' && edu.length) lines.push(`Côté diplômes, ${owner} a suivi :\n\n${edu.map((c) => `${c.icon || '🎓'} ${c.title}\n${c.sub}`).join('\n\n')}`);
    if (sims.length) {
      lines.push(`${topic === 'formation' ? 'Il' : owner} s'entraîne aussi sur Forage, avec des simulations de poste conçues par les entreprises :\n\n${sims.map((c) => `${c.icon} ${c.title}`).join('\n')}`);
    }
    if (!lines.length) lines.push(`${owner} présente son parcours en salle de formation.`);
    lines.push(`Tout est exposé dans sa salle de formation, au fond de la bibliothèque${sims.length ? ' : les simulations sont dans l’onglet « Forage » de l’écran' : ''}.`);
    return bot(lines, {
      quick: [room && cmd('🎓 Aller en salle de formation', topic === 'simulations' ? 'go-forage' : 'go-training'), RDV, ASK_Q].filter(Boolean), step: 'menu',
    });
  }
  if (topic === 'skills') {
    const now = profile.experience?.find((e) => e.current);
    return bot([`Ses outils du quotidien : ${profile.skills.join(', ')}.`, now && `En ce moment : ${now.role} chez ${now.org}.`].filter(Boolean), {
      quick: [RDV, ASK_Q, cmd('💼 Ses projets', 'projects')], step: 'menu',
    });
  }
  const projects = stations.filter((s) => s.type === 'desk' && !s.project.contact).map((s) => s.project.title);
  return bot([`${projects.length} projets sont exposés dans l'espace cowork : ${projects.join(', ')}.`, 'Chaque bureau a son agent pour te le présenter.'], {
    quick: [cmd('▶ Visite guidée', 'tour'), RDV, ASK_Q], step: 'menu',
  });
}

function command(c) {
  const { owner, stations } = studio();
  switch (c) {
    case 'rdv':
      run++; set({ form: { kind: 'rdv' } });
      return bot(`Avec plaisir ! C'est à quel sujet ?`, {
        quick: ['Mission freelance', 'Stage ou emploi', 'Collaboration', 'Simple échange'].map(say), step: 'topic',
      });
    case 'info':
      run++; set({ form: { kind: 'info' } });
      return bot(`Je t'écoute : quelle est ta question pour ${owner} ?`, { step: 'question' });
    case 'send': return send();
    case 'restart':
      run++; set({ form: {} });
      return bot('On reprend depuis le début. Que puis-je faire pour toi ?', { quick: MENU, step: 'menu' });
    case 'tour': set({ quick: MENU, step: 'menu' }); return startTour();
    case 'go-training': set({ quick: MENU, step: 'menu' }); return focusStation(stations.find((s) => s.type === 'training').idx);
    case 'go-forage': set({ quick: MENU, step: 'menu' }); return showCourses('sim');
    case 'forward': // transmettre à Paul la question restée sans réponse (ou à laquelle il répondra mieux)
      run++; set({ form: { kind: 'info', message: lastQuestion } });
      if (lastQuestion.length >= 10) return askName();
      return bot(`D'accord ! Quelle est ta question pour ${owner} ?`, { step: 'question' });
    default:
      if (c.startsWith('go:')) return focusStation(Number(c.slice(3)));
      return faq(c);
  }
}

/* Premier contact : l'agent se présente (une seule fois) */
export function openChat() {
  if (get().messages.length || get().typing) return;
  const { owner, host } = studio();
  bot([`Bonjour 👋 Je suis ${host.name}, l'agent d'accueil.`, `Pose-moi tes questions sur ${owner} : ses projets, ses compétences, sa formation… Je réponds tout de suite, sources à l'appui. Je peux aussi prendre un rendez-vous ou lui transmettre un message.`], {
    quick: MENU, step: 'menu',
  });
}

/* Le visiteur écrit dans le champ */
export function reply(raw) {
  const text = raw.trim(), { step, typing, quick } = get(), ask = ASK[step];
  if (!text || typing || !ask) return;
  me(text);
  const err = ask.check(text);
  if (err) return bot(err, { quick, step });
  return ask.next(text.slice(0, 1000));
}

/* Le visiteur clique sur une réponse proposée */
export function choose(q) {
  if (q.href) { window.open(q.href, '_blank', 'noopener,noreferrer'); return; }
  if (get().typing && !q.cmd) return;
  if (q.text) { reply(q.text); return; }
  me(q.label);
  command(q.cmd);
}

/* Depuis la bulle ou la salle de formation : aller à l'accueil et commencer une demande de rendez-vous */
export function bookMeeting() {
  if (useStudio.getState().focus !== 0) focusStation(0);
  if (!get().messages.length) {
    const { owner, host } = studio();
    set({ messages: [{ id: ++uid, from: 'bot', text: `Bonjour 👋 Je suis ${host.name}, l'agent d'accueil de ${owner}.` }] });
  }
  run++; set({ typing: false });
  choose(RDV);
}
