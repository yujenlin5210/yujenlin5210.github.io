import { STICKMAN_DEFAULT_SHAPE, STICKMAN_HEADSET_PROP_IDS } from './config';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}

function degToRad(value) {
  return (value * Math.PI) / 180;
}

function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function easeOutSine(t) {
  return Math.sin((t * Math.PI) / 2);
}

function normalizeUnitCycle(value) {
  return ((value % 1) + 1) % 1;
}

function createPoint(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

function isHeadsetPropId(propId) {
  return STICKMAN_HEADSET_PROP_IDS.includes(propId);
}

function solveWalkLegKneePoint({ hip, foot, upperLength, lowerLength, bendWeight }) {
  const dz = foot.z - hip.z;
  const dy = foot.y - hip.y;
  const distance = Math.hypot(dz, dy);
  const maxReach = Math.max(upperLength + lowerLength - 0.001, 0.001);
  const clampedDistance = clamp(distance, 0.001, maxReach);
  const along = (upperLength ** 2 - lowerLength ** 2 + clampedDistance ** 2) / (2 * clampedDistance);
  const height = Math.sqrt(Math.max(upperLength ** 2 - along ** 2, 0));
  const base = {
    z: hip.z + (dz / clampedDistance) * along,
    y: hip.y + (dy / clampedDistance) * along,
  };
  const bent = {
    x: (hip.x + foot.x) / 2,
    z: base.z + (dy / clampedDistance) * height,
    y: base.y - (dz / clampedDistance) * height,
  };
  const midpoint = {
    x: (hip.x + foot.x) / 2,
    y: (hip.y + foot.y) / 2,
    z: (hip.z + foot.z) / 2,
  };

  return {
    x: lerp(midpoint.x, bent.x, bendWeight),
    y: lerp(midpoint.y, bent.y, bendWeight),
    z: lerp(midpoint.z, bent.z, bendWeight),
  };
}

export function createBaseChannels({ bodyYaw }) {
  return {
    bodyYaw,
    headYaw: 0,
    headPitch: 0,
    headRoll: 0,
    torsoLean: STICKMAN_DEFAULT_SHAPE.torsoLean,
    limbArcDirection: 1,
    root: createPoint(0, 0, 0),
    shape: { ...STICKMAN_DEFAULT_SHAPE },
    joints: {
      leftShoulder: createPoint(),
      rightShoulder: createPoint(),
      leftHand: createPoint(),
      rightHand: createPoint(),
      leftHip: createPoint(),
      rightHip: createPoint(),
      leftFoot: createPoint(),
      rightFoot: createPoint(),
      leftArmControl: createPoint(),
      rightArmControl: createPoint(),
      leftLegControl: createPoint(),
      rightLegControl: createPoint(),
      leftKnee: createPoint(),
      rightKnee: createPoint(),
    },
    weights: {
      leftKnee: 0,
      rightKnee: 0,
    },
  };
}

function applyIdleChannels(channels, time, intensity) {
  const breath = Math.sin(time * 2.35);
  const settle = Math.max(0, -breath);
  const sway = Math.sin(time * 0.82 + 0.35);

  channels.shape.torsoHeight += breath * 2.6 * intensity;
  channels.shape.torsoWidth += breath * 1.2 * intensity;
  channels.shape.armSpread += breath * 0.8 * intensity;
  channels.shape.kneeSoftness += settle * 1.5 * intensity;
  channels.root.y += breath * -1.6 * intensity;
  channels.torsoLean += sway * 1.4 * intensity;
  channels.headPitch += breath * 1.1 * intensity;
  channels.headRoll += sway * 1.5 * intensity;
  channels.headYaw += Math.sin(time * 0.56 + 0.8) * 2.8 * intensity;
  channels.joints.leftShoulder.z -= sway * 0.6 * intensity;
  channels.joints.rightShoulder.z += sway * 0.6 * intensity;
  channels.joints.leftHip.z += sway * 0.45 * intensity;
  channels.joints.rightHip.z -= sway * 0.45 * intensity;
}

function applyWalkChannels(channels, time, intensity, bodyYaw) {
  const yawRadians = (bodyYaw * Math.PI) / 180;
  const signedProfile = Math.sin(yawRadians);
  const frontness = Math.abs(Math.cos(yawRadians));
  const profile = Math.abs(signedProfile);
  const frontalBias = frontness * (1 - profile);
  const frontOnlyBias = frontalBias * clamp((frontness - 0.8) / 0.2, 0, 1);
  const quarterBias = Math.sqrt(frontness * profile);
  const walkCycle = time * 1.05;
  const walkPhase = walkCycle * Math.PI * 2;
  const bodyBob = Math.sin(walkPhase * 2 - 0.42);
  const shoulderTwist = Math.sin(walkPhase) * 1.2 * frontness * intensity;
  const hipTwist = Math.sin(walkPhase) * 0.7 * frontness * intensity;
  const stepLength = lerp(2.2, 14.6, profile) * lerp(1, 0.74, quarterBias) * intensity;
  const stepHeight = lerp(3.6, 6.8, profile) * lerp(1, 0.8, quarterBias) * intensity;
  const armSwing = (7 + profile * 1.35) * intensity;
  const baseArmCurveY = 14 + channels.shape.armSpread * 0.2 + profile * 4;
  const torsoWidth = channels.shape.torsoWidth * (channels.shape.bodySize / 100);
  const rootYOffset = -bodyBob * 2.4 * intensity;

  channels.root.y += rootYOffset;
  channels.shape.legLength -= (Math.abs(Math.sin(walkPhase)) * 0.35 + quarterBias * 0.14) * intensity;
  channels.shape.torsoHeight += bodyBob * 0.12 * intensity;
  channels.headPitch += -0.35 + Math.sin(walkPhase * 2 - 0.3) * 0.1 * intensity;
  channels.headRoll += Math.sin(walkPhase) * 0.08 * frontness * intensity;
  channels.headYaw += Math.sin(walkPhase) * 0.12 * frontness * intensity;
  channels.shape.armSpread += 0.15 * intensity;
  channels.shape.stanceWidth -= 3.4 * intensity;
  channels.shape.kneeSoftness += 0.15 * intensity;
  channels.torsoLean += Math.sin(walkPhase) * 0.14 * frontness * intensity;
  channels.bodyYaw += Math.sin(walkPhase) * 0.08 * frontness * intensity;

  const thighLength = channels.shape.legLength * 0.52;
  const shinLength = channels.shape.legLength * 0.48;
  const hipSpan = torsoWidth * 0.29;
  const hipY = 224 + rootYOffset - (channels.shape.legLength - 6);
  const footReach =
    10 +
    channels.shape.stanceWidth +
    (channels.shape.legLength - STICKMAN_DEFAULT_SHAPE.legLength) * 0.15 -
    quarterBias * 4.8 * intensity;

  channels.joints.leftShoulder.z -= shoulderTwist;
  channels.joints.rightShoulder.z += shoulderTwist;
  channels.joints.leftHip.z += hipTwist;
  channels.joints.rightHip.z -= hipTwist;

  [
    { key: 'left', sideSign: -1, phaseOffset: 0 },
    { key: 'right', sideSign: 1, phaseOffset: 0.5 },
  ].forEach(({ key, sideSign, phaseOffset }) => {
    const cycle = normalizeUnitCycle(walkCycle + phaseOffset);
    const isStancePhase = cycle < 0.5;
    const cycleProgress = isStancePhase ? cycle / 0.5 : (cycle - 0.5) / 0.5;
    const easedCycleProgress = easeInOutSine(cycleProgress);
    const swingCurve = Math.sin(cycleProgress * Math.PI);
    const quarterStanceTravel = easeInOutSine(clamp((cycleProgress - 0.18) / 0.64, 0, 1));
    const baseFootZ = isStancePhase
      ? lerp(stepLength * 0.74, -stepLength * 0.9, cycleProgress)
      : lerp(-stepLength * 0.9, stepLength * 0.74, cycleProgress);
    const quarterFootZ = isStancePhase
      ? lerp(stepLength * 0.44, -stepLength * 0.5, quarterStanceTravel)
      : lerp(-stepLength * 0.5, stepLength * 0.54, easedCycleProgress);
    const footZ = lerp(baseFootZ, quarterFootZ, quarterBias * 0.82);
    const footY = (isStancePhase ? 0 : -swingCurve * stepHeight) * lerp(1, 0.76, quarterBias);
    const armPhase = (cycle + 0.5) * Math.PI * 2;
    const armStride = Math.sin(armPhase);
    const handZ = armStride * armSwing;
    const rightFacingBlend = clamp(signedProfile, 0, 1);
    const visualArmStride = lerp(armStride, -armStride, rightFacingBlend);
    const handY = -Math.max(0, visualArmStride) * 1.3 * intensity;
    const forwardArmBend = Math.max(0, visualArmStride);
    const backwardArmStraighten = Math.max(0, -visualArmStride);
    const desiredArmCurveY =
      (0.6 + forwardArmBend * 2.1 - backwardArmStraighten * 0.3) * intensity;
    const elbowY = -baseArmCurveY + desiredArmCurveY;
    const trackReach = lerp(footReach, hipSpan + 2.6, quarterBias);
    const frontPerspectiveCancel = -footZ * lerp(0.24, 0.26, profile) * frontOnlyBias;
    const frontFootTarget = lerp(
      trackReach,
      trackReach - (trackReach - hipSpan) * 0.34,
      frontOnlyBias
    );
    const frontFootInward = sideSign * (frontFootTarget - trackReach) * intensity;
    const swingOutward = isStancePhase ? 0 : sideSign * swingCurve * 0.18 * frontOnlyBias * intensity;
    const profileCross = isStancePhase
      ? 0
      : -sideSign * swingCurve * 0.12 * (1 - frontOnlyBias) * profile * intensity;
    const quarterBackTrack = -sideSign * Math.max(0, -footZ) * 0.28 * quarterBias;
    const footX = frontPerspectiveCancel + frontFootInward + swingOutward + profileCross + quarterBackTrack;
    const hip = {
      x: sideSign * hipSpan,
      y: hipY,
      z: 0,
    };
    const foot = {
      x: sideSign * trackReach + footX,
      y: 224 + footY,
      z: footZ,
    };
    const kneePoint = solveWalkLegKneePoint({
      hip,
      foot,
      upperLength: thighLength,
      lowerLength: shinLength,
      bendWeight: isStancePhase ? 0.01 : lerp(0.06, 0.18, profile) * lerp(1, 0.58, quarterBias),
    });
    const frontKneeOpen = sideSign * lerp(0.16, 0.24, swingCurve) * frontOnlyBias * intensity;

    if (!isStancePhase) {
      const profileKneeCross = -sideSign * swingCurve * 0.08 * (1 - frontOnlyBias) * profile * intensity;
      kneePoint.x += frontKneeOpen + profileKneeCross;
    } else {
      kneePoint.x += frontKneeOpen;
    }

    const kneeBasePoint = {
      x: (hip.x + foot.x) / 2,
      y: (hip.y + foot.y) / 2,
      z: (hip.z + foot.z) / 2,
    };

    channels.joints[`${key}Foot`].x += footX;
    channels.joints[`${key}Hand`].z += handZ;
    channels.joints[`${key}Hand`].y += handY;
    // Cancel the rig's armCurveX lateral offset in profile views so the
    // elbow curvature doesn't project asymmetrically between Left and Right
    const localArmCurveX = 6 + channels.shape.armSpread * 0.15;
    channels.joints[`${key}ArmControl`].x += sideSign * 0.12 * intensity - sideSign * localArmCurveX * profile;
    channels.joints[`${key}ArmControl`].y += elbowY;
    channels.joints[`${key}ArmControl`].z += handZ * 0.22;
    channels.joints[`${key}Foot`].z += footZ;
    channels.joints[`${key}Foot`].y += footY;
    channels.joints[`${key}Knee`].x += kneePoint.x - kneeBasePoint.x;
    channels.joints[`${key}Knee`].y += kneePoint.y - kneeBasePoint.y;
    channels.joints[`${key}Knee`].z += kneePoint.z - kneeBasePoint.z;
    channels.weights[`${key}Knee`] = 1;
  });
}

export function evaluateStickmanClip({
  clipId,
  bodyYaw,
  intensity = 1,
  tempo = 1,
  timeMs = 0,
  reducedMotion = false,
}) {
  const channels = createBaseChannels({ bodyYaw });
  const time = reducedMotion ? 0 : (timeMs / 1000) * tempo;
  const safeIntensity = reducedMotion ? 0 : intensity;
  let phaseLabel = 'Standing';
  let note = 'Neutral rig validation';

  if (clipId === 'idle') {
    applyIdleChannels(channels, time, safeIntensity);
    phaseLabel = 'Idle';
    note = 'Breathing and settle pass';
  } else if (clipId === 'walk') {
    applyWalkChannels(channels, time, safeIntensity, bodyYaw);
    phaseLabel = 'Walking';
    note = 'Locomotion clip with planted contact';
  }

  return {
    channels,
    debug: {
      phaseLabel,
      note,
      localTime: time,
    },
  };
}

export function blendChannels(left, right, progress) {
  if (typeof left === 'number' && typeof right === 'number') {
    return lerp(left, right, progress);
  }

  if (left && typeof left === 'object' && right && typeof right === 'object') {
    const result = {};
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);

    keys.forEach((key) => {
      const leftValue = left[key] !== undefined ? left[key] : right[key];
      const rightValue = right[key] !== undefined ? right[key] : left[key];
      result[key] = blendChannels(leftValue, rightValue, progress);
    });

    return result;
  }

  return progress < 0.5 ? left : right;
}

