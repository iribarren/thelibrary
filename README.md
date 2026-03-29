# The Library

Frontend for "The Library" — a solo tabletop RPG journal game. Vanilla JavaScript single-page application served by Nginx.

## Tech Stack

- **Vanilla JS** (ES6 modules) — no framework, no build tools, no bundler
- **CSS** custom properties design system
- **Nginx** (Docker) for static file serving

## Architecture

| Path | Description |
|------|-------------|
| `public/index.html` | SPA entry point |
| `public/js/app.js` | Main game controller |
| `public/js/api.js` | REST API client (communicates with oracles-api backend) |
| `public/js/state.js` | Client-side state management + localStorage persistence |
| `public/js/book-animator.js` | 3D book reveal animation |
| `public/js/dice-animator.js` | Dice roll visualization |
| `public/css/theme.css` | Design tokens: colors, fonts, spacing |
| `public/css/layout.css` | Sidebar + main content grid |
| `public/css/components.css` | Buttons, modals, forms, cards |
| `public/css/book.css` | Book 3D transforms and animations |
| `public/css/dice.css` | Dice visualization styles |
| `public/css/print.css` | Print-ready journal export styles |

## Development

Served at `http://localhost:3000` via Docker. Files in `public/` are volume-mounted for live editing — changes are reflected immediately without rebuilding the container.

## Dependency

Requires the `oracles-api` backend running at `http://localhost:8080`.

## Note

Part of the `biblioteca` workspace. Run `docker compose up -d` from the parent directory to start all services.
