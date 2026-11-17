/* Pixel art generado por código: baldosas, personajes y criaturas. */
'use strict';

function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}

/* Ayudantes de dibujo sobre un contexto */
function pen(g, ox, oy) {
  ox = ox || 0; oy = oy || 0;
  return {
    r(x, y, w, h, c) { g.fillStyle = c; g.fillRect(ox + x, oy + y, w, h); },
    e(cx, cy, rx, ry, c) {
      g.fillStyle = c;
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
          if (dx * dx + dy * dy <= 1) g.fillRect(ox + x, oy + y, 1, 1);
        }
    },
    t(x1, y1, x2, y2, x3, y3, c) {
      g.fillStyle = c;
      const minX = Math.floor(Math.min(x1, x2, x3)), maxX = Math.ceil(Math.max(x1, x2, x3));
      const minY = Math.floor(Math.min(y1, y2, y3)), maxY = Math.ceil(Math.max(y1, y2, y3));
      const area = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1);
      if (!area) return;
      for (let y = minY; y <= maxY; y++)
        for (let x = minX; x <= maxX; x++) {
          const px = x + 0.5, py = y + 0.5;
          const a = ((x2 - px) * (y3 - py) - (x3 - px) * (y2 - py)) / area;
          const b = ((x3 - px) * (y1 - py) - (x1 - px) * (y3 - py)) / area;
          const cc = 1 - a - b;
          if (a >= 0 && b >= 0 && cc >= 0) g.fillRect(ox + x, oy + y, 1, 1);
        }
    },
  };
}

/* Sombreado de volumen y contorno oscuro automáticos */
function finishSprite(canvas, outlineColor, shade) {
  const g = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  const img = g.getImageData(0, 0, w, h), d = img.data;
  const src = new Uint8ClampedArray(d);
  const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : src[(y * w + x) * 4 + 3];
  const oc = outlineColor || [40, 36, 56];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (src[i + 3]) {
      if (!shade) continue;
      if (!A(x + 2, y + 2) || !A(x, y + 3)) {
        d[i] = src[i] * 0.76; d[i + 1] = src[i + 1] * 0.76; d[i + 2] = src[i + 2] * 0.8;
      } else if (!A(x - 2, y - 2) || !A(x, y - 3)) {
        d[i] = src[i] + (255 - src[i]) * 0.2; d[i + 1] = src[i + 1] + (255 - src[i + 1]) * 0.2;
        d[i + 2] = src[i + 2] + (255 - src[i + 2]) * 0.2;
      }
    } else if (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1)) {
      d[i] = oc[0]; d[i + 1] = oc[1]; d[i + 2] = oc[2]; d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return canvas;
}

function flipH(canvas) {
  const [c, g] = mkCanvas(canvas.width, canvas.height);
  g.translate(canvas.width, 0); g.scale(-1, 1);
  g.drawImage(canvas, 0, 0);
  return c;
}

