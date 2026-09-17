# Comments about the package.json

Since JSON does not allow comments and since `package.json` is central for any JS project and the
heart of its configuration, let's keep here any comments, decisions, design notes etc.


## Held back

Document any packages that are deliberately held back.

Format is:

> ### package-name - pinned version - newest version
>
> Reasoning...


### ~~jsdom - 24.x - 27.x~~

ChatGPT claims there is an issue/conflict because Ionic / Stencil components do not yet support JSDOM 27+. I could not find any actual reference, but no better solution either, so holding this package back for the time being.

**Resolution (2026/02/18):** ChatGRP offered a solution with shims in `setupTests.ts` that works around the problem.


### react-router/react-router-dom - 5.x - 7.x

Incompatible with ionic-router.


### ~~eslint: 9.x - 10.x~~

At least `eslint-plugin-react`, `eslint-plugin-react-hooks` have a peer dependency on `eslint@"^... || ^9"`.

**Resolution (2026/09/17):** `eslint-plugin-react-hooks` accepts eslint 10 as of 7.x. `eslint-plugin-react` was
declared but never referenced from `eslint.config.js`, and was the only remaining cap on eslint 9; it is replaced
by `@eslint-react/eslint-plugin`, which declares no eslint version cap. Two notes for the future: eslint 10 no
longer depends on `@eslint/js`, so that is now a direct devDependency; and `@eslint-react`'s
`disable-conflict-eslint-plugin-react-hooks` preset is deliberately *not* used, because it switches off
`eslint-plugin-react-hooks` (including `rules-of-hooks` and `exhaustive-deps`) in favour of its own.


### ~~typescript: 5.x - 6.x~~

Because `typescript-eslint` does not support it.

**Resolution (before 2026/05/09):** Supported and works fine.
