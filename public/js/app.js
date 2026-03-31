/**
 * app.js — La Biblioteca
 * Main application controller.
 * Orchestrates screens, handles user interactions, calls API, updates state.
 */

import * as API   from './api.js';
import * as State from './state.js';
import { animateBookReveal } from './book-animator.js';
import { animateDiceRoll, buildDicePlaceholder } from './dice-animator.js';
import { t, init as initI18n, getCurrentLocale, setLocale, onLocaleChange } from './i18n.js';

// ============================================================
// Environment detection
// ============================================================

function isLocalEnvironment() {
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '::1'
      || window.location.protocol === 'file:';
}

// ============================================================
// Phase → screen mapping
// ============================================================

const PHASE_SCREENS = {
  prologue:           'screen-prologue',
  chapter_1:          'screen-chapter',
  chapter_2:          'screen-chapter',
  chapter_3:          'screen-chapter',
  epilogue_action_1:  'screen-epilogue',
  epilogue_action_2:  'screen-epilogue',
  epilogue_action_3:  'screen-epilogue',
  epilogue_final:     'screen-epilogue',
  completed:          'screen-completed',
};

// ============================================================
// i18n-based label getters (replace former static maps)
// ============================================================

function getPhaseLabel(key) { return t(`phases.${key}`) !== `phases.${key}` ? t(`phases.${key}`) : key; }
function getAttributeLabel(key) { return t(`attributes.${key}`) !== `attributes.${key}` ? t(`attributes.${key}`) : key; }
function getOutcomeLabel(key) { return t(`outcomes.${key}`) !== `outcomes.${key}` ? t(`outcomes.${key}`) : key; }

// Locale → BCP 47 tag for date formatting
const LOCALE_BCP47 = { es: 'es-ES', en: 'en-US' };

// Map book color names (Spanish or generic) to approximate CSS colors
const BOOK_COLOR_MAP = {
  rojo:       '#c0392b', red:    '#c0392b',
  azul:       '#2980b9', blue:   '#2980b9',
  verde:      '#27ae60', green:  '#27ae60',
  amarillo:   '#f1c40f', yellow: '#f1c40f',
  naranja:    '#e67e22', orange: '#e67e22',
  morado:     '#8e44ad', purple: '#8e44ad',
  violeta:    '#8e44ad',
  negro:      '#1a1a1a', black:  '#1a1a1a',
  blanco:     '#ecf0f1', white:  '#ecf0f1',
  gris:       '#95a5a6', gray:   '#95a5a6', grey: '#95a5a6',
  marrón:     '#6d4c41', brown:  '#6d4c41',
  dorado:     '#c9a84c', gold:   '#c9a84c',
  plateado:   '#bdc3c7', silver: '#bdc3c7',
  carmesí:    '#dc143c', crimson:'#dc143c',
  esmeralda:  '#50c878', emerald:'#50c878',
  índigo:     '#4b0082', indigo: '#4b0082',
  turquesa:   '#1abc9c', teal:   '#1abc9c',
};

// ============================================================
// DOM helpers
// ============================================================

function $(sel, ctx = document) { return ctx.querySelector(sel); }
function $$(sel, ctx = document) { return Array.from(ctx.querySelectorAll(sel)); }

function el(tag, attrs = {}, ...children) {
  const elem = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class')    elem.className = v;
    else if (k === 'html') elem.innerHTML = v;
    else if (k.startsWith('data-')) elem.dataset[k.slice(5)] = v;
    else elem.setAttribute(k, v);
  }
  for (const child of children) {
    if (typeof child === 'string') elem.appendChild(document.createTextNode(child));
    else if (child) elem.appendChild(child);
  }
  return elem;
}

function setLoading(button, loading) {
  if (!button) return;
  button.disabled = loading;
  if (loading) {
    button.classList.add('loading');
    // Animate the btn-text with loading dots
    const textEl = button.querySelector('.btn-text');
    if (textEl && !textEl.dataset.originalText) {
      textEl.dataset.originalText = textEl.textContent;
      textEl.classList.add('loading-dots');
    }
  } else {
    button.classList.remove('loading');
    const textEl = button.querySelector('.btn-text');
    if (textEl && textEl.dataset.originalText) {
      textEl.textContent = textEl.dataset.originalText;
      delete textEl.dataset.originalText;
      textEl.classList.remove('loading-dots');
    }
  }
}

function showError(containerId, message, scrollToId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `<span>⚠</span> ${message}`;
  container.className = 'message-bar error visible';
  container.style.display = 'flex';

  // Scroll to the relevant field, or to the error message itself
  const scrollTarget = scrollToId
    ? document.getElementById(scrollToId)
    : container;
  if (scrollTarget) {
    scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  setTimeout(() => {
    container.className = 'message-bar error';
    container.style.display = '';
  }, 8000);
}

function clearMessages(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.className = 'message-bar';
    container.style.display = '';
    container.innerHTML = '';
  }
}

