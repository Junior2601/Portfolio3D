import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Agent } from './Agent.js';
import { bookShelf } from './library.js';
import { Nav } from './nav.js';
import { createScreen, makeCover } from './screens.js';
import { courseScreen } from './training.js';
import { scene, world } from './world-state.js';
import {
  B, CY, EMOJI, FONT, MONO, SP, add, fit, floorSpot, hex, makeCanvas, mat, reseed, rr, rug, shade, soft, softDot, srand, texFrom,
} from './utils.js';

const UP = new THREE.Vector3(0, 1, 0);
const PART_H = 2.7; // hauteur des cloisons vitrées
const GLASS = new THREE.MeshStandardMaterial({ color: 0xd4ecf7, transparent: true, opacity: 0.2, roughness: 0.08, metalness: 0.1, depthWrite: false });
// L'agent d'accueil, si le profil n'en décrit pas
const HOST_LOOK = { name: 'Bienvenue', role: "Agent d'accueil", shirt: 0xd6457a, pants: 0x2d2a44, skin: 0x6b4226, hair: 0x120c0a, hairStyle: 'long', acc: 'headset', g: 'f', blip: 600 };

/* Meuble posé au sol : les agents le contournent. (x, z) = centre dans le repère de son groupe */
const solid = (group, x, z, w, d, pad) => world.nav.block(group.position.x + x, group.position.z + z, w, d, pad);

/* Endroit où un agent peut se rendre : il s'y arrête et regarde dans la direction yaw */
function addSpot(kind, x, z, yaw, more) {
  const s = { kind, pos: new THREE.Vector3(x, 0, z), yaw, busy: null, ...more };
  world.spots.push(s);
  return s;
}

/* Plan du local. À gauche, du fond vers l'avant : la bibliothèque, la salle de formation (dans le même compartiment)
   puis l'accueil. À droite, l'espace cowork : 3 colonnes de bureaux jusqu'à 6 projets, puis 4, et autant de rangées que nécessaire */
export function layout(n) {
  const cols = n <= 6 ? 3 : 4, rows = Math.max(2, Math.ceil(n / cols)), sx = 5.4, sz = 5.6, side = 10;
  const W = side + cols * sx + 2.4, D = Math.max(22, (rows - 1) * sz + 11);
  const xl = -W / 2 + 0.35, x1 = -W / 2 + side, cx = (x1 + W / 2) / 2; // mur de gauche, cloison du cowork, milieu du cowork
  const zA = D / 2 - 8, zT = zA - 7; // début de l'accueil, de la salle de formation
  const pos = [...Array(n)].map((_, i) => new THREE.Vector3(
    cx - 0.7 + ((i % cols) - (cols - 1) / 2) * sx, 0, -((rows - 1) * sz) / 2 - 0.4 + Math.floor(i / cols) * sz,
  ));
  return { cols, rows, W, D, xl, x1, cx, zA, zT, pos };
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

/* Nuages sur une couche à part, qui défile derrière les fenêtres (dessinés deux fois pour boucler sans raccord) */
function makeClouds() {
  const [c, g] = makeCanvas(1024, 320);
  reseed(42);
  g.fillStyle = 'rgba(255,255,255,.85)';
  for (let i = 0; i < 6; i++) {
    const x = srand() * 1024, y = 40 + srand() * 90;
    for (const ox of [0, -1024]) for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + ox + k * 26, y + (k % 2) * -8, 34, 18, 0, 0, 7); g.fill(); }
  }
  return texFrom(c);
}

/* Le néon, au fond de l'espace cowork */
function buildNeon(g, { D, cx }, profile) {
  const [c, x] = makeCanvas(1024, 300);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `700 118px ${FONT}`;
  const txt = `${profile.owner.toLowerCase()}.studio`;
  for (const [blur, col] of [[44, '#ff4f9a'], [18, '#ff7ab8'], [0, '#fff0f7']]) { x.shadowColor = '#ff3d8b'; x.shadowBlur = blur; x.fillStyle = col; x.fillText(txt, 512, 118); }
  x.font = `700 40px ${MONO}`;
  for (const [blur, col] of [[22, '#4fd8ff'], [0, '#e9fbff']]) { x.shadowColor = '#2fc6ff'; x.shadowBlur = blur; x.fillStyle = col; x.fillText(profile.role.toUpperCase(), 512, 238); }
  const m = new THREE.MeshBasicMaterial({ map: texFrom(c), transparent: true, toneMapped: false, depthWrite: false });
  add(new THREE.PlaneGeometry(5.8, 1.7), m, g, cx, 2.95, -D / 2 + 0.37, false);
  world.neon = m;
  const l = new THREE.PointLight(0xff4f9a, 0, 8, 1.6); l.position.set(cx, 3, -D / 2 + 1.2); g.add(l);
  world.lamps.push({ light: l, max: 5 });
}

