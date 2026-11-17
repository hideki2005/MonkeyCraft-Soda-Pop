/* Juego: estado, mundo, eventos, menús, guardado y bucle principal. */
'use strict';

const SAVE_KEY = 'kumi-senda-cobalto-v1';
let S = null;          // estado guardable
let cur = null;        // mapa cargado
let busy = 0;          // guiones en curso (bloquean el control del jugador)
const P = { x: 0, y: 0, dir: 'down', moving: false, prog: 0, foot: 0, turnT: 0, grace: 0 };

/* ---------- Estado y guardado ---------- */
function newState() {
  return {
    v: 1, name: 'KAI', map: 'home', x: 5, y: 4, dir: 'down',
    party: [], box: [], bag: { orbe: 0, pocion: 1, superpocion: 0 }, money: 500,
    flags: {}, badges: 0, caught: 0, time: 0,
    respawn: { map: 'home', x: 5, y: 4, dir: 'down' },
  };
}
function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || d.v !== 1 || !MAPS[d.map] || !Array.isArray(d.party)) return null;
    return d;
  } catch (e) { return null; }
}
function writeSave() {
  S.map = cur.id; S.x = P.x; S.y = P.y; S.dir = P.dir;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); return true; }
  catch (e) { return false; }
}

/* ---------- Mapa ---------- */
function loadMap(id) {
  const def = MAPS[id];
  if (!def.canv) def.canv = renderMap(def);
  cur = {
    id, def, w: def.t[0].length, h: def.t.length,
    npcs: (def.npcs || []).map(n => Object.assign({}, n, { ox: 0, oy: 0, walk: 0, alert: false })),
  };
}
function placePlayer(x, y, dir) { P.x = x; P.y = y; P.dir = dir || P.dir; P.moving = false; P.prog = 0; }
function tileAt(x, y) { return (x < 0 || y < 0 || x >= cur.w || y >= cur.h) ? ' ' : cur.def.t[y][x]; }
function npcVisible(n) { return !(n.hide && n.hide()); }
function npcAt(x, y) { return cur.npcs.find(n => npcVisible(n) && n.x === x && n.y === y); }
function itemAt(x, y) { return (cur.def.items || []).find(i => !S.flags['it_' + i.id] && i.x === x && i.y === y); }
function passable(x, y) { return WALKABLE.includes(tileAt(x, y)) && !npcAt(x, y) && !itemAt(x, y); }

/* ---------- Guiones ---------- */
async function run(fn) {
  busy++;
  try { await fn(); }
  catch (e) { console.error(e); UI.stack.length = 0; G.fade = 0; G.flash = 0; if (G.scene !== 'title') { G.scene = 'world'; B = null; } }
  finally { busy--; }
}

async function walkPlayer(dir) {
  P.dir = dir;
  const nx = P.x + DIRS[dir][0], ny = P.y + DIRS[dir][1];
  if (!passable(nx, ny)) return;
  P.moving = true;
  await tween(185, k => { P.prog = k; });
  P.moving = false; P.prog = 0; P.x = nx; P.y = ny; P.foot ^= 1;
}

async function doWarp(w) {
  await fadeTo(1, 200);
  const prev = cur.def.name;
  loadMap(w.to);
  placePlayer(w.tx, w.ty);
  if (cur.def.name !== prev) G.banner = { text: cur.def.name, t: 1900 };
  await fadeTo(0, 200);
}

/* ---------- Control del mundo ---------- */
function updateWorld(dt) {
  if (busy) return;
  if (P.moving) {
    P.prog += dt / (Input.held.b ? 105 : 185);
    if (P.prog >= 1) {
      P.prog = 0; P.moving = false; P.foot ^= 1;
      P.x += DIRS[P.dir][0]; P.y += DIRS[P.dir][1];
      onStep();
    }
    if (P.moving || busy) return;
  }
  if (Input.pressed.menu) { run(openMenu); return; }
  if (Input.pressed.a) { run(interact); return; }
  const d = Input.dir();
  if (!d) { P.turnT = 0; return; }
  if (d !== P.dir) { P.dir = d; P.turnT = Input.pressed[d] ? 90 : 0; }
  if (P.turnT > 0) { P.turnT -= dt; return; }
  if (passable(P.x + DIRS[d][0], P.y + DIRS[d][1])) { P.moving = true; P.prog = 0; }
}

