# Shark Escape

**You are a diver in a kelp forest full of sharks. Stay out of sight, come up for air, and last as long as you can.**

The whole game is made by code and fits in **one HTML file**: no game engine, no image or 3D model files.

![Kelp forest](.github/screenshots/kelp-forest.jpg)

## Play

**In a browser:** download [`index.html`](index.html) and open it in **Chrome** or **Edge** on a desktop computer. Wait a few seconds while the world is built, then press **Dive in**. It works offline. It needs a browser with WebGPU.

**As a Windows program:** double-click [`SharkEscape.exe`](SharkEscape.exe). No installing needed.

- The first start takes a few seconds while it unpacks itself.
- Windows may show a blue *"Windows protected your PC"* box because the program is not signed. Click **More info**, then **Run anyway**.
- `F11` (or `Alt` + `Enter`) switches fullscreen on and off. `Ctrl` + `Q` or closing the window quits.

## How to survive

- **Air** runs down while you are under water, and faster when you sprint. Swim up to the surface to refill it.
- **Sharks** patrol the whole world. One that sees you hunts you, and every bite costs a quarter of your health.
- **They only see what is in front of them**, and rock blocks their view. Get behind a wall, into a canyon, an arch or a tunnel.
- **They will not follow you into tight gaps.** When the status line says *Hidden*, they have to come very close to notice you.
- **Listen.** A heartbeat starts when a shark is near and races when one is hunting you.
- Your time is the score. The best time is remembered.

## Controls

| | Keyboard & mouse |
|---|---|
| Look around | Move the mouse |
| Swim | `W` `A` `S` `D` |
| Up / down | `E` / `Q` |
| Sprint (uses more air) | Hold `Shift` |
| Menu / pause | `Esc` |
| Sound on / off | `M` |
| Performance stats | `H` |
| Detail level | **Low**, **Medium** or **High** in the menu (reloads the page) |

On a touchscreen: hold one finger down to swim forward and slide it to steer; a second finger sprints. Touch support is experimental.

## Change it and rebuild

The readable source is in the [`source`](source) folder. You need [Node.js](https://nodejs.org) 18 or newer.

Rebuild `index.html`:

```bash
cd source
npm install
npm run build
```

`npm run build:readable` writes an unminified version. `npm run build:dev` writes `dev.html` with development tools (`F` fly-through, `B` benchmark, `1`–`6` viewpoints).

Rebuild `SharkEscape.exe` (after `index.html`):

```bash
cd source/desktop
npm install
npm run build
```

The new file is written to `source/desktop/dist/SharkEscape.exe`.

| File | What's inside |
|---|---|
| [`source/src/game.js`](source/src/game.js) | The game rules: air, health, how sharks see, hunt and bite, and the shark model. **A good place to start.** |
| [`source/src/world.js`](source/src/world.js) | The world layout: rock walls, arches, tunnels, kelp forests, fish, the ship and the whale tail |
| [`source/src/shaders.js`](source/src/shaders.js) | The look: water, fog, lighting, kelp, rocks, sharks (WGSL shader code) |
| [`source/src/main.js`](source/src/main.js) | The renderer, the camera, the controls and collisions with the rock |
| [`source/src/audio.js`](source/src/audio.js) | The soundscape and the sound effects |
| [`source/sounds`](source/sounds) | The recorded sound clips and their credits |
| [`source/src/quality.js`](source/src/quality.js) | The detail levels |
| [`source/template.html`](source/template.html) | The page: menu, gauges and their styles |
| [`source/desktop`](source/desktop) | The Windows program: a small Electron window around `index.html` |
| [`web-ocean`](web-ocean) | The sea-surface renderer used above the water (a copy of the web-ocean project) |

## Credits and license

[MIT](LICENSE). The underwater world and the sea surface are built on two MIT-licensed projects by Maksymilian Dendura; the `LICENSE` files must stay with every copy. Sound clips are CC0, listed in [`source/sounds/CREDITS.md`](source/sounds/CREDITS.md).
