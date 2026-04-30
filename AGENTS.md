# AGENTS

Canonical source of truth for AI agents working in this repository.

Last updated: 2026-04-21

## Project Summary

This repo contains Yu-Jen Lin's portfolio website. The current site is a modern Astro rebuild of an older Jekyll portfolio and is focused on AR/VR, interactive design, research prototypes, and experimental lab work.

Current stack:

- Astro 6 static site generation
- React 19 islands
- Tailwind CSS v4
- MDX content collections
- Framer Motion
- Three.js / React Three Fiber

## Current Status

- The migration away from the legacy Jekyll site is complete for the active site.
- Core routes are live under `src/pages`: `/`, `/about`, `/projects`, `/projects/[id]`, `/lab`, and `/lab/[id]`.
- Content lives in `src/content/projects` and `src/content/lab`.
- Validation baseline is healthy: `npm run check` passes.
- `astro check` is clean: 0 errors, 0 warnings, 0 hints.
- Reduced-motion fallbacks and hydration deferral are now in place on the main motion-heavy surfaces.

## Repo Map

- `src/pages`: Astro route entrypoints for the current site.
- `src/components`: React islands, interactive experiences, and presentation components.
- `src/content/projects`: project case studies and frontmatter-driven metadata.
- `src/content/lab`: lab posts, experiments, and technical writeups.
- `src/layouts`: top-level layout wrappers.
- `docs/architecture.md`: human-facing architecture overview for the current site.
- `docs/tutorial-authoring.md`: required standard for building textbook-style lab tutorials.
- `src/utils/content.ts`: shared validated date helpers. Use this instead of ad hoc `new Date(id.slice(...))` logic.
- `src/utils/filterTags.ts`: removes internal taxonomy tags before public rendering.
- `src/utils/browserAudio.js`: shared helpers for browser audio capability checks.
- `scripts/validate-built-html.mjs`: post-build validator for malformed generated HTML.
- `public/assets`: migrated production asset library.
- `_legacy`: archived Jekyll-era site. Do not treat this as the source of the current production app.
- `dist`: generated output. Do not edit manually.

## Commands

Run from the repo root:

- `npm install`: install dependencies
- `npm run dev`: start local dev server
- `npm run build`: build the static site
- `npm run preview`: preview the built site
- `npm run lint`: run ESLint
- `npm run astro:check`: run Astro diagnostics
- `npm run validate:html`: verify generated HTML structure after a build
- `npm run check`: full validation pass (`astro check`, `lint`, `build`, and built-HTML validation)

## Agent Guidance

- Treat this file as the canonical agent-facing document for the repository.
- Edit current source under `src/`, `public/`, and config files. Avoid changing `_legacy` unless the task is explicitly about archival content.
- Do not edit `dist/`.
- After structural changes, route changes, content-schema changes, or inline-script changes, run `npm run check`.
- In `.astro` templates, use native HTML attributes like `class`, not React-only attributes like `className`.
- Keep public tag rendering filtered through `src/utils/filterTags.ts`.
- For list sorting, year display, or date comparisons, use helpers from `src/utils/content.ts`.
- If adding inline scripts to Astro pages, make them idempotent across `ClientRouter` navigations and ensure they render inside the document, not after `</html>`.
- Prefer lighter hydration where possible. `client:visible` is preferred over `client:load` when eager hydration is not required.
- Honor reduced-motion preferences on motion-heavy surfaces. Reuse `src/hooks/usePrefersReducedMotion.js` instead of reimplementing media-query listeners.
- For textbook-style lab tutorials, follow `docs/tutorial-authoring.md`. Use the Dodge tutorial layout as the canonical pattern unless explicitly instructed otherwise.

## Architecture Notes

- The homepage uses a hydrated 3D hero scene.
- The projects index uses cinematic React islands plus stickman-driven animation state.
- The lab section mixes static technical writeups with interactive islands like `TimeArt`, `DodgeGame`, and `Metronome`.
- Content metadata is validated through `src/content.config.ts`.
- Date normalization is shared so project and lab ordering stays deterministic even when content is sparse.

## Migration And Feature History

Major completed milestones from the migration and feature build-out:

- Setup and architecture migration to Astro + React + Tailwind + MDX.
- Migration of legacy project/lab content into content collections.
- Rebuild of the main routes and dynamic project/lab pages.
- Addition of animated and WebGL-driven homepage and lab experiences.
- Creation of the cinematic project layout and modular stickman animation system.
- Support for animated lab video covers, deeper technical writeups, and audio-capable lab presentations.
- Follow-up cleanup of memory leaks and responsiveness issues in `TimeArt`, plus loop lifecycle cleanup in `DodgeGame`.

## Cleanup History

The major phased cleanup pass has been completed.

### Phase 0: Guardrails

- Added `astro:check`, `lint`, `validate:html`, and aggregate `check` scripts.
- Added `eslint.config.js` with Astro-aware parsing and scoped React linting.
- Added built HTML validation to catch malformed generated output.

### Phase 1: Correctness Fixes

- Removed malformed trailing output from `src/pages/about.astro`.
- Fixed native `.astro` markup that incorrectly used `className`.
- Added tooling coverage so these regressions are caught automatically.

### Phase 2: Route And UI Lifecycle Cleanup

- Refactored the lab cover-video mute toggle into an idempotent setup with teardown.
- Filtered internal lab tags before public rendering.
- Fixed the lab page inline script placement so it no longer renders after `</html>`.

### Phase 3: Content Contract Hardening

- Replaced permissive `z.any()` usage in `src/content.config.ts`.
- Added shared date normalization and sorting helpers in `src/utils/content.ts`.
- Normalized the invalid `2016-02-30-3d_printing` slug to `2016-02-29-3d_printing`.

### Phase 4: Dead Code And Hydration Cleanup

- Removed the dead `MorphingBackground` import.
- Removed unused `activeProjectId` store state.
- Made sorting explicit instead of relying on in-place mutation.
- Switched the projects listing islands from `client:load` to `client:visible`.

## Follow-Up Status

The previously noted follow-ups have been completed:

- The heaviest client surfaces are now deferred or lazy-loaded, and Vite chunking is split between React, Framer Motion, React Three Fiber, and Three.js vendor code.
- Reduced-motion fallbacks are in place for the main animated UI surfaces.
- A human-focused architecture overview now lives in `docs/architecture.md`.
- Legacy/public JS no longer pollutes application diagnostics, and `astro check` is clean.
