export const DEFAULT_STICKMAN_LAB_POSE = {
  yaw: 40,
  headYaw: 0,
  headPitch: 0,
  headRoll: 0,
  limbArcDirection: 'down',
  headStyle: 'classic',
  bodyStyle: 'classic',
  limbStyle: 'classic',
  headProfilePreset: 'round',
  bodyProfilePreset: 'round',
  headSize: 118,
  bodySize: 102,
  headWidth: 38,
  headHeight: 38,
  torsoWidth: 32,
  torsoHeight: 52,
  armLength: 56,
  legLength: 44,
  torsoLean: 0,
  armSpread: 12,
  stanceWidth: 10,
  kneeSoftness: 0,
};

export const STICKMAN_FACING_PRESETS = [
  { id: 'front', label: 'Front', yaw: 0 },
  { id: 'right', label: 'Right', yaw: 90 },
  { id: 'back', label: 'Back', yaw: 180 },
  { id: 'left', label: 'Left', yaw: -90 },
];

export const STICKMAN_SHAPE_PRESETS = [
  {
    id: 'baseline',
    label: 'Baseline',
    values: {
      headStyle: 'classic',
      bodyStyle: 'classic',
      limbStyle: 'classic',
      headProfilePreset: 'round',
      bodyProfilePreset: 'round',
      headSize: 118,
      bodySize: 102,
      headWidth: 38,
      headHeight: 38,
      torsoWidth: 32,
      torsoHeight: 52,
      armLength: 56,
      legLength: 44,
      torsoLean: 0,
      armSpread: 12,
      stanceWidth: 10,
      kneeSoftness: 0,
    },
  },
  {
    id: 'compact',
    label: 'Compact',
    values: {
      headSize: 96,
      bodySize: 92,
      headWidth: 34,
      headHeight: 36,
      torsoWidth: 31,
      torsoHeight: 50,
      armLength: 64,
      legLength: 74,
    },
  },
  {
    id: 'tall',
    label: 'Tall',
    values: {
      headSize: 98,
      bodySize: 104,
      headWidth: 34,
      headHeight: 40,
      torsoWidth: 32,
      torsoHeight: 62,
      armLength: 78,
      legLength: 92,
    },
  },
  {
    id: 'heroic',
    label: 'Heroic',
    values: {
      headSize: 102,
      bodySize: 110,
      headWidth: 38,
      headHeight: 40,
      torsoWidth: 40,
      torsoHeight: 60,
      armLength: 76,
      legLength: 88,
    },
  },
];

export const STICKMAN_HEAD_PROFILE_PRESETS = [
  {
    id: 'round',
    label: 'Round',
    description: 'Keeps the skull fuller in side and quarter turns.',
    compression: 0.035,
    verticalStretch: 0.012,
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'A middle ground between a sphere and a flat profile.',
    compression: 0.075,
    verticalStretch: 0.028,
  },
  {
    id: 'flat',
    label: 'Flat',
    description: 'Leans into a more compressed side silhouette.',
    compression: 0.12,
    verticalStretch: 0.045,
  },
];

export const STICKMAN_BODY_PROFILE_PRESETS = [
  {
    id: 'round',
    label: 'Round',
    description: 'Keeps the torso fuller in quarter and side views.',
    compression: 0.12,
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'A neutral torso read without getting too pill-like.',
    compression: 0.2,
  },
  {
    id: 'flat',
    label: 'Flat',
    description: 'Compresses more aggressively for a thinner profile.',
    compression: 0.28,
  },
];

const BASE_LAYOUT = {
  centerX: 150,
  groundY: 220,
  perspective: 0.26,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function degToRad(value) {
  return (value * Math.PI) / 180;
}

function rotatePoint3D(point, { pitch = 0, yaw = 0, roll = 0 } = {}) {
  let { x, y, z } = point;

  if (pitch !== 0) {
    const radians = degToRad(pitch);
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const nextY = y * cos - z * sin;
    const nextZ = y * sin + z * cos;
    y = nextY;
    z = nextZ;
  }

  if (yaw !== 0) {
    const radians = degToRad(yaw);
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const nextX = x * cos - z * sin;
    const nextZ = x * sin + z * cos;
    x = nextX;
    z = nextZ;
  }

  if (roll !== 0) {
    const radians = degToRad(roll);
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const nextX = x * cos - y * sin;
    const nextY = x * sin + y * cos;
    x = nextX;
    y = nextY;
  }

  return { x, y, z };
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
  return rotatePoint3D(point, { yaw });
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
    x: point.x,
    y: point.y,
    depth: point.z,
  };
}