function scrollToSection(elementOrId) {
  const el = typeof elementOrId === 'string'
    ? document.getElementById(elementOrId)
    : elementOrId;
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ============================================================
// Static i18n text population
// ============================================================

function populateStaticTexts() {
  document.title = `${t('app.title')} \u2014 ${t('app.subtitle')}`;
  document.documentElement.lang = getCurrentLocale();

  // Start screen
  const startTitle = document.getElementById('start-title');
  if (startTitle) startTitle.textContent = t('app.title');

  const startSubtitle = document.getElementById('start-subtitle');
  if (startSubtitle) startSubtitle.textContent = t('app.subtitle');

  const startIntro = document.getElementById('start-intro');
  if (startIntro) startIntro.textContent = t('start.intro');

  const btnNewGameText = document.getElementById('btn-new-game-text');
  if (btnNewGameText) btnNewGameText.textContent = `\u2726 ${t('start.new_game')}`;

  const btnContinueText = document.getElementById('btn-continue-game-text');
  if (btnContinueText) btnContinueText.textContent = `\u21A9 ${t('start.continue_game')}`;

  const gameListTitle = document.getElementById('game-list-title');
  if (gameListTitle) gameListTitle.textContent = t('start.saved_games');

  // Sidebar
  const sidebarBrandTitle = document.getElementById('sidebar-brand-title');
  if (sidebarBrandTitle) sidebarBrandTitle.textContent = t('sidebar.title');

  const sidebarBrandSubtitle = document.getElementById('sidebar-brand-subtitle');
  if (sidebarBrandSubtitle) sidebarBrandSubtitle.textContent = t('sidebar.subtitle');

  const sidebarPhaseTitle = document.getElementById('sidebar-phase-title');
  if (sidebarPhaseTitle) sidebarPhaseTitle.textContent = t('sidebar.current_phase');

  const sidebarCharacterTitle = document.getElementById('sidebar-character-title');
  if (sidebarCharacterTitle) sidebarCharacterTitle.textContent = t('sidebar.character');

  const sidebarAttributesTitle = document.getElementById('sidebar-attributes-title');
  if (sidebarAttributesTitle) sidebarAttributesTitle.textContent = t('sidebar.attributes');

  const sidebarOvercomeLabel = document.getElementById('sidebar-overcome-label');
  if (sidebarOvercomeLabel) sidebarOvercomeLabel.textContent = t('sidebar.overcome_points');

  const sidebarProgressTitle = document.getElementById('sidebar-progress-title');
  if (sidebarProgressTitle) sidebarProgressTitle.textContent = t('sidebar.progress');

  const btnJournalToggle = document.getElementById('btn-journal-toggle');
  if (btnJournalToggle) {
    btnJournalToggle.textContent = `\uD83D\uDCDC ${t('sidebar.view_journal')}`;
    btnJournalToggle.setAttribute('aria-label', t('sidebar.open_journal_aria'));
  }

  const btnExitGame = document.getElementById('btn-exit-game');
  if (btnExitGame) {
    btnExitGame.textContent = `\u2190 ${t('sidebar.back_to_start')}`;
    btnExitGame.setAttribute('aria-label', t('sidebar.back_aria'));
  }

  // Journal panel
  const journalPanelTitleText = document.getElementById('journal-panel-title-text');
  if (journalPanelTitleText) journalPanelTitleText.textContent = `\uD83D\uDCDC ${t('journal.title')}`;

  const journalPanelClose = document.getElementById('journal-panel-close');
  if (journalPanelClose) journalPanelClose.setAttribute('aria-label', t('journal.close_aria'));

  const journalPanelEmpty = document.getElementById('journal-panel-empty');
  if (journalPanelEmpty) journalPanelEmpty.textContent = t('journal.empty_prompt');

  // Modal
  const modalExitTitle = document.getElementById('modal-exit-title');
  if (modalExitTitle) modalExitTitle.textContent = t('modal.exit_title');

  const modalExitText = document.getElementById('modal-exit-text');
  if (modalExitText) modalExitText.textContent = t('modal.exit_text');

  const btnExitSave = document.getElementById('btn-exit-save');
  if (btnExitSave) btnExitSave.textContent = t('modal.save_exit');

  const btnExitNosave = document.getElementById('btn-exit-nosave');
  if (btnExitNosave) btnExitNosave.textContent = t('modal.exit_no_save');

  const btnExitCancel = document.getElementById('btn-exit-cancel');
  if (btnExitCancel) btnExitCancel.textContent = t('modal.cancel');

  // Language switcher — sync value
  const localeSelect = document.getElementById('locale-select');
  if (localeSelect) localeSelect.value = getCurrentLocale();

  const localeSelectSidebar = document.getElementById('locale-select-sidebar');
  if (localeSelectSidebar) localeSelectSidebar.value = getCurrentLocale();
}

// ============================================================
// Sidebar rendering
// ============================================================

function renderSidebar() {
  const game = State.getGame();
  if (!game) {
    renderSidebarEmpty();
    return;
  }

  // Phase indicator
  const phaseEl = $('#sidebar-phase');
  if (phaseEl) {
    let phaseKey = game.current_phase;
    // Show "Challenge" label when in epilogue_action_1 but book not yet discovered
    if (phaseKey === 'epilogue_action_1' && !game.books?.some(b => b.phase?.startsWith('epilogue'))) {
      phaseKey = 'epilogue_book';
    }
    const label = getPhaseLabel(phaseKey);
    phaseEl.querySelector('.phase-indicator-text').textContent = label;
  }

  // Character info
  const charEl = $('#sidebar-character');
  if (charEl) {
    if (game.character_name) {
      charEl.innerHTML = `
        <div class="character-name">${escHtml(game.character_name)}</div>
        ${game.character_description
          ? `<div class="character-detail">${escHtml(truncate(game.character_description, 80))}</div>`
          : ''}
        <div class="character-setting">
          ${game.genre ? `<span class="setting-badge">${escHtml(game.genre)}</span>` : ''}
          ${game.epoch ? `<span class="setting-badge">${escHtml(game.epoch)}</span>` : ''}
        </div>`;
    } else {
      charEl.innerHTML = `<div class="character-detail text-muted">${escHtml(t('sidebar.no_character'))}</div>`;
    }
  }

  // Attributes
  const attrsEl = $('#sidebar-attributes');
  if (attrsEl) {
    renderAttributeList(attrsEl, game);
  }

  // Overcome score (only in epilogue+)
  const overcomeEl = $('#sidebar-overcome');
  if (overcomeEl) {
    const phase = game.current_phase || '';
    const showOvercome = phase.startsWith('epilogue') || phase === 'completed';
    overcomeEl.style.display = showOvercome ? '' : 'none';
    if (showOvercome) {
      const scoreEl = overcomeEl.querySelector('.overcome-value');
      if (scoreEl) scoreEl.textContent = game.overcome_score ?? 0;
    }
  }

  // Phase steps
  renderPhaseStepper();
}

function renderSidebarEmpty() {
  const charEl = $('#sidebar-character');
  if (charEl) charEl.innerHTML = `<div class="character-detail text-muted">${escHtml(t('sidebar.no_game'))}</div>`;

  const attrsEl = $('#sidebar-attributes');
  if (attrsEl) attrsEl.innerHTML = '<div class="character-detail text-muted">\u2014</div>';

  const overcomeEl = $('#sidebar-overcome');
  if (overcomeEl) overcomeEl.style.display = 'none';
}

function renderAttributeList(container, game) {
  const usedChapter  = State.getUsedChapterAttributes();
  const usedEpilogue = State.getUsedEpilogueAttributes();
  const phase = game.current_phase || '';
  const inEpilogue = phase.startsWith('epilogue') || phase === 'completed';

  container.innerHTML = '';
  for (const attr of (game.attributes || [])) {
    const label = getAttributeLabel(attr.type);
    const total = (attr.base_value ?? 0) + (attr.background ?? 0) + (attr.support ?? 0);
    const usedInChapters  = usedChapter.has(attr.type);
    const usedInEpilogue  = usedEpilogue.has(attr.type);
    const isUsed = inEpilogue ? usedInEpilogue : usedInChapters;

    const row = el('div', { class: `attribute-row${isUsed ? ' used' : ''}` },
      el('div', { class: 'attribute-row-header' },
        el('span', { class: 'attribute-label' }, label),
        el('span', { class: 'attribute-total' }, String(total))
      ),
      el('div', { class: 'attribute-breakdown' },
        makePip(t('attribute_breakdown.base'), attr.base_value ?? 0),
        makePip(t('attribute_breakdown.background'), attr.background ?? 0),
        makePip(t('attribute_breakdown.support'), attr.support ?? 0)
      )
    );
    container.appendChild(row);
  }
}

function makePip(label, value) {
  return el('div', { class: 'attr-pip' },
    el('span', { class: 'attr-pip-label' }, label),
    el('span', { class: 'attr-pip-value' }, String(value))
  );
}

function renderPhaseStepper() {
  const el2 = $('#sidebar-steps');
  if (!el2) return;
  const game = State.getGame();
  if (!game) { el2.innerHTML = ''; return; }

  // Visual steps shown in the sidebar
  const steps = [
    'prologue',
    'chapter_1', 'chapter_2', 'chapter_3',
    'epilogue_book',
    'epilogue_action_1', 'epilogue_action_2', 'epilogue_action_3',
    'epilogue_final', 'completed',
  ];

  // Determine the current visual step index
  const backendPhase = game.current_phase;
  let currentVisualStep;
  if (backendPhase === 'epilogue_action_1') {
    // If book not yet discovered, we're on the "epilogue_book" visual step
    const hasBook = game.books?.some(b => b.phase?.startsWith('epilogue'));
    currentVisualStep = hasBook ? 'epilogue_action_1' : 'epilogue_book';
  } else {
    currentVisualStep = backendPhase;
  }

  const currentIdx = steps.indexOf(currentVisualStep);

  el2.innerHTML = '';
  for (let i = 0; i < steps.length; i++) {
    const p = steps[i];
    const label = getPhaseLabel(p);
    // A step is completed only if a later step is active (i < currentIdx)
    // The current step is active, everything else is pending
    let status = 'pending';
    if (currentIdx >= 0 && i < currentIdx) status = 'completed';
    if (i === currentIdx) status = 'active';

    const dot = document.createElement('div');
    dot.className = 'phase-step-dot';
    if (status === 'completed') dot.textContent = '\u2713';

    const stepEl = document.createElement('div');
    stepEl.className = `phase-step ${status}`;
    stepEl.appendChild(dot);
    const labelEl = document.createElement('span');
    labelEl.className = 'phase-step-label';
    labelEl.textContent = label;
    stepEl.appendChild(labelEl);
    el2.appendChild(stepEl);
  }
}

// ============================================================
// Screen routing
// ============================================================

function showScreen(screenId) {
  // Hide game layout screens
  $$('.screen').forEach(s => s.classList.remove('active'));
  // Hide start screen
  $$('.screen-full').forEach(s => s.classList.remove('active'));

  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
  }

  // Show/hide game layout wrapper
  const gameLayout = document.getElementById('game-layout');
  const startWrapper = document.getElementById('screen-start');
  if (gameLayout && startWrapper) {
    if (screenId === 'screen-start') {
      gameLayout.style.display = 'none';
      startWrapper.style.display = '';
      startWrapper.classList.add('active');
      window.scrollTo(0, 0);
    } else {
      gameLayout.style.display = 'flex';
      startWrapper.style.display = 'none';
      startWrapper.classList.remove('active');
    }
  }
}

function navigateToPhase(phase) {
  const screenId = PHASE_SCREENS[phase];
  if (!screenId) {
    console.warn('Unknown phase:', phase);
    return;
  }

  // Phase transition: fade out main content, then swap screen + fade in
  const main = document.getElementById('main-content');
  if (main) {
    main.classList.add('phase-transition-out');
    setTimeout(() => {
      main.classList.remove('phase-transition-out');
      showScreen(screenId);
      renderScreenForPhase(phase);
      renderSidebar();
      main.scrollTop = 0;
      main.classList.add('phase-transition-in');
      setTimeout(() => main.classList.remove('phase-transition-in'), 400);
    }, 300);
    return;
  }

  // Fallback if main content element not found (should not happen)
  showScreen(screenId);
  renderScreenForPhase(phase);
  renderSidebar();
}

function renderScreenForPhase(phase) {
  if (phase === 'prologue')               renderPrologueScreen();
  else if (phase.startsWith('chapter_')) renderChapterScreen(phase);
  else if (phase.startsWith('epilogue')) renderEpilogueScreen(phase);
  else if (phase === 'completed')        renderCompletedScreen();
}

// ============================================================
// START SCREEN
// ============================================================

function renderStartScreen() {
  showScreen('screen-start');
  populateStaticTexts();
  const continueBtn = document.getElementById('btn-continue-game');
  if (continueBtn) {
    continueBtn.style.display = State.hasSavedGame() ? 'flex' : 'none';
  }
  loadGameList();
}

