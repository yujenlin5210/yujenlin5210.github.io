/**
 * Trim-path stickman engine.
 *
 * One idea, applied everywhere: the character and its props are 3D stroke
 * geometry, projected to 2D every frame, and every stroke can be "trimmed"
 * (drawn on / erased) like After Effects' Trim Paths.
 *
 *   pose (numbers) -> skeleton (3D joints) -> strokes (3D) -> project -> SVG paths
 *
 * Conventions
 *   - Figure-local space: +y up, +z is the direction the figure faces,
 *     +x is the figure's left hand side. Units are px at scale 1.
 *   - yaw rotates the figure around +y. yaw 0 faces the viewer,
 *     yaw 90 faces screen-right, yaw -90 faces screen-left.
 *   - The camera sits slightly above (tilt) with a mild perspective, so
 *     ground circles read as ellipses and near/far lanes differ a little.
 */

export const D2R = Math.PI / 180;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};
export const easeInOut = (t) => {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
const window01 = (t, a, b) => smooth((t - a) / (b - a));

// ---------------------------------------------------------------------------
// Vector helpers (arrays [x, y, z])

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

function rotY(p, deg) {
  const a = deg * D2R;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
}
function rotX(p, deg) {
  // positive = tip +y toward +z (nod forward)
  const a = deg * D2R;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
}
function rotZ(p, deg) {
  const a = deg * D2R;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
}

/** A limb segment direction. p = forward swing, r = outward spread (deg). */
function limbDir(p, r, side) {
  const pr = p * D2R;
  const rr = r * D2R;
  return [side * Math.sin(rr), -Math.cos(rr) * Math.cos(pr), Math.cos(rr) * Math.sin(pr)];
}

// ---------------------------------------------------------------------------
// Rig dimensions (matches the production stickman: ~100px tall)

export const RIG = {
  pelvisY: 37, // capsule bottom centre
  torso: 21, // capsule centre-line length
  torsoW: 24, // capsule width
  headR: 16,
  headOffset: 24, // chest point -> head centre
  shoulderX: 9,
  shoulderUp: 18, // along torso from pelvis
  hipX: 5,
  hipDown: 10,
  upperArm: 15,
  foreArm: 15,
  thigh: 14,
  shin: 14,
  seatY: 20,
  stride: 45, // px travelled per full walk cycle
};

export const REST_POSE = {
  bob: 0,
  sit: 0,
  lean: 3,
  twist: 0,
  hy: 0,
  hp: 0,
  hr: 0,
  aRp: 2, aRr: 16, aRbp: 10, aRbr: -4,
  aLp: 2, aLr: 16, aLbp: 10, aLbr: -4,
  lRp: 0, lRr: 3, lRk: 6,
  lLp: 0, lLr: 3, lLk: 6,
};

const POSE_KEYS = Object.keys(REST_POSE);

export function lerpPose(a, b, t) {
  const out = {};
  for (const k of POSE_KEYS) out[k] = lerp(a[k], b[k], t);
  return out;
}
const pose = (over) => ({ ...REST_POSE, ...over });

// ---------------------------------------------------------------------------
// Clips: (sceneTime, walkPhase) -> pose

function walkPose(phi, t) {
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  return pose({
    lean: 5,
    twist: 9 * s,
    hp: 2 * Math.sin(phi * 2),
    hy: 4 * Math.sin(t * 0.7),
    lRp: 24 * s,
    lLp: -24 * s,
    lRk: 5 + 38 * Math.pow(Math.max(0, c), 1.4),
    lLk: 5 + 38 * Math.pow(Math.max(0, -c), 1.4),
    aRp: -22 * s,
    aLp: 22 * s,
    aRbp: 12 + 26 * Math.max(0, -s),
    aLbp: 12 + 26 * Math.max(0, s),
    aRr: 8,
    aLr: 8,
  });
}

function idlePose(t) {
  return pose({
    lean: 2 + Math.sin(t * 1.3) * 1.2,
    hy: 14 * Math.sin(t * 0.55),
    hp: -3 + 3 * Math.sin(t * 0.9),
    aRp: 3 * Math.sin(t * 1.3),
    aLp: 3 * Math.sin(t * 1.3 + 0.6),
    aRr: 16 + 2 * Math.sin(t * 1.1),
    aLr: 16 + 2 * Math.sin(t * 1.1 + 1),
  });
}

function wavePose(t) {
  const up = window01(t, 0.15, 0.6);
  const base = idlePose(t);
  const wave = pose({
    ...base,
    hr: 8,
    hp: -4,
    hy: 6 * Math.sin(t * 1.4),
    aRp: 12,
    aRr: 128,
    aRbp: 0,
    aRbr: 34 + 22 * Math.sin(t * 9),
    lRr: 5,
    lLr: 5,
  });
  return lerpPose(base, wave, up);
}

const VR_REACH = pose({
  lean: 1,
  hp: -6,
  aRp: 10, aRr: 150, aRbp: 10, aRbr: 52,
  aLp: 10, aLr: 150, aLbp: 10, aLbr: 52,
});

function vrPose(t) {
  if (t < 0.65) return lerpPose(idlePose(t), VR_REACH, easeInOut(t / 0.65));
  if (t < 1.25) return VR_REACH;
  const look = t - 1.25;
  const lookPose = pose({
    lean: 2,
    hy: 48 * Math.sin(look * 0.9),
    hp: -8 + 12 * Math.sin(look * 0.6),
    twist: 10 * Math.sin(look * 0.9),
    aRp: 72 + 8 * Math.sin(look * 2.2),
    aRr: 14,
    aRbp: 8 + 10 * Math.max(0, Math.sin(look * 4.4)),
    aLp: 4,
    aLr: 10,
  });
  return lerpPose(VR_REACH, lookPose, easeInOut((t - 1.25) / 0.7));
}

function kartPose(t) {
  const seated = pose({
    sit: 1,
    lean: 12,
    hp: -4 + Math.sin(t * 31) * 0.8,
    hy: 0,
    lRp: 85, lRk: 25, lRr: 8,
    lLp: 85, lLk: 25, lLr: 8,
    aRp: 35, aRr: 14, aRbp: 62, aRbr: -12,
    aLp: 35, aLr: 14, aLbp: 62, aLbr: -12,
  });
  return lerpPose(REST_POSE, seated, easeInOut(t / 0.7));
}

function dogPose(phi, t) {
  const walk = walkPose(phi, t);
  const hold = { aRp: 34, aRr: 6, aRbp: 6, aRbr: 0, twist: walk.twist * 0.5 };
  return { ...walk, ...hold };
}

// ---------------------------------------------------------------------------
// Scenes: what the figure does while a section is active.

export const SCENES = {
  walk: {
    label: 'Walk',
    speed: () => 56,
    clip: (t, phi) => walkPose(phi, t),
    props: [],
  },
  wave: {
    label: 'Wave',
    stand: true,
    speed: () => 0,
    clip: (t) => wavePose(t),
    props: [],
  },
  vr: {
    label: 'VR headset',
    stand: true,
    speed: () => 0,
    clip: (t) => vrPose(t),
    props: [{ id: 'headset', on: [0.45, 1.15] }],
  },
  kart: {
    label: 'Kart',
    speed: (t) => (t < 1.1 ? 0 : 150),
    clip: (t) => kartPose(t),
    props: [
      { id: 'kart', on: [0, 1.0] },
      { id: 'speedlines', on: [1.3, 1.5] },
    ],
  },
  dog: {
    label: 'Dog walk',
    speed: (t) => (t < 0.8 ? 0 : 46),
    clip: (t, phi) => dogPose(phi, t),
    props: [
      { id: 'leash', on: [0.15, 0.6] },
      { id: 'dog', on: [0.45, 1.5] },
    ],
  },
};

export const SCENE_IDS = Object.keys(SCENES);

// ---------------------------------------------------------------------------
// Skeleton solve

function solveLimb(origin, l1, l2, p, r, p2, r2, side) {
  const mid = add(origin, mul(limbDir(p, r, side), l1));
  const end = add(mid, mul(limbDir(p2, r2, side), l2));
  return [origin, mid, end];
}

/** Returns the skeleton in figure-local space (before yaw/root). */
export function solveSkeleton(P, R = RIG) {
  // Legs relative to the pelvis first, so the figure can be planted.
  const legs = {};
  let minFoot = Infinity;
  for (const [key, side] of [['R', -1], ['L', 1]]) {
    const hip = [side * R.hipX, -R.hipDown, 0];
    const p = P[`l${key}p`];
    const r = P[`l${key}r`];
    const k = P[`l${key}k`];
    legs[key] = solveLimb(hip, R.thigh, R.shin, p, r, p - k, r, side);
    minFoot = Math.min(minFoot, legs[key][2][1]);
  }
  const grounded = -minFoot;
  const seated = R.seatY;
  const pelvisY = lerp(grounded, seated, P.sit) + P.bob;
  const pelvis = [0, pelvisY, 0];

  const chestDir = rotX([0, 1, 0], P.lean);
  const chest = add(pelvis, mul(chestDir, R.torso));
  const headC = add(pelvis, mul(chestDir, R.torso + R.headOffset));

  const arms = {};
  for (const [key, side] of [['R', -1], ['L', 1]]) {
    const shoulder = add(
      add(pelvis, mul(chestDir, R.shoulderUp)),
      rotY([side * R.shoulderX, 0, 0], P.twist),
    );
    const p = P[`a${key}p`];
    const r = P[`a${key}r`];
    const raw = solveLimb([0, 0, 0], R.upperArm, R.foreArm, p, r, p + P[`a${key}bp`], r + P[`a${key}br`], side);
    arms[key] = raw.map((pt) => add(shoulder, rotY(pt, P.twist * 0.6)));
  }

  for (const key of ['R', 'L']) legs[key] = legs[key].map((pt) => add(pelvis, pt));

  return {
    pelvis,
    chest,
    headC,
    headRot: { yaw: P.twist + P.hy, pitch: P.hp, roll: P.hr },
    twist: P.twist,
    lean: P.lean,
    arms,
    legs,
    rig: R,
  };
}

/** Rotates a head-local direction/point by the head rotation. */
function headRotate(v, rot) {
  return rotY(rotX(rotZ(v, rot.roll), rot.pitch), rot.yaw);
}

// ---------------------------------------------------------------------------
// Camera / projection

export function makeCamera({ cx, cy, scale, tilt = 11, focal = 900 }) {
  const ct = Math.cos(tilt * D2R);
  const st = Math.sin(tilt * D2R);
  const project = (p) => {
    const y2 = p[1] * ct - p[2] * st;
    const d = p[1] * st + p[2] * ct;
    const k = focal / (focal - d);
    return { x: cx + p[0] * k * scale, y: cy - y2 * k * scale, d, k: k * scale };
  };
  /** Depth component of a direction (positive = facing the camera). */
  const facing = (n) => n[1] * st + n[2] * ct;
  return { project, facing, scale };
}

// ---------------------------------------------------------------------------
// Path helpers (screen space)

const f = (n) => (Math.round(n * 100) / 100).toString();

function quadThrough(a, b, c) {
  const qx = 2 * b.x - (a.x + c.x) / 2;
  const qy = 2 * b.y - (a.y + c.y) / 2;
  return `M${f(a.x)},${f(a.y)}Q${f(qx)},${f(qy)} ${f(c.x)},${f(c.y)}`;
}
function linePath(pts, closed = false) {
  let d = '';
  pts.forEach((p, i) => {
    d += `${i ? 'L' : 'M'}${f(p.x)},${f(p.y)}`;
  });
  return closed ? `${d}Z` : d;
}
function smoothPath(pts, closed = false) {
  // Catmull-Rom -> cubic Bezier
  const n = pts.length;
  if (n < 3) return linePath(pts, closed);
  const get = (i) => (closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)]);
  let d = `M${f(pts[0].x)},${f(pts[0].y)}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i += 1) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${f(c1x)},${f(c1y)} ${f(c2x)},${f(c2y)} ${f(p2.x)},${f(p2.y)}`;
  }
  return closed ? `${d}Z` : d;
}
function circlePath(c, r) {
  // Starts at the top so draw-on reads like a pen stroke.
  return `M${f(c.x)},${f(c.y - r)}A${f(r)},${f(r)} 0 1 1 ${f(c.x)},${f(c.y + r)}A${f(r)},${f(r)} 0 1 1 ${f(c.x)},${f(c.y - r)}`;
}