function onStep() {
  const w = (cur.def.warps || []).find(o => o.x === P.x && o.y === P.y);
  if (w) { run(() => doWarp(w)); return; }
  const trig = cur.def.onStep && cur.def.onStep(P.x, P.y);
  if (trig) { run(trig); return; }
  const tr = trainerSees();
  if (tr) { run(() => trainerApproach(tr)); return; }
  if (P.grace > 0) { P.grace--; return; }
  if (tileAt(P.x, P.y) === ',' && cur.def.enc && S.party.some(m => m.hp > 0) && Math.random() < cur.def.encRate) {
    run(wildEncounter);
  }
}

function trainerSees() {
  for (const n of cur.npcs) {
    if (!n.trainer || S.flags['tr_' + n.id] || !npcVisible(n)) continue;
    const [dx, dy] = DIRS[n.dir];
    for (let i = 1; i <= n.trainer.los; i++) {
      const x = n.x + dx * i, y = n.y + dy * i;
      if (x === P.x && y === P.y) return n;
      if (!passable(x, y)) break;
    }
  }
  return null;
}

async function trainerApproach(n) {
  n.alert = true;
  await wait(550);
  n.alert = false;
  const [dx, dy] = DIRS[n.dir];
  while (Math.abs(P.x - n.x) + Math.abs(P.y - n.y) > 1) {
    await tween(170, k => { n.ox = dx * TS * k; n.oy = dy * TS * k; n.walk = k < 0.5 ? 1 : 0; });
    n.x += dx; n.y += dy; n.ox = 0; n.oy = 0; n.walk = 0;
  }
  P.dir = OPP[n.dir];
  await trainerBattle(n);
}

async function trainerBattle(n) {
  const t = n.trainer;
  await say(t.name + ': ' + t.before);
  const r = await battle({ trainer: t });
  if (r === 'win') S.flags['tr_' + n.id] = true;
  else await blackout();
}

async function wildEncounter() {
  const table = cur.def.enc, total = table.reduce((s, e) => s + e.w, 0);
  let roll = Math.random() * total, pick = table[0];
  for (const e of table) { if (roll < e.w) { pick = e; break; } roll -= e.w; }
  const r = await battle({ wild: makeMon(pick.sp, pick.min + rnd(pick.max - pick.min + 1)) });
  P.grace = 3;
  if (r === 'lose') await blackout();
}

const TILE_MSG = {
  b: 'Estanterías repletas de libros sobre kumis.',
  k: 'Un terminal lleno de datos de investigación.',
  B: 'Tu cama. Ahora no es momento de dormir.',
  s: 'Un pilar con el emblema del gimnasio.',
  '~': 'El agua está limpia y tranquila.',
};

async function interact() {
  const [dx, dy] = DIRS[P.dir];
  const tx = P.x + dx, ty = P.y + dy;
  let n = npcAt(tx, ty);
  if (!n && tileAt(tx, ty) === 'c') n = npcAt(tx + dx, ty + dy);
  if (n) {
    n.dir = OPP[P.dir];
    if (n.trainer) {
      if (!S.flags['tr_' + n.id]) await trainerBattle(n);
      else await say(n.trainer.name + ': ' + n.trainer.after);
    } else if (n.talk) await n.talk(n);
    else if (n.text) await sayAll(n.text);
    return;
  }
  const it = itemAt(tx, ty);
  if (it) {
    S.flags['it_' + it.id] = true;
    S.bag[it.item] += it.qty;
    await say('¡Has encontrado ' + (it.qty > 1 ? it.qty + ' x ' : '') + ITEMS[it.item].n + '!');
    return;
  }
  const key = tx + ',' + ty;
  if (cur.def.actions && cur.def.actions[key]) { await cur.def.actions[key](); return; }
  if (cur.def.signs && cur.def.signs[key]) { await say(cur.def.signs[key]); return; }
  const msg = TILE_MSG[tileAt(tx, ty)];
  if (msg) await say(msg);
}

