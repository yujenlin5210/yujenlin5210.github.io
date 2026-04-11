# Portfolio Redesign & Migration Status

## Current Status
We have successfully rebuilt the portfolio website using a modern stack to support AR/VR and interactive design showcases.

**Tech Stack:** Astro, React, Tailwind CSS (v4), Three.js / React Three Fiber (R3F), MDX, and Framer Motion.

## Completed Phases
- **Phase 1: Setup & Architecture**
  - Initialized Astro project with React, Tailwind, and MDX integrations.
- **Phase 2: Content Migration**
  - Migrated all legacy markdown files to `src/content/projects` and `src/content/lab`.
  - Migrated all legacy assets to `public/assets`.
- **Phase 3: Core UI & Routing**
  - Built persistent layout (`src/layouts/Layout.astro`) and main pages (`index.astro`, `about.astro`, `projects/index.astro`, `lab/index.astro`).
  - Added dynamic routing for `projects` and `lab` posts.
- **Phase 4: Interactivity & Playful Elements**
  - Implemented View Transitions for SPA-like navigation.
  - Implemented a 3D R3F cursor-tracking scene on the Home page (`src/components/HeroScene.jsx`).
- **Phase 5: The Lab**
  - Rebuilt the Lab hub page to parse and display Lab posts elegantly.
  - Created native WebGL templates using React Three Fiber (`src/components/LabExampleScene.jsx`).
  - Created a `UnityEmbed.astro` component to easily drop in Unity WebGL exports.
  - Demonstrated usage in `src/content/lab/2026-04-11-web3d-demo.mdx`.
- **Phase 6: Final Polish & Deployment**
  - Resolved all image link issues from the legacy Jekyll architecture using a unified `getCoverUrl` utility, restoring all project and lab thumbnail functionality.
  - Overhauled the `About` page with a modern animated layout and updated work experience timeline.
  - Fixed z-index layering on the Home page to ensure main navigation buttons remain clickable above the 3D scene.
  - Corrected sorting logic across `Projects` and `Home` views so the newest projects accurately appear first.
  - Verified Markdown rendering and successful compilation using `npm run build`.

## Next Steps
The new architecture is fully complete and functional. 
- You can add your actual Unity WebGL builds by dropping the build folder into `public/` and using `<UnityEmbed src="/your-build/index.html" />` inside any `.mdx` file.
- Start the development server anytime with `npm run dev`.
- When ready, deploy the `dist/` folder to GitHub Pages or Vercel.
