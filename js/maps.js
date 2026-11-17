/* Mapas, personajes y eventos de la aventura.
   Leyenda exterior: . hierba  , hierba alta  : camino  T árbol  ~ agua  * flores
                     f valla  o roca  S cartel  RLHMG tejados  W/w pared  D puerta
                     v bordillo (se salta hacia abajo)  = puente  Y acantilado  C boca de cueva
   Leyenda cueva:    K pared  - suelo  ; musgo alto  O roca  X salida
   Leyenda interior: _ suelo  # muro  c mostrador  t mesa  b estantería  p planta
                     E salida  B cama  k terminal  s pilar */
'use strict';

const WALKABLE = '.,:*_ED=-;CX';
const ENC_TILES = ',;';

const MAPS = {
  /* ---------------- Villa Alba ---------------- */
  town: {
    name: 'VILLA ALBA',
    t: [
      'TTTTTTTTT::TTTTTTTTT',
      'TTTTTTTTT::TTTTTTTTT',
      'T........::........T',
      'T.RRRR...::..LLLLL.T',
      'T.RRRR...::..LLLLL.T',
      'T.WDWW...::..LLLLL.T',
      'T..:.....::..wWDWw.T',
      'T..::::::::::::::..T',
      'T..*.....::.....*..T',
      'T.*.*....::....S...T',
      'T........::........T',
      'T..ffff..::..~~~~..T',
      'T..*..*..::..~~~~..T',
      'T........::..~~~~..T',
      'T.S......::........T',
      'T........**........T',
      'TTTTTTTTTTTTTTTTTTTT',
    ],
    warps: [
      { x: 9, y: 0, to: 'route', tx: 9, ty: 24 }, { x: 10, y: 0, to: 'route', tx: 10, ty: 24 },
      { x: 3, y: 5, to: 'home', tx: 4, ty: 5 }, { x: 15, y: 6, to: 'lab', tx: 5, ty: 6 },
    ],
    signs: {
      '15,9': 'LABORATORIO KUMI\nProfesora Ceiba',
      '2,14': 'VILLA ALBA\nDonde empieza cada viaje.',
    },
    npcs: [
      { id: 'old', spr: 'old', x: 6, y: 9, dir: 'down', text: ['En la hierba alta viven kumis salvajes.', 'Si vas sin compañero, ni te acerques. Con uno, ¡podrás capturar más!'] },
      { id: 'girl', spr: 'girl', x: 12, y: 14, dir: 'up', wander: 2, text: ['Pulsa M para abrir el menú y guardar la partida.', 'Yo guardo siempre antes de un combate difícil.'] },
    ],
    onStep(x, y) {
      if (y <= 2 && (x === 9 || x === 10) && !S.flags.starter) {
        return async () => {
          await say('¡Alto! Más allá hay hierba alta con kumis salvajes.');
          await say('La profesora Ceiba te espera en el laboratorio para darte un compañero.');
          await walkPlayer('down');
        };
      }
      return null;
    },
  },

  home: {
    name: 'TU CASA', style: 'home',
    t: [
      '##########',
      '#b______B#',
      '#__tt____#',
      '#________#',
      '#________#',
      '#________#',
      '####E#####',
    ],
    warps: [{ x: 4, y: 6, to: 'town', tx: 3, ty: 6 }],
    npcs: [
      {
        id: 'mom', spr: 'mom', x: 6, y: 3, dir: 'down',
        async talk() {
          if (!S.flags.starter) {
            await say('MAMÁ: ¡Buenos días! La profesora Ceiba ha preguntado por ti.');
            await say('MAMÁ: Su laboratorio está al este del pueblo. ¡Hoy recibes tu primer kumi!');
          } else {
            await say('MAMÁ: Tienes cara de cansancio. Descansad un rato tú y tus kumis.');
            await healSequence();
            await say('MAMÁ: ¡Listo! Tus kumis están llenos de energía. ¡Mucho ánimo!');
          }
        },
      },
    ],
  },

  lab: {
    name: 'LABORATORIO', style: 'lab',
    t: [
      '############',
      '#bb__k___bb#',
      '#__________#',
      '#___ttt____#',
      '#__________#',
      '#__________#',
      '#p________p#',
      '#####E######',
    ],
    warps: [{ x: 5, y: 7, to: 'town', tx: 15, ty: 7 }],
    actions: {
      '4,3': () => chooseStarter(0), '5,3': () => chooseStarter(1), '6,3': () => chooseStarter(2),
    },
    props() {
      return STARTERS.map((sp, i) => ({ sp, x: 4 + i, y: 3 }))
        .filter(o => o.sp !== S.flags.starter && o.sp !== S.flags.rivalSp);
    },
    npcs: [
      {
        id: 'prof', spr: 'prof', x: 8, y: 3, dir: 'down',
        async talk() {
          if (!S.flags.starter) {
            await say('PROF. CEIBA: ¡Por fin llegas! En la mesa hay tres orbes, cada uno con un kumi.');
            await say('PROF. CEIBA: BROTÍN es de planta, ASCUINO de fuego y GOTIKO de agua. Acércate y elige uno.');
          } else if (S.flags.badge) {
            await say('PROF. CEIBA: ¡La Medalla Chispa! Sabía que lo conseguirías.');
            await say('PROF. CEIBA: Has capturado ' + S.caught + ' kumis. ¡Sigue explorando!');
            if (S.flags.st_cristalio) await say('PROF. CEIBA: ¡Y encontraste al kumi de cristal de la Gruta Eco! Increíble.');
            else await say('PROF. CEIBA: Dicen que en el fondo de la Gruta Eco, al este de Ciudad Cobalto, brilla un kumi de cristal.');
          } else {
            await say('PROF. CEIBA: Debilita a los kumis salvajes antes de lanzar un orbe.');
            await say('PROF. CEIBA: Al ganar experiencia, muchos kumis evolucionan. Mantén X pulsado si quieres detenerlo.');
            await say('PROF. CEIBA: En Ciudad Cobalto está el gimnasio de TORMES. ¡Gana su medalla!');
          }
        },
      },
      {
        id: 'rival', spr: 'rival', x: 2, y: 4, dir: 'right',
        hide: () => !!S.flags.rivalBeaten,
        text: ['DANA: ¡Venga, elige ya! Yo me quedaré con el que más me convenga.'],
      },
    ],
  },

  /* ---------------- Senda 1 ---------------- */
  route: {
    name: 'SENDA 1',
    t: [
      'TTTTTTTTT::TTTTTTTTT',
      'TTTTTTTTT::TTTTTTTTT',
      'T,,,,....::....,,,,T',
      'T,,,,....::....,,,,T',
      'T,,,,..:::::...,,,,T',
      'T......:...........T',
      'TTTTTT.:.TTTTTTTTTTT',
      'T......:....,,,,,,.T',
      'T..,,,.:....,,,,,,.T',
      'T..,,,.::::.,,,,,,.T',
      'T..,,,....:........T',
      'T.........:..ffff..T',
      'TTTTTTTT..:..TTTTTTT',
      'T~~~~.....:........T',
      'T~~~~..,,,:,,,.....T',
      'T~~~~..,,,:,,,..*..T',
      'T......,,,:,,,.....T',
      'T.S.......:........T',
      'TTTT..TTTT:TTTTTTTTT',
      'T.....,,,,:,,,,....T',
      'T.....,,,,:,,,,....T',
      'T..*..,,,,:,,,,..*.T',
      'T.........:........T',
      'T........::........T',
      'TTTTTTTTT::TTTTTTTTT',
      'TTTTTTTTT::TTTTTTTTT',
    ],
    warps: [
      { x: 9, y: 25, to: 'town', tx: 9, ty: 1 }, { x: 10, y: 25, to: 'town', tx: 10, ty: 1 },
      { x: 9, y: 0, to: 'forest', tx: 10, ty: 22 }, { x: 10, y: 0, to: 'forest', tx: 11, ty: 22 },
    ],
    signs: { '2,17': 'SENDA 1\nAl norte: Bosque Murmullo.\nAl sur: Villa Alba.' },
    items: [
      { id: 'r_pot', x: 18, y: 7, item: 'pocion', qty: 1 },
      { id: 'r_orb', x: 1, y: 19, item: 'orbe', qty: 2 },
    ],
    encRate: 0.14,
    enc: [
      { sp: 'roedin', min: 2, max: 4, w: 40 }, { sp: 'plumelo', min: 2, max: 4, w: 35 },
      { sp: 'larvita', min: 3, max: 4, w: 25 },
    ],
    npcs: [
      {
        id: 'gift1', spr: 'old', x: 5, y: 22, dir: 'right',
        async talk() {
          if (!S.flags.gift1) {
            await say('¿Empiezas tu viaje? Toma, esto te sacará de un apuro.');
            await giveItem('pocion', 1);
            S.flags.gift1 = true;
          } else {
            await say('En el menú, abre la MOCHILA para usar pociones fuera de combate.');
          }
        },
      },
      {
        id: 'r1', spr: 'boy', x: 14, y: 22, dir: 'left',
        trainer: { name: 'LEO', cls: 'Joven', los: 4, party: [['roedin', 4], ['plumelo', 4]], reward: 80,
          before: '¡Eh, tú! ¡Llevo toda la mañana entrenando a mis kumis!', lose: '¡Ay! Me falta práctica...',
          after: 'Más arriba la hierba esconde kumis más fuertes.' },
      },
      {
        id: 'r2', spr: 'girl', x: 12, y: 10, dir: 'left',
        trainer: { name: 'MAR', cls: 'Chica', los: 3, party: [['larvita', 5], ['roedin', 5]], reward: 100,
          before: '¡Nuestras miradas se han cruzado! ¡Eso significa combate!', lose: '¡Qué fuerte eres!',
          after: 'Dicen que en el bosque hay un kumi de roca. Le vendría bien a cualquiera contra TORMES.' },
      },
    ],
  },

  /* ---------------- Bosque Murmullo ---------------- */
  forest: {
    name: 'BOSQUE MURMULLO',
    t: [
      'TTTTTTTTTT::TTTTTTTTTT',
      'TTTTTTTTTT::TTTTTTTTTT',
      'T,,,,T....::....T....T',
      'T,,,,T.TTTTTTTT.T.oo.T',
      'T,,,,..T,,,,,,T...o..T',
      'T.TTTT.T,,,,,,T.TT...T',
      'T....T.T,,..,,T.T,,,,T',
      'TTTT.T.TTT..TTT.T,,,,T',
      'T....T..........T,,,,T',
      'T.TTTTTTTT..TTTTT....T',
      'T.T,,,,,,T..T......TTT',
      'T.T,,,,,,T..T.TTTT...T',
      'T...,,,,.....,T~~T.T.T',
      'T.T,,,,,,T..T,T~~T.T.T',
      'T.TTTTTTTT..T,TTTT.T.T',
      'T...........T,,,,..T.T',
      'TTTTTT.TTT..TTTTTTTT.T',
      'T,,,,..T........o....T',
      'T,,,,T.T.TT..TTTTTTTTT',
      'T,,,,T...TT..T,,,,,,,T',
      'T....TTTTTT......,,,,T',
      'T.........:..T,,,,,,,T',
      'TTTTTTTTTT::TTTTTTTTTT',
      'TTTTTTTTTT::TTTTTTTTTT',
    ],
    warps: [
      { x: 10, y: 23, to: 'route', tx: 9, ty: 1 }, { x: 11, y: 23, to: 'route', tx: 10, ty: 1 },
      { x: 10, y: 0, to: 'city', tx: 10, ty: 20 }, { x: 11, y: 0, to: 'city', tx: 11, ty: 20 },
    ],
    items: [
      { id: 'f_sp1', x: 1, y: 2, item: 'superpocion', qty: 1 },
      { id: 'f_orb', x: 17, y: 17, item: 'orbe', qty: 3 },
      { id: 'f_pot', x: 13, y: 4, item: 'pocion', qty: 1 },
      { id: 'f_sp2', x: 18, y: 5, item: 'superpocion', qty: 1 },
    ],
    encRate: 0.14,
    enc: [
      { sp: 'larvita', min: 4, max: 6, w: 30 }, { sp: 'setin', min: 5, max: 7, w: 25 },
      { sp: 'plumelo', min: 5, max: 6, w: 15 }, { sp: 'chispo', min: 5, max: 7, w: 15 },
      { sp: 'pedrusco', min: 5, max: 7, w: 15 },
    ],
    npcs: [
      {
        id: 'f1', spr: 'bug', x: 12, y: 12, dir: 'left',
        trainer: { name: 'TEO', cls: 'Cazabichos', los: 4, party: [['larvita', 6], ['larvita', 7]], reward: 110,
          before: '¡Chsss! Estabas espantando a los bichos. ¡Pues ahora combates!', lose: '¡Mis larvitas!',
          after: 'Hay más de un camino para cruzar el bosque. Algunos esconden objetos.' },
      },
      {
        id: 'f2', spr: 'woman', x: 5, y: 4, dir: 'right',
        trainer: { name: 'SOL', cls: 'Exploradora', los: 2, party: [['setin', 7], ['plumelo', 8]], reward: 140,
          before: 'Conozco cada sendero de este bosque. ¡A ver qué tal conoces tú a tus kumis!', lose: 'Me has dejado sin palabras.',
          after: 'Ciudad Cobalto queda justo al norte. Cura a tu equipo en el Centro Kumi.' },
      },
    ],
  },

  /* ---------------- Ciudad Cobalto ---------------- */
  city: {
    name: 'CIUDAD COBALTO',
    t: [
      'TTTTTTTTTTTTTTTTTTTTTTTT',
      'T......................T',
      'T..GGGGGG.....~~~~~~...T',
      'T..GGGGGG.....~~~~~~...T',
      'T..GGGGGG.....~~~~~~...T',
      'T..wgDgww......*..*....T',
      'T....:.................T',
      'T.:::::::::::::::::::..T',
      'T.:..*....::......*.:..T',
      'T.:.HHHH..::..MMMM..:..T',
      'T.:.HHHH..::..MMMM..:..T',
      'T.:.hDWW..::..mDWW..:..T',
      'T.:..:....::...:....:..T',
      'T.::::::::::::::::::::::',
      'T....S....::....*......T',
      'T.RRRR....::...........T',
      'T.RRRR....::...........T',
      'T.WDWW....::...........T',
      'T..:......::...........T',
      'T..:::::::::...........T',
      'TTTTTTTTTT::TTTTTTTTTTTT',
      'TTTTTTTTTT::TTTTTTTTTTTT',
    ],
    warps: [
      { x: 10, y: 21, to: 'forest', tx: 10, ty: 1 }, { x: 11, y: 21, to: 'forest', tx: 11, ty: 1 },
      { x: 5, y: 5, to: 'gym', tx: 5, ty: 10 }, { x: 5, y: 11, to: 'center', tx: 5, ty: 5 },
      { x: 15, y: 11, to: 'shop', tx: 4, ty: 5 }, { x: 3, y: 17, to: 'house', tx: 4, ty: 5 },
      { x: 23, y: 13, to: 'route2', tx: 1, ty: 7 },
    ],
    onStep(x, y) {
      if (x === 22 && y === 13 && !S.flags.badge) {
        return async () => {
          await say('GUARDA: ¡Un momento! La Senda 2 lleva a la Gruta Eco y está llena de kumis fuertes.');
          await say('GUARDA: Solo dejo pasar a quien tenga la medalla del Gimnasio Cobalto.');
          await walkPlayer('left');
        };
      }
      return null;
    },
    signs: { '5,14': 'CIUDAD COBALTO\nLa ciudad del cielo despejado.' },
    items: [{ id: 'c_orb', x: 21, y: 1, item: 'orbe', qty: 2 }],
    npcs: [
      { id: 'c1', spr: 'boy', x: 8, y: 6, dir: 'left', text: ['El edificio morado es el gimnasio de TORMES.', 'Usa kumis eléctricos. Los de planta y los de roca aguantan bien sus descargas.'] },
      { id: 'c2', spr: 'woman', x: 13, y: 6, dir: 'right', wander: 2, text: ['El tejado verde es el Centro Kumi: curan gratis a tu equipo.', 'En el tejado amarillo venden orbes y pociones.'] },
      {
        id: 'guard', spr: 'guard', x: 22, y: 12, dir: 'down', still: true,
        async talk() {
          if (S.flags.badge) await say('GUARDA: ¡Ya tienes la medalla! Adelante, la Senda 2 está al este.');
          else await say('GUARDA: Sin la Medalla Chispa no puedo dejarte pasar hacia la Senda 2.');
        },
      },
      { id: 'c3', spr: 'girl', x: 17, y: 14, dir: 'down', wander: 2, text: ['Si capturas más de seis kumis, los demás van al almacén.', 'Puedes recogerlos en el terminal del Centro Kumi.'] },
    ],
  },

  center: {
    name: 'CENTRO KUMI', style: 'center',
    t: [
      '############',
      '#p________k#',
      '#__cccccc__#',
      '#__________#',
      '#__________#',
      '#t________t#',
      '#####E######',
    ],
    warps: [{ x: 5, y: 6, to: 'city', tx: 5, ty: 12 }],
    actions: { '10,1': () => storageTerminal() },
    npcs: [
      {
        id: 'nurse', spr: 'nurse', x: 5, y: 1, dir: 'down',
        async talk() {
          if (!S.party.length) { await say('¡Bienvenido al Centro Kumi! Vuelve cuando tengas un compañero.'); return; }
          if (await confirmYes('¡Bienvenido al Centro Kumi! ¿Quieres que cuidemos de tus kumis?')) {
            await healSequence();
            S.respawn = { map: 'center', x: 5, y: 3, dir: 'up' };
            await say('¡Tus kumis están en plena forma! Vuelve cuando quieras.');
          } else {
            await say('¡Hasta pronto!');
          }
        },
      },
      { id: 'ce1', spr: 'old', x: 2, y: 4, dir: 'right', text: ['El terminal de la esquina guarda los kumis que no caben en tu equipo.'] },
    ],
  },

  shop: {
    name: 'TIENDA', style: 'shop',
    t: [
      '##########',
      '#b______b#',
      '#_cc_____#',
      '#________#',
      '#_bb__bb_#',
      '#________#',
      '####E#####',
    ],
    warps: [{ x: 4, y: 6, to: 'city', tx: 15, ty: 12 }],
    npcs: [
      { id: 'clerk', spr: 'clerk', x: 2, y: 1, dir: 'down', talk: () => shopMenu() },
      { id: 's1', spr: 'boy', x: 7, y: 3, dir: 'left', text: ['Un orbe funciona mucho mejor cuando al kumi salvaje le queda poca vida.'] },
    ],
  },

  house: {
    name: 'CASA', style: 'home',
    t: [
      '##########',
      '#b______b#',
      '#__tt____#',
      '#________#',
      '#________#',
      '#p_______#',
      '####E#####',
    ],
    warps: [{ x: 4, y: 6, to: 'city', tx: 3, ty: 18 }],
    npcs: [
      {
        id: 'gift2', spr: 'old', x: 6, y: 3, dir: 'down',
        async talk() {
          if (!S.flags.gift2) {
            await say('De joven yo también reté a TORMES. Sus kumis son rapidísimos.');
            await say('Llévate esto. Te hará más falta que a mí.');
            await giveItem('superpocion', 1);
            S.flags.gift2 = true;
          } else {
            await say('Un kumi veloz ataca primero. Tenlo en cuenta en el gimnasio.');
          }
        },
      },
    ],
  },

  gym: {
    name: 'GIMNASIO COBALTO', style: 'gym',
    t: [
      '############',
      '#s________s#',
      '#__________#',
      '#__________#',
      '#ssss__ssss#',
      '#__________#',
      '#__________#',
      '#__________#',
      '#ssss__ssss#',
      '#__________#',
      '#__________#',
      '#####E######',
    ],
    warps: [{ x: 5, y: 11, to: 'city', tx: 5, ty: 6 }],
    npcs: [
      { id: 'guide', spr: 'clerk', x: 7, y: 10, dir: 'left', text: ['¡Hola, aspirante! TORMES es el líder de este gimnasio.', 'Sus kumis eléctricos fulminan a los de agua y a los de viento. ¡Elige bien tu equipo!'] },
      {
        id: 'g1', spr: 'boy', x: 3, y: 6, dir: 'right',
        trainer: { name: 'RAI', cls: 'Aprendiz', los: 7, party: [['chispo', 7], ['chispo', 8]], reward: 180,
          before: '¡Nadie llega hasta TORMES sin pasar por mí!', lose: '¡Me he quedado sin batería!',
          after: 'TORMES guarda a su FULGATO para el final. Es rapidísimo.' },
      },
      {
        id: 'leader', spr: 'leader', x: 5, y: 2, dir: 'down',
        async talk() {
          if (S.flags.badge) {
            await say('TORMES: Lleva esa medalla con orgullo. Te la has ganado.');
            return;
          }
          await say('TORMES: Soy TORMES, líder del Gimnasio Cobalto. Mis kumis golpean como el rayo.');
          await say('TORMES: ¡Demuéstrame que tu equipo aguanta la tormenta!');
          const r = await battle({ trainer: { name: 'TORMES', cls: 'Líder', spr: 'leader', party: [['chispo', 9], ['fulgato', 11]], reward: 600, lose: 'Una tormenta siempre acaba despejando... Has ganado.' } });
          if (r === 'win') {
            S.flags.badge = true; S.badges = 1;
            await say('TORMES: Has demostrado temple. ¡Recibe la Medalla Chispa!');
            await say('¡Has conseguido la MEDALLA CHISPA!');
            await endingScreen();
          } else {
            await blackout();
          }
        },
      },
    ],
  },
};

