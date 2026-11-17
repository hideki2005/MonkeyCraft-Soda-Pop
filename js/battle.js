/* Combate por turnos: flujo, animaciones, IA rival, captura, experiencia y evolución. */
'use strict';

let B = null;
const E_POS = [164, 14], P_POS = [30, 64];
const HUD_OFF = 130;

function newVis() { return { x: 0, y: 0, a: 1, sink: 0, hide: false, blink: false, scale: 1, white: 0 }; }
function stageMul(s) { return s >= 0 ? (2 + s) / 2 : 2 / (2 - s); }
function foeLabel() { return 'El ' + B.e.name + (B.wild ? ' salvaje' : ' rival'); }
function label(side) { return side === 'p' ? B.p.name : foeLabel(); }
function center(side) { return side === 'p' ? [P_POS[0] + 24, P_POS[1] + 30] : [E_POS[0] + 24, E_POS[1] + 28]; }
function easeOut(k) { return 1 - (1 - k) * (1 - k); }

async function bsay(text, ms) {
  B.msg = text;
  await say(text, { auto: ms || 650 });
}

/* ---------- Animaciones básicas ---------- */
async function popIn(v, side) {
  const [x, y] = center(side);
  v.hide = false; v.a = 1; v.sink = 0; v.scale = 0; v.white = 1;
  FX.add({ x, y, shape: 'ring', r0: 2, r1: 20, c: '#ffffff', life: 300 });
  burst(x, y, 10, { cols: ['#ffffff', '#f8e890'], speed: 2, life: 260, extra: { shape: 'plus', s: 1 } });
  await tween(240, k => { v.scale = easeOut(k); });
  await tween(200, k => { v.white = 1 - k; });
  v.scale = 1; v.white = 0;
}
async function popOut(v) {
  await tween(150, k => { v.white = k; });
  await tween(200, k => { v.scale = 1 - k; });
  v.hide = true; v.scale = 1; v.white = 0;
}
function hud(side, show) {
  const key = side === 'p' ? 'pHud' : 'eHud', from = B[key], to = show ? 0 : (side === 'p' ? HUD_OFF : -HUD_OFF);
  return tween(220, k => { B[key] = from + (to - from) * easeOut(k); });
}

/* opciones: { wild: mon } o { trainer: {name, cls, party, reward, lose, spr} } */
async function battle(o) {
  const wild = !!o.wild;
  const tr = o.trainer;
  const party = wild ? null : (typeof tr.party === 'function' ? tr.party() : tr.party);
  const foes = wild ? [o.wild] : party.map(p => makeMon(p[0], p[1]));
  B = {
    wild, tr, foes, fi: 0, e: foes[0], p: null, pi: -1,
    eShow: foes[0].hp, pShow: 0, msg: '', ev: newVis(), pv: newVis(),
    st: { p: { atk: 0, def: 0 }, e: { atk: 0, def: 0 } },
    orb: null, runTries: 0, bg: battleBackground(cur && cur.def.dark ? 'cave' : 'field'),
    intro: 0, trX: 0, plX: 0, showTr: !wild, showPl: true, eHud: -HUD_OFF, pHud: HUD_OFF, xp: undefined,
  };
  B.pv.hide = true;
  B.ev.hide = !wild;
  FX.clear('battle');

  // Transición: destellos y franjas
  for (let i = 0; i < 2; i++) {
    await tween(100, k => { G.flash = k * 0.85; });
    await tween(100, k => { G.flash = (1 - k) * 0.85; });
  }
  await tween(420, k => { G.wipe = k; });
  G.scene = 'battle';
  await wait(80);
  G.wipe = 0;
  await tween(650, k => { B.intro = easeOut(k); });

  if (wild) {
    await hud('e', true);
    await bsay('¡Un ' + B.e.name + ' salvaje apareció!', 800);
  } else {
    await bsay('¡' + tr.cls + ' ' + tr.name + ' te desafía!', 800);
    await tween(300, k => { B.trX = k * 90; });
    B.showTr = false;
    await bsay(tr.name + ' envía a ' + B.e.name + '.');
    await popIn(B.ev, 'e');
    await hud('e', true);
  }
  await sendOut(S.party.findIndex(m => m.hp > 0));

  let result = null;
  while (!result) {
    const act = await chooseAction();
    const foeMove = aiPick();

    if (act.type === 'run') {
      if (await tryRun()) { result = 'run'; break; }
      await useMove('e', foeMove);
    } else if (act.type === 'item') {
      if (act.item === 'orbe') {
        if (await throwOrb()) { result = 'caught'; break; }
      } else {
        await usePotion(act.item, act.target);
      }
      await useMove('e', foeMove);
    } else if (act.type === 'switch') {
      await recall();
      await sendOut(act.i);
      await useMove('e', foeMove);
    } else {
      const pm = act.move, ppri = MOVES[pm].pri || 0, epri = MOVES[foeMove].pri || 0;
      const ps = statOf(B.p, 'spd'), es = statOf(B.e, 'spd');
      const first = ppri !== epri ? (ppri > epri ? 'p' : 'e') : ps !== es ? (ps > es ? 'p' : 'e') : (Math.random() < 0.5 ? 'p' : 'e');
      const order = first === 'p' ? ['p', 'e'] : ['e', 'p'];
      for (const side of order) {
        if (B.p.hp <= 0 || B.e.hp <= 0) break;
        await useMove(side, side === 'p' ? pm : foeMove);
      }
    }

    if (B.e.hp <= 0) {
      await faint('e');
      if (B.p.hp > 0) await gainExp(B.p, Math.max(1, Math.floor(SPECIES[B.e.sp].exp * B.e.level / 5 * (wild ? 1 : 1.5))));
      if (B.fi < foes.length - 1) {
        B.fi++; B.e = foes[B.fi]; B.eShow = B.e.hp; B.st.e = { atk: 0, def: 0 };
        B.ev = newVis(); B.ev.hide = true;
        await bsay(tr.name + ' envía a ' + B.e.name + '.');
        await popIn(B.ev, 'e');
        await hud('e', true);
      } else {
        result = 'win';
      }
    }
    if (B.p.hp <= 0) {
      await faint('p');
      if (S.party.some(m => m.hp > 0)) {
        if (!result) {
          const i = await partyScreen({ battle: true, forced: true, current: B.pi, title: 'Elige al siguiente kumi' });
          await sendOut(i);
        }
      } else {
        result = 'lose';
      }
    }
  }

  if (result === 'win' && !wild) {
    B.showTr = true;
    await tween(300, k => { B.trX = 90 * (1 - k); });
    await bsay('¡Has derrotado a ' + tr.cls + ' ' + tr.name + '!', 900);
    if (tr.lose) await say(tr.name + ': ' + tr.lose);
    S.money += tr.reward || 0;
    await bsay('Recibes $' + (tr.reward || 0) + ' como premio.', 900);
  }
  if (result === 'lose') await bsay('¡Todo tu equipo se ha debilitado!', 900);

  await fadeTo(1, 250);
  B = null;
  FX.clear('battle');
  G.shake = 0;
  const evos = result === 'lose' ? [] : S.party.filter(m => m._evo);
  S.party.forEach(m => { delete m._evo; });
  for (const m of evos) await evolveSequence(m);
  G.scene = 'world';
  await fadeTo(0, 250);
  return result;
}

