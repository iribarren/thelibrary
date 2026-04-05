---
name: Frontend Test Conventions
description: Vitest + @vue/test-utils setup, file locations, i18n stubbing pattern, and store test patterns for the thelibrary frontend.
type: project
---

**Framework**: Vitest 3.x + @vue/test-utils 2.x. Globals enabled via `vite.config.js` (`test.globals: true`), environment is `jsdom`.

**Run command**: `npx vitest run` (or `npm test`) from `thelibrary/`.

**Test file location**: Co-located alongside the source file (e.g., `src/components/Foo.test.js`, `src/stores/bar.test.js`).

**i18n stubbing for components**: Create a real `createI18n` instance with `legacy: false` and pass it via `global: { plugins: [i18n] }` in `mount()`. Do not use a mock/stub object — the real plugin is required for `useI18n()` to work inside `<script setup>`.

**Store tests**: Use `setActivePinia(createPinia())` in `beforeEach`; clear `localStorage` in both `beforeEach` and `afterEach`. Use a `makeGame(overrides)` factory to build fixture objects.

**Component mount helper pattern**: Define a `mountSelector(props)` wrapper around `mount()` that spreads required defaults so individual tests only specify what they care about.

**View component mocking**: When mounting a view that imports `@/api/index.js` and `@/composables/useNavigation.js`, mock both with `vi.mock()` at the top of the test file. Stub `AppLayout` with `{ template: '<div><slot /></div>' }` and `MessageBar` with `{ template: '<div />' }` via `global.stubs`. This avoids router setup (useNavigation calls useRouter) while still exercising the real component template and store integration.

**Why:** Established by existing `src/stores/game.test.js`, `src/stores/auth.test.js`, and `src/views/aventura-rapida/PrologueView.test.js`.
**How to apply:** Follow these patterns exactly when adding new test files — no separate `__tests__/` directory, no Jest-style manual mocks.
