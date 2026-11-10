import * as THREE from 'three';

export const { clamp, damp, lerp } = THREE.MathUtils;
export const angleTo = (from, to) => THREE.MathUtils.euclideanModulo(to - from + Math.PI, Math.PI * 2) - Math.PI;
export const hex = (n) => '#' + new THREE.Color(n).getHexString();
export const uiColor = (look) => hex(look.accent ?? look.shirt);
export const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
export const shade = (n, k) => new THREE.Color(n).lerp(new THREE.Color(k >= 0 ? 0xffffff : 0x000000), Math.abs(k));
export const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export const FONT = '"Space Grotesk", system-ui, sans-serif';
export const MONO = '"JetBrains Mono", ui-monospace, monospace';
export const EMOJI = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

// Hasard reproductible : le décor est identique à chaque visite
let seed = 12345;
export const srand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
export const reseed = (s) => { seed = s; };

const mats = new Map();
export function mat(color, rough = 0.82, flatShading = true) {
  const key = color + '|' + rough + '|' + flatShading;
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, flatShading }));
  return mats.get(key);
}
/* Surface lisse (personnages, chaises) : les facettes sont réservées au décor */
export const soft = (color, rough = 0.7) => mat(color, rough, false);
/* Volume de révolution : profil [[rayon, hauteur], ...] listé de bas en haut, adouci par une courbe */
export function lathe(profile, seg = 14) {
  const pts = new THREE.SplineCurve(profile.map(([r, y]) => new THREE.Vector2(r, y))).getPoints((profile.length - 1) * 4);
  for (const p of pts) p.x = Math.max(p.x, 0);
  return new THREE.LatheGeometry(pts, seg);
}
export function add(geo, material, parent, x = 0, y = 0, z = 0, shadows = true) {
  const m = new THREE.Mesh(geo, typeof material === 'number' ? mat(material) : material);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = shadows;
  parent.add(m);
  return m;
}
export const B = (w, h, d, c, p, x, y, z, s) => add(new THREE.BoxGeometry(w, h, d), c, p, x, y, z, s);
export const CY = (rt, rb, h, seg, c, p, x, y, z, s) => add(new THREE.CylinderGeometry(rt, rb, h, seg), c, p, x, y, z, s);
export const SP = (r, ws, hs, c, p, x, y, z, s) => add(new THREE.SphereGeometry(r, ws, hs), c, p, x, y, z, s);

export function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
export function texFrom(canvas) { const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
/* Tache douce : poussière, vapeur */
let softTex = null;
export function softDot() {
  if (!softTex) {
    const [c, g] = makeCanvas(64, 64);
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    softTex = texFrom(c);
  }
  return softTex;
}
export function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
export function fit(g, text, maxW) {
  if (g.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && g.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}
export function wrapLines(g, text, maxW) {
  const lines = []; let cur = '';
  for (const w of text.split(' ')) {
    const test = cur ? cur + ' ' + w : w;
    if (g.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}
export function roundedShape(w, d, r) {
  const s = new THREE.Shape(), hw = w / 2, hd = d / 2;
  s.moveTo(-hw + r, -hd); s.lineTo(hw - r, -hd); s.quadraticCurveTo(hw, -hd, hw, -hd + r);
  s.lineTo(hw, hd - r); s.quadraticCurveTo(hw, hd, hw - r, hd); s.lineTo(-hw + r, hd);
  s.quadraticCurveTo(-hw, hd, -hw, hd - r); s.lineTo(-hw, -hd + r); s.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
  return s;
}
/* Tapis (léger relief) */
export function rug(parent, w, d, r, color, x, z) {
  const geo = new THREE.ExtrudeGeometry(roundedShape(w, d, r), { depth: 0.03, bevelEnabled: false, curveSegments: 6 });
  const m = add(geo, mat(color, 0.95), parent, x, 0, z);
  m.rotation.x = -Math.PI / 2; m.castShadow = false;
  return m;
}
/* Halo lumineux au sol sous un bureau */
export function floorSpot(parent, w, d, color, x, z) {
  const m = new THREE.Mesh(new THREE.ShapeGeometry(roundedShape(w, d, 0.6), 6),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.035, z);
  parent.add(m);
  return m;
}