/* ---------- Entradas y salidas ---------- */
async function sendOut(i) {
  B.pi = i; B.p = S.party[i]; B.pShow = B.p.hp; B.xp = undefined;
  B.st.p = { atk: 0, def: 0 };
  if (B.showPl) {
    await tween(300, k => { B.plX = -k * 90; });
    B.showPl = false;
  }
  B.pv = newVis(); B.pv.hide = true;
  await bsay('¡Adelante, ' + B.p.name + '!');
  await popIn(B.pv, 'p');
  await hud('p', true);
}
async function recall() {
  await bsay('¡Vuelve, ' + B.p.name + '!');
  await Promise.all([popOut(B.pv), hud('p', false)]);
}
async function faint(side) {
  const v = side === 'p' ? B.pv : B.ev;
  const [x, y] = center(side);
  await tween(120, k => { v.y = -4 * Math.sin(k * Math.PI); });
  burst(x, y + 18, 8, { cols: ['#d8d0c0', '#b8b0a0'], speed: 1, life: 400, extra: { s: 2, vy: -0.3 } });
  await tween(380, k => { v.sink = k * k; });
  v.hide = true; v.y = 0;
  await hud(side, false);
  await bsay('¡' + label(side) + ' se debilitó!', 800);
}

/* ---------- Elección del jugador ---------- */
const ACTIONS = ['LUCHAR', 'MOCHILA', 'EQUIPO', 'HUIR'];
async function chooseAction() {
  let sel = 0;
  for (;;) {
    B.msg = '¿Qué hará\n' + B.p.name + '?';
    sel = await menu({
      n: 4, cols: 2, sel, cancel: false,
      draw(s) {
        drawBox(120, DLG.y, 116, DLG.h, '#e0a030');
        ACTIONS.forEach((a, i) => {
          const x = 136 + (i % 2) * 50, y = DLG.y + 9 + Math.floor(i / 2) * 14;
          drawText(a, x, y, '#383848', '#c8d0d0');
          if (i === s) drawCursor(x - 7 + (Math.floor(G.time / 250) % 2), y);
        });
      },
    });
    if (sel === 0) {
      const mv = await chooseMove();
      if (mv) return { type: 'move', move: mv };
    } else if (sel === 1) {
      const r = await bagScreen({ battle: true });
      if (r) {
        if (r.item === 'orbe' && !B.wild) await bsay('¡No puedes capturar el kumi de otro entrenador!', 1000);
        else return { type: 'item', item: r.item, target: r.target };
      }
    } else if (sel === 2) {
      const i = await partyScreen({ battle: true, current: B.pi });
      if (i >= 0) return { type: 'switch', i };
    } else if (!B.wild) {
      await bsay('¡No puedes huir de un combate contra un entrenador!', 1000);
    } else {
      return { type: 'run' };
    }
  }
}