/* ---------- Ayudantes de eventos ---------- */
function healAll() { S.party.forEach(healMon); }
async function healSequence() {
  for (let i = 0; i < 3; i++) {
    await tween(160, k => { G.flash = k * 0.6; });
    await tween(160, k => { G.flash = (1 - k) * 0.6; });
  }
  healAll();
}
async function giveItem(id, qty) {
  S.bag[id] += qty;
  await say('¡Has recibido ' + (qty > 1 ? qty + ' x ' : '') + ITEMS[id].n + '!');
}

async function blackout() {
  await say('¡No te quedan kumis en condiciones de luchar!');
  const lost = Math.min(S.money, 100);
  S.money -= lost;
  await say('Pierdes $' + lost + ' por el camino y vuelves a toda prisa a un lugar seguro...');
  await fadeTo(1, 400);
  healAll();
  const r = S.respawn;
  loadMap(r.map); placePlayer(r.x, r.y, r.dir);
  await fadeTo(0, 400);
  await say('Tus kumis han descansado y vuelven a estar en plena forma.');
}

async function chooseStarter(i) {
  if (S.flags.starter) { await say('Ya has elegido a tu compañero. Este orbe espera a otra persona.'); return; }
  const sp = STARTERS[i], d = SPECIES[sp];
  const portrait = pushUI({
    update() {},
    draw() {
      drawBox(70, 14, 100, 92);
      ctx.drawImage(SPR.mon[sp].front, 96, 20);
      drawTextC(d.n.toUpperCase(), 120, 72, '#383848', '#c8d0d0');
      rect(92, 84, 56, 11, TYPES[d.t].c);
      drawTextC(TYPES[d.t].n, 120, 86, '#ffffff', '#00000055');
    },
  });
  await say(d.desc);
  const yes = await confirmYes('¿Eliges a ' + d.n.toUpperCase() + ', el kumi de ' + TYPES[d.t].n.toLowerCase() + '?');
  popUI(portrait);
  if (!yes) return;

  S.party.push(makeMon(sp, 5));
  S.flags.starter = sp;
  await say('¡' + d.n.toUpperCase() + ' se une a tu equipo!');
  const rivalSp = { brotin: 'ascuino', ascuino: 'gotiko', gotiko: 'brotin' }[sp];
  S.flags.rivalSp = rivalSp;
  await say('DANA: ¡Pues yo me quedo con ' + SPECIES[rivalSp].n.toUpperCase() + '!');
  await say('DANA: ¡Vamos a estrenarlos ahora mismo, ' + S.name + '! ¡Combate!');
  const r = await battle({ trainer: { name: 'DANA', cls: 'Rival', party: [[rivalSp, 5]], reward: 150, lose: '¡Vaya! Has tenido suerte, nada más.' } });
  if (r === 'win') await say('DANA: La próxima vez no te lo pondré tan fácil.');
  else await say('DANA: ¡Ja! Aún te queda mucho por entrenar.');
  healAll();
  await say('PROF. CEIBA: ¡Buen combate! He curado a vuestros kumis.');
  await say('PROF. CEIBA: Toma estos orbes. Con ellos podrás capturar kumis salvajes.');
  await giveItem('orbe', 5);
  await say('DANA: ¡Me voy ya a Ciudad Cobalto a por la medalla! ¡No tardes!');
  await fadeTo(1, 250);
  S.flags.rivalBeaten = true;
  await fadeTo(0, 250);
  await say('PROF. CEIBA: Cruza la Senda 1 y el Bosque Murmullo hasta Ciudad Cobalto. ¡Suerte!');
}

