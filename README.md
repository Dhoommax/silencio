# SILENCIO

Silencio is a local-first voice, transcription, and text-to-speech studio built with React, TypeScript, and Vite.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy with Vercel

Import this repository into Vercel with these settings:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

The current app stores recordings, transcripts, and settings in the browser using IndexedDB. AI and translation services are integration-ready demo layers and do not expose API keys in the frontend.