async function loadGameList() {
  if (State.isDebugMode()) return;
  const section = document.getElementById('game-list-section');
  const listEl  = document.getElementById('game-list');
  if (!section || !listEl) return;

  try {
    const games = await API.fetchGames();
    if (!games || games.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = '';
    listEl.innerHTML = games.map(g => {
      const name     = escHtml(g.character_name || t('start.no_name'));
      const phase    = escHtml(g.phase_label || g.current_phase || '\u2014');
      const genre    = g.genre ? escHtml(g.genre) : '';
      const epoch    = g.epoch ? escHtml(g.epoch) : '';
      const meta     = [genre, epoch].filter(Boolean).join(' \u00B7 ') || '\u2014';
      const icon     = g.current_phase === 'completed' ? '\uD83D\uDCD5' : '\uD83D\uDCD6';
      const dateStr  = g.updated_at ? new Date(g.updated_at).toLocaleDateString(LOCALE_BCP47[getCurrentLocale()] || 'es-ES', { day: 'numeric', month: 'short' }) : '';

      return `
        <div class="game-list-item" data-game-id="${escHtml(g.id)}" role="button" tabindex="0" aria-label="${escHtml(t('start.load_game_aria', { name }))}">
          <span class="game-list-item-icon">${icon}</span>
          <div class="game-list-item-info">
            <div class="game-list-item-name">${name}</div>
            <div class="game-list-item-meta">
              <span>${meta}</span>
              ${dateStr ? `<span>\u00B7 ${dateStr}</span>` : ''}
            </div>
          </div>
          <span class="game-list-item-phase">${phase}</span>
        </div>`;
    }).join('');

  } catch (err) {
    console.error('Could not load game list:', err);
    section.style.display = 'none';
  }
}

async function onNewGame() {
  const btn = document.getElementById('btn-new-game');
  setLoading(btn, true);
  try {
    const game = await API.createGame();
    State.setGame(game);
    await fadeOutStartScreen();
    navigateToPhase(game.current_phase);
  } catch (err) {
    alert(t('errors.create_game', { message: err.message }));
  } finally {
    setLoading(btn, false);
  }
}

async function onContinueGame() {
  const btn = document.getElementById('btn-continue-game');
  setLoading(btn, true);
  try {
    const savedId = State.getSavedGameId();
    if (!savedId) { renderStartScreen(); return; }
    const game = await API.fetchGame(savedId);
    State.setGame(game);
    await fadeOutStartScreen();
    navigateToPhase(game.current_phase);
  } catch (err) {
    // Saved game no longer exists — remove it
    State.resetState();
    alert(t('errors.recover_game', { message: err.message }));
    renderStartScreen();
  } finally {
    setLoading(btn, false);
  }
}

function fadeOutStartScreen() {
  return new Promise(resolve => {
    const startScreen = document.getElementById('screen-start');
    const gameLayout  = document.getElementById('game-layout');
    if (startScreen) startScreen.classList.add('fade-out');
    setTimeout(() => {
      // Fully hide start screen so it doesn't occupy space
      if (startScreen) {
        startScreen.classList.remove('fade-out', 'active');
        startScreen.style.display = 'none';
      }
      // Scroll to top so game layout starts at top of viewport
      window.scrollTo(0, 0);
      if (gameLayout) gameLayout.classList.add('fade-in');
      setTimeout(() => {
        if (gameLayout) gameLayout.classList.remove('fade-in');
      }, 500);
      resolve();
    }, 400);
  });
}

// ============================================================
// PROLOGUE SCREEN
// ============================================================

function renderPrologueScreen() {
  const screen = document.getElementById('screen-prologue');
  if (!screen) return;
  const game = State.getGame();

  screen.innerHTML = `
    <div class="screen-header">
      <h2 class="screen-title">${escHtml(t('prologue.title'))}</h2>
      <p class="screen-subtitle">${escHtml(t('prologue.subtitle'))}</p>
    </div>
    <!-- Setting selection -->
    <div class="content-section">
      <h3 class="section-title">${escHtml(t('prologue.setting_title'))}</h3>
      <div id="msg-prologue-setting" class="message-bar"></div>
      <div class="setting-grid">
        <div class="form-group">
          <label class="form-label" for="select-genre">${escHtml(t('prologue.genre_label'))}</label>
          <select class="form-control" id="select-genre">
            <option value="">${escHtml(t('prologue.genre_placeholder'))}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="select-epoch">${escHtml(t('prologue.epoch_label'))}</label>
          <select class="form-control" id="select-epoch">
            <option value="">${escHtml(t('prologue.epoch_placeholder'))}</option>
          </select>
        </div>
        <div class="setting-random-row">
          <span class="text-muted text-sm">${escHtml(t('prologue.or'))}</span>
          <button class="btn btn-secondary btn-sm" id="btn-random-setting">
            <span class="btn-text">\u2726 ${escHtml(t('prologue.random'))}</span>
            <span class="btn-spinner"><span class="spinner"></span></span>
          </button>
        </div>
        <div class="setting-preview" id="setting-preview">
          <div class="setting-preview-text" id="setting-preview-text"></div>
        </div>
      </div>
    </div>

    <!-- Character creation -->
    <div class="content-section">
      <h3 class="section-title">${escHtml(t('prologue.character_title'))}</h3>
      <div id="msg-prologue-character" class="message-bar"></div>
      <div class="card card-ornate">
        <div style="display:flex;flex-direction:column;gap:var(--space-5);">
          <div class="form-group">
            <label class="form-label" for="input-char-name">${escHtml(t('prologue.name_label'))}</label>
            <input class="form-control" type="text" id="input-char-name"
              placeholder="${escHtml(t('prologue.name_placeholder'))}" maxlength="100">
          </div>
          <div class="form-group">
            <label class="form-label" for="input-char-desc">${escHtml(t('prologue.desc_label'))}</label>
            <textarea class="form-control" id="input-char-desc" rows="4"
              placeholder="${escHtml(t('prologue.desc_placeholder'))}"></textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- Journal entry -->
    <div class="content-section">
      <h3 class="section-title">${escHtml(t('prologue.first_page_title'))}</h3>
      <div id="msg-prologue-journal" class="message-bar"></div>
      <p class="text-muted text-sm" style="margin-bottom:var(--space-3);">
        ${escHtml(t('prologue.first_page_help'))}
      </p>
      <textarea class="journal-textarea" id="journal-prologue"
        placeholder="${escHtml(t('prologue.first_page_placeholder'))}"></textarea>
    </div>

    <div style="display:flex;justify-content:flex-end;padding-top:var(--space-4);">
      <button class="btn btn-primary btn-lg" id="btn-start-adventure">
        <span class="btn-text">${escHtml(t('prologue.start_adventure'))}</span>
        <span class="btn-spinner"><span class="spinner"></span></span>
      </button>
    </div>
  `;

  // Load oracle tables to populate selects
  loadOracleTables();

  // Wire events
  $('#btn-random-setting', screen).addEventListener('click', onRandomSetting);
  $('#btn-start-adventure', screen).addEventListener('click', onSubmitPrologue);
  $('#select-genre', screen).addEventListener('change', updateSettingPreview);
  $('#select-epoch', screen).addEventListener('change', updateSettingPreview);
}

async function loadOracleTables() {
  let tables = State.getOracleTables();
  if (!tables) {
    try {
      tables = await API.fetchOracleTables();
      State.setOracleTables(tables);
    } catch (err) {
      showError('msg-prologue-setting', t('errors.load_oracle', { message: err.message }));
      return;
    }
  }
  populateSelectFromTable('select-genre', tables.genre);
  populateSelectFromTable('select-epoch', tables.epoch);
}

function populateSelectFromTable(selectId, entries) {
  const sel = document.getElementById(selectId);
  if (!sel || !entries) return;
  // Keep first placeholder option
  const placeholder = sel.options[0];
  sel.innerHTML = '';
  sel.appendChild(placeholder);
  for (const entry of entries) {
    const opt = document.createElement('option');
    opt.value = entry.value;
    opt.textContent = entry.value;
    if (entry.hint) opt.title = entry.hint;
    sel.appendChild(opt);
  }
}

function updateSettingPreview() {
  const genre = document.getElementById('select-genre');
  const epoch = document.getElementById('select-epoch');
  const preview = document.getElementById('setting-preview');
  const previewText = document.getElementById('setting-preview-text');
  if (!genre || !epoch || !preview || !previewText) return;

  const tables = State.getOracleTables();
  let lines = [];

  if (genre.value && tables?.genre) {
    const genreEntry = tables.genre.find(e => e.value === genre.value);
    if (genreEntry?.hint) lines.push(`<strong>${genreEntry.value}:</strong> ${genreEntry.hint}`);
  }
  if (epoch.value && tables?.epoch) {
    const epochEntry = tables.epoch.find(e => e.value === epoch.value);
    if (epochEntry?.hint) lines.push(`<strong>${epochEntry.value}:</strong> ${epochEntry.hint}`);
  }

  if (lines.length) {
    previewText.innerHTML = lines.join('<br>');
    preview.classList.add('visible');
  } else {
    preview.classList.remove('visible');
  }
}

async function onRandomSetting() {
  const btn = document.getElementById('btn-random-setting');
  setLoading(btn, true);
  try {
    const result = await API.fetchRandomSetting();
    // Ensure tables are loaded first
    await loadOracleTables();

    const genreSel = document.getElementById('select-genre');
    const epochSel = document.getElementById('select-epoch');
    if (genreSel && result.genre) genreSel.value = result.genre.value;
    if (epochSel && result.epoch) epochSel.value = result.epoch.value;
    updateSettingPreview();
  } catch (err) {
    showError('msg-prologue-setting', err.message);
  } finally {
    setLoading(btn, false);
  }
}

async function onSubmitPrologue() {
  const btn = document.getElementById('btn-start-adventure');
  clearMessages('msg-prologue-setting');
  clearMessages('msg-prologue-character');
  clearMessages('msg-prologue-journal');

  const genre   = document.getElementById('select-genre')?.value;
  const epoch   = document.getElementById('select-epoch')?.value;
  const name    = document.getElementById('input-char-name')?.value.trim();
  const desc    = document.getElementById('input-char-desc')?.value.trim();
  const journal = document.getElementById('journal-prologue')?.value.trim();

  if (!genre)   { showError('msg-prologue-setting', t('errors.choose_genre')); return; }
  if (!epoch)   { showError('msg-prologue-setting', t('errors.choose_epoch')); return; }
  if (!name)    { showError('msg-prologue-character', t('errors.need_name')); return; }
  if (!desc)    { showError('msg-prologue-character', t('errors.need_description')); return; }
  if (!journal) { showError('msg-prologue-journal', t('errors.need_journal')); return; }

  setLoading(btn, true);
  try {
    const gameId = State.getGameId();

    // Submit prologue
    const updatedGame = await API.submitPrologue(gameId, {
      character_name:        name,
      character_description: desc,
      genre,
      epoch,
    });
    State.setGame(updatedGame);

    // Save journal entry if written
    if (journal) {
      await API.saveJournalEntry(gameId, journal, null);
    }

    navigateToPhase(updatedGame.current_phase);
  } catch (err) {
    showError('msg-prologue-setting', err.message);
  } finally {
    setLoading(btn, false);
  }
}

// ============================================================
// CHAPTER SCREEN
// ============================================================

function renderChapterScreen(phase) {
  const screen = document.getElementById('screen-chapter');
  if (!screen) return;
  const game = State.getGame();
  const chapterNum = State.getCurrentChapterNumber();
  const romanNums  = { 1: 'I', 2: 'II', 3: 'III' };
  const roman = romanNums[chapterNum] || chapterNum;

  State.clearRollResult();

  screen.innerHTML = `
    <div class="screen-header">
      <h2 class="screen-title">${escHtml(t('chapter.title', { roman }))}</h2>
      <p class="screen-subtitle">${escHtml(t('chapter.subtitle'))}</p>
    </div>
    <!-- Step 1: Discover book -->
    <div class="content-section" id="chapter-book-section">
      <h3 class="section-title">${escHtml(t('chapter.discover_title'))}</h3>
      <div id="msg-chapter-book" class="message-bar"></div>
      <div id="chapter-book-container">
        <button class="btn btn-secondary" id="btn-discover-book">
          <span class="btn-text">\uD83D\uDCD6 ${escHtml(t('chapter.discover_btn'))}</span>
          <span class="btn-spinner"><span class="spinner"></span></span>
        </button>
      </div>
    </div>

    <!-- Step 2: Pre-roll journal (hidden until book is revealed) -->
    <div class="content-section" id="chapter-pre-journal-section" style="display:none;">
      <h3 class="section-title">${escHtml(t('chapter.pre_journal_title'))}</h3>
      <div id="msg-chapter-pre" class="message-bar"></div>
      <p class="text-muted text-sm" style="margin-bottom:var(--space-3);">
        ${escHtml(t('chapter.pre_journal_help'))}
      </p>
      <textarea class="journal-textarea" id="journal-chapter-pre"
        placeholder="${escHtml(t('chapter.pre_journal_placeholder'))}"></textarea>
      <div style="margin-top:var(--space-4);display:flex;justify-content:flex-end;">
        <button class="btn btn-secondary" id="btn-pre-journal-continue">
          <span class="btn-text">${escHtml(t('chapter.continue'))}</span>
          <span class="btn-spinner"><span class="spinner"></span></span>
        </button>
      </div>
    </div>

    <!-- Step 3: Roll (hidden until pre-journal is saved) -->
    <div class="content-section" id="chapter-roll-section" style="display:none;">
      <h3 class="section-title">${escHtml(t('chapter.roll_title'))}</h3>
      <div id="msg-chapter-roll" class="message-bar"></div>
      <p class="text-muted text-sm" style="margin-bottom:var(--space-4);">
        ${escHtml(t('chapter.roll_help'))}
      </p>
      <div class="attribute-selector" id="chapter-attr-selector">
        ${renderAttributeButtons('chapter')}
      </div>
      <div style="margin-top:var(--space-4);">
        <button class="btn btn-primary" id="btn-roll-chapter" disabled>
          <span class="btn-text">\u2684 ${escHtml(t('chapter.roll_btn'))}</span>
          <span class="btn-spinner"><span class="spinner"></span></span>
        </button>
      </div>
      <div id="chapter-roll-result" style="margin-top:var(--space-5);"></div>
    </div>

    <!-- Step 4: Post-roll journal (hidden until roll completes) -->
    <div class="content-section" id="chapter-post-journal-section" style="display:none;">
      <h3 class="section-title">${escHtml(t('chapter.post_journal_title'))}</h3>
      <div id="msg-chapter-post" class="message-bar"></div>
      <p class="text-muted text-sm" style="margin-bottom:var(--space-3);">
        ${escHtml(t('chapter.post_journal_help'))}
      </p>
      <textarea class="journal-textarea" id="journal-chapter-post"
        placeholder="${escHtml(t('chapter.post_journal_placeholder'))}"></textarea>
    </div>

    <!-- Step 5: Next chapter button -->
    <div id="chapter-next-section" style="display:none;justify-content:flex-end;padding-top:var(--space-4);">
      <button class="btn btn-primary btn-lg" id="btn-chapter-next">
        <span class="btn-text">${chapterNum < 3 ? escHtml(t('chapter.next_chapter', { roman: romanNums[chapterNum+1] || '' })) : escHtml(t('chapter.go_epilogue'))}</span>
        <span class="btn-spinner"><span class="spinner"></span></span>
      </button>
    </div>
  `;

  // Wire events
  $('#btn-discover-book', screen).addEventListener('click', onDiscoverChapterBook);

  // Attribute buttons
  $$('.btn-attribute', screen).forEach(btn => {
    btn.addEventListener('click', () => onSelectChapterAttribute(btn));
  });
}

function renderAttributeButtons(context) {
  const game = State.getGame();
  const attrs = game?.attributes || [];
  const usedSet = context === 'chapter' ? State.getUsedChapterAttributes() : State.getUsedEpilogueAttributes();

  return attrs.map(attr => {
    const label = getAttributeLabel(attr.type);
    const total = (attr.base_value ?? 0) + (attr.background ?? 0) + (attr.support ?? 0);
    const used  = usedSet.has(attr.type);
    return `
      <button class="btn-attribute${used ? ' used' : ''}" data-attribute="${attr.type}" ${used ? 'disabled' : ''}>
        <span class="attr-name">${label}</span>
        <span class="attr-value">${total}</span>
        <span class="attr-details">${attr.base_value ?? 0}+${attr.background ?? 0}+${attr.support ?? 0}</span>
        ${used ? '' : ''}
      </button>`;
  }).join('');
}

async function onDiscoverChapterBook() {
  const btn = document.getElementById('btn-discover-book');
  setLoading(btn, true);
  clearMessages('msg-chapter-book');
  let bookFound = false;
  try {
    const gameId = State.getGameId();
    const book   = await API.generateChapterBook(gameId);
    State.setCurrentBook(book);
    bookFound = true;

    // Render animated book reveal
    const container = document.getElementById('chapter-book-container');
    if (container) {
      container.innerHTML = '';
      const animContainer = document.createElement('div');
      animContainer.className = 'book-animator-container';
      container.appendChild(animContainer);

      // Run animation — show pre-journal section after animation
      animateBookReveal(animContainer, book).then(() => {
        const preJournal = document.getElementById('chapter-pre-journal-section');
        if (preJournal) {
          preJournal.style.display = '';
          scrollToSection(preJournal);
        }

        // Wire the "Continue" button in pre-journal
        const continueBtn = document.getElementById('btn-pre-journal-continue');
        if (continueBtn) continueBtn.addEventListener('click', onPreJournalContinue);
      });
    } else {
      const preJournal = document.getElementById('chapter-pre-journal-section');
      if (preJournal) {
        preJournal.style.display = '';
        scrollToSection(preJournal);
      }
      const continueBtn = document.getElementById('btn-pre-journal-continue');
      if (continueBtn) continueBtn.addEventListener('click', onPreJournalContinue);
    }
  } catch (err) {
    showError('msg-chapter-book', err.message);
  } finally {
    setLoading(btn, false);
    if (bookFound && btn) btn.disabled = true;
  }
}

async function onPreJournalContinue() {
  const btn = document.getElementById('btn-pre-journal-continue');
  clearMessages('msg-chapter-pre');

  const journal = document.getElementById('journal-chapter-pre')?.value.trim();
  if (!journal) {
    showError('msg-chapter-pre', t('journal.write_before_continue'));
    return;
  }

  setLoading(btn, true);
  try {
    const gameId  = State.getGameId();
    const book    = State.getCurrentBook();

    await API.saveJournalEntry(gameId, journal, book?.id ?? null);

    // Show roll section with dice placeholder
    const rollSection = document.getElementById('chapter-roll-section');
    if (rollSection) {
      rollSection.style.display = '';
      const resultContainer = document.getElementById('chapter-roll-result');
      if (resultContainer && !resultContainer.hasChildNodes()) {
        resultContainer.appendChild(buildDicePlaceholder('chapter'));
      }
      scrollToSection(rollSection);
    }

    // Disable the continue button after use
    if (btn) btn.disabled = true;
  } catch (err) {
    showError('msg-chapter-pre', err.message);
  } finally {
    setLoading(btn, false);
  }
}

function onSelectChapterAttribute(btn) {
  $$('.btn-attribute', document.getElementById('screen-chapter')).forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const rollBtn = document.getElementById('btn-roll-chapter');
  if (rollBtn) {
    rollBtn.disabled = false;
    rollBtn.onclick = () => onRollChapter(btn.dataset.attribute);
  }
}

async function onRollChapter(attribute) {
  if (State.isDebugMode()) return;
  const btn = document.getElementById('btn-roll-chapter');
  clearMessages('msg-chapter-roll');
  setLoading(btn, true);
  // Disable all attribute buttons
  $$('.btn-attribute', document.getElementById('screen-chapter')).forEach(b => b.disabled = true);

  try {
    const gameId = State.getGameId();
    const response = await API.rollChapter(gameId, attribute);
    State.setGameWithRoll(response.game, response.roll_result);

    // Scroll to roll section so the animation is visible, then animate
    scrollToSection('chapter-roll-section');
    const resultContainer = document.getElementById('chapter-roll-result');
    if (resultContainer) {
      await animateDiceRoll(resultContainer, response.roll_result, 'chapter');
      scrollToSection(resultContainer);
    }

    // Show post-roll journal + next button after animation completes
    const postJournal = document.getElementById('chapter-post-journal-section');
    if (postJournal) {
      postJournal.style.display = '';
      scrollToSection(postJournal);
    }
    const nextSection = document.getElementById('chapter-next-section');
    if (nextSection) nextSection.style.display = 'flex';

    const nextBtn = document.getElementById('btn-chapter-next');
    if (nextBtn) {
      nextBtn.onclick = () => onChapterNext();
    }

    renderSidebar();

    // Disable roll button permanently after successful roll
    if (btn) btn.disabled = true;
  } catch (err) {
    showError('msg-chapter-roll', err.message);
    $$('.btn-attribute', document.getElementById('screen-chapter')).forEach(b => {
      if (!b.classList.contains('used')) b.disabled = false;
    });
  } finally {
    setLoading(btn, false);
  }
}

async function onChapterNext() {
  const btn = document.getElementById('btn-chapter-next');
  clearMessages('msg-chapter-post');

  const journal = document.getElementById('journal-chapter-post')?.value.trim();
  if (!journal) {
    showError('msg-chapter-post', t('journal.write_before_continue'));
    return;
  }

  setLoading(btn, true);
  try {
    const gameId  = State.getGameId();
    const book    = State.getCurrentBook();

    await API.saveJournalEntry(gameId, journal, book?.id ?? null);

    // Fetch updated game state
    const game = await API.fetchGame(gameId);
    State.setGame(game);
    State.clearCurrentBook();

    navigateToPhase(game.current_phase);
  } catch (err) {
    showError('msg-chapter-post', err.message);
    setLoading(btn, false);
  }
}

// ============================================================
// EPILOGUE SCREEN
// ============================================================

function renderEpilogueScreen(phase) {
  const screen = document.getElementById('screen-epilogue');
  if (!screen) return;
  const game = State.getGame();
  const isFinal   = phase === 'epilogue_final';
  const actionNum = State.getCurrentEpilogueActionNumber();
  const existingBook = game?.books?.find(b => b.phase?.startsWith('epilogue'));
  const bookAlreadyDiscovered = !!existingBook;

  if (isFinal) {
    renderEpilogueFinalScreen(screen, game);
  } else if (!bookAlreadyDiscovered && actionNum === 1) {
    renderEpilogueBookScreen(screen, game);
  } else {
    renderEpilogueActionScreen(screen, game, actionNum, existingBook);
  }
}

// --- Epilogue sub-screen: Book discovery (first visit to epilogue) ---
function renderEpilogueBookScreen(screen, game) {
  screen.innerHTML = `
    <div class="screen-header">
      <h2 class="screen-title">${escHtml(t('epilogue.title'))}</h2>
      <p class="screen-subtitle">${escHtml(t('epilogue.subtitle'))}</p>
    </div>

    <div class="content-section" id="epilogue-book-section">
      <h3 class="section-title">${escHtml(t('epilogue.book_title'))}</h3>
      <div id="msg-epilogue-book" class="message-bar"></div>
      <div id="epilogue-book-container">
        <button class="btn btn-secondary" id="btn-epilogue-book">
          <span class="btn-text">\uD83D\uDCD6 ${escHtml(t('epilogue.discover_epilogue_btn'))}</span>
          <span class="btn-spinner"><span class="spinner"></span></span>
        </button>
      </div>
    </div>

    <!-- Journal: describe the challenge ahead (shown after book reveal) -->
    <div class="content-section" id="epilogue-pre-journal-section" style="display:none;">
      <h3 class="section-title">${escHtml(t('epilogue.pre_journal_title'))}</h3>
      <div id="msg-epilogue-pre" class="message-bar"></div>
      <p class="text-muted text-sm" style="margin-bottom:var(--space-3);">
        ${escHtml(t('epilogue.pre_journal_help'))}
      </p>
      <textarea class="journal-textarea" id="journal-epilogue-pre"
        placeholder="${escHtml(t('epilogue.pre_journal_placeholder'))}"></textarea>
      <div style="display:flex;justify-content:flex-end;padding-top:var(--space-4);">
        <button class="btn btn-primary" id="btn-epilogue-pre-journal">
          <span class="btn-text">${escHtml(t('chapter.continue'))}</span>
          <span class="btn-spinner"><span class="spinner"></span></span>
        </button>
      </div>
    </div>
  `;

  // Wire events
  const bookBtn = document.getElementById('btn-epilogue-book');
  if (bookBtn) bookBtn.addEventListener('click', onDiscoverEpilogueBook);

  const preJournalBtn = document.getElementById('btn-epilogue-pre-journal');
  if (preJournalBtn) preJournalBtn.addEventListener('click', onEpiloguePreJournalContinue);
}

// --- Epilogue sub-screen: Action 1/2/3 (book already discovered) ---
function renderEpilogueActionScreen(screen, game, actionNum, book) {
  // Find the last epilogue journal entry to display as context
  const epilogueJournals = (game?.journal_entries ?? [])
    .filter(j => j.phase?.startsWith('epilogue'))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const lastJournal = epilogueJournals.length > 0
    ? epilogueJournals[epilogueJournals.length - 1]
    : null;

  screen.innerHTML = `
    <div class="screen-header">
      <h2 class="screen-title">${escHtml(t('epilogue.action_title', { num: actionNum }))}</h2>
      <p class="screen-subtitle">${escHtml(t('epilogue.subtitle'))}</p>
    </div>

    <!-- Book info (always visible as context) -->
    <div class="content-section">
      <h3 class="section-title">${escHtml(t('epilogue.book_title'))}</h3>
      <div id="epilogue-book-container">
        ${book ? buildBookCard(book).outerHTML : ''}
      </div>
    </div>

    <!-- Last journal entry (read-only context) -->
    ${lastJournal ? `
    <div class="content-section">
      <h3 class="section-title">\uD83D\uDCDC ${escHtml(t('epilogue.last_entry_title'))}</h3>
      <blockquote class="journal-entry-display">${escapeHtml(lastJournal.content)}</blockquote>
    </div>` : ''}

    <!-- Action: attribute selection + roll -->
    <div id="epilogue-action-area">
      ${buildActionSection(actionNum, game)}
    </div>

    <!-- Post-roll journal (shown after dice roll) -->
    <div class="content-section" id="epilogue-post-roll-section" style="display:none;">
      <h3 class="section-title">${escHtml(t('epilogue.post_roll_title'))}</h3>
      <div id="msg-epilogue-post-roll" class="message-bar"></div>
      <p class="text-muted text-sm" style="margin-bottom:var(--space-3);">
        ${escHtml(t('epilogue.post_roll_help'))}
      </p>
      <textarea class="journal-textarea" id="journal-epilogue-post-roll"
        placeholder="${escHtml(t('epilogue.post_roll_placeholder'))}"></textarea>
      <div style="display:flex;justify-content:flex-end;padding-top:var(--space-4);">
        <button class="btn btn-primary" id="btn-epilogue-post-roll">
          <span class="btn-text">${escHtml(t('chapter.continue'))}</span>
          <span class="btn-spinner"><span class="spinner"></span></span>
        </button>
      </div>
    </div>
  `;

  wireEpilogueActionEvents(game);

  // Insert dice placeholder in the action result container
  const actionResult = document.getElementById('epilogue-action-result');
  if (actionResult && !actionResult.hasChildNodes()) {
    actionResult.appendChild(buildDicePlaceholder('epilogue_action'));
  }
}

// --- Epilogue sub-screen: Final roll ---
function renderEpilogueFinalScreen(screen, game) {
  screen.innerHTML = `
    <div class="screen-header">
      <h2 class="screen-title">${escHtml(t('epilogue.final_title'))}</h2>
      <p class="screen-subtitle">${escHtml(t('epilogue.subtitle'))}</p>
    </div>

    <div id="epilogue-action-area">
      ${buildFinalRollSection(game)}
    </div>

    <!-- Post-final journal (after final roll, before summary) -->
    <div class="content-section" id="epilogue-post-journal-section" style="display:none;">
      <h3 class="section-title">${escHtml(t('epilogue.post_final_title'))}</h3>
      <div id="msg-epilogue-post" class="message-bar"></div>
      <p class="text-muted text-sm" style="margin-bottom:var(--space-3);">
        ${escHtml(t('epilogue.post_final_help'))}
      </p>
      <textarea class="journal-textarea" id="journal-epilogue-post"
        placeholder="${escHtml(t('epilogue.post_final_placeholder'))}"></textarea>
    </div>

    <div id="epilogue-finish-section" style="display:none;justify-content:flex-end;padding-top:var(--space-4);">
      <button class="btn btn-primary btn-lg" id="btn-epilogue-finish">
        <span class="btn-text">${escHtml(t('epilogue.view_summary'))}</span>
        <span class="btn-spinner"><span class="spinner"></span></span>
      </button>
    </div>
  `;

  // Wire final roll events
  const finalBtn = document.getElementById('btn-roll-epilogue-final');
  if (finalBtn) finalBtn.addEventListener('click', onRollEpilogueFinal);

  const finishBtn = document.getElementById('btn-epilogue-finish');
  if (finishBtn) finishBtn.addEventListener('click', onEpilogueFinish);

  // Insert dice placeholder
  const finalResult = document.getElementById('epilogue-final-result');
  if (finalResult && !finalResult.hasChildNodes()) {
    finalResult.appendChild(buildDicePlaceholder('epilogue_final'));
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function buildActionSection(actionNum, game) {
  if (!actionNum) return '';
  const attrButtons = renderEpilogueAttributeButtons();
  const overcomeScore = game?.overcome_score ?? 0;
  const supportUsed = game?.support_used ?? false;

  return `
    <div class="content-section">
      <h3 class="section-title">${escHtml(t('epilogue.action_section_title', { num: actionNum }))}</h3>
      <div id="msg-epilogue-action" class="message-bar"></div>
      <div class="action-step" id="epilogue-action-${actionNum}">
        <div class="action-step-header">
          <div class="action-step-number">${actionNum}</div>
          <div class="action-step-title">${escHtml(t('epilogue.action_section_title', { num: actionNum }))}</div>
        </div>

        <div>
          <p class="text-muted text-sm" style="margin-bottom:var(--space-3);">${escHtml(t('epilogue.action_choose_attr'))}</p>
          <div class="attribute-selector" id="epilogue-attr-selector">${attrButtons}</div>
        </div>

        ${!supportUsed ? `
        <div class="support-option" id="support-option" style="display:none;">
          <p class="form-label" style="margin-bottom:var(--space-2);">${escHtml(t('epilogue.support_title'))}</p>
          <p class="text-muted text-sm" style="margin-bottom:var(--space-3);">
            ${escHtml(t('epilogue.support_help'))}
          </p>
          <div class="attribute-selector" id="epilogue-support-selector" style="gap:var(--space-2);">
            ${renderSupportButtons(game)}
          </div>
        </div>` : `
        <p class="text-muted text-sm"><em>${escHtml(t('epilogue.support_used'))}</em></p>`}

        <div style="margin-top:var(--space-2);">
          <button class="btn btn-primary" id="btn-roll-epilogue-action" disabled>
            <span class="btn-text">\u2684 ${escHtml(t('epilogue.roll_btn'))}</span>
            <span class="btn-spinner"><span class="spinner"></span></span>
          </button>
        </div>
        <div id="epilogue-action-result"></div>
      </div>

      <div class="overcome-display" style="margin-top:var(--space-4);">
        <span class="overcome-label">${escHtml(t('epilogue.accumulated_points'))}</span>
        <span class="overcome-value">${overcomeScore}</span>
      </div>
    </div>`;
}

function renderEpilogueAttributeButtons() {
  const game  = State.getGame();
  const attrs = game?.attributes || [];
  const used  = State.getUsedEpilogueAttributes();

  return attrs.map(attr => {
    const label = getAttributeLabel(attr.type);
    const total = (attr.base_value ?? 0) + (attr.background ?? 0) + (attr.support ?? 0);
    const isUsed = used.has(attr.type);
    return `
      <button class="btn-attribute${isUsed ? ' used' : ''}" data-attribute="${attr.type}" ${isUsed ? 'disabled' : ''}>
        <span class="attr-name">${label}</span>
        <span class="attr-value">${total}</span>
        <span class="attr-details">${attr.base_value ?? 0}+${attr.background ?? 0}+${attr.support ?? 0}</span>
      </button>`;
  }).join('');
}

function renderSupportButtons(game) {
  const attrs = game?.attributes || [];
  const attrButtons = attrs
    .filter(a => (a.support ?? 0) > 0)
    .map(attr => {
      const label = getAttributeLabel(attr.type);
      return `
        <button class="btn-attribute btn-sm" data-support-attribute="${attr.type}" style="min-width:80px;">
          <span class="attr-name">${label}</span>
          <span class="attr-value">+${attr.support}</span>
        </button>`;
    }).join('');

  if (!attrButtons) {
    return `<p class="text-muted text-sm"><em>${escHtml(t('epilogue.no_support'))}</em></p>`;
  }
  return `
    <button class="btn-attribute btn-sm" data-support-attribute="none" style="min-width:80px;opacity:0.6;">
      <span class="attr-name">${escHtml(t('epilogue.no_support_btn'))}</span>
    </button>
    ${attrButtons}`;
}

function buildFinalRollSection(game) {
  const overcomeScore = game?.overcome_score ?? 0;
  return `
    <div class="content-section">
      <h3 class="section-title">${escHtml(t('epilogue.final_section_title'))}</h3>
      <div id="msg-epilogue-final" class="message-bar"></div>
      <div class="card" style="text-align:center;padding:var(--space-8);">
        <p class="text-muted text-sm" style="margin-bottom:var(--space-4);">
          ${escHtml(t('epilogue.final_help'))}
        </p>
        <div class="overcome-display" style="margin:var(--space-5) auto;max-width:200px;">
          <span class="overcome-label">${escHtml(t('epilogue.your_score'))}</span>
          <span class="overcome-value" style="font-size:var(--fs-3xl);">${overcomeScore}</span>
        </div>
        <button class="btn btn-primary btn-lg" id="btn-roll-epilogue-final">
          <span class="btn-text">\u2684 ${escHtml(t('epilogue.final_roll_btn'))}</span>
          <span class="btn-spinner"><span class="spinner"></span></span>
        </button>
        <div id="epilogue-final-result" style="margin-top:var(--space-6);"></div>
      </div>
    </div>`;
}

function wireEpilogueActionEvents(game) {
  // Action attribute selection
  $$('[data-attribute]', document.getElementById('screen-epilogue')).forEach(btn => {
    if (!btn.classList.contains('used') && !btn.hasAttribute('data-support-attribute')) {
      btn.addEventListener('click', () => onSelectEpilogueAttribute(btn));
    }
  });

  // Support attribute selection
  $$('[data-support-attribute]', document.getElementById('screen-epilogue')).forEach(btn => {
    btn.addEventListener('click', () => onSelectSupportAttribute(btn));
  });

  // Post-roll journal continue
  const postRollBtn = document.getElementById('btn-epilogue-post-roll');
  if (postRollBtn) {
    postRollBtn.addEventListener('click', onEpiloguePostRollContinue);
  }
}

async function onDiscoverEpilogueBook() {
  const btn = document.getElementById('btn-epilogue-book');
  setLoading(btn, true);
  clearMessages('msg-epilogue-book');
  let bookFound = false;
  try {
    const gameId = State.getGameId();
    const book   = await API.generateEpilogueBook(gameId);
    State.setCurrentBook(book);
    bookFound = true;

    const container = document.getElementById('epilogue-book-container');
    if (container) {
      container.innerHTML = '';
      const animContainer = document.createElement('div');
      animContainer.className = 'book-animator-container';
      container.appendChild(animContainer);

      // Run animation, then reveal the pre-journal section
      animateBookReveal(animContainer, book).then(() => {
        const preJournal = document.getElementById('epilogue-pre-journal-section');
        if (preJournal) {
          preJournal.style.display = '';
          scrollToSection(preJournal);
        }
      });
    } else {
      // Fallback: show pre-journal immediately
      const preJournal = document.getElementById('epilogue-pre-journal-section');
      if (preJournal) {
        preJournal.style.display = '';
        scrollToSection(preJournal);
      }
    }
  } catch (err) {
    showError('msg-epilogue-book', err.message);
  } finally {
    setLoading(btn, false);
    if (bookFound && btn) btn.disabled = true;
  }
}

async function onEpiloguePreJournalContinue() {
  const btn = document.getElementById('btn-epilogue-pre-journal');
  clearMessages('msg-epilogue-pre');
  const journalText = document.getElementById('journal-epilogue-pre')?.value.trim();
  if (!journalText) {
    showError('msg-epilogue-pre', t('journal.write_before_continue'));
    return;
  }
  setLoading(btn, true);
  try {
    const gameId = State.getGameId();
    const book = State.getCurrentBook() || State.getGame()?.books?.find(b => b.phase?.startsWith('epilogue'));
    await API.saveJournalEntry(gameId, journalText, book?.id ?? null);

    // Refresh game state (journal is now saved) and re-render as action screen
    const updatedGame = await API.fetchGame(gameId);
    State.setGame(updatedGame);
    navigateToPhase(updatedGame.current_phase);
  } catch (err) {
    showError('msg-epilogue-pre', err.message);
  } finally {
    setLoading(btn, false);
  }
}

async function onEpiloguePostRollContinue() {
  const btn = document.getElementById('btn-epilogue-post-roll');
  clearMessages('msg-epilogue-post-roll');
  const journalText = document.getElementById('journal-epilogue-post-roll')?.value.trim();
  if (!journalText) {
    showError('msg-epilogue-post-roll', t('journal.write_before_continue'));
    return;
  }
  setLoading(btn, true);
  try {
    const gameId = State.getGameId();
    const book = State.getGame()?.books?.find(b => b.phase?.startsWith('epilogue'));
    await API.saveJournalEntry(gameId, journalText, book?.id ?? null);

    // Refresh game state and navigate to next phase
    const updatedGame = await API.fetchGame(gameId);
    State.setGame(updatedGame);
    navigateToPhase(updatedGame.current_phase);
  } catch (err) {
    showError('msg-epilogue-post-roll', err.message);
  } finally {
    setLoading(btn, false);
  }
}

let _selectedEpilogueAttribute = null;
let _selectedSupportAttribute  = null;

function onSelectEpilogueAttribute(btn) {
  const screen = document.getElementById('screen-epilogue');
  $$('[data-attribute]', screen)
    .filter(b => !b.hasAttribute('data-support-attribute'))
    .forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  _selectedEpilogueAttribute = btn.dataset.attribute;

  // Show support option if available and not yet used
  const supportOption = document.getElementById('support-option');
  if (supportOption) supportOption.style.display = '';

  const rollBtn = document.getElementById('btn-roll-epilogue-action');
  if (rollBtn) rollBtn.disabled = false;
}

function onSelectSupportAttribute(btn) {
  $$('[data-support-attribute]', document.getElementById('screen-epilogue')).forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  _selectedSupportAttribute = btn.dataset.supportAttribute === 'none' ? null : btn.dataset.supportAttribute;
}

// Epilogue roll button is handled by the global delegated click listener below.

async function onRollEpilogueAction() {
  if (State.isDebugMode()) return;
  const btn = document.getElementById('btn-roll-epilogue-action');
  if (!_selectedEpilogueAttribute) {
    showError('msg-epilogue-action', t('epilogue.select_attr_first'));
    return;
  }
  clearMessages('msg-epilogue-action');
  setLoading(btn, true);

  // Disable attribute buttons
  $$('[data-attribute]', document.getElementById('screen-epilogue'))
    .filter(b => !b.hasAttribute('data-support-attribute'))
    .forEach(b => b.disabled = true);

  try {
    const gameId = State.getGameId();
    const response = await API.rollEpilogueAction(
      gameId,
      _selectedEpilogueAttribute,
      _selectedSupportAttribute
    );
    State.setGameWithRoll(response.game, response.roll_result);

    // Scroll to action area so the animation is visible, then animate
    scrollToSection('epilogue-action-area');
    const resultContainer = document.getElementById('epilogue-action-result');
    if (resultContainer) {
      await animateDiceRoll(resultContainer, response.roll_result, 'epilogue_action');
      scrollToSection(resultContainer);
    }

    // Update overcome score display
    const overcomeEls = document.querySelectorAll('.overcome-value');
    overcomeEls.forEach(el => { el.textContent = response.game?.overcome_score ?? 0; });

    // Reset selections
    _selectedEpilogueAttribute = null;
    _selectedSupportAttribute  = null;

    renderSidebar();

    // Disable roll button permanently after successful roll
    if (btn) btn.disabled = true;

    // Show post-roll journal section for the player to describe the outcome
    const postRollSection = document.getElementById('epilogue-post-roll-section');
    if (postRollSection) {
      postRollSection.style.display = '';
      scrollToSection(postRollSection);
    }

  } catch (err) {
    showError('msg-epilogue-action', err.message);
    $$('[data-attribute]', document.getElementById('screen-epilogue'))
      .filter(b => !b.hasAttribute('data-support-attribute') && !b.classList.contains('used'))
      .forEach(b => b.disabled = false);
  } finally {
    setLoading(btn, false);
  }
}

async function onRollEpilogueFinal() {
  if (State.isDebugMode()) return;
  const btn = document.getElementById('btn-roll-epilogue-final');
  clearMessages('msg-epilogue-final');
  setLoading(btn, true);
  try {
    const gameId = State.getGameId();
    const response = await API.rollEpilogueFinal(gameId);
    State.setGameWithRoll(response.game, response.roll_result);

    scrollToSection('epilogue-action-area');
    const resultContainer = document.getElementById('epilogue-final-result');
    if (resultContainer) {
      await animateDiceRoll(
        resultContainer,
        response.roll_result,
        'epilogue_final',
        { overcome_score: response.game?.overcome_score ?? 0 }
      );
      scrollToSection(resultContainer);
    }

    // Show post-journal + finish button after animation
    const postJournal = document.getElementById('epilogue-post-journal-section');
    if (postJournal) {
      postJournal.style.display = '';
      scrollToSection(postJournal);
    }
    const finishSection = document.getElementById('epilogue-finish-section');
    if (finishSection) finishSection.style.display = 'flex';

    renderSidebar();

    // Disable final roll button permanently after successful roll
    if (btn) btn.disabled = true;
  } catch (err) {
    showError('msg-epilogue-final', err.message);
  } finally {
    setLoading(btn, false);
  }
}

async function onEpilogueFinish() {
  const btn = document.getElementById('btn-epilogue-finish');
  clearMessages('msg-epilogue-post');

  const journal = document.getElementById('journal-epilogue-post')?.value.trim();
  if (!journal) {
    showError('msg-epilogue-post', t('journal.write_before_continue'));
    return;
  }

  setLoading(btn, true);
  try {
    const gameId  = State.getGameId();
    const book    = State.getCurrentBook() || State.getGame()?.books?.find(b => b.phase?.startsWith('epilogue'));

    await API.saveJournalEntry(gameId, journal, book?.id ?? null);

    const game = await API.fetchGame(gameId);
    State.setGame(game);

    navigateToPhase('completed');
  } catch (err) {
    showError('msg-epilogue-post', err.message);
    setLoading(btn, false);
  }
}

// ============================================================
// COMPLETED / SUMMARY SCREEN
// ============================================================

async function renderCompletedScreen() {
  const screen = document.getElementById('screen-completed');
  if (!screen) return;
  const game = State.getGame();

  // Fetch fresh journal entries
  let entries = [];
  if (State.isDebugMode()) {
    entries = game?.journal_entries ?? [];
  } else {
    try {
      entries = await API.fetchJournalEntries(game.id);
    } catch (err) {
      console.error('Could not load journal:', err);
    }
  }

  // Find final roll result
  const finalRoll = game.roll_results?.find(r => r.phase === 'epilogue_final') || null;
  const outcomeLabel = finalRoll ? getOutcomeLabel(finalRoll.outcome) : '\u2014';
  const outcomeClass = finalRoll?.outcome || 'miss';

  screen.innerHTML = `
    <div class="screen-header">
      <h2 class="screen-title">${escHtml(t('completed.title'))}</h2>
      <p class="screen-subtitle">${escHtml(t('completed.subtitle'))}</p>
    </div>

    <!-- Summary header -->
    <div class="summary-header">
      <div style="font-size:48px;">\uD83D\uDCDA</div>
      <h3 style="font-family:var(--font-heading);font-size:var(--fs-xl);color:var(--color-gold);">
        ${escHtml(game.character_name || t('start.no_name'))}
      </h3>
      <div style="display:flex;gap:var(--space-3);">
        <span class="setting-badge">${escHtml(game.genre || '\u2014')}</span>
        <span class="setting-badge">${escHtml(game.epoch || '\u2014')}</span>
      </div>
      ${finalRoll ? `
        <div class="summary-final-result ${outcomeClass}">
          ${escHtml(outcomeLabel)} \u2014 ${escHtml(t('completed.overcome_points', { score: game.overcome_score ?? 0 }))}
        </div>` : ''}
      <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;justify-content:center;">
        <button class="btn btn-secondary" id="btn-export-summary" onclick="window.print()">
          <span class="btn-text">${escHtml(t('completed.export_btn'))}</span>
        </button>
        <button class="btn btn-danger btn-sm" id="btn-new-game-from-summary">
          ${escHtml(t('completed.new_game_btn'))}
        </button>
      </div>
    </div>

    <!-- Journal entries -->
    <div class="content-section">
      <h3 class="section-title">${escHtml(t('completed.full_journal_title'))}</h3>
      <div id="full-journal" style="display:flex;flex-direction:column;gap:var(--space-5);">
        ${entries.length ? entries.map(e => buildJournalEntryHtml(e, game)).join('') :
          `<p class="text-muted text-sm font-body" style="font-style:italic;">${escHtml(t('completed.no_journal'))}</p>`}
      </div>
    </div>

    <!-- All roll results -->
    <div class="content-section">
      <h3 class="section-title">${escHtml(t('completed.roll_log_title'))}</h3>
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        ${(game.roll_results || []).map(r => buildRollSummaryRow(r)).join('') ||
          `<p class="text-muted text-sm">${escHtml(t('completed.no_rolls'))}</p>`}
      </div>
    </div>
  `;

  // New game button
  const newGameBtn = document.getElementById('btn-new-game-from-summary');
  if (newGameBtn) {
    newGameBtn.addEventListener('click', () => {
      if (confirm(t('completed.confirm_new_game'))) {
        State.resetState();
        renderStartScreen();
      }
    });
  }
}

function buildJournalEntryHtml(entry, game) {
  const phaseLabel = getPhaseLabel(entry.phase) || entry.phase || '\u2014';
  const book = entry.book_id ? game?.books?.find(b => b.id === entry.book_id) : null;
  const bookLabel = book ? `${book.color} \u00B7 ${book.binding}` : '';

  return `
    <div class="journal-entry">
      <div class="journal-entry-header">
        <span class="journal-entry-phase">${escHtml(phaseLabel)}</span>
        ${bookLabel ? `<span class="journal-entry-book">${escHtml(bookLabel)}</span>` : ''}
      </div>
      <div class="journal-entry-body">${escHtml(entry.content || '')}</div>
    </div>`;
}

function buildRollSummaryRow(roll) {
  const phaseLabel = getPhaseLabel(roll.phase) || roll.phase || '\u2014';
  const attrLabel  = getAttributeLabel(roll.attribute_type) || roll.attribute_type || '\u2014';
  const outcome    = roll.outcome || 'miss';
  const outcomeLabel = getOutcomeLabel(outcome);

  return `
    <div style="display:flex;align-items:center;gap:var(--space-4);padding:var(--space-3) var(--space-4);
      background:rgba(26,26,46,0.5);border:1px solid var(--color-border-panel);border-radius:var(--radius-md);">
      <span style="font-family:var(--font-heading);font-size:var(--fs-xs);color:var(--color-text-muted);min-width:120px;">
        ${escHtml(phaseLabel)}
      </span>
      <span style="font-size:var(--fs-xs);color:var(--color-text-panel);">${escHtml(attrLabel)}</span>
      <span style="margin-left:auto;font-family:var(--font-heading);font-size:var(--fs-xs);"
        class="outcome-${outcome === 'hit' ? 'hit' : outcome === 'weak_hit' ? 'partial' : 'miss'}">
        ${escHtml(outcomeLabel)}
      </span>
      <span style="font-family:var(--font-heading);font-size:var(--fs-sm);color:var(--color-gold);">
        ${roll.action_score ?? '\u2014'}
      </span>
    </div>`;
}

// ============================================================
// BOOK CARD builder
// ============================================================

function buildBookCard(book) {
  const colorKey = (book.color || '').toLowerCase().replace(/[^a-z\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1\u00fc]/g, '');
  const swatchColor = Object.entries(BOOK_COLOR_MAP).find(([k]) => colorKey.includes(k))?.[1] || '#6d4c41';

  const card = document.createElement('div');
  card.className = 'book-card';
  card.innerHTML = `
    <div class="book-card-header">
      <span class="book-card-icon">\uD83D\uDCDA</span>
      <span class="book-card-title">${escHtml(t('book.mysterious_volume'))}</span>
    </div>
    <div class="book-card-body">
      <div class="book-trait">
        <span class="book-trait-label">${escHtml(t('book.color'))}</span>
        <span class="book-trait-value">
          <span class="color-swatch" style="background-color:${swatchColor};"></span>
          ${escHtml(book.color || '\u2014')}
        </span>
        ${book.color_hint ? `<span class="book-trait-hint">${escHtml(book.color_hint)}</span>` : ''}
      </div>
      <div class="book-trait">
        <span class="book-trait-label">${escHtml(t('book.binding'))}</span>
        <span class="book-trait-value">${escHtml(book.binding || '\u2014')}</span>
        ${book.binding_hint ? `<span class="book-trait-hint">${escHtml(book.binding_hint)}</span>` : ''}
      </div>
      <div class="book-trait">
        <span class="book-trait-label">${escHtml(t('book.smell'))}</span>
        <span class="book-trait-value">${escHtml(book.smell || '\u2014')}</span>
        ${book.smell_hint ? `<span class="book-trait-hint">${escHtml(book.smell_hint)}</span>` : ''}
      </div>
      <div class="book-trait">
        <span class="book-trait-label">${escHtml(t('book.interior'))}</span>
        <span class="book-trait-value">${escHtml(book.interior || '\u2014')}</span>
      </div>
    </div>`;
  return card;
}

// ============================================================
// DICE RESULT card builder
// ============================================================

function buildDiceResultCard(roll, context) {
  const outcome = roll.outcome || 'miss';
  const outcomeLabel = getOutcomeLabel(outcome);
  const attrLabel = getAttributeLabel(roll.attribute_type) || roll.attribute_type || '';

  // Determine which challenge dice beat the action
  const actionScore = roll.action_score ?? 0;
  const c1Beats = (roll.challenge_die_1 ?? 0) >= actionScore;
  const c2Beats = (roll.challenge_die_2 ?? 0) >= actionScore;

  const explanationText = getOutcomeExplanation(outcome, context);

  const div = document.createElement('div');
  div.className = 'dice-result animate-fade-in';
  div.innerHTML = `
    <div class="dice-result-header">
      <span style="font-family:var(--font-heading);font-size:var(--fs-sm);color:var(--color-text-muted);">
        ${escHtml(attrLabel)}
      </span>
      <span class="dice-outcome-badge ${outcome}">${escHtml(outcomeLabel)}</span>
    </div>

    <div class="dice-score-row">
      <span class="dice-score-label">${escHtml(t('dice.action_score'))}</span>
      <span class="dice-score-value">${actionScore}</span>
    </div>

    ${roll.modifier ? `<p class="dice-modifier-note">${escHtml(t('dice.modifier_applied', { modifier: (roll.modifier > 0 ? '+' : '') + roll.modifier }))}</p>` : ''}

    <div class="dice-faces">
      <div class="dice-face">
        <span class="dice-face-label">D6</span>
        <div class="dice-face-value d6">${roll.action_die ?? '?'}</div>
      </div>
      <div class="dice-separator">vs</div>
      <div class="dice-face">
        <span class="dice-face-label">D10</span>
        <div class="dice-face-value d10 ${c1Beats ? 'beats-action' : 'loses-to-action'}">${roll.challenge_die_1 ?? '?'}</div>
      </div>
      <div class="dice-face">
        <span class="dice-face-label">D10</span>
        <div class="dice-face-value d10 ${c2Beats ? 'beats-action' : 'loses-to-action'}">${roll.challenge_die_2 ?? '?'}</div>
      </div>
    </div>

    <div class="outcome-explanation ${outcome}">${explanationText}</div>
  `;
  return div;
}

function buildFinalResultCard(roll, game) {
  const outcome = roll.outcome || 'miss';
  const outcomeLabel = getOutcomeLabel(outcome);
  const overcomeScore = game?.overcome_score ?? 0;

  const div = document.createElement('div');
  div.className = 'dice-result animate-fade-in';
  div.innerHTML = `
    <div class="dice-result-header">
      <span style="font-family:var(--font-heading);font-size:var(--fs-sm);color:var(--color-text-muted);">${escHtml(t('dice.final_roll_label'))}</span>
      <span class="dice-outcome-badge ${outcome}">${escHtml(outcomeLabel)}</span>
    </div>

    <div class="dice-score-row">
      <span class="dice-score-label">${escHtml(t('dice.overcome_label'))}</span>
      <span class="dice-score-value">${overcomeScore}</span>
    </div>

    <div class="dice-faces">
      <div class="dice-face">
        <span class="dice-face-label">${escHtml(t('dice.you_label'))}</span>
        <div class="dice-face-value d6" style="width:64px;height:64px;font-size:var(--fs-xl);">${overcomeScore}</div>
      </div>
      <div class="dice-separator">vs</div>
      <div class="dice-face">
        <span class="dice-face-label">D10</span>
        <div class="dice-face-value d10 ${(roll.challenge_die_1 ?? 0) >= overcomeScore ? 'beats-action' : 'loses-to-action'}">${roll.challenge_die_1 ?? '?'}</div>
      </div>
      <div class="dice-face">
        <span class="dice-face-label">D10</span>
        <div class="dice-face-value d10 ${(roll.challenge_die_2 ?? 0) >= overcomeScore ? 'beats-action' : 'loses-to-action'}">${roll.challenge_die_2 ?? '?'}</div>
      </div>
    </div>

    <div class="outcome-explanation ${outcome}">${getFinalOutcomeExplanation(outcome)}</div>
  `;
  return div;
}

function getOutcomeExplanation(outcome, context) {
  if (context === 'epilogue') {
    if (outcome === 'hit')      return t('outcome_explanation.epilogue_hit');
    if (outcome === 'weak_hit') return t('outcome_explanation.epilogue_weak_hit');
    return t('outcome_explanation.epilogue_miss');
  }
  if (outcome === 'hit')      return t('outcome_explanation.chapter_hit');
  if (outcome === 'weak_hit') return t('outcome_explanation.chapter_weak_hit');
  return t('outcome_explanation.chapter_miss');
}

function getFinalOutcomeExplanation(outcome) {
  if (outcome === 'hit')      return t('outcome_explanation.final_hit');
  if (outcome === 'weak_hit') return t('outcome_explanation.final_weak_hit');
  return t('outcome_explanation.final_miss');
}

// ============================================================
// JOURNAL PANEL
// ============================================================

function openJournalPanel() {
  const panel   = document.getElementById('journal-panel');
  const overlay = document.getElementById('panel-overlay');
  if (panel)   panel.classList.add('open');
  if (overlay) overlay.classList.add('active');
  loadJournalPanel();
}

function closeJournalPanel() {
  const panel   = document.getElementById('journal-panel');
  const overlay = document.getElementById('panel-overlay');
  if (panel)   panel.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
}

async function loadJournalPanel() {
  const body = document.getElementById('journal-panel-body');
  const gameId = State.getGameId();
  if (!body || !gameId) return;

  body.innerHTML = '<div style="display:flex;justify-content:center;padding:2rem;"><span class="spinner"></span></div>';

  try {
    const entries = await API.fetchJournalEntries(gameId);
    const game = State.getGame();
    if (!entries.length) {
      body.innerHTML = `<p class="text-muted text-sm" style="font-style:italic;text-align:center;padding:2rem;">${escHtml(t('journal.no_entries'))}</p>`;
      return;
    }
    body.innerHTML = entries.map(e => buildJournalEntryHtml(e, game)).join('');
  } catch (err) {
    body.innerHTML = `<p class="text-muted text-sm" style="color:var(--color-failure-light);">Error: ${escHtml(err.message)}</p>`;
  }
}

// ============================================================
// Utilities
// ============================================================

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '\u2026';
}

// ============================================================
// EXIT GAME FLOW
// ============================================================

function showExitModal() {
  const modal = document.getElementById('modal-exit');
  if (modal) {
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
  }
}

function hideExitModal() {
  const modal = document.getElementById('modal-exit');
  if (modal) {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }
}

function onExitSave() {
  hideExitModal();
  // Game is already auto-saved — just go to start screen
  const gameLayout = document.getElementById('game-layout');
  if (gameLayout) gameLayout.style.display = 'none';
  renderStartScreen();
}

function onExitNoSave() {
  hideExitModal();
  State.resetState();
  const gameLayout = document.getElementById('game-layout');
  if (gameLayout) gameLayout.style.display = 'none';
  renderStartScreen();
}

// ============================================================
// LOAD GAME FROM LIST
// ============================================================

async function onLoadGameFromList(gameId) {
  try {
    const game = await API.fetchGame(gameId);
    State.setGame(game);
    await fadeOutStartScreen();
    navigateToPhase(game.current_phase);
  } catch (err) {
    alert(t('errors.load_game', { message: err.message }));
  }
}

// ============================================================
// INITIALIZATION
// ============================================================

async function init() {
  // Load i18n translations before anything else
  await initI18n();

  // Load debug module on localhost only
  if (isLocalEnvironment()) {
    try {
      const dbg = await import('./debug.js');
      dbg.initDebugMode();
    } catch (e) {
      console.warn('Debug module failed to load:', e);
    }
  }

  // Hydrate persisted state
  State.hydrateFromStorage();

  // Populate static text from translations
  populateStaticTexts();

  // Listen for locale changes and re-render
  onLocaleChange(() => {
    document.documentElement.lang = getCurrentLocale();
    populateStaticTexts();
    const game = State.getGame();
    if (game) {
      renderSidebar();
      renderScreenForPhase(game.current_phase);
    } else {
      renderStartScreen();
    }
  });

  // Wire language switcher
  const localeSelect = document.getElementById('locale-select');
  if (localeSelect) {
    localeSelect.value = getCurrentLocale();
    localeSelect.addEventListener('change', (e) => setLocale(e.target.value));
  }
  const localeSelectSidebar = document.getElementById('locale-select-sidebar');
  if (localeSelectSidebar) {
    localeSelectSidebar.value = getCurrentLocale();
    localeSelectSidebar.addEventListener('change', (e) => setLocale(e.target.value));
  }

  // Wire global UI events
  const newGameBtn      = document.getElementById('btn-new-game');
  const continueGameBtn = document.getElementById('btn-continue-game');
  const journalToggle   = document.getElementById('btn-journal-toggle');
  const journalClose    = document.getElementById('journal-panel-close');
  const panelOverlay    = document.getElementById('panel-overlay');
  const exitGameBtn     = document.getElementById('btn-exit-game');
  const exitSaveBtn     = document.getElementById('btn-exit-save');
  const exitNoSaveBtn   = document.getElementById('btn-exit-nosave');
  const exitCancelBtn   = document.getElementById('btn-exit-cancel');

  if (newGameBtn)      newGameBtn.addEventListener('click', onNewGame);
  if (continueGameBtn) continueGameBtn.addEventListener('click', onContinueGame);
  if (journalToggle)   journalToggle.addEventListener('click', openJournalPanel);
  if (journalClose)    journalClose.addEventListener('click', closeJournalPanel);
  if (panelOverlay)    panelOverlay.addEventListener('click', closeJournalPanel);
  if (exitGameBtn)     exitGameBtn.addEventListener('click', showExitModal);
  if (exitSaveBtn)     exitSaveBtn.addEventListener('click', onExitSave);
  if (exitNoSaveBtn)   exitNoSaveBtn.addEventListener('click', onExitNoSave);
  if (exitCancelBtn)   exitCancelBtn.addEventListener('click', hideExitModal);

  // Global delegated click for dynamically-rendered epilogue roll button
  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-roll-epilogue-action')) {
      onRollEpilogueAction();
    }
    // Game list item click — load a saved game
    const gameItem = e.target.closest('.game-list-item');
    if (gameItem) {
      const gameId = gameItem.dataset.gameId;
      if (gameId) onLoadGameFromList(gameId);
    }
  });

  // Subscribe to state changes for sidebar
  State.subscribe(() => renderSidebar());

  // Determine initial screen
  const savedId = State.getSavedGameId();
  if (savedId) {
    // Show start screen with "Continue" option while we validate
    renderStartScreen();
  } else {
    renderStartScreen();
  }

  // Pre-load oracle tables in background
  try {
    if (!State.getOracleTables()) {
      const tables = await API.fetchOracleTables();
      State.setOracleTables(tables);
    }
  } catch {
    // Non-critical; will retry when prologue loads
  }
}

// Boot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ============================================================
// Debug mode exports
// Internal functions exposed for debug.js only.
// ============================================================
export {
  renderStartScreen,
  renderPrologueScreen,
  renderChapterScreen,
  renderEpilogueScreen,
  renderCompletedScreen,
  showScreen,
};
