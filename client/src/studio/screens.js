import { world } from './world-state.js';
import { EMOJI, FONT, MONO, hex, hexA, makeCanvas, rr, shade, texFrom, wrapLines } from './utils.js';

/* Écrans animés des ordinateurs : dessinés dans un canvas, puis envoyés comme texture */
export const SW = 544, SH = 320;

function typingDots(g, x, y, t) {
  g.fillStyle = '#262b45'; rr(g, x, y, 74, 36, 14); g.fill();
  for (let d = 0; d < 3; d++) {
    g.fillStyle = `rgba(230,233,255,${0.3 + 0.7 * Math.max(0, Math.sin(t * 8 - d))})`;
    g.beginPath(); g.arc(x + 22 + d * 15, y + 18, 4, 0, 7); g.fill();
  }
}

export const SCREENS = {
  chat(g, t, sc, acc) {
    const msgs = [['u', 'Remboursement Wave : quel délai ?'], ['b', 'Sous 48 h ouvrées · 📄 Politique §3'], ['u', 'Et pour un compte pro au Sénégal ?'], ['b', 'Même délai, frais réduits · 📄 Grille SN']];
    const step = Math.floor(t / 1.7) % (msgs.length + 2);
    g.font = `500 17px ${FONT}`; g.textBaseline = 'middle';
    let y = 48;
    for (let i = 0; i < Math.min(step, msgs.length); i++) {
      const [who, txt] = msgs[i], bot = who === 'b';
      const w = Math.min(g.measureText(txt).width + 30, SW - 70), x = bot ? 18 : SW - 18 - w;
      g.fillStyle = bot ? '#262b45' : acc; rr(g, x, y, w, 42, 14); g.fill();
      g.fillStyle = '#f3f4ff'; g.fillText(txt, x + 15, y + 22);
      y += 56;
    }
    if (step < msgs.length && step % 2 === 1) typingDots(g, 18, y, t);
  },
  docs(g, t, sc, acc) {
    g.textBaseline = 'middle';
    for (let k = 0; k < 2; k++) {
      const x = 22 + k * 112, y = 48 + k * 16;
      g.fillStyle = '#f5f1e8'; rr(g, x, y, 150, 220, 8); g.fill();
      g.fillStyle = k ? '#2b6cd4' : '#d4402b'; rr(g, x + 10, y + 10, 46, 20, 4); g.fill();
      g.fillStyle = '#fff'; g.font = `700 11px ${MONO}`; g.fillText(k ? 'DOCX' : 'PDF', x + 16, y + 20);
      for (let l = 0; l < 12; l++) { g.fillStyle = '#cfc8b8'; g.fillRect(x + 12, y + 42 + l * 14, 96 + ((l * 37 + k * 11) % 30), 5); }
    }
    const l = Math.floor((t * 1.2) % 12);
    g.fillStyle = 'rgba(255,205,40,.55)'; g.fillRect(142, 64 + 38 + l * 14, 134, 13);
    const x = 314, y = 50;
    g.fillStyle = '#262b45'; rr(g, x, y, 212, 232, 16); g.fill();
    g.fillStyle = acc; g.font = `700 17px ${FONT}`; g.fillText('Rhéa', x + 16, y + 24);
    g.fillStyle = '#8f98c2'; g.font = `500 12px ${MONO}`; g.fillText('🔒 accès : salarié', x + 16, y + 48);
    for (let r = 0; r < 5; r++) { g.fillStyle = 'rgba(230,233,255,.7)'; g.fillRect(x + 16, y + 70 + r * 18, r === 4 ? 90 : 172, 7); }
    g.fillStyle = 'rgba(255,255,255,.08)'; rr(g, x + 14, y + 172, 184, 42, 10); g.fill();
    g.fillStyle = '#e6e9ff'; g.font = `500 13px ${FONT}`; g.fillText('📎 Accord télétravail · p.4', x + 24, y + 193);
  },
  chart(g, t, sc, acc) {
    const x0 = 46, y0 = 290, w = 466, h = 200, N = 64, split = 44;
    const f = (i) => 120 + 38 * Math.sin(i / 4.3) + i * 1.6 + 10 * Math.sin(i * 1.9);
    const X = (i) => x0 + (i / (N - 1)) * w, Y = (v) => y0 - ((v - 60) / 240) * h;
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
    for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(x0, y0 - (k * h) / 4); g.lineTo(x0 + w, y0 - (k * h) / 4); g.stroke(); }
    const prog = ((t * 0.22) % 1.4) * 1.6;
    const nHist = Math.min(split, Math.floor(prog * split));
    g.strokeStyle = '#6ea8ff'; g.lineWidth = 3; g.beginPath();
    for (let i = 0; i <= nHist; i++) (i ? g.lineTo(X(i), Y(f(i))) : g.moveTo(X(i), Y(f(i))));
    g.stroke();
    if (nHist >= split) {
      const nF = Math.min(N - 1, split + Math.floor((prog - 1) * (N - split) * 1.5));
      g.fillStyle = hexA(acc, 0.2); g.beginPath();
      for (let i = split; i <= nF; i++) g.lineTo(X(i), Y(f(i) + 6 + (i - split) * 1.4));
      for (let i = nF; i >= split; i--) g.lineTo(X(i), Y(f(i) - 6 - (i - split) * 1.4));
      g.closePath(); g.fill();
      g.setLineDash([8, 6]); g.strokeStyle = acc; g.beginPath();
      for (let i = split; i <= nF; i++) (i === split ? g.moveTo(X(i), Y(f(i))) : g.lineTo(X(i), Y(f(i))));
      g.stroke(); g.setLineDash([]);
    }
    g.textBaseline = 'middle';
    g.fillStyle = '#e6e9ff'; g.font = `700 16px ${FONT}`; g.fillText('Besoins — composant P-204', 46, 56);
    g.font = `500 12px ${MONO}`;
    g.fillStyle = '#6ea8ff'; g.fillRect(372, 50, 14, 4); g.fillStyle = '#8f98c2'; g.fillText('historique', 392, 52);
    g.fillStyle = acc; g.fillRect(372, 68, 14, 4); g.fillStyle = '#8f98c2'; g.fillText('prévision', 392, 70);
  },
  mail(g, t, sc, acc) {
    const rows = [['🧺', 'Vente de pagnes en ligne', 9], ['🥤', 'Bar à jus en kiosque', 8], ['📱', 'Réparation de smartphones', 8], ['🎓', 'Cours de code pour ados', 7]];
    g.textBaseline = 'middle';
    g.fillStyle = '#e6e9ff'; g.font = `700 17px ${FONT}`; g.fillText('📬 Veille du jour · 09:00', 22, 58);
    const n = Math.floor(t / 1.1) % (rows.length + 3);
    rows.slice(0, n).forEach(([ic, label, score], i) => {
      const y = 84 + i * 54;
      g.fillStyle = i === Math.min(n, rows.length) - 1 ? '#2b3152' : '#20253d'; rr(g, 18, y, SW - 36, 44, 12); g.fill();
      g.fillStyle = '#fff'; g.font = `20px ${EMOJI}`; g.fillText(ic, 32, y + 23);
      g.fillStyle = '#e6e9ff'; g.font = `500 16px ${FONT}`; g.fillText(label, 68, y + 22);
      g.fillStyle = score >= 8 ? '#2fb67c' : acc; rr(g, SW - 94, y + 10, 58, 24, 8); g.fill();
      g.fillStyle = '#fff'; g.font = `700 13px ${MONO}`; g.fillText(score + '/10', SW - 86, y + 22);
    });
  },
  news(g, t, sc, acc) {
    g.fillStyle = '#f4efe4'; g.fillRect(0, 32, SW, SH - 32);
    g.fillStyle = '#1d1b26'; g.textBaseline = 'middle'; g.textAlign = 'center';
    g.font = '700 30px Georgia, serif'; g.fillText('TECH DAILY', SW / 2, 64);
    g.textAlign = 'left'; g.fillRect(20, 86, SW - 40, 2);
    for (let c = 0; c < 3; c++) {
      const x = 20 + c * 172;
      g.fillStyle = '#1d1b26'; g.fillRect(x, 108, 150, 12); g.fillRect(x, 126, 104, 12);
      for (let l = 0; l < 7; l++) { g.fillStyle = '#b9b2a3'; g.fillRect(x, 152 + l * 13, 150 - ((l * 23 + c * 7) % 40), 5); }
    }
    if (Math.sin(t * 4) > -0.3) { g.fillStyle = '#e0313f'; rr(g, 128, 96, 34, 18, 4); g.fill(); g.fillStyle = '#fff'; g.font = `700 11px ${MONO}`; g.fillText('IA', 137, 106); }
    g.fillStyle = acc; g.fillRect(0, SH - 36, SW, 36);
    g.fillStyle = '#fff'; g.font = `700 14px ${MONO}`;
    const msg = 'NOUVEAU MODÈLE · FRAMEWORK D’AGENTS · OPEN SOURCE · RAG · ROBOTIQUE · ';
    const mw = g.measureText(msg).width, off = (t * 60) % mw;
    g.fillText(msg + msg + msg, -off, SH - 17);
  },
  code(g, t, sc, acc) {
    if (!sc.lines) {
      let s = sc.seed;
      const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      sc.lines = [...Array(40)].map(() => {
        const toks = [];
        for (let k = 0, n = 1 + Math.floor(r() * 4); k < n; k++) toks.push([20 + r() * 70, Math.floor(r() * 4)]);
        return [Math.floor(r() * 3), toks];
      });
    }
    const pal = [acc, '#7fdbca', '#c792ea', '#e6e9ff'], lh = 20, off = (t * 18) % (sc.lines.length * lh);
    g.textBaseline = 'middle'; g.font = `500 12px ${MONO}`;
    for (let i = 0; i < 16; i++) {
      const row = Math.floor(off / lh) + i, y = 44 + i * lh - (off % lh);
      const [ind, toks] = sc.lines[row % sc.lines.length];
      g.fillStyle = '#4a5072'; g.fillText(String((row % 999) + 1).padStart(3, ' '), 10, y + 6);
      let x = 52 + ind * 22;
      for (const [w, c] of toks) { g.fillStyle = pal[c]; rr(g, x, y + 1, w, 9, 4); g.fill(); x += w + 8; }
    }
  },
  hire(g, t, sc, acc) {
    const cx = SW / 2, cy = 150, r = 52 + Math.sin(t * 3) * 6;
    g.fillStyle = hexA(acc, 0.18); g.beginPath(); g.arc(cx, cy, r + 18, 0, 7); g.fill();
    g.fillStyle = acc; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.fillRect(cx - 22, cy - 5, 44, 10); g.fillRect(cx - 5, cy - 22, 10, 44);
    g.font = `700 24px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#e6e9ff';
    g.fillText('Ton projet ici' + (Math.floor(t * 2) % 2 ? '_' : ' '), cx, 256);
    g.textAlign = 'left';
  },
  transfer(g, t, sc, acc) {
    g.textBaseline = 'middle';
    g.fillStyle = '#e6e9ff'; g.font = `700 17px ${FONT}`; g.fillText('Transfert #MC-2048', 22, 56);
    g.fillStyle = '#20253d'; rr(g, 22, 76, SW - 44, 84, 14); g.fill();
    g.font = `500 13px ${MONO}`; g.fillStyle = '#8f98c2'; g.fillText('Moscou', 42, 98);
    g.textAlign = 'right'; g.fillText('Abidjan', SW - 42, 98);
    g.font = `700 24px ${FONT}`; g.fillStyle = '#fff'; g.fillText('105 000 FCFA', SW - 42, 132);
    g.textAlign = 'left'; g.fillText('15 000 ₽', 42, 132);
    for (let d = 0; d < 5; d++) {
      const a = (t * 1.5 + d / 5) % 1;
      g.fillStyle = hexA(acc, 0.25 + 0.75 * (1 - Math.abs(a - 0.5) * 2)); g.beginPath(); g.arc(206 + d * 26, 132, 4, 0, 7); g.fill();
    }
    const steps = ['Envoyé', 'En traitement', 'Disponible'], done = Math.floor(t / 1.4) % 4, y = 206, x0 = 80, gap = (SW - 160) / 2;
    g.lineWidth = 4; g.strokeStyle = '#2b3152'; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + gap * 2, y); g.stroke();
    if (done > 1) { g.strokeStyle = acc; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + gap * (done - 1), y); g.stroke(); }
    g.textAlign = 'center';
    steps.forEach((s, i) => {
      const x = x0 + i * gap, on = i < done;
      g.fillStyle = on ? acc : '#2b3152'; g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill();
      if (on) { g.fillStyle = '#fff'; g.font = `700 13px ${FONT}`; g.fillText('✓', x, y + 1); }
      g.fillStyle = on ? '#e6e9ff' : '#6b7299'; g.font = `500 13px ${FONT}`; g.fillText(s, x, y + 30);
    });
    g.textAlign = 'left';
    if (done === 3) { g.fillStyle = '#262b45'; rr(g, 22, 262, SW - 44, 40, 12); g.fill(); g.fillStyle = '#e6e9ff'; g.font = `500 14px ${FONT}`; g.fillText("🔔 L'argent est disponible à Abidjan", 38, 282); }
  },
  flight(g, t, sc, acc) {
    g.textBaseline = 'middle';
    g.fillStyle = '#e6e9ff'; g.font = `700 17px ${FONT}`; g.fillText('Vols avec kilos disponibles', 22, 56);
    const ax = 70, ay = 150, bx = SW - 70, by = 150, cx = SW / 2, cy = 66;
    g.setLineDash([6, 6]); g.strokeStyle = '#4a5072'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(cx, cy, bx, by); g.stroke(); g.setLineDash([]);
    g.textAlign = 'center';
    for (const [x, y, l] of [[ax, ay, 'MOW'], [bx, by, 'ABJ']]) { g.fillStyle = acc; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); g.fillStyle = '#8f98c2'; g.font = `700 12px ${MONO}`; g.fillText(l, x, y + 20); }
    const k = (t * 0.18) % 1, u = 1 - k;
    const px = u * u * ax + 2 * u * k * cx + k * k * bx, py = u * u * ay + 2 * u * k * cy + k * k * by;
    g.save(); g.translate(px, py); g.rotate(Math.atan2(2 * u * (cy - ay) + 2 * k * (by - cy), 2 * u * (cx - ax) + 2 * k * (bx - cx)));
    g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(15, 0); g.lineTo(-11, -4); g.lineTo(-11, 4); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(3, 0); g.lineTo(-6, -14); g.lineTo(-2, 0); g.lineTo(-6, 14); g.closePath(); g.fill();
    g.restore(); g.textAlign = 'left';
    const rows = [['MOW → ABJ', '12 nov.', '8 kg'], ['SVO → ABJ', '19 nov.', '5 kg'], ['MOW → DKR', '23 nov.', '12 kg']];
    rows.forEach(([r, d, kg], i) => {
      const y = 196 + i * 40;
      g.fillStyle = i === Math.floor(t / 1.5) % 3 ? '#2b3152' : '#20253d'; rr(g, 22, y, SW - 44, 32, 10); g.fill();
      g.fillStyle = '#e6e9ff'; g.font = `700 13px ${MONO}`; g.fillText(r, 36, y + 16);
      g.fillStyle = '#8f98c2'; g.font = `500 13px ${FONT}`; g.fillText(d, 180, y + 16);
      g.fillStyle = '#e6e9ff'; g.fillText(kg + ' dispo', 266, y + 16);
      g.fillStyle = acc; rr(g, SW - 120, y + 5, 84, 22, 8); g.fill();
      g.fillStyle = '#fff'; g.font = `700 12px ${FONT}`; g.fillText('Réserver', SW - 107, y + 16);
    });
  },
  shop(g, t, sc, acc) {
    g.textBaseline = 'middle';
    g.fillStyle = '#e6e9ff'; g.font = `700 17px ${FONT}`; g.fillText('Annonces près de toi', 22, 56);
    g.fillStyle = acc; rr(g, SW - 120, 42, 98, 28, 9); g.fill();
    g.fillStyle = '#fff'; g.font = `700 13px ${FONT}`; g.fillText('+ Vendre', SW - 101, 56);
    const items = [['👗', 'Robe en wax', '2 500 ₽'], ['📱', 'Smartphone', '9 000 ₽'], ['🛋️', 'Canapé', '6 000 ₽'], ['👟', 'Baskets', '3 200 ₽'], ['🎧', 'Casque audio', '1 800 ₽'], ['📚', 'Manuels', '900 ₽']];
    const hi = Math.floor(t / 1.2) % items.length, cw = (SW - 64) / 3, ch = 108;
    items.forEach(([ic, name, price], i) => {
      const x = 22 + (i % 3) * (cw + 10), y = 82 + Math.floor(i / 3) * (ch + 10);
      g.fillStyle = i === hi ? '#2b3152' : '#20253d'; rr(g, x, y, cw, ch, 12); g.fill();
      if (i === hi) { g.strokeStyle = acc; g.lineWidth = 2; rr(g, x, y, cw, ch, 12); g.stroke(); }
      g.fillStyle = hexA(acc, 0.18); rr(g, x + 8, y + 8, cw - 16, 50, 8); g.fill();
      g.fillStyle = '#fff'; g.font = `30px ${EMOJI}`; g.textAlign = 'center'; g.fillText(ic, x + cw / 2, y + 34); g.textAlign = 'left';
      g.fillStyle = '#e6e9ff'; g.font = `500 13px ${FONT}`; g.fillText(name, x + 10, y + 74);
      g.fillStyle = acc; g.font = `700 14px ${MONO}`; g.fillText(price, x + 10, y + 94);
    });
  },
  score(g, t, sc, acc) {
    g.textBaseline = 'middle';
    g.fillStyle = '#e6e9ff'; g.font = `700 17px ${FONT}`; g.fillText('IvoScore · client #4821', 22, 56);
    const v = 0.5 + 0.5 * Math.sin(t * 0.5), score = Math.round(300 + v * 550), cx = 140, cy = 212, r = 86;
    const [label, col] = score > 650 ? ['Risque faible', '#2fb67c'] : score > 500 ? ['Risque modéré', acc] : ['Risque élevé', '#e0313f'];
    g.lineWidth = 16; g.lineCap = 'round';
    g.strokeStyle = '#2b3152'; g.beginPath(); g.arc(cx, cy, r, Math.PI, 2 * Math.PI); g.stroke();
    g.strokeStyle = col; g.beginPath(); g.arc(cx, cy, r, Math.PI, Math.PI + Math.max(0.02, v) * Math.PI); g.stroke();
    g.lineCap = 'butt'; g.textAlign = 'center';
    g.fillStyle = '#fff'; g.font = `700 38px ${FONT}`; g.fillText(score, cx, cy - 20);
    g.fillStyle = '#8f98c2'; g.font = `500 12px ${MONO}`; g.fillText('sur 850', cx, cy + 8);
    g.fillStyle = col; rr(g, cx - 62, cy + 28, 124, 26, 9); g.fill();
    g.fillStyle = '#fff'; g.font = `700 13px ${FONT}`; g.fillText(label, cx, cy + 41);
    g.textAlign = 'left';
    ['Régularité des revenus', 'Ancienneté du compte', 'Recharges mensuelles', 'Solde moyen'].forEach((name, i) => {
      const y = 96 + i * 50, w = 220 * (0.3 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.5 + i * 0.9)));
      g.fillStyle = '#8f98c2'; g.font = `500 13px ${FONT}`; g.fillText(name, 292, y);
      g.fillStyle = '#2b3152'; rr(g, 292, y + 14, 220, 10, 5); g.fill();
      g.fillStyle = acc; rr(g, 292, y + 14, w, 10, 5); g.fill();
    });
  },
};

function drawImageCover(g, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height), iw = img.width * s, ih = img.height * s;
  g.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

export function drawScreen(sc, t) {
  const { g, p } = sc, acc = hex(p.look.shirt);
  g.save();
  g.fillStyle = '#141726'; g.fillRect(0, 0, SW, SH);
  g.fillStyle = '#1e2236'; g.fillRect(0, 0, SW, 30);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(18 + i * 18, 15, 5, 0, 7); g.fill(); });
  g.fillStyle = '#8f98c2'; g.font = `500 13px ${MONO}`; g.textBaseline = 'middle'; g.fillText(p.file || 'README.md', 82, 16);
  g.fillStyle = acc; g.fillRect(0, 30, SW, 2);
  g.beginPath(); g.rect(0, 32, SW, SH - 32); g.clip();
  if (sc.img) drawImageCover(g, sc.img, 0, 32, SW, SH - 32);
  else (SCREENS[sc.type] || SCREENS.code)(g, t, sc, acc);
  g.restore();
  sc.tex.needsUpdate = true;
}

export function createScreen(p, i) {
  const [c, g] = makeCanvas(SW, SH);
  const sc = { c, g, p, tex: texFrom(c), type: p.screen || 'code', seed: i * 97 + 13, img: null };
  // Une capture hébergée sur ce site (ex. /images/projet.png) remplace l'écran généré.
  // Les images d'autres sites restent dans le panneau : sans CORS, WebGL ne peut pas les afficher.
  const src = p.images?.[0];
  if (src && new URL(src, location.href).origin === location.origin) {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => { sc.img = im; };
    im.src = src;
  }
  drawScreen(sc, 0);
  world.screens.push(sc);
  return sc;
}

/* Visuel de couverture généré (quand le projet n'a pas encore d'image) */
export function makeCover(p, look) {
  const [c, g] = makeCanvas(960, 540);
  const grd = g.createLinearGradient(0, 0, 960, 540);
  const base = look.accent ?? look.shirt;
  grd.addColorStop(0, hex(base)); grd.addColorStop(1, '#' + shade(base, -0.55).getHexString());
  g.fillStyle = grd; g.fillRect(0, 0, 960, 540);
  g.fillStyle = 'rgba(255,255,255,.10)';
  for (let y = 24; y < 540; y += 36) for (let x = 24; x < 960; x += 36) { g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(800, 110, 230, 0, 7); g.fill();
  g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.arc(880, 520, 160, 0, 7); g.fill();
  g.textBaseline = 'alphabetic'; g.fillStyle = '#fff'; g.font = `130px ${EMOJI}`; g.fillText(p.icon || '✨', 64, 200);
  g.fillStyle = '#fff'; g.font = `700 66px ${FONT}`;
  const lines = wrapLines(g, p.title, 830).slice(0, 2);
  lines.forEach((l, i) => g.fillText(l, 64, 310 + i * 72));
  g.font = `500 24px ${MONO}`;
  let x = 64; const y = 310 + lines.length * 72 + 18;
  for (const s of (p.stack || []).slice(0, 4)) {
    const w = g.measureText(s).width + 32;
    if (x + w > 900) break;
    g.fillStyle = 'rgba(255,255,255,.16)'; rr(g, x, y - 30, w, 44, 12); g.fill();
    g.fillStyle = '#fff'; g.fillText(s, x + 16, y);
    x += w + 10;
  }
  return c.toDataURL('image/jpeg', 0.88);
}
