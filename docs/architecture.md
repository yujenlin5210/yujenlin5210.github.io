# Architecture Overview

This document is the human-focused overview of the current portfolio site architecture. For agent-specific instructions and operational rules, use [`AGENTS.md`](../AGENTS.md).

## Stack

- Astro 6 for static routing and page generation
- React 19 for interactive islands
- Tailwind CSS v4 for styling
- MDX content collections for projects and lab posts
- Framer Motion for UI animation
- Three.js / React Three Fiber for 3D scenes

## Route Structure

- `src/pages/index.astro`: homepage with a deferred 3D hero background and featured project cards
- `src/pages/about.astro`: biography and experience page with reveal animations
- `src/pages/projects/index.astro`: cinematic project listing built from the `projects` content collection
- `src/pages/projects/[id].astro`: individual project detail pages rendered from frontmatter-driven content
- `src/pages/lab/index.astro`: experimental lab index with animated registry cards
- `src/pages/lab/[id].astro`: individual lab pages, including selective breakout islands such as `TimeArt` and `DodgeGame`

## Content Model

Content lives under:

- `src/content/projects`
- `src/content/lab`

Both collections share a validated base schema in `src/content.config.ts`. Dates are normalized through `src/utils/content.ts`, which means ordering and year display should always go through those helpers instead of ad hoc date parsing.

Public-facing tags should always be filtered through `src/utils/filterTags.ts` so internal taxonomy labels do not leak into the UI.

## Layout And Islands

- `src/layouts/Layout.astro` owns the shell, transitions router, nav, and footer.
- Decorative or non-critical islands are deferred where possible:
  - homepage hero: `client:idle`
  - projects-page stickman: `client:idle`
  - lab registry: `client:visible`
- Motion-heavy React surfaces now include reduced-motion fallbacks for users who opt out of animation.

## Interactive Surfaces

- `HeroScene` now lazy-loads its WebGL canvas and falls back to a static visual shell before hydration or when reduced motion is enabled.
- `CinematicProject`, `LabRegistry`, `TiltCard`, and `FadeIn` degrade their motion behavior when `prefers-reduced-motion` is active.
- `Stickman` is treated as decorative and is disabled entirely for reduced-motion users.
- `StickmanPreview` falls back to a static illustration instead of an animated preview when reduced motion is enabled.
- `StickmanRigLab` is the canonical 2.5D rig sandbox for clip blending, facing checks, and prop validation, including the current VR headset variant set and staged headset don/doff motion.
- `src/components/stickman-system/StickmanFigure.jsx` owns the headset prop silhouettes. The Boba headset keeps its custom front read, eases into a conventional profile block at side view, and suppresses the eye dots whenever a headset is visible so rotation does not flash facial features through the visor.
- `TimeArt`, `Metronome`, and `DodgeGame` have explicit lifecycle cleanup for timers, animation loops, and audio resources.

## Shared Utilities And State

- `src/store/projectStore.ts`: shared animation-selection state for project-related stickman behavior
- `src/hooks/useWakeLock.js`: metronome wake-lock handling
- `src/hooks/usePrefersReducedMotion.js`: shared reduced-motion detection for React islands
- `src/utils/browserAudio.js`: shared browser audio constructor and iOS playback detection helpers

## Validation And Guardrails

Run `npm run check` after structural, routing, schema, or inline-script changes. It combines:

- `npm run astro:check`
- `npm run lint`
- `npm run build`
- `npm run validate:html`

The repo also includes:

- `eslint.config.js`: Astro-aware lint configuration
- `scripts/validate-built-html.mjs`: post-build HTML integrity check

## Performance Notes

- The largest client-side dependency is the Three.js vendor bundle. It is intentionally isolated into its own chunk and paired with deferred hydration so it does not block first paint on content-heavy routes.
- Build chunking is configured in `astro.config.mjs` to separate React, Framer Motion, React Three Fiber, and Three.js vendor code.
- Route scripts on Astro pages are expected to be idempotent across `ClientRouter` navigations and to clean up listeners on swap.
