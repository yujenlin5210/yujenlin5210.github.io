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
- **Phase 6: Final Polish & Deployment**
  - Resolved all image link issues from the legacy Jekyll architecture using a unified `getCoverUrl` utility.
  - Overhauled the `About` page with a modern animated layout and updated work experience timeline.
  - Implemented the **Cinematic Scroll** as the default layout for `/projects` with integrated 3D tilt effects.
  - Enhanced project storytelling by adding metadata (Organization, Role, Year) to markdown frontmatter.
  - Implemented a **Modular Stickman Animation System**:
    - Grounded, chubby character with logical limb structure and "Rubber Hose" bending math.
    - **Action Registry Architecture**: Decoupled project-specific logic into plug-and-play modules mapped via markdown frontmatter (`animation` field) instead of project IDs.
    - Complex state machine handling transitions and **Graceful Interruptions** (quick-exit sequences when users scroll away).
    - Boundary-aware movement logic (turns at browser edges).
    - **Z-Layering Hooks**: Supported `renderBackAssets` for equipment worn behind the character.
    - **Generalized Hand & Leg Targets (IK)**: Replaced manual paths with a system where limbs automatically bend to reach specific `{targetX, targetY}` coordinates.
  - Implemented **Apple Liquid Glassmorphism** background cards for Cinematic project descriptions, allowing the Stickman to pass safely between the background layer and the description card (with depth-aware Z-indexing) while maintaining readable typography.
  - Verified Markdown rendering and successful compilation using `npm run build`.
- **Phase 7: Advanced Lab Features & High-Fidelity Content**
  - **Animated Video Covers**: Enhanced `LabRegistry.jsx` and `[id].astro` to support `.mp4` files as GIF-like animated covers.
  - **Tweenie Devlog Migration**: Ported a comprehensive 6-day development journey for the Tweenie Unity library from Notion, including technical reflections, bug fixes, and integrated GIF/PNG assets.
  - **Sequencer Architecture Deep-Dive**: Documented the high-performance Unity audio sequencer, highlighting the use of `dspTime` for ADSR envelopes and object pooling for performance.
  - **Interactive Lab Audio**: Implemented a glassmorphic unmute toggle for video covers on Lab detail pages, allowing users to experience audio-rich experiments (like the Sequencer) while maintaining silent, GIF-like behavior on the main registry page.
  - **Visual Integrity Fixes**:
    - Resolved color banding issues in Lab detail pages by enforcing solid backgrounds on article containers.
    - Improved 3D scene quality in `HeroScene.jsx` by enabling renderer-level dithering.

## Future Stickman Roadmap
- **Idle Variety**: Implement a randomizer for the `Idle` action (waving, checking watch, looking at user).

## Next Steps
- Add more project-specific animations using the new Action Registry.
- Restrict Stickman visibility to the `/projects` page to maintain focus on other pages.
- Integrate Unity WebGL builds directly into Lab posts (e.g., Sequencer demo).
