import { useStudio } from '../store.js';
import { speak, stopSpeech, tone } from './audio.js';

/* Machine à écrire + voix : avance phrase par phrase, publie le texte de la bulle dans le store */
const CHAR_DELAY = 0.028;
const d = { st: null, i: 0, full: '', shown: 0, charT: 0, typing: false, speaking: false, waitUntil: Infinity, onEnd: null, time: 0 };

const sound = () => useStudio.getState().sound;
const isLast = () => d.st && d.i === d.st.lines.length - 1;

function publish() {
  useStudio.setState({
    bubble: d.st
      ? { idx: d.st.idx, text: d.full.slice(0, d.shown), typing: d.typing, last: isLast() }
      : { idx: -1, text: '', typing: false, last: false },
  });
}

function playLine() {
  d.full = d.st.lines[d.i]; d.shown = 0; d.charT = 0; d.typing = true; d.waitUntil = Infinity;
  if (sound() === 'voice') {
    d.speaking = true;
    speak(d.full, d.st.agent, () => { d.speaking = false; });
  }
  publish();
}

function finishTyping() {
  d.typing = false; d.shown = d.full.length;
  if (isLast()) d.waitUntil = useStudio.getState().tour ? d.time + 1.6 : Infinity;
  else d.waitUntil = d.time + (sound() === 'voice' ? 0.5 : 1 + d.full.length * 0.035);
  publish();
}

export const dialogue = {
  get station() { return d.st; },

  start(st, onEnd) {
    d.st = st; d.i = 0; d.onEnd = onEnd;
    st.agent.waveUntil = d.time + 1.1;
    playLine();
  },

  stop() {
    stopSpeech();
    d.speaking = false;
    if (d.st) d.st.agent.talking = false;
    d.st = null;
    publish();
  },

  /* Clic ou Espace : termine la phrase en cours, sinon passe à la suivante */
  advance() {
    if (!d.st) return;
    if (d.typing) { finishTyping(); return; }
    if (!isLast()) { stopSpeech(); d.speaking = false; d.i++; playLine(); }
  },

  /* Appelé à chaque image par le moteur */
  tick(dt, time) {
    d.time = time;
    if (!d.st) return;
    if (d.typing) {
      d.charT += dt;
      const target = Math.min(d.full.length, Math.floor(d.charT / CHAR_DELAY));
      if (target > d.shown) {
        if (sound() === 'blips') {
          for (let k = d.shown; k < target; k++) if (k % 2 === 0 && /\S/.test(d.full[k])) tone((d.st.look.blip || 420) * (0.9 + Math.random() * 0.25));
        }
        d.shown = target;
        if (d.shown >= d.full.length) finishTyping(); else publish();
      }
    } else if (!d.speaking && time > d.waitUntil) {
      d.waitUntil = Infinity;
      if (!isLast()) { d.i++; playLine(); } else d.onEnd?.();
    }
    if (d.st) d.st.agent.talking = d.typing || d.speaking; // onEnd a pu changer de bureau
  },
};