async function shopMenu() {
  await say('¡Bienvenido a la tienda! ¿Qué necesitas?');
  let sel = 0;
  for (;;) {
    const labels = ITEM_ORDER.map(id => (ITEMS[id].n + '            ').slice(0, 12) + '$' + ITEMS[id].price).concat(['Salir']);
    sel = await listMenu(labels, {
      x: 4, y: 4, sel,
      onDraw(s) {
        drawBox(150, 4, 86, 34);
        drawText('DINERO', 158, 11, '#383848', '#c8d0d0');
        drawTextR('$' + S.money, 229, 24, '#383848', '#c8d0d0');
        if (s < ITEM_ORDER.length) {
          drawBox(DLG.x, DLG.y, DLG.w, DLG.h);
          wrapText(ITEMS[ITEM_ORDER[s]].desc + ' Tienes ' + S.bag[ITEM_ORDER[s]] + '.', DLG.chars).slice(0, 2)
            .forEach((l, i) => drawText(l, DLG.x + 9, DLG.y + 9 + i * 14, '#383848', '#c8d0d0'));
        }
      },
    });
    if (sel < 0 || sel >= ITEM_ORDER.length) break;
    const id = ITEM_ORDER[sel];
    if (S.money < ITEMS[id].price) { await say('No tienes suficiente dinero.'); continue; }
    S.money -= ITEMS[id].price; S.bag[id]++;
    await say('Has comprado 1 ' + ITEMS[id].n + '. Ahora tienes ' + S.bag[id] + '.', { auto: 700 });
  }
  await say('¡Gracias! Vuelve cuando quieras.');
}

async function storageTerminal() {
  for (;;) {
    const c = await ask('ALMACÉN. Equipo: ' + S.party.length + '/6. Guardados: ' + S.box.length + '.', ['Retirar', 'Depositar', 'Salir']);
    if (c === 0) {
      if (!S.box.length) { await say('No hay ningún kumi en el almacén.'); continue; }
      if (S.party.length >= 6) { await say('Tu equipo está completo. Deposita antes un kumi.'); continue; }
      const close = await say('¿Qué kumi quieres retirar?', { hold: true });
      const i = await listMenu(S.box.map(m => (m.name + '         ').slice(0, 9) + 'Nv' + m.level), { rows: 6 });
      close();
      if (i < 0) continue;
      const mon = S.box.splice(i, 1)[0];
      S.party.push(mon);
      await say(mon.name + ' vuelve a tu equipo.');
    } else if (c === 1) {
      if (S.party.length <= 1) { await say('Necesitas llevar al menos un kumi contigo.'); continue; }
      const i = await partyScreen({ pick: true, title: '¿A quién depositas?' });
      if (i < 0) continue;
      if (!S.party.some((m, k) => k !== i && m.hp > 0)) { await say('No puedes quedarte sin kumis en condiciones de luchar.'); continue; }
      const mon = S.party.splice(i, 1)[0];
      healMon(mon);
      S.box.push(mon);
      await say(mon.name + ' queda guardado en el almacén.');
    } else break;
  }
}

/* ---------- Pantallas de menú ---------- */
async function openMenu() {
  let sel = 0;
  for (;;) {
    sel = await listMenu(['EQUIPO', 'MOCHILA', 'FICHA', 'GUARDAR', 'CERRAR'], { x: 156, y: 4, w: 80, sel });
    if (sel < 0 || sel === 4) return;
    if (sel === 0) {
      if (!S.party.length) await say('Todavía no tienes ningún kumi.');
      else await partyScreen({});
    } else if (sel === 1) await bagScreen({});
    else if (sel === 2) await cardScreen();
    else if (sel === 3) {
      if (readSave() && !(await confirmYes('Ya hay una partida guardada. ¿Quieres sobrescribirla?'))) continue;
      if (writeSave()) await say('Partida guardada.');
      else await say('No se ha podido guardar: este navegador bloquea el almacenamiento local.');
    }
  }
}

function drawPanel(title) {
  rect(0, 0, VW, VH, '#3878a8');
  rect(0, 0, VW, 15, '#285880');
  for (let y = 17; y < VH; y += 6) rect(0, y, VW, 1, '#3470a0');
  drawText(title, 6, 4, '#ffffff', '#183850');
}

