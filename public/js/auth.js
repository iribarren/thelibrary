/**
 * auth.js — La Biblioteca
 * Auth UI module: login, register, logout, My Sessions screen.
 * All rendering is done via DOM manipulation — no innerHTML with untrusted data.
 */

import * as API   from './api.js';
import * as State from './state.js';
import { t, getCurrentLocale } from './i18n.js';

// ============================================================
// Internal helpers
// ============================================================

/** Locale → BCP 47 tag for date formatting (mirrors app.js) */
const LOCALE_BCP47 = { es: 'es-ES', en: 'en-US' };

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// Modal management
// ============================================================

/**
 * Opens the shared auth modal and populates its body with the given element.
 * @param {HTMLElement} contentEl
 */
function openModal(contentEl) {
  const modal = document.getElementById('auth-modal');
  const body  = document.getElementById('auth-modal-body');
  if (!modal || !body) return;

  body.innerHTML = '';
  body.appendChild(contentEl);
  modal.removeAttribute('hidden');
  modal.setAttribute('aria-hidden', 'false');

  // Focus the first focusable element
  const firstInput = body.querySelector('input, button');
  if (firstInput) firstInput.focus();
}

function closeModal() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.setAttribute('hidden', '');
  modal.setAttribute('aria-hidden', 'true');
  const body = document.getElementById('auth-modal-body');
  if (body) body.innerHTML = '';
}

// ============================================================
// Auth section renderer (start screen injection point)
// ============================================================

/**
 * Renders the auth bar inside the given container element.
 * Called by app.js each time the start screen is rendered.
 * @param {HTMLElement} container  — the #auth-section div
 */
export function renderAuthSection(container) {
  if (!container) return;
  container.innerHTML = '';

  const user = State.getAuthUser();

  if (user) {
    // --- Authenticated state ---
    const wrapper = document.createElement('div');
    wrapper.className = 'auth-section auth-section--logged-in';

    const info = document.createElement('span');
    info.className = 'auth-user-info';
    info.textContent = `${t('auth.logged_in_as')} ${user.displayName || user.email}`;

    const mySessionsBtn = document.createElement('button');
    mySessionsBtn.className = 'btn btn-secondary btn-sm auth-btn';
    mySessionsBtn.textContent = t('auth.my_sessions');
    mySessionsBtn.addEventListener('click', showMySessionsScreen);

    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-ghost btn-sm auth-btn';
    logoutBtn.textContent = t('auth.logout');
    logoutBtn.addEventListener('click', logout);

    wrapper.appendChild(info);
    wrapper.appendChild(mySessionsBtn);
    wrapper.appendChild(logoutBtn);
    container.appendChild(wrapper);
  } else {
    // --- Guest state ---
    const wrapper = document.createElement('div');
    wrapper.className = 'auth-section auth-section--guest';

    const loginBtn = document.createElement('button');
    loginBtn.className = 'btn btn-secondary btn-sm auth-btn';
    loginBtn.textContent = t('auth.login');
    loginBtn.addEventListener('click', showLoginModal);

    const registerBtn = document.createElement('button');
    registerBtn.className = 'btn btn-ghost btn-sm auth-btn';
    registerBtn.textContent = t('auth.register');
    registerBtn.addEventListener('click', showRegisterModal);

    wrapper.appendChild(loginBtn);
    wrapper.appendChild(registerBtn);
    container.appendChild(wrapper);
  }
}

// ============================================================
// Callback: re-render auth section after auth state changes
// ============================================================

function onAuthChange() {
  closeModal();
  const container = document.getElementById('auth-section');
  renderAuthSection(container);
}

// ============================================================
// Login modal
// ============================================================

