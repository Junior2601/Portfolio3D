import * as THREE from 'three';
import { SIT } from './Agent.js';
import { Cat, Robot } from './pets.js';
import { scene, world } from './world-state.js';
import { angleTo, clamp, damp, reduceMotion } from './utils.js';

/* La vie du local. Chaque occupation est un générateur : il avance d'une image à chaque next(dt)
   et s'interrompt proprement avec return() quand un visiteur appelle l'agent. */
const WALK = 1.7, MAX_AWAY = 4, DODGE = 1.1;
const CHAT_SPOT = new THREE.Vector3(0, 0, 1.1); // où se placer pour parler à un collègue (par rapport à sa place)
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function* pause(sec) {
  while (sec > 0) sec -= yield;
}

/* Arrondit les angles d'un trajet : chaque virage devient une courbe commencée à r du coin */
function rounded(pts, r = 0.7) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], cut = (q) => p.clone().lerp(q, Math.min(0.45, r / p.distanceTo(q)));
    out.push(...new THREE.QuadraticBezierCurve3(cut(pts[i - 1]), p, cut(pts[i + 1])).getPoints(6));
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/* Démarre et s'arrête en douceur, sans ralentir dans les virages */
function* walk(who, to, speed = WALK) {
  const pos = who.root.position, path = world.nav.path(pos, to);
  if (!path.length) return;
  const pts = rounded([pos.clone(), ...path]);
  let left = 0, v = 0;
  for (let i = 1; i < pts.length; i++) left += pts[i].distanceTo(pts[i - 1]);
  for (let i = 1; i < pts.length;) {
    const dt = yield;
    v = Math.min(speed, v + speed * 3 * dt, 0.35 + left * 3);
    let step = v * dt;
    left -= step;
    while (i < pts.length) {
      const dx = pts[i].x - pos.x, dz = pts[i].z - pos.z, d = Math.hypot(dx, dz);
      if (d > step) { pos.x += (dx / d) * step; pos.z += (dz / d) * step; who.yaw = Math.atan2(dx, dz); break; }
      pos.x = pts[i].x; pos.z = pts[i].z; step -= d; i++;
    }
    who.speed = v;
  }
  who.speed = 0;
}

function* glide(a, to, sec) {
  const from = a.root.position.clone();
  for (let k = 0; k < 1;) {
    k = Math.min(1, k + (yield) / sec);
    a.root.position.lerpVectors(from, to, THREE.MathUtils.smoothstep(k, 0, 1));
  }
}

const backTo = (c) => Math.atan2(c.pos.x - c.seat.x, c.pos.z - c.seat.z); // dos au siège

/* S'installe sur un siège : se retourne, recule en s'asseyant, puis pivote vers son poste avec la chaise */
function* sit(a, c) {
  a.chair = c; a.yaw = c.turn = backTo(c);
  yield* pause(0.35);
  a.sitOn(c);
  yield* glide(a, c.seat, SIT);
  a.yaw = c.turn = c.yaw;
  yield* pause(0.4);
}

function* rise(a) {
  const c = a.chair;
  a.yaw = c.turn = backTo(c);
  yield* pause(0.4);
  a.seated = false;
  yield* glide(a, c.pos, SIT);
  a.chair = null; c.turn = c.rest;
}

function* goHome(a, speed) {
  if (a.root.position.distanceTo(a.home) > 0.1) yield* walk(a, a.home, speed);
  a.yaw = a.homeYaw;
}

/* Ce que fait un agent une fois arrivé. Valeur renvoyée : geste à garder une fois rentré au bureau */
const ROUTINES = {
  * coffee(a) {
    a.gesture = 'pour'; a.say('☕', 3);
    yield* pause(3);
    a.gesture = null; a.held = 'cup';
    return 'sip';
  },
  * fountain(a) {
    a.held = 'cup'; a.gesture = 'sip'; a.say('💧', 2.5);
    yield* pause(3.5);
    a.held = null;
  },
  * shelf(a) {
    a.gesture = 'reach';
    yield* pause(1.6);
    a.held = 'book'; a.gesture = 'read'; a.say('📖', 2.5);
    yield* pause(rand(5, 9));
    return 'read';
  },
  * board(a) {
    a.gesture = 'write'; a.say('💡', 2.5);
    yield* pause(rand(5, 8));
  },
  * rack(a) {
    a.gesture = 'cross'; a.say('🛠️', 2.5);
    yield* pause(rand(4, 6));
  },
  * window(a) {
    a.gesture = 'look';
    yield* pause(rand(4, 8));
  },
  * seat(a, spot) {
    yield* sit(a, spot);
    a.held = 'book'; a.gesture = pick(['read', 'phone']);
    if (a.gesture === 'phone') a.held = null;
    yield* pause(rand(8, 15));
    a.held = null; a.gesture = null;
    yield* pause(0.3);
    yield* rise(a);
  },
  /* Une place dans la salle de formation : on écoute, on prend des notes */
  * lesson(a, spot) {
    yield* sit(a, spot);
    a.gesture = pick(['type', 'nod', 'look']); a.say(pick(['✏️', '🤔', '💡']), 2.5);
    yield* pause(rand(8, 14));
    a.gesture = null;
    yield* pause(0.3);
    yield* rise(a);
  },
};

