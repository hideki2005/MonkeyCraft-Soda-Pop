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

### Sistemas incluidos

- Movimiento por cuadrícula con colisiones, transiciones entre mapas y entrada a edificios.
- Encuentros aleatorios solo en hierba alta; entrenadores con línea de visión que recuerdan su derrota; objetos que se recogen una sola vez.
- Combate: menú Luchar / Mochila / Equipo / Huir, hasta cuatro movimientos con potencia, precisión y PP, orden por velocidad y prioridad, tabla de ocho tipos, golpes críticos, cambios de ataque y defensa, IA rival, experiencia, subida de nivel y aprendizaje de movimientos (con elección de cuál olvidar).
- Captura con orbes (más probable cuanta menos vida tenga el kumi), equipo de seis y almacén automático para el resto.
- Tienda, dinero, pociones dentro y fuera de combate.
- Si todo el equipo se debilita, vuelves al último lugar donde te curaron.
- Guardado en `localStorage`, con Continuar / Nueva partida y confirmación antes de sobrescribir.

### Estructura

| Archivo | Contenido |
| --- | --- |
| `js/data.js` | Tipos, movimientos, especies, objetos y fórmulas de estadísticas |
| `js/engine.js` | Entrada, fuente bitmap, cuadros de texto, menús y animaciones |
| `js/sprites.js` | Pixel art por código: baldosas, personajes y criaturas |
| `js/maps.js` | Mapas, personajes, entrenadores y eventos |
| `js/battle.js` | Combate, IA, captura y experiencia |
| `js/game.js` | Mundo, menús, tienda, almacén, guardado y bucle principal |

### Limitaciones conocidas

- No hay sonido ni música.
- Las criaturas no evolucionan y no existen estados alterados (veneno, sueño, etc.).
- Solo gana experiencia el kumi que está en combate cuando cae el rival.
- El nombre del protagonista es fijo y no se pueden poner motes.
- En la tienda se compra de unidad en unidad.
- Hay una única ranura de guardado y el guardado es manual (menú → GUARDAR).
- Diez especies y un solo gimnasio: es una aventura corta, de unos 20-30 minutos.
