# Pastel Pages

A small personal website for writing, photographs, and everyday musings. The built-in Studio lets you draft entries and assemble albums in the browser.

## How publishing works

Studio edits are saved privately in your current browser. In **Studio → Publish & backup**, download `content.json`. Replace `public/content.json` with that file and commit it to make the changes public for every visitor.

This keeps the website fully static: no database, subscription, or private API keys are needed.

## Run locally

```bash
npm ci
npm run dev
```

## Host on GitHub Pages

1. Create a GitHub repository and add this project.
2. Push it to the `main` branch.
3. In **Settings → Pages**, select **GitHub Actions** as the source.
4. The included workflow builds and publishes the site automatically.

The `build:pages` script creates a static bundle in `github-pages/`. The regular `build` script creates the Sites-hosted version.