export function showLoginModal() {
  const form = buildAuthForm({
    title:        t('auth.login_title'),
    submitLabel:  t('auth.submit_login'),
    fields: [
      { name: 'email',    type: 'email',    label: t('auth.email') },
      { name: 'password', type: 'password', label: t('auth.password') },
    ],
    onSubmit: async (data, setError, setSubmitting) => {
      setSubmitting(true);
      try {
        const result = await API.login(data.email, data.password);
        State.setAuth(result.token, result.user ?? null);
        State.setRefreshToken(result.refresh_token);

        // Fetch user profile if not included in login response
        if (!result.user) {
          try {
            const me = await API.fetchMe();
            State.setAuth(result.token, me);
          } catch {
            // Non-critical — auth still valid
          }
        }
        onAuthChange();
      } catch (err) {
        const is401 = err.status === 401 || err.status === 400;
        setError(is401 ? t('auth.error_invalid_credentials') : t('auth.error_generic'));
      } finally {
        setSubmitting(false);
      }
    },
  });

  openModal(form);
}

// ============================================================
// Register modal
// ============================================================

export function showRegisterModal() {
  const form = buildAuthForm({
    title:       t('auth.register_title'),
    submitLabel: t('auth.submit_register'),
    fields: [
      { name: 'email',                type: 'email',    label: t('auth.email') },
      { name: 'password',             type: 'password', label: t('auth.password') },
      { name: 'passwordConfirmation', type: 'password', label: t('auth.password_confirm') },
    ],
    onSubmit: async (data, setError, setSubmitting) => {
      if (data.password !== data.passwordConfirmation) {
        setError(t('auth.error_passwords_mismatch'));
        return;
      }
      setSubmitting(true);
      try {
        const result = await API.register(data.email, data.password, data.passwordConfirmation);
        State.setAuth(result.token, result.user ?? null);
        State.setRefreshToken(result.refresh_token);

        if (!result.user) {
          try {
            const me = await API.fetchMe();
            State.setAuth(result.token, me);
          } catch {
            // Non-critical
          }
        }
        onAuthChange();
      } catch (err) {
        setError(t('auth.error_generic'));
      } finally {
        setSubmitting(false);
      }
    },
  });

  openModal(form);
}

// ============================================================
// Logout
// ============================================================

export function logout() {
  State.clearAuth();
  onAuthChange();
}

// ============================================================
// My Sessions screen
// ============================================================

export function showMySessionsScreen() {
  // Replace start-content with a sessions view, using the same modal pattern
  const wrapper = document.createElement('div');
  wrapper.className = 'auth-sessions-view';

  const title = document.createElement('h2');
  title.className = 'auth-sessions-title';
  title.textContent = t('auth.my_sessions_title');
  wrapper.appendChild(title);

  const statusEl = document.createElement('p');
  statusEl.className = 'auth-sessions-status';
  statusEl.textContent = t('auth.loading_sessions');
  wrapper.appendChild(statusEl);

  const listEl = document.createElement('div');
  listEl.className = 'session-list';
  wrapper.appendChild(listEl);

  openModal(wrapper);

  // Fetch sessions asynchronously
  API.fetchPlayerSessions()
    .then(sessions => {
      statusEl.remove();
      if (!sessions || sessions.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'auth-sessions-empty';
        empty.textContent = t('auth.no_sessions');
        wrapper.appendChild(empty);
        return;
      }

      const bcp47 = LOCALE_BCP47[getCurrentLocale()] || 'es-ES';
      sessions.forEach(session => {
        listEl.appendChild(buildSessionCard(session, bcp47));
      });
    })
    .catch(() => {
      statusEl.textContent = t('auth.error_generic');
    });
}

/**
 * Builds a single session card DOM element.
 * @param {object} session
 * @param {string} bcp47
 * @returns {HTMLElement}
 */