/** Remaps a global trim window to part i of n so parts draw in sequence. */
export function stagger(trim, i, n, overlap = 0.5) {
  if (n <= 1) return trim;
  const win = 1 / (n - (n - 1) * overlap);
  const step = win * (1 - overlap);
  const a = i * step;
  const map = (x) => clamp((x - a) / win);
  return [map(trim[0]), map(trim[1])];
}

// ---------------------------------------------------------------------------
// Draw-list builders. Items are plain objects consumed by TrimFigure.jsx:
//   { key, type: 'stroke' | 'capsule' | 'shape' | 'dot', d, w, depth, layer,
//     trim: [start, end], fade (0..1 far-ness), fill (0..1) }

function toWorld(local, frame) {
  return add(rotY(local, frame.yaw), frame.root);
}

// ---------------------------------------------------------------------------
// Limb layering.
//
// A limb is drawn in front of or behind the body based on which side of the
// body it hangs from, not on the depth of its joints. The near/far side comes
// from the facing direction only, so swinging (or the walk's body twist)
// never flips an arm through the torso mid-stride. The one exception is a
// hand or foot reaching well in front of the body (pointing, steering).

function attachedDepth({ key, yaw, cam, chain, bodyD }) {
  const side = key.endsWith('R') ? -1 : 1;
  const sideFacing = cam.facing(rotY([side, 0, 0], yaw));
  // Forward reach in the figure's own frame, as a fraction of limb length.
  const len = Math.hypot(...[0, 1, 2].map((i) => chain[1][i] - chain[0][i]))
    + Math.hypot(...[0, 1, 2].map((i) => chain[2][i] - chain[1][i]));
  const reach = (chain[2][2] - chain[0][2]) / (len || 1);
  const towardUs = cam.facing(rotY([0, 0, 1], yaw)) > 0.15;
  const inFront = sideFacing > 0.2 || (towardUs && reach > 0.62);
  // Small side-proportional term keeps the near arm above the near leg, etc.
  return bodyD + (inFront ? 2 : -2) + sideFacing * 0.5;
}

// ---------------------------------------------------------------------------
// Character styles. Same rig + trim system, different drawing language.
// `rig` overrides proportions; the rest picks how each part is drawn.

export const STYLES = {
  manga: {
    archived: true,
    label: 'Manga kid',
    note: 'Chibi proportions, spiky ink hair, big glossy eyes, hoodie and sneakers.',
    rig: {
      headR: 19, headOffset: 25, torso: 15, torsoW: 22, shoulderX: 8, shoulderUp: 13,
      hipX: 5, hipDown: 9, upperArm: 11, foreArm: 11, thigh: 11, shin: 11, stride: 36, seatY: 16,
    },
    torso: 'capsule', head: 'outline', limbs: 'line', eyes: 'none',
    limbW: 2.6, legW: 2.8, outline: 2.4,
    hair: {
      fill: 'ink', mass: [0, 0.3, -0.2], massScale: 1.0,
      tufts: [
        { dir: [-0.5, 0.5, 0.72], len: 0.16, sweep: [0.05, -0.38, 0.12], front: true },
        { dir: [0, 0.62, 0.78], len: 0.16, sweep: [0, -0.42, 0.12], front: true },
        { dir: [0.5, 0.5, 0.72], len: 0.16, sweep: [-0.05, -0.38, 0.12], front: true },
        { dir: [0, 1, -0.1], len: 0.32, sweep: [0, 0, -0.18] },
        { dir: [-0.62, 0.78, -0.2], len: 0.3, sweep: [-0.12, 0, -0.12] },
        { dir: [0.62, 0.78, -0.2], len: 0.3, sweep: [0.12, 0, -0.12] },
        { dir: [0, 0.45, -0.9], len: 0.3, sweep: [0, -0.12, -0.12] },
        { dir: [-0.95, 0.2, -0.25], len: 0.2, sweep: [-0.08, -0.28, 0] },
        { dir: [0.95, 0.2, -0.25], len: 0.2, sweep: [0.08, -0.28, 0] },
      ],
    },
    face: { eyes: 'manga', brows: true, browTilt: 0.04, mouth: 'small', blush: true, eyeSpread: 0.4, eyeY: -0.14, mouthY: -0.5 },
    outfit: { collar: true, zipper: true, hem: true, hood: true, sleeve: 'long', sleeveW: 6.5, legwear: 'shorts', legW: 8, shoes: 6 },
  },
  designer: {
    archived: true,
    label: 'Designer',
    note: 'A grown-up cartoon you: swept hair, round glasses, grin, tee and jeans.',
    rig: {
      headR: 15, headOffset: 23, torso: 22, torsoW: 22, shoulderX: 9, shoulderUp: 19,
      upperArm: 15, foreArm: 14, thigh: 15, shin: 15, stride: 50,
    },
    torso: 'capsule', head: 'outline', limbs: 'line', eyes: 'none',
    limbW: 2.5, legW: 2.8, outline: 2.3,
    hair: {
      fill: 'ink', mass: [0.06, 0.34, -0.14], massScale: 0.95,
      tufts: [
        { dir: [0.25, 0.9, 0.38], len: 0.26, sweep: [-0.4, 0.04, 0.12], front: true },
        { dir: [-0.3, 0.85, 0.4], len: 0.14, sweep: [-0.25, -0.02, 0.05], front: true },
        { dir: [0.75, 0.6, 0.1], len: 0.12, sweep: [0.05, -0.15, 0] },
      ],
    },
    face: { eyes: 'dots', glasses: true, brows: true, mouth: 'grin', nose: true, eyeSpread: 0.36, eyeY: -0.04, mouthY: -0.46 },
    outfit: { collar: true, sleeve: 'short', sleeveW: 7, hem: true, legwear: 'pants', legW: 7, shoes: 7 },
  },
  classic: {
    label: 'Classic',
    note: 'Today’s figure: outlined capsule body, round head, line limbs.',
    torso: 'capsule', head: 'outline', limbs: 'line', eyes: 'dots',
    limbW: 2.5, legW: 3, outline: 2.5,
  },
  pictogram: {
    archived: true,
    label: 'Pictogram',
    note: 'Solid signage figure. Reads at any size, very calm.',
    rig: { headR: 12.5, torsoW: 16, shoulderX: 6, hipX: 4, headOffset: 18, thigh: 16, shin: 16 },
    torso: 'solid', head: 'solid', limbs: 'line', eyes: 'none',
    limbW: 6, legW: 6.5, outline: 0,
  },
  bean: {
    label: 'Bean',
    note: 'Head and body are one shape. Mascot-like, tiny limbs.',
    rig: {
      torso: 16, torsoW: 36, headR: 18, headOffset: 0, shoulderX: 15, shoulderUp: 6,
      hipX: 7, hipDown: 15, upperArm: 9, foreArm: 9, thigh: 7, shin: 7, stride: 24,
    },
    torso: 'capsule', head: 'none', limbs: 'line', eyes: 'dots', eyeSpread: 28, eyeLift: 0.15,
    limbW: 3, legW: 3.2, outline: 2.6, feet: 4,
  },
  hose: {
    label: 'Rubber hose',
    note: 'Tube limbs, gloves and shoes. Classic cartoon energy.',
    rig: { torsoW: 22, headR: 15, headOffset: 22, shoulderX: 8 },
    torso: 'capsule', head: 'outline', limbs: 'tube', eyes: 'dots', eyeSpread: 22, eyeLift: 0.2, eyeScale: 1.5,
    limbW: 6, legW: 7, outline: 2.2, hands: 4.2, feet: 7,
  },
  contour: {
    archived: true,
    label: 'Line art',
    note: 'One thin continuous line tracing the body’s outline, with a bun and ear swirl.',
    kind: 'contour', limbW: 1.15, wobble: 0.7,
    rig: {
      headR: 10.5, headOffset: 21, torso: 31, torsoW: 22, shoulderX: 12, shoulderUp: 27,
      hipX: 6.5, hipDown: 3, upperArm: 20, foreArm: 18, thigh: 25, shin: 24, stride: 78, seatY: 18,
    },
  },
  oneline: {
    archived: true,
    label: 'One-line',
    note: 'The whole figure is a single continuous pen stroke.',
    kind: 'oneline', limbW: 2.4,
    rig: { headR: 14, headOffset: 26 },
  },
  sketch: {
    label: 'Sketch',
    note: 'Pencil lines that boil, like hand-drawn animation on twos.',
    filter: 'sketch',
    torso: 'capsule', head: 'outline', limbs: 'line', eyes: 'dots', eyeSpread: 30, eyeScale: 1.2,
    limbW: 1.8, legW: 2, outline: 1.8,
    rig: { torsoW: 20, headR: 17, headOffset: 25 },
  },
  blocky: {
    label: 'Block bot',
    note: 'Cube head, box body, flat 3-tone shading from one light.',
    kind: 'blocky', limbW: 4.2, legW: 4.6, outline: 2.2,
    rig: { headR: 13, headOffset: 22, shoulderX: 13.5, hipX: 6, visorZ: 0.98 },
  },
  stars: {
    archived: true,
    label: 'Constellation',
    note: 'Joints are stars, bones are faint lines, head is a ring of dots.',
    kind: 'stars',
  },
  critter: {
    label: 'Critter',
    note: 'Not a person: ears, tail, whiskers on a round body.',
    rig: {
      torso: 14, torsoW: 34, headR: 17, headOffset: 0, shoulderX: 14, shoulderUp: 4,
      hipX: 8, hipDown: 14, upperArm: 8, foreArm: 8, thigh: 8, shin: 8, stride: 26,
    },
    torso: 'capsule', head: 'none', limbs: 'line', eyes: 'dots', eyeSpread: 26, eyeLift: 0.2, eyeScale: 1.3,
    limbW: 3, legW: 3.4, outline: 2.4, feet: 3, critter: true, eyeInset: 0.78,
  },
  wire: {
    archived: true,
    label: 'Wireframe',
    note: 'Construction rings expose the 3D. Technical, drafty.',
    torso: 'capsule', head: 'outline', limbs: 'line', eyes: 'dots',
    limbW: 1.5, legW: 1.6, outline: 1.4, wire: true, joints: true,
  },
};
/** Styles shown in the picker. Archived styles stay renderable but hidden. */
export const STYLE_IDS = Object.keys(STYLES).filter((id) => !STYLES[id].archived);
export const ARCHIVED_STYLE_IDS = Object.keys(STYLES).filter((id) => STYLES[id].archived);

export function rigForStyle(styleId) {
  return { ...RIG, ...(STYLES[styleId]?.rig || {}) };
}

/** Camera-facing runs of a 3D ring, as stroke items (the back half is skipped). */
function pushFrontArcs(items, { key, pts, normals, P, cam, frame, w, depth, trim }) {
  const vis = normals.map((n) => cam.facing(rotY(n, frame.yaw)) > 0);
  const n = pts.length;
  const startAt = vis.findIndex((v, i) => v && !vis[(i - 1 + n) % n]);
  if (startAt < 0) return;
  let run = [];
  let idx = 0;
  for (let c = 0; c <= n; c += 1) {
    const i = (startAt + c) % n;
    if (vis[i] && c < n) run.push(P(pts[i]));
    if ((!vis[i] || c === n) && run.length > 1) {
      items.push({ key: `${key}-${idx}`, type: 'stroke', d: smoothPath(run), w, depth, layer: 1, trim });
      idx += 1;
    }
    if (!vis[i]) run = [];
  }
}

