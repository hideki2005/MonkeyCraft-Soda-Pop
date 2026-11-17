/* Datos del juego: tipos, movimientos, especies y objetos. */
'use strict';

const TYPES = {
  normal:    { n: 'NORMAL',  c: '#a8a090' },
  fuego:     { n: 'FUEGO',   c: '#f07030' },
  agua:      { n: 'AGUA',    c: '#4890f0' },
  planta:    { n: 'PLANTA',  c: '#58b848' },
  electrico: { n: 'ELECTR.', c: '#e8b800' },
  volador:   { n: 'VIENTO',  c: '#80a8e8' },
  bicho:     { n: 'BICHO',   c: '#98a820' },
  roca:      { n: 'ROCA',    c: '#a08850' },
};

/* Multiplicadores: CHART[atacante][defensor]. Lo no listado vale 1. */
const CHART = {
  normal:    { roca: 0.5 },
  fuego:     { planta: 2, bicho: 2, fuego: 0.5, agua: 0.5, roca: 0.5 },
  agua:      { fuego: 2, roca: 2, agua: 0.5, planta: 0.5 },
  planta:    { agua: 2, roca: 2, fuego: 0.5, planta: 0.5, volador: 0.5, bicho: 0.5 },
  electrico: { agua: 2, volador: 2, planta: 0.5, electrico: 0.5, roca: 0.5 },
  volador:   { planta: 2, bicho: 2, electrico: 0.5, roca: 0.5 },
  bicho:     { planta: 2, fuego: 0.5, volador: 0.5 },
  roca:      { fuego: 2, volador: 2, bicho: 2, electrico: 2, roca: 0.5 },
};
function typeMult(atk, def) {
  const row = CHART[atk];
  return row && row[def] !== undefined ? row[def] : 1;
}

/* eff: cambio de característica. who: 'foe' | 'self'. */
const MOVES = {
  golpe:     { n: 'Golpe',        t: 'normal',    pow: 40, acc: 100, pp: 35 },
  zarpazo:   { n: 'Zarpazo',      t: 'normal',    pow: 40, acc: 100, pp: 35 },
  rapido:    { n: 'Golpe Veloz',  t: 'normal',    pow: 40, acc: 100, pp: 30, pri: 1 },
  cabezazo:  { n: 'Cabezazo',     t: 'normal',    pow: 60, acc: 95,  pp: 20 },
  rugido:    { n: 'Rugido',       t: 'normal',    pow: 0,  acc: 100, pp: 30, eff: { who: 'foe', stat: 'atk', d: -1 } },
  mirada:    { n: 'Mirada Fija',  t: 'normal',    pow: 0,  acc: 100, pp: 30, eff: { who: 'foe', stat: 'def', d: -1 } },
  coraza:    { n: 'Coraza',       t: 'normal',    pow: 0,  acc: 100, pp: 30, eff: { who: 'self', stat: 'def', d: 1 } },
  latigo:    { n: 'Látigo Hoja',  t: 'planta',    pow: 45, acc: 100, pp: 25 },
  sorbo:     { n: 'Sorbo Vital',  t: 'planta',    pow: 35, acc: 100, pp: 20, drain: true },
  tajo:      { n: 'Tajo Verde',   t: 'planta',    pow: 60, acc: 95,  pp: 15 },
  ascua:     { n: 'Brasa Viva',   t: 'fuego',     pow: 45, acc: 100, pp: 25 },
  fogonazo:  { n: 'Fogonazo',     t: 'fuego',     pow: 60, acc: 95,  pp: 15 },
  chorro:    { n: 'Chorro',       t: 'agua',      pow: 45, acc: 100, pp: 25 },
  oleada:    { n: 'Oleada',       t: 'agua',      pow: 60, acc: 95,  pp: 15 },
  picoteo:   { n: 'Picoteo',      t: 'volador',   pow: 40, acc: 100, pp: 35 },
  vendaval:  { n: 'Vendaval',     t: 'volador',   pow: 55, acc: 95,  pp: 20 },
  picadura:  { n: 'Picadura',     t: 'bicho',     pow: 40, acc: 100, pp: 30 },
  descarga:  { n: 'Descarga',     t: 'electrico', pow: 45, acc: 100, pp: 25 },
  rayo:      { n: 'Rayo Veloz',   t: 'electrico', pow: 60, acc: 95,  pp: 15 },
  pedrada:   { n: 'Pedrada',      t: 'roca',      pow: 50, acc: 90,  pp: 15 },
  arremetida:{ n: 'Arremetida',   t: 'normal',    pow: 75, acc: 95,  pp: 15 },
  espesura:  { n: 'Espesura',     t: 'planta',    pow: 80, acc: 90,  pp: 10 },
  incendio:  { n: 'Incendio',     t: 'fuego',     pow: 80, acc: 90,  pp: 10 },
  torrente:  { n: 'Torrente',     t: 'agua',      pow: 80, acc: 90,  pp: 10 },
  trueno:    { n: 'Trueno Seco',  t: 'electrico', pow: 80, acc: 90,  pp: 10 },
  alud:      { n: 'Alud',         t: 'roca',      pow: 75, acc: 90,  pp: 10 },
  picado:    { n: 'Picado',       t: 'volador',   pow: 70, acc: 95,  pp: 15 },
  enjambre:  { n: 'Enjambre',     t: 'bicho',     pow: 65, acc: 100, pp: 15 },
  forcejeo:  { n: 'Forcejeo',     t: 'normal',    pow: 35, acc: 100, pp: 1 },
};