function buildRoom(L, profile) {
  const { W, D } = L;
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
  // Fenêtres avec ville (jour / nuit en fondu) : une dans la bibliothèque, deux dans le cowork, de part et d'autre du néon
  const clouds = makeClouds(), skyD = makeSky(false), skyN = makeSky(true), winW = 4.4, winH = 2.3, winY = 2.75, z = -D / 2 + T + 0.01;
  [-W / 2 + 5.2, (L.x1 + L.cx - 2.9) / 2, (L.cx + 2.9 + W / 2 - 1.6) / 2].forEach((wx, i) => {
    const td = skyD.clone(), tn = skyN.clone(), tc = clouds.clone();
    for (const t of [td, tn, tc]) { t.repeat.set(0.5, 1); t.offset.set(i * 0.25, 0); t.wrapS = THREE.RepeatWrapping; t.needsUpdate = true; }
    add(new THREE.PlaneGeometry(winW, winH), new THREE.MeshBasicMaterial({ map: td }), g, wx, winY, z, false);
    add(new THREE.PlaneGeometry(winW, winH), new THREE.MeshBasicMaterial({ map: tc, transparent: true, depthWrite: false }), g, wx, winY, z + 0.002, false);
    world.clouds.push(tc);
    addSpot('window', wx, -D / 2 + 1.35, Math.PI);
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
  buildNeon(g, L, profile);
}

/* Cloison vitrée façon verrière, de a à b : le long de x (à z = at) ou de z (à x = at).
   doors = [[début, fin], ...] : ouvertures surmontées d'une imposte ; seules les vitres bloquent le passage */
function glassWall(g, axis, at, a, b, doors = []) {
  const frame = mat(0x2b2740, 0.5);
  const put = (c, len, y, h, t, m, shadows = true) => (axis === 'x' ? B(len, h, t, m, g, c, y, at, shadows) : B(t, h, len, m, g, at, y, c, shadows));
  put((a + b) / 2, b - a, PART_H, 0.1, 0.1, frame);
  let s = a;
  for (const [d0, d1] of [...doors, [b, b]]) {
    const len = d0 - s, c = (s + d0) / 2;
    if (len > 0.05) {
      put(c, len, PART_H / 2, PART_H, 0.03, GLASS, false);
      put(c, len, 0.05, 0.1, 0.1, frame);
      put(c, len, 1.05, 0.05, 0.07, frame);
      const n = Math.max(1, Math.round(len / 1.3));
      for (let k = 0; k <= n; k++) put(s + (k * len) / n, 0.06, PART_H / 2, PART_H, 0.08, frame);
      if (axis === 'x') world.nav.block(c, at, len, 0.1); else world.nav.block(at, c, 0.1, len);
    }
    if (d1 > d0) {
      put((d0 + d1) / 2, d1 - d0, 2.2, 0.08, 0.1, frame);
      put((d0 + d1) / 2, d1 - d0, (2.2 + PART_H) / 2, PART_H - 2.2, 0.03, GLASS, false);
    }
    s = d1;
  }
}

/* Enseigne posée sur la cloison du cowork, tournée vers lui (+x) */
function zoneSign(g, x, z, icon, title, color) {
  const s = new THREE.Group(); s.position.set(x, PART_H + 0.32, z); s.rotation.y = Math.PI / 2; g.add(s);
  B(2.1, 0.44, 0.06, 0x2b2740, s, 0, 0, 0);
  add(new THREE.PlaneGeometry(2.0, 0.375), new THREE.MeshBasicMaterial({ map: signTexture(icon, title, color) }), s, 0, 0, 0.035, false);
  for (const sx of [-0.8, 0.8]) B(0.04, 0.12, 0.04, 0x3b3552, s, sx, -0.27, 0);
}

/* Les compartiments : cowork | bibliothèque et salle de formation | accueil */
function buildPartitions(L) {
  const g = new THREE.Group(); scene.add(g);
  const { D, xl, x1, zA, zT } = L;
  const libDoor = [zT - 2.4, zT - 0.8], hallDoor = [zA + 0.5, zA + 2.1];
  glassWall(g, 'z', x1, -D / 2 + 0.35, D / 2, [libDoor, hallDoor]);
  glassWall(g, 'x', zT, xl, x1 - 0.05, [[x1 - 2.6, x1 - 1.0]]);
  glassWall(g, 'x', zA, xl, x1 - 0.05);
  zoneSign(g, x1, (libDoor[0] + libDoor[1]) / 2, '📚', 'Bibliothèque', '#6a7bd9');
  zoneSign(g, x1, (zT + zA) / 2, '🎓', 'Salle de formation', '#ff3d8b');
  zoneSign(g, x1, (hallDoor[0] + hallDoor[1]) / 2, '👋', 'Accueil', '#d6457a');
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

/* Chaise de bureau : le piétement reste au sol, l'assise pivote (life.js la fait suivre son occupant).
   (x, z) dans le repère du groupe, yaw = direction du regard une fois assis.
   Renvoie le siège : hauteur, centre, et où se placer pour s'y asseoir */
function deskChair(s, x, z, color, yaw = Math.PI) {
  const frame = soft(0x2b2740, 0.45), fabric = soft(shade(color, -0.62).getHex(), 0.75);
  const ch = new THREE.Group(); ch.position.set(x, 0, z); s.add(ch);
  for (let k = 0; k < 5; k++) {
    const spoke = new THREE.Group(); spoke.rotation.y = 0.3 + (k / 5) * Math.PI * 2; ch.add(spoke);
    CY(0.018, 0.026, 0.3, 6, frame, spoke, 0, 0.095, 0.14).rotation.x = Math.PI / 2 + 0.18;
    SP(0.03, 8, 6, frame, spoke, 0, 0.03, 0.27);
  }
  CY(0.03, 0.04, 0.3, 10, frame, ch, 0, 0.23, 0);
  const top = new THREE.Group(); top.rotation.y = yaw; ch.add(top);
  add(new RoundedBoxGeometry(0.5, 0.09, 0.48, 3, 0.04), fabric, top, 0, 0.425, 0.02);
  B(0.05, 0.26, 0.03, frame, top, 0, 0.55, -0.245);
  add(new RoundedBoxGeometry(0.4, 0.38, 0.06, 3, 0.03), fabric, top, 0, 0.82, -0.25).rotation.x = -0.05;
  const seat = new THREE.Vector3(s.position.x + x, 0, s.position.z + z);
  const c = { top, yaw, rest: yaw, turn: yaw, height: 0.47, seat, pos: seat.clone().add(new THREE.Vector3(0.45, 0, 0.05).applyAxisAngle(UP, yaw - Math.PI)) };
  world.chairs.push(c);
  return c;
}

/* Chaise simple (salle de formation, table de lecture), tournée vers yaw */
function classChair(parent, x, z, yaw, color) {
  const ch = new THREE.Group(); ch.position.set(x, 0, z); ch.rotation.y = yaw; parent.add(ch);
  const frame = soft(0x2b2740, 0.45), fabric = soft(color, 0.7);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) CY(0.018, 0.018, 0.46, 6, frame, ch, sx * 0.19, 0.23, sz * 0.19);
  add(new RoundedBoxGeometry(0.46, 0.05, 0.46, 2, 0.02), fabric, ch, 0, 0.475, 0);
  for (const sx of [-1, 1]) CY(0.015, 0.015, 0.4, 6, frame, ch, sx * 0.19, 0.68, -0.21);
  add(new RoundedBoxGeometry(0.44, 0.3, 0.04, 2, 0.02), fabric, ch, 0, 0.8, -0.22).rotation.x = -0.08;
}

/* Tabouret haut, pour travailler derrière un comptoir */
function stool(s, x, z, color) {
  const frame = soft(0x2b2740, 0.45);
  CY(0.2, 0.22, 0.03, 16, frame, s, x, 0.05, z); // posé sur le tapis
  CY(0.025, 0.03, 0.66, 10, frame, s, x, 0.34, z);
  add(new THREE.TorusGeometry(0.16, 0.012, 6, 18), frame, s, x, 0.3, z).rotation.x = Math.PI / 2;
  CY(0.19, 0.17, 0.05, 18, soft(color, 0.75), s, x, 0.675, z);
}

/* Fauteuil ouvert vers +x (retourné vers -x avec rotY = PI) */
function armchair(parent, x, z, rotY, color) {
  const arm = new THREE.Group(); arm.position.set(x, 0, z); arm.rotation.y = rotY; parent.add(arm);
  B(0.9, 0.4, 1.0, color, arm, 0, 0.3, 0); B(0.25, 0.7, 1.0, color, arm, -0.35, 0.65, 0);
  for (const s of [-1, 1]) B(0.9, 0.55, 0.2, color, arm, 0, 0.4, s * 0.55);
}

function signTexture(num, title, color) {
  const [c, g] = makeCanvas(512, 96);
  g.fillStyle = '#2b2740'; g.fillRect(0, 0, 512, 96);
  g.fillStyle = color; rr(g, 12, 14, 84, 68, 12); g.fill();
  g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'center';
  g.font = `700 34px ${/^\d+$/.test(num) ? MONO : EMOJI}`; g.fillText(num, 54, 50);
  g.textAlign = 'left'; g.font = `700 34px ${FONT}`; g.fillText(fit(g, title, 380), 116, 50);
  return texFrom(c);
}

/* Vapeur qui monte d'une tasse : petits nuages animés par life.js */
function steam(parent, x, y, z) {
  for (let k = 0; k < 4; k++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), transparent: true, opacity: 0, depthWrite: false }));
    s.position.set(x, y, z); parent.add(s);
    world.steam.push({ s, x, y, z, ph: k / 4 });
  }
}