function buildSessionCard(session, bcp47) {
  const card = document.createElement('div');
  card.className = 'session-card';

  const name = session.character_name || '—';
  const genre = session.genre || '';
  const epoch = session.epoch || '';
  const meta  = [genre, epoch].filter(Boolean).join(' · ') || '—';
  const phase = session.current_phase || '—';
  const dateStr = session.created_at
    ? new Date(session.created_at).toLocaleDateString(bcp47, { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  card.innerHTML = `
    <div class="session-card__title">${escHtml(name)}</div>
    <div class="session-card__meta">
      <span>${escHtml(meta)}</span>
      <span class="session-card__phase">${escHtml(t('auth.session_phase'))}: ${escHtml(phase)}</span>
      ${dateStr ? `<span>${escHtml(t('auth.session_created'))}: ${escHtml(dateStr)}</span>` : ''}
    </div>
    <div class="session-card__actions"></div>
  `;

  const resumeBtn = document.createElement('button');
  resumeBtn.className = 'btn btn-primary btn-sm';
  resumeBtn.textContent = t('auth.resume');
  resumeBtn.addEventListener('click', () => onResumeSession(session.id, resumeBtn));
  card.querySelector('.session-card__actions').appendChild(resumeBtn);

  return card;
}

/**
 * Loads a saved session from the sessions list and navigates to it.
 * Dispatches a custom event that app.js can listen for.
 * @param {string} sessionId
 * @param {HTMLButtonElement} btn
 */
async function onResumeSession(sessionId, btn) {
  btn.disabled = true;
  btn.textContent = '...';
  try {
    // Dispatch a custom event so app.js handles routing without creating a circular dependency
    document.dispatchEvent(new CustomEvent('auth:resume-session', { detail: { sessionId } }));
    closeModal();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = t('auth.resume');
  }
}

// ============================================================
// Shared form builder
// ============================================================

/**
 * Builds a reusable auth form element.
 * @param {object} options
 * @param {string}   options.title
 * @param {string}   options.submitLabel
 * @param {Array}    options.fields        — [{ name, type, label }]
 * @param {Function} options.onSubmit      — async (data, setError, setSubmitting) => void
 * @returns {HTMLFormElement}
 */
function buildAuthForm({ title, submitLabel, fields, onSubmit }) {
  const form = document.createElement('form');
  form.className = 'auth-form';
  form.noValidate = true;

  // Title
  const titleEl = document.createElement('h3');
  titleEl.className = 'auth-form__title';
  titleEl.textContent = title;
  form.appendChild(titleEl);

  // Fields
  const inputMap = {};
  fields.forEach(({ name, type, label }) => {
    const fieldWrapper = document.createElement('div');
    fieldWrapper.className = 'auth-form__field';

    const labelEl = document.createElement('label');
    labelEl.className = 'auth-form__label';
    labelEl.textContent = label;
    labelEl.setAttribute('for', `auth-field-${name}`);

    const input = document.createElement('input');
    input.className = 'auth-form__input';
    input.type  = type;
    input.id    = `auth-field-${name}`;
    input.name  = name;
    input.autocomplete = type === 'password' ? 'current-password' : 'email';
    input.required = true;

    fieldWrapper.appendChild(labelEl);
    fieldWrapper.appendChild(input);
    form.appendChild(fieldWrapper);
    inputMap[name] = input;
  });

  // Error message area
  const errorEl = document.createElement('div');
  errorEl.className = 'auth-form__error';
  errorEl.setAttribute('aria-live', 'polite');
  errorEl.setAttribute('role', 'alert');
  form.appendChild(errorEl);

  // Submit button
  const submitBtn = document.createElement('button');
  submitBtn.className = 'btn btn-primary btn-full';
  submitBtn.type = 'submit';
  submitBtn.innerHTML = `<span class="btn-text">${escHtml(submitLabel)}</span><span class="btn-spinner"><span class="spinner"></span></span>`;
  form.appendChild(submitBtn);

  // Helpers passed to the onSubmit callback
  function setError(msg) {
    errorEl.textContent = msg || '';
  }

  function setSubmitting(loading) {
    submitBtn.disabled = loading;
    submitBtn.classList.toggle('loading', loading);
  }

  // Submit handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setError('');

    const data = {};
    for (const [name, input] of Object.entries(inputMap)) {
      data[name] = input.value.trim();
    }

    await onSubmit(data, setError, setSubmitting);
  });

  return form;
}
