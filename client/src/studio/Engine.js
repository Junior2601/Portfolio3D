import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildWorld } from './world.js';
import { Life } from './life.js';
import { drawScreen } from './screens.js';
import { dialogue } from './dialogue.js';
import { tone } from './audio.js';
import { scene, world } from './world-state.js';
import { clamp, damp, lerp, reduceMotion } from './utils.js';

const PANEL_W = 400;
const DAY = { hemi: new THREE.Color(0xfff2e2), sun: new THREE.Color(0xfff0d8) };
const NIGHT = { hemi: new THREE.Color(0x5b64b8), sun: new THREE.Color(0x9db4ff) };
const _p = new THREE.Vector3();
const isWide = () => innerWidth > 860;

/* Moteur 3D : rendu, caméra, animations, clics dans la scène, positions des étiquettes HTML */
export class Engine {
  constructor(canvas, { onPick }) {
    this.canvas = canvas;
    this.onPick = onPick;
    this.stations = [];
    this.focusIdx = -1; this.hover = -1; this.interactive = false;
    this.time = 0; this.nightK = 0; this.night = false; this.tween = null; this.screenAcc = 0;
    this.tagEls = []; this.bubbleEl = null;

    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.setSize(innerWidth, innerHeight);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.setClearColor(0x000000, 0);

    this.camera = new THREE.PerspectiveCamera(innerWidth < innerHeight ? 50 : 38, innerWidth / innerHeight, 0.1, 250);
    this.camera.position.set(34, 30, 44);
    const c = this.controls = new OrbitControls(this.camera, canvas);
    Object.assign(c, { enableDamping: true, dampingFactor: 0.07, minDistance: 3.5, maxDistance: 75, maxPolarAngle: 1.36, autoRotate: true, autoRotateSpeed: 0.35 });
    c.target.set(0.6, 0, -0.6);

    this.hemi = new THREE.HemisphereLight(0xfff2e2, 0xb39f8a, 1.7);
    this.sun = new THREE.DirectionalLight(0xfff0d8, 2.7);
    this.sun.position.set(12, 22, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 75 });
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    scene.add(this.hemi, this.sun);

