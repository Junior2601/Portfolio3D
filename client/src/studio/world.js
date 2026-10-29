import * as THREE from 'three';
import { Agent } from './Agent.js';
import { createScreen, makeCover } from './screens.js';
import { scene, world } from './world-state.js';
import {
  B, CY, EMOJI, FONT, MONO, add, fit, floorSpot, hex, makeCanvas, mat, reseed, rr, rug, shade, srand, texFrom,
} from './utils.js';

/* Grille de bureaux : 3 colonnes jusqu'à 6 projets, puis 4, et autant de rangées que nécessaire */
export function layout(n) {
  const cols = n <= 6 ? 3 : 4, rows = Math.max(2, Math.ceil(n / cols)), sx = 5.4, sz = 5.6;
  const W = cols * sx + 7, D = 19 + (rows - 2) * sz;
  const pos = [...Array(n)].map((_, i) => new THREE.Vector3(((i % cols) - (cols - 1) / 2) * sx + 0.8, 0, -D / 2 + 4.2 + Math.floor(i / cols) * sz));
  return { cols, rows, W, D, pos };
}

function makeSky(night) {
  const [c, g] = makeCanvas(1024, 320);
  const grd = g.createLinearGradient(0, 0, 0, 320);
  if (night) { grd.addColorStop(0, '#0d1030'); grd.addColorStop(1, '#2a2f6b'); }
  else { grd.addColorStop(0, '#7cc3ff'); grd.addColorStop(1, '#dff2ff'); }
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 320);
  reseed(night ? 99 : 42);
  if (night) {
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + srand() * 0.7})`; g.fillRect(srand() * 1024, srand() * 190, 2, 2); }
    g.fillStyle = '#fff6d6'; g.beginPath(); g.arc(830, 70, 26, 0, 7); g.fill();
  } else {
    g.fillStyle = 'rgba(255,243,176,.9)'; g.beginPath(); g.arc(190, 80, 38, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 6; i++) { const x = srand() * 1024, y = 40 + srand() * 90; for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + k * 26, y + (k % 2) * -8, 34, 18, 0, 0, 7); g.fill(); } }
  }
  reseed(7); // même silhouette de ville le jour et la nuit
  for (let x = 0; x < 1024;) {
    const w = 40 + srand() * 70, h = 70 + srand() * 150;
    g.fillStyle = night ? '#141634' : '#a3b6d0'; g.fillRect(x, 320 - h, w - 4, h);
    for (let wy = 330 - h; wy < 312; wy += 16) for (let wx = x + 6; wx < x + w - 12; wx += 12) {
      const on = srand();
      g.fillStyle = night ? (on > 0.55 ? 'rgba(255,214,120,.9)' : 'rgba(255,255,255,.04)') : 'rgba(255,255,255,.35)';
      g.fillRect(wx, wy, 6, 8);
    }
    x += w;
  }
  return texFrom(c);
}

function buildNeon(g, D, profile) {
  const [c, x] = makeCanvas(1024, 300);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `700 118px ${FONT}`;
  const txt = `${profile.owner.toLowerCase()}.studio`;
  for (const [blur, col] of [[44, '#ff4f9a'], [18, '#ff7ab8'], [0, '#fff0f7']]) { x.shadowColor = '#ff3d8b'; x.shadowBlur = blur; x.fillStyle = col; x.fillText(txt, 512, 118); }
  x.font = `700 40px ${MONO}`;
  for (const [blur, col] of [[22, '#4fd8ff'], [0, '#e9fbff']]) { x.shadowColor = '#2fc6ff'; x.shadowBlur = blur; x.fillStyle = col; x.fillText(profile.role.toUpperCase(), 512, 238); }
  const m = new THREE.MeshBasicMaterial({ map: texFrom(c), transparent: true, toneMapped: false, depthWrite: false });
  add(new THREE.PlaneGeometry(5.8, 1.7), m, g, 0.3, 2.95, -D / 2 + 0.37, false);
  world.neon = m;
  const l = new THREE.PointLight(0xff4f9a, 0, 8, 1.6); l.position.set(0.3, 3, -D / 2 + 1.2); g.add(l);
  world.lamps.push({ light: l, max: 5 });
}

function buildRoom({ W, D }, profile) {
  const g = new THREE.Group(); scene.add(g);
  B(W + 1.4, 0.7, D + 1.4, 0x34304a, g, 0, -0.65, 0, false);
  // Parquet
  const [c, x] = makeCanvas(512, 512);
  const woods = ['#e3c9a3', '#ead5b4', '#dfc39b', '#e6cfab'];
  x.fillStyle = '#cdb08a'; x.fillRect(0, 0, 512, 512);
  for (let r = 0; r < 8; r++) for (let k = -1; k < 3; k++) { x.fillStyle = woods[(r * 3 + k + 4) % 4]; x.fillRect(k * 256 + (r % 2) * 128 + 2, r * 64 + 2, 252, 60); }
  const ft = texFrom(c); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(W / 5, D / 5);
  B(W, 0.3, D, new THREE.MeshStandardMaterial({ map: ft, roughness: 0.75 }), g, 0, -0.15, 0).castShadow = false;
  // Murs (vue « maison de poupée » : mur du fond + mur gauche)
  const H = 4.6, T = 0.35, bz = -D / 2 + T / 2, lx = -W / 2 + T / 2;
  const wallM = mat(0xf2ebe1), capM = mat(0x3b3552), trimM = mat(0xcdbfae), lowM = mat(0xe4d6c4);
  B(W, H, T, wallM, g, 0, H / 2, bz); B(T, H, D, wallM, g, lx, H / 2, 0);
  B(W - T, 1.0, 0.04, lowM, g, T / 2, 0.5, -D / 2 + T + 0.02, false);
  B(0.04, 1.0, D - T, lowM, g, -W / 2 + T + 0.02, 0.5, T / 2, false);
  B(W - T, 0.16, 0.07, trimM, g, T / 2, 0.08, -D / 2 + T + 0.035, false);
  B(0.07, 0.16, D - T, trimM, g, -W / 2 + T + 0.035, 0.08, T / 2, false);
  B(W + 0.04, 0.14, T + 0.04, capM, g, 0, H + 0.07, bz, false);
  B(T + 0.04, 0.14, D + 0.04, capM, g, lx, H + 0.07, 0, false);
  B(T + 0.04, H, 0.06, capM, g, lx, H / 2, D / 2, false);
  B(0.06, H, T + 0.04, capM, g, W / 2, H / 2, bz, false);
  // Fenêtres avec ville (jour / nuit en fondu)
  const skyD = makeSky(false), skyN = makeSky(true), winW = 4.4, winH = 2.3, winY = 2.75, z = -D / 2 + T + 0.01;
  [-W / 2 + 5.2, W / 2 - 4.6].forEach((wx, i) => {
    const td = skyD.clone(), tn = skyN.clone();
    for (const t of [td, tn]) { t.repeat.set(0.5, 1); t.offset.set(i * 0.5, 0); t.needsUpdate = true; }
    add(new THREE.PlaneGeometry(winW, winH), new THREE.MeshBasicMaterial({ map: td }), g, wx, winY, z, false);
    const n = add(new THREE.PlaneGeometry(winW, winH), new THREE.MeshBasicMaterial({ map: tn, transparent: true, opacity: 0 }), g, wx, winY, z + 0.005, false);
    world.nightFade.push(n.material);
    const fm = mat(0x3b3552);
    B(winW + 0.24, 0.14, 0.14, fm, g, wx, winY + winH / 2 + 0.05, z + 0.05);
    B(winW + 0.24, 0.14, 0.14, fm, g, wx, winY - winH / 2 - 0.05, z + 0.05);
    B(0.14, winH + 0.2, 0.14, fm, g, wx - winW / 2 - 0.05, winY, z + 0.05);
    B(0.14, winH + 0.2, 0.14, fm, g, wx + winW / 2 + 0.05, winY, z + 0.05);
    B(0.07, winH, 0.1, fm, g, wx, winY, z + 0.04);
    B(winW + 0.5, 0.08, 0.34, 0xcdbfae, g, wx, winY - winH / 2 - 0.15, z + 0.15);
  });
  buildNeon(g, D, profile);
}

function plant(parent, x, y, z, s = 1, kind = 'bush') {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g);
  CY(0.26, 0.2, 0.42, 8, 0xd9734e, g, 0, 0.21, 0); CY(0.28, 0.28, 0.06, 8, 0xc4643f, g, 0, 0.43, 0);
  const leaves = new THREE.Group(); leaves.position.y = 0.45; g.add(leaves);
  const greens = [0x5bbf6a, 0x3f9d57, 0x74cf7a];
  if (kind === 'tall') {
    CY(0.03, 0.04, 1.2, 5, 0x6b4a2f, leaves, 0, 0.6, 0);
    for (let k = 0; k < 9; k++) add(new THREE.IcosahedronGeometry(0.22 + srand() * 0.14, 0), greens[k % 3], leaves, (srand() - 0.5) * 0.6, 0.6 + srand() * 1.0, (srand() - 0.5) * 0.6);
  } else {
    for (let k = 0; k < 6; k++) add(new THREE.IcosahedronGeometry(0.2 + srand() * 0.12, 0), greens[k % 3], leaves, (srand() - 0.5) * 0.4, 0.15 + srand() * 0.35, (srand() - 0.5) * 0.4);
  }
  world.plants.push({ g: leaves, ph: srand() * 6 });
  return g;
}

function lamp(parent, x, y, z, color, { tall = false, max = 3, dist = 5 } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const h = tall ? 1.7 : 0.5;
  CY(tall ? 0.22 : 0.11, tall ? 0.25 : 0.13, 0.04, 10, 0x2b2740, g, 0, 0.02, 0);
  CY(0.02, 0.02, h, 5, 0x2b2740, g, 0, h / 2, 0);
  const shadeM = new THREE.MeshStandardMaterial({ color, roughness: 0.6, flatShading: true, side: THREE.DoubleSide });
  add(new THREE.ConeGeometry(tall ? 0.3 : 0.15, tall ? 0.35 : 0.2, 10, 1, true), shadeM, g, 0, h + 0.05, 0);
  const bulbM = new THREE.MeshStandardMaterial({ color: 0xfff1c9, emissive: 0xffc46b, emissiveIntensity: 0 });
  add(new THREE.SphereGeometry(tall ? 0.08 : 0.05, 8, 6), bulbM, g, 0, h - 0.04, 0, false);
  world.glow.push(bulbM);
  const l = new THREE.PointLight(0xffc477, 0, dist, 1.6); l.position.set(0, h - 0.1, 0); g.add(l);
  world.lamps.push({ light: l, max });
  return g;
}

function signTexture(num, title, color) {
  const [c, g] = makeCanvas(512, 96);
  g.fillStyle = '#2b2740'; g.fillRect(0, 0, 512, 96);
  g.fillStyle = color; rr(g, 12, 14, 84, 68, 12); g.fill();
  g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'center';
  g.font = `700 34px ${num.length > 2 ? EMOJI : MONO}`; g.fillText(num, 54, 50);
  g.textAlign = 'left'; g.font = `700 34px ${FONT}`; g.fillText(fit(g, title, 380), 116, 50);
  return texFrom(c);
}

function decorate({ W, D }) {
  const g = new THREE.Group(); scene.add(g);
  const xl = -W / 2 + 0.35, zb = -D / 2; // face intérieure du mur gauche, mur du fond
  // Bibliothèque
  const sh = new THREE.Group(); sh.position.set(xl, 0, zb + 2.9); g.add(sh);
  const wood = 0x8a5a3b, books = [0xff6b4a, 0x4a8fe0, 0xf2b134, 0x2fb39f, 0x8b6cf0, 0xe0656f, 0xf4efe6, 0x2b2740];
  B(0.06, 2.8, 2.6, 0x6d452d, sh, 0.03, 1.4, 0);
  for (const s of [-1, 1]) B(0.5, 2.8, 0.08, wood, sh, 0.25, 1.4, s * 1.26);
  for (let k = 0; k < 5; k++) B(0.5, 0.07, 2.52, wood, sh, 0.25, 0.05 + k * 0.68, 0);
  for (let k = 0; k < 4; k++) {
    for (let zz = -1.15; zz < 1.05;) {
      const w = 0.08 + srand() * 0.1, h = 0.36 + srand() * 0.22;
      if (srand() < 0.1) { zz += 0.22; continue; }
      B(0.34, h, w, books[Math.floor(srand() * books.length)], sh, 0.27, 0.09 + k * 0.68 + h / 2, zz + w / 2);
      zz += w + 0.012;
    }
  }
  plant(sh, 0.25, 2.77, 0.7, 0.55);
  // Affiches
  const poster = (z, draw) => {
    const [c, x] = makeCanvas(256, 340); draw(x);
    B(0.06, 1.62, 1.24, 0x2b2740, g, xl + 0.03, 2.4, z);
    add(new THREE.PlaneGeometry(1.12, 1.5), new THREE.MeshStandardMaterial({ map: texFrom(c), roughness: 0.9 }), g, xl + 0.065, 2.4, z, false).rotation.y = Math.PI / 2;
  };
  poster(zb + 5.7, (x) => {
    x.fillStyle = '#ff6b4a'; x.fillRect(0, 0, 256, 340);
    x.fillStyle = '#ffd166'; x.beginPath(); x.arc(128, 130, 80, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.font = `700 52px ${FONT}`; x.textAlign = 'center'; x.fillText('SHIP', 128, 268); x.fillText('IT', 128, 318);
    x.fillStyle = '#fff'; x.font = `70px ${EMOJI}`; x.fillText('🚀', 128, 156);
  });
  poster(zb + 7.7, (x) => {
    x.fillStyle = '#2b2740'; x.fillRect(0, 0, 256, 340);
    ['#4fd8ff', '#ff4f9a', '#f2b134', '#2fb39f'].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.moveTo(40 + i * 44, 240); x.lineTo(62 + i * 44, 200 - i * 34); x.lineTo(84 + i * 44, 240); x.fill(); });
    x.fillStyle = '#fff'; x.font = `700 26px ${MONO}`; x.textAlign = 'center'; x.fillText('RAG·AGENTS', 128, 290); x.fillText('·DATA·', 128, 320);
  });
  // Horloge à l'heure réelle
  const ck = new THREE.Group(); ck.position.set(xl + 0.05, 3.1, zb + 9.9); g.add(ck);
  CY(0.46, 0.46, 0.05, 20, 0x2b2740, ck, 0, 0, 0).rotation.z = Math.PI / 2;
  CY(0.41, 0.41, 0.06, 20, 0xfffaf0, ck, 0.01, 0, 0).rotation.z = Math.PI / 2;
  const hand = (len, wdt, color) => { const p = new THREE.Group(); p.position.x = 0.06; ck.add(p); B(0.015, len, wdt, color, p, 0, len / 2 - 0.04, 0, false); return p; };
  world.clock = { h: hand(0.24, 0.045, 0x2b2740), m: hand(0.34, 0.03, 0x2b2740), s: hand(0.36, 0.012, 0xff4f9a) };
  // Coin café
  const cf = new THREE.Group(); cf.position.set(xl, 0, zb + 12.1); g.add(cf);
  B(0.65, 0.95, 2.6, 0x5aa9a0, cf, 0.33, 0.475, 0);
  B(0.75, 0.07, 2.7, 0xd9c7ae, cf, 0.37, 0.985, 0);
  B(0.45, 0.55, 0.45, 0x2f2b3d, cf, 0.3, 1.3, -0.7); B(0.08, 0.06, 0.2, 0x8a8aa0, cf, 0.5, 1.2, -0.7);
  CY(0.06, 0.05, 0.1, 8, 0xffffff, cf, 0.5, 1.07, -0.7);
  [0xff6b4a, 0x4a8fe0, 0xf2b134].forEach((c, k) => CY(0.06, 0.05, 0.12, 8, c, cf, 0.45, 1.08, 0.1 + k * 0.2));
  B(0.3, 0.05, 1.6, wood, cf, 0.15, 2.0, 0.3);
  plant(cf, 0.17, 2.025, 0.7, 0.4); plant(cf, 0.17, 2.025, -0.1, 0.35);
  // Tableau blanc « roadmap » (seulement quand le local s'agrandit)
  if (D > 19) {
    const [c, x] = makeCanvas(512, 320);
    x.fillStyle = '#fbfbf8'; x.fillRect(0, 0, 512, 320);
    x.fillStyle = '#2b2740'; x.font = `700 34px ${FONT}`; x.fillText('Roadmap', 24, 50);
    ['À faire', 'En cours', 'En ligne'].forEach((col, i) => {
      x.fillStyle = '#8f98c2'; x.font = `700 16px ${MONO}`; x.fillText(col, 24 + i * 165, 92);
      for (let k = 0; k < 3 - (i === 2 ? 1 : 0); k++) { x.fillStyle = ['#ffe066', '#ff9fc6', '#8ee3f5', '#b8f28a'][(i + k) % 4]; x.fillRect(24 + i * 165, 108 + k * 64, 130, 52); }
    });
    B(0.06, 1.75, 2.75, 0xb8bccb, g, xl + 0.03, 2.3, zb + 17.5);
    add(new THREE.PlaneGeometry(2.6, 1.62), new THREE.MeshStandardMaterial({ map: texFrom(c), roughness: 0.6 }), g, xl + 0.065, 2.3, zb + 17.5, false).rotation.y = Math.PI / 2;
  }
  // Fontaine à eau
  B(0.5, 1.0, 0.5, 0xeef0f4, g, xl + 0.35, 0.5, zb + 14.1);
  add(new THREE.CylinderGeometry(0.18, 0.18, 0.5, 10), new THREE.MeshStandardMaterial({ color: 0x7cc8ff, transparent: true, opacity: 0.7, roughness: 0.1 }), g, xl + 0.35, 1.25, zb + 14.1);
  // Coin détente
  const lounge = new THREE.Group(); lounge.position.set(xl, 0, D / 2 - 2.7); g.add(lounge);
  rug(lounge, 4.4, 3.6, 0.5, 0xe8a27a, 2.6, 0);
  const sofaC = 0x3d8f8a;
  B(1.0, 0.42, 2.5, sofaC, lounge, 0.85, 0.3, 0); B(0.3, 0.75, 2.5, sofaC, lounge, 0.5, 0.7, 0);
  for (const s of [-1, 1]) { B(1.0, 0.6, 0.26, sofaC, lounge, 0.85, 0.42, s * 1.35); B(0.72, 0.13, 1.12, shade(sofaC, 0.2).getHex(), lounge, 0.96, 0.58, s * 0.57); }
  B(0.18, 0.32, 0.5, 0xf2b134, lounge, 0.72, 0.82, 0.6).rotation.z = 0.25;
  B(1.0, 0.07, 1.5, 0xc98f5a, lounge, 2.5, 0.45, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(0.06, 0.42, 0.06, 0x2b2740, lounge, 2.5 + sx * 0.42, 0.21, sz * 0.66);
  CY(0.07, 0.06, 0.12, 8, 0xffffff, lounge, 2.4, 0.55, 0.3); B(0.3, 0.05, 0.4, 0x4a8fe0, lounge, 2.6, 0.51, -0.3);
  const arm = new THREE.Group(); arm.position.set(4.3, 0, 0.2); arm.rotation.y = Math.PI; lounge.add(arm);
  B(0.9, 0.4, 1.0, 0xf2b134, arm, 0, 0.3, 0); B(0.25, 0.7, 1.0, 0xf2b134, arm, -0.35, 0.65, 0);
  for (const s of [-1, 1]) B(0.9, 0.55, 0.2, 0xf2b134, arm, 0, 0.4, s * 0.55);
  lamp(lounge, 0.5, 0, 1.95, 0xf4efe6, { tall: true, max: 6, dist: 7 });
  plant(lounge, 0.55, 0, -1.9, 1.1, 'tall');
  // Plantes dans les coins
  plant(g, -W / 2 + 1.1, 0, -D / 2 + 1.1, 1.3, 'tall');
  plant(g, W / 2 - 1.0, 0, -D / 2 + 1.0, 1.2, 'tall');
  // Baie de serveurs avec LED
  const rack = new THREE.Group(); rack.position.set(W / 2 - 1.1, 0, zb + 3.3); rack.rotation.y = -Math.PI / 2; g.add(rack);
  B(1.0, 2.3, 0.8, 0x2b2740, rack, 0, 1.15, 0);
  const ledOn = new THREE.MeshBasicMaterial({ color: 0x3dff9a }), ledOff = new THREE.MeshBasicMaterial({ color: 0x1b4a35 });
  for (let r = 0; r < 7; r++) {
    B(0.86, 0.22, 0.02, 0x3b3552, rack, 0, 0.35 + r * 0.28, 0.41, false);
    for (let k = 0; k < 4; k++) {
      const led = add(new THREE.BoxGeometry(0.05, 0.05, 0.02), ledOff, rack, -0.3 + k * 0.09, 0.35 + r * 0.28, 0.425, false);
      world.leds.push({ m: led, on: ledOn, off: ledOff, rate: 0.8 + srand() * 3, ph: srand() * 6 });
    }
  }
}

function buildReception(L, profile, idx) {
  const P = new THREE.Vector3(L.W / 2 - 5.4, 0, L.D / 2 - 3.9);
  const s = new THREE.Group(); s.position.copy(P); scene.add(s);
  const look = { name: profile.owner, role: profile.role, ...profile.look };
  rug(s, 5.2, 3.8, 0.6, 0xd9cbe8, 0, 0.3);
  B(3.6, 1.1, 0.9, 0xf7f2ea, s, 0, 0.55, 0.55);
  B(3.8, 0.08, 1.1, 0xc98f5a, s, 0, 1.14, 0.5);
  B(3.62, 0.16, 0.02, 0xff4f9a, s, 0, 0.22, 1.01, false);
  const [c, x] = makeCanvas(512, 128);
  x.fillStyle = '#f7f2ea'; x.fillRect(0, 0, 512, 128);
  x.fillStyle = '#2b2740'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `700 46px ${FONT}`; x.fillText('ACCUEIL', 256, 50);
  x.fillStyle = '#ff3d8b'; x.font = `500 24px ${MONO}`; x.fillText(`${profile.owner.toLowerCase()}.studio`, 256, 96);
  add(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshStandardMaterial({ map: texFrom(c), roughness: 0.9 }), s, 0, 0.66, 1.012, false);
  // Ordinateur portable + sonnette
  const lap = new THREE.Group(); lap.position.set(-0.9, 1.18, 0.35); lap.rotation.y = 0.5; s.add(lap);
  B(0.55, 0.03, 0.38, 0xb8bccb, lap, 0, 0.015, 0);
  B(0.55, 0.36, 0.02, 0xb8bccb, lap, 0, 0.19, -0.19).rotation.x = -0.25;
  add(new THREE.SphereGeometry(0.09, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), 0xf2b134, s, 1.1, 1.18, 0.7);
  lamp(s, 1.45, 1.18, 0.15, 0xff4f9a, { max: 3.5 });
  plant(s, 2.4, 0, 0.6, 1.0, 'tall');
  const agent = new Agent(look, idx); agent.root.position.set(0.15, 0, -0.35); s.add(agent.root);
  const now = profile.experience?.find((e) => e.current);
  const project = {
    slug: 'accueil', title: profile.owner, short: 'Accueil', icon: '👋', tagline: profile.role, description: profile.bio,
    stack: profile.skills, experience: profile.experience, status: now ? `${now.role} chez ${now.org}` : '',
    repo: profile.github ? `https://github.com/${profile.github}` : '', demo: '', images: [], contact: true, look,
  };
  project.cover = makeCover(project, look);
  return {
    idx, type: 'host', project, look, agent, group: s, num: '👋', lines: profile.lines,
    center: new THREE.Vector3(0.15, 1.35, 0.1), camOff: new THREE.Vector3(1.9, 1.5, 6.4),
    hitSize: [4.2, 2.6, 2.6], hitPos: [0, 1.3, 0.2],
  };
}

