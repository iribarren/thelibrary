# The Library

Frontend for "The Library" — a solo tabletop RPG journal game. Vue 3 SPA served by Vite dev server (dev) or Nginx (production).

## Tech Stack

- **Vue 3** (Composition API, `<script setup>`)
- **Vite** — build tool and dev server
- **Pinia** — state management
- **Vue Router 4** — hash-based routing
- **vue-i18n** — Spanish / English localisation
- **CSS** custom properties design system (no preprocessor)

## Architecture

| Path | Description |
|------|-------------|
| `src/main.js` | App bootstrap (Vue, Pinia, Router, i18n, CSS) |
| `src/App.vue` | Root component with `<router-view>` |
| `src/router/index.js` | Hash-based routes per game phase |
| `src/stores/game.js` | Game state (Pinia) |
| `src/stores/auth.js` | Auth state (Pinia) |
| `src/api/index.js` | Fetch API client for the Symfony backend |
| `src/animators/` | 3D book reveal + dice roll animations |
| `src/components/` | Reusable Vue components |
| `src/views/` | Page-level views per game phase |
| `src/assets/css/` | theme, layout, components, book, dice, print, themes |
| `src/i18n/index.js` | vue-i18n setup + locale switching |
| `public/_headers` | Cloudflare Pages security headers (CSP, HSTS) |

> The `public/` directory also contains legacy vanilla JS files from a prior architecture. They are **not used** by the active build — the active source is entirely under `src/`.

## Development

Started automatically by `docker compose up -d` from the workspace root (Vite dev server on port 5173, mapped to 3000). Changes to `src/` files are reflected via HMR immediately.

```bash
# Manual dev server (outside Docker)
cd thelibrary/
npm install
npm run dev
```

## Build

```bash
npm run build    # compile to dist/
npm run test     # Vitest unit tests
```

## Dependency

Requires the `oracles-api` backend running at `http://localhost:8080`.

## Note

Part of the `biblioteca` workspace. Run `docker compose up -d` from the parent directory to start all services.
