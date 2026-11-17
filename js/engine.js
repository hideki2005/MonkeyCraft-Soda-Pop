/* Motor: lienzo, entrada, fuente bitmap, cajas de texto, menús y animaciones. */
'use strict';

const VW = 240, VH = 160, TS = 16;
const cv = document.getElementById('screen');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

/* Estado global de presentación */
const G = { scene: 'boot', fade: 0, flash: 0, speed: 1, time: 0 };

/* ---------- Entrada ---------- */
const Input = {
  held: {}, pressed: {}, order: [],
  down(a) {
    if (this.held[a]) return;
    this.held[a] = true; this.pressed[a] = true;
    if (DIRS[a]) this.order.push(a);
  },
  up(a) {
    this.held[a] = false;
    this.order = this.order.filter(x => x !== a);
  },
  dir() { return this.order[this.order.length - 1] || null; },
  endFrame() { this.pressed = {}; },
  clear() { this.held = {}; this.pressed = {}; this.order = []; },
};
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
const KEYMAP = {
  arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down',
  arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right',
  z: 'a', enter: 'a', ' ': 'a', x: 'b', escape: 'b', backspace: 'b', m: 'menu',
};
window.addEventListener('keydown', e => {
  const a = KEYMAP[e.key.toLowerCase()];
  if (!a || e.ctrlKey || e.metaKey || e.altKey) return;
  e.preventDefault();
  if (!e.repeat) Input.down(a);
});
window.addEventListener('keyup', e => {
  const a = KEYMAP[e.key.toLowerCase()];
  if (a) Input.up(a);
});
window.addEventListener('blur', () => Input.clear());

function bindTouch() {
  document.querySelectorAll('[data-act]').forEach(btn => {
    const a = btn.dataset.act;
    const on = e => { e.preventDefault(); btn.classList.add('on'); Input.down(a); };
    const off = e => { e.preventDefault(); btn.classList.remove('on'); Input.up(a); };
    btn.addEventListener('pointerdown', on);
    btn.addEventListener('pointerup', off);
    btn.addEventListener('pointercancel', off);
    btn.addEventListener('pointerleave', off);
    btn.addEventListener('contextmenu', e => e.preventDefault());
  });
}

/* ---------- Fuente bitmap 5x7 (cada fila en base 32) ---------- */
const FONT_SRC = {
  'A': 'ehhvhhh', 'B': 'uhhuhhu', 'C': 'ehggghe', 'D': 'uhhhhhu', 'E': 'vgguggv', 'F': 'vgguggg',
  'G': 'ehgnhhf', 'H': 'hhhvhhh', 'I': 'e44444e', 'J': '72222ic', 'K': 'hikokih', 'L': 'ggggggv',
  'M': 'hrllhhh', 'N': 'hpljhhh', 'O': 'ehhhhhe', 'P': 'uhhuggg', 'Q': 'ehhhlid', 'R': 'uhhukih',
  'S': 'fgge11u', 'T': 'v444444', 'U': 'hhhhhhe', 'V': 'hhhhha4', 'W': 'hhhllrh', 'X': 'hha4ahh',
  'Y': 'hha4444', 'Z': 'v1248gv',
  'a': '00e1fhf', 'b': 'ggmphhu', 'c': '00egghe', 'd': '11djhhf', 'e': '00ehvge', 'f': '698s888',
  'g': '00fhhf1e', 'h': 'ggmphhh', 'i': '40c444e', 'j': '206222ic', 'k': 'ggikoki', 'l': 'c44444e',
  'm': '00qllhh', 'n': '00mphhh', 'o': '00ehhhe', 'p': '00uhhugg', 'q': '00fhhf11', 'r': '00mpggg',
  's': '00ege1u', 't': '88s8896', 'u': '00hhhjd', 'v': '00hhha4', 'w': '00hhlla', 'x': '00ha4ah',
  'y': '00hhhf1e', 'z': '00v248v',
  '0': 'ehjlphe', '1': '4c4444e', '2': 'eh1248v', '3': 'v2421he', '4': '26aiv22', '5': 'vgu11he',
  '6': '68guhhe', '7': 'v124888', '8': 'ehhehhe', '9': 'ehhf12c',
  ' ': '0000000', '.': '00000cc', ',': '0000c48', '!': '4444404', '?': 'eh12404', ':': '0cc0cc0',
  ';': '0cc0c48', "'": '4480000', '"': 'aa00000', '-': '000e000', '+': '044v440', '/': '122488g',
  '(': '2488842', ')': '8422248', '%': 'op248j3', '¿': '4048ghe', '¡': '4044444', '>': '8421248',
  '<': '248g842', '*': '04lel40', '=': '00v0v00', '$': '4fke5u4', '_': '000000v',
  'á': '24e1fhf', 'é': '24ehvge', 'í': '24c444e', 'ó': '24ehhhe', 'ú': '24hhhjd', 'ñ': 'd0mphhh',
  'ü': 'a0hhhjd',
};
const UPPER_ACC = { 'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ü': 'U', 'Ñ': 'N' };
const GLYPHS = {};
for (const ch in FONT_SRC) {
  const src = FONT_SRC[ch], px = [];
  if (src.length < 7 || src.length > 8) console.warn('Glifo mal definido:', ch);
  for (let r = 0; r < src.length; r++) {
    const v = parseInt(src[r], 32);
    for (let c = 0; c < 5; c++) if ((v >> (4 - c)) & 1) px.push([c, r]);
  }
  GLYPHS[ch] = px;
}
for (const ch in UPPER_ACC) {
  const base = GLYPHS[UPPER_ACC[ch]].slice();
  if (ch === 'Ñ') base.push([1, -2], [2, -3], [3, -2], [4, -3]);
  else if (ch === 'Ü') base.push([1, -2], [3, -2]);
  else base.push([3, -3], [2, -2]);
  GLYPHS[ch] = base;
}
const CW = 6; // avance por carácter