/* ---------- Criaturas (48x48) ---------- */
function eye(p, x, y, white) {
  p.r(x, y, 4, 5, white || '#ffffff');
  p.r(x + 1, y + 1, 2, 4, '#202030');
  p.r(x + 1, y + 1, 1, 1, '#ffffff');
}
const MON_ART = {
  brotin(p, b) {
    p.e(16, 42, 5, 3, '#4a9a3a'); p.e(32, 42, 5, 3, '#4a9a3a');
    p.e(24, 31, 13, 11, '#7ed060');
    p.r(23, 14, 2, 7, '#3a8030');
    p.t(24, 17, 8, 5, 22, 7, '#3fae4f'); p.t(24, 17, 40, 5, 26, 7, '#3fae4f');
    if (!b) {
      p.e(24, 36, 8, 6, '#d4f0a0');
      eye(p, 15, 25); eye(p, 29, 25);
      p.r(22, 34, 4, 1, '#2a5020'); p.r(12, 32, 3, 2, '#f0a0a0'); p.r(33, 32, 3, 2, '#f0a0a0');
    } else { p.e(18, 30, 3, 2, '#5ab048'); p.e(30, 35, 3, 2, '#5ab048'); p.e(25, 27, 2, 2, '#5ab048'); }
  },
  ascuino(p, b) {
    p.t(14, 9, 11, 22, 21, 22, '#f05a28');
    p.t(24, 1, 14, 23, 34, 23, '#f05a28'); p.t(24, 9, 19, 23, 29, 23, '#ffc830');
    p.e(17, 42, 5, 3, '#352c3a'); p.e(31, 42, 5, 3, '#352c3a');
    p.e(11, 33, 3, 4, '#5a4c60'); p.e(37, 33, 3, 4, '#5a4c60');
    p.e(24, 31, 12, 11, '#5a4c60');
    if (!b) {
      p.e(24, 36, 7, 6, '#f0b050');
      eye(p, 15, 25, '#ffe9a0'); eye(p, 29, 25, '#ffe9a0');
      p.r(22, 33, 4, 1, '#201820');
    } else { p.r(20, 29, 2, 6, '#f05a28'); p.r(27, 32, 2, 5, '#f05a28'); p.r(23, 37, 3, 2, '#ffc830'); }
  },
  gotiko(p, b) {
    p.t(35, 36, 46, 27, 46, 45, '#2a70c8');
    p.t(24, 5, 13, 27, 35, 27, '#4aa0e8');
    p.e(10, 34, 3, 5, '#2a70c8'); p.e(38, 34, 3, 5, '#2a70c8');
    p.e(17, 42, 5, 3, '#2a70c8'); p.e(31, 42, 5, 3, '#2a70c8');
    p.e(24, 31, 13, 11, '#4aa0e8');
    if (!b) {
      p.e(24, 36, 8, 6, '#d0f0ff'); p.r(21, 13, 2, 4, '#c0e8ff');
      eye(p, 15, 25); eye(p, 29, 25);
      p.r(22, 33, 4, 1, '#103060');
    } else { p.e(24, 29, 3, 8, '#2a70c8'); }
  },
  roedin(p, b) {
    p.r(35, 38, 9, 2, '#d09a80'); p.r(42, 33, 2, 6, '#d09a80');
    p.e(13, 16, 6, 7, '#a87848'); p.e(35, 16, 6, 7, '#a87848');
    if (!b) { p.e(13, 17, 3, 4, '#f0b0b0'); p.e(35, 17, 3, 4, '#f0b0b0'); }
    p.e(17, 42, 4, 3, '#8a6038'); p.e(31, 42, 4, 3, '#8a6038');
    p.e(24, 32, 12, 11, '#b88858');
    if (!b) {
      p.e(24, 37, 7, 5, '#f0dcb8');
      eye(p, 15, 25); eye(p, 29, 25);
      p.r(23, 31, 2, 2, '#e06070'); p.r(22, 34, 4, 3, '#ffffff'); p.r(24, 34, 1, 3, '#c0c0c0');
    } else { p.e(24, 30, 4, 7, '#8a6038'); }
  },
  plumelo(p, b) {
    p.t(24, 7, 19, 20, 27, 20, '#4a90c8'); p.t(30, 10, 25, 20, 32, 20, '#4a90c8');
    p.e(11, 31, 5, 8, '#5aa0d8'); p.e(37, 31, 5, 8, '#5aa0d8');
    p.r(18, 41, 4, 3, '#f0a030'); p.r(26, 41, 4, 3, '#f0a030');
    p.e(24, 30, 11, 11, '#9ad8f4');
    if (!b) {
      p.e(24, 35, 6, 5, '#ffffff');
      eye(p, 15, 23); eye(p, 29, 23);
      p.t(24, 35, 20, 29, 28, 29, '#f0a030');
    } else { p.t(24, 45, 17, 35, 31, 35, '#4a90c8'); p.e(24, 28, 4, 5, '#7cc0e8'); }
  },
  larvita(p, b) {
    p.r(27, 41, 3, 3, '#507020'); p.r(35, 42, 3, 2, '#507020'); p.r(14, 38, 3, 3, '#507020');
    p.e(38, 37, 6, 6, '#8cc838'); p.e(29, 35, 7, 7, '#a0d848');
    p.r(11, 11, 2, 9, '#604828'); p.r(21, 11, 2, 9, '#604828');
    p.e(12, 10, 2, 2, '#e05050'); p.e(22, 10, 2, 2, '#e05050');
    p.e(17, 29, 10, 10, '#c0ec60');
    p.e(30, 33, 2, 2, '#f0e060'); p.e(38, 36, 2, 2, '#f0e060');
    if (!b) { eye(p, 9, 25); eye(p, 20, 25); p.r(15, 34, 4, 1, '#405010'); }
    else { p.e(17, 28, 3, 3, '#a0d848'); }
  },
  chispo(p, b) {
    const Y = '#f8d030';
    p.t(24, 5, 18, 22, 30, 22, Y); p.t(7, 13, 13, 27, 21, 20, Y); p.t(41, 13, 35, 27, 27, 20, Y);
    p.t(3, 31, 14, 27, 14, 37, Y); p.t(45, 31, 34, 27, 34, 37, Y);
    p.t(24, 5, 21, 12, 27, 12, '#30b8a8');
    p.e(17, 42, 4, 3, '#30a898'); p.e(31, 42, 4, 3, '#30a898');
    p.e(24, 31, 12, 11, Y);
    if (!b) {
      eye(p, 15, 25); eye(p, 29, 25);
      p.r(12, 33, 3, 2, '#30b8a8'); p.r(33, 33, 3, 2, '#30b8a8'); p.r(22, 34, 4, 1, '#604000');
    } else { p.r(20, 26, 6, 2, '#30a898'); p.r(23, 29, 6, 2, '#30a898'); p.r(20, 32, 6, 2, '#30a898'); }
  },
  pedrusco(p, b) {
    p.r(11, 39, 7, 5, '#6a6a78'); p.r(30, 39, 7, 5, '#6a6a78');
    p.e(24, 31, 15, 11, '#a0a0b0');
    p.t(12, 28, 18, 22, 21, 27, '#b8b8c8'); p.r(31, 35, 5, 3, '#8a8a98'); p.r(15, 37, 4, 2, '#8a8a98');
    p.e(24, 21, 10, 3, '#60a850'); p.e(17, 23, 4, 2, '#60a850'); p.e(29, 20, 3, 2, '#80c868');
    if (!b) {
      p.r(14, 28, 20, 6, '#3a3a48');
      p.r(17, 29, 3, 4, '#ffe060'); p.r(28, 29, 3, 4, '#ffe060');
      p.r(18, 30, 1, 2, '#202020'); p.r(29, 30, 1, 2, '#202020');
    } else { p.r(22, 26, 2, 8, '#6a6a78'); p.r(24, 32, 5, 2, '#6a6a78'); }
  },
  setin(p, b) {
    p.e(18, 43, 4, 2, '#d0b890'); p.e(30, 43, 4, 2, '#d0b890');
    p.e(24, 34, 8, 9, '#f4e6c8');
    p.e(24, 19, 17, 10, '#e0607c');
    p.e(15, 16, 3, 2, '#fff0f0'); p.e(31, 14, 3, 2, '#fff0f0'); p.e(24, 22, 2, 2, '#fff0f0'); p.e(37, 21, 2, 1.5, '#fff0f0');
    if (!b) { eye(p, 17, 30); eye(p, 27, 30); p.r(22, 38, 4, 1, '#705030'); }
    else { p.e(9, 21, 2, 1.5, '#fff0f0'); }
  },
  fulgato(p, b) {
    const C = '#f0b428';
    p.r(37, 30, 3, 8, '#30a898'); p.r(40, 23, 3, 9, '#30a898'); p.r(37, 18, 3, 7, '#30a898');
    p.t(38, 10, 34, 19, 43, 19, '#f8d030');
    p.t(13, 16, 15, 3, 22, 13, C); p.t(35, 16, 33, 3, 26, 13, C);
    p.e(15, 43, 4, 2, '#c08818'); p.e(33, 43, 4, 2, '#c08818');
    p.e(24, 35, 12, 8, C);
    p.e(24, 20, 11, 9, C);
    p.r(22, 11, 4, 3, '#30a898'); p.r(13, 33, 3, 5, '#c08818'); p.r(32, 33, 3, 5, '#c08818');
    if (!b) {
      eye(p, 15, 17); eye(p, 29, 17);
      p.e(24, 25, 4, 2, '#fff0c0'); p.r(23, 23, 2, 2, '#703030'); p.e(24, 37, 5, 4, '#fff0c0');
    } else { p.r(18, 33, 12, 2, '#c08818'); p.r(20, 37, 8, 2, '#c08818'); p.r(21, 17, 6, 2, '#c08818'); }
  },
};

