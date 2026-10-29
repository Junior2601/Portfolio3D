import * as THREE from 'three';
import { B, CY, SP, add, clamp, damp, mat, shade } from './utils.js';

const _v = new THREE.Vector3();

/* Personnage low-poly : respire, cligne des yeux, salue, parle et suit la caméra du regard */
export class Agent {
  constructor(look, idx) {
    this.look = look; this.idx = idx;
    this.root = new THREE.Group();
    this.rig = new THREE.Group(); this.root.add(this.rig);
    const skin = mat(look.skin), shirt = mat(look.shirt), pants = mat(look.pants ?? 0x2d3142), dark = mat(0x1d1b26), hairM = mat(look.hair);
    for (const s of [-1, 1]) {
      B(0.17, 0.72, 0.19, pants, this.rig, s * 0.11, 0.44, 0);
      B(0.19, 0.09, 0.3, dark, this.rig, s * 0.11, 0.045, 0.04);
    }
    CY(0.31, 0.29, 0.14, 7, pants, this.rig, 0, 0.82, 0);
    this.torso = CY(0.25, 0.31, 0.72, 7, shirt, this.rig, 0, 1.15, 0);
    CY(0.13, 0.16, 0.06, 7, shade(look.shirt, -0.18).getHex(), this.rig, 0, 1.52, 0);
    CY(0.08, 0.09, 0.14, 6, skin, this.rig, 0, 1.58, 0);
    this.head = new THREE.Group(); this.head.position.set(0, 1.83, 0); this.rig.add(this.head);
    SP(0.26, 9, 7, skin, this.head);
    add(new THREE.ConeGeometry(0.035, 0.08, 4), skin, this.head, 0, -0.02, 0.27).rotation.x = Math.PI / 2;
    this.eyes = [-1, 1].map((s) => B(0.05, 0.075, 0.03, dark, this.head, s * 0.09, 0.04, 0.235, false));
    this.mouth = B(0.11, 0.025, 0.03, 0x7a2e2e, this.head, 0, -0.1, 0.232, false);
    this.buildHair(look, hairM);
    this.buildAccessory(look, dark);
    this.arms = [-1, 1].map((s) => {
      const pivot = new THREE.Group(); pivot.position.set(s * 0.34, 1.45, 0); this.rig.add(pivot);
      CY(0.075, 0.065, 0.6, 6, shirt, pivot, 0, -0.3, 0);
      SP(0.075, 6, 5, skin, pivot, 0, -0.64, 0);
      return pivot;
    });
    this.talking = false; this.focused = false; this.hovered = false;
    this.waveUntil = 0; this.blink = 1 + Math.random() * 3; this.phase = Math.random() * 10;
  }

  buildHair(look, hm) {
    const h = this.head;
    const top = (r = 0.285, th = 0.42) => add(new THREE.SphereGeometry(r, 10, 5, 0, Math.PI * 2, 0, Math.PI * th), hm, h, 0, 0.02, -0.01);
    const back = (r = 0.28, th = 0.62) => add(new THREE.SphereGeometry(r, 10, 6, Math.PI, Math.PI, 0, Math.PI * th), hm, h, 0, 0.01, -0.02);
    switch (look.hairStyle) {
      case 'long': top(0.29, 0.42); back(0.295, 0.75); B(0.5, 0.55, 0.14, hm, h, 0, -0.32, -0.17); break;
      case 'bun': top(); back(); SP(0.13, 8, 6, hm, h, 0, 0.27, -0.12); break;
      case 'bob': top(0.3, 0.44); back(0.3, 0.72); for (const s of [-1, 1]) B(0.08, 0.3, 0.3, hm, h, s * 0.26, -0.06, -0.02); break;
      case 'curly': add(new THREE.IcosahedronGeometry(0.32, 1), hm, h, 0, 0.16, -0.07); break;
      case 'cap': {
        back(0.28, 0.55);
        const capM = mat(look.cap ?? 0x2a5bd7);
        CY(0.285, 0.29, 0.14, 10, capM, h, 0, 0.17, 0);
        add(new THREE.SphereGeometry(0.285, 10, 4, 0, Math.PI * 2, 0, Math.PI * 0.3), capM, h, 0, 0.2, 0);
        B(0.3, 0.03, 0.22, capM, h, 0, 0.12, 0.3).rotation.x = -0.12;
        break;
      }
      default: top(0.285, 0.4); back(0.28, 0.6);
    }
  }

