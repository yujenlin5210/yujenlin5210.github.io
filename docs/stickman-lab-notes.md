# Stickman Lab Notes

Last updated: 2026-04-21

This document tracks the isolated stickman work happening in the lab before any of it is ported to the live `/projects` stickman.

## Current Scope

- The production stickman on `/projects` remains unchanged.
- All current work lives in the lab post at `/lab/2026-04-21-stickman-pose-lab`.
- The lab workbench is rendered by `src/components/StickmanPoseWorkbench.jsx`.
- The lab rig math is isolated in `src/components/stickman-lab/rig.js`.
- The lab-only style renderers now live in `src/components/stickman-lab/renderers.jsx`.

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
  - head style
  - body style
  - limb style
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
- The silhouette sub-panel now has its own compact nested switcher:
  - styles
  - profiles
  - presets

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

### Modular Style Renderer

- The lab renderer is now split into swappable visual style slots:
  - `headStyle`
  - `bodyStyle`
  - `limbStyle`
- The rig still owns pose generation, projection, and depth ordering.
- The renderer layer now owns the actual SVG primitive language for each slot.
- The first implemented alternate variants are:
  - polygon head
  - `michelin` body
  - `spring` limbs
- This means the lab can now swap character families without rewriting the underlying standing rig.
- The earlier soccer-ball head experiment did not read well enough, so that branch is being replaced by a cleaner polygonal head silhouette.

### Shape Editing

- The shape tab now supports a hybrid workflow:
  - modular style selectors
  - body profile presets
  - quick silhouette presets
  - head profile presets
  - head and body size controls
  - direct proportion sliders
- The silhouette sub-panel now handles style families, profile families, and saved presets through a nested switcher so the control column stays shorter.
- Body profile presets now control how much the torso compresses in quarter and side turns.
- Head profile presets now control how much the skull compresses in side and quarter turns.
- Head size and body size now act as quick master controls on top of the more detailed width and height sliders.
- The current default is `round`, which keeps the head fuller across yaw instead of letting profile views flatten too aggressively.
- The body profile default is now `round`, matching the current preferred standing silhouette.
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
- The default renderer style baseline is:
  - head style = `classic`
  - body style = `classic`
  - limb style = `classic`

### Current Preferred Preset

- The current favored standing silhouette now follows the cover-study proportions and stays quarter-facing by default:
  - head style = `classic`
  - body style = `classic`
  - limb style = `classic`
  - head profile preset = `round`
  - body profile preset = `round`
  - head size = `118`
  - body size = `102`
  - head width = `38`
  - head height = `38`
  - torso width = `32`
  - torso height = `52`
  - arm length = `56`
  - leg length = `44`
  - torso lean = `0`
  - arm spread = `12`
  - stance width = `10`
  - knee softness = `0`
- This baseline intentionally keeps the head larger and rounder, with a fatter compact torso and short legs, so the lab default stays closer to the current cover silhouette.

## Design Decisions So Far

- This is intentionally not true 3D. The current target is a stylized 2.5D SVG rig.
- The correct long-term abstraction is a yaw-driven rig model, not a binary left/right flip.
- The lab is the place to validate the rig language first, then selectively port stable ideas into the production stickman.
- The renderer abstraction is now separate enough that new visual families should be added as renderer variants, not by branching the rig math again.

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
- Alternate head styles can now replace the face entirely when needed, as the polygon head does.
- This should make the head orientation read more clearly, but it may still need refinement if the rotation feels too synthetic.
- Possible next step:
  - refine the face plane, nose, or mask shape to make quarter turns feel stronger

### Limb Curvature Consistency

- Limb arcs can now be set explicitly to `down` or `up`.
- Arc direction no longer changes just because the character turns from front to back.
- This behavior should now be stable across the full yaw range of the lab rig.
- Limb curvature and limb rendering are now separate concerns, so `spring` limbs can reuse the same motion path as `classic` limbs.

### Animation Split Recommendation

- Start animation work in a separate lab post instead of expanding the current pose lab further.
- The current pose lab should remain the static character-kit sandbox for:
  - silhouette
  - renderer variants
  - proportions
  - facing
