# Jorge Tovar — Portfolio

Portafolio personal de Jorge Luis Tovar Arriaga, desarrollador fullstack con pasión por el diseño UX/UI.

**Sitio:** [jorgi1-1.github.io](https://jorgi1-1.github.io)

## Contenido

- **Inicio** — hero tipográfico con un shader WebGPU enmascarado en las letras y un tótem de colores como navegación principal. Cada franja abre su sección en el mismo lugar.
- **Interfaces** (`/interfaces`) — recreaciones pixel a pixel de interfaces reales: Aura, Axion, Codenest, Cropwise, Payius, Tiny Trails, Vanguard y Velaro.
- **Galería** (`/galeria`) — componentes sueltos: cards, navegación, tooltips, efectos de parallax.

## Stack

Next.js 16 (App Router, export estático) · React 19 · TypeScript · Tailwind CSS v4 · GSAP · Motion · Lenis · shadcn/ui · WebGL/WebGPU

## Desarrollo

Requiere Node.js 24 (ver `.nvmrc`).

```bash
npm install
npm run dev
```

| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en `http://localhost:3000` |
| `npm run build` | Export estático en `out/` |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificación de tipos con TypeScript |

Para probar desde otro dispositivo de la red local, agrega su IP en `.env.local`:

```bash
ALLOWED_DEV_ORIGINS=192.168.1.20
```

> **Webpack, no Turbopack.** `dev` y `build` usan `--webpack` a propósito. Turbopack falla cuando la ruta absoluta del proyecto contiene caracteres no ASCII (por ejemplo `Programación`), porque corta los nombres de chunk a mitad de un carácter UTF-8.

## Estructura

```
src/
├── app/                 Rutas (inicio, /interfaces/*, /galeria)
├── components/
│   ├── home/            Hero, tótem de navegación y secciones del inicio
│   ├── interfaces/      Una carpeta por interfaz recreada
│   ├── gallery/         Registro y demos de la galería
│   └── ui/              Componentes compartidos
└── lib/                 Utilidades
```

## Despliegue

Cada push a `main` ejecuta lint, verificación de tipos y el build, y publica `out/` en GitHub Pages ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)). El `basePath` se toma de la configuración de Pages, así que el sitio funciona tanto en un dominio de usuario como en uno de proyecto.

## Contacto

[LinkedIn](https://www.linkedin.com/in/jorge-luis-tovar-arriaga-a20489293) · [Kanso Studio](https://www.kansostudio.com.mx)
