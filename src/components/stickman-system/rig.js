import { STICKMAN_RIG_DEFINITION } from './config';

const HEAD_PROFILE = {
  compression: 0.035,
  verticalStretch: 0.012,
};

const BODY_PROFILE = {
  compression: 0.12,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function degToRad(value) {
  return (value * Math.PI) / 180;
}

function addPointOffset(point, offset = { x: 0, y: 0, z: 0 }) {
  return {
    x: point.x + (offset.x || 0),
    y: point.y + (offset.y || 0),
    z: point.z + (offset.z || 0),
  };
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

function projectPoint(point, centerX, perspective) {
  return {
    x: centerX + point.x + point.z * perspective,
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

export function normalizeYaw(value) {
  const normalized = ((value + 180) % 360 + 360) % 360 - 180;
  return normalized === -180 ? 180 : Number(normalized.toFixed(2));
}

export function getHeadingLabel(yaw) {
  const normalizedYaw = normalizeYaw(yaw);

  if (normalizedYaw >= -22.5 && normalizedYaw < 22.5) return 'Front';
  if (normalizedYaw >= 22.5 && normalizedYaw < 67.5) return 'Front Left';
  if (normalizedYaw >= 67.5 && normalizedYaw < 112.5) return 'Left';
  if (normalizedYaw >= 112.5 && normalizedYaw < 157.5) return 'Back Left';
  if (normalizedYaw >= -67.5 && normalizedYaw < -22.5) return 'Front Right';
  if (normalizedYaw >= -112.5 && normalizedYaw < -67.5) return 'Right';
  if (normalizedYaw >= -157.5 && normalizedYaw < -112.5) return 'Back Right';

  return 'Back';
}

function buildRigPoint(point, yaw, centerX, perspective) {
  return projectPoint(rotatePoint3D(point, { yaw }), centerX, perspective);
}

function buildLimb({
  id,
  type,
  sideSign,
  startPoint,
  endPoint,
  controlPoint,
  kneePoint,
  yaw,
  centerX,
  perspective,
}) {
  const start = buildRigPoint(startPoint, yaw, centerX, perspective);
  const end = buildRigPoint(endPoint, yaw, centerX, perspective);
  const control = buildRigPoint(controlPoint, yaw, centerX, perspective);
  const knee = kneePoint ? buildRigPoint(kneePoint, yaw, centerX, perspective) : null;
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

export function evaluateStickmanRig(channels, rigDefinition = STICKMAN_RIG_DEFINITION) {
  const yaw = normalizeYaw(channels.bodyYaw);
  const radians = degToRad(yaw);
  const frontness = Math.cos(radians);
  const profile = Math.sin(radians);
  const absFrontness = Math.abs(frontness);
  const absProfile = Math.abs(profile);
  const layout = rigDefinition.layout;
  const perspective = layout.perspective;
  const centerX = layout.centerX + channels.root.x;
  const groundY = layout.groundY;
  const bodyScale = channels.shape.bodySize / 100;
  const headScale = channels.shape.headSize / 100;
  const torsoWidth = channels.shape.torsoWidth * bodyScale;
  const torsoHeight = channels.shape.torsoHeight * bodyScale;
  const headWidth = channels.shape.headWidth * headScale;
  const headHeight = channels.shape.headHeight * headScale;
  const armLength = channels.shape.armLength;
  const legLength = channels.shape.legLength;
  const headYaw = normalizeYaw(yaw + channels.headYaw);
  const headPitch = channels.headPitch;
  const headRoll = channels.headRoll;
  const headRadians = degToRad(headYaw);
  const headFrontness = Math.cos(headRadians);
  const headProfile = Math.sin(headRadians);
  const absHeadProfile = Math.abs(headProfile);
  const hipY = groundY - (legLength - 6) + channels.root.y;
  const bodyY = hipY - torsoHeight - 2;
  const shoulderY = bodyY + 12;
  const headBaseRx = headWidth / 2;
  const headBaseRy = headHeight / 2;
  const headY = bodyY - headBaseRy - 3;
  const torsoCenterX = centerX + channels.torsoLean;
  const lowerBodyCenterX = centerX;
  const shoulderSpan = torsoWidth / 2 + 1;
  const hipSpan = torsoWidth * 0.29;
  const handReach = 20 + channels.shape.armSpread + (armLength - 56) * 0.22;
  const handDrop = Math.max(40, armLength - 14 + Math.max(0, channels.torsoLean * 0.35));
  const footReach = 10 + channels.shape.stanceWidth + (legLength - 44) * 0.15;
  const curveDirection = channels.limbArcDirection >= 0 ? 1 : -1;
  const armCurveY = (14 + channels.shape.armSpread * 0.2 + absProfile * 4) * curveDirection;
  const legCurveY = (10 + channels.shape.kneeSoftness) * curveDirection;
  const armCurveX = 6 + channels.shape.armSpread * 0.15;
  const legCurveX = 2 + channels.shape.stanceWidth * 0.12;

  const leftShoulderPoint = addPointOffset({ x: -shoulderSpan, y: shoulderY, z: 0 }, channels.joints.leftShoulder);
  const rightShoulderPoint = addPointOffset({ x: shoulderSpan, y: shoulderY, z: 0 }, channels.joints.rightShoulder);
  const leftHandPoint = addPointOffset({ x: -handReach, y: shoulderY + handDrop, z: 0 }, channels.joints.leftHand);
  const rightHandPoint = addPointOffset({ x: handReach, y: shoulderY + handDrop, z: 0 }, channels.joints.rightHand);
  const leftHipPoint = addPointOffset({ x: -hipSpan, y: hipY, z: 0 }, channels.joints.leftHip);
  const rightHipPoint = addPointOffset({ x: hipSpan, y: hipY, z: 0 }, channels.joints.rightHip);
  const leftFootPoint = addPointOffset({ x: -footReach, y: groundY, z: 0 }, channels.joints.leftFoot);
  const rightFootPoint = addPointOffset({ x: footReach, y: groundY, z: 0 }, channels.joints.rightFoot);

  const leftArmControlPoint = addPointOffset(
    {
      x: (leftShoulderPoint.x + leftHandPoint.x) / 2 - armCurveX,
      y: (leftShoulderPoint.y + leftHandPoint.y) / 2 + armCurveY,
      z: 0,
    },
    channels.joints.leftArmControl
  );
  const rightArmControlPoint = addPointOffset(
    {
      x: (rightShoulderPoint.x + rightHandPoint.x) / 2 + armCurveX,
      y: (rightShoulderPoint.y + rightHandPoint.y) / 2 + armCurveY,
      z: 0,
    },
    channels.joints.rightArmControl
  );
  const leftLegControlPoint = addPointOffset(
    {
      x: (leftHipPoint.x + leftFootPoint.x) / 2 - legCurveX * (0.35 + absFrontness * 0.65),
      y: (leftHipPoint.y + leftFootPoint.y) / 2 + legCurveY,
      z: 0,
    },
    channels.joints.leftLegControl
  );
  const rightLegControlPoint = addPointOffset(
    {
      x: (rightHipPoint.x + rightFootPoint.x) / 2 + legCurveX * (0.35 + absFrontness * 0.65),
      y: (rightHipPoint.y + rightFootPoint.y) / 2 + legCurveY,
      z: 0,
    },
    channels.joints.rightLegControl
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
  const leftLegKneePoint =
    channels.weights.leftKnee > 0.001
      ? addPointOffset(leftLegKneeBasePoint, channels.joints.leftKnee)
      : null;
  const rightLegKneePoint =
    channels.weights.rightKnee > 0.001
      ? addPointOffset(rightLegKneeBasePoint, channels.joints.rightKnee)
      : null;

  const limbs = [
    buildLimb({
      id: 'left-arm',
      type: 'arm',
      sideSign: -1,
      startPoint: leftShoulderPoint,
      endPoint: leftHandPoint,
      controlPoint: leftArmControlPoint,
      yaw,
      centerX: torsoCenterX,
      perspective,
    }),
    buildLimb({
      id: 'right-arm',
      type: 'arm',
      sideSign: 1,
      startPoint: rightShoulderPoint,
      endPoint: rightHandPoint,
      controlPoint: rightArmControlPoint,
      yaw,
      centerX: torsoCenterX,
      perspective,
    }),
    buildLimb({
      id: 'left-leg',
      type: 'leg',
      sideSign: -1,
      startPoint: leftHipPoint,
      endPoint: leftFootPoint,
      controlPoint: leftLegControlPoint,
      kneePoint: leftLegKneePoint,
      yaw,
      centerX: lowerBodyCenterX,
      perspective,
    }),
    buildLimb({
      id: 'right-leg',
      type: 'leg',
      sideSign: 1,
      startPoint: rightHipPoint,
      endPoint: rightFootPoint,
      controlPoint: rightLegControlPoint,
      kneePoint: rightLegKneePoint,
      yaw,
      centerX: lowerBodyCenterX,
      perspective,
    }),
  ].sort((left, right) => left.depth - right.depth);

  const rearLimbs = limbs.filter((limb) => limb.depth < -2);
  const frontLimbs = limbs.filter((limb) => limb.depth >= -2);
  const bodyWidth = Math.max(20, torsoWidth - absProfile * torsoWidth * BODY_PROFILE.compression);
  const headRx = Math.max(12, headBaseRx - absHeadProfile * headBaseRx * HEAD_PROFILE.compression);
  const headRy = headBaseRy + absHeadProfile * Math.max(0.45, headBaseRy * HEAD_PROFILE.verticalStretch);
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

  const leftHand = buildRigPoint(leftHandPoint, yaw, torsoCenterX, perspective);
  const rightHand = buildRigPoint(rightHandPoint, yaw, torsoCenterX, perspective);

  return {
    yaw,
    headingLabel: getHeadingLabel(yaw),
    body: {
      x: torsoCenterX - bodyWidth / 2,
      y: bodyY,
      width: bodyWidth,
      height: torsoHeight,
      radius: bodyWidth / 2,
    },
    head: {
      x: torsoCenterX,
      y: headY,
      rx: headRx,
      ry: headRy,
      yaw: headYaw,
      pitch: headPitch,
      roll: headRoll,
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
    joints: {
      leftHand,
      rightHand,
    },
    guides: {
      centerX,
      groundY,
    },
    slots: {
      head: {
        x: torsoCenterX,
        y: headY,
      },
      face: {
        x: torsoCenterX + facePlaneCenter.x,
        y: headY + facePlaneCenter.y,
      },
      headTop: {
        x: torsoCenterX,
        y: headY - headRy - 8,
      },
      back: {
        x: torsoCenterX - profile * 8,
        y: bodyY + torsoHeight * 0.44,
      },
      torsoFront: {
        x: torsoCenterX + profile * 7,
        y: bodyY + torsoHeight * 0.48,
      },
      leftHand: {
        x: leftHand.x,
        y: leftHand.y,
      },
      rightHand: {
        x: rightHand.x,
        y: rightHand.y,
      },
      seat: {
        x: centerX,
        y: hipY + 4,
      },
    },
  };
}
