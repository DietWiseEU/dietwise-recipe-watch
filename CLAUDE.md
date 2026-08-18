# CLAUDE.md

Context for AI assistants working in this repository. Read this before making changes.

## What this is

This repository implements the **RecipeWatch** mobile application, a component of the EU-funded [DietWise](https://dietwise.eu/) project, developed at ICCS. The app is user-facing branded as **"MyRecipeWatch"** (see `capacitor.config.ts`, i18n strings) but the project, package, repo, and most internal identifiers still read `RecipeWatch` / `recipe-watch`. Treat the two names as synonymous; do not "fix" one to the other without instruction.

Functional purpose (per the Grant Agreement, `Grant Agreement - GAP-DIETWISE SHORT-Ε.md`): a citizen-facing app that scans an online recipe URL, evaluates it against national nutrition guidelines, and proposes ingredient-level corrections the user can accept or reject. The user can register, set a personal profile (gender, year of birth, country), and the app learns from accept/reject feedback. This repo is the **front end only**; the actual recipe scraping, NLP, and rules live in a separate backend (see `apiServerHost`).

## Tech stack

- **Ionic React 9 + Capacitor 8** — single codebase targeting web, Android and iOS.
- **React 19, TypeScript 6**, build with **Vite 8** (`vite.config.ts`). Path alias `@/` → `src/`.
- **Jotai 2** for state. `atomWithReducer` for the recipe page's main state machine; `atomWithObservable` to bridge `ionic-appauth` RxJS streams into atoms.
- **react-i18next** for translations. Languages: `en`, `el`, `lt`, `nl` (only `en` is currently exposed in the Settings UI — others are commented out in `SettingsPage.tsx`).
- **ionic-appauth** for OIDC/PKCE auth against **Keycloak** (realm `dietwise`, client_id `recipewatch`).
- **capacitor-secure-storage-plugin** for persisting settings and OIDC tokens.
- **Vitest + jsdom** for unit tests, **Cypress** for e2e. Testing is sparse — most coverage is on pure reducers/utils under `src/recipe/`.
- **ESLint (flat config) + Prettier**. Style: tabs, single quotes, semi, 120 cols, trailing commas (see `.prettierrc.json5`).

## Layout (`src/`)

Feature-folder structure. Each feature typically has its own `model.ts`, `atoms.ts`, `api.ts`, page component, and tests colocated.

```
src/
  App.tsx, main.tsx        Bootstrap: load config → init auth → restore token → mount React tree
  model.ts                 Shared base `Action` interface
  auth/                    OIDC PKCE via ionic-appauth, token atoms, MobilePreviewAwareBrowser
  common/                  streamJson — newline-delimited JSON streaming over fetch
  components/Menu.tsx      Side menu (shows logged-in email, gated nav items)
  config/                  AppConfig (auth/api hosts) + Jotai atoms + runtime loader
  home/                    Landing page
  i18n/                    {en,el,lt,nl}.json + configureI18n
  onboarding/              First-run introduction, opened once and then from the home page
  personalization/         Personal info form, atoms (uses atomWithRefresh + unwrap)
  recipe/                  The core: URL entry → streaming assessment → suggestions UI
    actions.ts             Action creators + discriminated union (MainAction)
    reducer.ts             State machine: INITIAL→PENDING→{SUCCESS|FAILURE|SELECT_RECIPE}
    reducers/              Sub-reducers (calculateRating, accept/reject suggestion)
    assessRecipe.ts        Wires streamJson to the /recipe/assess/url endpoint
    api.ts                 POST /statistics/{action} for accept/reject telemetry
    components/             Recipe + Suggestions UI, SplitPane, modals
    help/                  Help modal content
  services/                ionic-appauth Requestor abstraction (Capacitor on iOS, fetch elsewhere)
  settings/                Language selector backed by secure storage
  theme/variables.css      Ionic theme tokens
```

Routes are declared in `src/App.tsx`: `/Home`, `/Recipe`, `/Personalization`, `/Settings`, plus `/authcallback`, `/endsession`. `/` redirects to `/Home`.

## Backend integration

Two hosts, both required:

- `authServerHost` — Keycloak realm base URL (e.g. `https://.../realms/dietwise`)
- `apiServerHost` — Backend API base (e.g. `https://.../api/v1`)

Resolution order (`src/config/loadAppConfig.ts`):

1. **Runtime** `${BASE_URL}config.json` — fetched at startup on web only (Capacitor native skips this step).
2. **Build-time** `VITE_AUTH_SERVER_HOST` / `VITE_API_SERVER_HOST`.
3. **Hardcoded localhost fallback** in `src/config/model.ts`.

This lets a single Docker artifact be re-pointed per environment by mounting a different `config.json`. When adding a new app-wide config value, plumb it through both the runtime and env paths to keep parity.

### Recipe assessment streaming

`POST ${apiServerHost}/recipe/assess/url` returns **newline-delimited JSON** (NDJSON). Each line is a `RecipeAssessmentMessage` with a `type` discriminator: `RECIPES`, `MORE_THAN_ONE_RECIPE`, `SUGGESTIONS`, `SCORING`, `ERROR`. See `src/common/streamJson.ts` for the reader and `src/recipe/reducer.ts` for the state transitions each message triggers. The reducer **throws** on out-of-order messages (e.g. a `SCORING` when not `PENDING`); if you add new message types, update both the union in `src/recipe/model.ts` and the exhaustive `switch` in the reducer.

### Auth quirks

- Native (Capacitor) uses the custom URL scheme `eu.dietwise.recipewatch://authcallback`; web uses `${basePath}/authcallback`. `basePath` is derived from `BASE_URL` so a non-root deployment (e.g. `/recipewatch/`) keeps working.
- The **mobile-preview** page (`mobile-preview.html`) embeds the web app in an iframe to demo the mobile UX in a desktop browser. Keycloak refuses to be framed, so `MobilePreviewAwareBrowser` (`src/auth/mobilePreviewAuth.ts`) opens the OIDC URL in `_top` and stashes the return path in `sessionStorage` so the iframe can navigate back after the redirect. Don't simplify this unless you've verified the framed flow still works.
- `LOG_SENSITIVE_DATA` (`src/common/logging.ts`) gates verbose auth logging. Don't log tokens or user info unconditionally.

## Build & dev commands

```bash
npm run dev                  # Vite dev server (web)
npm run build                # tsc + vite build → dist/
npm run build:mobile-preview # build that also emits mobile-preview.html
npm run lint                 # ESLint
npm run test                 # Vitest
npm run i18n:csv:export      # Export translation strings to CSV
npm run i18n:csv:import      # Import translated CSV back
npm run assets:android       # Regenerate Android icons/splash from resources/logo.png + cap sync
npm run set-app-version -- 5 # Stamp native version: versionName/MARKETING_VERSION ← package.json, versionCode/CURRENT_PROJECT_VERSION ← arg
```

Android release flow and Docker build are documented in `README.md` — don't duplicate them here.

## Conventions & gotchas

- **Naming**: the package is `recipe-watch`, the Capacitor `appId` is `eu.dietwise.recipewatch`, the UI title is "MyRecipeWatch", the Keycloak `client_id` is `recipewatch`. Each lives where it does for a reason; don't unify them casually.
- **Path imports**: use `@/...` for cross-feature imports, relative for same-folder. Both `tsconfig.json` and `vite.config.ts` are wired for it.
- **Held-back dependencies**: see `package.json-comments.md`. `react-router` is pinned to 6.x because `@ionic/react-router` peers on `>=6.4.0 <7`. Don't propose upgrading these without checking that note first.
- **Sensitive logging**: console.log of tokens, user info, or personal data must be gated on `LOG_SENSITIVE_DATA` from `@/common/logging`. Import it rather than redeclaring it per file: in a `.tsx` file a local `const LOG_SENSITIVE_DATA = import.meta.env.DEV` trips `react-refresh/only-export-components`, whose component heuristic matches both the SCREAMING_SNAKE name and the `.DEV` property.
- **State transitions** in the recipe reducer throw on unexpected combinations — this is intentional defensive code, not something to soften into `console.warn`s.
- **JSON Lines hack**: `src/recipe/reducer.ts` does `text.replaceAll('\\n', '\n').trimStart()` on incoming recipe text. The comments mark this as a hack — if you find yourself touching it, also check the backend producing the field rather than piling on more string surgery.
- **Settings storage** uses `capacitor-secure-storage-plugin` under the key `recipewatch.settings`. If you bump the schema, write a migration in `mergeLoadedSettings` rather than reading raw.
- **JSDom 28 + Stencil**: `src/setupTests.ts` installs an `adoptedStyleSheets` shim. Don't remove it; without it Ionic components fail to initialize under Vitest.
- **Ionic components under Vitest**: `vite.config.ts` resolves test runs with the browser export conditions and inlines `@lit/react` / `@stencil/react-output-target`. The Ionic React wrappers set element properties through `@lit/react`, whose Node build does not do that at all — without both settings every Ionic component renders with none of its props and assertions on `value`/`label` fail.
- **App version**: `package.json` `version` is **not** read by the native builds. `scripts/set-app-version.mjs` is the single source of truth — it stamps `android/app/build.gradle` and the iOS `project.pbxproj` from `package.json` plus a required build-number arg. The store-facing build number (`versionCode` / `CURRENT_PROJECT_VERSION`) must strictly increase per upload; the user-visible version need not. Release flow is in README "App versioning".

## Things this app does *not* do (yet)

- No backend recipe logic — that's a separate service.
- No offline mode, no recipe history persistence beyond the in-memory Jotai state.

## When in doubt

- Architecture or scope questions: discuss before implementing.
- For the project's broader scientific/policy context, the Grant Agreement excerpt is the authoritative source (note: it still uses the old "RecipeWatch" name).
