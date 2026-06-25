# Collections Dashboard

A private web library for organizing and searching saved websites.

Live site: [collection-dashboard-9dh.pages.dev](https://collection-dashboard-9dh.pages.dev)

## Features

- Create collections and save website links
- Edit saved website titles and URLs
- Auto-fill website titles when a page title can be read
- Search and filter by collection
- Supabase email/password authentication
- Private cloud data for each account
- Guest mode with browser-only local storage
- JSON import and export
- Light and dark appearance themes
- Website favicons with letter fallbacks

## Technology

- React 19
- TypeScript
- Vite
- Supabase Authentication and PostgreSQL
- Cloudflare Pages and Pages Functions

## Run locally

Install dependencies:

```powershell
npm install
```

Copy `.env.example` to `.env.local` and provide:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Only use a Supabase publishable key in the frontend. Never use a secret or
service-role key.

Start the dashboard:

```powershell
npm run dev
```

To auto-fill titles for blank website names during local development, also
start the local title helper:

```powershell
npm run api
```

On Windows, you can also double-click `run-dashboard.bat` to start both the
title helper and dashboard.

## Production build

```powershell
npm run build
npm run preview
```

## Supabase

The app expects two tables:

- `collections`
- `websites`

Both tables use Row Level Security so signed-in users can access only rows
belonging to their own user ID.

Authentication URL configuration should include:

- The deployed Cloudflare Pages URL
- `http://localhost:5173` for local development

## Cloudflare Pages

Build settings:

```text
Build command: npm run build
Build output directory: dist
Production branch: main
```

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as Cloudflare Pages
environment variables.

Cloudflare automatically builds and deploys the website after changes are
pushed to the GitHub `main` branch.

The `/api/title` Cloudflare Pages Function is deployed from
`functions/api/title.js`. It reads public page titles for saved websites when
the title field is left blank.

## Data and security

- Cloud data is private to each Supabase account.
- Local-mode data stays in that browser and device.
- Export files contain collections and websites only.
- `.env.local`, local JSON data, dependencies, and build output are excluded
  from Git.