/* Affiche accrochée au mur de gauche */
function poster(g, xl, z, draw) {
  const [c, x] = makeCanvas(256, 340); draw(x);
  B(0.06, 1.62, 1.24, 0x2b2740, g, xl + 0.03, 2.4, z);
  add(new THREE.PlaneGeometry(1.12, 1.5), new THREE.MeshStandardMaterial({ map: texFrom(c), roughness: 0.9 }), g, xl + 0.065, 2.4, z, false).rotation.y = Math.PI / 2;
}

/* Horloge murale à l'heure réelle, cadran tourné vers +x */
function wallClock(g, x, y, z) {
  const ck = new THREE.Group(); ck.position.set(x, y, z); g.add(ck);
  CY(0.46, 0.46, 0.05, 20, 0x2b2740, ck, 0, 0, 0).rotation.z = Math.PI / 2;
  CY(0.41, 0.41, 0.06, 20, 0xfffaf0, ck, 0.01, 0, 0).rotation.z = Math.PI / 2;
  const hand = (len, wdt, color) => { const p = new THREE.Group(); p.position.x = 0.06; ck.add(p); B(0.015, len, wdt, color, p, 0, len / 2 - 0.04, 0, false); return p; };
  world.clock = { h: hand(0.24, 0.045, 0x2b2740), m: hand(0.34, 0.03, 0x2b2740), s: hand(0.36, 0.012, 0xff4f9a) };
}

