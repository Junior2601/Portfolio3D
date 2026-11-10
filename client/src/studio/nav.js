import * as THREE from 'three';

const CELL = 0.25;
const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const _a = new THREE.Vector3();

/* Plan de circulation : une grille où les meubles bloquent des cases.
   Les trajets sont calculés à la demande : ils restent justes quel que soit le nombre de bureaux. */
export class Nav {
  constructor(W, D) {
    this.x0 = -W / 2; this.z0 = -D / 2;
    this.nx = Math.ceil(W / CELL); this.nz = Math.ceil(D / CELL);
    const n = this.nx * this.nz;
    this.blocked = new Uint8Array(n); this.prev = new Int32Array(n); this.queue = new Int32Array(n);
    // Murs du fond et de gauche, puis murs de devant et de droite (visibles à la première personne)
    this.block(-W / 2, 0, 1.3, D, 0); this.block(0, -D / 2, W, 1.3, 0);
    this.block(W / 2, 0, 1.3, D, 0); this.block(0, D / 2, W, 1.3, 0);
  }

  /* Bloque un rectangle centré en (x, z) ; pad = marge pour le corps d'un agent */
  block(x, z, w, d, pad = 0.3) {
    const hw = w / 2 + pad, hd = d / 2 + pad;
    const i0 = Math.max(0, Math.ceil((x - hw - this.x0) / CELL - 0.5)), i1 = Math.min(this.nx - 1, Math.floor((x + hw - this.x0) / CELL - 0.5));
    const j0 = Math.max(0, Math.ceil((z - hd - this.z0) / CELL - 0.5)), j1 = Math.min(this.nz - 1, Math.floor((z + hd - this.z0) / CELL - 0.5));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) this.blocked[j * this.nx + i] = 1;
  }

  at(x, z) {
    const i = Math.floor((x - this.x0) / CELL), j = Math.floor((z - this.z0) / CELL);
    return i >= 0 && j >= 0 && i < this.nx && j < this.nz ? j * this.nx + i : -1;
  }

  center(c) {
    const i = c % this.nx;
    return new THREE.Vector3(this.x0 + (i + 0.5) * CELL, 0, this.z0 + ((c - i) / this.nx + 0.5) * CELL);
  }

  isFree(x, z) {
    const c = this.at(x, z);
    return c >= 0 && !this.blocked[c];
  }

  nearest(x, z) {
    for (let r = 0; r < 24; r++) {
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const c = this.at(x + di * CELL, z + dj * CELL);
        if (c >= 0 && !this.blocked[c]) return c;
      }
    }
    return -1;
  }

  randomFree() {
    for (;;) {
      const c = Math.floor(Math.random() * this.blocked.length);
      if (!this.blocked[c]) return this.center(c);
    }
  }

  clear(a, b) {
    const n = Math.ceil(a.distanceTo(b) / (CELL / 2));
    for (let k = 1; k < n; k++) {
      _a.lerpVectors(a, b, k / n);
      if (!this.isFree(_a.x, _a.z)) return false;
    }
    return true;
  }

  /* Trajet le plus court de from à to : liste de points, vide si aucun chemin n'existe */
  path(from, to) {
    const s = this.nearest(from.x, from.z), g = this.nearest(to.x, to.z);
    if (s < 0 || g < 0) return [];
    const { nx, nz, blocked, prev, queue } = this;
    prev.fill(-1); prev[s] = s;
    let head = 0, tail = 0;
    queue[tail++] = s;
    while (head < tail && prev[g] === -1) {
      const c = queue[head++], cx = c % nx, cz = (c - cx) / nx;
      for (const [dx, dz] of STEPS) {
        const x = cx + dx, z = cz + dz;
        if (x < 0 || z < 0 || x >= nx || z >= nz) continue;
        const n = z * nx + x;
        if (prev[n] !== -1 || blocked[n]) continue;
        if (dx && dz && (blocked[cz * nx + x] || blocked[z * nx + cx])) continue; // ne pas couper les angles
        prev[n] = c; queue[tail++] = n;
      }
    }
    if (prev[g] === -1) return [];
    const cells = [];
    for (let c = g; ; c = prev[c]) { cells.unshift(this.center(c)); if (c === s) break; }
    // Garde seulement les virages utiles
    const out = this.isFree(from.x, from.z) ? [] : [cells[0]];
    for (let i = 0; i < cells.length - 1;) {
      let j = cells.length - 1;
      while (j > i + 1 && !this.clear(cells[i], cells[j])) j--;
      out.push(cells[j]);
      i = j;
    }
    out.push(to.clone().setY(0));
    return out;
  }
}
