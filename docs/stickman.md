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
- Scenes so far: walk, wave, VR headset, kart, dog walk, First Encounters, Tiramisu, Varifocal.
  - `encounters` (Boba 3 project): the Quest 3 demo game. The scene pins the headset to Boba 3 (`{ id: 'headset', variant: 'boba3' }`; a scene prop's `variant` overrides the picker). Two chunky toy blasters draw on in the hands. Fluffy puffians (scalloped `furPath` outlines, pastel fills, googly eyes that track the player) pop up at either side. The figure twists, and the aiming arm is solved straight at the target (`aimPose`). It fires a laser, which is a trim window sliding along one line. A bubble draws itself around the hit puffian, then floats it up and away.
  - Capture (the game's colour match): after the hit, the bubble floats up briefly with a bob, then gets pulled into a capture ship behind the player's right. `buildShip` draws it after the game's ship: a pod hovering on a flickering rocket flame, with a flying-saucer disc at the base, a tall tapered bell body, side thrusters, and a front window holding a green capture gauge. Its domed flip-top lid is hinged open to the side over an opening.
    - The pull follows a quadratic Bezier arc (`pullArc`) that arches over the player's head from the far side. It accelerates like suction (`puffPull`), and a trimmed copy of the path streams behind it as a trail.
    - The arc ends on top of a stack balanced on the opening (`stackSlot`; the bubbles park small). Puffian colours come in runs of up to 3 (`puffColor`, memoised). Same-colour bubbles stack up.
    - A different colour still lands on top (`arrivalSlot`). Then the old colour below it is sucked in one by one, bottom first (`suckStart`, `suckProg`), and the stack slides down a slot each time (`slotNow`), so the new colour ends up at the base.
    - Each bubble sucked in makes the pod squash for a beat, raises a pulse ring off the cap, and fills the gauge a notch (it resets after six).
    - Rejected along the way: an earlier pod on legs, a lid-less version where every bubble went straight in, and flushing the whole stack at once.
  - The whole game loop is a pure function of scene time on a fixed cycle (`ENC`): puffian n spawns, is aimed at, shot, bubbled, and floats. Contact sheets are deterministic, and the pose and the props never disagree about the target.
  - `varifocal` (Butterscotch Varifocal project): the demo let you pick up small, delicate 3D models and examine them up close, which is where varifocal focus shines. The figure wears the Varifocal headset. All three objects sit on a low coffee table in front of it (`buildTable`, `SPECIMEN_SPOT`): pagoda left, pineapple middle, F1 car right.
    - The cycle: on a fixed cycle (`VF`, `RP`, `vfCycle`, `specimenStates`) the figure leans down and reaches with the nearer hand. Both hands lift the object to beside its face (clear of the headset), and the figure leans in with a head tilt while turning the object a full turn. Then it puts the object back in its spot at its resting angle and moves on to the next one. Hands use the same IK (`reachPose`). Head pitch is capped so the headset keeps its shape when looking down.
    - The models are real 3D line geometry built with a small kit (`specimenKit`: culled boxes, hulls, lines, dots, painter-sorted by projected centroid, drawn on in creation order), with fine detail:
      - Pagoda: four tiers with windows, upturned eaves, a ringed spire.
      - Pineapple: a diamond lattice of front-facing spirals with a dot per diamond, and a spiky crown.
      - F1 car: a lofted body, wheels with hubs, cockpit, halo, airbox, and front and rear wings with endplates.
    - Rejected: a single display stand with one object at a time.
  - `tiramisu` (Tiramisu project): Tiramisu is too thick and heavy for a strap, so the demo had you hold it to your face. The figure holds the loaf up with both hands (two-bone IK, `reachPose`, puts the hands on the box's sides; they sag slightly under the weight) and slowly looks around. Around it grows the demo's actual scene, Epic's Electric Dreams sample, as a jungle creek gorge (`buildRavine`) in the same ink-and-paper style:
    - Left: a low earth bank whose face is a curtain of hanging roots, with flowering shrubs, a boulder, and tall airy trees on top (forking trunks, clumpy leaf canopies).
    - Middle: a small karst pillar down the gorge.
    - Right: a tall layered rock cliff with a jagged, stepped top, ledges, joints that break it into blocks, bulging rock masses, cracks, foliage and vines. Both walls have scree at their base.
    - Edges: the walls' outlines are open on the outer side (only the inner edge and the top are inked; the fill is closed). The scenery travels with the figure, so on the page band its ends would otherwise show as hard edges. `frame().vignette` gives an ellipse around the figure, and TrimStage masks scenery items with it (opaque in the middle, fading to nothing). Scenery is split into `back` and `front` groups around the figure, so it still layers behind and in front of it.
    - Floor: a stony creek bed with a fallen log, ferns, grass and a few wild flowers. Leaves drift down.
    - Sun: it blazes through the big left tree's canopy as HDR glare, not symbolic rays. A blown-out white core and a radial bloom (`fillUrl: 'glare'`) wash out the line art around it, plus a thin horizontal flare streak.
    - Rejected along the way: a framed window view, a coloured meadow, a generic garden, animated sun rays, and an oversized sun.
- Props are 3D too. `pushExtrude` pushes a 2D profile along an axis and draws the convex hull of both caps plus the cap that faces the camera. Headsets are selected per sim (`setHeadset`, `HEADSETS`). Swapping while one is worn erases the old one and draws the new one on.
  - `standard`: a plain visor box.
  - `boba3`: traced from reference photos. The front cover (top edge arching up to the centre, rounder lower lobes, a moderate nose arch) is dark glass. The silver chrome is the cover's side wall (its thickness, a gradient fill), flared slightly so a thin edge shows head-on. A dark body sits behind it. Everything wraps gently around the face. The bands are drawn with `bandPath` (a union of the quads between two outlines, outlined by a fat stroke under the fill), not a convex hull, so they follow the nose arch. Dark-mode fills are lighter so it reads as solid against the dark background. Extra detail (cameras, band, forehead cover/hood, knobs) and a flat chrome frame were tried and rejected.
  - `tiramisu` (from a photo): a chunky matte black rounded box (loaf) well forward of the face, with soft front fillets drawn as one solid (no inner front line, which read as see-through), and a small white sensor ring near the top front corner. Side knobs were tried and removed.
  - `varifocal` (Butterscotch Varifocal, from the project cover photo): an angular black box (flat front, bold chamfered corners, darker front face).
  - `retina` (Butterscotch retina-resolution, from the project cover photo): a wide, flat, softly rounded black box with an exposed circuit board on top (muted gray board, dark chips, silver pads, traces; a green and gold board was too colorful). The front cover sits lower than the body behind it, so the board slopes up from the cover's top edge and reads as a strip above the black front even at the shallow camera tilt (a flat top panel was too thin to see). Board details fade out when the top is edge-on.
  - No headset has a strap or headband. Each is one silhouette; a strap on some but not others read as inconsistent.

### Conventions

- Figure-local space: +y up, +z is where the figure faces, +x is its left. Units are px at scale 1.
- yaw 0 faces the viewer, 90 faces screen-right, -90 faces screen-left.
- Draw items are `{ key, type: stroke | capsule | shape | dot | shadow, d, w, depth, layer, trim }`, sorted by `layer`, then `depth`.

### Next

1. Pick a character style (or a new one) and refine it.
2. Port the project actions (varifocal, boba3, tiramisu, retina, pets, mario-kart) to scenes and props.
3. Swap `/projects` from `Stickman.jsx` to `TrimStage`, keeping the `activeAnimationId` store contract.
4. Once ported, retire generations 1–2 and their lab posts or mark them historical.
