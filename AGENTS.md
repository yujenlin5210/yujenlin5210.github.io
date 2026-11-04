# AGENTS

Canonical guide for AI agents (Claude, Gemini, Codex, …) working in this repo.
`CLAUDE.md` and `GEMINI.md` only import this file — edit here, not there.

## What this is

Yu-Jen Lin's portfolio (AR/VR, interaction design, prototyping), deployed to GitHub Pages from `master` by `.github/workflows/deploy.yml`.

Stack: Astro 6 (static) · React 19 islands · Tailwind CSS v4 · MDX content collections · Framer Motion · Three.js / React Three Fiber.

## Commands (repo root)

- `npm install` — install dependencies
- `npm run dev` — dev server on http://localhost:4321 (`npm run dev:clean` clears the Vite cache first)
- `npm run check` — full gate: `astro check` + `eslint` + `build` + built-HTML validation. Run it before calling work done.

## Repo map

- `src/pages` — routes: `/`, `/about`, `/projects`, `/projects/[id]`, `/lab`, `/lab/[id]`
- `src/content/projects`, `src/content/lab` — Markdown/MDX entries; schema in `src/content.config.ts`
- `src/components` — React islands and presentation components
- `src/layouts/Layout.astro` — shell, nav, footer, `ClientRouter`; mounts the `/projects` stickman
- `src/utils/content.ts` — date parsing/sorting helpers (use these, never `new Date(id.slice(…))`)
- `src/utils/filterTags.ts` — strip internal tags before rendering
- `src/hooks/usePrefersReducedMotion.js` — shared reduced-motion hook
- `public/assets` — images, video, docs. Large binaries are in **Git LFS**
- `_legacy/` — archived Jekyll site. Reference only; don't edit
- `dist/` — build output; don't edit
- `docs/architecture.md` — human-facing architecture overview
- `docs/stickman.md` — the character animation systems (three generations) and their status
- `docs/tutorial-authoring.md` — required pattern for textbook-style lab tutorials

## Rules

- In `.astro` files use `class`, not `className`.
- Render public tags through `filterTags`; sort/display dates through `src/utils/content.ts`.
- Prefer `client:visible` / `client:idle` over `client:load` unless eager hydration is needed.
- Motion-heavy islands must honor reduced motion via `usePrefersReducedMotion`.
- Inline scripts in Astro pages must be idempotent across `ClientRouter` navigations and clean up on swap.
- MDX lab posts that break out of the prose column use a `-translate-x-1/2` wrapper. That transform traps `position: fixed`, so portal fixed overlays to `document.body`.
- New lab post = `src/content/lab/YYYY-MM-DD-slug.mdx` + cover in `public/assets/images/lab/<folder>/`. Wide/immersive layouts are opted in by id in `src/pages/lab/[id].astro`.
- Tutorials follow `docs/tutorial-authoring.md` (Dodge tutorial is the reference).

## Environment notes

- Git LFS is required. If `origin` is SSH and SSH auth is unavailable, set `git config lfs.url https://github.com/yujenlin5210/yujenlin5210.github.io.git/info/lfs` before pulling.
- Node ≥ 22.12.