export function buildHeadsetPropTransition({ fromPropId, toPropId, progress }) {
  const fromIsHeadset = isHeadsetPropId(fromPropId);
  const toIsHeadset = isHeadsetPropId(toPropId);

  if (fromPropId === toPropId || fromIsHeadset === toIsHeadset) {
    return null;
  }

  return {
    kind: toIsHeadset ? 'donning' : 'doffing',
    headsetPropId: toIsHeadset ? toPropId : fromPropId,
    progress,
  };
}

export function getHeadsetTransitionMotion(transition, bodyYaw = 0) {
  if (!transition) {
    return null;
  }

  const progress = clamp(transition.progress, 0, 1);
  const yawRadians = degToRad(bodyYaw);
  const frontBias = clamp((Math.cos(yawRadians) - 0.84) / 0.16, 0, 1);
  const profileBias = clamp((Math.abs(Math.sin(yawRadians)) - 0.9) / 0.1, 0, 1);
  const stagedBias = Math.max(frontBias, profileBias);

  if (stagedBias <= 0.001) {
    return {
      kind: transition.kind,
      progress,
      frontBias,
      profileBias,
      armBlend: Math.sin(progress * Math.PI),
      headsetY:
        transition.kind === 'donning'
          ? -28 * (1 - progress)
          : -28 * progress,
      currentOpacity:
        transition.kind === 'donning'
          ? progress
          : 0,
      previousOpacity:
        transition.kind === 'doffing'
          ? 1 - progress
          : 0,
      holdAmount: 0,
    };
  }

  if (transition.kind === 'donning') {
    const settleEnd = 0.3;
    const holdEnd = 0.6;
    const lowerEnd = 0.84;
    const releaseHoldEnd = 0.92;
    const startY = lerp(-18, -12, frontBias);
    const holdY = lerp(-30, -34, frontBias);
    const riseAmount = progress < settleEnd ? easeOutSine(progress / settleEnd) : 1;

    let headsetY = holdY;
    let gripAmount = 1;
    let armBlend = 1;

    if (progress < settleEnd) {
      headsetY = lerp(startY, holdY, riseAmount);
      gripAmount = riseAmount;
      armBlend = riseAmount;
    } else if (progress < holdEnd) {
      headsetY = holdY;
    } else if (progress < lowerEnd) {
      const lowerProgress = easeInOutSine((progress - holdEnd) / (lowerEnd - holdEnd));
      headsetY = lerp(holdY, 0, lowerProgress);
    } else if (progress < releaseHoldEnd) {
      headsetY = 0;
    } else {
      const releaseProgress = easeInOutSine((progress - releaseHoldEnd) / (1 - releaseHoldEnd));
      headsetY = 0;
      gripAmount = 1 - releaseProgress;
      armBlend = 1 - releaseProgress;
    }

    return {
      kind: transition.kind,
      progress,
      frontBias,
      profileBias,
      armBlend,
      headsetY,
      currentOpacity: clamp((progress - 0.04) / 0.12, 0, 1),
      previousOpacity: 0,
      holdAmount: gripAmount,
    };
  }

  const holdY = lerp(-30, -34, frontBias);
  const grabEnd = 0.22;
  const faceHoldEnd = 0.32;
  const liftEnd = 0.62;
  const overheadHoldEnd = 0.8;
  const fadeStart = 0.88;

  let headsetY = 0;
  let holdAmount = 1;
  let armBlend = 1;

  if (progress < grabEnd) {
    const grabProgress = easeOutSine(progress / grabEnd);
    holdAmount = grabProgress;
    armBlend = grabProgress;
  } else if (progress < faceHoldEnd) {
    headsetY = 0;
  } else if (progress < liftEnd) {
    const liftProgress = easeInOutSine((progress - faceHoldEnd) / (liftEnd - faceHoldEnd));
    headsetY = lerp(0, holdY, liftProgress);
  } else if (progress < overheadHoldEnd) {
    headsetY = holdY;
  } else {
    const releaseProgress = easeInOutSine((progress - overheadHoldEnd) / (1 - overheadHoldEnd));
    headsetY = holdY;
    holdAmount = 1 - releaseProgress;
    armBlend = 1 - releaseProgress;
  }

  return {
    kind: transition.kind,
    progress,
    frontBias,
    profileBias,
    armBlend,
    headsetY,
    currentOpacity: 0,
    previousOpacity:
      progress < fadeStart ? 1 : 1 - clamp((progress - fadeStart) / (1 - fadeStart), 0, 1),
    holdAmount,
  };
}