function buildQuadraticPath(start, control, end) {
  return `M ${start.x},${start.y} Q ${control.x},${control.y} ${end.x},${end.y}`;
}

function buildKneePath(start, knee, end) {
  const tangent = {
    x: end.x - start.x,
    y: end.y - start.y,
  };
  const tangentLength = Math.hypot(tangent.x, tangent.y) || 1;
  const normalizedTangent = {
    x: tangent.x / tangentLength,
    y: tangent.y / tangentLength,
  };
  const incomingLength = Math.hypot(knee.x - start.x, knee.y - start.y);
  const outgoingLength = Math.hypot(end.x - knee.x, end.y - knee.y);
  const kneeHandle = Math.min(incomingLength, outgoingLength) * 0.34;
  const hipControl = {
    x: start.x + (knee.x - start.x) * 0.42,
    y: start.y + (knee.y - start.y) * 0.42,
  };
  const kneeControlIn = {
    x: knee.x - normalizedTangent.x * kneeHandle,
    y: knee.y - normalizedTangent.y * kneeHandle,
  };
  const kneeControlOut = {
    x: knee.x + normalizedTangent.x * kneeHandle,
    y: knee.y + normalizedTangent.y * kneeHandle,
  };
  const ankleControl = {
    x: end.x + (knee.x - end.x) * 0.42,
    y: end.y + (knee.y - end.y) * 0.42,
  };

  return `M ${start.x},${start.y} C ${hipControl.x},${hipControl.y} ${kneeControlIn.x},${kneeControlIn.y} ${knee.x},${knee.y} C ${kneeControlOut.x},${kneeControlOut.y} ${ankleControl.x},${ankleControl.y} ${end.x},${end.y}`;
}

function buildRigPoint(point, yaw, centerX) {
  return projectPoint(rotatePoint(point, yaw), centerX);
}

function buildLimb(id, type, sideSign, startPoint, endPoint, controlPoint, yaw, centerX, kneePoint = null) {
  const start = buildRigPoint(startPoint, yaw, centerX);
  const control = buildRigPoint(controlPoint, yaw, centerX);
  const end = buildRigPoint(endPoint, yaw, centerX);
  const knee = kneePoint ? buildRigPoint(kneePoint, yaw, centerX) : null;
  const depth = knee
    ? (start.depth + knee.depth + end.depth) / 3
    : (start.depth + control.depth + end.depth) / 3;

  return {
    id,
    type,
    sideSign,
    depth,
    start,
    control: knee || control,
    path: knee ? buildKneePath(start, knee, end) : buildQuadraticPath(start, control, end),
    end,
    ...(knee ? { knee } : {}),
  };
}

function getHeadProfilePreset(presetId) {
  return (
    STICKMAN_HEAD_PROFILE_PRESETS.find((preset) => preset.id === presetId) ||
    STICKMAN_HEAD_PROFILE_PRESETS[0]
  );
}

function getBodyProfilePreset(presetId) {
  return (
    STICKMAN_BODY_PROFILE_PRESETS.find((preset) => preset.id === presetId) ||
    STICKMAN_BODY_PROFILE_PRESETS[1]
  );
}

function getAnimationOffset(animationOffsets, key) {
  const offset = animationOffsets?.[key];

  return {
    x: typeof offset?.x === 'number' ? offset.x : 0,
    y: typeof offset?.y === 'number' ? offset.y : 0,
    z: typeof offset?.z === 'number' ? offset.z : 0,
  };
}

function addPointOffset(point, offset) {
  return {
    x: point.x + offset.x,
    y: point.y + offset.y,
    z: point.z + offset.z,
  };
}