/* ---------------- Senda 2 (tras la medalla) ---------------- */
MAPS.route2 = {
  name: 'SENDA 2',
  t: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTYYYYYYYYT',
    'T.....,,,,,,.....T,,,,,..YYYYCYYYT',
    'T.....,,,,,,.....T,,,,,......:...T',
    'T..*..,,,,,,..S..T,,,,,......:.*.T',
    'Tvvvvvvv....vvvvvT......,,,,,:...T',
    'T.......:...........~~~~,,,,,:...T',
    'T..o....:...ffff....~~~~.....:...T',
    '::::::::::::::::::::====::::::...T',
    'T......,,,,,,.......~~~~.........T',
    'T......,,,,,,...*...~~~~..,,,,,..T',
    'T..S...,,,,,,.......~~~~..,,,,,..T',
    'T...........TTTT....~~~~..,,,,,..T',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  warps: [
    { x: 0, y: 7, to: 'city', tx: 22, ty: 13 },
    { x: 29, y: 1, to: 'cave', tx: 10, ty: 14 },
  ],
  signs: {
    '14,3': 'SENDA 2\nAl este: Gruta Eco.',
    '3,10': 'CONSEJO\nLos bordillos se saltan hacia abajo, pero no se pueden subir.',
  },
  items: [
    { id: 'r2_sp', x: 30, y: 2, item: 'superpocion', qty: 1 },
    { id: 'r2_orb', x: 1, y: 11, item: 'orbe', qty: 3 },
    { id: 'r2_pot', x: 1, y: 1, item: 'pocion', qty: 2 },
  ],
  encRate: 0.13,
  enc: [
    { sp: 'roedin', min: 10, max: 12, w: 25 }, { sp: 'plumelo', min: 10, max: 12, w: 25 },
    { sp: 'chispo', min: 11, max: 13, w: 20 }, { sp: 'setin', min: 11, max: 13, w: 15 },
    { sp: 'roedon', min: 12, max: 13, w: 8 }, { sp: 'plumazo', min: 13, max: 14, w: 7 },
  ],
  npcs: [
    { id: 'r2o', spr: 'old', x: 5, y: 8, dir: 'right', text: ['Cuando un kumi gana bastante experiencia, puede evolucionar.', 'Si no quieres que cambie, mantén X pulsado mientras evoluciona.'] },
    {
      id: 'r2a', spr: 'fisher', x: 24, y: 8, dir: 'up',
      trainer: { name: 'BRUNO', cls: 'Pescador', los: 2, party: [['plumelo', 12], ['plumazo', 13]], reward: 260,
        before: '¡Llevas un rato espantándome los peces! ¡Combate!', lose: 'Hoy no pican ni los combates...',
        after: 'Desde el puente se ve la Gruta Eco. Dicen que dentro hay un brillo extraño.' },
    },
    {
      id: 'r2b', spr: 'woman', x: 10, y: 9, dir: 'right',
      trainer: { name: 'NORA', cls: 'Exploradora', los: 4, party: [['setin', 12], ['chispo', 13]], reward: 280,
        before: '¡Esta hierba es mi zona de entrenamiento!', lose: 'Vale, vale. Tú ganas.',
        after: 'Los kumis de la gruta son de roca y electricidad. Lleva agua o planta.' },
    },
    {
      id: 'r2c', spr: 'boy', x: 26, y: 9, dir: 'left',
      trainer: { name: 'IKER', cls: 'Joven', los: 2, party: [['roedon', 13], ['polilux', 13]], reward: 260,
        before: '¡Mi kumi acaba de evolucionar! ¡Tengo que probarlo!', lose: '¡Evolucionar no lo es todo!',
        after: 'Mi Larvita se convirtió en Crisalín y luego en Polilux. ¡Qué rápido crecen!' },
    },
    {
      id: 'rival2', spr: 'rival', x: 29, y: 3, dir: 'down', hide: () => !!S.flags.tr_rival2,
      trainer: {
        name: 'DANA', cls: 'Rival', los: 3, reward: 800,
        party: () => [[SPECIES[S.flags.rivalSp || 'ascuino'].evo.to, 17], ['plumazo', 15], ['roedon', 15]],
        before: '¡Por fin llegas! Mis kumis han evolucionado. ¡Veamos cuánto has mejorado tú!',
        lose: '¡Increíble! Mis kumis han crecido, pero los tuyos todavía más.',
        afterWin: 'DANA: La gruta es toda tuya. Dicen que en el fondo duerme un kumi de cristal. ¡Suerte!',
        after: '¡Nos vemos!',
      },
    },
  ],
};

