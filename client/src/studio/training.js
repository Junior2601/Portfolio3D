import * as THREE from 'three';
import { EMOJI, FONT, MONO, add, fit, hex, makeCanvas, rr, texFrom } from './utils.js';

const CW = 1024, CH = 576, TOP = 132;
const HIT = new THREE.MeshBasicMaterial({ visible: false });
const OFF = 31; // calque ignoré par le raycaster : ligne cliquable inutilisée sur cet onglet
export const PAGES = [{ id: 'edu', label: 'Diplômes' }, { id: 'sim', label: 'Forage' }];

/* Les formations à afficher : diplômes (profile.education) puis simulations de poste Forage (profile.simulations).
   title / sub = les deux lignes à l'écran ; speech = ce que dit Paul quand on en choisit une */
export function trainingCourses(profile) {
  const edu = (profile.education ?? []).map((c) => {
    const sub = [c.school, c.place].filter(Boolean).join(' · ');
    return { ...c, group: 'edu', sub, speech: `${c.title}, ${c.school}${c.place ? ` (${c.place})` : ''}. ${c.about || ''}`.trim() };
  });
  const sim = (profile.simulations ?? []).map((s) => ({
    ...s, group: 'sim', role: s.title, title: `${s.company} · ${s.title}`, sub: `Simulation de poste · Forage${s.duration ? ` · ${s.duration}` : ''}`,
    speech: `${s.company}, ${s.title} : une simulation de poste sur Forage. ${s.about || ''}`.trim(),
  }));
  return [...edu, ...sim];
}

/* Écran de la salle de formation : un onglet par groupe (diplômes, Forage), la formation choisie mise en avant.
   Le parent est tourné vers le public ; chaque ligne (userData.course) et chaque onglet (userData.tab) est cliquable. */
export function courseScreen(parent, courses, look, w, h) {
  const [c, g] = makeCanvas(CW, CH), tex = texFrom(c), acc = hex(look.accent ?? look.shirt);
  const pages = PAGES.filter((p) => courses.some((co) => co.group === p.id));
  const rows = (id) => courses.map((co, i) => [co, i]).filter(([co]) => co.group === id);
  const perPage = Math.max(1, ...pages.map((p) => rows(p.id).length));
  const rowH = Math.min(128, (CH - TOP - 24) / perPage);
  let selected = -1, page = pages[0]?.id ?? 'edu';
  const tabs = []; // zones des onglets sur la toile : { id, x, w }

  function draw() {
    const grd = g.createLinearGradient(0, 0, CW, CH);
    grd.addColorStop(0, '#1d2140'); grd.addColorStop(1, '#2c2357');
    g.fillStyle = grd; g.fillRect(0, 0, CW, CH);
    g.textBaseline = 'middle'; g.textAlign = 'left';
    g.font = `52px ${EMOJI}`; g.fillText('🎓', 52, 70);
    g.fillStyle = '#fff'; g.font = `700 50px ${FONT}`; g.fillText('Mon parcours', 128, 66);
    g.fillStyle = acc; g.font = `700 18px ${MONO}`; g.fillText(`${look.name.toUpperCase()} · FORMATIONS`, 131, 106);
    // Onglets, à droite du titre
    tabs.length = 0;
    let x = CW - 40;
    for (const p of [...pages].reverse()) {
      const label = `${p.label} · ${rows(p.id).length}`;
      g.font = `700 24px ${FONT}`;
      const tw = g.measureText(label).width + 44;
      x -= tw;
      const on = p.id === page;
      g.fillStyle = on ? acc : 'rgba(255,255,255,.08)'; rr(g, x, 42, tw, 54, 27); g.fill();
      g.fillStyle = on ? '#fff' : '#c9cdea'; g.fillText(label, x + 22, 70);
      tabs.unshift({ id: p.id, x, w: tw });
      x -= 12;
    }
    const list = rows(page);
    if (!list.length) {
      g.fillStyle = '#a7acd1'; g.font = `500 30px ${FONT}`; g.fillText('Bientôt…', 128, 300);
    }
    // Fil du temps qui relie les formations
    g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(85, TOP + rowH / 2, 4, rowH * Math.max(0, list.length - 1));
    list.forEach(([co, i], r) => {
      const y = TOP + r * rowH, mid = y + rowH / 2, on = i === selected;
      g.fillStyle = on ? acc : 'rgba(255,255,255,.05)'; rr(g, 40, y + 8, CW - 80, rowH - 16, 22); g.fill();
      g.fillStyle = on ? '#fff' : '#33395e'; g.beginPath(); g.arc(87, mid, 30, 0, 7); g.fill();
      g.textAlign = 'center'; g.font = `32px ${EMOJI}`; g.fillText(co.icon || '🎓', 87, mid + 2);
      g.textAlign = 'left';
      g.fillStyle = '#fff'; g.font = `700 34px ${FONT}`; g.fillText(fit(g, co.title, co.period ? 640 : 820), 140, mid - 18);
      g.fillStyle = on ? 'rgba(255,255,255,.88)' : '#a7acd1'; g.font = `500 24px ${FONT}`;
      g.fillText(fit(g, co.sub ?? '', 820), 140, mid + 22);
      if (co.period) { g.textAlign = 'right'; g.font = `700 20px ${MONO}`; g.fillText(co.period, CW - 64, mid - 18); g.textAlign = 'left'; }
    });
    tex.needsUpdate = true;
    // Les lignes cliquables suivent l'onglet affiché
    items.forEach((m, r) => {
      const entry = list[r];
      m.userData.course = entry?.[1];
      if (entry) m.layers.set(0); else m.layers.set(OFF);
    });
    tabHits.forEach((m) => {
      const t = tabs.find((tb) => tb.id === m.userData.tab);
      m.position.x = ((t.x + t.w / 2) / CW - 0.5) * w;
      m.scale.x = t.w / CW;
    });
  }

  add(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), parent, 0, 0, 0, false);
  const items = [...Array(perPage)].map((_, r) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, (rowH / CH) * h * 0.9), HIT);
    m.position.set(0, h / 2 - ((TOP + rowH * (r + 0.5)) / CH) * h, 0.01);
    parent.add(m);
    return m;
  });
  const tabHits = pages.length > 1 ? pages.map((p) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, (54 / CH) * h), HIT);
    m.position.set(0, h / 2 - (69 / CH) * h, 0.01);
    m.userData.tab = p.id;
    parent.add(m);
    return m;
  }) : [];
  draw();

  return {
    items: [...items, ...tabHits],
    select(i) {
      selected = i;
      if (courses[i]) page = courses[i].group;
      draw();
    },
    show(id) {
      if (page === id || !pages.some((p) => p.id === id)) return;
      page = id;
      draw();
    },
  };
}