async function chooseMove() {
  const moves = B.p.moves;
  if (!moves.some(m => m.pp > 0)) {
    await bsay('¡A ' + B.p.name + ' no le quedan movimientos!');
    return 'forcejeo';
  }
  let sel = Math.min(B.p._last || 0, moves.length - 1);
  for (;;) {
    sel = await menu({
      n: moves.length, cols: 2, sel,
      draw(s) {
        drawBox(4, DLG.y, 160, DLG.h, '#e0a030');
        moves.forEach((m, i) => {
          const x = 18 + (i % 2) * 74, y = DLG.y + 9 + Math.floor(i / 2) * 14;
          drawText(MOVES[m.id].n, x, y, m.pp > 0 ? '#383848' : '#a0a0a8', '#c8d0d0');
          if (i === s) drawCursor(x - 7 + (Math.floor(G.time / 250) % 2), y);
        });
        const m = moves[s], d = MOVES[m.id];
        drawBox(164, DLG.y, 72, DLG.h, '#e0a030');
        drawText('PP ' + m.pp + '/' + d.pp, 172, DLG.y + 9, m.pp > 0 ? '#383848' : '#e84838', '#c8d0d0');
        rect(171, DLG.y + 22, 58, 11, TYPES[d.t].c);
        drawTextC(TYPES[d.t].n, 200, DLG.y + 24, '#ffffff', '#00000055');
      },
    });
    if (sel < 0) return null;
    if (moves[sel].pp <= 0) { await bsay('¡No quedan PP para ese movimiento!'); continue; }
    B.p._last = sel;
    return moves[sel].id;
  }
}

/* ---------- IA rival ---------- */
function aiPick() {
  const e = B.e, usable = e.moves.filter(m => m.pp > 0);
  if (!usable.length) return 'forcejeo';
  if (Math.random() < 0.2) return usable[rnd(usable.length)].id;
  let best = usable[0].id, bestScore = -1;
  usable.forEach(m => {
    const d = MOVES[m.id];
    let score;
    if (d.eff) {
      const side = d.eff.who === 'self' ? 'e' : 'p';
      const room = d.eff.d < 0 ? B.st[side][d.eff.stat] > -2 : B.st[side][d.eff.stat] < 2;
      score = room ? 22 + rnd(12) : 0;
    } else {
      score = d.pow * typeMult(d.t, SPECIES[B.p.sp].t) * (SPECIES[e.sp].t === d.t ? 1.5 : 1) * d.acc / 100;
    }
    if (score > bestScore) { bestScore = score; best = m.id; }
  });
  return best;
}

