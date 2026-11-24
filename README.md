# RecipeWatch

An application for users among the general public who are interested in making healthier and more sustainable choices with regard to their cooking habits. A component of [DietWise](https://dietwise.eu/).

## Backend endpoint configuration

`authServerHost` and `apiServerHost` are environment-specific and are resolved in this order:

1. Runtime `config.json` (served from `${BASE_URL}config.json`)
2. Build-time env vars `VITE_AUTH_SERVER_HOST` and `VITE_API_SERVER_HOST` (for the API host, remember to append `/api/v1`)
3. Local fallback defaults (`localhost`)

This allows:
- one artifact with per-environment runtime overrides (`public/config.json` or mounted replacement),
- plus optional build-time overrides for CI/dev.

## Rating logging

`logRating` prints the recipe rating and the components it is made of to the browser console. It is resolved in the same order: `"logRating": true` in `config.json`, then `VITE_LOG_RATING=true` (set in `.env.development`), and is off otherwise.

To turn it on in a container, mount a `config.json` that sets it. The mounted file replaces the bundled one, so give it the hosts too:

```bash
docker run -d --name recipe-watch-web -p 8080:80 \
	-v "$PWD/config.json:/usr/share/nginx/html/config.json:ro" recipe-watch-web:local
```

(With a `VITE_BASE_PATH` the file lives under it, e.g. `/usr/share/nginx/html/recipewatch/config.json`.) The app fetches `config.json` uncached, so a change to the mounted file applies on the next page load. An editor that replaces the file instead of rewriting it leaves the container seeing the old one; restart the container then.

## Docker deploy (web testing)

This repository includes a production-style static web container:
- Build stage: Node + Vite
- Runtime stage: Nginx serving `dist/`

### Build image

```bash
docker build -t recipe-watch-web:local .
```

The env variable `VITE_BASE_PATH` controls the context path, so building like:

```bash
docker build --build-arg VITE_BASE_PATH=/recipewatch/ -t recipe-watch:test .
```

Makes the app available at `http://localhost:5173/recipewatch`.

To set backend hosts at build time:

```bash
VITE_AUTH_SERVER_HOST=https://auth.example.com/realms/dietwise \
VITE_API_SERVER_HOST=https://api.example.com/api/v1 \
docker build -t recipe-watch-web:local .
```

### Run container

```bash
docker run -d --name recipe-watch-web -p 8080:80 recipe-watch-web:local
```

App URL:
- `http://localhost:8080/`

Health endpoint:
- `http://localhost:8080/healthz`

Mobile preview URL:
- `http://localhost:8080/mobile-preview`


## App versioning

Native release builds carry their own version numbers; bumping `version` in `package.json` does **not** propagate to them. Stamp both platforms with one command:

```bash
npm run set-app-version -- <buildNumber>
# equivalently: node scripts/set-app-version.mjs <buildNumber>
```

In both `android/app/build.gradle` and `ios/App/App.xcodeproj/project.pbxproj` (Debug + Release configs) this sets:

- the **user-visible version** (`versionName` / `MARKETING_VERSION`) to the `version` from `package.json`, and
- the **build number** (`versionCode` / `CURRENT_PROJECT_VERSION`) to `<buildNumber>`.

`<buildNumber>` is a required integer and must be **higher than the largest build already uploaded** to Google Play / App Store Connect — both stores reject an upload whose build number isn't greater than the previous one. The user-visible version itself does not have to increase.

Release flow: bump `version` in `package.json`, run the command above with the next build number, then build and sync the native project.

## Android

First time only:

```bash
npm install @capacitor/android
npx cap add android
```

```bash
rm -rf dist/
export VITE_API_SERVER_HOST=https://dietwise.ispatial.survey.ntua.gr/api/v1
export VITE_AUTH_SERVER_HOST=https://gaia.ispatial.survey.ntua.gr/prod/idm/realms/dietwise
npm run build
npx cap sync
```

Got to `chrome://inspect/#devices` to debug.

To release: set the version with `npm run set-app-version -- <buildNumber>` (see [App versioning](#app-versioning)), then build the release artifact.


### Android app icon and splash generation

This repository is set up to generate Android launcher icons and splash screens from a single source image.

#### One-time setup

Install the official Capacitor asset tool:

```bash
npm install --save-dev @capacitor/assets
```

#### Source image

Put a square logo image at:

```text
resources/logo.png
```

Recommended:

- PNG format
- at least `1024x1024`
- transparent background if you want the generated white background to show through cleanly

#### Generate Android assets

Run:

```bash
npm run assets:android
```

This will:

- generate Android icon and splash assets from `resources/logo.png`
- write them into `android/app/src/main/res/...`
- run `npx cap sync android` so the native project stays in sync

#### Notes

- The current script uses white for both icon and splash backgrounds.
- If Android Studio still shows an old launcher icon after regeneration, uninstall the app from the device or emulator and reinstall it.
- For available generation flags, run:

```bash
npm run assets:help
```
