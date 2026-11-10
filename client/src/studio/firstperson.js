import * as THREE from 'three';
import { scene, world } from './world-state.js';
import { angleTo, clamp, damp, reduceMotion } from './utils.js';

export const EYE = 1.62; // hauteur des yeux du visiteur
const WALK = 3.0; // vitesse de marche vers un point cliqué (m/s)
const KEY_SPEED = 2.6, KEY_TURN = 2.1; // clavier : m/s, rad/s
const LOOK = 0.0034; // sensibilité du regard à la souris (rad/pixel, pour un champ de 60°)
const PITCH = [-1.0, 0.8];
const BODY = 0.22; // rayon du visiteur : il ne frôle pas les murs
// Touches physiques : WASD en QWERTY = ZQSD en AZERTY
const KEYS = {
  KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', KeyD: 'r', ArrowLeft: 'tl', ArrowRight: 'tr',
};
const _d = new THREE.Vector3();

const isTyping = (el) => el?.closest?.('input, textarea, select, [contenteditable="true"]');

function ring(color, opacity) {
  const m = new THREE.Mesh(
    new THREE.RingGeometry(0.2, 0.28, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false }),
  );
  m.rotation.x = -Math.PI / 2; m.renderOrder = 3; m.visible = false;
  scene.add(m);
  return m;
}

/* Le visiteur à la première personne : regard à la souris, marche vers un point cliqué (en contournant les meubles
   grâce au plan de circulation des agents), déplacement au clavier. Le moteur l'appelle à chaque image. */
export class FirstPerson {
  constructor(camera, { canMove = () => true, onManual = () => {} } = {}) {
    this.camera = camera; this.canMove = canMove; this.onManual = onManual;
    this.pos = new THREE.Vector3(); this.yaw = 0; this.pitch = 0;
    this.active = false;
    this.path = []; this.left = 0; this.speed = 0; this.face = null;
    this.keys = new Set(); this.stride = 0;
    this.hoverRing = ring(0xffffff, 0.6);
    this.goalRing = ring(0xff3d8b, 0.9);
    addEventListener('keydown', (e) => {
      const k = KEYS[e.code];
      if (!k || !this.active || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || !this.canMove()) return;
      e.preventDefault();
      this.keys.add(k);
    });
    addEventListener('keyup', (e) => this.keys.delete(KEYS[e.code]));
    addEventListener('blur', () => this.keys.clear());
  }

  /* Point regardé, à 1 m devant les yeux (sert aux transitions de caméra) */
  lookPoint(pos = this.pos, yaw = this.yaw, pitch = this.pitch) {
    const c = Math.cos(pitch);
    return new THREE.Vector3(pos.x - Math.sin(yaw) * c, EYE + Math.sin(pitch), pos.z - Math.cos(yaw) * c);
  }

  eye(pos = this.pos) { return new THREE.Vector3(pos.x, EYE, pos.z); }

  setPose(pos, yaw, pitch = 0) {
    this.pos.set(pos.x, 0, pos.z); this.yaw = yaw; this.pitch = clamp(pitch, ...PITCH);
    this.stop();
  }

  /* Cap et inclinaison pour regarder un point depuis la position pos */
  static aim(pos, target) {
    const dx = target.x - pos.x, dz = target.z - pos.z, dy = target.y - EYE;
    return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
  }

  /* Glisser à la souris ou au doigt : tourner la tête */
  look(dx, dy) {
    const k = LOOK * (this.camera.fov / 60);
    this.yaw -= dx * k;
    this.pitch = clamp(this.pitch - dy * k, ...PITCH);
    this.face = null; // le visiteur reprend la main sur le regard
  }

  free(x, z) {
    const nav = world.nav;
    return nav.isFree(x, z) && nav.isFree(x + BODY, z) && nav.isFree(x - BODY, z) && nav.isFree(x, z + BODY) && nav.isFree(x, z - BODY);
  }

  /* Case libre la plus proche (on ne marche pas dans un meuble) */
  snap(p) {
    if (this.free(p.x, p.z)) return p.clone().setY(0);
    const c = world.nav.nearest(p.x, p.z);
    return c < 0 ? null : world.nav.center(c);
  }

