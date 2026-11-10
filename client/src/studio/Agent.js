import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CY, EMOJI, SP, add, angleTo, clamp, damp, lathe, lerp, makeCanvas, shade, soft, texFrom } from './utils.js';

const { smoothstep } = THREE.MathUtils;
const _v = new THREE.Vector3();

// Proportions : le sol est à 0, les jambes pendent de la hanche, le buste pivote à la taille
const THIGH = 0.41, SHIN = 0.39, ANKLE = 0.08, HIP = THIGH + SHIN + ANKLE, WAIST = 1.06;
const SEAT_GAP = 0.09; // hanche au-dessus de l'assise
const EMOTE_Y = 2.62;
export const SIT = 0.7; // secondes pour s'asseoir ou se relever

/* Segment de membre effilé, suspendu à son articulation */
const limb = (top, end, len, bulge = 0) => lathe([
  [0, -len - end], [end * 0.5, -len - end * 0.87], [end * 0.87, -len - end * 0.5], [end, -len], [(top + end) / 2 + bulge, -len / 2],
  [top, 0], [top * 0.87, top * 0.5], [top * 0.5, top * 0.87], [0, top],
], 12);
const ellipsoid = (x, y, z, seg = 12) => new THREE.SphereGeometry(1, seg, Math.ceil(seg * 0.75)).scale(x, y, z);

/* Relève les coins de la bouche */
function smile(geo) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + p.getX(i) ** 2 * 3.5);
  return geo;
}

// Géométries partagées par tous les agents
const BODY = {
  thigh: limb(0.092, 0.064, THIGH),
  shin: limb(0.06, 0.042, SHIN, 0.012),
  upperArm: limb(0.066, 0.046, 0.29),
  foreArm: limb(0.044, 0.033, 0.27),
  cuff: new THREE.TorusGeometry(0.036, 0.009, 6, 14).rotateX(Math.PI / 2),
  hand: mergeGeometries([ellipsoid(0.04, 0.06, 0.026).translate(0, -0.05, 0), ellipsoid(0.015, 0.038, 0.015, 8).rotateZ(0.5).translate(0.038, -0.035, 0.01)]),
  shoe: ellipsoid(0.066, 0.05, 0.145).translate(0, -0.03, 0.05),
  sole: new THREE.CylinderGeometry(1, 1, 0.024, 14).scale(0.07, 1, 0.152).translate(0, -0.068, 0.05),
  pelvis: lathe([[0, 0.79], [0.12, 0.8], [0.172, 0.87], [0.15, 0.96], [0.125, 1.03], [0, 1.05]], 16).scale(1, 1, 0.6),
  head: lathe([[0, -0.235], [0.085, -0.225], [0.145, -0.165], [0.185, -0.065], [0.2, 0.04], [0.178, 0.14], [0.11, 0.205], [0, 0.228]], 20),
  ear: ellipsoid(0.02, 0.042, 0.03, 8),
  nose: ellipsoid(0.02, 0.026, 0.024, 8),
  eye: ellipsoid(0.021, 0.029, 0.011, 10),
  glint: new THREE.SphereGeometry(0.008, 6, 5),
  brow: ellipsoid(0.036, 0.0075, 0.009, 8),
  mouth: smile(ellipsoid(0.044, 0.0105, 0.012, 10)),
};
// Bustes : du bas de la chemise aux épaules, repère à la taille
const TORSO = {
  m: lathe([[0, -0.14], [0.174, -0.12], [0.158, 0], [0.17, 0.14], [0.19, 0.3], [0.2, 0.37], [0.172, 0.44], [0.09, 0.49], [0, 0.51]], 18).scale(1, 1, 0.72),
  f: lathe([[0, -0.14], [0.178, -0.12], [0.143, 0.02], [0.153, 0.15], [0.176, 0.29], [0.18, 0.37], [0.15, 0.44], [0.075, 0.49], [0, 0.51]], 18).scale(1, 1, 0.72),
};

