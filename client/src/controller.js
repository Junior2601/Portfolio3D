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

export function focusStation(i, { tour = false } = {}) {
  const st = engine?.stations[i];
  if (!st) return;
  if (!tour) stopTour();
  if (S().focus === i && dialogue.station === st) { dialogue.advance(); return; }
  dialogue.stop();
  clearTimeout(talkTimer);
  set({ focus: i });
  engine.focus(i);
  talkTimer = setTimeout(() => {
    dialogue.start(st, () => { if (S().tour) tourNext(); });
    const visited = new Set(S().visited).add(i);
    set({ visited });
    const desks = engine.stations.length - 1;
    if (!allSeenShown && [...visited].filter((v) => v > 0).length === desks) {
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
  set({ focus: -1 });
  engine?.overview();
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