export function buildFigure(skel, frame, cam, trim, opts = {}) {
  const st = STYLES[opts.style] || STYLES.classic;
  if (st.kind === 'oneline') return buildOneLine(skel, frame, cam, trim, st);
  if (st.kind === 'contour') return buildContour(skel, frame, cam, trim, st);
  if (st.kind === 'blocky') return buildBlocky(skel, frame, cam, trim, st);
  if (st.kind === 'stars') return buildConstellation(skel, frame, cam, trim, st);
  const R = skel.rig;
  const items = [];
  const P = (local) => cam.project(toWorld(local, frame));
  const bodyCenter = P(mix(skel.pelvis, skel.chest, 0.5));
  const farness = (d) => clamp((bodyCenter.d - d - 2) / 10);

  const parts = ['legR', 'legL', 'torso', 'head', 'armR', 'armL', 'face'];
  const tr = (name) => stagger(trim, parts.indexOf(name), parts.length, 0.55);
  const fillOf = (t) => smooth((t[1] - 0.55) / 0.45);
  const lineFade = st.limbs === 'line' && st.torso !== 'solid';

  const pushLimb = (key, chain, width, extra) => {
    const [a, b, c] = chain.map(P);
    const depth = attachedDepth({ key, yaw: frame.yaw, cam, chain, bodyD: bodyCenter.d });
    const t = tr(key);
    const d = quadThrough(a, b, c);
    if (st.limbs === 'tube') {
      items.push({ key, type: 'capsule', d, w: width * b.k, line: st.outline * b.k, depth, layer: 1, trim: t });
    } else {
      items.push({ key, type: 'stroke', d, w: width * b.k, depth, layer: 1, trim: t, fade: lineFade ? farness(depth) : 0 });
    }
    if (st.joints) {
      items.push({ key: `${key}-j`, type: 'dot', x: b.x, y: b.y, r: 1.8 * b.k, opacity: smooth(t[1] * 2), depth: depth + 0.01, layer: 1 });
    }
    extra?.(c, depth, t);
  };

  for (const key of ['R', 'L']) {
    const chain = skel.legs[key];
    pushLimb(`leg${key}`, chain, st.legW, (c, depth, t) => {
      if (!st.feet) return;
      const toe = P(add(chain[2], [0, 0.5, st.feet]));
      const d = `M${f(c.x)},${f(c.y)}L${f(toe.x)},${f(toe.y)}`;
      const ft = [t[0], smooth((t[1] - 0.6) / 0.4)];
      if (st.limbs === 'tube') {
        items.push({ key: `foot${key}`, type: 'capsule', d, w: st.legW * 1.15 * c.k, line: st.outline * c.k, depth: depth + 0.02, layer: 1, trim: ft });
      } else {
        items.push({ key: `foot${key}`, type: 'stroke', d, w: st.legW * c.k, depth, layer: 1, trim: ft, fade: lineFade ? farness(depth) : 0 });
      }
    });
  }

  const p0 = P(skel.pelvis);
  const p1 = P(skel.chest);
  const torsoTrim = tr('torso');
  const torsoD = `M${f(p0.x)},${f(p0.y)}L${f(p1.x)},${f(p1.y)}`;
  const torsoK = (p0.k + p1.k) / 2;
  const torsoDepth = (p0.d + p1.d) / 2;
  if (st.torso === 'capsule') {
    items.push({ key: 'torso', type: 'capsule', d: torsoD, w: R.torsoW * torsoK, line: st.outline * torsoK, depth: torsoDepth, layer: 1, trim: torsoTrim });
  } else if (st.torso === 'solid') {
    items.push({ key: 'torso', type: 'stroke', d: torsoD, w: R.torsoW * torsoK, depth: torsoDepth, layer: 1, trim: torsoTrim });
  }
  if (st.wire) {
    const mid = mix(skel.pelvis, skel.chest, 0.5);
    const ring = ringPoints([0, 0, 0], R.torsoW / 2, 'y', 24);
    pushFrontArcs(items, {
      key: 'torso-ring',
      pts: ring.map((p) => add(mid, p)),
      normals: ring.map((p) => mul(p, 2 / R.torsoW)),
      P, cam, frame, w: 1 * torsoK, depth: torsoDepth + 0.01, trim: torsoTrim,
    });
  }

  const hc = P(skel.headC);
  const headTrim = tr('head');
  const headDepth = st.head === 'none' ? torsoDepth : hc.d;
  if (st.head !== 'none') {
    items.push({
      key: 'head', type: 'shape', d: circlePath(hc, R.headR * hc.k), w: Math.max(st.outline, 0.01) * hc.k,
      depth: hc.d, layer: 1, trim: headTrim, fill: fillOf(headTrim), ink: st.head === 'solid',
    });
  }
  if (st.wire && st.head !== 'none') {
    for (const [axis, name] of [['y', 'eq'], ['x', 'mer']]) {
      const ring = ringPoints([0, 0, 0], R.headR, axis, 28).map((p) => headRotate(p, skel.headRot));
      pushFrontArcs(items, {
        key: `head-${name}`,
        pts: ring.map((p) => add(skel.headC, p)),
        normals: ring.map((p) => mul(p, 1 / R.headR)),
        P, cam, frame, w: 1 * hc.k, depth: hc.d + 0.02, trim: headTrim,
      });
    }
  }

  // Eyes are points on the head sphere; they slide around and hide on the back.
  const faceTrim = tr('face');
  if (st.eyes !== 'none' && !opts.hideEyes) {
    const spread = (st.eyeSpread ?? 40) * D2R;
    for (const side of [-1, 1]) {
      const dir = headRotate([side * Math.sin(spread), st.eyeLift ?? 0.12, Math.cos(spread)], skel.headRot);
      const vis = smooth((cam.facing(rotY(dir, frame.yaw)) + 0.02) / 0.28);
      if (vis <= 0.01) continue;
      const e = P(add(skel.headC, mul(dir, R.headR * (st.eyeInset ?? 0.9))));
      items.push({
        key: `eye${side}`, type: 'dot', x: e.x, y: e.y,
        r: 1.7 * (st.eyeScale || 1) * e.k * smooth(faceTrim[1] * 1.4),
        opacity: vis, depth: headDepth + 0.1, layer: 1, paper: st.eyes === 'paper',
      });
    }
  }

  const ctx = { skel, frame, cam, R, hc, st, time: opts.time || 0 };
  if (st.outfit) pushOutfit(items, { ...ctx, outfit: st.outfit, trim: torsoTrim });
  if (st.hair) pushHair(items, { ...ctx, hair: st.hair, trim: headTrim });
  if (st.face && !opts.hideEyes) pushFace(items, { ...ctx, face: st.face, trim: faceTrim });
  if (st.critter) pushCritterBits(items, skel, frame, cam, tr('face'), st, opts.time || 0);

  for (const key of ['R', 'L']) {
    pushLimb(`arm${key}`, skel.arms[key], st.limbW, (c, depth, t) => {
      if (!st.hands) return;
      const ht = [t[0], smooth((t[1] - 0.7) / 0.3)];
      items.push({ key: `hand${key}`, type: 'shape', d: circlePath(c, st.hands * c.k), w: st.outline * c.k, depth: depth + 0.05, layer: 1, trim: ht, fill: fillOf(ht) });
    });
  }

  return items;
}

// --- Alternate drawing languages -------------------------------------------

const norm = (v) => {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
};

/**
 * One-line: the whole figure is a single continuous pen stroke.
 * Route: left foot → pelvis → right foot → back up → right hand → neck →
 * a loop for the head (with a nose bump when seen in profile) → left hand.
 */
function buildOneLine(skel, frame, cam, trim, st) {
  const P = (l) => cam.project(toWorld(l, frame));
  const [, kneeL, footL] = skel.legs.L.map(P);
  const [, kneeR, footR] = skel.legs.R.map(P);
  const [shR, elR, haR] = skel.arms.R.map(P);
  const [shL, elL, haL] = skel.arms.L.map(P);
  const pelvis = P(skel.pelvis);
  const chest = P(skel.chest);
  const hc = P(skel.headC);
  const k = hc.k;
  const hr = skel.rig.headR * k;
  const nudge = (p, dx, dy) => ({ x: p.x + dx * k, y: p.y + dy * k });

  const vx = chest.x - hc.x;
  const vy = chest.y - hc.y;
  const vl = Math.hypot(vx, vy) || 1;
  const neck = { x: hc.x + (vx / vl) * hr, y: hc.y + (vy / vl) * hr };
  const a0 = Math.atan2(neck.y - hc.y, neck.x - hc.x);

  const fwd = headRotate([0, -0.1, 1], skel.headRot);
  const noseP = P(add(skel.headC, mul(fwd, skel.rig.headR)));
  const noseA = Math.atan2(noseP.y - hc.y, noseP.x - hc.x);
  const profile = 1 - Math.abs(cam.facing(rotY(fwd, frame.yaw)));
  // Loop around the head clockwise on screen, a little more than once.
  const dir = Math.sin(noseA - a0) >= 0 ? 1 : -1;
  const loop = [];
  const N = 26;
  for (let i = 1; i <= N; i += 1) {
    const a = a0 + dir * Math.PI * 2.12 * (i / N);
    const da = Math.atan2(Math.sin(a - noseA), Math.cos(a - noseA));
    const bump = 0.24 * profile * Math.exp((-da * da) / 0.035) * (i < N - 2 ? 1 : 0);
    const r = hr * (1 + bump) * (1 - 0.06 * (i / N));
    loop.push({ x: hc.x + Math.cos(a) * r, y: hc.y + Math.sin(a) * r });
  }

  const pts = [
    footL, kneeL, pelvis, kneeR, footR,
    nudge(kneeR, 1.6, -1.2), nudge(pelvis, 1.2, -1),
    shR, elR, haR, nudge(elR, -1.4, -1.6),
    neck, ...loop, nudge(neck, 1.4, 1.2),
    shL, elL, haL,
  ];
  return [{
    key: 'oneline',
    type: 'stroke',
    d: smoothPath(pts),
    w: (st.limbW || 2.4) * k,
    depth: 0,
    layer: 1,
    trim,
  }];
}

/** Block bot: box torso, cube head, flat 3-tone shading. */
function buildBlocky(skel, frame, cam, trim, st) {
  const items = [];
  const R = skel.rig;
  const parts = ['legR', 'legL', 'torso', 'head', 'armR', 'armL', 'face'];
  const tr = (name) => stagger(trim, parts.indexOf(name), parts.length, 0.55);
  const P = (l) => cam.project(toWorld(l, frame));

  const torsoToW = (p) => toWorld(add(skel.pelvis, rotY(rotX(p, skel.lean), skel.twist)), frame);
  const torsoN = (n) => rotY(rotY(rotX(n, skel.lean), skel.twist), frame.yaw);
  const torsoDepth = pushBox(items, {
    key: 'torso', x: [-11, 11], y: [-7, R.torso + 7], z: [-7.5, 7.5],
    toW: torsoToW, rotN: torsoN, cam, trim: tr('torso'), line: st.outline, shade: true, solid: true,
  });

  const rot = skel.headRot;
  const h = R.headR;
  const headToW = (p) => toWorld(add(skel.headC, headRotate(p, rot)), frame);
  const headN = (n) => rotY(headRotate(n, rot), frame.yaw);
  const headDepth = pushBox(items, {
    key: 'head', x: [-h, h], y: [-h * 0.85, h * 0.85], z: [-h * 0.9, h * 0.9],
    toW: headToW, rotN: headN, cam, trim: tr('head'), line: st.outline, shade: true, solid: true,
  });

  // Screen eyes on the front face; antenna on top.
  const faceTrim = tr('face');
  if (cam.facing(headN([0, 0, 1])) > 0.05) {
    const front = h * 0.9 + 0.01;
    [-1, 1].forEach((side) => {
      const q = [[side * 3, 0], [side * 8, 0], [side * 8, 4], [side * 3, 4]]
        .map(([x, y]) => cam.project(headToW([x, y, front])));
      const depth = headDepth + 0.01; // decal: always just above its own face
      items.push({ key: `eye${side}`, type: 'shape', d: linePath(q, true), w: 0.01, depth, layer: 1, trim: [0, 1], fill: smooth(faceTrim[1] * 1.5), ink: true });
    });
  }
  const a0 = cam.project(headToW([0, h * 0.85, 0]));
  const a1 = cam.project(headToW([0, h * 0.85 + 9, 0]));
  items.push({ key: 'antenna', type: 'stroke', d: `M${f(a0.x)},${f(a0.y)}L${f(a1.x)},${f(a1.y)}`, w: st.outline * a0.k, depth: a0.d, layer: 1, trim: faceTrim });
  items.push({ key: 'antenna-tip', type: 'dot', x: a1.x, y: a1.y, r: 2.6 * a1.k * smooth(faceTrim[1] * 1.3 - 0.3), opacity: 1, depth: a1.d, layer: 1 });

  const pushLimb = (key, chain, width) => {
    const [a, b, c] = chain.map(P);
    const depth = attachedDepth({ key, yaw: frame.yaw, cam, chain, bodyD: torsoDepth });
    const t = tr(key);
    items.push({ key, type: 'stroke', d: `M${f(a.x)},${f(a.y)}L${f(b.x)},${f(b.y)}L${f(c.x)},${f(c.y)}`, w: width * b.k, depth, layer: 1, trim: t, join: 'round' });
    items.push({ key: `${key}-end`, type: 'dot', x: c.x, y: c.y, r: width * 0.8 * c.k * smooth((t[1] - 0.7) / 0.3), opacity: 1, depth: depth + 0.01, layer: 1 });
  };
  pushLimb('legR', skel.legs.R, st.legW);
  pushLimb('legL', skel.legs.L, st.legW);
  pushLimb('armR', skel.arms.R, st.limbW);
  pushLimb('armL', skel.arms.L, st.limbW);
  return items;
}