/* ---------- Efectos visuales de movimientos ---------- */
const FX_COL = {
  normal: ['#ffffff', '#f8e8a0'], fuego: ['#f8d030', '#f08030', '#e84020'], agua: ['#a8d8ff', '#58a0f0', '#ffffff'],
  planta: ['#80d860', '#40a040', '#c0f080'], electrico: ['#fff060', '#f8d030', '#ffffff'], volador: ['#ffffff', '#c8e0f8'],
  bicho: ['#c0d840', '#80a020'], roca: ['#a08850', '#706040', '#c8b080'],
};
async function moveFx(t, side) {
  const A = center(side), T = center(side === 'p' ? 'e' : 'p');
  const col = FX_COL[t] || FX_COL.normal, pick = () => col[rnd(col.length)];
  const dx = T[0] - A[0], dy = T[1] - A[1];
  const travel = async (n, shape, s, spread, dur, extra) => {
    for (let i = 0; i < n; i++) {
      FX.add(Object.assign({
        x: A[0] + rnd(spread * 2 + 1) - spread, y: A[1] + rnd(spread * 2 + 1) - spread,
        vx: dx / (dur / 16), vy: dy / (dur / 16), c: pick(), shape, s, life: dur, fade: false, o: '#283048',
      }, extra || {}));
      await wait(30);
    }
    await wait(dur - 20);
  };
  switch (t) {
    case 'fuego':
      await travel(10, null, 4, 4, 300);
      for (let i = 0; i < 26; i++) FX.add({ x: T[0] - 14 + rnd(29), y: T[1] + 4 + rnd(12), vx: (Math.random() - 0.5) * 0.8, vy: -0.5 - Math.random() * 1.2, c: pick(), s: 3 + rnd(2), o: '#802010', life: 520 + rnd(250) });
      await wait(380);
      break;
    case 'agua':
      await travel(10, 'bubble', 1, 6, 340, { c: '#3878d8', o: null });
      burst(T[0], T[1], 18, { cols: ['#3878d8', '#58a0f0', '#ffffff'], speed: 2.2, life: 460, extra: { g: 0.15, s: 3, o: '#1a3a80' } });
      FX.add({ x: T[0], y: T[1], shape: 'ring', r0: 4, r1: 22, s: 2, c: '#3878d8', life: 340 });
      await wait(340);
      break;
    case 'planta':
      await travel(10, null, 3, 8, 340, { c: '#58c048' });
      burst(T[0], T[1], 16, { cols: ['#58c048', '#a0e060', '#2f8a30'], speed: 1.8, life: 520, extra: { g: 0.05, s: 3, o: '#1a4a18' } });
      await wait(340);
      break;
    case 'electrico':
      for (let b = 0; b < 3; b++) {
        const pts = [];
        for (let y = -36; y <= 0; y += 6) pts.push([rnd(13) - 6, y]);
        const bx = T[0] - 10 + rnd(21);
        FX.add({ x: bx + 1, y: T[1] + 1, shape: 'bolt', pts, s: 3, c: '#383018', life: 150, fade: false });
        FX.add({ x: bx, y: T[1], shape: 'bolt', pts, s: 2, c: b % 2 ? '#ffffff' : '#fff060', life: 150, fade: false });
        G.flash = 0.3;
        await wait(60);
        G.flash = 0;
        await wait(70);
      }
      burst(T[0], T[1], 14, { cols: col, speed: 2.4, life: 320, extra: { s: 2, o: '#806010' } });
      await wait(200);
      break;
    case 'volador':
      for (let i = 0; i < 3; i++) {
        FX.add({ x: T[0] - 19 + i * 9, y: T[1] - 15, shape: 'slash', dx: 18, dy: 22, s: 3, c: '#405880', life: 260 });
        FX.add({ x: T[0] - 20 + i * 9, y: T[1] - 16, shape: 'slash', dx: 18, dy: 22, s: 2, c: '#ffffff', life: 260 });
        await wait(80);
      }
      burst(T[0], T[1], 10, { cols: col, speed: 1.2, life: 600, extra: { g: 0.03, s: 3, o: '#5070a0' } });
      await wait(260);
      break;
    case 'bicho': {
      const len = Math.hypot(dx, dy), ux = dx / len * 4, uy = dy / len * 4;
      await travel(8, 'slash', 2, 6, 260, { dx: Math.round(ux * 1.5), dy: Math.round(uy * 1.5), c: '#80a020' });
      FX.add({ x: T[0], y: T[1], shape: 'plus', s: 7, c: '#ffffff', life: 260 });
      burst(T[0], T[1], 8, { cols: ['#c0d840', '#80a020'], speed: 1.8, life: 300, extra: { s: 2, o: '#405010' } });
      await wait(220);
      break;
    }
    case 'roca':
      for (let i = 0; i < 7; i++) FX.add({ x: T[0] - 18 + rnd(30), y: T[1] - 64, vy: 2.5, g: 0.22, shape: 'rock', s: 5 + rnd(3), c: pick(), life: 360, fade: false, t: -i * 55 });
      await wait(560);
      shake(2, 200);
      burst(T[0], T[1] + 14, 14, { cols: ['#d8c8a8', '#a08850'], speed: 1.4, life: 420, extra: { s: 3, vy: -0.5 } });
      await wait(160);
      break;
    default:
      FX.add({ x: T[0], y: T[1], shape: 'ring', r0: 2, r1: 20, s: 2, c: '#f8a030', life: 300 });
      FX.add({ x: T[0] - 6 + rnd(13), y: T[1] - 6 + rnd(13), shape: 'plus', s: 9, c: '#ffffff', life: 260 });
      FX.add({ x: T[0] - 10 + rnd(21), y: T[1] - 8 + rnd(17), shape: 'plus', s: 5, c: '#f8e060', life: 260, t: -80 });
      burst(T[0], T[1], 8, { cols: ['#ffffff', '#f8e060'], speed: 2, life: 300, extra: { s: 2, o: '#806020' } });
      await wait(260);
  }
}
async function statFx(side, up) {
  const [x, y] = center(side);
  for (let i = 0; i < 12; i++) {
    FX.add({ x: x - 16 + rnd(33), y: up ? y + 12 : y - 18, vy: up ? -1.1 : 1.1, shape: 'arrow', up, c: up ? '#e86020' : '#2858c8', life: 520, t: -i * 40 });
  }
  await wait(820);
}
async function healFx(side, cols) {
  const [x, y] = center(side);
  for (let i = 0; i < 14; i++) {
    FX.add({ x: x - 16 + rnd(33), y: y + 12 - rnd(10), vy: -0.9, shape: 'plus', s: 1, c: cols[rnd(cols.length)], life: 520, t: -i * 35 });
  }
  await wait(600);
}
async function drainFx(fromSide, toSide) {
  const A = center(fromSide), T = center(toSide);
  for (let i = 0; i < 8; i++) {
    FX.add({ x: A[0] - 6 + rnd(13), y: A[1] - 6 + rnd(13), vx: (T[0] - A[0]) / 22, vy: (T[1] - A[1]) / 22, s: 2, c: i % 2 ? '#80f080' : '#c0ffb0', life: 352, fade: false, t: -i * 40 });
  }
  await wait(660);
}

