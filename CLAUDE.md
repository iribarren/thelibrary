# The Library — Frontend

## Project Context
Frontend SPA for "The Library" (La Biblioteca), a solo TTRPG journal game. Part of the `biblioteca` workspace. Backend API is in `../oracles-api/`.

## Tech Stack
- **Vue 3** (Composition API, `<script setup>`)
- **Vite** — build tool and dev server
- **Pinia** — state management
- **Vue Router 4** — hash-based routing
- **vue-i18n** — i18n with Spanish/English JSON files
- CSS with custom properties (design tokens in `theme.css`, no preprocessor)
- Nginx serving the compiled `dist/` (Docker production)

## Setup (per machine)
```bash
cd thelibrary/
npm install
```

## Development
Started automatically by `docker compose up -d` (Vite dev server on port 5173, mapped to 3000).

Manual dev server:
```bash
npm run dev
```

## Build & Test
```bash
npm run build    # compile to dist/
npm run test     # Vitest unit tests
```

## File Structure
```
src/
├── main.js                    — App bootstrap (Vue, Pinia, Router, i18n, CSS)
├── App.vue                    — Root component (init logic + <router-view>)
├── router/index.js            — Routes per game mode
├── stores/
│   ├── game.js                — Game state (Pinia), port of state.js
│   └── auth.js                — Auth state (Pinia)
├── api/index.js               — Fetch client for Symfony backend
├── animators/
│   ├── book-animator.js       — 3D CSS book reveal animation
│   └── dice-animator.js       — Dice roll animation
├── i18n/index.js              — vue-i18n setup, setLocale()
├── composables/
│   └── useNavigation.js       — navigateToPhase(phase) → router.push
├── assets/
│   ├── css/                   — theme, layout, components, book, dice, print
│   └── i18n/                  — es.json, en.json
├── components/                — Reusable across game modes
│   ├── BookReveal.vue          — Wraps book-animator.js
│   ├── DiceRoll.vue            — Wraps dice-animator.js (reactive: watches result prop)
│   ├── JournalEntry.vue        — Textarea + save button
│   ├── AttributeSelector.vue   — Attribute buttons (chapter + epilogue with support)
│   ├── PhaseStepper.vue        — Sidebar phase progress indicator
│   ├── Modal.vue               — Generic modal (Teleport)
│   └── MessageBar.vue          — Auto-dismissing error/info bar
├── layout/
│   ├── AppLayout.vue           — Sidebar + main content grid
│   └── AppSidebar.vue          — Sidebar: character, attributes, steps, journal panel, exit
├── features/auth/
│   └── AuthSection.vue         — Auth bar + Login/Register/MySessions modals
└── views/
    ├── StartView.vue
    └── aventura-rapida/
        ├── PrologueView.vue
        ├── ChapterView.vue
        ├── EpilogueView.vue    — 3 sub-states: book-discovery | action | final
        └── CompletedView.vue
```

## Routing
Hash-based (`createWebHashHistory`). Phase → route mapping:
- `prologue` → `/aventura-rapida/prologue`
- `chapter_*` → `/aventura-rapida/chapter`
- `epilogue_*` → `/aventura-rapida/epilogue`
- `completed` → `/aventura-rapida/completed`

Use `useNavigation().navigateToPhase(phase)` to navigate after API responses.

## Key Conventions
- All code (variables, functions, comments) MUST be in English
- Game-specific translations use the i18n keys: `attributes.body`, `phases.chapter_1`, etc.
- The frontend NEVER stores persistent data — all game state flows through the backend API
- Game state cached in localStorage for session recovery (`biblioteca_game_id`, `biblioteca_game_state`)
- Access token in memory only; refresh token in localStorage (`biblioteca_refresh_token`)

## CSS Architecture
Design tokens flow: `theme.css` → `layout.css` → `components.css` → feature CSS.
Use CSS custom properties (--var) defined in `theme.css` for all colors, spacing, typography.

## API Communication
All API calls go through `src/api/index.js`. Backend base URL is hardcoded to `http://localhost:8080`.
The backend provides oracle tables, game sessions, dice rolling, and journal persistence.