function* trip(a, spot) {
  a.away = true; spot.busy = a;
  try {
    yield* walk(a, spot.pos);
    a.yaw = spot.yaw;
    yield* pause(0.4);
    const after = yield* ROUTINES[spot.kind](a, spot);
    spot.busy = null; a.gesture = null;
    yield* goHome(a);
    if (after) { a.gesture = after; yield* pause(rand(5, 9)); }
  } finally {
    a.away = false;
    if (spot.busy === a) spot.busy = null;
  }
}

/* Assis à son poste : au clavier, ou un livre à la main pour la bibliothécaire */
function* atDesk(a, sec) {
  a.gesture = a.desk.gesture ?? 'type'; a.held = a.desk.held ?? null;
  yield* pause(sec);
  a.gesture = null; a.held = null;
  yield* pause(0.3);
  yield* rise(a);
  yield* goHome(a);
}

function* work(a) {
  yield* walk(a, a.desk.pos);
  yield* sit(a, a.desk);
  yield* atDesk(a, rand(20, 45));
}

function* idle(a) {
  a.gesture = pick(a.stays ? ['type', 'type', 'look'] : ['stretch', 'phone', 'look']);
  yield* pause(rand(2.5, 4.5));
}

/* Répond à l'appel du visiteur : retour au bureau en courant, d'autant plus vite qu'il est loin */
function* dash(a) {
  if (a.chair) yield* rise(a);
  yield* goHome(a, clamp(a.root.position.distanceTo(a.home) / 1.1, 3.2, 9));
}

function* catLife(cat) {
  for (;;) {
    yield* walk(cat, world.nav.randomFree(), 1);
    if (Math.random() < 0.5) {
      cat.sleeping = true; cat.emote.say('💤', 6);
      yield* pause(rand(10, 22));
      cat.sleeping = false;
    } else yield* pause(rand(2, 6));
  }
}

function* robotLife(robot) {
  for (;;) {
    yield* walk(robot, world.nav.randomFree(), 0.8);
    yield* pause(rand(1, 3));
  }
}

export class Life {
  constructor() {
    this.agents = []; this.pets = [];
  }

  /* Les agents quittent le groupe de leur bureau pour se déplacer dans tout le local */
  init(stations) {
    this.agents = stations.map((st) => {
      const a = st.agent;
      a.home = a.root.position.clone().add(st.group.position);
      a.homeYaw = a.yaw;
      a.desk = st.chair ?? null;
      a.chatSpot = st.chatSpot ?? CHAT_SPOT;
      a.stays = st.type === 'host'; // l'accueil reste toujours à son poste
      a.nextJob = rand(1, 12);
      a.root.position.copy(a.home);
      scene.add(a.root);
      st.tag = a.home.clone().setY(2.58); // l'étiquette reste au bureau quand l'agent s'absente
      if (st.stool) { a.sitOn(st.stool); a.perched = true; a.sitT = 1; }
      else if (a.desk && !reduceMotion) this.settle(a);
      return a;
    });
    const cat = new Cat(), robot = new Robot();
    this.pets = [[cat, catLife(cat)], [robot, robotLife(robot)]];
    for (const [pet, job] of this.pets) {
      pet.job = job;
      pet.root.position.copy(world.nav.randomFree());
      scene.add(pet.root);
      job.next(0);
    }
  }

  /* Déjà installé à son poste quand le visiteur arrive */
  settle(a) {
    const c = a.desk;
    a.sitOn(c); a.chair = c; a.sitT = 1;
    a.root.position.copy(c.seat); a.root.rotation.y = a.yaw = c.yaw;
    a.job = atDesk(a, rand(6, 35));
    a.job.next(0);
  }

  free(a) {
    a.job = null; a.rest();
    a.yaw = a.homeYaw;
    a.nextJob = this.time + rand(2, 10);
  }

  stop(a) {
    a.job?.return(); a.job = null; a.rest();
  }