function drawParty(sel, o) {
  drawPanel(o.title || 'EQUIPO');
  S.party.forEach((m, i) => {
    const x = 6, y = 18 + i * 21, on = i === sel;
    rect(x, y, 228, 20, '#283048');
    rect(x + 1, y + 1, 226, 18, on ? '#f8e890' : '#e8f0f8');
    ctx.drawImage(SPR.mon[m.sp].front, 0, 0, 48, 48, x + 3, y + 2, 16, 16);
    drawText(m.name, x + 24, y + 3, '#383848');
    drawText('Nv' + m.level, x + 24, y + 11, '#586878');
    if (o.battle && i === o.current) drawText('EN COMBATE', x + 84, y + 11, '#2878c0');
    if (m.hp <= 0) drawText('DEBILITADO', x + 84, y + 3, '#e84838');
    const f = m.hp / maxHp(m);
    drawBar(x + 152, y + 5, 68, 3, f, hpColor(f));
    drawTextR(m.hp + '/' + maxHp(m), x + 222, y + 11, '#383848');
  });
  drawText(o.forced ? 'Z: elegir' : 'Z: elegir   X: volver', 6, 149, '#d0e8f8');
}

/* opciones: battle, forced, current, pick (devuelve el índice sin submenú), title */
async function partyScreen(o) {
  let sel = 0;
  const back = pushUI({ update() {}, draw() { drawParty(sel, o); } });
  try {
    for (;;) {
      const r = await menu({ n: S.party.length, sel, cancel: !o.forced, draw(s) { sel = s; drawParty(s, o); } });
      if (r < 0) return -1;
      sel = r;
      if (o.pick) return sel;
      const mon = S.party[sel];
      const opts = o.battle ? ['Cambiar', 'Datos', 'Atrás'] : ['Datos', 'Poner primero', 'Atrás'];
      const c = await listMenu(opts, { x: 130, y: 100 });
      const choice = c < 0 ? 'Atrás' : opts[c];
      if (choice === 'Datos') await summaryScreen(mon);
      else if (choice === 'Poner primero') {
        S.party.splice(sel, 1); S.party.unshift(mon); sel = 0;
      } else if (choice === 'Cambiar') {
        if (mon.hp <= 0) await say(mon.name + ' está debilitado y no puede luchar.');
        else if (sel === o.current) await say(mon.name + ' ya está en combate.');
        else return sel;
      }
    }
  } finally { popUI(back); }
}

async function summaryScreen(m) {
  const d = SPECIES[m.sp];
  await menu({
    n: 1,
    draw() {
      drawPanel('DATOS');
      drawBox(6, 19, 62, 62);
      ctx.drawImage(SPR.mon[m.sp].front, 13, 26);
      drawBox(72, 19, 162, 62);
      drawText(m.name, 80, 26, '#383848');
      drawTextR('Nv' + m.level, 227, 26, '#383848');
      rect(80, 37, 56, 11, TYPES[d.t].c);
      drawTextC(TYPES[d.t].n, 108, 39, '#ffffff', '#00000055');
      drawText('PS ' + m.hp + '/' + maxHp(m), 144, 39, '#383848');
      drawText('ATQ ' + statOf(m, 'atk'), 80, 53, '#383848');
      drawText('DEF ' + statOf(m, 'def'), 128, 53, '#383848');
      drawText('VEL ' + statOf(m, 'spd'), 176, 53, '#383848');
      drawText('Sig. nivel: ' + Math.max(0, expFor(m.level + 1) - m.exp) + ' exp', 80, 67, '#586878');
      drawBox(6, 84, 228, 70);
      m.moves.forEach((mv, i) => {
        const md = MOVES[mv.id], y = 92 + i * 14;
        rect(13, y - 1, 44, 9, TYPES[md.t].c);
        drawTextC(TYPES[md.t].n, 35, y, '#ffffff');
        drawText(md.n, 62, y, '#383848');
        drawText(md.pow ? 'Pot ' + md.pow : 'Estado', 138, y, '#586878');
        drawTextR('PP ' + mv.pp + '/' + md.pp, 227, y, '#383848');
      });
    },
  });
}

