/**
 * debug.js — La Biblioteca
 * Developer debug mode: navigate all 11 game screens with mock data.
 * Loaded ONLY on localhost via dynamic import() in app.js.
 * Never fetched in production.
 */

import * as State from './state.js';
import {
  renderStartScreen,
  renderPrologueScreen,
  renderChapterScreen,
  renderEpilogueScreen,
  renderCompletedScreen,
  showScreen,
} from './app.js';

// ============================================================
// Mock data
// ============================================================

const MOCK_ORACLE_TABLES = {
  genre: [
    { value: 'Gothic mystery',    hint: 'Dark secrets in shadowed halls' },
    { value: 'Historical drama',  hint: 'Lives shaped by the weight of history' },
    { value: 'Supernatural',      hint: 'Forces beyond the natural world' },
  ],
  epoch: [
    { value: 'Victorian era',     hint: 'Industry, empire, and repressed desires' },
    { value: 'Medieval period',   hint: 'Faith, plague, and feudal power' },
    { value: 'Interwar years',    hint: 'The uneasy peace between two catastrophes' },
  ],
};

const MOCK_BOOK_CHAPTER = {
  id:           'debug-book-chapter-1',
  phase:        'chapter_1',
  color:        'crimson',
  color_hint:   'The red of old wounds',
  binding:      'leather',
  binding_hint: 'Cracked along the spine',
  smell:        'rain and iron',
  smell_hint:   'Old pipes, cold metal',
  interior:     'Handwritten marginalia in three different hands',
};

const MOCK_BOOK_EPILOGUE = {
  id:           'debug-book-epilogue',
  phase:        'epilogue_action_1',
  color:        'indigo',
  color_hint:   'Deep as the night sky',
  binding:      'cloth',
  binding_hint: 'Worn smooth at the corners',
  smell:        'lavender and dust',
  smell_hint:   'A forgotten drawer',
  interior:     'Blank pages, waiting to be written',
};

const MOCK_ROLL_RESULTS = [
  { phase: 'chapter_1',         attribute_type: 'body',   outcome: 'hit',      action_die: 5, action_score: 8, challenge_die_1: 4, challenge_die_2: 6, modifier: 0 },
  { phase: 'chapter_2',         attribute_type: 'mind',   outcome: 'weak_hit', action_die: 3, action_score: 6, challenge_die_1: 2, challenge_die_2: 7, modifier: 0 },
  { phase: 'chapter_3',         attribute_type: 'social', outcome: 'miss',     action_die: 1, action_score: 2, challenge_die_1: 5, challenge_die_2: 8, modifier: 0 },
  { phase: 'epilogue_action_1', attribute_type: 'mind',   outcome: 'hit',      action_die: 6, action_score: 9, challenge_die_1: 3, challenge_die_2: 5, modifier: 0 },
  { phase: 'epilogue_action_2', attribute_type: 'body',   outcome: 'weak_hit', action_die: 4, action_score: 5, challenge_die_1: 4, challenge_die_2: 9, modifier: 0 },
  { phase: 'epilogue_action_3', attribute_type: 'social', outcome: 'miss',     action_die: 2, action_score: 3, challenge_die_1: 6, challenge_die_2: 7, modifier: 0 },
  { phase: 'epilogue_final',    attribute_type: null,     outcome: 'hit',      action_die: null, action_score: 7, challenge_die_1: 3, challenge_die_2: 5, modifier: 0 },
];

const MOCK_JOURNAL_ENTRIES = [
  { id: 'dbj-1', phase: 'prologue',          book_id: null,                    content: 'I arrived at the library as the candles were guttering out. The smell of old paper settled over me like a second skin.',   created_at: '2026-01-01T10:00:00Z' },
  { id: 'dbj-2', phase: 'chapter_1',         book_id: 'debug-book-chapter-1',  content: 'The crimson volume fell open at a page I did not choose. Something within its margins called to a memory I had buried.',     created_at: '2026-01-01T11:00:00Z' },
  { id: 'dbj-3', phase: 'chapter_2',         book_id: null,                    content: 'A second memory surfaced, cold and unbidden, while the rain tapped against the high windows.',                               created_at: '2026-01-01T12:00:00Z' },
  { id: 'dbj-4', phase: 'chapter_3',         book_id: null,                    content: 'The third book smelled of rain and iron. I could not finish it. Some truths resist being read.',                            created_at: '2026-01-01T13:00:00Z' },
  { id: 'dbj-5', phase: 'epilogue_action_1', book_id: 'debug-book-epilogue',   content: 'In the epilogue I faced the indigo volume and did not flinch. The library waited, patient as stone.',                       created_at: '2026-01-01T14:00:00Z' },
];