export function applyHeadsetTransitionChannels(channels, transition) {
  if (!transition) {
    return channels;
  }

  const motion = getHeadsetTransitionMotion(transition, channels.bodyYaw);

  if (!motion) {
    return channels;
  }

  const handLift = motion.armBlend;
  const shoulderLift = handLift * 0.72;
  const forwardReach = lerp(
    lerp(4.6, 9.2, motion.profileBias),
    7.4,
    motion.frontBias
  ) * handLift;
  const projectionComp = forwardReach * 0.26;
  const headsetY = motion.headsetY;

  channels.shape.armSpread += handLift * 1.2;
  channels.root.y -= handLift * 0.8;
  channels.headPitch += handLift * 4.6;
  channels.headRoll *= 1 - handLift * 0.65;

  ['left', 'right'].forEach((side) => {
    const sideSign = side === 'left' ? -1 : 1;
    const hand = channels.joints[`${side}Hand`];
    const control = channels.joints[`${side}ArmControl`];
    const shoulder = channels.joints[`${side}Shoulder`];
    const gripInset = lerp(0.5, 1.8, motion.frontBias) * motion.holdAmount;
    const handGripX = lerp(11.5, 19 - gripInset, motion.frontBias);
    const elbowGripX = lerp(3.4, 5.5, motion.frontBias);

    hand.x = lerp(hand.x, -sideSign * handGripX - projectionComp, handLift);
    hand.y = lerp(hand.y, -72 + headsetY, handLift);
    hand.z = lerp(hand.z, forwardReach, handLift * 0.85);

    // In front view the elbow should track the headset lift while staying below
    // the grip, otherwise the quadratic arm curve looks detached.
    control.x = lerp(control.x, sideSign * elbowGripX - projectionComp * 0.4, handLift);
    control.y = lerp(control.y, 6 + headsetY * 0.72, handLift);
    control.z = lerp(control.z, forwardReach * 0.52, handLift * 0.8);

    shoulder.y -= shoulderLift * 5.5;
  });

  return channels;
}

export function getTransitionDurationMs({
  fromClipId,
  toClipId,
  fromFacingId,
  toFacingId,
  fromPropId,
  toPropId,
  transitionSoftness = 1,
}) {
  let duration = 320;
  const fromIsHeadset = isHeadsetPropId(fromPropId);
  const toIsHeadset = isHeadsetPropId(toPropId);

  if (fromClipId !== toClipId) {
    const pairKey = `${fromClipId}:${toClipId}`;

    if (pairKey === 'standing:idle' || pairKey === 'idle:standing') {
      duration = 360;
    } else if (pairKey === 'idle:walk' || pairKey === 'walk:idle') {
      duration = 520;
    } else if (pairKey === 'standing:walk' || pairKey === 'walk:standing') {
      duration = 560;
    } else {
      duration = 420;
    }
  }

  if (fromFacingId !== toFacingId) {
    duration = Math.max(duration, 380);
  }

  if (fromPropId !== toPropId) {
    if (fromIsHeadset !== toIsHeadset && (fromIsHeadset || toIsHeadset)) {
      duration = Math.max(duration, 860);
    } else {
      duration = Math.max(duration, 280);
    }
  }

  return Math.round(duration * transitionSoftness);
}