async function bagScreen(o) {
  let sel = 0;
  for (;;) {
    const ids = ITEM_ORDER.filter(id => S.bag[id] > 0);
    const draw = s => {
      drawPanel('MOCHILA');
      drawTextR('$' + S.money, 234, 4, '#ffe890', '#183850');
      drawBox(6, 19, 228, 88);
      if (!ids.length) drawText('La mochila está vacía.', 16, 28, '#586878');
      ids.forEach((id, i) => {
        drawText(ITEMS[id].n, 24, 28 + i * 14, '#383848');
        drawTextR('x' + S.bag[id], 224, 28 + i * 14, '#383848');
        if (i === s) drawCursor(14, 28 + i * 14);
      });
      drawBox(DLG.x, DLG.y - 4, DLG.w, DLG.h + 4);
      const text = ids.length ? ITEMS[ids[s]].desc : 'Compra objetos en la tienda de Ciudad Cobalto.';
      wrapText(text, DLG.chars).slice(0, 2).forEach((l, i) => drawText(l, DLG.x + 9, DLG.y + 6 + i * 14, '#383848'));
    };
    const back = pushUI({ update() {}, draw() { draw(Math.min(sel, Math.max(0, ids.length - 1))); } });
    try {
      const r = await menu({ n: Math.max(1, ids.length), sel, draw(s) { sel = s; draw(s); } });
      if (r < 0 || !ids.length) return null;
      sel = r;
      const id = ids[sel];
      if (id === 'orbe') {
        if (o.battle) return { item: id };
        await say('El Orbe solo sirve en combate contra un kumi salvaje.');
        continue;
      }
      const t = await partyScreen({ pick: true, title: '¿Sobre quién usas ' + ITEMS[id].n + '?' });
      if (t < 0) continue;
      const mon = S.party[t];
      if (mon.hp <= 0) { await say(mon.name + ' está debilitado. Llévalo a un Centro Kumi.'); continue; }
      if (mon.hp >= maxHp(mon)) { await say(mon.name + ' ya tiene todos sus PS.'); continue; }
      if (o.battle) return { item: id, target: t };
      const heal = Math.min(ITEMS[id].heal, maxHp(mon) - mon.hp);
      mon.hp += heal; S.bag[id]--;
      await say('¡' + mon.name + ' recuperó ' + heal + ' PS!');
    } finally { popUI(back); }
  }
}

function fmtTime(ms) {
  const t = Math.floor(ms / 1000), h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60;
  return h + ':' + String(m).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
}
async function cardScreen() {
  await menu({
    n: 1,
    draw() {
      drawPanel('FICHA DE ENTRENADOR');
      drawBox(6, 19, 228, 110);
      ctx.drawImage(SPR.chars.player.down[0], 0, 0, 16, 18, 16, 28, 32, 36);
      drawText('NOMBRE  ' + S.name, 60, 28, '#383848');
      drawText('DINERO  $' + S.money, 60, 42, '#383848');
      drawText('CAPTURAS  ' + S.caught, 60, 56, '#383848');
      drawText('TIEMPO  ' + fmtTime(S.time), 60, 70, '#383848');
      drawText('MEDALLAS', 16, 92, '#383848');
      rect(76, 84, 26, 26, '#c8d0d8'); rect(77, 85, 24, 24, '#e8eef0');
      if (S.badges) ctx.drawImage(SPR.badge, 77, 85);
      drawText(S.badges ? 'Medalla Chispa' : 'Ninguna todavía', 110, 92, '#586878');
      drawText('Z o X: volver', 6, 149, '#d0e8f8');
    },
  });
}

/* ---------- Título y final ---------- */
let titleBg = null;
function renderTitle() {
  if (!titleBg) {
    const [c, g] = mkCanvas(VW, VH), p = pen(g);
    p.r(0, 0, VW, 50, '#58b0e8'); p.r(0, 50, VW, 30, '#80c8f0'); p.r(0, 80, VW, 80, '#b0e0f8');
    p.e(46, 30, 24, 6, '#ffffff'); p.e(66, 25, 14, 6, '#ffffff'); p.e(196, 18, 20, 5, '#ffffff');
    p.e(60, 150, 110, 50, '#58a848'); p.e(190, 156, 100, 50, '#70c058'); p.r(0, 140, VW, 20, '#70c058');
    g.drawImage(SPR.mon.brotin.front, 12, 102); g.drawImage(SPR.mon.ascuino.front, 96, 72); g.drawImage(SPR.mon.gotiko.front, 180, 102);
    titleBg = c;
  }
  ctx.drawImage(titleBg, 0, 0);
  drawBig('KUMI', 60, 14, 5, '#f8d030', '#283048');
  drawBig('SENDA COBALTO', 42, 58, 2, '#ffffff', '#283048');
}

