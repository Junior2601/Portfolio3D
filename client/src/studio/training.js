import * as THREE from 'three';
import { EMOJI, FONT, MONO, add, fit, hex, makeCanvas, rr, texFrom } from './utils.js';

const CW = 1024, CH = 576, TOP = 132;
const HIT = new THREE.MeshBasicMaterial({ visible: false });

/* Écran de la salle de formation : la liste des formations, celle choisie mise en avant.
   Le parent est tourné vers le public ; chaque ligne est une zone cliquable (userData.course). */
export function courseScreen(parent, courses, look, w, h) {
  const [c, g] = makeCanvas(CW, CH), tex = texFrom(c), acc = hex(look.accent ?? look.shirt);
  const rowH = Math.min(128, (CH - TOP - 24) / Math.max(1, courses.length));
  let selected = -1;

  function draw() {
    const grd = g.createLinearGradient(0, 0, CW, CH);
    grd.addColorStop(0, '#1d2140'); grd.addColorStop(1, '#2c2357');
    g.fillStyle = grd; g.fillRect(0, 0, CW, CH);
    g.textBaseline = 'middle'; g.textAlign = 'left';
    g.font = `52px ${EMOJI}`; g.fillText('🎓', 52, 70);
    g.fillStyle = '#fff'; g.font = `700 50px ${FONT}`; g.fillText('Mes formations', 128, 66);
    g.fillStyle = acc; g.font = `700 18px ${MONO}`; g.fillText(`${look.name.toUpperCase()} · PARCOURS`, 131, 106);
    if (!courses.length) {
      g.fillStyle = '#a7acd1'; g.font = `500 30px ${FONT}`; g.fillText('Bientôt…', 128, 300);
    }
    // Fil du temps qui relie les formations
    g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(85, TOP + rowH / 2, 4, rowH * (courses.length - 1));
    courses.forEach((co, i) => {
      const y = TOP + i * rowH, mid = y + rowH / 2, on = i === selected;
      g.fillStyle = on ? acc : 'rgba(255,255,255,.05)'; rr(g, 40, y + 8, CW - 80, rowH - 16, 22); g.fill();
      g.fillStyle = on ? '#fff' : '#33395e'; g.beginPath(); g.arc(87, mid, 30, 0, 7); g.fill();
      g.textAlign = 'center'; g.font = `32px ${EMOJI}`; g.fillText(co.icon || '🎓', 87, mid + 2);
      g.textAlign = 'left';
      g.fillStyle = '#fff'; g.font = `700 34px ${FONT}`; g.fillText(fit(g, co.title, co.period ? 640 : 820), 140, mid - 18);
      g.fillStyle = on ? 'rgba(255,255,255,.88)' : '#a7acd1'; g.font = `500 24px ${FONT}`;
      g.fillText(fit(g, [co.school, co.place].filter(Boolean).join(' · '), 820), 140, mid + 22);
      if (co.period) { g.textAlign = 'right'; g.font = `700 20px ${MONO}`; g.fillText(co.period, CW - 64, mid - 18); g.textAlign = 'left'; }
    });
    tex.needsUpdate = true;
  }
  draw();

  add(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), parent, 0, 0, 0, false);
  const items = courses.map((_, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, (rowH / CH) * h * 0.9), HIT);
    m.position.set(0, h / 2 - ((TOP + rowH * (i + 0.5)) / CH) * h, 0.01);
    m.userData.course = i;
    parent.add(m);
    return m;
  });
  return { items, select(i) { selected = i; draw(); } };
}
