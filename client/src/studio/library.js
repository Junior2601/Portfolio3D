import * as THREE from 'three';
import { FONT, add, damp, hex, lerp, makeCanvas, mat, shade, texFrom, wrapLines } from './utils.js';

const BOOK_W = 0.35, BOOK_H = 0.5, BOOK_T = 0.07, LEAN = 0.06;
const FLOAT = new THREE.Vector3(1.5, 1.6, -0.15); // où vient flotter le livre choisi, devant l'étagère

/* Couverture dessinée à partir du titre, de l'auteur et de la couleur du livre */
function coverTexture({ title, author, color }) {
  const [c, g] = makeCanvas(256, 368), maxW = 200;
  const grd = g.createLinearGradient(0, 0, 256, 368);
  grd.addColorStop(0, hex(color)); grd.addColorStop(1, '#' + shade(color, -0.45).getHexString());
  g.fillStyle = grd; g.fillRect(0, 0, 256, 368);
  g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, 0, 14, 368);
  g.fillStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.arc(220, 320, 110, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
  let size = 36, lines;
  do {
    size -= 2; g.font = `700 ${size}px ${FONT}`;
    lines = wrapLines(g, title, maxW);
  } while (size > 16 && (lines.length > 6 || lines.some((l) => g.measureText(l).width > maxW)));
  lines.forEach((l, i) => g.fillText(l, 32, 64 + i * (size + 6)));
  g.fillRect(32, 76 + (lines.length - 1) * (size + 6), 44, 4);
  g.fillStyle = 'rgba(255,255,255,.88)'; g.font = `500 17px ${FONT}`;
  wrapLines(g, author, maxW).slice(0, 2).reverse().forEach((l, i) => g.fillText(l, 32, 340 - i * 22));
  return texFrom(c);
}

/* Range les livres recommandés sur les deux rangées du milieu, couverture en avant */
export function bookShelf(shelf, books) {
  const cols = Math.ceil(books.length / 2), gap = 2.3 / cols, size = Math.min(1, (gap - 0.04) / BOOK_W);
  let selected = -1;
  const items = books.map((book, i) => {
    const pages = mat(0xf4efe6), cover = new THREE.MeshStandardMaterial({ map: coverTexture(book), roughness: 0.7 });
    const row = i < cols ? 2 : 1, col = i % cols;
    const rest = new THREE.Vector3(0.3, 0.085 + row * 0.68 + (BOOK_H * size) / 2, (col - (cols - 1) / 2) * gap);
    const mesh = add(new THREE.BoxGeometry(BOOK_T, BOOK_H, BOOK_W), [cover, mat(book.color), pages, pages, mat(shade(book.color, -0.3).getHex()), pages], shelf, rest.x, rest.y, rest.z);
    mesh.userData.book = i;
    return { mesh, rest, k: 0 };
  });

  return {
    items,
    select(i) { selected = i; },
    /* Le livre choisi quitte l'étagère, vient devant le visiteur et tourne doucement */
    update(t, dt) {
      items.forEach((b, i) => {
        b.k = damp(b.k, i === selected ? 1 : 0, 5, dt);
        const e = b.k * b.k * (3 - 2 * b.k);
        b.mesh.position.lerpVectors(b.rest, FLOAT, e);
        b.mesh.position.y += Math.sin(t * 1.6) * 0.03 * e;
        b.mesh.rotation.set(0, Math.sin(t * 0.9) * 0.3 * e, lerp(LEAN, 0, e));
        b.mesh.scale.setScalar(lerp(size, 2.1, e));
      });
    },
  };
}