/* Jambe à deux segments : angles de hanche et de genou pour poser la cheville dy sous la hanche et fz devant */
function legIK(dy, fz) {
  const d = Math.min(Math.hypot(dy, fz), THIGH + SHIN);
  const angle = (a, b, c) => Math.acos(clamp((a * a + b * b - c * c) / (2 * a * b), -1, 1));
  return [-Math.atan2(fz, dy) - angle(THIGH, d, SHIN), Math.PI - angle(THIGH, SHIN, d)];
}

/* Gestes du quotidien. rz/rx/re : épaule et coude droits, lz/lx/le : gauches, pitch/head : tête, lean : buste. k = temps */
const GESTURES = {
  read: (k) => ({ rz: 0.25, rx: -0.6, re: -1.1, lz: -0.25, lx: -0.6, le: -1.1, pitch: 0.4 + Math.sin(k * 0.6) * 0.05 }),
  phone: () => ({ rz: 0.25, rx: -0.7, re: -1.2, pitch: 0.42 }),
  sip: (k) => { const up = clamp(Math.sin(k * 1.1) * 2.5, 0, 1); return { rz: lerp(0.1, 0.25, up), rx: lerp(-0.55, -1.1, up), re: lerp(-1.2, -1.9, up), pitch: -0.2 * up }; },
  stretch: () => ({ rz: -2.85, rx: 0, re: 0, lz: 2.85, lx: 0, le: 0, pitch: -0.3 }),
  type: (k) => ({ rz: 0.12, rx: -0.75 + Math.sin(k * 14) * 0.04, re: -1.05, lz: -0.12, lx: -0.75 + Math.sin(k * 13 + 2) * 0.04, le: -1.05, pitch: 0.22, lean: 0.12 }),
  write: (k) => ({ rz: 0.05 + Math.sin(k * 3) * 0.22, rx: -1.7 + Math.sin(k * 5) * 0.12, re: -0.25, pitch: -0.12 }),
  pour: () => ({ rz: 0.1, rx: -0.95, re: -0.7, pitch: 0.22, lean: 0.06 }),
  reach: (k) => ({ rz: 0.1, rx: -1.5 + Math.sin(k * 2) * 0.15, re: -0.2, pitch: -0.08 }),
  cross: () => ({ rz: 0.5, rx: -0.5, re: -1.5, lz: -0.5, lx: -0.5, le: -1.5 }),
  look: (k) => ({ head: Math.sin(k * 1.3) * 0.75 }),
  nod: (k) => ({ pitch: 0.12 + Math.sin(k * 5) * 0.1 }),
  chat: (k) => ({ rz: -0.75 + Math.sin(k * 2.2) * 0.18, rx: -0.55 + Math.sin(k * 3.1) * 0.2, lz: 0.2 + Math.sin(k * 3.7) * 0.1, lx: -0.35 + Math.sin(k * 4.3 + 1) * 0.3, talk: true }),
};
const LAP = { rz: -0.06, rx: 0.05, re: -1.0, lz: 0.06, lx: 0.05, le: -1.0 }; // assis : mains sur les cuisses

