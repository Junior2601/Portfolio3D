import { useStudio } from './store.js';
import { dialogue } from './studio/dialogue.js';
import { hasSpeech, pop, stopSpeech, unlockAudio } from './studio/audio.js';
import { reduceMotion } from './studio/utils.js';

/* Actions du visiteur : relient l'interface React, le moteur 3D et les dialogues */
let engine = null;
let talkTimer = 0;
let allSeenShown = false;
const S = () => useStudio.getState();
const set = useStudio.setState;

export const attachEngine = (e) => { engine = e; };
export const registerTag = (i, el) => engine?.setTagEl(i, el);
export const registerBubble = (el) => engine?.setBubbleEl(el);
export const snapshot = (i) => engine?.snapshot(i);

export function toast(msg, ms = 3800) {
  const id = Math.random();
  set({ toast: { msg, id } });
  setTimeout(() => { if (S().toast?.id === id) set({ toast: null }); }, ms);
}

export function enter() {
  if (S().status !== 'ready' || S().started) return;
  unlockAudio();
  set({ started: true });
  engine.intro();
  setTimeout(() => { if (S().focus < 0) focusStation(0); }, reduceMotion ? 100 : 2900);
}

/* Range le livre sorti et éteint la formation mise en avant à l'écran */
function putBack() {
  if (S().book >= 0) { set({ book: -1 }); engine.selectBook(-1); }
  if (S().course >= 0) { set({ course: -1 }); engine.selectCourse(-1); }
}

export function focusStation(i, { tour = false, lines } = {}) {
  const st = engine?.stations[i];
  if (!st) return;
  if (!tour) stopTour();
  if (S().focus === i && dialogue.station === st) { dialogue.advance(); return; }
  if (!lines) putBack();
  dialogue.stop();
  clearTimeout(talkTimer);
  set({ focus: i });
  engine.focus(i);
  talkTimer = setTimeout(() => {
    dialogue.start(st, () => { if (S().tour) tourNext(); }, lines);
    const visited = new Set(S().visited).add(i);
    set({ visited });
    if (!allSeenShown && engine.stations.every((s) => s.type !== 'desk' || visited.has(s.idx))) {
      allSeenShown = true;
      setTimeout(() => toast('🎉 Tu as visité tous les bureaux ! Merci pour ta visite.', 5000), 2500);
    }
  }, reduceMotion ? 50 : 1050);
  pop();
}

export function goOverview() {
  stopTour();
  clearTimeout(talkTimer);
  dialogue.stop();
  putBack();
  set({ focus: -1 });
  engine?.overview();
}

/* Sort un livre de l'étagère, et la bibliothécaire explique pourquoi il est recommandé */
export function pickBook(b) {
  const st = engine.stations.find((s) => s.type === 'library');
  const again = S().book === b;
  putBack(); // un seul objet en avant à la fois
  if (again) { dialogue.stop(); return; }
  const { title, author, why } = st.project.books[b];
  set({ book: b });
  engine.selectBook(b);
  present(st, [`« ${title} », de ${author}. ${why}`]);
}

/* Met une formation en avant sur l'écran de la salle de formation, et Paul la présente */
export function pickCourse(c) {
  const st = engine.stations.find((s) => s.type === 'training');
  const again = S().course === c;
  putBack(); // un seul objet en avant à la fois
  if (again) { dialogue.stop(); return; }
  const { title, school, place, about } = st.project.courses[c];
  set({ course: c });
  engine.selectCourse(c);
  present(st, [`${title}, ${school}${place ? ` (${place})` : ''}. ${about || ''}`.trim()]);
}

/* L'agent de la station dit ces phrases, en y allant d'abord si besoin */
function present(st, lines) {
  if (S().focus !== st.idx) { focusStation(st.idx, { lines }); return; }
  stopTour();
  clearTimeout(talkTimer);
  dialogue.stop();
  dialogue.start(st, null, lines);
  pop();
}

/* L'agent d'accueil « parle » quand il répond dans le chat */
export function nudgeHost(sec = 1.6) {
  const a = engine?.stations[0]?.agent;
  if (!a) return;
  a.talkUntil = engine.time + sec;
  a.say('💬', sec);
}

export function step(d) {
  const n = engine.stations.length, f = S().focus;
  focusStation(((f < 0 ? (d > 0 ? -1 : 0) : f) + d + n) % n);
}

export function startTour() {
  set({ tour: true });
  focusStation(1, { tour: true });
  toast('Visite guidée lancée · Échap pour reprendre la main');
}

export function stopTour() {
  if (S().tour) set({ tour: false });
}

function tourNext() {
  const next = S().focus + 1;
  if (next < engine.stations.length) focusStation(next, { tour: true });
  else { goOverview(); toast('Visite terminée ! Clique sur un bureau pour revoir un projet.'); }
}

export function toggleNight() {
  const night = !S().night;
  set({ night });
  engine.setNight(night);
}

export function cycleSound() {
  const modes = hasSpeech ? ['voice', 'blips', 'mute'] : ['blips', 'mute'];
  const sound = modes[(modes.indexOf(S().sound) + 1) % modes.length];
  set({ sound });
  if (sound !== 'voice') stopSpeech();
  toast({ voice: '🗣️ Les agents parlent à voix haute', blips: '🎵 Les agents « bipent » en écrivant', mute: '🔇 Son coupé' }[sound], 2200);
}

export const advance = () => dialogue.advance();
export const openContact = () => set({ contactOpen: true });
export const closeContact = () => set({ contactOpen: false });
