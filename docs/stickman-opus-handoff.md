# Stickman Opus Handoff

Last updated: 2026-04-25

This note was the handoff document for a fresh review by Opus. The walk-animation bug is now resolved and the architecture review is complete.

## Resolution

The profile arm bug was caused by a **projection artifact from `armCurveX`**, not by the arm stride signal or Y-curve tuning. The rig's lateral `armCurveX` offset (which pushes the arm control point outward from the body in local X space) projects asymmetrically between Left and Right profile views through `rotatePoint3D` + perspective projection. For Left-facing, the perspective shift happened to push the control point toward the hand (correct bend). For Right-facing, it pushed it away from the hand (backward bend).

The fix cancels the `armCurveX` lateral offset during profile views by adding a compensating X offset in `applyWalkChannels()` that scales with `profile` amount. Front and quarter views are unaffected.

## Immediate Problem

There is still one unresolved gait bug in the new stickman runtime:

- In the profile walk, the arm behavior is correct when the UI is set to `Left`.
- In the profile walk, the arm behavior is still wrong when the UI is set to `Right`.
- Expected behavior:
  - when the arm swings forward, it should bend forward
  - when the arm swings backward, it should end close to straight, not bend backward
- Actual behavior on `Right`:
  - forward swing is too straight
  - backward swing bends backward

At this point the bug has resisted a few targeted fixes, so it should be treated as a geometry/projection issue first, not just a tuning issue.

## Repro

Use the new sandbox:

- Route: `/lab/2026-04-21-stickman-idle-lab`
- Enter the new rig lab
- Set:
  - `Phase`: `Walking` or `Props`
  - `Clip`: `Walking`
  - `Facing`: `Right`
  - `Prop`: `None`
- Observe the profile arm arc while walking

Current expected sanity check:

- `Facing: Left` looks correct
- `Facing: Right` still looks wrong

## Current Relevant Files

- `src/components/StickmanRigLab.jsx`
  - sandbox UI and control surface
- `src/components/stickman-system/config.js`
  - canonical facing/yaw options
- `src/components/stickman-system/useStickmanController.js`
  - transition state and clip blending
- `src/components/stickman-system/clips.js`
  - walk clip math
  - main hotspot: `applyWalkChannels(...)`
- `src/components/stickman-system/rig.js`
  - pose solving, projection, heading labels, limb path construction
- `src/components/stickman-system/StickmanFigure.jsx`
  - SVG renderer

## Current State

### Facing Mapping

The UI label mapping was corrected so the buttons now match the visual orientation:

- `Right` uses yaw `-90`
- `Left` uses yaw `90`

Current implementation:

- `src/components/stickman-system/config.js`
- `src/components/stickman-system/rig.js`

This fixed the earlier left/right naming confusion, but it did **not** solve the actual wrong arm motion on the `Right` profile.

### Walk Clip

The current walk clip lives in `src/components/stickman-system/clips.js`.

Relevant details in the current implementation:

- walk body motion is already toned down from the first rebuild pass
- knee bend was reduced and is now acceptable
- front/back foot spacing was widened and is now acceptable
- profile arm motion still uses a remapped stride signal:
  - `signedProfile = Math.sin(yawRadians)`
  - `rightFacingBlend = clamp(signedProfile, 0, 1)`
  - `visualArmStride = lerp(armStride, -armStride, rightFacingBlend)`

That remap is the current suspect area, but changing it alone has not resolved the bug.

## What Has Already Been Improved

- Leg bend was too strong and is now much better.
- Front/back foot placement was too narrow and now reads closer to `||` instead of `\\/`.
- Front/back walk drift was reduced.
- Left/right UI labels now match the actual visual facing.

Those parts should generally be preserved unless a larger rig refactor makes them obsolete.

## Attempt History

These were the main attempts already made on the profile arm bug:

