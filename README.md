# Baby Name Picker

A mobile-first baby name picker for two people. Both partners swipe through the same deck independently; mutual likes appear as matches. The frontend is static and deploys to GitHub Pages.

## Can this be completely free?

Yes, for a personal or small shared app:

- **Hosting:** GitHub Pages is free from a public repository on GitHub Free.
- **Live rooms:** Firebase's no-cost Spark plan requires no payment method. Its Realtime Database allowance currently includes 100 simultaneous connections, 1 GB stored, and 10 GB/month downloaded—far more than a two-person personal app should use.
- **Names:** [Random User Generator](https://randomuser.me/) is a public, no-key API. The app has a built-in fallback deck if it is unavailable.
- **Local preview:** With no Firebase variables, the app automatically opens a demo room with a simulated partner.

GitHub Pages itself only serves static files. It cannot provide a shared database, WebSocket server, or session process. Firebase is the small realtime layer that lets two separate browsers see the same room.

## Run locally

```bash
npm install
npm run dev
```

Without a `.env` file, **Start a room** launches demo mode. The demo still calls the public name API and lets you test swiping, matches, keyboard controls, and the responsive UI.

## Enable real two-person rooms (Firebase Spark plan)

1. Create a project in the [Firebase console](https://console.firebase.google.com/) and keep it on **Spark**. Do not attach a billing account.
2. Add a Web app from Project settings. Copy the public Firebase configuration values.
3. Open **Build → Authentication → Sign-in method** and enable **Anonymous**.
4. Open **Build → Realtime Database**, create the default database, then publish the contents of [`firebase.rules.json`](./firebase.rules.json) in the Rules tab. Do not leave the database in Test mode.
5. Copy `.env.example` to `.env.local` and fill in the five values:

```dotenv
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

6. Restart `npm run dev`. The header should say **Live rooms ready**.

Firebase web configuration values identify the Firebase project; they are not server secrets. Access control lives in the database rules. This app limits a room to two anonymous members, permits users to write only their own choices, and rejects reads after the room's expiration time.

### Session data behavior

- Rooms expire for client access after 24 hours.
- Presence is removed automatically when a browser disconnects.
- A member choosing **Leave room** removes their membership and choices.
- The room creator choosing **End for everyone** deletes the whole room immediately.

The Spark plan does not include a server-side scheduled cleanup job. If a creator never ends a room, expired data remains inaccessible but may remain stored in Firebase. For personal use this is tiny; periodically deleting expired rooms in the Firebase console keeps storage truly ephemeral without enabling billing.

> Privacy note: the app UI never reveals individual likes or passes. Because both clients can read the shared room to calculate matches without a paid server function, this is appropriate for a trusted pair, not an adversarial or sensitive-data use case.

## Deploy to GitHub Pages

1. Create a **public** GitHub repository and push this project to its `main` branch.
2. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Open **Settings → Secrets and variables → Actions → Variables**. Add the same five `VITE_FIREBASE_*` values shown above as repository variables.
4. Run the **Deploy to GitHub Pages** workflow, or push to `main`.

The included workflow runs the tests, builds the Vite app, and deploys `dist`. Vite uses relative asset paths, so it works at both `username.github.io` and `username.github.io/repository-name`.

## Commands

```bash
npm run dev      # local development
npm test         # unit tests
npm run lint     # ESLint
npm run build    # production build
npm run preview  # serve the production build locally
```

## Architecture

```text
GitHub Pages (React + Vite)
  ├─ fetches a name deck from randomuser.me
  ├─ falls back to a bundled name collection
  └─ syncs room state through Firebase
       ├─ Anonymous Auth (browser-session identity)
       └─ Realtime Database (room, members, presence, choices)
```
