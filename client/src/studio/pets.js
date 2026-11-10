import * as THREE from 'three';
import { Emote } from './Agent.js';
import { tone } from './audio.js';
import { world } from './world-state.js';
import { B, CY, add, angleTo, damp, mat } from './utils.js';

/* Le chat du studio : se promène, fait la sieste et ronronne quand on clique dessus */
export class Cat {
  constructor() {
    this.root = new THREE.Group();
    this.rig = new THREE.Group(); this.root.add(this.rig);
    this.yaw = 0; this.speed = 0; this.stride = 0; this.gait = 0; this.sleeping = false; this.sleepK = 0;
    const fur = mat(0xe8963f), pale = mat(0xf7e3c5), dark = mat(0x2b2230);
    B(0.2, 0.2, 0.5, fur, this.rig, 0, 0.3, 0);
    this.head = new THREE.Group(); this.head.position.set(0, 0.44, 0.28); this.rig.add(this.head);
    B(0.24, 0.2, 0.2, fur, this.head);
    for (const s of [-1, 1]) {
      add(new THREE.ConeGeometry(0.05, 0.1, 4), fur, this.head, s * 0.08, 0.14, 0);
      B(0.03, 0.04, 0.02, dark, this.head, s * 0.06, 0.02, 0.105, false);
    }
    B(0.07, 0.05, 0.03, pale, this.head, 0, -0.04, 0.105, false);
    this.tail = new THREE.Group(); this.tail.position.set(0, 0.38, -0.24); this.rig.add(this.tail);
    B(0.05, 0.36, 0.05, fur, this.tail, 0, 0.16, 0);
    this.legs = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => {
      const leg = new THREE.Group(); leg.position.set(sx * 0.07, 0.2, sz * 0.17); this.rig.add(leg);
      B(0.06, 0.2, 0.06, fur, leg, 0, -0.1, 0);
      return leg;
    });
    this.emote = new Emote(this.root, 0.95);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.9), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.35; hit.userData.pet = () => this.pet();
    this.root.add(hit); world.hit.push(hit);
  }

  pet() {
    this.emote.say('❤️', 2);
    tone(720, 0.12, 0.04, 'sine'); setTimeout(() => tone(540, 0.18, 0.04, 'sine'), 110);
  }

  update(t, dt) {
    this.root.rotation.y += angleTo(this.root.rotation.y, this.yaw) * (1 - Math.exp(-8 * dt));
    this.stride += this.speed * 9 * dt;
    this.gait = damp(this.gait, this.speed > 0 ? 1 : 0, 10, dt);
    this.sleepK = damp(this.sleepK, this.sleeping ? 1 : 0, 4, dt);
    this.legs.forEach((leg, i) => {
      leg.rotation.x = Math.sin(this.stride + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.7 * this.gait;
      leg.scale.y = 1 - 0.8 * this.sleepK; // pattes repliées pendant la sieste
    });
    this.rig.position.y = -0.15 * this.sleepK + Math.sin(t * 1.8) * 0.006;
    this.head.rotation.x = this.sleepK * 0.5;
    this.tail.rotation.x = -0.5 - this.sleepK * 0.9;
    this.tail.rotation.z = Math.sin(t * 2.6) * 0.4 * (1 - this.sleepK);
    this.emote.update(dt);
  }
}

/* Le robot aspirateur fait sa ronde dans les allées */
export class Robot {
  constructor() {
    this.root = new THREE.Group();
    this.yaw = 0; this.speed = 0;
    CY(0.27, 0.29, 0.07, 16, 0x2b2740, this.root, 0, 0.05, 0);
    CY(0.12, 0.12, 0.02, 12, 0x4a4560, this.root, 0, 0.095, 0);
    this.led = add(new THREE.SphereGeometry(0.025, 6, 4), new THREE.MeshBasicMaterial({ color: 0x3dff9a }), this.root, 0, 0.11, 0.2, false);
    this.brush = new THREE.Group(); this.brush.position.set(0.2, 0.02, 0.18); this.root.add(this.brush);
    for (let k = 0; k < 3; k++) B(0.16, 0.012, 0.02, 0xcdbfae, this.brush, 0, 0, 0, false).rotation.y = (k / 3) * Math.PI;
  }

  update(t, dt) {
    this.root.rotation.y += angleTo(this.root.rotation.y, this.yaw) * (1 - Math.exp(-6 * dt));
    this.brush.rotation.y += dt * (this.speed > 0 ? 16 : 3);
    this.led.visible = Math.sin(t * 3) > -0.4;
  }
}