function drawText(str, x, y, color, shadow, c2) {
  const g = c2 || ctx;
  str = String(str);
  if (shadow) drawText(str, x + 1, y + 1, shadow, null, g);
  g.fillStyle = color || '#383848';
  for (let i = 0; i < str.length; i++) {
    const gl = GLYPHS[str[i]] || GLYPHS['?'];
    const ox = x + i * CW;
    for (let k = 0; k < gl.length; k++) g.fillRect(ox + gl[k][0], y + gl[k][1], 1, 1);
  }
}
function drawTextR(str, xr, y, color, shadow) { drawText(str, xr - String(str).length * CW, y, color, shadow); }
function drawTextC(str, xc, y, color, shadow) { drawText(str, Math.round(xc - String(str).length * CW / 2), y, color, shadow); }
/* Texto ampliado (títulos) */
function drawBig(str, x, y, s, color, shadow) {
  if (shadow) { const o = Math.max(1, Math.floor(s / 2)); drawBig(str, x + o, y + o, s, shadow); }
  ctx.fillStyle = color;
  for (let i = 0; i < str.length; i++) {
    const gl = GLYPHS[str[i]] || GLYPHS['?'];
    for (let k = 0; k < gl.length; k++) ctx.fillRect(x + (i * CW + gl[k][0]) * s, y + gl[k][1] * s, s, s);
  }
}

function wrapText(text, maxChars) {
  const out = [];
  String(text).split('\n').forEach(par => {
    let line = '';
    par.split(' ').forEach(word => {
      if (!line.length) line = word;
      else if (line.length + 1 + word.length <= maxChars) line += ' ' + word;
      else { out.push(line); line = word; }
    });
    out.push(line);
  });
  return out;
}

/* ---------- Cajas ---------- */
function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function drawBox(x, y, w, h, frame) {
  rect(x + 1, y, w - 2, h, '#283048'); rect(x, y + 1, w, h - 2, '#283048');
  rect(x + 1, y + 1, w - 2, h - 2, frame || '#58b0c0');
  rect(x + 2, y + 2, w - 4, h - 4, '#e8f8f8');
  rect(x + 3, y + 3, w - 6, h - 6, '#f8f8f0');
}
function drawCursor(x, y, c) {
  ctx.fillStyle = c || '#383848';
  ctx.fillRect(x, y, 1, 7); ctx.fillRect(x + 1, y + 1, 1, 5);
  ctx.fillRect(x + 2, y + 2, 1, 3); ctx.fillRect(x + 3, y + 3, 1, 1);
}
function drawBar(x, y, w, h, frac, color) {
  rect(x - 1, y - 1, w + 2, h + 2, '#283048');
  rect(x, y, w, h, '#607080');
  const fw = Math.max(frac > 0 ? 1 : 0, Math.round(w * Math.max(0, Math.min(1, frac))));
  rect(x, y, fw, h, color);
}
function hpColor(frac) { return frac > 0.5 ? '#40c860' : frac > 0.2 ? '#f0c020' : '#e84838'; }

/* ---------- Pila de interfaz ---------- */
const UI = { stack: [] };
function pushUI(el) { UI.stack.push(el); return el; }
function popUI(el) { const i = UI.stack.indexOf(el); if (i >= 0) UI.stack.splice(i, 1); }

/* ---------- Animaciones por tiempo ---------- */
const tweens = [];
function tween(ms, fn) {
  return new Promise(res => { fn(0); tweens.push({ t: 0, ms, fn, res }); });
}
function wait(ms) { return tween(ms, () => {}); }
function updateTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.t += dt;
    const k = Math.min(1, tw.t / tw.ms);
    tw.fn(k);
    if (k >= 1) { tweens.splice(i, 1); tw.res(); }
  }
}
function fadeTo(target, ms) {
  const from = G.fade;
  return tween(ms || 220, k => { G.fade = from + (target - from) * k; });
}

/* ---------- Diálogo ---------- */
const DLG = { x: 4, y: 114, w: 232, h: 42, chars: 36 };