/** Constellation: joints as stars, bones as faint lines, head as a ring of dots. */
function buildConstellation(skel, frame, cam, trim) {
  const items = [];
  const R = skel.rig;
  const P = (l) => cam.project(toWorld(l, frame));
  const chestDir = norm([skel.chest[0] - skel.pelvis[0], skel.chest[1] - skel.pelvis[1], skel.chest[2] - skel.pelvis[2]]);
  const neck = add(skel.headC, mul(chestDir, -R.headR));
  const chains = [
    ['spine', [skel.legs.R[0], skel.pelvis, skel.legs.L[0]]],
    ['back', [skel.pelvis, skel.chest, neck]],
    ['shoulders', [skel.arms.R[0], skel.chest, skel.arms.L[0]]],
    ['legR', skel.legs.R], ['legL', skel.legs.L], ['armR', skel.arms.R], ['armL', skel.arms.L],
  ];
  chains.forEach(([name, chain], i) => {
    const pts = chain.map(P);
    const t = stagger(trim, i, chains.length + 1, 0.5);
    const depth = pts.reduce((s, p) => s + p.d, 0) / pts.length;
    items.push({ key: `c-${name}`, type: 'stroke', d: linePath(pts), w: 1.1 * pts[0].k, depth, layer: 1, trim: t, opacity: 0.5 });
    pts.forEach((p, j) => {
      const big = j === pts.length - 1 && /arm|leg/.test(name);
      items.push({
        key: `s-${name}-${j}`, type: 'dot', x: p.x, y: p.y,
        r: (big ? 3.2 : 2.3) * p.k * smooth((t[1] - j / pts.length * 0.8) * 2),
        opacity: 1, depth: depth + 0.2, layer: 1,
      });
    });
  });
  const hc = P(skel.headC);
  const headT = stagger(trim, chains.length, chains.length + 1, 0.5);
  const count = 18;
  for (let i = 0; i < count; i += 1) {
    const a = -Math.PI / 2 + (i / count) * Math.PI * 2;
    const shown = smooth((headT[1] * count - i) * 1.5);
    if (shown <= 0.01) continue;
    items.push({
      key: `h-${i}`, type: 'dot',
      x: hc.x + Math.cos(a) * R.headR * hc.k, y: hc.y + Math.sin(a) * R.headR * hc.k,
      r: 1.35 * hc.k * shown, opacity: 0.85, depth: hc.d, layer: 1,
    });
  }
  // A brighter "nose star" shows which way the head faces.
  const fwd = headRotate([0, 0, 1], skel.headRot);
  const vis = smooth((cam.facing(rotY(fwd, frame.yaw)) + 0.6) / 0.8);
  const nose = P(add(skel.headC, mul(fwd, R.headR * 0.75)));
  items.push({ key: 'nose', type: 'dot', x: nose.x, y: nose.y, r: 2.6 * hc.k * smooth(headT[1] * 2 - 1), opacity: vis, depth: hc.d + 1, layer: 1 });
  return items;
}

/** Critter extras: ears, tail, nose and whiskers on the bean body. */
function pushCritterBits(items, skel, frame, cam, trim, st, time) {
  const R = skel.rig;
  const P = (l) => cam.project(toWorld(l, frame));
  const rot = skel.headRot;
  const onHead = (v, s = 1) => add(skel.headC, mul(headRotate(norm(v), rot), R.headR * s));
  const bodyDepth = P(mix(skel.pelvis, skel.chest, 0.5)).d;

  [-1, 1].forEach((side) => {
    const a = P(onHead([side * 0.3, 0.92, 0.1]));
    const tip = P(onHead([side * 0.62, 1.0, 0.05], 1.55));
    const b = P(onHead([side * 0.78, 0.55, 0.05]));
    const depth = Math.min(bodyDepth - 0.5, (a.d + b.d + tip.d) / 3);
    items.push({ key: `ear${side}`, type: 'shape', d: linePath([a, tip, b], true), w: st.outline * a.k, depth, layer: 1, trim, fill: smooth((trim[1] - 0.5) / 0.5) });
  });

  const wag = 9 * Math.sin(time * 7);
  const t0 = P(add(skel.pelvis, rotY([0, -2, -R.torsoW / 2 + 2], skel.twist)));
  const t1 = P(add(skel.pelvis, rotY([wag * 0.4, 6, -R.torsoW / 2 - 9], skel.twist)));
  const t2 = P(add(skel.pelvis, rotY([wag, 18, -R.torsoW / 2 - 11], skel.twist)));
  items.push({ key: 'tail', type: 'stroke', d: smoothPath([t0, t1, t2]), w: st.limbW * 1.1 * t0.k, depth: t1.d, layer: 1, trim });

  const fwd = headRotate([0, -0.12, 1], rot);
  const facing = cam.facing(rotY(norm(fwd), frame.yaw));
  const vis = smooth((facing - 0.05) / 0.3);
  if (vis > 0.01) {
    const n = P(onHead([0, -0.12, 1]));
    items.push({ key: 'nose', type: 'dot', x: n.x, y: n.y, r: 2.1 * n.k * smooth(trim[1]), opacity: vis, depth: bodyDepth + 2, layer: 1 });
    [-1, 1].forEach((side) => {
      [0.05, -0.12].forEach((dy, i) => {
        const w0 = P(onHead([side * 0.3, -0.12 + dy, 0.95], 1.0));
        const w1 = P(onHead([side * 0.85, -0.1 + dy * 2, 0.6], 1.28));
        items.push({ key: `wh${side}${i}`, type: 'stroke', d: `M${f(w0.x)},${f(w0.y)}L${f(w1.x)},${f(w1.y)}`, w: 1.1 * w0.k, depth: bodyDepth + 2, layer: 1, trim, opacity: vis });
      });
    });
  }
}

// --- Contour line art ------------------------------------------------------
//
// One continuous, thin line that traces the *outline of the body's volume*
// (not the skeleton): bun spiral → head loop → ear swirl → neck → shoulder →
// arm out and back → torso side → leg and foot → crotch → other leg → other
// side → other arm → neck → a loose finishing flick. Volumes are tapered tubes
// for limbs and elliptical cross-sections for the torso, so the outline
// narrows and widens correctly as the figure turns.

const S = {
  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
  mul: (a, s) => ({ x: a.x * s, y: a.y * s }),
  unit: (a) => {
    const l = Math.hypot(a.x, a.y) || 1;
    return { x: a.x / l, y: a.y / l };
  },
  perp: (a) => ({ x: -a.y, y: a.x }),
  dot: (a, b) => a.x * b.x + a.y * b.y,
  lerp: (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }),
};

const CONTOUR_TORSO = [
  // h: height along the spine from the pelvis; W: half width; D: half depth
  { name: 'shoulder', h: 1.0, W: 13.5, D: 7.5 },
  { name: 'chest', h: 0.78, W: 11.5, D: 8 },
  { name: 'waist', h: 0.42, W: 8.8, D: 6.4 },
  { name: 'hip', h: 0.02, W: 12, D: 8 },
];

/** Stable, tiny wobble so the line feels hand-drawn without boiling. */
function wobble(p, i, k, amount) {
  const a = Math.sin(i * 12.9898 + 4.1) * 43758.5453;
  const b = Math.sin(i * 78.233 + 1.7) * 12345.6789;
  return { x: p.x + (a - Math.floor(a) - 0.5) * amount * k, y: p.y + (b - Math.floor(b) - 0.5) * amount * k };
}