  /* Marche jusqu'à to, puis se tourne vers face { yaw, pitch } si fourni. Renvoie la durée estimée (s), ou -1 */
  walkTo(to, face = null, { mark = false } = {}) {
    const goal = this.snap(to);
    if (!goal) return -1;
    const path = goal.distanceTo(this.pos) < 0.05 ? [] : world.nav.path(this.pos, goal);
    if (goal.distanceTo(this.pos) >= 0.05 && !path.length) return -1;
    this.path = path; this.face = face;
    this.left = 0;
    let prev = this.pos;
    for (const p of path) { this.left += prev.distanceTo(p); prev = p; }
    this.goalRing.visible = mark && path.length > 0;
    if (mark) { this.goalRing.position.set(goal.x, 0.03, goal.z); this.goalRing.scale.setScalar(1.4); this.goalRing.material.opacity = 0.9; }
    return reduceMotion ? 0.05 : this.left / WALK + (face ? 0.5 : 0.2);
  }

  stop() {
    this.path = []; this.left = 0; this.speed = 0; this.face = null;
    this.goalRing.visible = false;
  }

  /* Anneau au sol, sous le curseur : là où l'on ira en cliquant */
  hover(p) {
    const r = this.hoverRing;
    if (!p || !this.active) { r.visible = false; return; }
    r.visible = true;
    r.position.set(p.x, 0.025, p.z);
  }

  hide() { this.hoverRing.visible = false; this.goalRing.visible = false; }

  move(fwd, side, dt) {
    const s = KEY_SPEED * dt, sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    _d.set(-sin * fwd + cos * side, 0, -cos * fwd - sin * side).normalize().multiplyScalar(s);
    const { x, z } = this.pos;
    if (this.free(x + _d.x, z + _d.z)) this.pos.set(x + _d.x, 0, z + _d.z);
    else if (this.free(x + _d.x, z)) this.pos.x = x + _d.x; // glisse le long du mur
    else if (this.free(x, z + _d.z)) this.pos.z = z + _d.z;
    return true;
  }

  update(dt) {
    const k = this.keys;
    let moved = 0;
    if (this.active && k.size) {
      const fwd = (k.has('f') ? 1 : 0) - (k.has('b') ? 1 : 0), side = (k.has('r') ? 1 : 0) - (k.has('l') ? 1 : 0);
      const turn = (k.has('tl') ? 1 : 0) - (k.has('tr') ? 1 : 0);
      if (fwd || side) {
        if (this.path.length || this.face) this.stop();
        this.onManual();
        this.move(fwd, side, dt);
        moved = KEY_SPEED;
      }
      if (turn) { this.yaw += turn * KEY_TURN * dt; this.face = null; }
    }
    // Marche le long du trajet
    if (this.path.length) {
      const p = this.path[0];
      _d.set(p.x - this.pos.x, 0, p.z - this.pos.z);
      const dist = _d.length();
      this.speed = damp(this.speed, Math.min(WALK, this.left * 2.2 + 0.35), 6, dt);
      const step = Math.min(dist, this.speed * dt);
      if (dist > 1e-4) this.pos.addScaledVector(_d.multiplyScalar(1 / dist), step);
      this.left = Math.max(0, this.left - step);
      if (dist - step < 1e-3) this.path.shift();
      // Regarde où il va, puis vers sa destination dans les derniers pas
      if (!(this.face && this.left < 1.4) && dist > 0.05) {
        this.yaw += angleTo(this.yaw, Math.atan2(-_d.x, -_d.z)) * (1 - Math.exp(-5 * dt));
        this.pitch = damp(this.pitch, -0.06, 3, dt);
      }
      moved = this.speed;
      if (!this.path.length) { this.speed = 0; this.goalRing.visible = false; }
    }
    if (this.face && (!this.path.length || this.left < 1.4)) {
      const a = angleTo(this.yaw, this.face.yaw);
      this.yaw += a * (1 - Math.exp(-4.5 * dt));
      this.pitch = damp(this.pitch, this.face.pitch, 4.5, dt);
      if (!this.path.length && Math.abs(a) < 0.003 && Math.abs(this.pitch - this.face.pitch) < 0.003) this.face = null;
    }
    if (this.goalRing.visible) {
      const r = this.goalRing;
      r.scale.setScalar(damp(r.scale.x, 1, 6, dt));
    }
    // Léger balancement de la marche
    this.stride += moved * dt * 3.2;
    const bob = reduceMotion ? 0 : Math.sin(this.stride * 2) * 0.022 * Math.min(1, moved / WALK);
    this.camera.position.set(this.pos.x, EYE + bob, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
