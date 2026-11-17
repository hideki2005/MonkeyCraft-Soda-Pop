/* Combate por turnos: flujo, IA rival, captura, experiencia y dibujo. */
'use strict';

let B = null;
const E_POS = [164, 14], P_POS = [30, 64];

function newVis() { return { x: 0, y: 0, a: 1, sink: 0, hide: false, blink: false }; }
function stageMul(s) { return s >= 0 ? (2 + s) / 2 : 2 / (2 - s); }
function foeLabel() { return 'El ' + B.e.name + (B.wild ? ' salvaje' : ' rival'); }
function label(side) { return side === 'p' ? B.p.name : foeLabel(); }

async function bsay(text, ms) {
  B.msg = text;
  await say(text, { auto: ms || 650 });
}

/* opciones: { wild: mon } o { trainer: {name, cls, party, reward, lose} } */
async function battle(o) {
  const wild = !!o.wild;
  const foes = wild ? [o.wild] : o.trainer.party.map(p => makeMon(p[0], p[1]));
  B = {
    wild, tr: o.trainer, foes, fi: 0, e: foes[0], p: null, pi: -1,
    eShow: foes[0].hp, pShow: 0, msg: '', ev: newVis(), pv: newVis(),
    st: { p: { atk: 0, def: 0 }, e: { atk: 0, def: 0 } },
    orb: null, runTries: 0, bg: battleBackground(),
  };
  B.pv.hide = true; B.ev.x = -200;

  // Transición de entrada
  for (let i = 0; i < 2; i++) {
    await tween(110, k => { G.flash = k * 0.85; });
    await tween(110, k => { G.flash = (1 - k) * 0.85; });
  }
  await fadeTo(1, 200);
  G.scene = 'battle';
  await fadeTo(0, 200);
  await tween(350, k => { B.ev.x = -200 * (1 - k); });

  if (wild) await bsay('¡Un ' + B.e.name + ' salvaje apareció!', 800);
  else {
    await bsay('¡' + B.tr.cls + ' ' + B.tr.name + ' te desafía!', 800);
    await bsay(B.tr.name + ' envía a ' + B.e.name + '.');
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
        B.ev = newVis(); B.ev.a = 0;
        await bsay(B.tr.name + ' envía a ' + B.e.name + '.');
        await tween(250, k => { B.ev.a = k; });
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
    await bsay('¡Has derrotado a ' + B.tr.cls + ' ' + B.tr.name + '!', 900);
    if (B.tr.lose) await say(B.tr.name + ': ' + B.tr.lose);
    S.money += B.tr.reward || 0;
    await bsay('Recibes $' + (B.tr.reward || 0) + ' como premio.', 900);
  }
  if (result === 'lose') await bsay('¡Todo tu equipo se ha debilitado!', 900);

  await fadeTo(1, 250);
  G.scene = 'world';
  B = null;
  await fadeTo(0, 250);
  return result;
}

