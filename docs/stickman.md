# Character Animation Systems

Last updated: 2026-11-03

The `/projects` page has a small character at the bottom of the screen. Each project can set `animation:` in its frontmatter; scrolling a project into view swaps the character's action (`CinematicProject` → `activeAnimationId` store → `Stickman`). The character has been built three times. This doc covers what each one is, where it lives, and what's next.

## 1. Production stickman (live on `/projects`)

- `src/components/Stickman.jsx`, with one hook per action in `src/components/stickman-actions/` (`registry.js` maps `animation` ids such as `varifocal`, `mario-kart`, `retina-resolution`, `secret-pets`, `boba3`, `tiramisu`).
- Flat 2D: hand-authored SVG path strings tweened by Framer Motion, plus a "rubber hose" quadratic for reaching limbs. Turning around is a `scaleX` flip.
- Documented for readers in the lab post `2026-04-12-stickman-animation` (`StickmanLabPresentation.jsx`).
- Limits: every action needs new path art, there is no real facing or depth, and props are bespoke SVG per action.

## 2. Rig lab runtime (`2026-04-21-stickman-rig-lab`)

- `src/components/stickman-system/` (`config`, `clips`, `rig`, `useStickmanController`, `StickmanFigure`) plus the shared `stickman-lab/` rig and renderers. Sandbox UI is `StickmanRigLab.jsx`.
- A 2.5D rig: control points offset in local space and projected, with clips crossfaded by a controller. It has standing, idle, walk, and VR headset prop phases.
- Lesson learned: shaping limbs with lateral control-point offsets (`armCurveX`) projected asymmetrically and bent the right-facing arm backwards. The fix was a compensating offset. The general problem is that heuristic offsets on top of a projection fight each other.
- Never wired to `/projects`.

## 3. Trim-path engine (`2026-11-03-trim-path-stickman`) — current direction

- `src/components/trim-stickman/engine.js` (rig, clips, scenes, styles, props, simulation) and `TrimStage.jsx` (rAF loop + SVG renderer). The lab UI is `TrimStickmanLab.jsx`.
- Pipeline: `pose (numbers) → solveSkeleton (true 3D joints, FK) → draw items → project (tilted camera, mild perspective) → SVG`.
- Every part is a projected primitive. The torso is a capsule (a fat round-capped stroke). The head is a sphere (always a circle). Limbs are one quadratic through three joints. Props are boxes and rings, backface-culled and depth-sorted.
- Every path uses `pathLength="1"` plus a dash array, which makes it a Trim Paths control `[start, end]`. Bodies and props draw themselves on and erase themselves off. Scene changes erase old props, crossfade the pose from a snapshot, and draw new props.
- Turning is real yaw. At screen edges, yaw keeps decreasing by 180°, so the figure turns through the front at one edge and the back at the other, and walks a small oval.
- Feet are planted by solving the legs first and dropping the pelvis onto the lowest foot.
- Layering (painter's algorithm) rules, learned the hard way:
  - Sort depth is horizontal distance to the viewer only (`project().d` is world z). The camera tilt affects perspective and which box faces are visible, but never draw order. Otherwise higher parts count as closer, and the head paints over the near arm in profile.
  - The head always layers over the torso (the torso's sort depth is capped at head − 1), and limbs layer relative to that adjusted torso. Otherwise a forward lean puts the torso over the head from behind, and in profile the two tie and flicker.
  - Limbs choose front or behind the body from the side they hang from, using facing direction only (`attachedDepth`). Never use the average depth of their joints, which flips a swinging arm through the torso. The exception is a deliberate forward reach (over 62% of limb length, figure facing the camera), such as pointing or steering.
  - Closed convex boxes (`pushBox({ solid: true })`) sort as one object at their centre depth. Decals such as screen eyes sit at that depth plus a small offset. Per-face centre depths let a tilted face cover its own decals.
- Character **styles** (`STYLES` in `engine.js`) change proportions and drawing language without touching the rig. The character does not need to be a stickman.
  - Part styles reuse the capsule/sphere/limb builder with different settings. Some add detail layers anchored in 3D:
    - `hair`: an ink "mass" sphere offset up/back. It sits behind the face from the front and in front of the head from behind. Spike tufts sit on the head sphere.
    - `face`: manga eyes (sclera, pupil, shine, lash line, blinking), glasses (3D rings with temple arms), brows, mouth, nose, blush.
    - `outfit`: collar/hem rings, zipper, hood, sleeve and legwear tubes, shoes.
  - Custom builders (`kind`) replace the drawing entirely. `contour` traces the outline of the body's volume in one continuous thin line (tapered limb tubes and elliptical torso cross-sections). `blocky` is a cube head and box torso with flat 3-tone shading.
  - In the picker: Classic, Bean, Rubber hose, Sketch (an SVG turbulence filter reseeded at 8 fps for line boil), Block bot, Critter.
  - Archived (`archived: true`, still renderable, hidden from the picker): pictogram, wireframe, one-line skeleton, constellation, manga kid, designer, contour line art. The detailed characters were judged too complicated; the preference is simple shapes with character.
- Scenes so far: walk, wave, VR headset, kart, dog walk.
- Props are 3D too. `pushExtrude` pushes a 2D profile along an axis and draws the convex hull of both caps plus the cap that faces the camera. Headsets are selected per sim (`setHeadset`, `HEADSETS`). Swapping while one is worn erases the old one and draws the new one on.
  - `standard`: a plain visor box.
  - `boba3`: traced from reference photos. The front cover (top edge arching up to the centre, rounder lower lobes, a moderate nose arch) is dark glass. The silver chrome is the cover's side wall (its thickness, a gradient fill), flared slightly so a thin edge shows head-on. A dark body sits behind it. Everything wraps gently around the face. The bands are drawn with `bandPath` (a union of the quads between two outlines, outlined by a fat stroke under the fill), not a convex hull, so they follow the nose arch. Dark-mode fills are lighter so it reads as solid against the dark background. Extra detail (cameras, band, forehead cover/hood, knobs) and a flat chrome frame were tried and rejected.
  - `tiramisu` (from a photo): a chunky matte black rounded box (loaf) well forward of the face, with soft front fillets drawn as one solid (no inner front line, which read as see-through), and a small white sensor ring near the top front corner. Side knobs were tried and removed.
  - `varifocal` (Butterscotch Varifocal, from the project cover photo): an angular black box (flat front, bold chamfered corners, darker front face).
  - No headset has a strap or headband. Each is one silhouette; a strap on some but not others read as inconsistent.
  - Next: retina (Butterscotch retina-resolution) headset.

### Conventions

- Figure-local space: +y up, +z is where the figure faces, +x is its left. Units are px at scale 1.
- yaw 0 faces the viewer, 90 faces screen-right, -90 faces screen-left.
- Draw items are `{ key, type: stroke | capsule | shape | dot | shadow, d, w, depth, layer, trim }`, sorted by `layer`, then `depth`.

### Next

1. Pick a character style (or a new one) and refine it.
2. Port the project actions (varifocal, boba3, tiramisu, retina, pets, mario-kart) to scenes and props.
3. Swap `/projects` from `Stickman.jsx` to `TrimStage`, keeping the `activeAnimationId` store contract.
4. Once ported, retire generations 1–2 and their lab posts or mark them historical.
