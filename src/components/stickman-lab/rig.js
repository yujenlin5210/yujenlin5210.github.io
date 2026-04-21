export const DEFAULT_STICKMAN_LAB_POSE = {
  yaw: 40,
  headTilt: 4,
  torsoLean: 2,
  armSpread: 22,
  stanceWidth: 20,
  kneeSoftness: 8,
};

export const STICKMAN_FACING_PRESETS = [
  { id: 'front', label: 'Front', yaw: 0 },
  { id: 'right', label: 'Right', yaw: 90 },
  { id: 'back', label: 'Back', yaw: 180 },
  { id: 'left', label: 'Left', yaw: -90 },
];

const BASE_LAYOUT = {
  centerX: 150,
  groundY: 220,
  shoulderY: 98,
  hipY: 144,
  bodyY: 86,
  bodyHeight: 56,
  headY: 60,
  perspective: 0.26,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function degToRad(value) {
  return (value * Math.PI) / 180;
}

export function normalizeYaw(value) {
  const normalized = ((value + 180) % 360 + 360) % 360 - 180;
  return normalized === -180 ? 180 : Number(normalized.toFixed(2));
}

export function getHeadingLabel(yaw) {
  const normalizedYaw = normalizeYaw(yaw);

  if (normalizedYaw >= -22.5 && normalizedYaw < 22.5) return 'Front';
  if (normalizedYaw >= 22.5 && normalizedYaw < 67.5) return 'Front Right';
  if (normalizedYaw >= 67.5 && normalizedYaw < 112.5) return 'Right';
  if (normalizedYaw >= 112.5 && normalizedYaw < 157.5) return 'Back Right';
  if (normalizedYaw >= -67.5 && normalizedYaw < -22.5) return 'Front Left';
  if (normalizedYaw >= -112.5 && normalizedYaw < -67.5) return 'Left';
  if (normalizedYaw >= -157.5 && normalizedYaw < -112.5) return 'Back Left';

  return 'Back';
}

function rotatePoint(point, yaw) {
  const radians = degToRad(yaw);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    x: point.x * cos - point.z * sin,
    y: point.y,
    z: point.x * sin + point.z * cos,
  };
}

function projectPoint(point, centerX) {
  return {
    x: centerX + point.x + point.z * BASE_LAYOUT.perspective,
    y: point.y,
    depth: point.z,
  };
}

function projectLocalPoint(point) {
  return {
    x: point.x + point.z * BASE_LAYOUT.perspective,
    y: point.y,
    depth: point.z,
  };
}

function buildQuadraticPath(start, end, curveX, curveY) {
  const controlX = (start.x + end.x) / 2 + curveX;
  const controlY = (start.y + end.y) / 2 + curveY;

  return `M ${start.x},${start.y} Q ${controlX},${controlY} ${end.x},${end.y}`;
}

function buildLimb(id, type, sideSign, start, end, curveX, curveY) {
  const depth = (start.depth + end.depth) / 2;

  return {
    id,
    type,
    sideSign,
    depth,
    path: buildQuadraticPath(start, end, curveX, curveY),
    end,
  };
}