function hasAnimationOffset(animationOffsets, key) {
  return (
    animationOffsets &&
    Object.prototype.hasOwnProperty.call(animationOffsets, key)
  );
}

export function buildStickmanLabRig(pose) {
  const yaw = normalizeYaw(pose.yaw);
  const radians = degToRad(yaw);
  const frontness = Math.cos(radians);
  const profile = Math.sin(radians);
  const absFrontness = Math.abs(frontness);
  const absProfile = Math.abs(profile);
  const headYaw = normalizeYaw(yaw + (pose.headYaw || 0));
  const headPitch = pose.headPitch || 0;
  const headRadians = degToRad(headYaw);
  const headFrontness = Math.cos(headRadians);
  const headProfile = Math.sin(headRadians);
  const absHeadProfile = Math.abs(headProfile);
  const bodyScale = (pose.bodySize || DEFAULT_STICKMAN_LAB_POSE.bodySize) / 100;
  const headScale = (pose.headSize || DEFAULT_STICKMAN_LAB_POSE.headSize) / 100;
  const torsoWidth = (pose.torsoWidth || DEFAULT_STICKMAN_LAB_POSE.torsoWidth) * bodyScale;
  const torsoHeight = (pose.torsoHeight || DEFAULT_STICKMAN_LAB_POSE.torsoHeight) * bodyScale;
  const headWidth = (pose.headWidth || DEFAULT_STICKMAN_LAB_POSE.headWidth) * headScale;
  const headHeight = (pose.headHeight || DEFAULT_STICKMAN_LAB_POSE.headHeight) * headScale;
  const armLength = pose.armLength || DEFAULT_STICKMAN_LAB_POSE.armLength;
  const legLength = pose.legLength || DEFAULT_STICKMAN_LAB_POSE.legLength;
  const limbArcDirection = pose.limbArcDirection || DEFAULT_STICKMAN_LAB_POSE.limbArcDirection;
  const headProfilePreset = getHeadProfilePreset(pose.headProfilePreset);
  const bodyProfilePreset = getBodyProfilePreset(pose.bodyProfilePreset);
  const animationOffsets = pose.animationOffsets || {};
  const hipY = BASE_LAYOUT.groundY - (legLength - 6);
  const bodyY = hipY - torsoHeight - 2;
  const shoulderY = bodyY + 12;
  const headBaseRx = headWidth / 2;
  const headBaseRy = headHeight / 2;
  const headTorsoGap = 3;
  const headY = bodyY - headBaseRy - headTorsoGap;

  const torsoCenterX = BASE_LAYOUT.centerX + pose.torsoLean;
  const lowerBodyCenterX = BASE_LAYOUT.centerX;

  const shoulderSpan = torsoWidth / 2 + 1;
  const hipSpan = torsoWidth * 0.29;
  const handReach = 20 + pose.armSpread + (armLength - DEFAULT_STICKMAN_LAB_POSE.armLength) * 0.22;
  const handDrop = Math.max(40, armLength - 14 + Math.max(0, pose.torsoLean * 0.35));
  const footReach = 10 + pose.stanceWidth + (legLength - DEFAULT_STICKMAN_LAB_POSE.legLength) * 0.15;

  const leftShoulderPoint = addPointOffset(
    { x: -shoulderSpan, y: shoulderY, z: 0 },
    getAnimationOffset(animationOffsets, 'leftShoulder')
  );
  const rightShoulderPoint = addPointOffset(
    { x: shoulderSpan, y: shoulderY, z: 0 },
    getAnimationOffset(animationOffsets, 'rightShoulder')
  );
  const leftHandPoint = addPointOffset(
    { x: -handReach, y: shoulderY + handDrop, z: 0 },
    getAnimationOffset(animationOffsets, 'leftHand')
  );
  const rightHandPoint = addPointOffset(
    { x: handReach, y: shoulderY + handDrop, z: 0 },
    getAnimationOffset(animationOffsets, 'rightHand')
  );
  const leftHipPoint = addPointOffset(
    { x: -hipSpan, y: hipY, z: 0 },
    getAnimationOffset(animationOffsets, 'leftHip')
  );
  const rightHipPoint = addPointOffset(
    { x: hipSpan, y: hipY, z: 0 },
    getAnimationOffset(animationOffsets, 'rightHip')
  );
  const leftFootPoint = addPointOffset(
    { x: -footReach, y: BASE_LAYOUT.groundY, z: 0 },
    getAnimationOffset(animationOffsets, 'leftFoot')
  );
  const rightFootPoint = addPointOffset(
    { x: footReach, y: BASE_LAYOUT.groundY, z: 0 },
    getAnimationOffset(animationOffsets, 'rightFoot')
  );

  const curveDirection = limbArcDirection === 'up' ? -1 : 1;
  const armCurveY = (14 + pose.armSpread * 0.2 + absProfile * 4) * curveDirection;
  const legCurveY = (10 + pose.kneeSoftness) * curveDirection;
  const armCurveX = 6 + pose.armSpread * 0.15;
  const legCurveX = 2 + pose.stanceWidth * 0.12;
  const leftArmControlPoint = addPointOffset(
    {
      x: (leftShoulderPoint.x + leftHandPoint.x) / 2 - armCurveX,
      y: (leftShoulderPoint.y + leftHandPoint.y) / 2 + armCurveY,
      z: 0,
    },
    getAnimationOffset(animationOffsets, 'leftArmControl')
  );
  const rightArmControlPoint = addPointOffset(
    {
      x: (rightShoulderPoint.x + rightHandPoint.x) / 2 + armCurveX,
      y: (rightShoulderPoint.y + rightHandPoint.y) / 2 + armCurveY,
      z: 0,
    },
    getAnimationOffset(animationOffsets, 'rightArmControl')
  );
  const leftLegControlPoint = addPointOffset(
    {
      x: (leftHipPoint.x + leftFootPoint.x) / 2 - legCurveX * (0.35 + absFrontness * 0.65),
      y: (leftHipPoint.y + leftFootPoint.y) / 2 + legCurveY,
      z: 0,
    },
    getAnimationOffset(animationOffsets, 'leftLegControl')
  );
  const rightLegControlPoint = addPointOffset(
    {
      x: (rightHipPoint.x + rightFootPoint.x) / 2 + legCurveX * (0.35 + absFrontness * 0.65),
      y: (rightHipPoint.y + rightFootPoint.y) / 2 + legCurveY,
      z: 0,
    },
    getAnimationOffset(animationOffsets, 'rightLegControl')
  );
  const leftLegKneeBasePoint = {
    x: (leftHipPoint.x + leftFootPoint.x) / 2,
    y: (leftHipPoint.y + leftFootPoint.y) / 2,
    z: (leftHipPoint.z + leftFootPoint.z) / 2,
  };
  const rightLegKneeBasePoint = {
    x: (rightHipPoint.x + rightFootPoint.x) / 2,
    y: (rightHipPoint.y + rightFootPoint.y) / 2,
    z: (rightHipPoint.z + rightFootPoint.z) / 2,
  };
  const leftLegKneePoint = hasAnimationOffset(animationOffsets, 'leftLegKnee')
    ? addPointOffset(leftLegKneeBasePoint, getAnimationOffset(animationOffsets, 'leftLegKnee'))
    : null;
  const rightLegKneePoint = hasAnimationOffset(animationOffsets, 'rightLegKnee')
    ? addPointOffset(rightLegKneeBasePoint, getAnimationOffset(animationOffsets, 'rightLegKnee'))
    : null;

  const limbs = [
    buildLimb(
      'left-arm',
      'arm',
      -1,
      leftShoulderPoint,
      leftHandPoint,
      leftArmControlPoint,
      yaw,
      torsoCenterX
    ),
    buildLimb(
      'right-arm',
      'arm',
      1,
      rightShoulderPoint,
      rightHandPoint,
      rightArmControlPoint,
      yaw,
      torsoCenterX
    ),
    buildLimb(
      'left-leg',
      'leg',
      -1,
      leftHipPoint,
      leftFootPoint,
      leftLegControlPoint,
      yaw,
      lowerBodyCenterX,
      leftLegKneePoint
    ),
    buildLimb(
      'right-leg',
      'leg',
      1,
      rightHipPoint,
      rightFootPoint,
      rightLegControlPoint,
      yaw,
      lowerBodyCenterX,
      rightLegKneePoint
    ),
  ].sort((left, right) => left.depth - right.depth);

  const rearLimbs = limbs.filter((limb) => limb.depth < -2);
  const frontLimbs = limbs.filter((limb) => limb.depth >= -2);

  const bodyWidth = Math.max(
    20,
    torsoWidth - absProfile * torsoWidth * bodyProfilePreset.compression
  );
  const headRx = Math.max(
    12,
    headBaseRx - absHeadProfile * headBaseRx * headProfilePreset.compression
  );
  const headRy =
    headBaseRy +
    absHeadProfile * Math.max(0.45, headBaseRy * headProfilePreset.verticalStretch);
  const facePlaneVisibility = clamp((headFrontness + 0.08) / 1.08, 0, 1);
  const headOrientation = {
    yaw: headYaw,
    pitch: headPitch,
  };
  const projectHeadFeature = (point) => projectLocalPoint(rotatePoint3D(point, headOrientation));
  const facePlaneDepth = headBaseRx * 0.45 + 1;
  const facePlaneCenter = projectHeadFeature({ x: 0, y: 1, z: facePlaneDepth });
  const facePlaneLeft = projectHeadFeature({ x: -headBaseRx * 0.38, y: 1, z: facePlaneDepth });
  const facePlaneRight = projectHeadFeature({ x: headBaseRx * 0.38, y: 1, z: facePlaneDepth });
  const facePlaneTop = projectHeadFeature({ x: 0, y: -headBaseRy * 0.36, z: facePlaneDepth });
  const facePlaneBottom = projectHeadFeature({ x: 0, y: headBaseRy * 0.43, z: facePlaneDepth });
  const noseStart = projectHeadFeature({ x: 0, y: -headBaseRy * 0.08, z: headBaseRx * 0.58 });
  const noseEnd = projectHeadFeature({ x: 0, y: headBaseRy * 0.26, z: headBaseRx * 0.72 });
  const eyes = [
    { id: 'eye-left', point: { x: -headBaseRx * 0.38, y: -headBaseRy * 0.18, z: headBaseRx * 0.5 } },
    { id: 'eye-right', point: { x: headBaseRx * 0.38, y: -headBaseRy * 0.18, z: headBaseRx * 0.5 } },
  ]
    .map(({ id, point }) => {
      const rotatedEye = rotatePoint3D(point, headOrientation);
      const projectedEye = projectLocalPoint(rotatedEye);
      const visibility = clamp(
        (rotatedEye.z + headBaseRx * 0.08) / Math.max(6.5, headBaseRx * 0.44),
        0,
        1
      );

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
      y: bodyY,
      width: bodyWidth,
      height: torsoHeight,
      radius: bodyWidth / 2,
      profilePreset: bodyProfilePreset.id,
    },
    head: {
      x: torsoCenterX,
      y: headY,
      rx: headRx,
      ry: headRy,
      size: pose.headSize || DEFAULT_STICKMAN_LAB_POSE.headSize,
      yaw: headYaw,
      pitch: headPitch,
      roll: pose.headRoll || 0,
      profilePreset: headProfilePreset.id,
      facePlane: {
        x: facePlaneCenter.x,
        y: facePlaneCenter.y,
        rx: Math.max(5.8, Math.abs(facePlaneRight.x - facePlaneLeft.x) / 2),
        ry: Math.max(6.4, Math.abs(facePlaneBottom.y - facePlaneTop.y) / 2),
        opacity: Number((facePlaneVisibility * 0.2).toFixed(3)),
      },
      nose: {
        x1: noseStart.x,
        y1: noseStart.y,
        x2: noseEnd.x,
        y2: noseEnd.y,
        opacity: Number((facePlaneVisibility * (0.22 + absHeadProfile * 0.28)).toFixed(3)),
      },
      eyes,
    },
    limbs: {
      rear: rearLimbs,
      front: frontLimbs,
    },
    limbArcDirection,
    guides: {
      centerX: BASE_LAYOUT.centerX,
      groundY: BASE_LAYOUT.groundY,
    },
  };
}