const SPECIES = {
  brotin: {
    n: 'Brotín', t: 'planta', hp: 45, atk: 49, def: 49, spd: 45, exp: 64, rate: 45, evo: { to: 'frondal', lv: 14 },
    learn: [[1, 'golpe'], [1, 'rugido'], [7, 'latigo'], [10, 'sorbo'], [13, 'tajo']],
    desc: 'Un brote tranquilo. La hoja de su cabeza gira hacia el sol.',
  },
  ascuino: {
    n: 'Ascuino', t: 'fuego', hp: 39, atk: 52, def: 43, spd: 65, exp: 64, rate: 45, evo: { to: 'brasador', lv: 14 },
    learn: [[1, 'zarpazo'], [1, 'rugido'], [7, 'ascua'], [10, 'rapido'], [13, 'fogonazo']],
    desc: 'Un carbón vivo. Su llama crece cuando se emociona.',
  },
  gotiko: {
    n: 'Gotiko', t: 'agua', hp: 44, atk: 48, def: 65, spd: 43, exp: 64, rate: 45, evo: { to: 'marejo', lv: 14 },
    learn: [[1, 'golpe'], [1, 'coraza'], [7, 'chorro'], [10, 'mirada'], [13, 'oleada']],
    desc: 'Una gota juguetona. Rebota sobre los charcos al amanecer.',
  },
  roedin: {
    n: 'Roedín', t: 'normal', hp: 35, atk: 50, def: 35, spd: 70, exp: 52, rate: 190, evo: { to: 'roedon', lv: 12 },
    learn: [[1, 'golpe'], [1, 'mirada'], [5, 'rapido'], [10, 'cabezazo']],
    desc: 'Roe todo lo que encuentra. Muy común en las sendas.',
  },
  plumelo: {
    n: 'Plumelo', t: 'volador', hp: 40, atk: 45, def: 40, spd: 60, exp: 54, rate: 190, evo: { to: 'plumazo', lv: 13 },
    learn: [[1, 'picoteo'], [1, 'rugido'], [6, 'rapido'], [10, 'vendaval']],
    desc: 'Vuela bajo sobre la hierba buscando semillas.',
  },
  larvita: {
    n: 'Larvita', t: 'bicho', hp: 40, atk: 38, def: 40, spd: 40, exp: 50, rate: 200, evo: { to: 'crisalin', lv: 7 },
    learn: [[1, 'picadura'], [1, 'golpe'], [8, 'coraza'], [11, 'cabezazo']],
    desc: 'Mastica hojas sin descanso. Sus antenas notan la lluvia.',
  },
  chispo: {
    n: 'Chispo', t: 'electrico', hp: 35, atk: 55, def: 35, spd: 80, exp: 62, rate: 120, evo: { to: 'voltisp', lv: 15 },
    learn: [[1, 'descarga'], [1, 'rugido'], [6, 'rapido'], [11, 'rayo']],
    desc: 'Sus púas acumulan electricidad estática al correr.',
  },
  pedrusco: {
    n: 'Pedrusco', t: 'roca', hp: 45, atk: 60, def: 85, spd: 20, exp: 62, rate: 120, evo: { to: 'penasco', lv: 15 },
    learn: [[1, 'golpe'], [1, 'coraza'], [6, 'pedrada'], [11, 'cabezazo']],
    desc: 'Parece una piedra con musgo hasta que abre los ojos.',
  },
  setin: {
    n: 'Setín', t: 'planta', hp: 50, atk: 45, def: 50, spd: 30, exp: 56, rate: 150, evo: { to: 'setazo', lv: 14 },
    learn: [[1, 'sorbo'], [1, 'golpe'], [7, 'latigo'], [12, 'tajo']],
    desc: 'Crece a la sombra de los árboles viejos del bosque.',
  },
  fulgato: {
    n: 'Fulgato', t: 'electrico', hp: 55, atk: 65, def: 50, spd: 85, exp: 90, rate: 45,
    learn: [[1, 'descarga'], [1, 'mirada'], [8, 'rapido'], [12, 'rayo']],
    desc: 'Un felino veloz. Su cola chisporrotea antes de saltar.',
  },
};

