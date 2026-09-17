# Comments about the package.json

Since JSON does not allow comments and since `package.json` is central for any JS project and the
heart of its configuration, let's keep here any comments, decisions, design notes etc.


## Versioning policy - 17/09/2026

Every version is pinned exactly; no `^` or `~` ranges. `.npmrc` sets `save-exact=true`, so `npm install <pkg>`
keeps new entries that way without anyone having to remember.

The lockfile is committed and the Docker image builds with `npm ci`, so ranges would buy no reproducibility —
they would only let versions move without leaving a trace in the `package.json` diff. Pinning makes every
upgrade a deliberate, reviewable edit. When the policy was adopted, all 9 remaining caret ranges were already
resolving at their declared floor, so converting them moved nothing in the installed tree — the point is to
keep it that way. `typescript` is the entry that needs it most: `typescript-eslint` caps its peer range below
6.1.0, so a caret lets an install without the lockfile pick up a version that silently violates it.

The cost is that nothing refreshes on its own, so re-check regularly:

```bash
npm outdated              # what has moved
npx npm-check-updates -i  # pick and apply, then run the full gate
```


## Held back

Document any packages that are deliberately held back.

Format is the following - update the date every time you re-assess:

> ### package-name - dd/mm/yyyy - pinned version - newest version
>
> Reasoning...


### ~~jsdom - 18/02/2026 - 24.x - 27.x~~

ChatGPT claims there is an issue/conflict because Ionic / Stencil components do not yet support JSDOM 27+. I could not find any actual reference, but no better solution either, so holding this package back for the time being.

**Resolution (2026/02/18):** ChatGRP offered a solution with shims in `setupTests.ts` that works around the problem.


### react-router/react-router-dom - 17/09/2026 - 6.30.6 - 8.4.0

Incompatible with ionic-router.

**Update (2026/09/17):** Ionic 9 rebuilt its React router integration on react-router 6, so the floor moved
from 5.x to 6.30.x. `@ionic/react-router@9` declares `react-router@">=6.4.0 <7"`, so 7.x and 8.x are both out of reach.

That leaves two unfixable advisories on 6.30.6, which is the newest 6.x:
[GHSA-wrjc-x8rr-h8h6](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6) (open redirect via backslash in
`<Link>` and `useNavigate`, `>=6.0.0 <7.18.0`) and
[GHSA-337j-9hxr-rhxg](https://github.com/advisories/GHSA-337j-9hxr-rhxg) (arbitrary constructor injection via
`deserializeErrors()` during SSR hydration, `>=6.4.0 <7.18.0`). Both are fixed only in 7.18.0 and later, which
the Ionic peer range forbids, so there is no version that is both patched and installable.

Neither is reachable in this app: there is no SSR or `hydrateRoot` anywhere, and every navigation target is a
hardcoded literal — the `routerLink` in `Menu.tsx` is fed from fixed props, so no user input reaches a route.
Re-check both assumptions if a route is ever built from a URL parameter, form field or API response.


### ~~eslint - 17/09/2026 - 9.x - 10.x~~

At least `eslint-plugin-react`, `eslint-plugin-react-hooks` have a peer dependency on `eslint@"^... || ^9"`.

**Resolution (2026/09/17):** `eslint-plugin-react-hooks` accepts eslint 10 as of 7.x. `eslint-plugin-react` was
declared but never referenced from `eslint.config.js`, and was the only remaining cap on eslint 9; it is replaced
by `@eslint-react/eslint-plugin`, which declares no eslint version cap. Two notes for the future: eslint 10 no
longer depends on `@eslint/js`, so that is now a direct devDependency; and `@eslint-react`'s
`disable-conflict-eslint-plugin-react-hooks` preset is deliberately *not* used, because it switches off
`eslint-plugin-react-hooks` (including `rules-of-hooks` and `exhaustive-deps`) in favour of its own.


### ~~typescript - 09/05/2026 - 5.x - 6.x~~

Because `typescript-eslint` does not support it.

**Resolution (before 2026/05/09):** Supported and works fine.


### typescript - 17/09/2026 - 6.0.3 - 7.0.2

TypeScript 7.0 is the native (Go) compiler and **ships no programmatic API at all** — `require('typescript')`
yields only `{ version, versionMajorMinor }`. The API returns in 7.1
([microsoft/TypeScript#63875](https://github.com/microsoft/TypeScript/issues/63875), milestone
"TypeScript 7.1.0 Beta", no due date).

typescript-eslint refuses to load against it outright: its entry point reads `ts.versionMajorMinor` and throws
`typescript-eslint does not support TS 7.0.` before anything else runs. That takes the whole lint step down,
type-aware rules and all — and because `vite.config.ts` runs `@nabla/vite-plugin-eslint`, it takes
`npm run build` and `npm run dev` with it, not just `npm run lint`. It is not a version-range quibble that an
override could paper over: no released or prerelease typescript-eslint supports TS 7
([typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)). A prototype
built on the 7.1 native parser API is in draft
([typescript-eslint#12803](https://github.com/typescript-eslint/typescript-eslint/pull/12803)); the maintainers
have published no ETA beyond "I don't know how long it will take".

TS 7 *can* be run today alongside a TS 6 API package, per Microsoft's documented side-by-side layout
(`"@typescript/native": "npm:typescript@7.0.2"` for the `tsc` binary plus
`"typescript": "npm:@typescript/typescript6@6.0.2"` for what tools import). That layout was built and measured
on the sibling `howibuy-front`, which runs the same toolchain: it works — lint stays green, both compilers flag
the same errors, and `tsc` gets ~3.4x faster.

It was rejected anyway. Under a second on projects this size does not pay for two compilers in the tree, two
sets of type semantics (lint checking with TS 6 while the build checks with TS 7), a `tsc`/`tsc6` split that
every contributor has to learn, and an IDE caveat — the TS 6 API package has no `lib/tsserver.js`, so editors
told to use the workspace TypeScript find no language service.

**Revisit when TypeScript 7.1 ships the new API and typescript-eslint supports it.** At that point this becomes
an ordinary version bump of a single `"typescript"` entry, with no aliases and no split.
