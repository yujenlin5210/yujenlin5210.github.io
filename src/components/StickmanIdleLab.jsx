import { startTransition, useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { buildStickmanLabRig, DEFAULT_STICKMAN_LAB_POSE } from './stickman-lab/rig';
import {
  StickmanBodyRenderer,
  StickmanHeadRenderer,
  StickmanLimbRenderer,
} from './stickman-lab/renderers';

const BASE_IDLE_POSE = {
  ...DEFAULT_STICKMAN_LAB_POSE,
  yaw: 40,
};

const LOOP_OPTIONS = [
  {
    id: 'calm',
    label: 'Calm',
    description: 'A planted chest-breath cycle with only a small head response.',
  },
  {
    id: 'buoyant',
    label: 'Buoyant',
    description: 'A fuller inhale-exhale pass without lifting the feet off the ground.',
  },
  {
    id: 'watchful',
    label: 'Watchful',
    description: 'A restrained breathing loop with a slight look-around layered on top.',
  },
  {
    id: 'walk',
    label: 'Walk',
    description: 'A first in-place walk cycle built on the same 2.5D rig.',
  },
];

const FACING_OPTIONS = [
  {
    id: 'quarter',
    label: 'Quarter',
    description: 'The current preferred 2.5D baseline.',
    yaw: 34,
  },
  {
    id: 'front',
    label: 'Front',
    description: 'Use the most symmetric read as a stability check.',
    yaw: 0,
  },
  {
    id: 'right',
    label: 'Right',
    description: 'Check the loop in a stronger profile view.',
    yaw: 90,
  },
  {
    id: 'back',
    label: 'Back',
    description: 'Make sure the arc logic still reads from behind.',
    yaw: 180,
  },
];

const RENDER_TRANSITION = { duration: 0 };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}

function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function normalizeUnitCycle(value) {
  return ((value % 1) + 1) % 1;
}

const WALK_GROUND_Y = 220;

function formatMetricValue(value, unit, signed = false) {
  const roundedValue = Number(value.toFixed(1));
  const prefix = signed && roundedValue > 0 ? '+' : '';
  return `${prefix}${roundedValue}${unit}`;
}

function formatSignedDegrees(value) {
  const roundedValue = Math.round(value);
  const prefix = roundedValue > 0 ? '+' : '';
  return `${prefix}${roundedValue}deg`;
}

function getLimbStyle(depth) {
  if (depth < -6) {
    return {
      className: 'text-slate-400 dark:text-slate-600',
      opacity: 0.48,
    };
  }

  if (depth > 6) {
    return {
      className: 'text-slate-800 dark:text-slate-100',
      opacity: 1,
    };
  }

  return {
    className: 'text-slate-600 dark:text-slate-300',
    opacity: 0.82,
  };
}

function getEndpointGizmoStyle(type, depth, showGizmos) {
  if (!showGizmos) {
    return {
      className: '',
      opacity: 0,
    };
  }

  const baseOpacity = depth < -6 ? 0.42 : depth > 6 ? 0.9 : 0.7;

  return {
    className:
      type === 'arm'
        ? 'text-cyan-500 dark:text-cyan-300'
        : 'text-amber-500 dark:text-amber-300',
    opacity: baseOpacity,
  };
}