- The future animation lab should reuse the existing lab modules instead of forking them:
  - `src/components/stickman-lab/rig.js`
  - `src/components/stickman-lab/renderers.jsx`
- The first animation study should be a minimal idle or standing loop before any walk cycle or project-specific action work.

### Animation Lab Kickoff

- Added a new dedicated animation post: `src/content/lab/2026-04-21-stickman-idle-lab.mdx`
- Added the first animation presenter: `src/components/StickmanIdleLab.jsx`
- The first pass intentionally reuses:
  - `src/components/stickman-lab/rig.js`
  - `src/components/stickman-lab/renderers.jsx`
- Current live controls are:
  - loop profile
  - facing check
  - tempo
  - intensity
  - gizmo visibility
  - reduced-motion-safe manual scrub
- The animation presenter is now locked to the classic renderer stack while the idle motion is being tuned.
- The shared rig now accepts lab-only asymmetric animation offsets for:
  - shoulders
  - hips
  - hands
  - feet
  - arm control points
  - leg control points
- The current motion direction is now a planted breathing read:
  - no whole-rig vertical float
  - torso height and width carry the inhale/exhale
  - the knees absorb a small amount of settling so the upper and lower body stay connected
- `buoyant` is now the default idle loop because it currently gives the clearest connected breathing read.
- A first in-place walk cycle now runs through the same rig using asymmetric arm swing, lifted swing feet, and per-limb bend offsets.
- The shared stickman baseline now also follows the current cover-study proportions:
  - larger rounder head
  - fatter compact torso
  - shorter legs
  - shorter arms
- The current walk checkpoint is mixed:
  - front view now reads closer to the intended `()` leg shape
  - side view is better than the first pass and the knee bend is less severe
  - the quarter walk still does not feel grounded enough and still shows some outward foot drift during the back-step portion
- The motion lab controls are now more practical for debugging gait:
  - direct body-yaw slider
  - smaller quick facing buttons without per-button descriptive copy
  - quarter preset nudged slightly forward from the older 40-degree default
- The motion lab is now split into two preview surfaces inside the same post:
  - an `in-place motion study` that keeps the free yaw and facing checks for gait inspection
  - a separate `track walk study` that locks the character to left/right views and shows root travel across a short corridor
- The new track-walk panel deliberately does not expose body yaw:
  - pacing should be judged as locomotion, not as another quarter/front-facing check
  - this makes side-facing travel width and future turn behavior easier to reason about
- The track-walk panel presentation is now closer to a horizontal pacing strip:
  - the preview is wider and the controls sit below it instead of beside it
  - the corridor defaults to its widest current span
  - the pacing figure is scaled down so travel reads more clearly
- The first pacing pass is in a better place than the initial version:
  - direction/facing are no longer inverted
  - root travel is no longer using a separate ease-in/ease-out slope against a fixed gait
  - the remaining obvious issue is the edge turn, which still snaps too directly between left and right
- The current conclusion is that the quarter walk likely needs its own clearer contact / pass / lift / plant treatment, with straighter local-space back-step tracking, instead of more small parameter tuning on the shared cycle.
- Endpoint gizmos are hidden by default in the animation lab and can be turned back on as a debug layer.
- Scope is still deliberately narrow:
  - buoyant idle plus first walk cycle
  - an early side-facing pacing preview
  - no project-specific action hooks
  - no production `/projects` wiring

1. Decide whether the gizmos should stay visible in the final lab presentation or become debug-only.
2. Add shoulder and hip twist so front/back views feel less flat.
3. Add more renderer variants now that the slot system exists.
4. Rebuild the quarter-view walk with clearer planted contact timing, body weight transfer, and local-space back-step tracking so it stops reading like paddling or outward sliding.
5. Refine the face-plane cue if quarter turns still feel weak.
6. Decide which shape presets are actually worth keeping once more silhouettes are tested.
7. Decide whether head-to-torso gap and limb arc direction should remain fixed defaults or become preserved preset fields only.
8. Smooth the pacing turn at each edge so the figure rotates through a short turn phase instead of snapping directly from left to right.
9. Add edge pauses and explicit turn behavior to the new left-right pacing preview once the core walk feels stable.
10. Once idle, walk, and pacing feel stable, explore transitions and project-specific actions.