  /* Un visiteur clique sur cet agent : il laisse tout et revient à son bureau */
  recall(a) {
    if (reduceMotion) return;
    this.stop(a);
    a.job = dash(a);
    a.job.next(0);
  }

  * chat(a, b) {
    const listen = (function* () { for (;;) yield; }());
    a.away = true;
    try {
      yield* walk(a, b.home.clone().add(b.chatSpot));
      if (b.job || b.focused) { // le collègue est parti entre-temps
        a.yaw = Math.atan2(b.home.x - a.root.position.x, b.home.z - a.root.position.z);
        a.say('❓', 1.4);
        yield* pause(1.5);
      } else {
        const dx = b.home.x - a.root.position.x, dz = b.home.z - a.root.position.z;
        a.yaw = Math.atan2(dx, dz); b.yaw = a.yaw + Math.PI;
        b.job = listen;
        for (let i = 0; i < 5 && b.job === listen; i++) {
          const [talker, other] = i % 2 ? [b, a] : [a, b];
          talker.gesture = 'chat'; other.gesture = 'nod';
          talker.say(pick(['💬', '💡', '😄', '🤝']), 1.8);
          yield* pause(rand(1.8, 2.8));
        }
      }
    } finally {
      a.away = false;
      if (b.job === listen) this.free(b);
    }
    a.gesture = null;
    yield* goHome(a);
  }

  /* Choisit la prochaine occupation d'un agent resté trop longtemps sans rien faire */
  assign(a) {
    const roll = Math.random(), roaming = this.agents.filter((x) => x.away).length >= MAX_AWAY;
    const spots = world.spots.filter((s) => !s.busy);
    const mates = this.agents.filter((b) => b !== a && b.desk && !b.job && !b.focused);
    if (a.stays || roll < 0.15) a.job = idle(a);
    else if (roll < 0.55 && a.desk) a.job = work(a);
    else if (roaming || !spots.length) a.job = idle(a);
    else if (roll < 0.7 && a.desk && mates.length) a.job = this.chat(a, pick(mates));
    else a.job = trip(a, pick(spots));
    a.job.next(0); // réserve tout de suite la destination
  }

  /* Deux agents qui se croisent s'écartent un peu : la trajectoire ne change pas, seul le corps se décale */
  dodge(dt) {
    for (const a of this.agents) {
      let off = 0;
      if (a.speed) {
        const fx = Math.sin(a.yaw), fz = Math.cos(a.yaw), pa = a.root.position;
        for (const b of this.agents) {
          if (b === a) continue;
          const dx = b.root.position.x - pa.x, dz = b.root.position.z - pa.z, d = Math.hypot(dx, dz);
          if (d > DODGE || dx * fx + dz * fz <= 0) continue;
          off += (dx * fz - dz * fx > 0 ? -1 : 1) * (DODGE - d) * 0.8;
        }
      }
      a.sidestep = damp(a.sidestep, clamp(off, -0.45, 0.45), 7, dt);
    }
  }

  ambient(t, dt) {
    for (const p of world.steam) {
      const k = (t * 0.28 + p.ph) % 1;
      p.s.position.set(p.x + Math.sin(t * 1.7 + p.ph * 9) * 0.03, p.y + k * 0.5, p.z);
      p.s.material.opacity = Math.sin(k * Math.PI) * 0.4;
      p.s.scale.setScalar(0.1 + k * 0.2);
    }
    for (const c of world.clouds) c.offset.x += dt * 0.006;
    for (const c of world.chairs) c.top.rotation.y += angleTo(c.top.rotation.y, c.turn) * (1 - Math.exp(-9 * dt));
    if (world.tank) {
      world.tank.bubbles.forEach((m, i) => {
        m.visible = Boolean(world.tank.spot.busy);
        m.position.y = 1.03 + ((t * 0.6 + i / 3) % 1) * 0.42;
      });
    }
    // Le néon grésille de temps en temps (appelé après applyNight, qui rétablit sa couleur)
    if (world.neon && Math.sin(t * 0.7) > 0.985 && Math.sin(t * 43) > 0) world.neon.color.multiplyScalar(0.45);
  }

  update(t, dt) {
    this.time = t;
    world.library?.update(t, dt);
    this.ambient(t, dt);
    if (reduceMotion) return;
    for (const a of this.agents) {
      if (a.job) { if (a.job.next(dt).done) this.free(a); }
      else if (a.focused) a.nextJob = Math.max(a.nextJob, t + 5);
      else if (t > a.nextJob) this.assign(a);
    }
    this.dodge(dt);
    for (const [pet] of this.pets) { pet.job.next(dt); pet.update(t, dt); }
  }
}