/* Bibliothèque : l'étagère des livres recommandés, une table de lecture et une banquette de livres sous la fenêtre */
function libraryRoom(L, recos) {
  const g = new THREE.Group(); scene.add(g);
  const { W, D, xl, x1, zT } = L, zb = -D / 2;
  const wood = 0x8a5a3b, spines = [0xff6b4a, 0x4a8fe0, 0xf2b134, 0x2fb39f, 0x8b6cf0, 0xe0656f, 0xf4efe6, 0x2b2740];
  const spine = () => spines[Math.floor(srand() * spines.length)];
  // Étagère : les deux rangées du milieu sont réservées aux livres recommandés
  const sh = new THREE.Group(); sh.position.set(xl, 0, zb + 3.6); g.add(sh);
  B(0.06, 2.8, 2.6, 0x6d452d, sh, 0.03, 1.4, 0);
  for (const s of [-1, 1]) B(0.5, 2.8, 0.08, wood, sh, 0.25, 1.4, s * 1.26);
  for (let k = 0; k < 5; k++) B(0.5, 0.07, 2.52, wood, sh, 0.25, 0.05 + k * 0.68, 0);
  for (let k = 0; k < 4; k++) {
    if (recos.length && (k === 1 || k === 2)) continue;
    for (let zz = -1.15; zz < 1.05;) {
      const w = 0.08 + srand() * 0.1, h = 0.36 + srand() * 0.22;
      if (srand() < 0.1) { zz += 0.22; continue; }
      B(0.34, h, w, spine(), sh, 0.27, 0.09 + k * 0.68 + h / 2, zz + w / 2);
      zz += w + 0.012;
    }
  }
  if (recos.length) world.library = bookShelf(sh, recos);
  plant(sh, 0.25, 2.77, 1.05, 0.55);
  lamp(sh, 0.25, 2.77, -1.05, 0xf2b134, { max: 4 });
  solid(sh, 0.25, 0, 0.5, 2.6);
  addSpot('shelf', xl + 0.95, zb + 3.0, -Math.PI / 2); addSpot('shelf', xl + 0.95, zb + 4.2, -Math.PI / 2);
  // Banquette de livres sous la fenêtre
  const wx = -W / 2 + 5.2, bz = zb + 0.58;
  B(4.3, 0.06, 0.48, wood, g, wx, 1.0, bz); B(4.2, 0.08, 0.46, wood, g, wx, 0.04, bz); B(4.2, 0.05, 0.44, wood, g, wx, 0.5, bz);
  B(4.2, 1.0, 0.04, 0x6d452d, g, wx, 0.5, bz - 0.21);
  for (const s of [-1, 1]) B(0.06, 1.0, 0.46, wood, g, wx + s * 2.1, 0.5, bz);
  for (const y of [0.08, 0.525]) {
    for (let x = wx - 2.0; x < wx + 1.9;) {
      const w = 0.07 + srand() * 0.08, h = 0.28 + srand() * 0.12;
      if (srand() < 0.08) { x += 0.2; continue; }
      B(w, h, 0.3, spine(), g, x + w / 2, y + h / 2, bz + 0.04);
      x += w + 0.01;
    }
  }
  plant(g, wx + 1.7, 1.03, bz, 0.45);
  solid(g, wx, bz, 4.3, 0.48);
  // Table de lecture et ses deux chaises
  const tx = xl + 5.6, tz = zb + 4.4;
  rug(g, 4.4, 3.2, 0.5, 0xd9b48f, tx, tz);
  CY(0.62, 0.62, 0.05, 20, 0xd8a56f, g, tx, 0.74, tz);
  CY(0.05, 0.07, 0.72, 8, 0x2b2740, g, tx, 0.36, tz); CY(0.3, 0.32, 0.04, 14, 0x2b2740, g, tx, 0.02, tz);
  lamp(g, tx + 0.25, 0.765, tz - 0.25, 0x2fb39f, { max: 3 });
  B(0.22, 0.03, 0.3, 0xc2453d, g, tx - 0.15, 0.78, tz + 0.15).rotation.y = 0.4;
  solid(g, tx, tz, 1.3, 1.3, 0.1);
  for (const s of [-1, 1]) {
    const yaw = -s * Math.PI / 2, x = tx + s * 0.95;
    classChair(g, x, tz, yaw, 0x6a7bd9);
    addSpot('seat', x, tz + 0.55, yaw, { seat: new THREE.Vector3(x, 0, tz), height: 0.5 });
  }
  poster(g, xl, zT - 0.9, (x) => {
    x.fillStyle = '#2b2740'; x.fillRect(0, 0, 256, 340);
    ['#4fd8ff', '#ff4f9a', '#f2b134', '#2fb39f'].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.moveTo(40 + i * 44, 240); x.lineTo(62 + i * 44, 200 - i * 34); x.lineTo(84 + i * 44, 240); x.fill(); });
    x.fillStyle = '#fff'; x.font = `700 26px ${MONO}`; x.textAlign = 'center'; x.fillText('RAG·AGENTS', 128, 290); x.fillText('·DATA·', 128, 320);
  });
  plant(g, x1 - 0.9, 0, zb + 1.0, 1.2, 'tall');
  solid(g, x1 - 0.9, zb + 1.0, 0.7, 0.7);
  return sh;
}

/* Salle de formation, dans le compartiment de la bibliothèque : grand écran des formations, horloge,
   bureau du formateur et deux rangées de places tournées vers l'écran. Repère : coin (mur de gauche, cloison du fond) */