/* ---------- Personajes (16x18) ---------- */
const CHAR_PAL = {
  player: { hat: '#2aa0a8', hair: '#503820', shirt: '#f0c030', pants: '#3050a0' },
  mom:    { hair: '#a05030', shirt: '#e87090', pants: '#f0e0d0', long: true },
  prof:   { hair: '#b0b0b8', shirt: '#f8f8f8', pants: '#606878' },
  rival:  { hair: '#8040b0', shirt: '#303040', pants: '#806040' },
  boy:    { hat: '#e05030', hair: '#604020', shirt: '#50a0e0', pants: '#405060' },
  girl:   { hair: '#f0c040', shirt: '#60c080', pants: '#a04060', long: true },
  old:    { hair: '#e0e0e0', shirt: '#907050', pants: '#605040' },
  nurse:  { hair: '#f080a0', shirt: '#ffffff', pants: '#f0b0c0', long: true },
  clerk:  { hair: '#304050', shirt: '#40a060', pants: '#e0e0d0' },
  bug:    { hat: '#e8e0a0', hair: '#604020', shirt: '#70b040', pants: '#806030' },
  leader: { hair: '#f0d020', shirt: '#202838', pants: '#f0d020' },
  woman:  { hair: '#303050', shirt: '#c060c0', pants: '#404060', long: true },
};
function drawChar(p, dir, frame, pal) {
  const skin = pal.skin || '#f8c8a0', top = pal.hat || pal.hair, dark = '#202030';
  const len = frame === 1 ? [2, 3] : frame === 2 ? [3, 2] : [3, 3];
  p.r(5, 13, 3, len[0], pal.pants); p.r(8, 13, 3, len[1], pal.pants);
  p.r(5, 12 + len[0], 3, 1, '#403030'); p.r(8, 12 + len[1], 3, 1, '#403030');
  p.r(4, 9, 8, 4, pal.shirt);
  if (dir === 'left') {
    p.r(7, 10, 2, 2, pal.shirt); p.r(7, 12, 2, 1, skin); p.r(6, 10, 1, 2, dark);
  } else {
    p.r(3, 9, 1, 3, pal.shirt); p.r(12, 9, 1, 3, pal.shirt);
    p.r(3, 12, 1, 1, skin); p.r(12, 12, 1, 1, skin);
  }
  p.r(4, 3, 8, 6, skin);
  p.r(4, 1, 8, 3, top);
  if (dir === 'down') {
    p.r(3, 2, 1, pal.long ? 8 : 4, pal.hair); p.r(12, 2, 1, pal.long ? 8 : 4, pal.hair);
    p.r(5, 6, 1, 2, dark); p.r(10, 6, 1, 2, dark);
    if (pal.hat) p.r(3, 4, 10, 1, pal.hat);
  } else if (dir === 'up') {
    p.r(3, 2, 10, pal.long ? 8 : 6, pal.hair);
    if (pal.hat) p.r(4, 1, 8, 3, pal.hat);
  } else {
    p.r(7, 3, 5, pal.long ? 7 : 5, pal.hair); p.r(12, 2, 1, pal.long ? 7 : 5, pal.hair);
    p.r(5, 6, 1, 2, dark);
    if (pal.hat) { p.r(4, 1, 8, 3, pal.hat); p.r(2, 4, 5, 1, pal.hat); }
  }
}

