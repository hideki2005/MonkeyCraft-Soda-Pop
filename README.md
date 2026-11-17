# MonkeyCraft-Soda-Pop

## Kumi: Senda Cobalto

RPG 2D original de captura de criaturas, con vista cenital, pixel art generado por código y combates por turnos. Está hecho con HTML, CSS y JavaScript sobre Canvas, sin backend, sin dependencias y sin recursos externos (no necesita ninguna ROM).

El género y las mecánicas son los de los RPG clásicos de consola portátil, pero el mundo, las criaturas («kumis»), los nombres y el arte son propios.

### Cómo ejecutarlo

Abre `index.html` en un navegador moderno. También puedes servir la carpeta:

```bash
python3 -m http.server 8000
```

y entrar en `http://localhost:8000`.

### Controles

| Acción | Teclado | Táctil |
| --- | --- | --- |
| Moverse | Flechas o WASD | Cruceta |
| Confirmar / hablar | Z o Enter | A |
| Volver / correr (mantener) | X o Escape | B |
| Menú (equipo, mochila, ficha, guardar) | M | MENÚ |

### La aventura

1. **Villa Alba**: tu casa, el laboratorio de la profesora Ceiba y la elección entre Brotín (planta), Ascuino (fuego) y Gotiko (agua). Tu rival, Dana, te reta nada más elegir.
2. **Senda 1**: hierba alta con kumis salvajes, dos entrenadores y objetos.
3. **Bosque Murmullo**: caminos alternativos, cuatro objetos, dos entrenadores y especies nuevas.
4. **Ciudad Cobalto**: Centro Kumi (cura y almacén), tienda y gimnasio del líder Tormes. Al ganar la Medalla Chispa aparece la pantalla final y se puede seguir explorando.
5. **Senda 2** (se abre con la medalla): puente sobre el río, bordillos que solo se saltan hacia abajo, tres entrenadores y la revancha contra Dana, que ya tiene a su kumi evolucionado.
6. **Gruta Eco**: cueva a oscuras en la que solo ves alrededor de tu personaje, con musgo alto, dos entrenadores, objetos y un kumi especial, Cristalio, al fondo. Si lo debilitas, desaparece; si huyes, te sigue esperando.

### Sistemas incluidos

- Movimiento por cuadrícula con colisiones, transiciones entre mapas y entrada a edificios.
- Encuentros aleatorios solo en hierba alta; entrenadores con línea de visión que recuerdan su derrota; objetos que se recogen una sola vez.
- Evoluciones: nueve líneas evolutivas con diez evoluciones en total (Larvita evoluciona dos veces: Larvita → Crisalín → Polilux). Tras el combate aparece una escena animada; mantén X pulsado para detenerla, y el kumi volverá a intentarlo en su siguiente subida de nivel.
- Combate: menú Luchar / Mochila / Equipo / Huir, hasta cuatro movimientos con potencia, precisión y PP, orden por velocidad y prioridad, tabla de ocho tipos, golpes críticos, cambios de ataque y defensa, IA rival, experiencia, subida de nivel y aprendizaje de movimientos (con elección de cuál olvidar).
- Captura con orbes (más probable cuanta menos vida tenga el kumi), equipo de seis y almacén automático para el resto.
- Tienda, dinero, pociones dentro y fuera de combate.
- Si todo el equipo se debilita, vuelves al último lugar donde te curaron.
- Guardado en `localStorage`, con Continuar / Nueva partida y confirmación antes de sobrescribir.
- Animaciones: transición de franjas al empezar el combate, plataformas que entran deslizándose, entrenadores que se apartan, kumis que salen del orbe con destello, efectos de partículas distintos para cada tipo, sacudida de pantalla en golpes muy eficaces o críticos, barra de experiencia animada, flechas al subir o bajar estadísticas, orbe que se abre y tiembla, hierba que se agita al pisarla, saltos con sombra, NPC que miran a su alrededor o pasean, cartel de zona deslizante y título animado.

### Estructura

| Archivo | Contenido |
| --- | --- |
| `js/data.js` | Tipos, movimientos, especies, objetos y fórmulas de estadísticas |
| `js/engine.js` | Entrada, fuente bitmap, cuadros de texto, menús y animaciones |
| `js/sprites.js` | Pixel art por código: baldosas, personajes y criaturas |
| `js/maps.js` | Mapas, personajes, entrenadores y eventos |
| `js/battle.js` | Combate, efectos visuales, IA, captura, experiencia y evolución |
| `js/game.js` | Mundo, menús, tienda, almacén, guardado y bucle principal |

### Limitaciones conocidas

- No hay sonido ni música.
- Las evoluciones son solo por nivel (no hay objetos evolutivos ni intercambios) y no existen estados alterados (veneno, sueño, etc.).
- Solo gana experiencia el kumi que está en combate cuando cae el rival.
- El nombre del protagonista es fijo y no se pueden poner motes.
- En la tienda se compra de unidad en unidad.
- Hay una única ranura de guardado y el guardado es manual (menú → GUARDAR).
- Veintiuna especies y un solo gimnasio: la historia principal dura unos 20-30 minutos y la zona posterior a la medalla, otros 20-30.
- Si llegas a la Gruta Eco con un equipo débil, Cristalio (nivel 20) puede derrotarte; conviene llevar kumis de agua o planta.
