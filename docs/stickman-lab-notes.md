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
  - head yaw
  - head pitch
  - head roll
  - limb arc direction
  - head size
  - body size
  - head width
  - head height
  - torso width
  - torso height
  - arm length
  - leg length
  - torso lean
  - arm spread
  - stance width
  - knee softness
- Added portable preset output so tuned values can be copied into future rig code later
- The control UI is now grouped into three top-level sections:
  - body
  - head
  - shape
- The shape section is further split into compact sub-panels:
  - silhouette
  - size
  - proportions
  - stance

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
  - head-local yaw, pitch, and roll controls that keep those axes semantically stable
  - eye visibility and position from yaw instead of simple front/back popping
  - a minimal face-plane cue plus nose line to help the head read as rotating
- Limb bend control points are now computed in rig-local space before projection.
- This keeps arm and leg curvature direction stable across front, back, and intermediate turns instead of flipping visually when the character rotates.

### Shape Editing

- The shape tab now supports a hybrid workflow:
  - body profile presets
  - quick silhouette presets
  - head profile presets
  - head and body size controls
  - direct proportion sliders
- Body profile presets now control how much the torso compresses in quarter and side turns.
- Head profile presets now control how much the skull compresses in side and quarter turns.
- Head size and body size now act as quick master controls on top of the more detailed width and height sliders.
- The current default is `round`, which keeps the head fuller across yaw instead of letting profile views flatten too aggressively.
- The body profile default is `balanced`, which preserves a neutral torso read while still allowing a rounder option.
- Current editable proportion controls include:
  - head width and height
  - torso width and height
  - arm length
  - leg length
- Stance tuning remains separate from pure proportion editing, but both live in the same shape section.
- The leg-length range was widened downward so shorter silhouettes are now reachable without changing the rig code.

### Default Pose Baseline

- The default head rotation baseline is now zeroed:
  - head yaw = 0
  - head pitch = 0
  - head roll = 0
- This keeps the neutral head state aligned with the body until the user intentionally adds head motion.
- The default limb arc baseline is now `down`.

### Current Preferred Preset

- The current favored standing silhouette is a front-facing round profile setup with:
  - head profile preset = `round`
  - body profile preset = `round`
  - head size = `105`
  - body size = `102`
  - head width = `38`
  - head height = `40`
  - torso width = `32`
  - torso height = `68`
  - arm length = `62`
  - leg length = `54`
  - torso lean = `0`
  - arm spread = `14`
  - stance width = `11`
  - knee softness = `0`
- The head-to-torso gap was tightened after this preset was chosen so the silhouette reads more connected.

## Design Decisions So Far

- This is intentionally not true 3D. The current target is a stylized 2.5D SVG rig.
- The correct long-term abstraction is a yaw-driven rig model, not a binary left/right flip.
- The lab is the place to validate the rig language first, then selectively port stable ideas into the production stickman.

## Known Issues And Findings

### Endpoint Dot / Gizmo Readability

- The endpoint markers are now treated as explicit rig gizmos instead of anatomy.
- Arms use cyan gizmos and legs use amber gizmos so they read as debug or rig handles rather than hands or feet.
- Limb morphs and gizmo motion now share the same tween timing, which should reduce the feeling that the markers are drifting away from the path tips.
- Revisit next session and decide whether to:
  - keep the gizmos as part of the lab rig language
  - hide them by default and show them only in a debug mode
  - or remove them entirely once the rig feels stable

### Face Rotation Readability

- Eye motion was improved from discrete pop-in/pop-out behavior to continuous yaw-based projection.
- A first face-plane cue and nose line have now been added.
- Head and body profile compression are now separated from raw width and height, so a rounder front silhouette can stay rounder in profile too.
- The neutral head position now sits closer to the torso so the standing silhouette feels less disconnected.
- This should make the head orientation read more clearly, but it may still need refinement if the rotation feels too synthetic.
- Possible next step:
  - refine the face plane, nose, or mask shape to make quarter turns feel stronger

### Limb Curvature Consistency

- Limb arcs can now be set explicitly to `down` or `up`.
- Arc direction no longer changes just because the character turns from front to back.
- This behavior should now be stable across the full yaw range of the lab rig.

## Suggested Next Steps

1. Decide whether the gizmos should stay visible in the final lab presentation or become debug-only.
2. Add shoulder and hip twist so front/back views feel less flat.
3. Test subtle idle motion on top of the current standing 2.5D rig.
4. Refine the face-plane cue if quarter turns still feel weak.
5. Decide which shape presets are actually worth keeping once more silhouettes are tested.
6. Decide whether head-to-torso gap and limb arc direction should remain fixed defaults or become preserved preset fields only.
7. Only after the standing language feels solid, explore walking transitions and project-specific actions.