function trainingRoom(L, profile) {
  const { xl, x1, zT, zA } = L, d = zA - zT, sz = d / 2 + 0.1; // sz : centre de l'écran
  const look = { name: profile.owner, role: profile.role, ...profile.look }, acc = look.accent ?? look.shirt;
  const g = new THREE.Group(); g.position.set(xl, 0, zT); scene.add(g);
  rug(g, 6.0, d - 0.8, 0.4, 0xc3cbe0, 6.3, d / 2);
  // Écran au mur et horloge au-dessus
  B(0.08, 2.2, 3.78, 0x1e1b2c, g, 0.04, 2.15, sz);
  const scr = new THREE.Group(); scr.position.set(0.09, 2.15, sz); scr.rotation.y = Math.PI / 2; g.add(scr);
  world.training = courseScreen(scr, profile.education ?? [], look, 3.6, 2.03);
  wallClock(g, 0.05, 3.88, sz);
  // Bureau du formateur, face à la salle
  B(0.75, 0.05, 1.3, 0xd8a56f, g, 1.8, 0.76, 1.1);
  for (const s of [-1, 1]) B(0.7, 0.74, 0.05, 0xf3f0ea, g, 1.8, 0.37, 1.1 + s * 0.6);
  B(0.26, 0.02, 0.34, 0xb8bccb, g, 1.72, 0.795, 1.1);
  B(0.02, 0.24, 0.34, 0xb8bccb, g, 1.86, 0.92, 1.1).rotation.z = -0.25;
  CY(0.06, 0.05, 0.12, 8, 0xffffff, g, 2.0, 0.845, 0.6);
  plant(g, 1.95, 0.785, 1.6, 0.35);
  const chair = deskChair(g, 1.05, 1.1, acc, Math.PI / 2);
  solid(g, 1.8, 1.1, 0.75, 1.3); solid(g, 1.05, 1.1, 0.5, 0.5, 0.1);
  // Deux rangées de places : table, chaise, cahier ou portable
  const colors = [0x4a8fe0, 0xf2b134, 0x2fb39f, 0xff6b4a, 0x8b6cf0, 0xe0656f];
  [4.7, 6.9].forEach((u, r) => {
    B(0.55, 0.05, 4.6, 0xf3f0ea, g, u - 0.55, 0.74, sz);
    for (const s of [-1, 1]) B(0.5, 0.72, 0.05, 0x2b2740, g, u - 0.55, 0.36, sz + s * 2.2);
    solid(g, u - 0.55, sz, 0.55, 4.6, 0.1);
    [sz - 1.6, sz, sz + 1.6].forEach((v, k) => {
      classChair(g, u, v, -Math.PI / 2, colors[r * 3 + k]);
      if ((r + k) % 2) B(0.22, 0.012, 0.3, 0xffe066, g, u - 0.62, 0.772, v);
      else { B(0.24, 0.02, 0.32, 0x2b2740, g, u - 0.58, 0.775, v); B(0.02, 0.2, 0.32, 0x2b2740, g, u - 0.72, 0.87, v).rotation.z = 0.2; }
      addSpot('lesson', xl + u, zT + v + 0.55, -Math.PI / 2, { seat: new THREE.Vector3(xl + u, 0, zT + v), height: 0.5 });
    });
  });
  plant(g, x1 - xl - 0.7, 0, d - 0.7, 1.1, 'tall');
  solid(g, x1 - xl - 0.7, d - 0.7, 0.7, 0.7);
  return { group: g, chair, look };
}

/* Distributeur de boissons, façade vers +x ; il s'éclaire la nuit */
function vending(g, x, z) {
  const [c, k] = makeCanvas(256, 448);
  k.fillStyle = '#2b2740'; k.fillRect(0, 0, 256, 448);
  k.fillStyle = '#ff4f9a'; rr(k, 12, 12, 232, 44, 10); k.fill();
  k.fillStyle = '#fff'; k.font = `700 23px ${FONT}`; k.textAlign = 'center'; k.textBaseline = 'middle'; k.fillText('BOISSONS · CAFÉ', 128, 35);
  const grd = k.createLinearGradient(0, 64, 0, 334); grd.addColorStop(0, '#e6f4ff'); grd.addColorStop(1, '#9fc4e0');
  k.fillStyle = grd; rr(k, 12, 64, 170, 270, 8); k.fill();
  const cans = ['#ff6b4a', '#4a8fe0', '#f2b134', '#2fb39f', '#e0656f', '#8b6cf0', '#3d8f8a', '#f4efe6'];
  for (let r = 0; r < 5; r++) {
    for (let i = 0; i < 4; i++) {
      k.fillStyle = cans[(r * 3 + i) % cans.length]; rr(k, 22 + i * 40, 72 + r * 52, 28, 38, 6); k.fill();
      k.fillStyle = 'rgba(255,255,255,.4)'; k.fillRect(26 + i * 40, 77 + r * 52, 5, 28);
    }
    k.fillStyle = 'rgba(43,39,64,.4)'; k.fillRect(12, 112 + r * 52, 170, 4);
  }
  k.fillStyle = '#12101c'; rr(k, 192, 70, 52, 30, 6); k.fill();
  k.fillStyle = '#3dff9a'; k.font = `700 15px ${MONO}`; k.fillText('0,50', 218, 86);
  for (let r = 0; r < 4; r++) for (let i = 0; i < 2; i++) { k.fillStyle = '#d9d4cb'; rr(k, 196 + i * 24, 112 + r * 30, 20, 22, 4); k.fill(); }
  k.fillStyle = '#12101c'; rr(k, 210, 250, 16, 40, 4); k.fill();
  rr(k, 30, 360, 196, 64, 10); k.fill();
  k.fillStyle = '#8a8aa0'; k.font = `700 16px ${MONO}`; k.fillText('POUSSER', 128, 392);
  const tex = texFrom(c), face = new THREE.MeshStandardMaterial({ map: tex, emissive: 0x777777, emissiveMap: tex, emissiveIntensity: 0, roughness: 0.4 });
  world.glow.push(face);
  const m = new THREE.Group(); m.position.set(x, 0, z); m.rotation.y = Math.PI / 2; g.add(m);
  B(1.05, 1.95, 0.8, 0xd6455a, m, 0, 0.975, 0);
  add(new THREE.PlaneGeometry(0.95, 1.66), face, m, 0, 1.03, 0.405, false);
  solid(g, x, z, 0.8, 1.05);
}