/* ---------- Baldosas ---------- */
function hash3(a, b, c) {
  let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791);
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}
const ROOFS = {
  R: ['#d85040', '#a83828', '#f07860'], L: ['#6888a8', '#48688a', '#90b0cc'],
  H: ['#48a878', '#2f8058', '#78d0a0'], M: ['#e8b030', '#b88418', '#f8d870'],
  G: ['#8858c0', '#643c98', '#b088e0'],
};
const BUILDING = 'RLHMGWwDhmg';
const FLOORS = {
  home:   ['#e8c890', '#d0ac70', 'plank', '#f0e4c8'],
  lab:    ['#dfe8ee', '#c0ccd6', 'grid', '#e8eef4'],
  center: ['#f8e8d0', '#f0d4b0', 'check', '#fff0e0'],
  shop:   ['#d8ecf4', '#b8d4e0', 'grid', '#eef6fa'],
  gym:    ['#d8d0b8', '#b8ae90', 'grid', '#e8e0c8'],
};

function drawTile(g, ch, tx, ty, fr, def) {
  const p = pen(g, tx * TS, ty * TS), R = p.r;
  const at = (dx, dy) => { const row = def.t[ty + dy]; return row ? (row[tx + dx] || ' ') : ' '; };
  const rn = (i, n) => hash3(tx, ty, i) % n;
  const grass = () => {
    R(0, 0, 16, 16, '#7ccf58');
    for (let i = 0; i < 5; i++) R(rn(i, 14), rn(i + 9, 15), 2, 1, '#62b848');
    for (let i = 0; i < 3; i++) R(rn(i + 20, 15), rn(i + 30, 15), 1, 1, '#a8e880');
  };
  const fl = FLOORS[def.style] || FLOORS.home;
  const floor = () => {
    R(0, 0, 16, 16, fl[0]);
    if (fl[2] === 'plank') { R(0, 7, 16, 1, fl[1]); R(0, 15, 16, 1, fl[1]); R(ty % 2 ? 4 : 11, 0, 1, 7, fl[1]); R(ty % 2 ? 11 : 4, 8, 1, 7, fl[1]); }
    else if (fl[2] === 'check') { if ((tx + ty) % 2) R(0, 0, 16, 16, fl[1]); }
    else { R(0, 15, 16, 1, fl[1]); R(15, 0, 1, 16, fl[1]); }
  };
  const outline = () => {
    if (!BUILDING.includes(at(-1, 0))) R(0, 0, 1, 16, '#28283a');
    if (!BUILDING.includes(at(1, 0))) R(15, 0, 1, 16, '#28283a');
    if (!BUILDING.includes(at(0, -1))) R(0, 0, 16, 1, '#28283a');
  };
  const wall = () => { R(0, 0, 16, 16, '#f4ecd8'); R(0, 13, 16, 3, '#c8b89c'); R(0, 12, 16, 1, '#e0d4b8'); };

  if (ROOFS[ch]) {
    const c = ROOFS[ch];
    R(0, 0, 16, 16, c[0]);
    for (let b = 0; b < 4; b++) {
      R(0, b * 4 + 3, 16, 1, c[1]);
      R(((b + ty) % 2 ? 3 : 11), b * 4, 1, 3, c[1]);
    }
    if (!ROOFS[at(0, -1)]) R(0, 0, 16, 2, c[2]);
    if (!ROOFS[at(0, 1)]) R(0, 13, 16, 3, c[1]);
    outline();
    return;
  }
  switch (ch) {
    case '.': grass(); break;
    case ',': {
      R(0, 0, 16, 16, '#5cb04a');
      [[1, 2], [9, 0], [5, 8], [12, 9]].forEach(([a, b]) => {
        R(a, b + 2, 1, 5, '#2f7f30'); R(a + 1, b, 1, 7, '#3f9a3a'); R(a + 2, b + 1, 1, 6, '#2f7f30'); R(a + 3, b + 3, 1, 4, '#8cd870');
      });
      break;
    }
    case ':': {
      R(0, 0, 16, 16, '#e4cf9a');
      for (let i = 0; i < 4; i++) R(rn(i, 15), rn(i + 5, 15), 2, 1, '#cdb67e');
      for (let i = 0; i < 2; i++) R(rn(i + 12, 15), rn(i + 17, 15), 1, 1, '#f4e8c0');
      const soft = c => c !== ':' && !BUILDING.includes(c);
      if (soft(at(0, -1))) R(0, 0, 16, 1, '#bfa870');
      if (soft(at(0, 1))) R(0, 15, 16, 1, '#bfa870');
      if (soft(at(-1, 0))) R(0, 0, 1, 16, '#bfa870');
      if (soft(at(1, 0))) R(15, 0, 1, 16, '#bfa870');
      break;
    }
    case 'T':
      grass();
      p.e(8, 14, 6, 2, '#58a840');
      R(6, 11, 4, 5, '#7a5030'); R(6, 11, 1, 5, '#5a3820');
      p.e(8, 8, 8, 7.5, '#1f6e33'); p.e(8, 6.5, 8, 6.5, '#2e8b3e');
      p.e(6, 5, 4.5, 3.5, '#46ad52'); p.e(5, 4, 2, 1.5, '#6ccc70');
      break;
    case '~':
      R(0, 0, 16, 16, '#4c9cf0');
      if (fr === 0) { R(2, 3, 5, 1, '#9cd4ff'); R(9, 10, 5, 1, '#9cd4ff'); R(11, 5, 2, 1, '#78b8f8'); }
      else { R(6, 4, 5, 1, '#9cd4ff'); R(3, 11, 5, 1, '#9cd4ff'); R(12, 8, 2, 1, '#78b8f8'); }
      if (at(0, -1) !== '~') { R(0, 0, 16, 2, '#3478c8'); R(0, 2, 16, 1, '#b8e0ff'); }
      if (at(-1, 0) !== '~') R(0, 0, 1, 16, '#3478c8');
      if (at(1, 0) !== '~') R(15, 0, 1, 16, '#3478c8');
      if (at(0, 1) !== '~') R(0, 15, 16, 1, '#3478c8');
      break;
    case '*': {
      grass();
      const cols = ['#f05050', '#ffffff', '#f890c0', '#f8d030'];
      [[3, 3], [10, 6], [5, 11]].forEach(([a, b], i) => {
        const c = cols[rn(i + 40, 4)];
        R(a, b - 1, 1, 3, c); R(a - 1, b, 3, 1, c); R(a, b, 1, 1, '#f8a000');
      });
      break;
    }
    case 'f':
      grass();
      R(0, 6, 16, 2, '#f0e8d8'); R(0, 10, 16, 2, '#f0e8d8'); R(0, 8, 16, 1, '#b8a890'); R(0, 12, 16, 1, '#b8a890');
      R(1, 3, 3, 11, '#f0e8d8'); R(12, 3, 3, 11, '#f0e8d8'); R(3, 4, 1, 10, '#b8a890'); R(14, 4, 1, 10, '#b8a890');
      break;
    case 'o':
      grass();
      p.e(8, 10, 7, 6, '#6a6a78'); p.e(8, 9, 7, 5.5, '#8e8e9c'); p.e(6, 7, 3, 2, '#b4b4c2');
      break;
    case 'S':
      if (def.style) floor(); else grass();
      R(7, 9, 2, 6, '#7a5030');
      R(1, 1, 14, 9, '#7a5030'); R(2, 2, 12, 7, '#c89858'); R(4, 4, 8, 1, '#7a5030'); R(4, 6, 6, 1, '#7a5030');
      break;
    case 'W': case 'w': case 'D': case 'h': case 'm': case 'g':
      wall();
      if (ch === 'W') { R(3, 3, 10, 8, '#507090'); R(4, 4, 8, 6, '#a0d8f8'); R(8, 4, 1, 6, '#507090'); R(4, 6, 8, 1, '#507090'); R(5, 5, 2, 1, '#ffffff'); }
      if (ch === 'D') { R(2, 1, 12, 15, '#6a4020'); R(3, 2, 10, 14, '#b07840'); R(4, 3, 8, 5, '#c89050'); R(4, 9, 8, 6, '#c89050'); R(10, 9, 1, 2, '#f0d060'); }
      if (ch === 'h') { p.e(8, 7, 5.5, 5.5, '#2f8058'); p.e(8, 7, 4.5, 4.5, '#48a878'); R(7, 4, 2, 6, '#ffffff'); R(5, 6, 6, 2, '#ffffff'); }
      if (ch === 'm') { p.e(8, 7, 5.5, 5.5, '#b88418'); p.e(8, 7, 4.5, 4.5, '#e8b030'); R(7, 4, 2, 6, '#fff8d0'); R(6, 5, 4, 1, '#fff8d0'); R(6, 8, 4, 1, '#fff8d0'); }
      if (ch === 'g') { p.e(8, 7, 5.5, 5.5, '#643c98'); p.e(8, 7, 4.5, 4.5, '#8858c0'); R(8, 3, 2, 3, '#f8e040'); R(6, 6, 4, 2, '#f8e040'); R(6, 8, 2, 3, '#f8e040'); }
      outline();
      break;
    case '_': floor(); break;
    case '#':
      if (at(0, 1) !== '#' && at(0, 1) !== ' ' && ty === 0) {
        R(0, 0, 16, 16, fl[3]); R(0, 0, 16, 3, '#3a3448'); R(0, 3, 16, 1, '#5a5468'); R(0, 13, 16, 3, '#a08868'); R(0, 12, 16, 1, '#c0a888');
      } else { R(0, 0, 16, 16, '#3a3448'); R(0, 0, 16, 1, '#4c4660'); }
      break;
    case 'c': floor(); R(0, 2, 16, 12, '#a86838'); R(0, 2, 16, 5, '#e8b078'); R(0, 7, 16, 1, '#804820'); R(0, 14, 16, 1, '#604020'); break;
    case 't': floor(); R(1, 3, 14, 9, '#b87848'); R(1, 3, 14, 4, '#d8a068'); R(2, 12, 2, 3, '#7a5030'); R(12, 12, 2, 3, '#7a5030'); R(1, 11, 14, 1, '#7a5030'); break;
    case 'b': {
      R(0, 0, 16, 16, '#8a5a30'); R(1, 2, 14, 5, '#402818'); R(1, 9, 14, 5, '#402818');
      const bc = ['#e05050', '#50a0e0', '#f0c030', '#60c080', '#c060c0', '#f0f0f0'];
      for (let i = 0; i < 6; i++) { R(2 + i * 2, 3, 2, 4, bc[rn(i, 6)]); R(2 + i * 2, 10, 2, 4, bc[rn(i + 7, 6)]); }
      break;
    }
    case 'p': floor(); R(5, 10, 6, 5, '#c06040'); R(4, 10, 8, 1, '#e08060'); p.e(8, 6, 6, 5, '#2e8b3e'); p.e(6, 5, 3, 2.5, '#46ad52'); break;
    case 'E': floor(); R(1, 2, 14, 13, '#c83838'); R(3, 4, 10, 9, '#f07070'); R(7, 9, 2, 3, '#c83838'); R(6, 10, 4, 1, '#c83838'); break;
    case 'B': floor(); R(1, 0, 14, 16, '#7a5030'); R(2, 1, 12, 14, '#f0f0f8'); R(4, 2, 8, 4, '#ffffff'); R(2, 7, 12, 8, '#5080d0'); R(2, 7, 12, 1, '#80a8f0'); break;
    case 'k': floor(); R(2, 1, 12, 11, '#606878'); R(3, 2, 10, 7, '#283848'); R(4, 3, 8, 5, fr ? '#60e0c0' : '#50c8b0'); R(4, 12, 8, 3, '#404858'); R(5, 10, 2, 1, '#f05050'); break;
    case 's': floor(); R(3, 1, 10, 14, '#9a9aa8'); R(2, 1, 12, 3, '#c0c0cc'); R(2, 12, 12, 3, '#70707c'); R(8, 5, 2, 2, '#f8e040'); R(6, 7, 4, 1, '#f8e040'); R(6, 8, 2, 2, '#f8e040'); break;
    default: R(0, 0, 16, 16, '#101018');
  }
}