function setAnimationOffset(target, key, x = 0, y = 0, z = 0) {
  target[key] = { x, y, z };
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

function applyBreathChannels(pose, t, gain, channels) {
  const breath = Math.sin(t * channels.breathRate);
  const settle = Math.max(0, -breath);

  pose.torsoHeight += breath * channels.torsoHeight * gain;
  pose.torsoWidth += breath * channels.torsoWidth * gain;
  pose.armSpread += breath * channels.armSpread * gain;
  pose.kneeSoftness += settle * channels.kneeSoftness * gain;
  pose.headPitch += breath * channels.headPitch * gain;
  pose.headRoll += Math.sin(t * channels.breathRate * 0.48 + 0.9) * channels.headRoll * gain;
  pose.headYaw += Math.sin(t * channels.breathRate * 0.4 + 0.3) * channels.headYaw * gain;
  pose.torsoLean += Math.sin(t * channels.breathRate * 0.32 + 0.5) * channels.torsoLean * gain;
  pose.yaw += Math.sin(t * channels.breathRate * 0.28 + 0.18) * channels.bodyYaw * gain;
}

function applyWalkCycle(pose, t, gain, baseYaw) {
  const yawRadians = (baseYaw * Math.PI) / 180;
  const frontness = Math.abs(Math.cos(yawRadians));
  const profile = Math.abs(Math.sin(yawRadians));
  const frontalBias = frontness * (1 - profile);
  const frontOnlyBias = frontalBias * clamp((frontness - 0.8) / 0.2, 0, 1);
  const quarterBias = Math.sqrt(frontness * profile);
  const walkCycle = t * 1.05;
  const walkPhase = walkCycle * Math.PI * 2;
  const animationOffsets = {};
  const shoulderTwist = Math.sin(walkPhase) * 1.2 * frontness * gain;
  const hipTwist = Math.sin(walkPhase) * 0.7 * frontness * gain;
  const stepLength = lerp(2.6, 15, profile) * lerp(1, 0.74, quarterBias) * gain;
  const stepHeight = lerp(4.4, 7.6, profile) * lerp(1, 0.8, quarterBias) * gain;
  const armSwing = (7 + profile * 1.4) * gain;
  const bodyScale = (pose.bodySize || DEFAULT_STICKMAN_LAB_POSE.bodySize) / 100;
  let stepLift = 0;
  let strideDepth = 0;

  pose.legLength -= (Math.abs(Math.sin(walkPhase)) * 1.1 + quarterBias * 0.5) * gain;
  pose.torsoHeight += Math.sin(walkPhase * 2 - 0.4) * 0.2 * gain;
  pose.headPitch += -0.35 + Math.sin(walkPhase * 2 - 0.3) * 0.1 * gain;
  pose.headRoll += Math.sin(walkPhase) * 0.08 * frontness * gain;
  pose.headYaw += Math.sin(walkPhase) * 0.12 * frontness * gain;
  pose.armSpread += 0.15 * gain;
  pose.stanceWidth -= 3.4 * gain;
  pose.kneeSoftness += 0.15 * gain;
  pose.torsoLean += Math.sin(walkPhase) * 0.14 * frontness * gain;
  pose.yaw += Math.sin(walkPhase) * 0.12 * frontness * gain;

  const baseArmCurveY = 14 + pose.armSpread * 0.2 + profile * 4;

  setAnimationOffset(animationOffsets, 'leftShoulder', 0, 0, -shoulderTwist);
  setAnimationOffset(animationOffsets, 'rightShoulder', 0, 0, shoulderTwist);
  setAnimationOffset(animationOffsets, 'leftHip', 0, 0, hipTwist);
  setAnimationOffset(animationOffsets, 'rightHip', 0, 0, -hipTwist);

  const torsoWidth = (pose.torsoWidth || DEFAULT_STICKMAN_LAB_POSE.torsoWidth) * bodyScale;
  const hipSpan = torsoWidth * 0.29;
  const hipY = WALK_GROUND_Y - (pose.legLength - 6);
  const footReach =
    10 +
    pose.stanceWidth +
    (pose.legLength - DEFAULT_STICKMAN_LAB_POSE.legLength) * 0.15 -
    quarterBias * 4.8 * gain;
  const thighLength = pose.legLength * 0.52;
  const shinLength = pose.legLength * 0.48;

  [
    { key: 'left', sideSign: -1, phaseOffset: 0 },
    { key: 'right', sideSign: 1, phaseOffset: 0.5 },
  ].forEach(({ key, sideSign, phaseOffset }) => {
    const cycle = normalizeUnitCycle(walkCycle + phaseOffset);
    const isStancePhase = cycle < 0.5;
    const cycleProgress = isStancePhase ? cycle / 0.5 : (cycle - 0.5) / 0.5;
    const swingCurve = Math.sin(cycleProgress * Math.PI);
    const easedCycleProgress = easeInOutSine(cycleProgress);
    const quarterStanceTravel = easeInOutSine(clamp((cycleProgress - 0.18) / 0.64, 0, 1));
    const baseFootZ = isStancePhase
      ? lerp(stepLength * 0.72, -stepLength * 0.88, cycleProgress)
      : lerp(-stepLength * 0.88, stepLength * 0.72, cycleProgress);
    const quarterFootZ = isStancePhase
      ? lerp(stepLength * 0.44, -stepLength * 0.48, quarterStanceTravel)
      : lerp(-stepLength * 0.48, stepLength * 0.52, easedCycleProgress);
    const footZ = lerp(baseFootZ, quarterFootZ, quarterBias * 0.82);
    const footY = (isStancePhase ? 0 : -swingCurve * stepHeight) * lerp(1, 0.76, quarterBias);
    const armPhase = (cycle + 0.5) * Math.PI * 2;
    const armStride = Math.sin(armPhase);
    const handZ = armStride * armSwing;
    const handY = -Math.max(0, armStride) * 1.3 * gain;
    const desiredArmCurveY = 1.4 * gain + Math.max(0, armStride) * 1.2 * gain;
    const elbowY = -baseArmCurveY + desiredArmCurveY;
    const trackReach = lerp(footReach, hipSpan + 2.6, quarterBias);
    const frontPerspectiveCancel = -footZ * lerp(0.24, 0.26, profile) * frontOnlyBias;
    const frontFootTarget = lerp(trackReach, hipSpan - 1.6, frontOnlyBias);
    const frontFootInward = sideSign * (frontFootTarget - trackReach) * gain;
    const swingOutward = isStancePhase ? 0 : sideSign * swingCurve * 0.18 * frontOnlyBias * gain;
    const profileCross = isStancePhase
      ? 0
      : -sideSign * swingCurve * 0.12 * (1 - frontOnlyBias) * profile * gain;
    const quarterBackTrack = -sideSign * Math.max(0, -footZ) * 0.28 * quarterBias;
    const footX = frontPerspectiveCancel + frontFootInward + swingOutward + profileCross + quarterBackTrack;
    const hipPoint = {
      x: sideSign * hipSpan,
      y: hipY,
      z: 0,
    };
    const footPoint = {
      x: sideSign * trackReach + footX,
      y: WALK_GROUND_Y + footY,
      z: footZ,
    };
    const kneePoint = solveWalkLegKneePoint({
      hip: hipPoint,
      foot: footPoint,
      upperLength: thighLength,
      lowerLength: shinLength,
      bendWeight: isStancePhase ? 0.01 : lerp(0.09, 0.26, profile) * lerp(1, 0.58, quarterBias),
    });
    const frontKneeOpen = sideSign * lerp(0.2, 0.32, swingCurve) * frontOnlyBias * gain;
    if (!isStancePhase) {
      const profileKneeCross = -sideSign * swingCurve * 0.08 * (1 - frontOnlyBias) * profile * gain;
      kneePoint.x += frontKneeOpen + profileKneeCross;
    } else {
      kneePoint.x += frontKneeOpen;
    }
    const kneeBasePoint = {
      x: (hipPoint.x + footPoint.x) / 2,
      y: (hipPoint.y + footPoint.y) / 2,
      z: (hipPoint.z + footPoint.z) / 2,
    };

    setAnimationOffset(animationOffsets, `${key}Foot`, footX, footY, footZ);
    setAnimationOffset(
      animationOffsets,
      `${key}LegKnee`,
      kneePoint.x - kneeBasePoint.x,
      kneePoint.y - kneeBasePoint.y,
      kneePoint.z - kneeBasePoint.z
    );
    setAnimationOffset(animationOffsets, `${key}Hand`, 0, handY, handZ);
    setAnimationOffset(animationOffsets, `${key}ArmControl`, sideSign * 0.12 * gain, elbowY, handZ * 0.22);

    stepLift = Math.max(stepLift, -footY);
    strideDepth = Math.max(strideDepth, Math.abs(footZ));
  });

  return {
    animationOffsets,
    stepLift,
    strideDepth,
  };
}

function buildAnimatedPose({ baseYaw, loopId, speed, intensity, timeline }) {
  const gain = intensity / 100;
  const t = timeline * speed;
  const pose = {
    ...BASE_IDLE_POSE,
    yaw: baseYaw,
  };
  let walkMetrics = null;

  if (loopId === 'walk') {
    walkMetrics = applyWalkCycle(pose, t, gain, baseYaw);
    pose.animationOffsets = walkMetrics.animationOffsets;
  } else if (loopId === 'buoyant') {
    applyBreathChannels(pose, t, gain, {
      breathRate: 1.2,
      torsoHeight: 3.6,
      torsoWidth: 1.4,
      armSpread: 0.9,
      kneeSoftness: 1.7,
      headPitch: 0.55,
      headRoll: 0.7,
      headYaw: 0.85,
      torsoLean: 0.65,
      bodyYaw: 0.7,
    });
  } else if (loopId === 'watchful') {
    const scan = Math.sin(t * 0.42);

    applyBreathChannels(pose, t, gain, {
      breathRate: 0.9,
      torsoHeight: 2.1,
      torsoWidth: 0.85,
      armSpread: 0.3,
      kneeSoftness: 0.9,
      headPitch: 0.3,
      headRoll: 0.28,
      headYaw: 0.4,
      torsoLean: 0.18,
      bodyYaw: 0.22,
    });

    pose.yaw += scan * 0.8 * gain;
    pose.torsoLean += scan * 0.45 * gain;
    pose.headYaw += scan * 6.5 * gain;
    pose.headPitch += Math.sin(t * 0.84 + 1.1) * 0.18 * gain;
  } else {
    applyBreathChannels(pose, t, gain, {
      breathRate: 1.02,
      torsoHeight: 2.6,
      torsoWidth: 1,
      armSpread: 0.5,
      kneeSoftness: 1,
      headPitch: 0.35,
      headRoll: 0.35,
      headYaw: 0.5,
      torsoLean: 0.28,
      bodyYaw: 0.24,
    });
  }

  pose.legLength = clamp(pose.legLength, 44, 104);
  pose.stanceWidth = clamp(pose.stanceWidth, 8, 34);
  pose.torsoWidth = clamp(pose.torsoWidth, 24, 46);
  pose.torsoHeight = clamp(pose.torsoHeight, 42, 72);
  pose.torsoLean = clamp(pose.torsoLean, -14, 14);
  pose.headYaw = clamp(pose.headYaw, -90, 90);
  pose.headPitch = clamp(pose.headPitch, -35, 35);
  pose.headRoll = clamp(pose.headRoll, -35, 35);
  pose.armSpread = clamp(pose.armSpread, 10, 36);
  pose.kneeSoftness = clamp(pose.kneeSoftness, 0, 18);

  return {
    pose,
    readout: [
      { label: 'Body yaw', value: pose.yaw, unit: 'deg', signed: true },
      { label: 'Head offset', value: pose.headYaw, unit: 'deg', signed: true },
      loopId === 'walk'
        ? {
            label: 'Stride depth',
            value: walkMetrics?.strideDepth || 0,
            unit: 'px',
            signed: false,
          }
        : {
            label: 'Chest lift',
            value: pose.torsoHeight - BASE_IDLE_POSE.torsoHeight,
            unit: 'px',
            signed: true,
          },
      loopId === 'walk'
        ? {
            label: 'Step lift',
            value: walkMetrics?.stepLift || 0,
            unit: 'px',
            signed: false,
          }
        : {
            label: 'Knee softness',
            value: pose.kneeSoftness,
            unit: 'px',
            signed: false,
          },
    ],
  };
}

function RangeField({ id, label, value, min, max, step, displayValue, onChange }) {
  return (
    <label htmlFor={id} className="block">
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
          {displayValue}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-500 dark:bg-slate-800"
      />
    </label>
  );
}

function ChoiceGrid({
  title,
  description = null,
  options,
  activeId,
  columns = 2,
  onSelect,
  renderMeta,
  compact = false,
  hideOptionDescriptions = false,
}) {
  return (
    <section>
      <div className="mb-3">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          {title}
        </p>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
        ) : null}
      </div>
      <div className={`grid gap-3 ${columns === 1 ? 'grid-cols-1' : columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {options.map((option) => {
          const isActive = activeId === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={`border text-left font-semibold transition-colors ${
                compact ? 'rounded-xl px-3 py-2 text-xs' : 'rounded-2xl px-4 py-3 text-sm'
              } ${
                isActive
                  ? 'border-indigo-500 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300'
              }`}
            >
              <span
                className={`block font-mono uppercase opacity-70 ${
                  compact ? 'text-[10px] tracking-[0.2em]' : 'text-[11px] tracking-[0.24em]'
                }`}
              >
                {option.label}
              </span>
              {!hideOptionDescriptions ? (
                <span className="mt-2 block text-xs font-medium leading-relaxed opacity-80">
                  {option.description}
                </span>
              ) : null}
              {renderMeta && !compact ? (
                <span className="mt-3 block font-mono text-[10px] uppercase tracking-[0.2em] opacity-60">
                  {renderMeta(option)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StickmanFigureGroup({ rig, pose, showGizmos }) {
  return (
    <g>
      {rig.limbs.rear.map((limb) => {
        const style = getLimbStyle(limb.depth);
        const gizmo = getEndpointGizmoStyle(limb.type, limb.depth, showGizmos);

        return (
          <StickmanLimbRenderer
            key={limb.id}
            styleId={pose.limbStyle}
            limb={limb}
            transition={RENDER_TRANSITION}
            className={style.className}
            opacity={style.opacity}
            gizmoClassName={gizmo.className}
            gizmoOpacity={gizmo.opacity}
          />
        );
      })}

      <StickmanBodyRenderer
        styleId={pose.bodyStyle}
        body={rig.body}
        transition={RENDER_TRANSITION}
      />

      <StickmanHeadRenderer
        styleId={pose.headStyle}
        head={rig.head}
        transition={RENDER_TRANSITION}
      />

      {rig.limbs.front.map((limb) => {
        const style = getLimbStyle(limb.depth);
        const gizmo = getEndpointGizmoStyle(limb.type, limb.depth, showGizmos);

        return (
          <StickmanLimbRenderer
            key={limb.id}
            styleId={pose.limbStyle}
            limb={limb}
            transition={RENDER_TRANSITION}
            className={style.className}
            opacity={style.opacity}
            gizmoClassName={gizmo.className}
            gizmoOpacity={gizmo.opacity}
          />
        );
      })}
    </g>
  );
}

function buildTrackWalkPreview({ timeline, speed, intensity, travelWidth }) {
  const gain = intensity / 100;
  const travelHalfSpan = travelWidth * 1.6;
  const corridorWidth = travelHalfSpan * 2;
  const gaitCycle = timeline * speed * 1.05;
  const sideViewStepLength = 15 * gain;
  const rootAdvancePerCycle = Math.max(sideViewStepLength * 3.2, 1);
  const cyclesPerTraverse = Math.max(corridorWidth / rootAdvancePerCycle, 1);
  const travelCycle = normalizeUnitCycle(gaitCycle / (cyclesPerTraverse * 2));
  const movingRight = travelCycle < 0.5;
  const segmentProgress = movingRight ? travelCycle / 0.5 : (travelCycle - 0.5) / 0.5;
  const travelX = movingRight
    ? lerp(-travelHalfSpan, travelHalfSpan, segmentProgress)
    : lerp(travelHalfSpan, -travelHalfSpan, segmentProgress);
  const baseYaw = movingRight ? -90 : 90;
  const animated = buildAnimatedPose({
    baseYaw,
    loopId: 'walk',
    speed,
    intensity,
    timeline,
  });

  return {
    animated,
    travelX,
    facingLabel: movingRight ? 'Right' : 'Left',
    corridorHalfSpan: travelHalfSpan,
    corridorWidth,
  };
}

export default function StickmanIdleLab() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [loopId, setLoopId] = useState('buoyant');
  const [bodyYaw, setBodyYaw] = useState(FACING_OPTIONS[0].yaw);
  const [speed, setSpeed] = useState(1);
  const [intensity, setIntensity] = useState(100);
  const [trackSpeed, setTrackSpeed] = useState(0.95);
  const [trackWidth, setTrackWidth] = useState(88);
  const [showGizmos, setShowGizmos] = useState(false);
  const [paused, setPaused] = useState(false);
  const [timeline, setTimeline] = useState(0);
  const timelineRef = useRef(0);
  const activeFacing = FACING_OPTIONS.find((option) => Math.abs(option.yaw - bodyYaw) < 0.5) || null;
  const autoPlay = !prefersReducedMotion && !paused;

  useEffect(() => {
    if (!autoPlay) {
      return undefined;
    }

    let animationFrameId = 0;
    let lastPaint = 0;
    const startTime = performance.now() - timelineRef.current * 1000;

    const tick = (now) => {
      if (now - lastPaint >= 1000 / 60) {
        const nextTimeline = (now - startTime) / 1000;
        timelineRef.current = nextTimeline;
        startTransition(() => {
          setTimeline(nextTimeline);
        });
        lastPaint = now;
      }

      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [autoPlay]);

  const animated = buildAnimatedPose({
    baseYaw: bodyYaw,
    loopId,
    speed,
    intensity,
    timeline,
  });
  const rig = buildStickmanLabRig(animated.pose);
  const trackWalk = buildTrackWalkPreview({
    timeline,
    speed: trackSpeed,
    intensity,
    travelWidth: trackWidth,
  });
  const trackRig = buildStickmanLabRig(trackWalk.animated.pose);
  const trackPreviewOffsetX = 60;
  const trackPreviewCenterX = trackRig.guides.centerX + trackPreviewOffsetX;
  const trackFigureScale = 0.7;
  const activeLoop = LOOP_OPTIONS.find((option) => option.id === loopId) || LOOP_OPTIONS[0];
  const showScrubber = prefersReducedMotion || paused;

  return (
    <div className="my-10 space-y-10">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.4)] dark:border-slate-800 dark:bg-slate-950">
        <div className="grid xl:grid-cols-[minmax(0,1.12fr)_minmax(380px,0.88fr)]">
          <div className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800 xl:border-b-0 xl:border-r">
            <div
              className="absolute inset-0 opacity-80 dark:opacity-60"
              style={{
                backgroundImage: [
                  'radial-gradient(circle at 18% 18%, rgba(99, 102, 241, 0.16), transparent 30%)',
                  'radial-gradient(circle at 78% 28%, rgba(14, 165, 233, 0.14), transparent 24%)',
                  'linear-gradient(rgba(148, 163, 184, 0.12) 1px, transparent 1px)',
                  'linear-gradient(90deg, rgba(148, 163, 184, 0.12) 1px, transparent 1px)',
                ].join(', '),
                backgroundSize: '100% 100%, 100% 100%, 30px 30px, 30px 30px',
              }}
            />

            <div className="relative flex min-h-[420px] items-center justify-center p-6 sm:p-10 xl:min-h-[760px]">
              <div className="absolute left-6 top-6 rounded-full border border-indigo-200 bg-white/90 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-indigo-600 shadow-sm backdrop-blur dark:border-indigo-900/60 dark:bg-slate-950/80 dark:text-indigo-300">
                Motion Study
              </div>
              <div className="absolute right-6 top-6 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
                {activeLoop.label}
              </div>
              <div className="absolute bottom-6 left-6 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
                {rig.headingLabel}
              </div>
              <div className="absolute bottom-6 right-6 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
                Tempo {speed.toFixed(2)}x
              </div>

              <svg
                viewBox="0 0 300 240"
                className="w-full max-w-[34rem] overflow-visible"
                role="img"
                aria-labelledby="stickman-motion-lab-title stickman-motion-lab-desc"
              >
                <title id="stickman-motion-lab-title">Stickman motion lab</title>
                <desc id="stickman-motion-lab-desc">
                  A separate motion lab that reuses the standing 2.5D stickman rig to test idle breathing and a first walk cycle.
                </desc>

                <line
                  x1="40"
                  y1={rig.guides.groundY}
                  x2="260"
                  y2={rig.guides.groundY}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="6 6"
                  className="text-slate-300 dark:text-slate-700"
                />
                <line
                  x1={rig.guides.centerX}
                  y1="26"
                  x2={rig.guides.centerX}
                  y2={rig.guides.groundY}
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="4 6"
                  className="text-slate-200 dark:text-slate-800"
                />

                <text x="44" y="214" className="fill-slate-400 text-[9px] font-mono uppercase tracking-[0.24em]">
                  Ground
                </text>

                <StickmanFigureGroup
                  rig={rig}
                  pose={animated.pose}
                  showGizmos={showGizmos}
                />
              </svg>
            </div>
          </div>

          <div className="p-6 sm:p-8 xl:p-10">
            <div className="mb-6">
              <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-indigo-600 dark:text-indigo-300">
                Separate Animation Branch
              </p>
              <h3 className="mb-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Buoyant idle plus first walk cycle
              </h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                This page reuses the lab rig and renderer modules from the pose sandbox, but keeps the scope on motion
                only. Shape editing stays in the{' '}
                <a
                  href="/lab/2026-04-21-stickman-pose-lab"
                  className="font-semibold text-indigo-600 underline decoration-indigo-200 underline-offset-4 hover:text-indigo-500 dark:text-indigo-300 dark:decoration-indigo-500/40"
                >
                  standing pose lab
                </a>
                , while breathing, walking, and future transitions are tuned here.
              </p>
            </div>

            {prefersReducedMotion && (
              <div className="mb-6 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                Reduced motion is enabled, so autoplay is paused here. Use the scrubber to inspect the loop without continuous motion.
              </div>
            )}

            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPaused((current) => !current)}
                disabled={prefersReducedMotion}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                  prefersReducedMotion
                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300'
                }`}
              >
                <span className="block font-mono text-[11px] uppercase tracking-[0.24em] opacity-70">
                  Motion
                </span>
                <span className="mt-1 block">{paused ? 'Resume autoplay' : 'Pause on current frame'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGizmos((current) => !current)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                  showGizmos
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300'
                }`}
              >
                <span className="block font-mono text-[11px] uppercase tracking-[0.24em] opacity-70">
                  Gizmos
                </span>
                <span className="mt-1 block">{showGizmos ? 'Visible for debug' : 'Hidden by default'}</span>
              </button>
            </div>

            <div className="space-y-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/80">
              <ChoiceGrid
                title="Loop Profile"
                description="Use the same motion lab for breathing studies, the first walk cycle, and future transitions."
                options={LOOP_OPTIONS}
                activeId={loopId}
                onSelect={setLoopId}
              />

              <RangeField
                id="stickman-motion-yaw"
                label="Body Yaw"
                value={bodyYaw}
                min={-180}
                max={180}
                step={1}
                displayValue={formatSignedDegrees(bodyYaw)}
                onChange={setBodyYaw}
              />

              <ChoiceGrid
                title="Facing Check"
                description={null}
                options={FACING_OPTIONS}
                activeId={activeFacing?.id || null}
                columns={2}
                compact
                hideOptionDescriptions
                onSelect={(nextFacingId) => {
                  const nextFacing = FACING_OPTIONS.find((option) => option.id === nextFacingId);

                  if (nextFacing) {
                    setBodyYaw(nextFacing.yaw);
                  }
                }}
              />

              <RangeField
                id="stickman-idle-tempo"
                label="Tempo"
                value={speed}
                min={0.55}
                max={1.8}
                step={0.05}
                displayValue={`${speed.toFixed(2)}x`}
                onChange={setSpeed}
              />

              <RangeField
                id="stickman-idle-intensity"
                label="Intensity"
                value={intensity}
                min={35}
                max={150}
                step={1}
                displayValue={`${intensity}%`}
                onChange={setIntensity}
              />

              {showScrubber && (
                <RangeField
                  id="stickman-idle-scrub"
                  label="Frame Scrub"
                  value={timeline}
                  min={0}
                  max={12}
                  step={0.01}
                  displayValue={`${timeline.toFixed(2)}s`}
                  onChange={(value) => {
                    timelineRef.current = value;
                    setTimeline(value);
                  }}
                />
              )}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  Live Readout
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  {animated.readout.map((metric) => (
                    <div key={metric.label}>
                      <p className="text-slate-400 dark:text-slate-500">{metric.label}</p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                        {formatMetricValue(metric.value, metric.unit, metric.signed)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  Current Scope
                </p>
                <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  The motion layer now covers the buoyant idle baseline plus a first in-place walk cycle, but it is still
                  deliberately narrow: no props, no project-specific action hooks, and no production action registry wiring
                  yet.
                </p>
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                  Renderer baseline: classic only
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.4)] dark:border-slate-800 dark:bg-slate-950">
        <div className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800">
          <div
            className="absolute inset-0 opacity-80 dark:opacity-60"
            style={{
              backgroundImage: [
                'radial-gradient(circle at 20% 20%, rgba(14, 165, 233, 0.12), transparent 28%)',
                'radial-gradient(circle at 78% 26%, rgba(99, 102, 241, 0.14), transparent 22%)',
                'linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px)',
                'linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)',
              ].join(', '),
              backgroundSize: '100% 100%, 100% 100%, 28px 28px, 28px 28px',
            }}
          />

          <div className="relative flex min-h-[320px] items-center justify-center p-6 sm:p-8 xl:min-h-[440px] xl:p-10">
            <div className="absolute left-6 top-6 rounded-full border border-cyan-200 bg-white/90 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-600 shadow-sm backdrop-blur dark:border-cyan-900/60 dark:bg-slate-950/80 dark:text-cyan-300">
              Track Walk Study
            </div>
            <div className="absolute right-6 top-6 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
              Fixed Walk Loop
            </div>
            <div className="absolute bottom-6 left-6 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
              Facing {trackWalk.facingLabel}
            </div>
            <div className="absolute bottom-6 right-6 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
              Span {Math.round(trackWalk.corridorWidth)}px
            </div>

            <svg
              viewBox="0 0 420 240"
              className="w-full max-w-[72rem] overflow-visible"
              role="img"
              aria-labelledby="stickman-track-walk-title stickman-track-walk-desc"
            >
              <title id="stickman-track-walk-title">Stickman track walk study</title>
              <desc id="stickman-track-walk-desc">
                A left-right locomotion preview that keeps the character locked to side-facing motion while testing root travel across a short track.
              </desc>

              <line
                x1="30"
                y1={trackRig.guides.groundY}
                x2="390"
                y2={trackRig.guides.groundY}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="6 6"
                className="text-slate-300 dark:text-slate-700"
              />
              <line
                x1={trackPreviewCenterX - trackWalk.corridorHalfSpan}
                y1="34"
                x2={trackPreviewCenterX - trackWalk.corridorHalfSpan}
                y2={trackRig.guides.groundY}
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="4 6"
                className="text-slate-200 dark:text-slate-800"
              />
              <line
                x1={trackPreviewCenterX + trackWalk.corridorHalfSpan}
                y1="34"
                x2={trackPreviewCenterX + trackWalk.corridorHalfSpan}
                y2={trackRig.guides.groundY}
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="4 6"
                className="text-slate-200 dark:text-slate-800"
              />
              <path
                d={`M ${trackPreviewCenterX - trackWalk.corridorHalfSpan},${trackRig.guides.groundY - 12} L ${trackPreviewCenterX + trackWalk.corridorHalfSpan},${trackRig.guides.groundY - 12}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="3 5"
                className="text-cyan-200 dark:text-cyan-900/50"
              />
              <text x="34" y="214" className="fill-slate-400 text-[9px] font-mono uppercase tracking-[0.24em]">
                Track
              </text>

              <g transform={`translate(${trackPreviewOffsetX + trackWalk.travelX} 0)`}>
                <g
                  transform={`translate(${trackRig.guides.centerX} ${trackRig.guides.groundY}) scale(${trackFigureScale}) translate(${-trackRig.guides.centerX} ${-trackRig.guides.groundY})`}
                >
                  <StickmanFigureGroup
                    rig={trackRig}
                    pose={trackWalk.animated.pose}
                    showGizmos={showGizmos}
                  />
                </g>
              </g>
            </svg>
          </div>
        </div>

        <div className="p-6 sm:p-8 xl:p-10">
          <div className="mb-6 max-w-3xl">
            <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-600 dark:text-cyan-300">
              Locomotion Preview
            </p>
            <h3 className="mb-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Left-right pacing on a fixed track
            </h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              This second preview locks the body to left and right facings only, so the problem becomes root motion and edge-to-edge travel instead of free yaw inspection. It reuses the same walk cycle, but treats pacing as a separate locomotion study.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="space-y-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/80">
              <RangeField
                id="stickman-track-tempo"
                label="Pace Speed"
                value={trackSpeed}
                min={0.55}
                max={1.5}
                step={0.05}
                displayValue={`${trackSpeed.toFixed(2)}x`}
                onChange={setTrackSpeed}
              />

              <RangeField
                id="stickman-track-width"
                label="Travel Width"
                value={trackWidth}
                min={20}
                max={88}
                step={1}
                displayValue={`${Math.round(trackWalk.corridorWidth)}px`}
                onChange={setTrackWidth}
              />

              <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                This panel intentionally does not expose free body yaw. The character stays side-facing so pacing, travel width, and future turn logic can be judged separately from the in-place gait checks above.
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  Track Readout
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-400 dark:text-slate-500">Facing</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-white">{trackWalk.facingLabel}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 dark:text-slate-500">Travel X</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                      {formatMetricValue(trackWalk.travelX, 'px', true)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 dark:text-slate-500">Track Span</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                      {formatMetricValue(trackWalk.corridorWidth, 'px')}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 dark:text-slate-500">Loop</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-white">Walk only</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  Current Focus
                </p>
                <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  This first pass is only checking side-facing pacing across a short corridor. Root travel is now visible, but edge pauses and explicit turn behavior are still deferred.
                </p>
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                  Facing mode: left / right only
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