    this.raycaster = new THREE.Raycaster(); this.ndc = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.life = new Life();
    this.bindPointer();
  }

  build(profile, projects) {
    this.stations = buildWorld(profile, projects);
    this.life.init(this.stations);
    return this.stations;
  }

  start() {
    const loop = () => { requestAnimationFrame(loop); this.frame(); };
    loop();
  }

  /* ---------- Caméra ---------- */
  overviewView() {
    const target = new THREE.Vector3(0.6, 0, -0.6);
    const dir = new THREE.Vector3(0.55, 0.68, 0.9).normalize();
    const L = world.L || { W: 23.2, D: 19 };
    const dist = clamp(29 * Math.pow(1.7 / this.camera.aspect, 0.55), 29, 62) * Math.pow(Math.max(1, L.W / 23.2, L.D / 19), 0.75);
    return { target, pos: target.clone().addScaledVector(dir, dist) };
  }

  focusView(st) {
    const cam = this.camera, portrait = cam.aspect < 1;
    const target = st.group.position.clone().add(st.center);
    const off = st.camOff.clone().multiplyScalar(portrait ? 1.6 : 1);
    const pos = target.clone().add(off);
    const halfH = off.length() * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    if (isWide()) {
      // décale la scène vers la gauche pour laisser la place au panneau
      const k = ((PANEL_W + 30) / 2 / (innerWidth / 2)) * halfH * cam.aspect;
      const right = new THREE.Vector3(off.z, 0, -off.x).normalize();
      target.addScaledVector(right, k); pos.addScaledVector(right, k);
    } else {
      target.y -= halfH * 0.42; pos.y -= halfH * 0.42;
    }
    return { target, pos };
  }

  flyTo({ pos, target }, dur = 1.6) {
    this.tween = { p0: this.camera.position.clone(), t0: this.controls.target.clone(), p1: pos, t1: target, k: 0, dur: reduceMotion ? 0.01 : dur };
    this.controls.enabled = false;
  }

  stepTween(dt) {
    const tw = this.tween;
    tw.k = Math.min(1, tw.k + dt / tw.dur);
    const k = tw.k, e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    this.camera.position.lerpVectors(tw.p0, tw.p1, e);
    this.camera.position.y += Math.sin(Math.PI * e) * Math.min(3, tw.p0.distanceTo(tw.p1) * 0.1);
    this.controls.target.lerpVectors(tw.t0, tw.t1, e);
    this.camera.lookAt(this.controls.target);
    if (k >= 1) { this.tween = null; this.controls.enabled = true; this.controls.update(); }
  }

  /* ---------- Actions appelées par controller.js ---------- */
  intro() {
    this.interactive = true;
    this.controls.autoRotate = false;
    this.flyTo(this.overviewView(), 2.4);
  }

  focus(i) {
    this.focusIdx = i;
    for (const s of this.stations) s.agent.focused = s.idx === i;
    this.life.recall(this.stations[i].agent);
    this.flyTo(this.focusView(this.stations[i]), 1.5);
  }

  overview() {
    this.focusIdx = -1;
    for (const s of this.stations) s.agent.focused = false;
    this.flyTo(this.overviewView(), 1.6);
  }

  setNight(on, instant = false) {
    this.night = on;
    if (instant) { this.nightK = on ? 1 : 0; this.applyNight(this.nightK); }
  }

  selectBook(i) {
    world.library?.select(i);
  }

  selectCourse(i) {
    world.training?.select(i);
  }

  snapshot(i) {
    return this.stations[i]?.screen?.c.toDataURL('image/jpeg', 0.9) || null;
  }

  resize() {
    const cam = this.camera;
    cam.aspect = innerWidth / innerHeight;
    cam.fov = innerWidth < innerHeight ? 50 : 38;
    cam.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    if (this.interactive) this.flyTo(this.focusIdx >= 0 ? this.focusView(this.stations[this.focusIdx]) : this.overviewView(), 0.6);
  }

  /* ---------- Souris / doigt ---------- */
  pick(e) {
    this.ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hits = this.raycaster.intersectObjects(world.hit, false), first = hits[0]?.object.userData;
    if (!first) return {};
    // La zone cliquable d'une station recouvre ses objets (livres, formations à l'écran) : un objet visé passe avant elle
    const item = hits.find(({ object: { userData: u } }) => u.station === first.station && (u.book ?? u.course) !== undefined);
    return item?.object.userData ?? first;
  }

  setHover(i) {
    if (i === this.hover) return;
    if (this.hover >= 0) this.stations[this.hover].agent.hovered = false;
    this.hover = i;
    if (i >= 0) {
      const a = this.stations[i].agent;
      a.hovered = true;
      if (this.focusIdx !== i) { a.waveUntil = this.time + 1.3; tone(880, 0.05, 0.02, 'sine'); }
    }
  }

  bindPointer() {
    let down = null;
    this.canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    this.canvas.addEventListener('pointerup', (e) => {
      if (!down || !this.interactive) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 6) return; // c'était un glisser (rotation de la caméra), pas un clic
      const hit = this.pick(e);
      if (hit.pet) hit.pet();
      else if (hit.station >= 0) this.onPick(hit.station, hit);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.interactive || e.pointerType === 'touch') return;
      const { station = -1, pet } = this.pick(e);
      this.setHover(station);
      this.canvas.style.cursor = station >= 0 || pet ? 'pointer' : '';
    });
  }

  /* ---------- Étiquettes et bulle (éléments React positionnés à chaque image) ---------- */
  setTagEl(i, el) { this.tagEls[i] = el; }
  setBubbleEl(el) { this.bubbleEl = el; }

  toScreen(v) {
    v.project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, behind: v.z > 1 };
  }

  project(obj, dy) {
    obj.getWorldPosition(_p); _p.y += dy;
    return this.toScreen(_p);
  }

  positionOverlays() {
    if (this.focusIdx < 0) {
      for (const st of this.stations) {
        const el = this.tagEls[st.idx];
        if (!el) continue;
        const s = this.toScreen(_p.copy(st.tag));
        el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -100%)`;
        el.style.visibility = s.behind ? 'hidden' : '';
      }
    }
    const st = dialogue.station, b = this.bubbleEl;
    if (st && b) {
      const s = this.project(st.agent.head, 0.5);
      const bw = b.offsetWidth, bh = b.offsetHeight;
      const maxX = innerWidth - (isWide() && document.body.classList.contains('panel-open') ? PANEL_W + 40 : 12) - bw;
      let x = s.x - 30, y = s.y - bh - 16;
      const flip = x > maxX;
      if (flip) x = s.x - bw + 30;
      b.dataset.flip = flip ? '1' : '0'; // attribut (et non classe) : React réécrit className à chaque lettre
      x = clamp(x, 12, Math.max(12, maxX));
      y = clamp(y, isWide() ? 124 : 108, innerHeight - bh - 20); // sous le logo et le compteur
      b.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  /* ---------- Boucle d'animation ---------- */
  applyNight(k) {
    this.hemi.intensity = lerp(1.7, 0.45, k); this.hemi.color.lerpColors(DAY.hemi, NIGHT.hemi, k);
    this.sun.intensity = lerp(2.7, 0.5, k); this.sun.color.lerpColors(DAY.sun, NIGHT.sun, k);
    for (const l of world.lamps) { l.light.intensity = l.max * k; l.light.visible = k > 0.01; } // lampes éteintes = retirées du calcul le jour
    for (const m of world.glow) m.emissiveIntensity = k * 2;
    for (const m of world.nightFade) m.opacity = k;
    if (world.neon) world.neon.color.setScalar(lerp(0.85, 1.4, k));
    if (world.dust) world.dust.material.opacity = lerp(0.35, 0.8, k);
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = (this.time += dt);
    if (this.tween) this.stepTween(dt);
    else {
      this.controls.update();
      const tg = this.controls.target, L = world.L;
      tg.x = clamp(tg.x, -L.W / 2, L.W / 2); tg.z = clamp(tg.z, -L.D / 2, L.D / 2); tg.y = clamp(tg.y, -2, 3);
    }
    this.nightK = damp(this.nightK, this.night ? 1 : 0, 2.5, dt);
    this.applyNight(this.nightK);
    this.life.update(t, dt);
    for (const st of this.stations) {
      st.agent.update(t, dt, this.camera.position);
      if (st.spot) st.spot.material.opacity = damp(st.spot.material.opacity, st.idx === this.focusIdx ? 0.3 : st.idx === this.hover ? 0.42 : 0.12, 8, dt);
    }
    if ((this.screenAcc += dt) > 1 / 12) { this.screenAcc = 0; for (const sc of world.screens) drawScreen(sc, t); }
    for (const p of world.plants) p.g.rotation.z = Math.sin(t * 1.1 + p.ph) * 0.03;
    for (const l of world.leds) l.m.material = Math.sin(t * l.rate + l.ph) > 0.2 ? l.on : l.off;
    if (world.clock) {
      const d = new Date(), s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
      world.clock.s.rotation.x = -(s / 60) * Math.PI * 2;
      world.clock.m.rotation.x = -(m / 60) * Math.PI * 2;
      world.clock.h.rotation.x = -(h / 12) * Math.PI * 2;
    }
    if (world.dust) {
      const a = world.dust.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) {
        let y = a.getY(i) + dt * 0.08;
        if (y > 4.3) y = 0.2;
        a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(t * 0.3 + i) * dt * 0.05);
      }
      a.needsUpdate = true;
    }
    dialogue.tick(dt, t);
    this.positionOverlays();
    this.renderer.render(scene, this.camera);
  }
}