const MOCK_GAME_BASE = {
  id:                    'debug-00000000-0000-0000-0000-000000000000',
  character_name:        'Elara Voss',
  character_description: 'A former archivist haunted by the books she left unread.',
  genre:                 'Gothic mystery',
  epoch:                 'Victorian era',
  support_used:          false,
  overcome_score:        7,
  attributes: [
    { type: 'body',   base_value: 2, background: 1, support: 1 },
    { type: 'mind',   base_value: 3, background: 2, support: 0 },
    { type: 'social', base_value: 1, background: 1, support: 2 },
  ],
  books:           [MOCK_BOOK_CHAPTER, MOCK_BOOK_EPILOGUE],
  roll_results:    MOCK_ROLL_RESULTS,
  journal_entries: MOCK_JOURNAL_ENTRIES,
};

// ============================================================
// Debug screen list
// ============================================================

const DEBUG_SCREENS = [
  {
    label: 'Start',
    prepare() {
      State.setDebugMode(true);
    },
    render() {
      renderStartScreen();
    },
  },
  {
    label: 'Prologue',
    prepare() {
      State.setOracleTables(MOCK_ORACLE_TABLES);
      State.setGame({ ...MOCK_GAME_BASE, current_phase: 'prologue' });
    },
    render() {
      showScreen('screen-prologue');
      renderPrologueScreen();
    },
  },
  {
    label: 'Chapter I',
    prepare() {
      State.setGame({
        ...MOCK_GAME_BASE,
        current_phase: 'chapter_1',
        books:        [],
        roll_results: [],
      });
    },
    render() {
      showScreen('screen-chapter');
      renderChapterScreen('chapter_1');
    },
  },
  {
    label: 'Chapter II',
    prepare() {
      State.setGame({
        ...MOCK_GAME_BASE,
        current_phase: 'chapter_2',
        books:        [MOCK_BOOK_CHAPTER],
        roll_results: MOCK_ROLL_RESULTS.slice(0, 1),
      });
    },
    render() {
      showScreen('screen-chapter');
      renderChapterScreen('chapter_2');
    },
  },
  {
    label: 'Chapter III',
    prepare() {
      State.setGame({
        ...MOCK_GAME_BASE,
        current_phase: 'chapter_3',
        books:        [MOCK_BOOK_CHAPTER],
        roll_results: MOCK_ROLL_RESULTS.slice(0, 2),
      });
    },
    render() {
      showScreen('screen-chapter');
      renderChapterScreen('chapter_3');
    },
  },
  {
    label: 'Epilogue — Book Reveal',
    prepare() {
      // phase = epilogue_action_1 + NO epilogue book → triggers renderEpilogueBookScreen
      State.setGame({
        ...MOCK_GAME_BASE,
        current_phase: 'epilogue_action_1',
        books:        [MOCK_BOOK_CHAPTER],
        roll_results: MOCK_ROLL_RESULTS.slice(0, 3),
        overcome_score: 0,
      });
    },
    render() {
      showScreen('screen-epilogue');
      renderEpilogueScreen('epilogue_action_1');
    },
  },
  {
    label: 'Epilogue — Action 1',
    prepare() {
      // phase = epilogue_action_1 + WITH epilogue book → triggers renderEpilogueActionScreen(1)
      State.setGame({
        ...MOCK_GAME_BASE,
        current_phase: 'epilogue_action_1',
        books:        [MOCK_BOOK_CHAPTER, MOCK_BOOK_EPILOGUE],
        roll_results: MOCK_ROLL_RESULTS.slice(0, 3),
        overcome_score: 0,
      });
    },
    render() {
      showScreen('screen-epilogue');
      renderEpilogueScreen('epilogue_action_1');
    },
  },
  {
    label: 'Epilogue — Action 2',
    prepare() {
      State.setGame({
        ...MOCK_GAME_BASE,
        current_phase: 'epilogue_action_2',
        books:        [MOCK_BOOK_CHAPTER, MOCK_BOOK_EPILOGUE],
        roll_results: MOCK_ROLL_RESULTS.slice(0, 4),
        overcome_score: 3,
      });
    },
    render() {
      showScreen('screen-epilogue');
      renderEpilogueScreen('epilogue_action_2');
    },
  },
  {
    label: 'Epilogue — Action 3',
    prepare() {
      State.setGame({
        ...MOCK_GAME_BASE,
        current_phase: 'epilogue_action_3',
        books:        [MOCK_BOOK_CHAPTER, MOCK_BOOK_EPILOGUE],
        roll_results: MOCK_ROLL_RESULTS.slice(0, 5),
        overcome_score: 5,
      });
    },
    render() {
      showScreen('screen-epilogue');
      renderEpilogueScreen('epilogue_action_3');
    },
  },
  {
    label: 'Epilogue — Final Roll',
    prepare() {
      State.setGame({
        ...MOCK_GAME_BASE,
        current_phase: 'epilogue_final',
        books:        [MOCK_BOOK_CHAPTER, MOCK_BOOK_EPILOGUE],
        roll_results: MOCK_ROLL_RESULTS.slice(0, 6),
        overcome_score: 7,
      });
    },
    render() {
      showScreen('screen-epilogue');
      renderEpilogueScreen('epilogue_final');
    },
  },
  {
    label: 'Completed',
    prepare() {
      State.setGame({
        ...MOCK_GAME_BASE,
        current_phase: 'completed',
        roll_results:  MOCK_ROLL_RESULTS,
      });
    },
    render() {
      showScreen('screen-completed');
      renderCompletedScreen();
    },
  },
];