function buildContour(skel, frame, cam, trim, st) {
  const R = skel.rig;
  const P = (l) => cam.project(toWorld(l, frame));
  const pel = P(skel.pelvis);
  const k = pel.k;
  const spine3 = norm([skel.chest[0] - skel.pelvis[0], skel.chest[1] - skel.pelvis[1], skel.chest[2] - skel.pelvis[2]]);
  const along = (h) => add(skel.pelvis, mul(spine3, h));
  const top = R.shoulderUp + 2;

  // Torso silhouette: elliptical cross-sections rotated by yaw (+ some twist).
  const rel = (frame.yaw + skel.twist * 0.6) * D2R;
  const halfW = (W, D) => Math.hypot(W * Math.cos(rel), D * Math.sin(rel));
  const upS = S.unit(S.sub(P(skel.chest), pel));
  const rightS = { x: -upS.y, y: upS.x }; // screen-right of the spine
  const torsoEdge = (lvl, side) => {
    const c = P(along(lvl.h * top));
    return S.add(c, S.mul(rightS, side * halfW(lvl.W, lvl.D) * c.k));
  };
  const torsoMid = P(along(top * 0.5));

  // Limbs as tapered tubes: returns outline points on a given side.
  const limbEdges = (chain, radii) => {
    const [a, b, c] = chain.map(P);
    const n1 = S.perp(S.unit(S.sub(b, a)));
    const n2 = S.perp(S.unit(S.sub(c, b)));
    const nb = S.unit(S.add(n1, n2));
    // "outer" = the side facing away from the torso centre line.
    const away = S.dot(S.perp(S.unit(S.sub(c, a))), S.sub(b, torsoMid)) >= 0 ? 1 : -1;
    const edge = (s) => [
      S.add(a, S.mul(n1, s * radii[0] * a.k)),
      S.add(b, S.mul(nb, s * radii[1] * b.k)),
      S.add(c, S.mul(n2, s * radii[2] * c.k)),
    ];
    return { a, b, c, outer: edge(away), inner: edge(-away), dir: S.unit(S.sub(c, b)), n: S.mul(n2, away) };
  };

  // Rounded end cap from the outer edge, around the tip, to the inner edge.
  const cap = (end, dir, n, r, steps = 4) => {
    const pts = [];
    for (let i = 1; i < steps; i += 1) {
      const a = (i / steps) * Math.PI;
      pts.push(S.add(end, S.add(S.mul(n, Math.cos(a) * r), S.mul(dir, Math.sin(a) * r * 1.25))));
    }
    return pts;
  };

  const route = [];
  const push = (...pts) => route.push(...pts);

  // --- Head: bun spiral, head loop, ear swirl --------------------------------
  const rot = skel.headRot;
  const hc = P(skel.headC);
  const hr = R.headR * hc.k;
  const bun3 = add(skel.headC, mul(headRotate(norm([0, 0.8, -0.6]), rot), R.headR * 1.05));
  const bun = P(bun3);
  const bunR = R.headR * 0.42 * hc.k;
  const bunStart = Math.atan2(hc.y - bun.y, hc.x - bun.x);
  for (let i = 0; i <= 14; i += 1) {
    const a = bunStart + (i / 14) * Math.PI * 3.3;
    const r = bunR * (0.75 + 0.35 * Math.sin(i * 0.9));
    push({ x: bun.x + Math.cos(a) * r + (i / 14) * 2 * hc.k, y: bun.y + Math.sin(a) * r * 0.85 });
  }

  const fwd = headRotate(norm([0, -0.15, 1]), rot);
  const noseP = P(add(skel.headC, mul(fwd, R.headR)));
  const noseA = Math.atan2(noseP.y - hc.y, noseP.x - hc.x);
  const profile = 1 - Math.abs(cam.facing(rotY(fwd, frame.yaw)));
  const a0 = Math.atan2(bun.y - hc.y, bun.x - hc.x);
  const spin = Math.sin(noseA - a0) >= 0 ? 1 : -1;
  const N = 22;
  for (let i = 0; i <= N; i += 1) {
    const a = a0 + spin * Math.PI * 2 * (i / N) * 1.02;
    const da = Math.atan2(Math.sin(a - noseA), Math.cos(a - noseA));
    const bump = 0.2 * profile * Math.exp((-da * da) / 0.03);
    const chin = 0.12 * Math.max(0, Math.cos(a - Math.atan2(upS.y * -1, upS.x * -1)));
    const r = hr * (1 + bump + chin * 0.5);
    push({ x: hc.x + Math.cos(a) * r, y: hc.y + Math.sin(a) * r * 1.08 });
  }

  // Ear: a small swirl on whichever side faces the camera.
  for (const side of [-1, 1]) {
    const earDir = headRotate([side, 0, -0.05], rot);
    const vis = smooth((cam.facing(rotY(earDir, frame.yaw)) - 0.15) / 0.4);
    if (vis < 0.05) continue;
    const ear = P(add(skel.headC, mul(earDir, R.headR * 0.78)));
    const er = 2.4 * hc.k * vis;
    for (let i = 0; i <= 6; i += 1) {
      const a = (i / 6) * Math.PI * 1.7 - Math.PI / 2;
      push({ x: ear.x + Math.cos(a) * er * (1 - i / 14), y: ear.y + Math.sin(a) * er * 1.5 });
    }
  }

  // --- Neck, shoulders, arms, torso, legs -------------------------------------
  const neckTop3 = add(skel.headC, mul(spine3, -R.headR * 0.72));
  const neckBase3 = along(top + 3);
  const nt = P(neckTop3);
  const nb = P(neckBase3);
  const neckR = 3.4;
  const neckEdge = (p, side) => S.add(p, S.mul(rightS, side * neckR * p.k));

  const [armA, armB] = P(skel.arms.R[0]).x <= P(skel.arms.L[0]).x
    ? [skel.arms.R, skel.arms.L] : [skel.arms.L, skel.arms.R];
  const [legA, legB] = P(skel.legs.R[0]).x <= P(skel.legs.L[0]).x
    ? [skel.legs.R, skel.legs.L] : [skel.legs.L, skel.legs.R];

  const ARM_R = [3.6, 2.7, 2.0];
  const LEG_R = [5.4, 3.6, 2.4];
  const [shoulder, chest, waist, hip] = CONTOUR_TORSO;

  const pushArm = (chain) => {
    const e = limbEdges(chain, ARM_R);
    push(e.outer[0], e.outer[1], e.outer[2]);
    push(...cap(e.c, e.dir, e.n, 2.2 * e.c.k, 5));
    push(e.inner[2], e.inner[1], S.lerp(e.inner[0], e.inner[1], 0.25));
  };
  const pushArmReverse = (chain) => {
    const e = limbEdges(chain, ARM_R);
    push(S.lerp(e.inner[0], e.inner[1], 0.25), e.inner[1], e.inner[2]);
    push(...cap(e.c, e.dir, S.mul(e.n, -1), 2.2 * e.c.k, 5));
    push(e.outer[2], e.outer[1], e.outer[0]);
  };
  const footPts = (chain, reverse) => {
    const foot3 = chain[2];
    const heel = P(add(foot3, [0, -1.5, -2.5]));
    const toe = P(add(foot3, [0, -2, 8]));
    const instep = P(add(foot3, [0, 1.5, 4]));
    return reverse ? [instep, toe, heel] : [heel, toe, instep];
  };
  const pushLeg = (chain, reverse) => {
    const e = limbEdges(chain, LEG_R);
    if (!reverse) {
      push(e.outer[0], e.outer[1], e.outer[2], ...footPts(chain, false), e.inner[2], e.inner[1]);
    } else {
      push(e.inner[1], e.inner[2], ...footPts(chain, true), e.outer[2], e.outer[1], e.outer[0]);
    }
  };

  push(neckEdge(nt, -1), neckEdge(nb, -1));
  push(S.add(torsoEdge(shoulder, -1), S.mul(upS, 2 * k)));
  pushArm(armA);
  push(torsoEdge(chest, -1), torsoEdge(waist, -1), torsoEdge(hip, -1));
  pushLeg(legA, false);
  push(P(along(-4)));
  pushLeg(legB, true);
  push(torsoEdge(hip, 1), torsoEdge(waist, 1), torsoEdge(chest, 1));
  pushArmReverse(armB);
  push(S.add(torsoEdge(shoulder, 1), S.mul(upS, 2 * k)));
  push(neckEdge(nb, 1), neckEdge(nt, 1));
  // Loose finish: drift back into the jaw line.
  push(S.add(hc, S.mul(S.unit(S.sub(nt, hc)), hr * 0.55)), S.add(hc, S.mul(rightS, -hr * 0.25)));

  const pts = route.map((p, i) => wobble(p, i, k, st.wobble ?? 0.7));
  return [{
    key: 'contour',
    type: 'stroke',
    d: smoothPath(pts),
    w: (st.limbW || 1.2) * k,
    depth: 0,
    layer: 1,
    trim,
  }];
}

// --- Character details: hair, faces, clothes --------------------------------
//
// Everything is still 3D-anchored: hair tufts and face features are points on
// the head sphere, clothing lines are rings/lines on the torso and limbs.
// Depth sorting decides what is in front, so the same rules hold at any yaw.

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

function screenEllipse(c, rx, ry, n = 16) {
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push({ x: c.x + Math.cos(a) * rx, y: c.y + Math.sin(a) * ry });
  }
  return pts;
}

/** Blink: 1 = open, dips to 0 briefly every few seconds. */
function blinkAmount(time) {
  const t = (time + 0.7) % 3.4;
  return t < 0.14 ? Math.abs(t - 0.07) / 0.07 : 1;
}

function pushHair(items, ctx) {
  const { skel, frame, cam, R, hc, hair, trim } = ctx;
  const rot = skel.headRot;
  const ink = hair.fill !== 'paper';
  const onHead = (v, s = 1) => add(skel.headC, mul(headRotate(norm(v), rot), R.headR * s));
  const fill = smooth((trim[1] - 0.4) / 0.6);

  // Hair mass: a sphere offset up/back. Depth sorting against the head makes
  // it a crescent from the front and a full cap from behind.
  const off = hair.mass || [0, 0.22, -0.2];
  const massC3 = add(skel.headC, mul(headRotate(off, rot), R.headR));
  const massC = cam.project(toWorld(massC3, frame));
  const massR = R.headR * (hair.massScale || 1.04) * massC.k;
  // In front of the face only when the back of the head turns toward us
  // (judged horizontally, so camera tilt doesn't flip it in profile).
  const offW = rotY(headRotate([off[0], 0, off[2]], rot), frame.yaw);
  const backToward = offW[2] > 0.08;
  items.push({
    key: 'hair-mass', type: 'shape', d: circlePath(massC, massR), w: 2.2 * massC.k,
    depth: backToward ? hc.d + 0.6 + offW[2] : hc.d - 0.6, layer: 1, trim, fill, ink,
  });

  // Tufts: little spikes anchored on the sphere, pointing outward.
  (hair.tufts || []).forEach((tuft, i) => {
    const dir = norm(tuft.dir);
    const tangent = norm(cross(dir, [0, 0, 1]).some((v) => Math.abs(v) > 0.05) ? cross(dir, [0, 0, 1]) : [1, 0, 0]);
    const w = tuft.w ?? 0.28;
    const b1 = onHead(add(dir, mul(tangent, w)), 1.0);
    const b2 = onHead(add(dir, mul(tangent, -w)), 1.0);
    const tipLocal = add(mul(dir, R.headR * (1 + tuft.len)), mul(tuft.sweep || [0, 0, 0], R.headR));
    const tip = add(skel.headC, headRotate(tipLocal, rot));
    const pts = [b1, tip, b2].map((p) => cam.project(toWorld(p, frame)));
    const depth = pts.reduce((s, p) => s + p.d, 0) / 3;
    items.push({
      key: `tuft-${i}`, type: 'shape', d: linePath(pts, true), w: 2 * hc.k,
      depth: tuft.front ? Math.max(depth, hc.d + 0.2) : depth, layer: 1,
      trim: stagger(trim, i % 3, 3, 0.4), fill, ink, join: 'round',
    });
  });
}