function buildDesk(p, idx, P) {
  const look = p.look, acc = look.shirt;
  const s = new THREE.Group(); s.position.copy(P); scene.add(s);
  const num = String(idx).padStart(2, '0');
  const spot = floorSpot(s, 4.7, 3.5, acc, 0.75, 0.3);
  // Cloison + post-it + enseigne
  B(3.4, 1.5, 0.12, shade(acc, 0.55).getHex(), s, 0, 0.75, -1.45);
  B(3.5, 0.08, 0.16, 0x8a5a3b, s, 0, 1.52, -1.45);
  const posts = [0xffe066, 0xff9fc6, 0x8ee3f5, 0xb8f28a];
  for (let k = 0; k < 6; k++) B(0.17, 0.17, 0.012, posts[k % 4], s, -1.45 + srand() * 2.9, 0.55 + srand() * 0.75, -1.383, false).rotation.z = (srand() - 0.5) * 0.3;
  for (const sx of [-0.8, 0.8]) B(0.05, 0.3, 0.05, 0x3b3552, s, sx, 1.7, -1.45);
  B(2.1, 0.44, 0.08, 0x2b2740, s, 0, 2.02, -1.45);
  add(new THREE.PlaneGeometry(2.0, 0.375), new THREE.MeshBasicMaterial({ map: signTexture(num, p.short, hex(acc)) }), s, 0, 2.02, -1.405, false);
  // Bureau
  B(2.5, 0.09, 1.15, 0xd8a56f, s, 0, 0.9, 0);
  for (const sx of [-1, 1]) B(0.07, 0.86, 1.0, 0xf3f0ea, s, sx * 1.15, 0.43, 0);
  B(2.3, 0.5, 0.04, 0xf3f0ea, s, 0, 0.6, -0.45);
  // Écran animé
  const mon = new THREE.Group(); mon.position.set(-0.25, 0.945, -0.22); mon.rotation.y = 0.32; s.add(mon);
  B(0.42, 0.03, 0.26, 0x2b2740, mon, 0, 0.015, 0); B(0.07, 0.38, 0.05, 0x2b2740, mon, 0, 0.2, -0.04);
  B(1.24, 0.76, 0.06, 0x1e1b2c, mon, 0, 0.72, 0);
  const screen = createScreen(p, idx);
  add(new THREE.PlaneGeometry(1.16, 0.68), new THREE.MeshBasicMaterial({ map: screen.tex, toneMapped: false }), mon, 0, 0.72, 0.032, false);
  B(0.72, 0.03, 0.22, 0x2b2740, s, -0.2, 0.96, 0.28); B(0.09, 0.03, 0.14, 0x2b2740, s, 0.38, 0.96, 0.3);
  CY(0.07, 0.06, 0.14, 8, acc, s, 0.75, 1.015, 0.28);
  plant(s, -1.0, 0.945, 0.25, 0.42);
  lamp(s, 0.95, 0.945, -0.3, shade(acc, 0.3).getHex(), { max: 3 });
  // Chaise
  const ch = new THREE.Group(); ch.position.set(-0.25, 0, -0.95); s.add(ch);
  B(0.6, 0.08, 0.55, acc, ch, 0, 0.55, 0); B(0.56, 0.6, 0.08, acc, ch, 0, 0.9, -0.26);
  CY(0.04, 0.04, 0.45, 6, 0x2b2740, ch, 0, 0.3, 0);
  for (let k = 0; k < 5; k++) { const leg = B(0.05, 0.04, 0.32, 0x2b2740, ch, 0, 0.06, 0); leg.rotation.y = (k / 5) * Math.PI * 2; leg.translateZ(0.16); }
  // Agent
  const agent = new Agent(look, idx); agent.root.position.set(1.6, 0, 0.4); s.add(agent.root);
  p.cover = makeCover(p, look);
  return {
    idx, type: 'desk', project: p, look, agent, group: s, num, spot, screen, lines: p.lines,
    center: new THREE.Vector3(0.75, 1.2, 0.1), camOff: new THREE.Vector3(2.6, 1.9, 7.6),
    hitSize: [4.4, 2.8, 3.4], hitPos: [0.7, 1.4, -0.1],
  };
}

function buildDust({ W, D }) {
  const n = Math.round(W * D * 0.4), pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos.set([(Math.random() - 0.5) * W, 0.3 + Math.random() * 4, (Math.random() - 0.5) * D], i * 3);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const [c, g] = makeCanvas(64, 64);
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const m = new THREE.PointsMaterial({ size: 0.07, map: texFrom(c), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff1d6 });
  world.dust = new THREE.Points(geo, m);
  scene.add(world.dust);
}

/* Construit tout le local à partir des données de l'API ; renvoie les stations [accueil, ...bureaux] */
export function buildWorld(profile, projects) {
  const L = layout(projects.length);
  world.L = L;
  buildRoom(L, profile);
  decorate(L);
  world.stations.push(buildReception(L, profile, 0));
  projects.forEach((p, i) => world.stations.push(buildDesk(p, i + 1, L.pos[i])));
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  for (const st of world.stations) {
    const hb = new THREE.Mesh(new THREE.BoxGeometry(...st.hitSize), hitMat);
    hb.position.set(...st.hitPos); hb.userData.station = st.idx;
    st.group.add(hb); world.hit.push(hb);
  }
  buildDust(L);
  return world.stations;
}