/* ---------- Movimientos ---------- */
async function useMove(side, id) {
  const A = side === 'p' ? B.p : B.e, D = side === 'p' ? B.e : B.p;
  const other = side === 'p' ? 'e' : 'p';
  if (A.hp <= 0 || D.hp <= 0) return;
  const d = MOVES[id];
  const slot = A.moves.find(m => m.id === id);
  if (slot && slot.pp > 0) slot.pp--;
  await bsay('¡' + label(side) + ' usó ' + d.n + '!');

  const av = side === 'p' ? B.pv : B.ev, dir = side === 'p' ? 1 : -1;
  if (d.eff) {
    await tween(240, k => { av.y = -7 * Math.sin(k * Math.PI); });
  } else {
    await tween(180, k => { const s = Math.sin(k * Math.PI); av.x = dir * 14 * s; av.y = -dir * 6 * s; });
  }
  av.x = 0; av.y = 0;

  if (Math.random() * 100 >= d.acc) { await bsay('¡Pero falló!'); return; }

  if (d.eff) {
    const tSide = d.eff.who === 'self' ? side : other;
    const cur = B.st[tSide][d.eff.stat], next = clamp(cur + d.eff.d, -3, 3);
    const statName = d.eff.stat === 'atk' ? 'El ataque' : 'La defensa';
    const owner = tSide === 'p' ? 'de ' + B.p.name : 'del ' + B.e.name + (B.wild ? ' salvaje' : ' rival');
    if (next === cur) { await bsay('¡Pero no tuvo efecto!'); return; }
    B.st[tSide][d.eff.stat] = next;
    await statFx(tSide, d.eff.d > 0);
    await bsay('¡' + statName + ' ' + owner + (d.eff.d < 0 ? ' bajó!' : ' subió!'));
    return;
  }

  const atk = statOf(A, 'atk') * stageMul(B.st[side].atk);
  const def = statOf(D, 'def') * stageMul(B.st[other].def);
  const mult = typeMult(d.t, SPECIES[D.sp].t);
  const stab = SPECIES[A.sp].t === d.t ? 1.5 : 1;
  const crit = Math.random() < 1 / 16;
  let dmg = Math.floor(Math.floor((2 * A.level / 5 + 2) * d.pow * atk / def) / 50) + 2;
  dmg = Math.max(1, Math.floor(dmg * stab * mult * (crit ? 1.5 : 1) * (0.85 + Math.random() * 0.15)));
  dmg = Math.min(dmg, D.hp);

  await moveFx(d.t, side);

  const dv = side === 'p' ? B.ev : B.pv;
  dv.blink = true;
  const strong = mult > 1 || crit;
  await Promise.all([
    tween(300, k => { dv.x = Math.sin(k * Math.PI * 6) * (strong ? 5 : 3); dv.white = k < 0.35 ? 0.85 : 0; }),
    strong ? shake(4, 300) : Promise.resolve(),
  ]);
  dv.blink = false; dv.x = 0; dv.white = 0;

  D.hp -= dmg;
  await hpTween(other, D.hp);
  if (crit) await bsay('¡Golpe crítico!');
  if (mult > 1) await bsay('¡Es muy eficaz!');
  else if (mult < 1) await bsay('No es muy eficaz...');

  if (d.drain && A.hp > 0 && A.hp < maxHp(A)) {
    await drainFx(other, side);
    A.hp = Math.min(maxHp(A), A.hp + Math.max(1, Math.floor(dmg / 2)));
    await hpTween(side, A.hp);
    await bsay('¡' + label(side) + ' absorbió energía!');
  }
}
function hpTween(side, to) {
  const key = side === 'p' ? 'pShow' : 'eShow', from = B[key];
  return tween(250 + Math.abs(from - to) * 12, k => { B[key] = from + (to - from) * k; });
}

async function usePotion(item, target) {
  const mon = S.party[target], heal = Math.min(ITEMS[item].heal, maxHp(mon) - mon.hp);
  S.bag[item]--;
  mon.hp += heal;
  await bsay('Usas ' + ITEMS[item].n + ' con ' + mon.name + '.');
  if (mon === B.p) {
    await healFx('p', ['#80f080', '#ffffff', '#c0ffb0']);
    await hpTween('p', mon.hp);
  }
  await bsay('¡' + mon.name + ' recuperó ' + heal + ' PS!');
}

async function tryRun() {
  B.runTries++;
  const ps = statOf(B.p, 'spd'), es = statOf(B.e, 'spd');
  if (ps >= es || Math.random() < 0.45 + 0.2 * B.runTries) {
    await Promise.all([hud('p', false), tween(250, k => { B.pv.x = -k * 80; B.pv.a = 1 - k; })]);
    await bsay('¡Escapaste sin problemas!', 800);
    return true;
  }
  await bsay('¡No has podido escapar!');
  return false;
}