/* ---------------- Gruta Eco ---------------- */
MAPS.cave = {
  name: 'GRUTA ECO', dark: true,
  t: [
    'KKKKKKKKKKKKKKKKKKKK',
    'K------KKKK-------KK',
    'K-;;;--KKKK--;;;--KK',
    'K-;;;------------O-K',
    'K--O---KKKK-;;;----K',
    'KKKK---KKKK-;;;--KKK',
    'K------KKKKKKKKK---K',
    'K-;;;-----------;;-K',
    'K-;;;--KKK--O---;;-K',
    'K------KKK------KKKK',
    'KKK-KKKKKK-KKK-----K',
    'K---;;;--K-K---;;;-K',
    'K-O-;;;------O-;;;-K',
    'K--------K-K------KK',
    'KKKKKKKKKK-KKKKKKKKK',
    'KKKKKKKKKKXKKKKKKKKK',
  ],
  warps: [{ x: 10, y: 15, to: 'route2', tx: 29, ty: 2 }],
  items: [
    { id: 'cv_sp1', x: 1, y: 1, item: 'superpocion', qty: 1 },
    { id: 'cv_orb', x: 1, y: 13, item: 'orbe', qty: 4 },
    { id: 'cv_sp2', x: 18, y: 11, item: 'superpocion', qty: 1 },
  ],
  statics: [{ id: 'cristalio', sp: 'cristalio', lv: 20, x: 16, y: 1 }],
  encRate: 0.12,
  enc: [
    { sp: 'pedrusco', min: 12, max: 15, w: 35 }, { sp: 'chispo', min: 12, max: 14, w: 20 },
    { sp: 'setin', min: 12, max: 14, w: 20 }, { sp: 'crisalin', min: 11, max: 12, w: 10 },
    { sp: 'penasco', min: 15, max: 16, w: 8 }, { sp: 'voltisp', min: 15, max: 16, w: 7 },
  ],
  npcs: [
    {
      id: 'cv1', spr: 'hiker', x: 12, y: 7, dir: 'left',
      trainer: { name: 'ROQUE', cls: 'Montañero', los: 4, party: [['pedrusco', 14], ['penasco', 16]], reward: 400,
        before: '¡Esta gruta es mi casa! ¡A ver si aguantas como una roca!', lose: '¡Me has hecho polvo!',
        after: 'Al fondo, arriba a la derecha, se oye un eco que no es de este mundo.' },
    },
    {
      id: 'cv2', spr: 'woman', x: 5, y: 11, dir: 'down',
      trainer: { name: 'GEMA', cls: 'Exploradora', los: 2, party: [['chispo', 14], ['voltisp', 16]], reward: 420,
        before: '¡Mis kumis iluminan la gruta con sus chispas!', lose: '¡Me he quedado a oscuras!',
        after: 'En la oscuridad, los kumis salvajes se esconden en el musgo alto.' },
    },
  ],
};

