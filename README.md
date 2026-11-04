# Launch7 frontend

Standalone Vite + React frontend for the Launch7 venture operating system.

## Scope

This repository contains frontend-only UI and local demo state for the eight Launch7 workstreams:

1. Brand & collateral
2. Product & technology
3. Apps & integrations
4. Legal & formation
5. Finance & ownership
6. People & operations
7. Partners & capital
8. Launch preparation

The UI includes venture creation, guided setup, task board, progress notes, evidence placeholders and final launch review. Data is stored in browser localStorage so the flows are usable before a backend exists. No real provider, AI, email, storage, credential or deployment calls are made.

## Run locally

```bash
npm install
npm run dev
```

`src/lib/api.js` is the backend adapter seam. Replace its methods with authenticated Launch7 API calls when the backend is available.