1. Increase forward arm bend and reduce backward bend through `desiredArmCurveY`.
2. Add asymmetry so forward swing bends more and backward swing straightens more.
3. Restore some older walk math from the previous lab implementation.
4. Remap the arm bend signal using unsigned profile amount.
5. Remap the arm bend signal using negative signed profile.
6. Remap the arm bend signal using positive signed profile.
7. Fix the UI left/right mapping and heading labels.

Result:

- left-facing profile looks good
- right-facing profile still bends wrong

This is why the next pass should assume the issue may be caused by interaction between:

- `armStride`
- `left/rightArmControl`
- `armCurveX`
- control-point projection
- limb path construction after projection

not just by `desiredArmCurveY`

## Likely Root-Cause Candidates

The likely problem is one of these:

1. The arm bend logic is being inverted at the wrong stage.
   - The current code flips the stride signal before the control point is applied.
   - It may need to keep stride timing unchanged and instead flip the control-point geometry for one profile.

2. The wrong axis is being corrected.
   - The bug may not be about `ArmControl.y`.
   - It may actually be caused by `ArmControl.x`, `ArmControl.z`, or the projected result of those values.

3. The rig is too projection-driven for limb shaping.
   - The walk clip currently pushes offsets directly into hand/control/knee points.
   - That may be too ad hoc for mirrored profile behavior.

4. The bend should be solved geometrically, not by curve offset heuristics.
   - Legs already moved toward a solved joint approach.
   - Arms may need a similar elbow solve or at least a clearer local-space elbow target model.

## What Opus Should Review For The Bug

Please review the profile arm issue end-to-end, not just the current `visualArmStride` line.

Recommended debug path:

1. Inspect `applyWalkChannels(...)` in `src/components/stickman-system/clips.js`.
2. Inspect how `leftArmControl` and `rightArmControl` are built in `src/components/stickman-system/rig.js`.
3. Inspect how the limb path is built after projection in `buildLimb(...)`.
4. Compare the projected control points for `Facing: Left` vs `Facing: Right`.
5. Decide whether the correct fix is:
   - clip math only
   - rig control-point construction
   - a small elbow-solve refactor

## Architecture Review Request

Please also review the architecture of the new stickman system as a whole, not only the arm bug.

Current architecture:

- `config.js`
  - rig defaults, phases, clips, facings, props
- `clips.js`
  - procedural clip evaluation and blend durations
- `useStickmanController.js`
  - controller state, timing, and smooth transitions
- `rig.js`
  - local pose solving, projection, depth ordering, attachment slots, limb path generation
- `StickmanFigure.jsx`
  - renderer
- `StickmanRigLab.jsx`
  - sandbox UI

### Questions For The Architecture Review

1. Is the current separation between clip math, rig solving, and rendering actually sound, or is too much pose-shaping logic still leaking into `clips.js`?
2. Should arms move to a more explicit elbow/joint solve, similar to how legs now use solved knee points?
3. Is the yaw/facing convention coherent enough now, or should it be normalized more aggressively so future work does not repeat the left/right confusion?
4. Is the current controller model good enough for the planned sequence:
   - standing
   - idle
   - walking
   - props
   - seated / vehicle / staged actions
5. Are attachment slots and the current renderer split likely to scale to:
   - VR headsets
   - hats
   - handheld props
   - seated poses
   - racing car / vehicle scenes
6. Is there a better structure for future-proofing production adoption on `/projects` without rewriting the runtime again?

## Desired Output From Opus

Helpful output would be:

1. A diagnosis of the unresolved `Facing: Right` arm bug.
2. A concrete fix, preferably with minimal churn if possible.
3. A critique of the current runtime architecture.
4. If needed, a proposed refactor path for:
   - clip math
   - arm solving
   - controller boundaries
   - prop / staged-action extensibility

## Validation Baseline

Current validation is clean:

- `npm run check` passes
- `astro check` is clean

So the issue is visual / motion correctness, not a broken build.