const emotes = new Map();
function emoteTexture(emoji) {
  if (!emotes.has(emoji)) {
    const [c, g] = makeCanvas(128, 128);
    g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(64, 58, 52, 0, 7); g.fill();
    g.beginPath(); g.moveTo(50, 102); g.lineTo(64, 124); g.lineTo(78, 102); g.fill();
    g.fillStyle = '#000'; g.font = `60px ${EMOJI}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(emoji, 64, 62);
    emotes.set(emoji, texFrom(c));
  }
  return emotes.get(emoji);
}

/* Petite bulle à emoji au-dessus d'un personnage */
export class Emote {
  constructor(parent, y) {
    this.left = 0; this.size = 0;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, toneMapped: false }));
    this.sprite.position.y = y; this.sprite.visible = false; parent.add(this.sprite);
  }

  say(emoji, sec) {
    this.sprite.material.map = emoteTexture(emoji); this.sprite.material.needsUpdate = true;
    this.left = sec;
  }

  update(dt) {
    this.left -= dt;
    this.size = damp(this.size, this.left > 0 ? 0.62 : 0, 10, dt);
    this.sprite.visible = this.size > 0.01;
    this.sprite.scale.setScalar(this.size);
  }
}

/* Personnage aux formes lisses : respire, cligne des yeux, salue, parle, marche, s'assoit et suit la caméra du regard */
export class Agent {
  constructor(look, idx) {
    this.look = look; this.idx = idx;
    this.root = new THREE.Group();
    this.rig = new THREE.Group(); this.root.add(this.rig);
    const f = look.g === 'f';
    const skin = soft(look.skin, 0.55), shirt = soft(look.shirt, 0.72), pants = soft(look.pants ?? 0x2d3142, 0.78), dark = soft(0x1d1b26, 0.5), hairM = soft(look.hair, 0.85), trim = soft(shade(look.shirt, -0.18).getHex(), 0.72);
    this.legs = [-1, 1].map((s) => {
      const hip = new THREE.Group(); hip.position.set(s * 0.092, HIP, 0); this.rig.add(hip);
      add(BODY.thigh, pants, hip);
      const knee = new THREE.Group(); knee.position.y = -THIGH; hip.add(knee);
      add(BODY.shin, pants, knee);
      const ankle = new THREE.Group(); ankle.position.y = -SHIN; knee.add(ankle);
      add(BODY.shoe, dark, ankle);
      add(BODY.sole, soft(0xf4efe6), ankle, 0, 0, 0, false);
      return { hip, knee, ankle };
    });
    add(BODY.pelvis, pants, this.rig);
    this.chest = new THREE.Group(); this.chest.position.y = WAIST; this.rig.add(this.chest);
    this.torso = add(TORSO[f ? 'f' : 'm'], shirt, this.chest);
    add(new THREE.TorusGeometry(0.066, 0.02, 8, 18).rotateX(Math.PI / 2), trim, this.chest, 0, 0.5, 0, false);
    add(new THREE.TorusGeometry(f ? 0.176 : 0.172, 0.011, 6, 28).rotateX(Math.PI / 2).scale(1, 1, 0.72), trim, this.chest, 0, -0.118, 0, false);
    CY(0.052, 0.062, 0.18, 12, skin, this.chest, 0, 0.57, 0);
    this.head = new THREE.Group(); this.head.position.y = 0.725; this.head.scale.setScalar(0.92); this.chest.add(this.head);
    add(BODY.head, skin, this.head);
    add(BODY.nose, soft(shade(look.skin, -0.04).getHex(), 0.55), this.head, 0, -0.05, 0.19, false);
    for (const s of [-1, 1]) {
      add(BODY.ear, skin, this.head, s * 0.196, -0.01, -0.005, false);
      add(BODY.brow, hairM, this.head, s * 0.08, 0.074, 0.177, false).rotation.z = -s * 0.1;
    }
    this.eyes = [-1, 1].map((s) => {
      const e = add(BODY.eye, dark, this.head, s * 0.08, 0.016, 0.178, false);
      add(BODY.glint, soft(0xffffff, 0.3), e, 0.008, 0.012, 0.01, false);
      return e;
    });
    this.mouth = add(BODY.mouth, soft(0x7a2e2e, 0.5), this.head, 0, -0.125, 0.164, false);
    this.buildHair(look, hairM);
    this.buildAccessory(look, dark);
    this.elbows = [];
    this.arms = [-1, 1].map((s) => {
      const pivot = new THREE.Group(); pivot.position.set(s * (f ? 0.187 : 0.205), 0.375, 0); this.chest.add(pivot);
      add(BODY.upperArm, shirt, pivot);
      const elbow = new THREE.Group(); elbow.position.y = -0.29; pivot.add(elbow);
      add(BODY.foreArm, shirt, elbow);
      add(BODY.cuff, trim, elbow, 0, -0.262, 0, false);
      add(BODY.hand, skin, elbow, 0, -0.27, 0).scale.x = -s; // pouce tourné vers le corps
      this.elbows.push(elbow);
      return pivot;
    });
    // Objets en main, montrés selon l'activité
    this.cup = CY(0.06, 0.05, 0.12, 12, soft(0xffffff, 0.4), this.elbows[0], 0, -0.36, 0.05);
    this.phone = add(new THREE.BoxGeometry(0.08, 0.016, 0.16), dark, this.elbows[0], 0, -0.335, 0.03);
    this.book = new THREE.Group(); this.book.position.set(0, 0.25, 0.47); this.book.rotation.x = -0.65; this.chest.add(this.book);
    for (const s of [-1, 1]) {
      const half = add(new THREE.BoxGeometry(0.17, 0.016, 0.24), soft(shade(look.shirt, 0.25).getHex()), this.book, s * 0.084, 0, 0);
      half.rotation.z = s * 0.16;
      add(new THREE.BoxGeometry(0.16, 0.014, 0.225), soft(0xf6f1e6), half, 0, 0.014, 0, false);
    }
    this.rig.traverse((m) => { m.receiveShadow = false; }); // trop fin pour la carte d'ombres de la pièce
    this.emote = new Emote(this.root, EMOTE_Y);
    this.talking = false; this.talkUntil = 0; this.focused = false; this.hovered = false;
    this.waveUntil = 0; this.blink = 1 + Math.random() * 3; this.phase = Math.random() * 10;
    // Déplacements : cap à suivre, vitesse, foulée, assise. Pilotés par life.js
    this.yaw = 0; this.speed = 0; this.stride = 0; this.gait = 0; this.sidestep = 0; this.posture = 0;
    this.seated = false; this.perched = false; this.chair = null; this.sitT = 0; this.seatY = HIP; this.footZ = 0; this.seatLean = 0;
    this.gesture = null; this.held = null; this.job = null; this.away = false;
  }

  say(emoji, sec) { this.emote.say(emoji, sec); }

  rest() {
    this.gesture = null; this.held = null; this.speed = 0;
    if (!this.chair) this.seated = this.perched; // sur une chaise, il faut d'abord se relever (voir life.js)
  }

  /* Prend place : height = hauteur de l'assise, feet = pieds posés devant le bassin, lean = buste incliné */
  sitOn({ height, feet = 0.34, lean = 0 }) {
    this.seatY = height + SEAT_GAP; this.footZ = feet; this.seatLean = lean; this.seated = true;
  }

  buildHair(look, hm) {
    const h = this.head;
    // Calotte inclinée vers l'arrière : front dégagé, nuque couverte
    const top = (r = 0.218, th = 0.52) => add(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * th).rotateX(-0.43).scale(r, r * 0.965, r).translate(0, 0.04, 0), hm, h);
    const blob = (x, y, z, sx, sy, sz) => add(ellipsoid(sx, sy, sz), hm, h, x, y, z);
    switch (look.hairStyle) {
      case 'long':
        top(0.222);
        add(lathe([[0, -0.5], [0.12, -0.46], [0.19, -0.24], [0.205, 0], [0.11, 0.1], [0, 0.12]], 16).scale(1, 1, 0.5), hm, h, 0, 0, -0.135);
        for (const s of [-1, 1]) blob(s * 0.176, -0.13, 0.03, 0.045, 0.2, 0.07);
        break;
      case 'bun': top(); SP(0.095, 14, 10, hm, h, 0, 0.215, -0.135); break;
      case 'bob':
        top(0.226, 0.54);
        blob(0, -0.07, -0.14, 0.18, 0.18, 0.09);
        for (const s of [-1, 1]) blob(s * 0.182, -0.07, -0.015, 0.06, 0.175, 0.14);
        break;
      case 'curly': {
        // Boucles réparties sur le crâne (spirale de Fibonacci), sauf devant le visage et sous la nuque
        const curls = [];
        for (let i = 0; i < 90; i++) {
          const y = 1 - (i + 0.5) / 45, r = Math.sqrt(1 - y * y), a = i * 2.4, z = Math.cos(a) * r, size = 0.066 + (i % 3) * 0.008;
          if (y < -0.4 || (z > 0.25 && y < 0.42)) continue;
          curls.push(ellipsoid(size, size, size, 8).translate(Math.sin(a) * r * 0.21, y * 0.215 + 0.04, z * 0.2 - 0.012));
        }
        add(mergeGeometries(curls), hm, h);
        top(0.212);
        break;
      }
      case 'cap': {
        top(0.212);
        const capM = soft(look.cap ?? 0x2a5bd7, 0.6);
        add(new THREE.SphereGeometry(0.228, 20, 8, 0, Math.PI * 2, 0, Math.PI * 0.47).scale(1, 0.95, 1), capM, h, 0, 0.04, 0);
        add(new THREE.CylinderGeometry(0.14, 0.16, 0.014, 18).scale(1, 1, 1.1), capM, h, 0, 0.065, 0.165).rotation.x = 0.04;
        break;
      }
      default: top();
    }
  }

  buildAccessory(look, dark) {
    const h = this.head, c = this.chest;
    if (look.acc === 'headset') {
      add(new THREE.TorusGeometry(0.242, 0.013, 8, 26, Math.PI), dark, h, 0, 0.012, -0.01);
      for (const s of [-1, 1]) CY(0.058, 0.058, 0.05, 16, dark, h, s * 0.222, 0, -0.01).rotation.z = Math.PI / 2;
      CY(0.008, 0.008, 0.2, 6, dark, h, -0.19, -0.09, 0.09, false).rotation.set(Math.PI / 2 - 0.4, 0, 0.4);
      SP(0.02, 8, 6, soft(look.shirt), h, -0.145, -0.125, 0.18, false);
    } else if (look.acc === 'glasses') {
      for (const s of [-1, 1]) {
        add(new THREE.TorusGeometry(0.044, 0.0065, 6, 18), dark, h, s * 0.08, 0.016, 0.19, false).rotation.y = s * 0.3;
        add(new THREE.BoxGeometry(0.006, 0.006, 0.17), dark, h, s * 0.142, 0.03, 0.09, false).rotation.y = -s * 0.42;
      }
      add(new THREE.BoxGeometry(0.05, 0.007, 0.007), dark, h, 0, 0.026, 0.198, false);
    } else if (look.acc === 'tie') {
      const red = soft(0xd6334a, 0.6);
      add(new THREE.SphereGeometry(1, 10, 8).scale(0.03, 0.024, 0.016), red, c, 0, 0.452, 0.142, false);
      add(lathe([[0, -0.34], [0.05, -0.285], [0.03, -0.02], [0.018, 0]], 8).scale(1, 1, 0.16), red, c, 0, 0.44, 0.158, false).rotation.x = 0.085;
    } else if (look.acc === 'badge') {
      add(new THREE.BoxGeometry(0.08, 0.052, 0.01), soft(0xffffff, 0.4), c, 0.09, 0.3, 0.142, false).rotation.x = -0.1;
    }
  }

  update(t, dt, camPos) {
    const k = t + this.phase, breath = Math.sin(k * 2.1), g = this.gesture ? GESTURES[this.gesture](k) : null;
    const talking = this.talking || t < this.talkUntil; // talkUntil : répond dans le chat de l'accueil
    // Déplacement : cap, foulée réglée sur la vitesse pour que les pieds ne glissent pas
    this.root.rotation.y += angleTo(this.root.rotation.y, this.yaw) * (1 - Math.exp(-9 * dt));
    const v = Math.abs(this.speed), swing = Math.min(0.3 + v * 0.16, 0.85);
    this.stride += (this.speed * 2 / Math.sin(swing)) * dt;
    this.gait = damp(this.gait, v > 0 ? 1 : 0, 8, dt);
    const sw = Math.sin(this.stride), amp = this.gait * swing, bob = (1 - Math.cos(this.stride * 2)) / 2;
    // Assise : le bassin descend pendant que les pieds restent au sol
    this.sitT = clamp(this.sitT + (this.seated ? dt : -dt) / SIT, 0, 1);
    const sit = smoothstep(this.sitT, 0, 1), hipY = lerp(HIP, this.seatY, sit);
    const [ikHip, ikKnee] = legIK(hipY - ANKLE, this.footZ * sit);
    this.rig.position.x = this.sidestep + sw * 0.018 * this.gait;
    this.rig.position.y = hipY - HIP - bob * 0.045 * amp;
    this.legs.forEach(({ hip, knee, ankle }, i) => {
      const s = i ? 1 : -1, c = (1 - s * Math.cos(this.stride)) / 2;
      hip.rotation.x = ikHip + s * sw * amp;
      knee.rotation.x = ikKnee + c * c * amp * 1.5;
      ankle.rotation.x = s * sw * amp * 0.5 - hip.rotation.x - knee.rotation.x; // pied à plat, talon levé en fin de pas
    });
    // Buste : penché en marchant et en se levant, épaules à contre-temps du bassin
    this.posture = damp(this.posture, Math.min(0.16, v * 0.03) + (g?.lean ?? 0) + this.seatLean * sit, 6, dt);
    this.chest.rotation.x = this.posture + Math.sin(this.sitT * Math.PI) * 0.42 + breath * 0.006;
    this.chest.rotation.y = -sw * 0.1 * this.gait;
    this.chest.rotation.z = Math.sin(k * 0.5) * 0.012 * (1 - this.gait);
    this.torso.scale.x = this.torso.scale.z = 1 + breath * 0.012;
    this.emote.sprite.position.y = EMOTE_Y + this.rig.position.y;
    if ((this.blink -= dt) < 0) this.blink = 2 + Math.random() * 4;
    for (const e of this.eyes) e.scale.y = this.blink < 0.12 ? 0.15 : 1;
    const talk = talking || g?.talk ? 0.7 + Math.abs(Math.sin(k * 16)) * 2.6 * (0.55 + 0.45 * Math.sin(k * 4.7)) : 1;
    this.mouth.scale.y = damp(this.mouth.scale.y, talk, 25, dt);
    // Regarder la caméra quand on est survolé ou présenté
    const loc = this.root.worldToLocal(_v.copy(camPos));
    const attentive = this.focused || this.hovered;
    const yaw = clamp(Math.atan2(loc.x, loc.z), -1.1, 1.1);
    this.rig.rotation.y = damp(this.rig.rotation.y, this.focused && !this.speed ? yaw * 0.55 : 0, 3.5, dt);
    const headYaw = attentive ? clamp(yaw - this.rig.rotation.y, -0.7, 0.7) : g?.head ?? Math.sin(k * 0.37) * 0.35 * (1 - this.gait);
    const pitch = attentive ? clamp(-Math.atan2(loc.y - 1.85, Math.hypot(loc.x, loc.z)), -0.35, 0.3) : g?.pitch ?? 0.05;
    this.head.rotation.y = damp(this.head.rotation.y, headYaw, 5, dt);
    this.head.rotation.x = damp(this.head.rotation.x, pitch + (talking ? Math.sin(k * 5.5) * 0.05 : 0), 5, dt);
    this.head.rotation.z = damp(this.head.rotation.z, talking ? Math.sin(k * 2.3) * 0.05 : 0, 4, dt);
    // Bras : salut, gestes en parlant, activité, marche, repos
    const [R, L] = this.arms, [ER, EL] = this.elbows, elbowRest = -0.2 - 0.35 * this.gait;
    const p = { rz: -0.08, rx: sw * amp * 0.75, re: elbowRest, lz: 0.08, lx: -sw * amp * 0.75, le: elbowRest };
    if (this.seated) Object.assign(p, LAP);
    if (this.held === 'cup') Object.assign(p, { rz: 0.1, rx: -0.55, re: -1.2 });
    if (g) Object.assign(p, g);
    if (t < this.waveUntil) Object.assign(p, { rz: -2.6 + Math.sin(k * 12) * 0.35, rx: -0.15, re: 0 });
    else if (talking) Object.assign(p, GESTURES.chat(k));
    R.rotation.z = damp(R.rotation.z, p.rz, 9, dt); R.rotation.x = damp(R.rotation.x, p.rx, 9, dt); ER.rotation.x = damp(ER.rotation.x, p.re, 9, dt);
    L.rotation.z = damp(L.rotation.z, p.lz, 9, dt); L.rotation.x = damp(L.rotation.x, p.lx, 9, dt); EL.rotation.x = damp(EL.rotation.x, p.le, 9, dt);
    this.cup.visible = this.held === 'cup'; this.book.visible = this.held === 'book'; this.phone.visible = this.gesture === 'phone';
    this.cup.rotation.x = -(R.rotation.x + ER.rotation.x); // la tasse reste droite
    this.emote.update(dt);
  }
}
