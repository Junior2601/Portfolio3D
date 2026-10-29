import { useStudio } from '../store.js';

/* Voix des agents (synthèse vocale du navigateur) et petits sons d'interface */
export const hasSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window;
const audio = { ctx: null, voices: [], token: 0 };

const FEMALE = /denise|hortense|julie|eloise|vivienne|amelie|amélie|sylvie|ariane|charline|audrey|marie|virginie|celine|céline|brigitte|coralie|josephine|yvette|léa|lea\b|aurelie|aurélie/i;
const MALE = /henri|paul|claude|remy|rémy|jean|antoine|fabrice|gerard|gérard|thomas|nicolas|alain|maurice|yves|jerome|jérôme|guillaume|thierry|daniel|mathieu|lucien|eloi/i;

function loadVoices() {
  const score = (v) => (/natural|online|neural/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 2 : 0) + (/fr[-_]FR/i.test(v.lang) ? 1 : 0);
  audio.voices = speechSynthesis.getVoices().filter((v) => /^fr/i.test(v.lang)).sort((a, b) => score(b) - score(a));
}
if (hasSpeech) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }

function voiceFor(look, idx) {
  const all = audio.voices;
  if (!all.length) return null;
  const re = look.g === 'f' ? FEMALE : look.g === 'm' ? MALE : null;
  const pool = re ? all.filter((v) => re.test(v.name)) : all;
  return (pool.length ? pool : all)[idx % (pool.length || all.length)];
}

/* Lit une phrase ; onEnd est appelé une seule fois (fin, erreur ou délai de sécurité) */
export function speak(text, agent, onEnd) {
  if (!hasSpeech) { onEnd?.(); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ''));
  u.lang = 'fr-FR';
  const v = voiceFor(agent.look, agent.idx);
  if (v) u.voice = v;
  const gendered = v && ((agent.look.g === 'f' && FEMALE.test(v.name)) || (agent.look.g === 'm' && MALE.test(v.name)));
  u.pitch = gendered || !agent.look.g ? 1 : agent.look.g === 'f' ? 1.25 : 0.85;
  u.rate = 1.04;
  const token = ++audio.token;
  const done = () => { if (token === audio.token) { audio.token++; onEnd?.(); } };
  u.onend = u.onerror = done;
  setTimeout(done, 4000 + text.length * 90); // certains navigateurs n'envoient jamais « onend »
  speechSynthesis.speak(u);
}

export function stopSpeech() {
  audio.token++;
  if (hasSpeech) speechSynthesis.cancel();
}

export function tone(freq, dur = 0.07, vol = 0.05, type = 'triangle') {
  const ctx = audio.ctx;
  if (!ctx || useStudio.getState().sound === 'mute') return;
  const o = ctx.createOscillator(), gn = ctx.createGain(), t0 = ctx.currentTime;
  o.type = type; o.frequency.value = freq;
  gn.gain.setValueAtTime(0.0001, t0); gn.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(gn).connect(ctx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}

export const pop = () => { tone(660, 0.08, 0.04, 'sine'); setTimeout(() => tone(990, 0.08, 0.035, 'sine'), 60); };

/* Le son ne peut démarrer qu'après un geste du visiteur (clic sur « Entrer ») */
export function unlockAudio() {
  try {
    audio.ctx = audio.ctx || new (window.AudioContext || window.webkitAudioContext)();
    audio.ctx.resume();
  } catch { /* pas d'audio disponible */ }
}