/* Formas evolucionadas y kumi especial */
Object.assign(SPECIES, {
  frondal: {
    n: 'Frondal', t: 'planta', hp: 60, atk: 62, def: 63, spd: 60, exp: 142, rate: 45,
    learn: [[1, 'golpe'], [1, 'rugido'], [7, 'latigo'], [10, 'sorbo'], [13, 'tajo'], [17, 'espesura']],
    desc: 'Su corona de hojas guarda un capullo que se abre con el buen tiempo.',
  },
  brasador: {
    n: 'Brasador', t: 'fuego', hp: 58, atk: 64, def: 58, spd: 80, exp: 142, rate: 45,
    learn: [[1, 'zarpazo'], [1, 'rugido'], [7, 'ascua'], [10, 'rapido'], [13, 'fogonazo'], [17, 'incendio']],
    desc: 'La llama de su cola delata su humor. Nunca se apaga del todo.',
  },
  marejo: {
    n: 'Marejo', t: 'agua', hp: 59, atk: 63, def: 80, spd: 58, exp: 142, rate: 45,
    learn: [[1, 'golpe'], [1, 'coraza'], [7, 'chorro'], [10, 'mirada'], [13, 'oleada'], [17, 'torrente']],
    desc: 'Nada contra corriente sin esfuerzo gracias a sus aletas.',
  },
  roedon: {
    n: 'Roedón', t: 'normal', hp: 55, atk: 81, def: 60, spd: 97, exp: 116, rate: 127,
    learn: [[1, 'golpe'], [1, 'mirada'], [5, 'rapido'], [10, 'cabezazo'], [14, 'arremetida']],
    desc: 'Sus dientes no paran de crecer. Roe piedras para limarlos.',
  },
  plumazo: {
    n: 'Plumazo', t: 'volador', hp: 63, atk: 60, def: 55, spd: 71, exp: 113, rate: 120,
    learn: [[1, 'picoteo'], [1, 'rugido'], [6, 'rapido'], [10, 'vendaval'], [15, 'picado']],
    desc: 'Patrulla su territorio desde lo alto y cae en picado sobre los intrusos.',
  },
  crisalin: {
    n: 'Crisalín', t: 'bicho', hp: 50, atk: 20, def: 55, spd: 30, exp: 72, rate: 120, evo: { to: 'polilux', lv: 11 },
    learn: [[1, 'picadura'], [1, 'golpe'], [7, 'coraza']],
    desc: 'Cuelga inmóvil de las ramas mientras su cuerpo cambia por dentro.',
  },
  polilux: {
    n: 'Polilux', t: 'bicho', hp: 60, atk: 65, def: 50, spd: 70, exp: 160, rate: 45,
    learn: [[1, 'picadura'], [1, 'coraza'], [11, 'vendaval'], [13, 'enjambre']],
    desc: 'Las escamas de sus alas brillan en la oscuridad como faroles.',
  },
  voltisp: {
    n: 'Voltispín', t: 'electrico', hp: 60, atk: 80, def: 55, spd: 100, exp: 150, rate: 60,
    learn: [[1, 'descarga'], [1, 'rugido'], [6, 'rapido'], [11, 'rayo'], [17, 'trueno']],
    desc: 'Eriza las púas y dispara chispas cuando se siente acorralado.',
  },
  penasco: {
    n: 'Peñasco', t: 'roca', hp: 65, atk: 80, def: 110, spd: 30, exp: 150, rate: 60,
    learn: [[1, 'golpe'], [1, 'coraza'], [6, 'pedrada'], [11, 'cabezazo'], [17, 'alud']],
    desc: 'Lleva siglos durmiendo en la gruta. En su espalda crecen cristales.',
  },
  setazo: {
    n: 'Setazo', t: 'planta', hp: 70, atk: 65, def: 70, spd: 40, exp: 140, rate: 75,
    learn: [[1, 'sorbo'], [1, 'golpe'], [7, 'latigo'], [12, 'tajo'], [16, 'espesura']],
    desc: 'Su sombrero suelta esporas que dan sueño a quien las respira.',
  },
  cristalio: {
    n: 'Cristalio', t: 'roca', hp: 80, atk: 90, def: 100, spd: 75, exp: 220, rate: 45,
    learn: [[1, 'pedrada'], [1, 'coraza'], [1, 'rayo'], [1, 'alud']],
    desc: 'Un kumi de cristal que nadie había visto. Dicen que nace del eco de la gruta.',
  },
});