/* Fontaine à eau (les bulles montent quand quelqu'un se sert) */
function fountain(g, x, z) {
  B(0.5, 1.0, 0.5, 0xeef0f4, g, x, 0.5, z);
  add(new THREE.CylinderGeometry(0.18, 0.18, 0.5, 10), new THREE.MeshStandardMaterial({ color: 0x7cc8ff, transparent: true, opacity: 0.7, roughness: 0.1 }), g, x, 1.25, z);
  solid(g, x, z, 0.5, 0.5);
  world.tank = {
    spot: addSpot('fountain', x + 0.63, z, -Math.PI / 2),
    bubbles: [-1, 0, 1].map((k) => SP(0.025, 6, 4, 0xffffff, g, x + k * 0.07, 1.05, z + k * 0.05, false)),
  };
}

/* Coin détente : divan contre le mur, table basse et fauteuil */
function lounge(g, xl, z) {
  const lounge = new THREE.Group(); lounge.position.set(xl, 0, z); g.add(lounge);
  rug(lounge, 4.2, 3.4, 0.5, 0xe8a27a, 2.3, 0);
  const sofaC = 0x3d8f8a;
  B(1.0, 0.36, 2.5, sofaC, lounge, 0.85, 0.2, 0); B(0.3, 0.95, 2.5, sofaC, lounge, 0.5, 0.52, 0);
  for (const s of [-1, 1]) { B(1.0, 0.5, 0.26, sofaC, lounge, 0.85, 0.3, s * 1.35); B(0.72, 0.13, 1.12, shade(sofaC, 0.2).getHex(), lounge, 0.96, 0.42, s * 0.57); }
  B(0.18, 0.32, 0.5, 0xf2b134, lounge, 0.72, 0.66, 0.6).rotation.z = 0.25;
  B(1.0, 0.07, 1.5, 0xc98f5a, lounge, 2.5, 0.45, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(0.06, 0.42, 0.06, 0x2b2740, lounge, 2.5 + sx * 0.42, 0.21, sz * 0.66);
  CY(0.07, 0.06, 0.12, 8, 0xffffff, lounge, 2.4, 0.55, 0.3); B(0.3, 0.05, 0.4, 0x4a8fe0, lounge, 2.6, 0.51, -0.3);
  steam(lounge, 2.4, 0.62, 0.3);
  armchair(lounge, 4.0, 0.2, Math.PI, 0xf2b134);
  lamp(lounge, 0.5, 0, 1.95, 0xf4efe6, { tall: true, max: 6, dist: 7 });
  plant(lounge, 0.55, 0, -1.9, 1.1, 'tall');
  solid(lounge, 0.7, 0, 1.3, 3.0, 0.15); solid(lounge, 2.5, 0, 1.0, 1.5, 0.15); solid(lounge, 4.0, 0.2, 1.1, 1.3, 0.15);
  solid(lounge, 0.5, 1.95, 0.5, 0.5); solid(lounge, 0.55, -1.9, 0.7, 0.7);
  for (const sz of [-0.57, 0.57]) addSpot('seat', xl + 1.38, z + sz, Math.PI / 2, { seat: new THREE.Vector3(xl + 0.92, 0, z + sz), height: 0.485, feet: 0.46, lean: -0.12 });
  addSpot('seat', xl + 3.35, z + 0.2, -Math.PI / 2, { seat: new THREE.Vector3(xl + 3.85, 0, z + 0.2), height: 0.5 });
}

/* L'accueil, à part, à l'avant : distributeur, fontaine à eau et divan (le comptoir est construit avec son agent) */
function accueilRoom({ xl, zA }) {
  const g = new THREE.Group(); scene.add(g);
  vending(g, xl + 0.45, zA + 1.3);
  addSpot('coffee', xl + 1.45, zA + 1.3, -Math.PI / 2);
  fountain(g, xl + 0.35, zA + 2.75);
  lounge(g, xl, zA + 5.75);
  poster(g, xl, zA + 5.75, (x) => {
    x.fillStyle = '#ff6b4a'; x.fillRect(0, 0, 256, 340);
    x.fillStyle = '#ffd166'; x.beginPath(); x.arc(128, 130, 80, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.font = `700 52px ${FONT}`; x.textAlign = 'center'; x.fillText('SHIP', 128, 268); x.fillText('IT', 128, 318);
    x.fillStyle = '#fff'; x.font = `70px ${EMOJI}`; x.fillText('🚀', 128, 156);
  });
}

/* Espace cowork : tableau « roadmap » contre la cloison, baie de serveurs, plantes */
function coworkDecor({ W, D, x1 }) {
  const g = new THREE.Group(); scene.add(g);
  const zb = -D / 2;
  const [c, x] = makeCanvas(512, 320);
  x.fillStyle = '#fbfbf8'; x.fillRect(0, 0, 512, 320);
  x.fillStyle = '#2b2740'; x.font = `700 34px ${FONT}`; x.fillText('Roadmap', 24, 50);
  ['À faire', 'En cours', 'En ligne'].forEach((col, i) => {
    x.fillStyle = '#8f98c2'; x.font = `700 16px ${MONO}`; x.fillText(col, 24 + i * 165, 92);
    for (let k = 0; k < 3 - (i === 2 ? 1 : 0); k++) { x.fillStyle = ['#ffe066', '#ff9fc6', '#8ee3f5', '#b8f28a'][(i + k) % 4]; x.fillRect(24 + i * 165, 108 + k * 64, 130, 52); }
  });
  const bz = zb + 2.6;
  B(0.06, 1.75, 2.75, 0xb8bccb, g, x1 + 0.1, 1.55, bz);
  add(new THREE.PlaneGeometry(2.6, 1.62), new THREE.MeshStandardMaterial({ map: texFrom(c), roughness: 0.6 }), g, x1 + 0.135, 1.55, bz, false).rotation.y = Math.PI / 2;
  addSpot('board', x1 + 0.85, bz - 0.6, -Math.PI / 2); addSpot('board', x1 + 0.85, bz + 0.6, -Math.PI / 2);
  // Baie de serveurs avec LED, contre le mur du fond
  const rack = new THREE.Group(); rack.position.set(W / 2 - 0.9, 0, zb + 0.8); g.add(rack);
  B(1.0, 2.3, 0.8, 0x2b2740, rack, 0, 1.15, 0);
  solid(g, W / 2 - 0.9, zb + 0.8, 1.0, 0.8);
  addSpot('rack', W / 2 - 0.9, zb + 2.0, Math.PI);
  const ledOn = new THREE.MeshBasicMaterial({ color: 0x3dff9a }), ledOff = new THREE.MeshBasicMaterial({ color: 0x1b4a35 });
  for (let r = 0; r < 7; r++) {
    B(0.86, 0.22, 0.02, 0x3b3552, rack, 0, 0.35 + r * 0.28, 0.41, false);
    for (let k = 0; k < 4; k++) {
      const led = add(new THREE.BoxGeometry(0.05, 0.05, 0.02), ledOff, rack, -0.3 + k * 0.09, 0.35 + r * 0.28, 0.425, false);
      world.leds.push({ m: led, on: ledOn, off: ledOff, rate: 0.8 + srand() * 3, ph: srand() * 6 });
    }
  }
  plant(g, x1 + 0.9, 0, zb + 1.0, 1.2, 'tall');
  plant(g, W / 2 - 0.9, 0, D / 2 - 0.9, 1.2, 'tall');
  solid(g, x1 + 0.9, zb + 1.0, 0.7, 0.7); solid(g, W / 2 - 0.9, D / 2 - 0.9, 0.7, 0.7);
}

/* Le comptoir d'accueil et l'agent Bienvenue : cliquer dessus ouvre le chat (rendez-vous, questions) */
function buildReception(L, profile, idx) {
  const P = new THREE.Vector3(L.xl + 6.8, 0, L.zA + 3.3);
  const s = new THREE.Group(); s.position.copy(P); scene.add(s);
  const rec = profile.reception ?? {}, look = { ...HOST_LOOK, ...rec.agent };
  rug(s, 4.6, 3.4, 0.6, 0xd9cbe8, 0, 0.3);
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
  plant(s, 2.35, 0, 0.6, 1.0, 'tall');
  solid(s, 0, 0.2, 3.8, 1.7); solid(s, 2.35, 0.6, 0.6, 0.6);
  stool(s, 0.15, -0.35, 0xc98f5a);
  const agent = new Agent(look, idx); agent.root.position.set(0.15, 0, -0.35); s.add(agent.root);
  const owner = profile.owner;
  const project = {
    slug: 'accueil', title: 'Accueil', short: 'Accueil', icon: '👋', look,
    tagline: `Rendez-vous et questions pour ${owner}`, description: `${look.name} transmet chaque demande à ${owner} par e-mail.`,
  };
  const lines = rec.lines?.length ? rec.lines : [
    `Bienvenue au ${owner.toLowerCase()}.studio ! Moi c'est ${look.name}, l'agent d'accueil.`,
    `Tu veux un rendez-vous avec ${owner}, ou tu as une question ? Écris-moi dans le chat : je lui transmets tout par e-mail.`,
  ];
  return {
    idx, type: 'host', project, look, agent, group: s, num: '👋', lines, stool: { height: 0.7, feet: 0.2 },
    center: new THREE.Vector3(0.15, 1.35, 0.1), camOff: new THREE.Vector3(-0.8, 1.6, 6.6), // de face : la cloison du cowork reste hors champ
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
  // Chaise, face au clavier
  const chair = deskChair(s, -0.2, 0.9, acc);
  solid(s, 0, -0.45, 3.4, 2.1); solid(s, -0.2, 0.95, 0.5, 0.5, 0.1);
  // Agent
  const agent = new Agent(look, idx); agent.root.position.set(1.6, 0, 0.4); s.add(agent.root);
  solid(s, 1.6, 0.4, 0.2, 0.2);
  p.cover = makeCover(p, look);
  return {
    idx, type: 'desk', project: p, look, agent, group: s, num, spot, screen, lines: p.lines,
    center: new THREE.Vector3(0.75, 1.2, 0.1), camOff: new THREE.Vector3(2.6, 1.9, 7.6),
    hitSize: [4.4, 2.8, 3.4], hitPos: [0.7, 1.4, -0.1], chair,
  };
}

/* La bibliothèque : une station comme les autres, avec une bibliothécaire et des livres à sortir de l'étagère */
function buildLibrary(lib, idx, sh) {
  const look = lib.agent, floor = floorSpot(sh, 3.4, 4.3, look.shirt, 1.6, 0.4);
  B(0.06, 0.36, 1.6, 0x2b2740, sh, 0.03, 3.2, 0);
  add(new THREE.PlaneGeometry(1.52, 0.285), new THREE.MeshBasicMaterial({ map: signTexture('📚', 'Mes lectures', hex(look.shirt)) }), sh, 0.065, 3.2, 0, false).rotation.y = Math.PI / 2;
  const agent = new Agent(look, idx);
  agent.root.position.set(1.05, 0, 1.75); agent.yaw = agent.root.rotation.y = Math.PI / 2; sh.add(agent.root);
  solid(sh, 1.05, 1.75, 0.2, 0.2);
  // Fauteuil de lecture, dans le coin du fond
  armchair(sh, 0.62, -2.45, 0, shade(look.shirt, 0.15).getHex());
  solid(sh, 0.62, -2.45, 0.9, 1.3, 0.1);
  const seatAt = (x) => new THREE.Vector3(sh.position.x + x, 0, sh.position.z - 2.45);
  const chair = { seat: seatAt(0.8), pos: seatAt(1.25), yaw: Math.PI / 2, height: 0.5, gesture: 'read', held: 'book' };
  for (const b of world.library.items) { b.mesh.userData.station = idx; world.hit.push(b.mesh); }
  const project = {
    slug: 'bibliotheque', title: 'Bibliothèque', short: 'Bibliothèque', icon: '📚', tagline: lib.tagline, description: lib.description,
    stack: [], repo: '', demo: '', images: [], books: lib.books, look,
  };
  return {
    idx, type: 'library', project, look, agent, group: sh, num: '📚', spot: floor, lines: lib.lines,
    center: new THREE.Vector3(0.75, 1.35, 0.55), camOff: new THREE.Vector3(6.4, 1.5, 2.3),
    hitSize: [1.7, 3, 4.4], hitPos: [0.75, 1.5, 0.5], chair,
  };
}

/* La salle de formation : Paul y présente son parcours ; choisir une formation la met en avant sur l'écran */
function buildTraining(profile, idx, { group: g, chair, look }) {
  const spot = floorSpot(g, 2.6, 5.6, look.accent ?? look.shirt, 1.3, 4.0);
  const agent = new Agent(look, idx);
  agent.root.position.set(1.3, 0, 5.6); agent.yaw = agent.root.rotation.y = 1.3; g.add(agent.root);
  solid(g, 1.3, 5.6, 0.2, 0.2);
  for (const m of world.training.items) { m.userData.station = idx; world.hit.push(m); }
  const now = profile.experience?.find((e) => e.current);
  const project = {
    slug: 'formation', title: 'Mes formations', short: 'Formation', icon: '🎓', tagline: profile.role, description: profile.bio,
    stack: profile.skills, experience: profile.experience, courses: profile.education ?? [], status: now ? `${now.role} chez ${now.org}` : '',
    repo: profile.github ? `https://github.com/${profile.github}` : '', demo: '', images: [], meeting: true, look,
  };
  project.cover = makeCover(project, look);
  return {
    idx, type: 'training', project, look, agent, group: g, num: '🎓', spot, lines: profile.lines, chair,
    chatSpot: new THREE.Vector3(1.1, 0, 0), // un collègue vient lui parler côté salle, pas contre la cloison
    center: new THREE.Vector3(1.2, 2.0, 4.4), camOff: new THREE.Vector3(7.4, 1.9, 1.6),
    hitSize: [1.8, 3.2, 5.6], hitPos: [0.9, 1.6, 4.0],
  };
}

function buildDust({ W, D }) {
  const n = Math.round(W * D * 0.4), pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos.set([(Math.random() - 0.5) * W, 0.3 + Math.random() * 4, (Math.random() - 0.5) * D], i * 3);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ size: 0.07, map: softDot(), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff1d6 });
  world.dust = new THREE.Points(geo, m);
  scene.add(world.dust);
}

/* Construit tout le local à partir des données de l'API ;
   renvoie les stations [accueil, ...bureaux, bibliothèque, salle de formation] */
export function buildWorld(profile, projects) {
  const L = layout(projects.length), recos = profile.library?.books ?? [];
  world.L = L;
  world.nav = new Nav(L.W, L.D);
  buildRoom(L, profile);
  buildPartitions(L);
  const shelf = libraryRoom(L, recos), classroom = trainingRoom(L, profile);
  accueilRoom(L);
  coworkDecor(L);
  world.stations.push(buildReception(L, profile, 0));
  projects.forEach((p, i) => world.stations.push(buildDesk(p, i + 1, L.pos[i])));
  if (recos.length) world.stations.push(buildLibrary(profile.library, world.stations.length, shelf));
  world.stations.push(buildTraining(profile, world.stations.length, classroom));
  const hitMat = new THREE.MeshBasicMaterial({ visible: false }), bodyGeo = new THREE.BoxGeometry(0.9, 2.2, 0.9);
  for (const st of world.stations) {
    const hb = new THREE.Mesh(new THREE.BoxGeometry(...st.hitSize), hitMat);
    hb.position.set(...st.hitPos); hb.userData.station = st.idx;
    st.group.add(hb); world.hit.push(hb);
    // On peut aussi cliquer sur l'agent là où il se trouve, même loin de son bureau
    const body = new THREE.Mesh(bodyGeo, hitMat);
    body.position.y = 1.1; body.userData.station = st.idx;
    st.agent.root.add(body); world.hit.push(body);
  }
  buildDust(L);
  return world.stations;
}