// ============================================================
// Navigation state
// ============================================================

let _currentIndex = 0;

// ============================================================
// Nav bar
// ============================================================

function _createNavBar() {
  const bar = document.createElement('div');
  bar.id = 'debug-nav-bar';
  bar.innerHTML = `
    <button id="debug-btn-prev" class="debug-btn" aria-label="Previous screen">\u2190 Prev</button>
    <span id="debug-nav-info" class="debug-nav-info"></span>
    <button id="debug-btn-next" class="debug-btn" aria-label="Next screen">Next \u2192</button>
    <button id="debug-btn-exit" class="debug-btn debug-btn-exit" aria-label="Exit debug mode">Exit Debug</button>
  `;
  document.body.appendChild(bar);
  document.getElementById('debug-btn-prev').addEventListener('click', _goToPrev);
  document.getElementById('debug-btn-next').addEventListener('click', _goToNext);
  document.getElementById('debug-btn-exit').addEventListener('click', _exitDebugMode);
}

function _updateNavBar() {
  const info    = document.getElementById('debug-nav-info');
  const prevBtn = document.getElementById('debug-btn-prev');
  const nextBtn = document.getElementById('debug-btn-next');
  if (!info) return;
  const screen = DEBUG_SCREENS[_currentIndex];
  info.textContent = `${screen.label}  (${_currentIndex + 1} / ${DEBUG_SCREENS.length})`;
  prevBtn.disabled = _currentIndex === 0;
  nextBtn.disabled = _currentIndex === DEBUG_SCREENS.length - 1;
}

function _goToScreen(index) {
  _currentIndex = index;
  const screen = DEBUG_SCREENS[_currentIndex];
  screen.prepare();
  screen.render();
  _updateNavBar();
  window.scrollTo(0, 0);
}

function _goToPrev() {
  if (_currentIndex > 0) _goToScreen(_currentIndex - 1);
}

function _goToNext() {
  if (_currentIndex < DEBUG_SCREENS.length - 1) _goToScreen(_currentIndex + 1);
}

// ============================================================
// Enter / Exit
// ============================================================

function _enterDebugMode() {
  State.setDebugMode(true);
  _currentIndex = 0;
  _createNavBar();
  _goToScreen(0);
}

function _exitDebugMode() {
  State.setDebugMode(false);
  State.setOracleTables(null); // prevent mock tables from leaking into real prologue
  State.resetState();
  document.getElementById('debug-nav-bar')?.remove();
  renderStartScreen();
}

// ============================================================
// Debug button injection into start screen
// ============================================================

function _injectDebugButton() {
  const startScreen = document.getElementById('screen-start');
  if (!startScreen?.classList.contains('active')) return;
  if (document.getElementById('btn-debug-mode')) return;

  const btn = document.createElement('button');
  btn.id        = 'btn-debug-mode';
  btn.className = 'btn btn-ghost debug-mode-btn';
  btn.textContent = '\u2699\uFE0F Debug Mode';
  btn.addEventListener('click', _enterDebugMode);

  // Append after the main action buttons
  const startButtons = startScreen.querySelector('.start-buttons');
  if (startButtons) {
    startButtons.appendChild(btn);
  } else {
    startScreen.appendChild(btn);
  }
}

// ============================================================
// Public API
// ============================================================

/**
 * Called by app.js on localhost after i18n init.
 * Sets up the MutationObserver that injects the debug button
 * whenever the start screen becomes active.
 */
export function initDebugMode() {
  // Inject debug CSS
  if (!document.getElementById('debug-css')) {
    const link = document.createElement('link');
    link.id   = 'debug-css';
    link.rel  = 'stylesheet';
    link.href = '/css/debug.css';
    document.head.appendChild(link);
  }

  // Watch for start screen becoming active
  const startScreen = document.getElementById('screen-start');
  const target = startScreen ?? document.body;
  const obs = new MutationObserver(() => _injectDebugButton());
  obs.observe(target, { attributes: true, attributeFilter: ['class'], subtree: !startScreen });

  // Inject immediately in case start screen is already active
  _injectDebugButton();
}