/* ---------- Captura ---------- */
async function throwOrb() {
  S.bag.orbe--;
  await bsay('¡Lanzas un Orbe!');
  const [tx0, ty0] = center('e');
  const tx = tx0 - 6, ty = ty0 - 14;
  B.orb = { x: 60, y: 96, spin: 0 };
  await tween(450, k => {
    B.orb.x = 60 + (tx - 60) * k; B.orb.y = 96 + (ty - 96) * k - Math.sin(k * Math.PI) * 34; B.orb.spin = k * 4;
  });
  B.orb.open = true;
  FX.add({ x: tx + 6, y: ty + 6, shape: 'ring', r0: 2, r1: 22, c: '#ffffff', life: 280 });
  await popOut(B.ev);
  B.orb.open = false;
  await tween(240, k => { B.orb.y = ty + 26 * easeOut(k); });
  await tween(140, k => { B.orb.y = ty + 26 - 5 * Math.sin(k * Math.PI); });

  const m = maxHp(B.e);
  const chance = Math.min(1, ((3 * m - 2 * B.e.hp) * SPECIES[B.e.sp].rate / (3 * m)) / 255);
  const caught = Math.random() < chance;
  const shakes = caught ? 3 : rnd(3);
  const bx = B.orb.x;
  for (let i = 0; i < shakes; i++) {
    await wait(280);
    await tween(280, k => { B.orb.x = bx + Math.sin(k * Math.PI * 2) * 3; B.orb.tilt = Math.sin(k * Math.PI * 2); });
    B.orb.tilt = 0;
  }
  await wait(280);

  if (!caught) {
    B.orb = null;
    await popIn(B.ev, 'e');
    await bsay(shakes >= 2 ? '¡Casi! ¡El kumi se ha escapado!' : '¡Oh, no! ¡El kumi se ha soltado!');
    return false;
  }
  burst(B.orb.x + 6, B.orb.y + 4, 14, { cols: ['#f8e060', '#ffffff'], speed: 1.6, life: 500, extra: { shape: 'plus', s: 2 } });
  B.orb.done = true;
  await hud('e', false);
  await bsay('¡Genial! ¡' + B.e.name + ' capturado!', 1000);
  S.caught++;
  B.e._last = undefined;
  if (S.party.length < 6) {
    S.party.push(B.e);
    await bsay(B.e.name + ' se une a tu equipo.', 900);
  } else {
    healMon(B.e);
    S.box.push(B.e);
    await bsay('Tu equipo está completo. ' + B.e.name + ' se envía al almacén.', 1200);
  }
  return true;
}

/* ---------- Experiencia, aprendizaje y evolución ---------- */
async function gainExp(mon, amount) {
  const inBattle = B && mon === B.p;
  let shown = mon.exp;
  mon.exp += amount;
  await bsay(mon.name + ' ganó ' + amount + ' puntos de experiencia.');
  for (;;) {
    const base = expFor(mon.level), next = mon.level < 50 ? expFor(mon.level + 1) : Infinity;
    const target = Math.min(mon.exp, next);
    if (inBattle && target > shown && next !== Infinity) {
      const a = shown;
      await tween(clamp((target - a) / (next - base) * 700, 150, 700), k => { B.xp = a + (target - a) * k; });
      shown = target;
    }
    if (mon.level >= 50 || mon.exp < next) break;
    const before = maxHp(mon);
    mon.level++;
    mon.hp += maxHp(mon) - before;
    shown = expFor(mon.level);
    if (inBattle) {
      B.pShow = mon.hp; B.xp = shown;
      healFx('p', ['#f8e060', '#ffffff', '#f8a030']);
    }
    await bsay('¡' + mon.name + ' subió al nivel ' + mon.level + '!', 900);
    for (const l of SPECIES[mon.sp].learn) if (l[0] === mon.level) await learnMove(mon, l[1]);
    const evo = SPECIES[mon.sp].evo;
    if (evo && mon.level >= evo.lv) mon._evo = true;
  }
  if (inBattle) B.xp = undefined;
}
async function learnMove(mon, id) {
  const d = MOVES[id];
  if (mon.moves.some(m => m.id === id)) return;
  if (mon.moves.length < 4) {
    mon.moves.push({ id, pp: d.pp });
    await say('¡' + mon.name + ' aprendió ' + d.n + '!', { auto: 1000 });
    return;
  }
  for (;;) {
    if (!(await confirmYes(mon.name + ' quiere aprender ' + d.n + ', pero ya conoce cuatro movimientos. ¿Olvidar uno?'))) {
      if (await confirmYes('¿Renunciar a aprender ' + d.n + '?')) { await say(mon.name + ' no aprendió ' + d.n + '.', { auto: 900 }); return; }
      continue;
    }
    const close = await say('¿Qué movimiento debe olvidar?', { hold: true });
    const i = await listMenu(mon.moves.map(m => MOVES[m.id].n), {});
    close();
    if (i < 0) continue;
    const old = MOVES[mon.moves[i].id].n;
    mon.moves[i] = { id, pp: d.pp };
    mon._last = 0;
    await say('¡' + mon.name + ' olvidó ' + old + ' y aprendió ' + d.n + '!', { auto: 1100 });
    return;
  }
}