async function titleFlow() {
  G.scene = 'title';
  for (;;) {
    const save = readSave();
    const opts = save ? ['CONTINUAR', 'NUEVA PARTIDA'] : ['NUEVA PARTIDA'];
    const c = await listMenu(opts, { x: 68, y: save ? 120 : 127, w: 104, cancel: false });
    if (save && c === 0) {
      S = save;
      await fadeTo(1, 250);
      loadMap(S.map); placePlayer(S.x, S.y, S.dir);
      G.scene = 'world';
      G.banner = { text: cur.def.name, t: 1900 };
      await fadeTo(0, 250);
      return;
    }
    if (save && !(await confirmYes('Ya existe una partida guardada. Si empiezas otra y la guardas, se perderá. ¿Empezar de nuevo?'))) continue;
    S = newState();
    await fadeTo(1, 250);
    loadMap(S.map); placePlayer(S.x, S.y, S.dir);
    G.scene = 'world';
    await fadeTo(0, 250);
    await say('¡Hoy es el gran día! La profesora Ceiba va a entregarte tu primer kumi.');
    await say('Flechas o WASD: moverte. Z: hablar y confirmar. X: volver (y correr). M: menú.');
    return;
  }
}

function renderEnding() {
  rect(0, 0, VW, VH, '#182848');
  for (let i = 0; i < 40; i++) {
    const tw = (Math.floor(G.time / 400) + i) % 3 === 0;
    rect(hash3(i, 7, 1) % VW, hash3(i, 3, 2) % 100, 1, 1, tw ? '#ffffff' : '#7090c0');
  }
  drawBig('¡ENHORABUENA!', 42, 12, 2, '#f8d030', '#0c1428');
  ctx.drawImage(SPR.badge, 0, 0, 24, 24, 96, 34, 48, 48);
  drawTextC('Has conseguido la MEDALLA CHISPA', 120, 88, '#ffffff', '#0c1428');
  const n = S.party.length, x0 = 120 - n * 13;
  S.party.forEach((m, i) => ctx.drawImage(SPR.mon[m.sp].front, 0, 0, 48, 48, x0 + i * 26, 100, 24, 24));
  drawTextC('Tiempo ' + fmtTime(S.time) + '   Capturas ' + S.caught, 120, 130, '#b0c8f0');
  if (Math.floor(G.time / 500) % 2 === 0) drawTextC('Pulsa Z para seguir explorando', 120, 146, '#ffffff');
}
async function endingScreen() {
  await fadeTo(1, 500);
  G.scene = 'ending';
  await fadeTo(0, 500);
  await wait(1200);
  await menu({ n: 1, draw() {} });
  await fadeTo(1, 400);
  G.scene = 'world';
  await fadeTo(0, 400);
  await say('Tu aventura continúa. Puedes seguir explorando, capturando kumis y entrenando a tu equipo.');
}