  buildAccessory(look, dark) {
    const h = this.head;
    if (look.acc === 'headset') {
      add(new THREE.TorusGeometry(0.3, 0.022, 5, 14, Math.PI), dark, h, 0, 0.02, 0);
      for (const s of [-1, 1]) CY(0.07, 0.07, 0.06, 10, dark, h, s * 0.29, 0, 0).rotation.z = Math.PI / 2;
      const mic = B(0.02, 0.02, 0.24, dark, h, -0.25, -0.09, 0.12); mic.rotation.y = -0.45;
      SP(0.03, 6, 4, look.shirt, h, -0.2, -0.1, 0.23);
    } else if (look.acc === 'glasses') {
      for (const s of [-1, 1]) add(new THREE.TorusGeometry(0.06, 0.013, 5, 12), dark, h, s * 0.095, 0.04, 0.262);
      B(0.06, 0.012, 0.012, dark, h, 0, 0.05, 0.266);
    } else if (look.acc === 'tie') {
      B(0.1, 0.07, 0.04, 0xd6334a, this.rig, 0, 1.45, 0.25);
      B(0.08, 0.34, 0.03, 0xd6334a, this.rig, 0, 1.26, 0.275).rotation.x = -0.08;
    } else if (look.acc === 'badge') {
      B(0.13, 0.09, 0.02, 0xffffff, this.rig, 0.12, 1.33, 0.27).rotation.x = -0.08;
    }
  }

  update(t, dt, camPos) {
    const k = t + this.phase, breath = Math.sin(k * 2.1);
    this.rig.position.y = breath * 0.01;
    this.torso.scale.x = this.torso.scale.z = 1 + breath * 0.012;
    if ((this.blink -= dt) < 0) this.blink = 2 + Math.random() * 4;
    for (const e of this.eyes) e.scale.y = this.blink < 0.12 ? 0.15 : 1;
    const talk = this.talking ? 0.7 + Math.abs(Math.sin(k * 16)) * 2.6 * (0.55 + 0.45 * Math.sin(k * 4.7)) : 1;
    this.mouth.scale.y = damp(this.mouth.scale.y, talk, 25, dt);
    // Regarder la caméra quand on est survolé ou présenté
    const loc = this.root.worldToLocal(_v.copy(camPos));
    const attentive = this.focused || this.hovered;
    const yaw = clamp(Math.atan2(loc.x, loc.z), -1.1, 1.1);
    this.rig.rotation.y = damp(this.rig.rotation.y, this.focused ? yaw * 0.55 : 0, 3.5, dt);
    const headYaw = attentive ? clamp(yaw - this.rig.rotation.y, -0.7, 0.7) : Math.sin(k * 0.37) * 0.35;
    const pitch = attentive ? clamp(-Math.atan2(loc.y - 1.85, Math.hypot(loc.x, loc.z)), -0.35, 0.3) : 0.05;
    this.head.rotation.y = damp(this.head.rotation.y, headYaw, 5, dt);
    this.head.rotation.x = damp(this.head.rotation.x, pitch + (this.talking ? Math.sin(k * 5.5) * 0.05 : 0), 5, dt);
    this.head.rotation.z = damp(this.head.rotation.z, this.talking ? Math.sin(k * 2.3) * 0.05 : 0, 4, dt);
    // Bras : salut, gestes en parlant, repos
    const [R, L] = this.arms;
    let rz = -0.1, rx = 0, lz = 0.1, lx = 0;
    if (t < this.waveUntil) { rz = -2.6 + Math.sin(k * 12) * 0.35; rx = -0.15; }
    else if (this.talking) { rz = -0.75 + Math.sin(k * 2.2) * 0.18; rx = -0.55 + Math.sin(k * 3.1) * 0.2; lz = 0.2 + Math.sin(k * 3.7) * 0.1; lx = -0.35 + Math.sin(k * 4.3 + 1) * 0.3; }
    R.rotation.z = damp(R.rotation.z, rz, 9, dt); R.rotation.x = damp(R.rotation.x, rx, 9, dt);
    L.rotation.z = damp(L.rotation.z, lz, 9, dt); L.rotation.x = damp(L.rotation.x, lx, 9, dt);
  }
}