/* opciones: auto (ms para avanzar solo), hold (deja el texto fijo y devuelve una función de cierre) */
function say(text, o) {
  o = o || {};
  return new Promise(res => {
    const lines = wrapText(text, DLG.chars), pages = [];
    for (let i = 0; i < lines.length; i += 2) pages.push(lines.slice(i, i + 2));
    const el = {
      pi: 0, n: 0, hold: 0, frozen: false,
      update(dt) {
        if (el.frozen) return;
        const total = pages[el.pi].join('').length;
        if (el.n < total) {
          el.n += dt * 0.07;
          if (Input.pressed.a || Input.pressed.b) el.n = total;
          return;
        }
        const last = el.pi === pages.length - 1;
        if (last && o.hold) { el.frozen = true; res(() => popUI(el)); return; }
        el.hold += dt;
        if (Input.pressed.a || Input.pressed.b || (o.auto && el.hold > o.auto)) {
          if (!last) { el.pi++; el.n = 0; el.hold = 0; }
          else { popUI(el); res(); }
        }
      },
      draw() {
        drawBox(DLG.x, DLG.y, DLG.w, DLG.h);
        let left = Math.floor(el.n);
        const pg = pages[el.pi];
        for (let i = 0; i < pg.length; i++) {
          drawText(pg[i].slice(0, left), DLG.x + 9, DLG.y + 9 + i * 14, '#383848', '#c8d0d0');
          left = Math.max(0, left - pg[i].length);
        }
        const done = el.n >= pg.join('').length;
        if (done && !o.auto && !el.frozen && Math.floor(G.time / 300) % 2 === 0) {
          ctx.fillStyle = '#e84838';
          ctx.fillRect(DLG.x + DLG.w - 14, DLG.y + DLG.h - 10, 5, 1);
          ctx.fillRect(DLG.x + DLG.w - 13, DLG.y + DLG.h - 9, 3, 1);
          ctx.fillRect(DLG.x + DLG.w - 12, DLG.y + DLG.h - 8, 1, 1);
        }
      },
    };
    pushUI(el);
  });
}
async function sayAll(list) { for (const t of list) await say(t); }

/* Menú genérico con dibujo propio. Devuelve el índice elegido o -1 al cancelar. */
function menu(o) {
  return new Promise(res => {
    const cols = o.cols || 1;
    const el = {
      sel: Math.min(o.sel || 0, o.n - 1),
      update() {
        let s = el.sel;
        if (cols === 1) {
          if (Input.pressed.up) s = (s + o.n - 1) % o.n;
          if (Input.pressed.down) s = (s + 1) % o.n;
        } else {
          if (Input.pressed.left && s % cols > 0) s--;
          if (Input.pressed.right && s % cols < cols - 1 && s + 1 < o.n) s++;
          if (Input.pressed.up && s - cols >= 0) s -= cols;
          if (Input.pressed.down && s + cols < o.n) s += cols;
        }
        el.sel = s;
        if (Input.pressed.a) { popUI(el); res(el.sel); }
        else if (Input.pressed.b && o.cancel !== false) { popUI(el); res(-1); }
      },
      draw() { o.draw(el.sel); },
    };
    pushUI(el);
  });
}

/* Lista en caja. Por defecto se coloca a la derecha, sobre el cuadro de diálogo. */
function listMenu(labels, o) {
  o = o || {};
  const maxLen = labels.reduce((m, l) => Math.max(m, l.length), 0);
  const w = o.w || maxLen * CW + 26;
  const rows = Math.min(labels.length, o.rows || 6);
  const h = rows * 14 + 10;
  const x = o.x !== undefined ? o.x : VW - 4 - w;
  const y = o.y !== undefined ? o.y : DLG.y - h - 1;
  let top = 0;
  return menu({
    n: labels.length, sel: o.sel, cancel: o.cancel,
    draw(sel) {
      if (sel < top) top = sel;
      if (sel >= top + rows) top = sel - rows + 1;
      drawBox(x, y, w, h);
      for (let i = 0; i < rows; i++) {
        const k = top + i;
        drawText(labels[k], x + 16, y + 7 + i * 14, '#383848', '#c8d0d0');
        if (k === sel) drawCursor(x + 8, y + 7 + i * 14);
      }
      if (top > 0) rect(x + w - 9, y + 4, 3, 1, '#e84838');
      if (top + rows < labels.length) rect(x + w - 9, y + h - 5, 3, 1, '#e84838');
      if (o.onDraw) o.onDraw(sel);
    },
  });
}

/* Pregunta con opciones: el texto queda visible mientras se elige. */
async function ask(text, options) {
  options = options || ['Sí', 'No'];
  const close = await say(text, { hold: true });
  const r = await listMenu(options, {});
  close();
  return r;
}
async function confirmYes(text) { return (await ask(text)) === 0; }

/* ---------- Utilidades ---------- */
function rnd(n) { return Math.floor(Math.random() * n); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