const STARTERS = ['brotin', 'ascuino', 'gotiko'];

/* Comprobación de integridad de los mapas al cargar */
(function validateMaps() {
  for (const id in MAPS) {
    const m = MAPS[id], w = m.t[0].length;
    m.t.forEach((row, y) => { if (row.length !== w) console.error('Mapa ' + id + ': fila ' + y + ' con ancho ' + row.length + ' (esperado ' + w + ')'); });
    (m.warps || []).forEach(wp => {
      const dest = MAPS[wp.to];
      if (!dest) { console.error('Mapa ' + id + ': destino inexistente ' + wp.to); return; }
      const ch = (dest.t[wp.ty] || '')[wp.tx];
      if (!ch || !WALKABLE.includes(ch)) console.error('Mapa ' + id + ': llegada no transitable en ' + wp.to + ' ' + wp.tx + ',' + wp.ty);
      if (!WALKABLE.includes(m.t[wp.y][wp.x])) console.error('Mapa ' + id + ': portal sobre baldosa sólida ' + wp.x + ',' + wp.y);
    });
    (m.npcs || []).concat(m.items || [], m.statics || []).forEach(o => {
      if (!WALKABLE.includes(m.t[o.y][o.x])) console.error('Mapa ' + id + ': objeto ' + o.id + ' sobre baldosa sólida');
    });
  }
})();