export function buildStickmanLabRig(pose) {
  const yaw = normalizeYaw(pose.yaw);
  const radians = degToRad(yaw);
  const frontness = Math.cos(radians);
  const profile = Math.sin(radians);
  const absFrontness = Math.abs(frontness);
  const absProfile = Math.abs(profile);

  const torsoCenterX = BASE_LAYOUT.centerX + pose.torsoLean;
  const lowerBodyCenterX = BASE_LAYOUT.centerX;

  const shoulderSpan = 18;
  const hipSpan = 10;
  const handReach = 20 + pose.armSpread;
  const handDrop = 58 + Math.max(0, pose.torsoLean * 0.35);
  const footReach = 10 + pose.stanceWidth;

  const leftShoulder = projectPoint(
    rotatePoint({ x: -shoulderSpan, y: BASE_LAYOUT.shoulderY, z: 0 }, yaw),
    torsoCenterX
  );
  const rightShoulder = projectPoint(
    rotatePoint({ x: shoulderSpan, y: BASE_LAYOUT.shoulderY, z: 0 }, yaw),
    torsoCenterX
  );
  const leftHand = projectPoint(
    rotatePoint({ x: -handReach, y: BASE_LAYOUT.shoulderY + handDrop, z: 0 }, yaw),
    torsoCenterX
  );
  const rightHand = projectPoint(
    rotatePoint({ x: handReach, y: BASE_LAYOUT.shoulderY + handDrop, z: 0 }, yaw),
    torsoCenterX
  );

  const leftHip = projectPoint(
    rotatePoint({ x: -hipSpan, y: BASE_LAYOUT.hipY, z: 0 }, yaw),
    lowerBodyCenterX
  );
  const rightHip = projectPoint(
    rotatePoint({ x: hipSpan, y: BASE_LAYOUT.hipY, z: 0 }, yaw),
    lowerBodyCenterX
  );
  const leftFoot = projectPoint(
    rotatePoint({ x: -footReach, y: BASE_LAYOUT.groundY, z: 0 }, yaw),
    lowerBodyCenterX
  );
  const rightFoot = projectPoint(
    rotatePoint({ x: footReach, y: BASE_LAYOUT.groundY, z: 0 }, yaw),
    lowerBodyCenterX
  );

  const armCurveY = 14 + pose.armSpread * 0.2 + absProfile * 4;
  const legCurveY = 10 + pose.kneeSoftness;
  const armCurveX = 6 + pose.armSpread * 0.15;
  const legCurveX = 2 + pose.stanceWidth * 0.12;

  const limbs = [
    buildLimb('left-arm', 'arm', -1, leftShoulder, leftHand, -armCurveX, armCurveY),
    buildLimb('right-arm', 'arm', 1, rightShoulder, rightHand, armCurveX, armCurveY),
    buildLimb(
      'left-leg',
      'leg',
      -1,
      leftHip,
      leftFoot,
      -legCurveX * (0.35 + absFrontness * 0.65),
      legCurveY
    ),
    buildLimb(
      'right-leg',
      'leg',
      1,
      rightHip,
      rightFoot,
      legCurveX * (0.35 + absFrontness * 0.65),
      legCurveY
    ),
  ].sort((left, right) => left.depth - right.depth);

  const rearLimbs = limbs.filter((limb) => limb.depth < -2);
  const frontLimbs = limbs.filter((limb) => limb.depth >= -2);

  const bodyWidth = 34 - absProfile * 8;
  const headRx = 18 - absProfile * 2;
  const headRy = 19 + absProfile * 0.8;
  const eyes = [
    { id: 'eye-left', point: { x: -7, y: -3, z: 9 } },
    { id: 'eye-right', point: { x: 7, y: -3, z: 9 } },
  ]
    .map(({ id, point }) => {
      const rotatedEye = rotatePoint(point, yaw);
      const projectedEye = projectLocalPoint(rotatedEye);
      const visibility = clamp((rotatedEye.z + 1.5) / 8, 0, 1);

      return {
        id,
        x: projectedEye.x,
        y: projectedEye.y,
        opacity: Number(visibility.toFixed(3)),
        radius: 1.5 + visibility * 0.4,
      };
    })
    .filter((eye) => eye.opacity > 0.02);

  return {
    yaw,
    headingLabel: getHeadingLabel(yaw),
    body: {
      x: torsoCenterX - bodyWidth / 2,
      y: BASE_LAYOUT.bodyY,
      width: bodyWidth,
      height: BASE_LAYOUT.bodyHeight,
      radius: bodyWidth / 2,
    },
    head: {
      x: torsoCenterX,
      y: BASE_LAYOUT.headY,
      rx: headRx,
      ry: headRy,
      eyes,
    },
    limbs: {
      rear: rearLimbs,
      front: frontLimbs,
    },
    guides: {
      centerX: BASE_LAYOUT.centerX,
      groundY: BASE_LAYOUT.groundY,
    },
  };
}
