# Contributing to Baby Name Picker

This guide covers local development, Firebase configuration, architecture, and deployment. The main [README](./README.md) is intentionally focused on people using the application.

## Local development

Requirements: Node.js 22 or newer and npm.

```bash
npm install
npm run dev
```

Without Firebase environment variables, **Start a room** launches a local demo with a simulated partner. The demo still calls the public name API and supports swiping, matches, keyboard controls, and the responsive interface.

## Commands

```bash
npm run dev      # local development
npm test         # unit tests
npm run lint     # ESLint
npm run build    # production build
npm run preview  # serve the production build locally
```

## Firebase configuration

Real two-person rooms use Firebase's no-cost Spark plan.

1. Create a project in the [Firebase console](https://console.firebase.google.com/) and keep it on **Spark**.
2. Register a Web app from Project settings. Firebase Hosting is not required.
3. Under **Authentication → Sign-in method**, enable **Anonymous**.
4. Create the default **Realtime Database** in locked mode.
5. Publish [`firebase.rules.json`](./firebase.rules.json) in the Realtime Database Rules tab.
6. Add the GitHub Pages hostname to the Firebase Authentication authorized domains.
7. Copy `.env.example` to `.env.local` and add the public web configuration:

```dotenv
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

Restart the development server. The app header should change from **Local preview** to **Live rooms ready**.

Firebase web configuration values identify the Firebase project; they are not server secrets. Access control lives in the database rules.

### Session data behavior

- Rooms reject client reads after 24 hours.
- Presence is removed automatically when a browser disconnects.
- Choosing **Leave room** removes that member and their choices.
- The room creator can choose **End for everyone** to delete the room immediately.

The Spark plan does not include a scheduled cleanup process. Expired rooms that were not ended can remain stored but inaccessible. They can be periodically removed from the Firebase console.

The product interface hides individual decisions. Because both clients read shared room state to calculate matches without a server function, this architecture is intended for a trusted pair rather than adversarial or sensitive-data use cases.

## Name source

The app requests version 1.4 of the [Random User Generator API](https://randomuser.me/documentation) using:

```text
nat=us,gb,ie,ca,au,nz
```

Returned names are checked against the conventional English-language allowlist in `src/lib/names.ts`. The same list supplies fallback names when the API is unavailable.

## Architecture

```text
GitHub Pages (React + TypeScript + Vite)
  ├─ fetches and filters a name deck from randomuser.me
  ├─ falls back to a bundled name collection
  └─ synchronizes room state through Firebase
       ├─ Anonymous Authentication (browser-session identity)
       └─ Realtime Database (rooms, members, presence, choices)
```

## GitHub Pages deployment

The workflow in `.github/workflows/deploy.yml` runs tests, builds the Vite application, and publishes `dist` whenever `main` changes.

Repository Actions variables required by the build:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_DATABASE_URL
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_APP_ID
```

In **Settings → Pages**, the publishing source must be set to **GitHub Actions**. Vite uses relative asset paths, so the output works under a GitHub project-site subpath.