/* ---------- Entradas y salidas ---------- */
async function sendOut(i) {
  B.pi = i; B.p = S.party[i]; B.pShow = B.p.hp;
  B.st.p = { atk: 0, def: 0 };
  B.pv = newVis(); B.pv.a = 0;
  await bsay('¡Adelante, ' + B.p.name + '!');
  await tween(250, k => { B.pv.a = k; B.pv.y = (1 - k) * 10; });
}
async function recall() {
  await bsay('¡Vuelve, ' + B.p.name + '!');
  await tween(200, k => { B.pv.a = 1 - k; });
  B.pv.hide = true;
}
async function faint(side) {
  const v = side === 'p' ? B.pv : B.ev;
  await tween(400, k => { v.sink = k; });
  v.hide = true;
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
          if (i === s) drawCursor(x - 7, y);
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
  let sel = B.p._last || 0;
  for (;;) {
    sel = await menu({
      n: moves.length, cols: 2, sel,
      draw(s) {
        drawBox(4, DLG.y, 160, DLG.h, '#e0a030');
        moves.forEach((m, i) => {
          const x = 18 + (i % 2) * 74, y = DLG.y + 9 + Math.floor(i / 2) * 14;
          drawText(MOVES[m.id].n, x, y, m.pp > 0 ? '#383848' : '#a0a0a8', '#c8d0d0');
          if (i === s) drawCursor(x - 7, y);
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

/* ---------- Movimientos ---------- */
async function useMove(side, id) {
  const A = side === 'p' ? B.p : B.e, D = side === 'p' ? B.e : B.p;
  const other = side === 'p' ? 'e' : 'p';
  if (A.hp <= 0 || D.hp <= 0) return;
  const d = MOVES[id];
  const slot = A.moves.find(m => m.id === id);
  if (slot && slot.pp > 0) slot.pp--;
  await bsay('¡' + label(side) + ' usó ' + d.n + '!');

  // Embestida del atacante
  const av = side === 'p' ? B.pv : B.ev, dir = side === 'p' ? 1 : -1;
  await tween(180, k => { const s = Math.sin(k * Math.PI); av.x = dir * 14 * s; av.y = -dir * 6 * s; });
  av.x = 0; av.y = 0;

  if (Math.random() * 100 >= d.acc) { await bsay('¡Pero falló!'); return; }

  if (d.eff) {
    const tSide = d.eff.who === 'self' ? side : other;
    const cur = B.st[tSide][d.eff.stat], next = clamp(cur + d.eff.d, -3, 3);
    const statName = d.eff.stat === 'atk' ? 'El ataque' : 'La defensa';
    const owner = tSide === 'p' ? 'de ' + B.p.name : 'del ' + B.e.name + (B.wild ? ' salvaje' : ' rival');
    if (next === cur) { await bsay('¡Pero no tuvo efecto!'); return; }
    B.st[tSide][d.eff.stat] = next;
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

  // Golpe: parpadeo y sacudida del objetivo
  const dv = side === 'p' ? B.ev : B.pv;
  dv.blink = true;
  await tween(300, k => { dv.x = Math.sin(k * Math.PI * 6) * 3; });
  dv.blink = false; dv.x = 0;

  D.hp -= dmg;
  await hpTween(other, D.hp);
  if (crit) await bsay('¡Golpe crítico!');
  if (mult > 1) await bsay('¡Es muy eficaz!');
  else if (mult < 1) await bsay('No es muy eficaz...');

  if (d.drain && A.hp > 0 && A.hp < maxHp(A)) {
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
  if (mon === B.p) await hpTween('p', mon.hp);
  await bsay('¡' + mon.name + ' recuperó ' + heal + ' PS!');
}

async function tryRun() {
  B.runTries++;
  const ps = statOf(B.p, 'spd'), es = statOf(B.e, 'spd');
  if (ps >= es || Math.random() < 0.45 + 0.2 * B.runTries) { await bsay('¡Escapaste sin problemas!', 800); return true; }
  await bsay('¡No has podido escapar!');
  return false;
}

/* ---------- Captura ---------- */
async function throwOrb() {
  S.bag.orbe--;
  await bsay('¡Lanzas un Orbe!');
  const tx = E_POS[0] + 18, ty = E_POS[1] + 14;
  B.orb = { x: 60, y: 96 };
  await tween(450, k => { B.orb.x = 60 + (tx - 60) * k; B.orb.y = 96 + (ty - 96) * k - Math.sin(k * Math.PI) * 34; });
  await tween(180, k => { B.ev.a = 1 - k; });
  B.ev.hide = true;
  await tween(220, k => { B.orb.y = ty + 22 * k; });

  const m = maxHp(B.e);
  const chance = Math.min(1, ((3 * m - 2 * B.e.hp) * SPECIES[B.e.sp].rate / (3 * m)) / 255);
  const caught = Math.random() < chance;
  const shakes = caught ? 3 : rnd(3);
  const bx = B.orb.x;
  for (let i = 0; i < shakes; i++) {
    await wait(260);
    await tween(260, k => { B.orb.x = bx + Math.sin(k * Math.PI * 2) * 3; });
  }
  await wait(260);

  if (!caught) {
    B.orb = null; B.ev.hide = false;
    await tween(150, k => { B.ev.a = k; });
    await bsay(shakes >= 2 ? '¡Casi! ¡El kumi se ha escapado!' : '¡Oh, no! ¡El kumi se ha soltado!');
    return false;
  }
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

/* ---------- Experiencia y aprendizaje ---------- */
async function gainExp(mon, amount) {
  mon.exp += amount;
  await bsay(mon.name + ' ganó ' + amount + ' puntos de experiencia.');
  while (mon.level < 50 && mon.exp >= expFor(mon.level + 1)) {
    const before = maxHp(mon);
    mon.level++;
    mon.hp += maxHp(mon) - before;
    if (B && mon === B.p) B.pShow = mon.hp;
    await bsay('¡' + mon.name + ' subió al nivel ' + mon.level + '!', 900);
    for (const l of SPECIES[mon.sp].learn) if (l[0] === mon.level) await learnMove(mon, l[1]);
  }
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

/* ---------- Dibujo ---------- */
function battleBackground() {
  const [c, g] = mkCanvas(VW, VH), p = pen(g);
  p.r(0, 0, VW, 26, '#98d8f8'); p.r(0, 26, VW, 22, '#b0e4f8'); p.r(0, 48, VW, 22, '#c8eef8');
  p.e(40, 22, 22, 6, '#ffffff'); p.e(58, 18, 14, 6, '#ffffff'); p.e(132, 34, 18, 5, '#ffffff');
  p.r(0, 66, VW, 4, '#70b858');
  p.r(0, 70, VW, 44, '#a0dc80'); p.r(0, 70, VW, 3, '#c0eca0'); p.r(0, 92, VW, 22, '#90d070');
  p.e(188, 62, 38, 9, '#70b858'); p.e(188, 60, 36, 8, '#b8e898');
  p.e(54, 112, 46, 10, '#70b858'); p.e(54, 110, 44, 9, '#b8e898');
  p.r(0, 112, VW, 48, '#283048');
  return c;
}
function drawBattleMon(mon, back, pos, v) {
  if (v.hide || (v.blink && Math.floor(G.time / 60) % 2)) return;
  const img = SPR.mon[mon.sp][back ? 'back' : 'front'];
  const h = Math.round(48 * (1 - v.sink));
  if (h <= 0) return;
  ctx.globalAlpha = clamp(v.a, 0, 1);
  ctx.drawImage(img, 0, 0, 48, h, Math.round(pos[0] + v.x), Math.round(pos[1] + v.y + 48 - h), 48, h);
  ctx.globalAlpha = 1;
}
function renderBattle() {
  ctx.drawImage(B.bg, 0, 0);
  drawBattleMon(B.e, false, E_POS, B.ev);
  if (B.p) drawBattleMon(B.p, true, P_POS, B.pv);
  if (B.orb) ctx.drawImage(SPR.orb, Math.round(B.orb.x), Math.round(B.orb.y));

  // Marcador rival
  drawBox(6, 8, 112, 30);
  drawText(B.e.name, 13, 14, '#383848', '#c8d0d0');
  drawTextR('Nv' + B.e.level, 111, 14, '#383848', '#c8d0d0');
  drawText('PS', 14, 26, '#e08820');
  const ef = B.eShow / maxHp(B.e);
  drawBar(30, 27, 78, 4, ef, hpColor(ef));

  // Marcador propio
  if (B.p) {
    drawBox(124, 68, 112, 42);
    drawText(B.p.name, 131, 74, '#383848', '#c8d0d0');
    drawTextR('Nv' + B.p.level, 229, 74, '#383848', '#c8d0d0');
    drawText('PS', 132, 86, '#e08820');
    const pf = B.pShow / maxHp(B.p);
    drawBar(148, 87, 78, 4, pf, hpColor(pf));
    drawTextR(Math.ceil(B.pShow) + '/' + maxHp(B.p), 229, 94, '#383848', '#c8d0d0');
    const a = expFor(B.p.level), b = expFor(B.p.level + 1);
    rect(131, 104, 98, 2, '#607080');
    rect(131, 104, Math.round(98 * clamp((B.p.exp - a) / (b - a), 0, 1)), 2, '#48a8f0');
  }

  // Cuadro de mensajes
  drawBox(DLG.x, DLG.y, DLG.w, DLG.h);
  if (B.msg) wrapText(B.msg, DLG.chars).slice(0, 2).forEach((l, i) => drawText(l, DLG.x + 9, DLG.y + 9 + i * 14, '#383848', '#c8d0d0'));
}