let EV = null;
async function evolveSequence(mon) {
  const from = mon.sp, to = SPECIES[from].evo.to;
  EV = { show: from, white: 0, scale: 1 };
  FX.clear('evo');
  G.scene = 'evolution';
  await fadeTo(0, 300);
  await say('¿Eh? ¡' + mon.name + ' está evolucionando!');
  await tween(600, k => { EV.white = k; });

  const DUR = 4200;
  let t = 0, last = G.time, spark = 0, cancelled = false;
  while (t < DUR) {
    await wait(1);
    const dt = G.time - last; last = G.time; t += dt;
    if (Input.held.b) { cancelled = true; break; }
    const k = t / DUR;
    const phase = Math.sin(Math.PI * 2 * (k * k * 9 + k * 1.5));
    EV.show = phase > 0 ? to : from;
    EV.scale = 1 + (EV.show === to ? 0.08 : -0.06) * Math.abs(phase);
    spark += dt;
    while (spark > 40) {
      spark -= 40;
      const a = Math.random() * Math.PI * 2, r = 70 + rnd(30);
      FX.add({ layer: 'evo', x: 120 + Math.cos(a) * r, y: 58 + Math.sin(a) * r, vx: -Math.cos(a) * r / 30, vy: -Math.sin(a) * r / 30,
        c: ['#ffffff', '#f8e890', '#a0d8ff'][rnd(3)], shape: 'plus', s: 1, life: 480 });
    }
  }
  EV.scale = 1;

  if (cancelled) {
    EV.show = from;
    await tween(400, k => { EV.white = 1 - k; });
    await say('¿Eh? ¡' + mon.name + ' ha dejado de evolucionar!');
  } else {
    EV.show = to;
    await tween(260, k => { G.flash = k; });
    const oldName = mon.name, before = maxHp(mon);
    mon.sp = to;
    mon.name = SPECIES[to].n.toUpperCase();
    if (mon.hp > 0) mon.hp = Math.min(maxHp(mon), mon.hp + maxHp(mon) - before);
    EV.white = 0;
    burst(120, 58, 30, { cols: ['#ffffff', '#f8e060', '#a0d8ff'], speed: 2.6, life: 700, extra: { layer: 'evo', shape: 'plus', s: 1 } });
    FX.add({ layer: 'evo', x: 120, y: 58, shape: 'ring', r0: 10, r1: 70, c: '#ffffff', life: 600 });
    await tween(500, k => { G.flash = 1 - k; });
    await say('¡Enhorabuena! ¡' + oldName + ' ha evolucionado en ' + mon.name + '!');
    for (const l of SPECIES[to].learn) if (l[0] === mon.level) await learnMove(mon, l[1]);
  }
  await fadeTo(1, 300);
  FX.clear('evo');
  EV = null;
}

function renderEvolution() {
  rect(0, 0, VW, VH, '#141c34');
  const cx = 120, cy = 58;
  for (let i = 0; i < 16; i++) {
    const a = G.time / 2200 + i * Math.PI / 8;
    ctx.fillStyle = i % 2 ? '#1c2848' : '#24345c';
    for (let r = 24; r < 150; r += 6) ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 3, 3);
  }
  const pulse = 34 + Math.sin(G.time / 300) * 3;
  ctx.globalAlpha = 0.35; ctx.fillStyle = '#3a5090';
  ctx.beginPath(); ctx.arc(cx, cy + 6, pulse + 10, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  if (EV) {
    const set = SPR.mon[EV.show], w = Math.round(96 * EV.scale), x = cx - w / 2, y = 106 - w;
    ctx.drawImage(set.front, x, y, w, w);
    if (EV.white > 0) { ctx.globalAlpha = clamp(EV.white, 0, 1); ctx.drawImage(set.frontW, x, y, w, w); ctx.globalAlpha = 1; }
  }
  FX.draw('evo');
}

