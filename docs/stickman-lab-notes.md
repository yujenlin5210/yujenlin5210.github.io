# Stickman Lab Notes

Last updated: 2026-04-21

This document tracks the isolated stickman work happening in the lab before any of it is ported to the live `/projects` stickman.

## Current Scope

- The production stickman on `/projects` remains unchanged.
- All current work lives in the lab post at `/lab/2026-04-21-stickman-pose-lab`.
- The lab workbench is rendered by `src/components/StickmanPoseWorkbench.jsx`.
- The lab rig math is isolated in `src/components/stickman-lab/rig.js`.

## What Was Built

### Separate Lab Sandbox

- Added a dedicated lab post: `src/content/lab/2026-04-21-stickman-pose-lab.mdx`
- Added a separate cover asset: `public/assets/images/lab/stickman-pose-lab/cover.svg`
- Kept this work disconnected from the existing projects-page action registry and runtime stickman

### Standing Pose Workbench

- Built a standing stickman playground with adjustable controls for:
  - yaw
  - head tilt
  - torso lean
  - arm spread
  - stance width
  - knee softness
- Added portable preset output so tuned values can be copied into future rig code later

### 2.5D Rig Refactor

- Refactored the first lab version into a reusable 2.5D rig builder
- Added four explicit facing presets:
  - front
  - right
  - back
  - left
- Added continuous yaw control so the rig can be tested between those cardinal views
- The rig currently derives:
  - projected joint positions
  - limb depth ordering
  - torso width changes across yaw
  - head ellipse changes across yaw
  - eye visibility and position from yaw instead of simple front/back popping

## Design Decisions So Far

- This is intentionally not true 3D. The current target is a stylized 2.5D SVG rig.
- The correct long-term abstraction is a yaw-driven rig model, not a binary left/right flip.
- The lab is the place to validate the rig language first, then selectively port stable ideas into the production stickman.

## Known Issues And Findings

### Endpoint Dot / Gizmo Readability

- The palm and foot endpoint dots are still not visually locked to the limb tips at all times.
- This may be partly perceived as a timing mismatch, but it may also be because the dots are being read as anatomy instead of debug handles or gizmos.
- If those dots are intended as gizmos rather than literal hands/feet, they should probably use a visibly different color treatment so they read as tooling instead of body parts.
- Do not treat this as resolved. Revisit next session and decide whether to:
  - fully lock them visually to the limb ends
  - remove them
  - or restyle them as explicit rig/debug markers

### Face Rotation Readability

- Eye motion was improved from discrete pop-in/pop-out behavior to continuous yaw-based projection.
- This is better than the earlier threshold-based approach, but the head may still need an additional facial cue later.
- Possible next step:
  - add a subtle face-plane cue such as a nose, mask, or clipped facial patch to make rotation read more clearly

## Suggested Next Steps

1. Resolve the endpoint-dot behavior and decide whether those markers are anatomy or gizmos.
2. Improve face rotation readability with a subtle front-plane cue.
3. Add shoulder and hip twist so front/back views feel less flat.
4. Test subtle idle motion on top of the current standing 2.5D rig.
5. Only after the standing language feels solid, explore walking transitions and project-specific actions.
