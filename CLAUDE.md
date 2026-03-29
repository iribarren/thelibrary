# The Library — Frontend

## Project Context
Frontend SPA for "The Library" (La Biblioteca), a solo TTRPG journal game. Part of the `biblioteca` workspace. Backend API is in `../oracles-api/`.

## Tech Stack
- Vanilla JavaScript (ES6 modules) — no framework, no build tools, no package manager
- CSS with custom properties (design tokens in `theme.css`)
- Nginx serving static files (Docker)

## File Structure
- `public/index.html` — Single HTML entry point, all screens rendered via JS
- `public/js/app.js` — Main controller (~2000 lines): screen rendering, game flow, event handlers
- `public/js/api.js` — Fetch wrapper for all backend API calls. `BASE_URL` configured here.
- `public/js/state.js` — In-memory state + localStorage persistence, subscriber pattern
- `public/js/book-animator.js` — 3D CSS book reveal animation
- `public/js/dice-animator.js` — Dice roll animation with SVG
- `public/css/theme.css` — Design tokens: colors, fonts (Cinzel, Lora), spacing
- `public/css/layout.css` — Sidebar + main content grid
- `public/css/components.css` — Buttons, modals, forms, cards
- `public/css/book.css` — Book 3D transforms and animations
- `public/css/dice.css` — Dice visualization styles
- `public/css/print.css` — Print-ready journal export styles

## Key Conventions
- All code (variables, functions, comments) MUST be in English
- No external dependencies — everything is vanilla JS/CSS
- The frontend NEVER stores persistent data — all data flows through the backend API
- Game state cached in localStorage for session recovery only
- ES6 module imports (no bundler)

## CSS Architecture
Design tokens flow: `theme.css` -> `layout.css` -> `components.css` -> feature CSS
Use CSS custom properties (--var) defined in theme.css for all colors, spacing, and typography.

## API Communication
All API calls go through `api.js`. Backend base URL is configured there.
The backend provides oracle tables, game sessions, dice rolling, and journal persistence.