/* ---------- Dibujo del mundo ---------- */
function drawCharAt(spr, dir, frame, px, py) {
  ctx.drawImage(SPR.chars[spr][dir][frame], Math.round(px), Math.round(py) - 4);
}
function renderWorld() {
  const mw = cur.w * TS, mh = cur.h * TS;
  const ppx = (P.x + DIRS[P.dir][0] * (P.moving ? P.prog : 0)) * TS;
  const ppy = (P.y + DIRS[P.dir][1] * (P.moving ? P.prog : 0)) * TS;
  const cx = Math.round(mw <= VW ? -(VW - mw) / 2 : clamp(ppx + 8 - VW / 2, 0, mw - VW));
  const cy = Math.round(mh <= VH ? -(VH - mh) / 2 : clamp(ppy + 8 - VH / 2, 0, mh - VH));
  rect(0, 0, VW, VH, '#101018');
  ctx.drawImage(cur.def.canv[Math.floor(G.time / 500) % 2], -cx, -cy);

  if (cur.def.props) cur.def.props().forEach(o => ctx.drawImage(SPR.orb, o.x * TS + 2 - cx, o.y * TS - 2 - cy));

  const list = [];
  (cur.def.items || []).forEach(it => {
    if (!S.flags['it_' + it.id]) list.push({ y: it.y * TS, draw: () => ctx.drawImage(SPR.orb, it.x * TS + 2 - cx, it.y * TS + 3 - cy) });
  });
  cur.npcs.forEach(n => {
    if (!npcVisible(n)) return;
    const nx = n.x * TS + n.ox - cx, ny = n.y * TS + n.oy - cy;
    list.push({
      y: n.y * TS + n.oy,
      draw: () => {
        drawCharAt(n.spr, n.dir, n.walk, nx, ny);
        if (n.alert) {
          rect(Math.round(nx) + 3, Math.round(ny) - 17, 10, 12, '#283048');
          rect(Math.round(nx) + 4, Math.round(ny) - 16, 8, 10, '#ffffff');
          drawText('!', Math.round(nx) + 6, Math.round(ny) - 15, '#e84838');
        }
      },
    });
  });
  list.push({
    y: ppy + 1,
    draw: () => {
      const frame = P.moving ? (P.prog < 0.5 ? 1 + P.foot : 0) : 0;
      drawCharAt('player', P.dir, frame, ppx - cx, ppy - cy);
      const gx = Math.round(ppx / TS), gy = Math.round(ppy / TS);
      if (tileAt(gx, gy) === ',') ctx.drawImage(SPR.grassTop, gx * TS - cx, gy * TS + 10 - cy);
    },
  });
  list.sort((a, b) => a.y - b.y).forEach(e => e.draw());

  if (G.banner && G.banner.t > 0) {
    const w = G.banner.text.length * CW + 18;
    drawBox(4, 4, w, 19, '#e0a030');
    drawText(G.banner.text, 13, 10, '#383848', '#c8d0d0');
  }
}

/* ---------- Bucle principal ---------- */
let lastT = 0;
function update(dt) {
  updateTweens(dt);
  if (UI.stack.length) UI.stack[UI.stack.length - 1].update(dt);
  else if (G.scene === 'world') updateWorld(dt);
  if (S && G.scene !== 'title') S.time += dt / G.speed;
  if (G.banner && G.banner.t > 0 && G.scene === 'world') G.banner.t -= dt;
}
function render() {
  if (G.scene === 'title') renderTitle();
  else if (G.scene === 'world') renderWorld();
  else if (G.scene === 'battle' && B) renderBattle();
  else if (G.scene === 'ending') renderEnding();
  else rect(0, 0, VW, VH, '#101018');
  for (let i = 0; i < UI.stack.length; i++) UI.stack[i].draw();
  if (G.flash > 0) { ctx.globalAlpha = clamp(G.flash, 0, 1); rect(0, 0, VW, VH, '#ffffff'); ctx.globalAlpha = 1; }
  if (G.fade > 0) { ctx.globalAlpha = clamp(G.fade, 0, 1); rect(0, 0, VW, VH, '#000000'); ctx.globalAlpha = 1; }
}
function frame(now) {
  let dt = Math.min(50, now - lastT || 16);
  lastT = now;
  dt *= G.speed;
  G.time += dt;
  try { update(dt); render(); } catch (e) { console.error(e); }
  Input.endFrame();
  requestAnimationFrame(frame);
}

function fitScreen() {
  const wrap = document.getElementById('stage');
  const availW = wrap.clientWidth, availH = Math.max(160, window.innerHeight - wrap.getBoundingClientRect().top - (document.getElementById('below').offsetHeight || 0) - 44);
  let s = Math.min(availW / VW, availH / VH, 5);
  if (s >= 2) s = Math.floor(s);
  cv.style.width = Math.floor(VW * s) + 'px';
  cv.style.height = Math.floor(VH * s) + 'px';
}

function boot() {
  buildSprites();
  bindTouch();
  fitScreen();
  window.addEventListener('resize', fitScreen);
  requestAnimationFrame(frame);
  run(titleFlow);
}
window.__kumi = { get S() { return S; }, get B() { return B; }, get cur() { return cur; }, get busy() { return busy; }, P, G, Input, UI };
boot();