function pushFace(items, ctx) {
  const { skel, frame, cam, R, hc, face, trim, time } = ctx;
  const rot = skel.headRot;
  const P = (l) => cam.project(toWorld(l, frame));
  const dirAt = (v) => headRotate(norm(v), rot);
  const visOf = (dir, lo = 0.05) => smooth((cam.facing(rotY(dir, frame.yaw)) - lo) / 0.3);
  const show = smooth((trim[1] - 0.2) / 0.8);
  const blink = blinkAmount(time);
  const spread = face.eyeSpread ?? 0.36;

  for (const side of [-1, 1]) {
    const dir = dirAt([side * spread, face.eyeY ?? -0.02, 1]);
    const vis = visOf(dir);
    if (vis < 0.02) continue;
    const c = P(add(skel.headC, mul(dir, R.headR * 0.97)));
    const facing = clamp(cam.facing(rotY(dir, frame.yaw)), 0, 1);
    const squash = 0.35 + 0.65 * facing;
    const base = hc.d + 1 + vis;

    if (face.eyes === 'manga') {
      const rx = R.headR * 0.17 * c.k * squash * show;
      const ry = R.headR * 0.24 * c.k * show;
      if (blink < 0.25) {
        items.push({ key: `lid${side}`, type: 'stroke', d: `M${f(c.x - rx)},${f(c.y)}Q${f(c.x)},${f(c.y + ry * 0.4)} ${f(c.x + rx)},${f(c.y)}`, w: 2 * c.k, depth: base, layer: 1, trim: [0, 1], opacity: vis });
      } else {
        const ey = ry * blink;
        items.push({ key: `eye${side}`, type: 'shape', d: linePath(screenEllipse(c, rx, ey), true), w: 1.3 * c.k, depth: base, layer: 1, trim: [0, 1], fill: vis });
        const look = { x: c.x + side * 0 + (rx * 0.15), y: c.y + ey * 0.12 };
        items.push({ key: `pupil${side}`, type: 'shape', d: linePath(screenEllipse(look, rx * 0.68, ey * 0.74), true), w: 0.01, depth: base + 0.1, layer: 1, trim: [0, 1], fill: vis, ink: true });
        items.push({ key: `shine${side}`, type: 'dot', x: look.x - rx * 0.28, y: look.y - ey * 0.38, r: rx * 0.3, opacity: vis, depth: base + 0.2, layer: 1, paper: true });
        // Heavy upper lash line, the main manga cue.
        items.push({ key: `lash${side}`, type: 'stroke', d: `M${f(c.x - rx * 1.15)},${f(c.y - ey * 0.55)}Q${f(c.x)},${f(c.y - ey * 1.25)} ${f(c.x + rx * 1.2)},${f(c.y - ey * 0.75)}`, w: 2.4 * c.k, depth: base + 0.3, layer: 1, trim: [0, 1], opacity: vis });
      }
    } else {
      // Dot eyes, squashed for blinks.
      const r = R.headR * 0.075 * c.k * show;
      items.push({ key: `eye${side}`, type: 'shape', d: linePath(screenEllipse(c, r * squash, r * Math.max(blink, 0.15)), true), w: 0.01, depth: base, layer: 1, trim: [0, 1], fill: vis, ink: true });
    }

    if (face.brows) {
      const b0 = P(add(skel.headC, mul(dirAt([side * (spread - 0.14), 0.3, 1]), R.headR * 1.0)));
      const b1 = P(add(skel.headC, mul(dirAt([side * (spread + 0.16), 0.36 + (face.browTilt || 0), 1]), R.headR * 1.0)));
      items.push({ key: `brow${side}`, type: 'stroke', d: `M${f(b0.x)},${f(b0.y)}L${f(b1.x)},${f(b1.y)}`, w: 2 * c.k, depth: base + 0.4, layer: 1, trim: [0, show], opacity: vis });
    }

    if (face.glasses) {
      const center = add(skel.headC, mul(dir, R.headR * 1.06));
      const u = norm(cross(dir, headRotate([0, 1, 0], rot)));
      const v = cross(u, dir);
      const gr = R.headR * 0.27;
      const ring = [];
      for (let i = 0; i < 18; i += 1) {
        const a = (i / 18) * Math.PI * 2;
        ring.push(P(add(center, add(mul(u, Math.cos(a) * gr), mul(v, Math.sin(a) * gr * 0.85)))));
      }
      items.push({ key: `lens${side}`, type: 'stroke', d: smoothPath(ring, true), w: 1.8 * c.k, depth: base + 0.5, layer: 1, trim: [0, show], opacity: vis });
      // Temple arm back toward the ear (reads in profile).
      const t0 = P(add(center, mul(u, side * -gr)));
      const t1 = P(add(skel.headC, mul(dirAt([side * 1, 0.05, -0.15]), R.headR * 1.03)));
      items.push({ key: `temple${side}`, type: 'stroke', d: `M${f(t0.x)},${f(t0.y)}L${f(t1.x)},${f(t1.y)}`, w: 1.6 * c.k, depth: (t0.d + t1.d) / 2 + 0.3, layer: 1, trim: [0, show], opacity: 1 });
    }
  }

  if (face.glasses) {
    const l = P(add(skel.headC, mul(dirAt([-0.12, -0.02, 1]), R.headR * 1.07)));
    const r = P(add(skel.headC, mul(dirAt([0.12, -0.02, 1]), R.headR * 1.07)));
    const vis = visOf(dirAt([0, 0, 1]), -0.1);
    items.push({ key: 'bridge', type: 'stroke', d: `M${f(l.x)},${f(l.y)}Q${f((l.x + r.x) / 2)},${f((l.y + r.y) / 2 - 1.5 * hc.k)} ${f(r.x)},${f(r.y)}`, w: 1.6 * hc.k, depth: hc.d + 2, layer: 1, trim: [0, show], opacity: vis });
  }

  if (face.mouth) {
    const mDir = dirAt([0, face.mouthY ?? -0.42, 1]);
    const vis = visOf(mDir);
    if (vis > 0.02) {
      const wide = face.mouth === 'grin' ? 0.26 : 0.14;
      const a = P(add(skel.headC, mul(dirAt([-wide, face.mouthY ?? -0.42, 1]), R.headR)));
      const b = P(add(skel.headC, mul(dirAt([wide, face.mouthY ?? -0.42, 1]), R.headR)));
      const m = P(add(skel.headC, mul(mDir, R.headR)));
      const dip = (face.mouth === 'grin' ? 3.2 : 1.8) * m.k;
      items.push({ key: 'mouth', type: face.mouth === 'grin' ? 'shape' : 'stroke', d: face.mouth === 'grin' ? `M${f(a.x)},${f(a.y)}Q${f(m.x)},${f(m.y + dip * 2)} ${f(b.x)},${f(b.y)}Z` : `M${f(a.x)},${f(a.y)}Q${f(m.x)},${f(m.y + dip)} ${f(b.x)},${f(b.y)}`, w: 1.8 * m.k, depth: hc.d + 1.5, layer: 1, trim: [0, show], fill: vis, opacity: vis, ink: face.mouth === 'grin' });
    }
  }

  if (face.nose) {
    const nDir = dirAt([0, -0.18, 1]);
    const vis = visOf(nDir, -0.2);
    const n = P(add(skel.headC, mul(nDir, R.headR * 1.04)));
    items.push({ key: 'nose', type: 'dot', x: n.x, y: n.y, r: R.headR * 0.075 * n.k * show, opacity: vis, depth: hc.d + 1.2, layer: 1 });
  }

  if (face.blush) {
    for (const side of [-1, 1]) {
      const dir = dirAt([side * 0.55, -0.28, 1]);
      const vis = visOf(dir, 0.1);
      if (vis < 0.05) continue;
      const c = P(add(skel.headC, mul(dir, R.headR)));
      [-1, 0, 1].forEach((j) => {
        const x = c.x + j * 1.8 * c.k;
        items.push({ key: `blush${side}${j}`, type: 'stroke', d: `M${f(x + 1 * c.k)},${f(c.y - 1.4 * c.k)}L${f(x - 1 * c.k)},${f(c.y + 1.4 * c.k)}`, w: 1 * c.k, depth: hc.d + 1, layer: 1, trim: [0, show], opacity: vis * 0.7 });
      });
    }
  }
}

function pushOutfit(items, ctx) {
  const { skel, frame, cam, R, outfit, trim, st } = ctx;
  const P = (l) => cam.project(toWorld(l, frame));
  const spine3 = norm([skel.chest[0] - skel.pelvis[0], skel.chest[1] - skel.pelvis[1], skel.chest[2] - skel.pelvis[2]]);
  const torsoAt = (h) => add(skel.pelvis, mul(spine3, h));
  const torsoNormal = (n) => rotY(rotY(n, skel.twist), frame.yaw);
  const show = smooth((trim[1] - 0.3) / 0.7);
  const rw = R.torsoW / 2;
  const torsoDepth = (P(skel.pelvis).d + P(skel.chest).d) / 2;

  const frontRing = (key, h, radius, w = 1.8) => {
    const ring = ringPoints([0, 0, 0], radius, 'y', 28).map((p) => rotY(p, skel.twist));
    pushFrontArcs(items, {
      key, pts: ring.map((p) => add(torsoAt(h), p)), normals: ring.map((p) => mul(rotY(p, 0), 1 / radius)),
      P, cam, frame, w: w * P(torsoAt(h)).k, depth: torsoDepth + 0.6, trim: [0, show],
    });
  };

  if (outfit.collar) frontRing('collar', R.torso + rw * 0.55, rw * 0.62);
  if (outfit.hem) frontRing('hem', -rw * 0.35, rw * 0.98);
  if (outfit.belt) frontRing('belt', -rw * 0.1, rw * 1.0, 2.6);

  if (outfit.zipper) {
    const front = torsoNormal([0, 0, 1]);
    const vis = smooth((cam.facing(front) - 0.1) / 0.3);
    if (vis > 0.02) {
      const a = P(add(torsoAt(R.torso + rw * 0.35), rotY([0, 0, rw * 0.96], skel.twist)));
      const b = P(add(torsoAt(-rw * 0.3), rotY([0, 0, rw * 1.0], skel.twist)));
      items.push({ key: 'zip', type: 'stroke', d: `M${f(a.x)},${f(a.y)}L${f(b.x)},${f(b.y)}`, w: 1.4 * a.k, depth: torsoDepth + 0.7, layer: 1, trim: [0, show], opacity: vis });
    }
  }

  if (outfit.hood) {
    const c = P(add(torsoAt(R.torso + rw * 0.4), rotY([0, 0, -rw * 0.75], skel.twist)));
    items.push({ key: 'hood', type: 'shape', d: circlePath(c, rw * 0.62 * c.k), w: st.outline * c.k, depth: c.d, layer: 1, trim: [0, show], fill: show });
  }

  // Sleeves: fabric tubes over the arm line (short = upper arm, long = to the wrist).
  for (const key of ['R', 'L']) {
    const [sh, el, ha] = skel.arms[key];
    if (!outfit.sleeve) continue;
    const pts = outfit.sleeve === 'short' ? [sh, mix(sh, el, 0.6)] : [sh, el, mix(el, ha, 0.82)];
    const pp = pts.map(P);
    const d = pp.length === 2 ? `M${f(pp[0].x)},${f(pp[0].y)}L${f(pp[1].x)},${f(pp[1].y)}` : quadThrough(pp[0], pp[1], pp[2]);
    const armDepth = [sh, el, ha].map(P).reduce((s2, p) => s2 + p.d, 0) / 3 - 2.9;
    items.push({ key: `sleeve${key}`, type: 'capsule', d, w: (outfit.sleeveW || 6) * pp[0].k, line: st.outline * pp[0].k, depth: armDepth, layer: 1, trim: [0, show] });
    if (outfit.sleeve === 'long') {
      const hp = P(ha);
      items.push({ key: `hand${key}`, type: 'shape', d: circlePath(hp, 2.6 * hp.k), w: st.outline * hp.k, depth: armDepth + 0.05, layer: 1, trim: [0, show], fill: show });
    }
  }

  // Legwear: outlined tubes over the leg line.
  for (const key of ['R', 'L']) {
    const [hip, knee, foot] = skel.legs[key];
    const pts = outfit.legwear === 'shorts'
      ? [hip, mix(hip, knee, 0.75)]
      : outfit.legwear === 'pants' ? [hip, knee, mix(knee, foot, 0.9)] : null;
    if (!pts) continue;
    const pp = pts.map(P);
    const d = pp.length === 2 ? `M${f(pp[0].x)},${f(pp[0].y)}L${f(pp[1].x)},${f(pp[1].y)}` : quadThrough(pp[0], pp[1], pp[2]);
    const depth = pp.reduce((s2, p) => s2 + p.d, 0) / pp.length - 2.9;
    items.push({ key: `legwear${key}`, type: 'capsule', d, w: (outfit.legW || 7.5) * pp[0].k, line: st.outline * pp[0].k, depth, layer: 1, trim: [0, show] });
  }

  // Shoes: chunky outlined capsules.
  if (outfit.shoes) {
    for (const key of ['R', 'L']) {
      const foot = skel.legs[key][2];
      const a = P(add(foot, [0, 0.8, -2]));
      const b = P(add(foot, [0, 0.8, outfit.shoes]));
      const depth = (a.d + b.d) / 2 - 2.8;
      items.push({ key: `shoe${key}`, type: 'capsule', d: `M${f(a.x)},${f(a.y)}L${f(b.x)},${f(b.y)}`, w: 5.5 * a.k, line: st.outline * a.k, depth, layer: 1, trim: [0, show] });
    }
  }
}

/** Rig overlay: joints + bones, for the inspector. */
export function buildRigOverlay(skel, frame, cam) {
  const P = (local) => cam.project(toWorld(local, frame));
  const chains = [
    [skel.pelvis, skel.chest, skel.headC],
    ...Object.values(skel.arms),
    ...Object.values(skel.legs),
  ];
  return chains.map((chain) => chain.map(P));
}

// --- Boxes / rings ---------------------------------------------------------

const BOX_FACES = [
  { n: [0, 0, 1], v: [4, 5, 6, 7] },
  { n: [0, 0, -1], v: [1, 0, 3, 2] },
  { n: [1, 0, 0], v: [5, 1, 2, 6] },
  { n: [-1, 0, 0], v: [0, 4, 7, 3] },
  { n: [0, 1, 0], v: [7, 6, 2, 3], name: 'top' },
  { n: [0, -1, 0], v: [0, 1, 5, 4], name: 'bottom' },
];