/* Dos fotogramas del mapa completo (animación del agua y pantallas) */
function renderMap(def) {
  const w = def.t[0].length, h = def.t.length, out = [];
  for (let fr = 0; fr < 2; fr++) {
    const [c, g] = mkCanvas(w * TS, h * TS);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) drawTile(g, def.t[y][x], x, y, fr, def);
    out.push(c);
  }
  return out;
}

/* ---------- Generación de todos los sprites ---------- */
const SPR = { mon: {}, chars: {}, orb: null, grassTop: null, badge: null };

function buildSprites() {
  for (const id in MON_ART) {
    const made = [false, true].map(back => {
      const [c, g] = mkCanvas(48, 48);
      MON_ART[id](pen(g), back);
      return finishSprite(c, null, true);
    });
    SPR.mon[id] = { front: made[0], back: flipH(made[1]) };
  }
  for (const id in CHAR_PAL) {
    const set = {};
    ['down', 'up', 'left'].forEach(dir => {
      set[dir] = [0, 1, 2].map(fr => {
        const [c, g] = mkCanvas(16, 18);
        drawChar(pen(g), dir, fr, CHAR_PAL[id]);
        return finishSprite(c, [40, 40, 58], false);
      });
    });
    set.right = set.left.map(flipH);
    SPR.chars[id] = set;
  }
  { // Orbe de captura
    const [c, g] = mkCanvas(12, 12), p = pen(g);
    p.e(6, 6, 4.5, 4.5, '#f4f4f8'); p.e(6, 4.6, 4.2, 3, '#28b0a8');
    p.r(2, 5, 8, 2, '#f0c030'); p.r(5, 5, 2, 2, '#ffffff'); p.r(4, 3, 2, 1, '#a0f0e8');
    SPR.orb = finishSprite(c, [40, 36, 56], false);
  }
  { // Parte baja de la hierba alta para tapar los pies
    const [c, g] = mkCanvas(16, 16);
    drawTile(g, ',', 0, 0, 0, { t: [','] });
    const [c2, g2] = mkCanvas(16, 6);
    g2.drawImage(c, 0, 10, 16, 6, 0, 0, 16, 6);
    SPR.grassTop = c2;
  }
  { // Medalla Chispa
    const [c, g] = mkCanvas(24, 24), p = pen(g);
    p.t(12, 1, 2, 12, 22, 12, '#f8d030'); p.t(12, 23, 2, 12, 22, 12, '#f0b020');
    p.e(12, 12, 6, 6, '#fff8c0');
    p.r(12, 7, 3, 4, '#30a898'); p.r(9, 11, 6, 2, '#30a898'); p.r(9, 13, 3, 4, '#30a898');
    SPR.badge = finishSprite(c, [40, 36, 56], true);
  }
}