/* ---------- Dibujo del combate ---------- */
const BG_PAL = {
  field: { sky: ['#98d8f8', '#b0e4f8', '#c8eef8'], cloud: '#ffffff', hill: '#70b858', ground: ['#a0dc80', '#c0eca0', '#90d070'], plat: ['#70b858', '#b8e898'] },
  cave:  { sky: ['#2a2234', '#342a40', '#3e3248'], cloud: null, hill: '#4a3e52', ground: ['#6a5a5a', '#7e6c6a', '#5e4e50'], plat: ['#4e4046', '#8a7872'] },
};
function battleBackground(kind) {
  const pal = BG_PAL[kind] || BG_PAL.field;
  const [sky, g] = mkCanvas(VW, VH), p = pen(g);
  p.r(0, 0, VW, 26, pal.sky[0]); p.r(0, 26, VW, 22, pal.sky[1]); p.r(0, 48, VW, 22, pal.sky[2]);
  if (pal.cloud) { p.e(40, 22, 22, 6, pal.cloud); p.e(58, 18, 14, 6, pal.cloud); p.e(132, 34, 18, 5, pal.cloud); }
  else {
    for (let i = 0; i < 14; i++) p.t(i * 18 + 4, 0, i * 18 + 12, 0, i * 18 + 8, 8 + (i * 7) % 12, '#1e1828');
    for (let i = 0; i < 20; i++) p.r((i * 53) % VW, 10 + (i * 29) % 50, 1, 1, '#8070a0');
  }
  p.r(0, 66, VW, 4, pal.hill);
  p.r(0, 70, VW, 44, pal.ground[0]); p.r(0, 70, VW, 3, pal.ground[1]); p.r(0, 92, VW, 22, pal.ground[2]);
  p.r(0, 112, VW, 48, '#283048');
  const [plE, g1] = mkCanvas(80, 22), p1 = pen(g1);
  p1.e(40, 12, 38, 9, pal.plat[0]); p1.e(40, 10, 36, 8, pal.plat[1]);
  const [plP, g2] = mkCanvas(96, 24), p2 = pen(g2);
  p2.e(48, 13, 46, 10, pal.plat[0]); p2.e(48, 11, 44, 9, pal.plat[1]);
  return { sky, plE, plP };
}
function drawBattleMon(mon, back, pos, v, off) {
  if (v.hide || (v.blink && Math.floor(G.time / 60) % 2)) return;
  const set = SPR.mon[mon.sp];
  const h = Math.round(48 * (1 - v.sink));
  if (h <= 0 || v.scale <= 0) return;
  const breathe = v.sink === 0 && v.scale === 1 && v.white === 0 ? (Math.floor(G.time / 480 + (back ? 1 : 0)) % 2) : 0;
  const w = Math.round(48 * v.scale), hh = Math.round(h * v.scale);
  const x = Math.round(pos[0] + v.x + off + 24 - w / 2), y = Math.round(pos[1] + v.y + 48 - hh + breathe);
  ctx.globalAlpha = clamp(v.a, 0, 1);
  ctx.drawImage(set[back ? 'back' : 'front'], 0, 0, 48, h, x, y, w, hh);
  if (v.white > 0) {
    ctx.globalAlpha = clamp(v.a * v.white, 0, 1);
    ctx.drawImage(set[back ? 'backW' : 'frontW'], 0, 0, 48, h, x, y, w, hh);
  }
  ctx.globalAlpha = 1;
}
function drawTrainerBig(spr, dir, x, y) {
  ctx.drawImage(SPR.chars[spr][dir][0], Math.round(x), Math.round(y), 32, 36);
}
function renderBattle() {
  const eo = Math.round(-(1 - B.intro) * VW), po = Math.round((1 - B.intro) * VW);
  ctx.drawImage(B.bg.sky, 0, 0);
  ctx.drawImage(B.bg.plE, 148 + eo, 50);
  ctx.drawImage(B.bg.plP, 6 + po, 99);
  if (B.showTr) drawTrainerBig((B.tr && B.tr.spr) || 'boy', 'down', 172 + eo + B.trX, 24);
  drawBattleMon(B.e, false, E_POS, B.ev, eo);
  if (B.showPl) drawTrainerBig('player', 'up', 38 + po + B.plX, 70);
  if (B.p) drawBattleMon(B.p, true, P_POS, B.pv, po);
  if (B.orb) {
    const o = B.orb, x = Math.round(o.x), y = Math.round(o.y);
    if (o.open) { rect(x + 1, y - 3, 10, 4, '#28b0a8'); ctx.drawImage(SPR.orb, 0, 5, 12, 7, x, y + 5, 12, 7); }
    else {
      ctx.save();
      ctx.translate(x + 6, y + 6);
      ctx.rotate((o.tilt || 0) * 0.35 + Math.round((o.spin || 0) * 4) * Math.PI / 2);
      ctx.drawImage(SPR.orb, -6, -6);
      ctx.restore();
      if (o.done) { ctx.globalAlpha = 0.35; rect(x + 1, y + 1, 10, 10, '#202030'); ctx.globalAlpha = 1; }
    }
  }
  FX.draw('battle');

  // Marcador rival
  const ex = Math.round(B.eHud);
  if (ex > -HUD_OFF) {
    drawBox(6 + ex, 8, 112, 30);
    drawText(B.e.name, 13 + ex, 14, '#383848', '#c8d0d0');
    drawTextR('Nv' + B.e.level, 111 + ex, 14, '#383848', '#c8d0d0');
    drawText('PS', 14 + ex, 26, '#e08820');
    const ef = B.eShow / maxHp(B.e);
    drawBar(30 + ex, 27, 78, 4, ef, hpColor(ef));
  }
  // Marcador propio
  const px = Math.round(B.pHud);
  if (B.p && px < HUD_OFF) {
    drawBox(124 + px, 68, 112, 42);
    drawText(B.p.name, 131 + px, 74, '#383848', '#c8d0d0');
    drawTextR('Nv' + B.p.level, 229 + px, 74, '#383848', '#c8d0d0');
    drawText('PS', 132 + px, 86, '#e08820');
    const pf = B.pShow / maxHp(B.p);
    drawBar(148 + px, 87, 78, 4, pf, hpColor(pf));
    drawTextR(Math.ceil(B.pShow) + '/' + maxHp(B.p), 229 + px, 94, '#383848', '#c8d0d0');
    const a = expFor(B.p.level), b = expFor(B.p.level + 1), xv = B.xp !== undefined ? B.xp : B.p.exp;
    rect(131 + px, 104, 98, 2, '#607080');
    rect(131 + px, 104, Math.round(98 * clamp((xv - a) / (b - a), 0, 1)), 2, '#48a8f0');
  }

  // Cuadro de mensajes
  drawBox(DLG.x, DLG.y, DLG.w, DLG.h);
  if (B.msg) wrapText(B.msg, DLG.chars).slice(0, 2).forEach((l, i) => drawText(l, DLG.x + 9, DLG.y + 9 + i * 14, '#383848', '#c8d0d0'));
}