function boxCorners([x0, x1], [y0, y1], [z0, z1]) {
  return [
    [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
    [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
  ];
}

const LIGHT = (() => {
  const l = [-0.5, 0.8, 0.6];
  const n = Math.hypot(...l);
  return l.map((v) => v / n);
})();

/** Flat-shading tone (0 lit, 1 mid, 2 shadow) for a world-space normal. */
function lightTone(n) {
  const d = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2];
  return d > 0.45 ? 0 : d > 0 ? 1 : 2;
}

/**
 * Pushes the camera-facing faces of a box. With `solid`, the box sorts as one
 * object at its centre depth (a closed convex box's visible faces never
 * overlap each other), and the returned depth lets decals sit right on top.
 * toW maps local points into world space, rotN maps local normals.
 */
function pushBox(items, { key, x, y, z, toW, rotN, cam, trim, layer = 1, bias = 0, skip = [], line = 2, shade = false, solid = false }) {
  const corners = boxCorners(x, y, z).map((p) => cam.project(toW(p)));
  const visible = BOX_FACES.filter((face) => !skip.includes(face.name) && cam.facing(rotN(face.n)) > 0.02);
  const centerDepth = corners.reduce((s, p) => s + p.d, 0) / corners.length + bias;
  visible.forEach((face, i) => {
    const pts = face.v.map((idx) => corners[idx]);
    const depth = solid ? centerDepth + i * 0.001 : pts.reduce((s, p) => s + p.d, 0) / 4 + bias;
    const t = stagger(trim, i, visible.length, 0.6);
    items.push({
      key: `${key}-${face.v.join('')}`,
      type: 'shape',
      d: linePath(pts, true),
      w: line * pts[0].k,
      depth,
      layer,
      trim: t,
      fill: smooth((t[1] - 0.5) / 0.5),
      join: 'round',
      tone: shade ? lightTone(rotN(face.n)) : 0,
    });
  });
  return centerDepth;
}

function ringPoints(center, radius, axis, count = 28) {
  const pts = [];
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    const c = Math.cos(a) * radius;
    const s = Math.sin(a) * radius;
    if (axis === 'x') pts.push([center[0], center[1] + c, center[2] + s]);
    else if (axis === 'y') pts.push([center[0] + s, center[1], center[2] + c]);
    else pts.push([center[0] + s, center[1] + c, center[2]]);
  }
  return pts;
}

// --- Props -----------------------------------------------------------------

function buildHeadset(skel, frame, cam, trim) {
  const items = [];
  const rot = skel.headRot;
  const R = skel.rig.headR;
  const toW = (p) => toWorld(add(skel.headC, headRotate(p, rot)), frame);
  const rotN = (n) => rotY(headRotate(n, rot), frame.yaw);
  const hc = cam.project(toWorld(skel.headC, frame));

  // Strap: a ring around the head, split into arcs so each arc can sit in
  // front of or behind the head on its own.
  const strapTrim = stagger(trim, 0, 2, 0.3);
  const ring = ringPoints([0, 1, 0], R * 1.04, 'y', 32).map((p) => rotX(p, -8));
  const arcs = 8;
  for (let i = 0; i < arcs; i += 1) {
    const seg = [];
    for (let j = 0; j <= 4; j += 1) seg.push(ring[(i * 4 + j) % ring.length]);
    const proj = seg.map((p) => cam.project(toW(p)));
    const depth = proj.reduce((s, p) => s + p.d, 0) / proj.length;
    items.push({
      key: `strap-${i}`,
      type: 'stroke',
      d: smoothPath(proj),
      w: 3.2 * hc.k,
      depth: depth > hc.d ? hc.d + 2 + (depth - hc.d) : depth,
      layer: 1,
      trim: stagger(strapTrim, i, arcs, 0),
    });
  }

  pushBox(items, {
    key: 'visor',
    x: [-R * 1.0, R * 1.0],
    y: [-5, 8],
    z: [R * (skel.rig.visorZ ?? 0.62), R * (skel.rig.visorZ ?? 0.62) + 9],
    toW,
    rotN,
    cam,
    trim: stagger(trim, 1, 2, 0.3),
    bias: 4,
  });
  return items;
}

const KART = {
  tub: { x: [-17, 17], y: [5, 17], z: [-26, 30] },
  hood: { x: [-12, 12], y: [16, 22], z: [12, 42] },
  seat: { x: [-11, 11], y: [16, 34], z: [-27, -21] },
  wing: { x: [-19, 19], y: [31, 33], z: [-39, -31] },
  wheels: [
    [-20, 9, 25], [20, 9, 25], [-20, 9, -19], [20, 9, -19],
  ],
  wheelR: 9,
};

function buildKart(skel, frame, cam, trim, spin) {
  const items = [];
  const toW = (p) => toWorld(p, frame);
  const rotN = (n) => rotY(n, frame.yaw);
  const parts = 7;
  const tr = (i) => stagger(trim, i, parts, 0.5);

  pushBox(items, { key: 'tub', ...KART.tub, toW, rotN, cam, trim: tr(0), skip: ['top'], bias: 0 });
  pushBox(items, { key: 'hood', ...KART.hood, toW, rotN, cam, trim: tr(1), bias: 7 });
  pushBox(items, { key: 'seat', ...KART.seat, toW, rotN, cam, trim: tr(2) });

  KART.wheels.forEach((w, i) => {
    const ring = ringPoints(w, KART.wheelR, 'x', 24).map((p) => cam.project(toW(p)));
    const c = cam.project(toW(w));
    const t = tr(3 + Math.min(i, 3));
    items.push({
      key: `wheel-${i}`,
      type: 'shape',
      d: smoothPath(ring, true),
      w: 2.4 * c.k,
      depth: c.d + (w[0] < 0 ? -0.5 : 0.5),
      layer: 1,
      trim: t,
      fill: smooth((t[1] - 0.5) / 0.5),
    });
    // Spokes show the wheel spinning (and foreshorten to nothing face-on).
    const a = spin;
    const r = KART.wheelR * 0.7;
    const s1 = [w[0], w[1] + Math.cos(a) * r, w[2] + Math.sin(a) * r];
    const s2 = [w[0], w[1] - Math.cos(a) * r, w[2] - Math.sin(a) * r];
    const p1 = cam.project(toW(s1));
    const p2 = cam.project(toW(s2));
    items.push({
      key: `spoke-${i}`,
      type: 'stroke',
      d: `M${f(p1.x)},${f(p1.y)}L${f(p2.x)},${f(p2.y)}`,
      w: 1.6 * c.k,
      depth: c.d + (w[0] < 0 ? -0.4 : 0.6),
      layer: 1,
      trim: [t[0], smooth((t[1] - 0.7) / 0.3)],
    });
  });

  // Rear wing on two posts.
  pushBox(items, { key: 'wing', ...KART.wing, toW, rotN, cam, trim: tr(5) });
  for (const x of [-8, 8]) {
    const a = cam.project(toW([x, 17, -30]));
    const b = cam.project(toW([x, 31, -34]));
    items.push({
      key: `post${x}`,
      type: 'stroke',
      d: `M${f(a.x)},${f(a.y)}L${f(b.x)},${f(b.y)}`,
      w: 2 * a.k,
      depth: (a.d + b.d) / 2,
      layer: 1,
      trim: tr(5),
    });
  }

  // Steering wheel: a tilted ring in front of the driver.
  const wheelC = [0, 29, 23];
  const ring = ringPoints([0, 0, 0], 5.5, 'z', 20)
    .map((p) => add(wheelC, rotX(p, -35)))
    .map((p) => cam.project(toW(p)));
  const wc = cam.project(toW(wheelC));
  items.push({
    key: 'steer',
    type: 'stroke',
    d: smoothPath(ring, true),
    w: 2 * wc.k,
    depth: wc.d + 1,
    layer: 1,
    trim: tr(6),
  });
  return items;
}

function buildSpeedLines(frame, cam, trim, time) {
  const items = [];
  const toW = (p) => toWorld(p, frame);
  [12, 22, 30].forEach((y, i) => {
    const a = cam.project(toW([0, y, -40 - i * 4]));
    const b = cam.project(toW([0, y, -78 - i * 6]));
    const phase = (time * 2.4 + i * 0.37) % 1;
    const start = clamp(phase * 1.4 - 0.4);
    const end = clamp(phase * 1.4);
    items.push({
      key: `speed-${i}`,
      type: 'stroke',
      d: `M${f(a.x)},${f(a.y)}L${f(b.x)},${f(b.y)}`,
      w: 1.8 * a.k,
      depth: -999,
      layer: 0,
      trim: [Math.max(start, trim[0]), Math.min(end, trim[1])],
      fade: 0.4,
    });
  });
  return items;
}

// --- Dog: the same rig ideas, four legs ------------------------------------

const DOG_OFFSET = [-15, 0, 32];

function dogFrame(frame) {
  return { yaw: frame.yaw, root: add(frame.root, rotY(DOG_OFFSET, frame.yaw)) };
}

function solveDog(phi, time, moving) {
  const amp = 26 * moving;
  const legs = [];
  let minFoot = Infinity;
  const defs = [
    ['FL', 1, 8, 0],
    ['FR', -1, 8, Math.PI],
    ['BL', 1, -8, Math.PI],
    ['BR', -1, -8, 0],
  ];
  for (const [name, side, z, offset] of defs) {
    const ph = phi * 2 + offset;
    const p = amp * Math.sin(ph);
    const k = 6 + 30 * moving * Math.max(0, Math.cos(ph));
    const front = z > 0;
    const hip = [side * 3, 0, z];
    const chain = solveLimb(hip, 6.5, 6.5, p, 4, front ? p - k : p + k, 4, side);
    legs.push({ name, chain });
    minFoot = Math.min(minFoot, chain[2][1]);
  }
  const lift = -minFoot + Math.abs(Math.sin(phi * 2)) * 0.8 * moving;
  const shift = (pt) => [pt[0], pt[1] + lift, pt[2]];
  return {
    hind: shift([0, 2, -9]),
    chest: shift([0, 3, 9]),
    head: shift([0, 11, 15]),
    snout: [shift([0, 9.5, 18]), shift([0, 9, 23])],
    ears: [-1, 1].map((s) => [shift([s * 3.5, 16, 14]), shift([s * 6, 12.5, 11.5])]),
    tail: [shift([0, 4, -14]), shift([4 * Math.sin(time * 12), 12, -19])],
    collar: shift([0, 8, 13]),
    headTurn: 10 * Math.sin(time * 0.9),
    legs: legs.map((l) => ({ ...l, chain: l.chain.map(shift) })),
  };
}

