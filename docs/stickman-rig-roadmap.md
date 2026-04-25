# Stickman Rig Rebuild Roadmap

Last updated: 2026-04-25

This document is the source of truth for the new stickman rebuild. Keep updating it as implementation progresses so future sessions can resume without reconstructing context from chat history.

For the resolved profile-arm walk bug diagnosis and architecture review, see `docs/stickman-opus-handoff.md`.

## Goal

Rebuild the stickman as a fresh SVG-based 2.5D rig runtime that preserves the current production/lab look and feel while replacing the old path-swapping architecture with a controller-driven rig, clip, projection, and attachment system.

## Architecture

- `src/components/stickman-system/config.js`
  - canonical phase, clip, facing, prop, and rig defaults
- `src/components/stickman-system/clips.js`
  - code-authored clip evaluation plus blend-duration rules
- `src/components/stickman-system/rig.js`
  - rig solving, projection, depth ordering, and attachment slot output
- `src/components/stickman-system/useStickmanController.js`
  - state transitions and smooth clip/facing/prop blending
- `src/components/stickman-system/StickmanFigure.jsx`
  - SVG renderer that preserves the current visual language
- `src/components/StickmanRigLab.jsx`
  - canonical sandbox UI

## Phase Status

- [x] Phase 1: Standing
  - new rig foundation exists
  - front / quarter / side / back facing checks exist
  - facing changes blend instead of flipping
- [x] Phase 2: Idle
  - idle clip runs through the new controller
  - stand-to-idle blending is live
- [x] Phase 3: Walking
  - walking clip runs through the same controller and rig
  - walk blending is live
- [x] Phase 4: Props
  - named attachment slots are part of the rig output
  - VR headset rebuilt as a 3D box model (width × height × depth) with headband strap
  - racing cap and hand controller removed pending individual rebuilds
- [ ] Phase 5: Complex staged actions
  - seated poses
  - racing car / vehicle staging
  - bounded per-action renderer overrides when slot-only composition is not enough

## Current Decisions

- SVG 2.5D stays the primary runtime.
- The current production/lab look is the visual target.
- The new lab sandbox is the proving ground; existing pose/motion lab routes are now thin wrappers.
- Smooth transitions are a hard requirement, not a final polish pass.
- Props use stable slots first, with limited custom staging reserved for future complex scenes.

## Next Recommended Work

1. Rebuild racing cap and hand controller props one at a time using the same 3D box approach as the VR headset.
2. Add explicit turn and settle clips instead of relying only on crossfades between standing, idle, and walk.
3. Split prop support into front, back, and hand-layer attachment registries instead of the current inline renderer cases.
4. Add seated and vehicle-specific staging as Phase 5.
5. Once the sandbox feels stable, plan the migration of the `/projects` roaming stickman onto this runtime.