const ITEMS = {
  orbe:        { n: 'Orbe',        price: 100, desc: 'Captura kumis salvajes. Funciona mejor si están débiles.' },
  pocion:      { n: 'Poción',      price: 150, heal: 20, desc: 'Restaura 20 PS de un kumi.' },
  superpocion: { n: 'Superpoción', price: 350, heal: 50, desc: 'Restaura 50 PS de un kumi.' },
};
const ITEM_ORDER = ['orbe', 'pocion', 'superpocion'];

/* ---------- Criaturas ---------- */
function expFor(level) { return Math.floor(0.8 * level * level * level); }

function calcStat(base, level) { return Math.floor(base * 2 * level / 100) + 5; }
function maxHp(mon) { return Math.floor(SPECIES[mon.sp].hp * 2 * mon.level / 100) + mon.level + 10; }
function statOf(mon, stat) { return calcStat(SPECIES[mon.sp][stat], mon.level); }

function makeMon(sp, level) {
  const s = SPECIES[sp];
  const known = s.learn.filter(l => l[0] <= level).map(l => l[1]).slice(-4);
  const mon = {
    sp, name: s.n.toUpperCase(), level, exp: expFor(level), hp: 0,
    moves: known.map(id => ({ id, pp: MOVES[id].pp })),
  };
  mon.hp = maxHp(mon);
  return mon;
}
function healMon(mon) {
  mon.hp = maxHp(mon);
  mon.moves.forEach(m => { m.pp = MOVES[m.id].pp; });
}
