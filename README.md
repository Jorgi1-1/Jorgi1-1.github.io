# Jorge Tovar · Portfolio

The personal site of Jorge Luis Tovar Arriaga, a fullstack developer and UX/UI designer based in Puebla, Mexico.

**Live:** [jorgi1-1.github.io](https://jorgi1-1.github.io)

## What it is

One page, built around type.

- **Hero.** The name and the two roles fill the screen as a justified block. Once the WebGPU shader is running, the letters become windows onto it; without WebGPU, a CSS stand-in takes its place.
- **Totem.** A bar of four colors is the navigation. Each stripe opens its section in place: Work, About, Stack and Contact. A keyboard-operable nav sits behind it.
- **Qull.** A small ink-drop character that lives in the hero and in every section. It follows the pointer, reacts to what's on screen, and in Stack it plays with the pills, which are a small physics simulation.
- **Footer.** The hero doesn't scroll, so scrolling there drops the totem's colors onto a card with the ways to get in touch.

Both themes are designed, not derived, and every animation has a reduced-motion path.

## Stack

Next.js 16 (App Router, static export) · React 19 · TypeScript · Tailwind CSS v4 · GSAP · matter-js · [shaders](https://shaders.com) (WebGPU) · WebGL

## Development

Requires Node.js 24 (see `.nvmrc`).

```bash
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server at `http://localhost:3000` |
| `npm run build` | Static export to `out/` |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |

To open the dev server from another device on the network, list its address in `.env.local`:

```bash
ALLOWED_DEV_ORIGINS=192.168.1.20
```

`dev` and `build` pass `--webpack` on purpose. Turbopack cuts chunk names at a fixed byte offset, and when the project's absolute path contains a non-ASCII character (mine does) that offset can land in the middle of it and crash the build.

## Structure

```
src/
├── app/                 Layout, metadata, the home page, 404 and error pages
├── components/
│   ├── home/            Hero, totem, footer, hints and the four sections
│   ├── qull/            The character: its motion, and how it behaves on each screen
│   └── ui/              Standalone effects (fluid cursor, click sparks, ASCII title, text animations)
└── lib/                 Fonts, site constants, browser checks
```

## Deployment

Every push to `main` runs lint, the type check and the build, then publishes `out/` to GitHub Pages ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).

## Credits

Some effects started from open-source components and were adapted to this site:

- [React Bits](https://reactbits.dev): the fluid cursor, click sparks, split-text and typing effects, and the pieces behind the ASCII title.
- [Fancy Components](https://www.fancycomponents.dev): the feel of the pills' gravity.
- [shaders](https://shaders.com): the shader layers behind the headline.

## Contact

[LinkedIn](https://www.linkedin.com/in/jorge-luis-tovar-arriaga-a20489293) · [jorgi1tovar@gmail.com](mailto:jorgi1tovar@gmail.com) · [Kanso Studio](https://www.kansostudio.com.mx)