function buildDog(dog, frame, cam, trim) {
  const items = [];
  const df = dogFrame(frame);
  const P = (p) => cam.project(toWorld(p, df));
  const parts = 6;
  const tr = (i) => stagger(trim, i, parts, 0.5);
  const center = P(mix(dog.hind, dog.chest, 0.5));

  dog.legs.forEach((leg, i) => {
    const [a, b, c] = leg.chain.map(P);
    const depth = (a.d + b.d + c.d) / 3 - 2;
    items.push({
      key: `dog-leg-${leg.name}`,
      type: 'stroke',
      d: quadThrough(a, b, c),
      w: 2.4 * b.k,
      depth,
      layer: 1,
      trim: tr(i < 2 ? 0 : 1),
      fade: clamp((center.d - depth - 1) / 6),
    });
  });

  const h = P(dog.hind);
  const c = P(dog.chest);
  items.push({
    key: 'dog-body',
    type: 'capsule',
    d: `M${f(h.x)},${f(h.y)}L${f(c.x)},${f(c.y)}`,
    w: 11 * h.k,
    line: 2.2 * h.k,
    depth: (h.d + c.d) / 2,
    layer: 1,
    trim: tr(2),
  });

  const [t0, t1] = dog.tail.map(P);
  const tm = P(mix(dog.tail[0], dog.tail[1], 0.5).map((v, i) => (i === 1 ? v - 2 : v)));
  items.push({
    key: 'dog-tail',
    type: 'stroke',
    d: quadThrough(t0, tm, t1),
    w: 2.2 * t0.k,
    depth: t0.d - 1,
    layer: 1,
    trim: tr(3),
  });

  const hd = P(dog.head);
  const headTrim = tr(4);
  items.push({
    key: 'dog-head',
    type: 'shape',
    d: circlePath(hd, 6.5 * hd.k),
    w: 2.2 * hd.k,
    depth: hd.d + 2,
    layer: 1,
    trim: headTrim,
    fill: smooth((headTrim[1] - 0.55) / 0.45),
  });
  const [s0, s1] = dog.snout.map(P);
  items.push({
    key: 'dog-snout',
    type: 'capsule',
    d: `M${f(s0.x)},${f(s0.y)}L${f(s1.x)},${f(s1.y)}`,
    w: 5.5 * s0.k,
    line: 2 * s0.k,
    depth: s1.d + 2.5,
    layer: 1,
    trim: tr(5),
  });
  dog.ears.forEach(([e0, e1], i) => {
    const a = P(e0);
    const b = P(e1);
    items.push({
      key: `dog-ear-${i}`,
      type: 'stroke',
      d: `M${f(a.x)},${f(a.y)}L${f(b.x)},${f(b.y)}`,
      w: 3 * a.k,
      depth: hd.d + (a.d - hd.d) * 2 + 2,
      layer: 1,
      trim: tr(5),
    });
  });
  // One eye per side, hidden when that side turns away.
  for (const side of [-1, 1]) {
    const dirL = [side * 0.55, 0.3, 0.78];
    const vis = smooth((cam.facing(rotY(dirL, df.yaw)) - 0.1) / 0.3);
    if (vis < 0.02) continue;
    const e = P(add(dog.head, mul(dirL, 6)));
    items.push({
      key: `dog-eye${side}`,
      type: 'dot',
      x: e.x,
      y: e.y,
      r: 1.2 * e.k * smooth(tr(5)[1]),
      opacity: vis,
      depth: hd.d + 2.1,
      layer: 1,
    });
  }
  return items;
}

function buildLeash(skel, dog, frame, cam, trim) {
  const hand = cam.project(toWorld(skel.arms.R[2], frame));
  const collar = cam.project(toWorld(dog.collar, dogFrame(frame)));
  const mid = { x: (hand.x + collar.x) / 2, y: Math.max(hand.y, collar.y) + 8 * hand.k };
  const qx = 2 * mid.x - (hand.x + collar.x) / 2;
  const qy = 2 * mid.y - (hand.y + collar.y) / 2;
  return [{
    key: 'leash',
    type: 'stroke',
    d: `M${f(hand.x)},${f(hand.y)}Q${f(qx)},${f(qy)} ${f(collar.x)},${f(collar.y)}`,
    w: 1.4 * hand.k,
    depth: (hand.d + collar.d) / 2 + 3,
    layer: 1,
    trim,
  }];
}

function buildShadow(frame, cam, radius, opacity) {
  const ring = ringPoints([0, 0, 0], radius, 'y', 24).map((p) => cam.project(toWorld([p[0], 0, p[2] * 0.9], frame)));
  return {
    key: `shadow-${radius}`,
    type: 'shadow',
    d: smoothPath(ring, true),
    depth: -10000,
    layer: -1,
    opacity,
  };
}

// ---------------------------------------------------------------------------
// Simulation: scene state machine, locomotion, turning, trims.

const PROP_EXIT = 0.45;
const BLEND_DUR = 0.6;
const WALK_YAW = 90;

function nearestEquivalent(target, current) {
  return target + 360 * Math.round((current - target) / 360);
}

export class TrimStickmanSim {
  constructor({ scene = 'walk', yaw = WALK_YAW, present = true, style = 'classic' } = {}) {
    this.time = 0;
    this.style = style;
    this.scene = scene;
    this.sceneT = 2; // start already "settled"
    this.pose = SCENES[scene].clip(this.sceneT, 0);
    this.blendFrom = null;
    this.blendT = 1;
    this.yaw = yaw;
    this.yawVel = 0;
    this.yawTarget = yaw;
    this.rx = 0;
    this.rz = 0;
    this.speed = 0;
    this.phi = 0;
    this.spin = 0;
    this.outgoing = [];
    this.presence = present ? 1 : 0;
    this.presenceTarget = present ? 1 : 0;
    this.lastSkel = null;
    this.lastDog = null;
    this.dogMoving = 0;
  }

  /** Replays the draw-on of the body. */
  redraw() {
    this.presence = 0;
    this.presenceTarget = 1;
  }

  setStyle(id) {
    if (STYLES[id]) this.style = id;
  }

  setPresent(on) {
    this.presenceTarget = on ? 1 : 0;
  }

  setScene(id) {
    if (!SCENES[id] || id === this.scene) return;
    const old = SCENES[this.scene];
    for (const prop of old.props) {
      const end = smooth((this.sceneT - prop.on[0]) / (prop.on[1] - prop.on[0]));
      if (end > 0.001) this.outgoing.push({ id: prop.id, t: 0, end });
    }
    this.blendFrom = this.pose;
    this.blendT = 0;
    this.scene = id;
    this.sceneT = 0;
    const next = SCENES[id];
    if (next.stand) {
      const towardViewer = Math.sin(this.yaw * D2R) >= 0 ? 18 : -18;
      this.yawTarget = nearestEquivalent(towardViewer, this.yaw);
    } else {
      this.resumeHeading();
    }
  }

  resumeHeading() {
    const heading = this.rx > 0 ? -WALK_YAW : WALK_YAW;
    this.yawTarget = nearestEquivalent(heading, this.yaw);
  }

  /**
   * @param {number} dt seconds
   * @param {{ halfWidth?: number, roam?: boolean, manualYaw?: number | null }} env
   */
  step(dt, env = {}) {
    const { halfWidth = 300, roam = true, manualYaw = null } = env;
    this.time += dt;
    this.sceneT += dt;
    const scene = SCENES[this.scene];

    // Presence (body draw-on / erase).
    const pRate = 1 / 1.1;
    this.presence += clamp(this.presenceTarget - this.presence, -pRate * dt, pRate * dt);

    // Speed eases toward the scene's target.
    const targetSpeed = scene.speed(this.sceneT);
    this.speed += (targetSpeed - this.speed) * (1 - Math.exp(-dt * 3));
    this.phi += dt * Math.PI * 2 * (Math.max(this.speed, 0) / rigForStyle(this.style).stride);
    this.spin += dt * (this.speed / KART.wheelR);
    this.dogMoving += ((this.speed > 5 ? 1 : 0) - this.dogMoving) * (1 - Math.exp(-dt * 4));

    // Turning: yaw always decreases by 180 at an edge, so the figure turns
    // through the front at the right edge and through the back at the left,
    // walking a little oval instead of flipping.
    if (manualYaw !== null && manualYaw !== undefined) {
      this.yaw = manualYaw;
      this.yawVel = 0;
      this.yawTarget = manualYaw;
    } else {
      if (roam && !scene.stand) {
        const heading = Math.sin(this.yaw * D2R);
        const settled = Math.abs(this.yawTarget - this.yaw) < 20;
        // Start turning earlier when moving fast so the arc stays on screen.
        const margin = 40 + this.speed * 0.65;
        if (settled && this.rx > halfWidth - margin && heading > 0.5) this.yawTarget -= 180;
        if (settled && this.rx < -halfWidth + margin && heading < -0.5) this.yawTarget -= 180;
      }
      const w = this.scene === 'kart' ? 3.2 : 4.2;
      this.yawVel += (w * w * (this.yawTarget - this.yaw) - 2 * w * this.yawVel) * dt;
      this.yaw += this.yawVel * dt;
    }

    if (roam && manualYaw === null) {
      const a = this.yaw * D2R;
      this.rx += Math.sin(a) * this.speed * dt;
      this.rz += Math.cos(a) * this.speed * dt;
      this.rz *= 1 - Math.min(1, dt * 0.15);
      this.rx = clamp(this.rx, -halfWidth - 40, halfWidth + 40);
    } else {
      this.rx += (0 - this.rx) * (1 - Math.exp(-dt * 2));
      this.rz += (0 - this.rz) * (1 - Math.exp(-dt * 2));
    }

    // Pose: live clip, crossfaded from a snapshot of the previous pose.
    const live = scene.clip(this.sceneT, this.phi);
    if (this.blendT < 1 && this.blendFrom) {
      this.blendT = Math.min(1, this.blendT + dt / BLEND_DUR);
      this.pose = lerpPose(this.blendFrom, live, easeInOut(this.blendT));
    } else {
      this.pose = live;
    }

    for (const o of this.outgoing) o.t += dt;
    this.outgoing = this.outgoing.filter((o) => o.t < PROP_EXIT);
  }

  /** Active + outgoing props with their trims. */
  propTrims() {
    const list = [];
    for (const prop of SCENES[this.scene].props) {
      const end = smooth((this.sceneT - prop.on[0]) / (prop.on[1] - prop.on[0]));
      if (end > 0.001) list.push({ id: prop.id, trim: [0, end] });
    }
    for (const o of this.outgoing) {
      if (list.some((p) => p.id === o.id)) continue;
      list.push({ id: o.id, trim: [easeInOut(o.t / PROP_EXIT) * o.end, o.end] });
    }
    return list;
  }

  /**
   * @param {{ cx: number, cy: number, scale: number, tilt?: number }} view
   * @param {{ rig?: boolean }} opts
   */
  frame(view, opts = {}) {
    const cam = makeCamera(view);
    const skel = solveSkeleton(this.pose, rigForStyle(this.style));
    const frame = { yaw: this.yaw, root: [this.rx, 0, this.rz] };
    const props = this.propTrims();
    const presenceTrim = [0, easeInOut(this.presence)];

    const items = [];
    const hasKart = props.find((p) => p.id === 'kart');
    const hasHeadset = props.find((p) => p.id === 'headset');
    if (this.presence > 0.02) {
      items.push(buildShadow(frame, cam, 15, 0.1 * this.presence));
    }
    items.push(
      ...buildFigure(skel, frame, cam, presenceTrim, {
        style: this.style,
        time: this.time,
        hideEyes: hasHeadset && hasHeadset.trim[1] - hasHeadset.trim[0] > 0.55,
      }),
    );

    let dog = null;
    const dogProp = props.find((p) => p.id === 'dog');
    const leashProp = props.find((p) => p.id === 'leash');
    if (dogProp || leashProp) {
      dog = solveDog(this.phi, this.time, this.dogMoving);
    }

    for (const prop of props) {
      if (prop.id === 'headset') items.push(...buildHeadset(skel, frame, cam, prop.trim));
      if (prop.id === 'kart') {
        items.push(buildShadow(frame, cam, 34, 0.1 * prop.trim[1]));
        items.push(...buildKart(skel, frame, cam, prop.trim, this.spin));
      }
      if (prop.id === 'speedlines') items.push(...buildSpeedLines(frame, cam, prop.trim, this.time));
      if (prop.id === 'dog' && dog) {
        items.push(buildShadow(dogFrame(frame), cam, 13, 0.08 * prop.trim[1]));
        items.push(...buildDog(dog, frame, cam, prop.trim));
      }
      if (prop.id === 'leash' && dog) items.push(...buildLeash(skel, dog, frame, cam, prop.trim));
    }

    items.sort((a, b) => a.layer - b.layer || a.depth - b.depth);
    return {
      items,
      rig: opts.rig ? buildRigOverlay(skel, frame, cam) : null,
      look: {
        filter: STYLES[this.style]?.filter || null,
        seed: Math.floor(this.time * 8) % 97,
      },
      debug: {
        yaw: this.yaw,
        scene: this.scene,
        speed: this.speed,
        kart: Boolean(hasKart),
      },
    };
  }
}
