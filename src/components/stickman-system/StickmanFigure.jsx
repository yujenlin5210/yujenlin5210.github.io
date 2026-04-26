import { motion } from 'framer-motion';
import {
  StickmanBodyRenderer,
  StickmanHeadRenderer,
  StickmanLimbRenderer,
} from '../stickman-lab/renderers';
import { getHeadsetTransitionMotion } from './clips';
import { STICKMAN_DEFAULT_STYLE, STICKMAN_HEADSET_PROP_IDS } from './config';

const RENDER_TRANSITION = { duration: 0 };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
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

function isHeadsetPropId(propId) {
  return STICKMAN_HEADSET_PROP_IDS.includes(propId);
}

function getPropRenderPresentation(propId, attachments, role) {
  if (!isHeadsetPropId(propId)) {
    return { y: 0 };
  }

  const transition = attachments.headsetPropTransition;

  if (!transition || transition.headsetPropId !== propId) {
    return { y: 0 };
  }

  const motion = getHeadsetTransitionMotion(transition, attachments.bodyYaw);

  if (!motion) {
    return { y: 0 };
  }

  if (transition.kind === 'donning' && role === 'current') {
    return { y: motion.headsetY };
  }

  if (transition.kind === 'doffing' && role === 'previous') {
    return { y: motion.headsetY };
  }

  return { y: 0 };
}

function getPropOpacity(propId, attachments, role, fallbackOpacity) {
  if (!isHeadsetPropId(propId)) {
    return fallbackOpacity;
  }

  const transition = attachments.headsetPropTransition;

  if (!transition || transition.headsetPropId !== propId) {
    return fallbackOpacity;
  }

  const motion = getHeadsetTransitionMotion(transition, attachments.bodyYaw);

  if (!motion) {
    return fallbackOpacity;
  }

  if (transition.kind === 'donning' && role === 'current') {
    return motion.currentOpacity;
  }

  if (transition.kind === 'doffing' && role === 'previous') {
    return motion.previousOpacity;
  }

  return fallbackOpacity;
}

function getHeadsetMetrics(pose) {
  const yawRad = (pose.yaw * Math.PI) / 180;
  const signedProfile = Math.sin(yawRad);
  const profileAmount = Math.abs(signedProfile);
  const absYaw = Math.abs(pose.yaw);
  const profileBias = clamp((profileAmount - 0.58) / 0.42, 0, 1);

  return {
    yawRad,
    signedProfile,
    profileAmount,
    profileBias,
    lookDirection: Math.abs(signedProfile) < 0.001 ? 0 : -Math.sign(signedProfile),
    forwardShift: -signedProfile * lerp(6, 8.5, profileBias),
    visorOpacity: absYaw < 100 ? 1 : Math.max(0, 1 - (absYaw - 100) / 30),
  };
}

function buildBobaFrontPath(centerX, centerY, width, height, profileAmount) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const left = centerX - halfWidth;
  const right = centerX + halfWidth;
  const top = centerY - halfHeight;
  const bottom = centerY + halfHeight * 0.98;
  const topInset = 6.8 - profileAmount * 2.1;
  const sideShoulderY = top + height * 0.18;
  const sideMidY = centerY + height * 0.08;
  const topArch = 1.8 - profileAmount * 0.45;
  const sideBulge = 1.4 + (1 - profileAmount) * 1.2;
  const lowerRound = 2.2 + (1 - profileAmount) * 1.1;
  const bottomInset = 7.8 - profileAmount * 1.7;
  const noseWidth = width * (0.135 + (1 - profileAmount) * 0.055);
  const noseDepth = 5.6 - profileAmount * 2.4;
  const noseArchWidth = noseWidth * 0.52;
  const noseShoulderY = bottom - noseDepth * 0.34;
  const nosePeakY = bottom - noseDepth;

  return [
    `M ${left + topInset},${top}`,
    `Q ${centerX},${top - topArch} ${right - topInset},${top}`,
    `Q ${right + sideBulge},${sideShoulderY} ${right - 0.2},${sideMidY}`,
    `Q ${right - 0.9},${bottom - lowerRound} ${right - bottomInset},${bottom}`,
    `L ${centerX + noseWidth},${bottom}`,
    `Q ${centerX + noseWidth * 0.68},${bottom} ${centerX + noseArchWidth},${noseShoulderY}`,
    `Q ${centerX + noseArchWidth * 0.32},${nosePeakY} ${centerX},${nosePeakY}`,
    `Q ${centerX - noseArchWidth * 0.32},${nosePeakY} ${centerX - noseArchWidth},${noseShoulderY}`,
    `Q ${centerX - noseWidth * 0.68},${bottom} ${centerX - noseWidth},${bottom}`,
    `L ${left + bottomInset},${bottom}`,
    `Q ${left + 0.9},${bottom - lowerRound} ${left + 0.2},${sideMidY}`,
    `Q ${left - sideBulge},${sideShoulderY} ${left + topInset},${top}`,
    'Z',
  ].join(' ');
}

function buildProfileHeadsetPath(centerX, centerY, width, height, direction) {
  const frontDirection = direction === 0 ? 1 : direction;
  const insetShift = width * 0.06 + 1.15;
  const profileCenterX = centerX - frontDirection * insetShift;
  const top = centerY - height * 0.485;
  const bottom = centerY + height * 0.485;
  const frontExtent = width * 0.44 + 1.1;
  const rearExtent = width * 0.16 + 1.4;
  const frontX = profileCenterX + frontDirection * frontExtent;
  const rearX = profileCenterX - frontDirection * rearExtent;
  const frontBridgeX = profileCenterX + frontDirection * (width * 0.3 + 0.7);
  const rearBridgeX = profileCenterX - frontDirection * (width * 0.05 + 0.3);
  const corner = Math.min(4.8, height * 0.25);

  return [
    `M ${rearX},${top + corner}`,
    `Q ${rearX - frontDirection * 0.2},${top + 0.7} ${rearBridgeX},${top}`,
    `L ${frontBridgeX},${top}`,
    `Q ${frontX + frontDirection * 0.35},${top + 0.8} ${frontX},${top + corner}`,
    `L ${frontX},${bottom - corner}`,
    `Q ${frontX + frontDirection * 0.2},${bottom - 0.7} ${frontBridgeX},${bottom}`,
    `L ${rearBridgeX},${bottom}`,
    `Q ${rearX + frontDirection * 0.45},${bottom - 0.15} ${rearX},${bottom - corner}`,
    'Z',
  ].join(' ');
}

function HeadsetBand({ pose, strokeClassName, strokeWidth = 3 }) {
  const bandY = pose.slots.face.y;

  return (
    <line
      x1={pose.head.x - pose.head.rx - 1}
      y1={bandY}
      x2={pose.head.x + pose.head.rx + 1}
      y2={bandY}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      className={strokeClassName}
    />
  );
}

function HeadsetMotionGroup({ opacity, presentation, children }) {
  return (
    <motion.g
      initial={false}
      animate={{ opacity, y: presentation?.y || 0 }}
      transition={RENDER_TRANSITION}
    >
      {children}
    </motion.g>
  );
}

function VRHeadsetSolidProp({ pose, opacity, presentation }) {
  const boxWidth = 43;
  const boxDepth = 24;
  const boxHeight = 19;
  const { profileAmount, forwardShift, visorOpacity } = getHeadsetMetrics(pose);
  const visorWidth = boxWidth * (1 - profileAmount) + boxDepth * profileAmount;

  return (
    <HeadsetMotionGroup opacity={opacity} presentation={presentation}>
      <HeadsetBand pose={pose} strokeClassName="text-slate-700 dark:text-slate-300" />
      {visorOpacity > 0.01 && (
        <rect
          x={pose.slots.face.x + forwardShift - visorWidth / 2}
          y={pose.slots.face.y - boxHeight / 2}
          width={visorWidth}
          height={boxHeight}
          rx={3}
          fill="currentColor"
          className="text-slate-900 dark:text-slate-100"
          opacity={Math.min(1, visorOpacity)}
        />
      )}
    </HeadsetMotionGroup>
  );
}

function VRHeadsetWireProp({ pose, opacity, presentation, fill, fillClassName, strokeClassName }) {
  const boxWidth = 43;
  const boxDepth = 24;
  const boxHeight = 19;
  const { profileAmount, forwardShift, visorOpacity } = getHeadsetMetrics(pose);
  const visorWidth = boxWidth * (1 - profileAmount) + boxDepth * profileAmount;

  return (
    <HeadsetMotionGroup opacity={opacity} presentation={presentation}>
      <HeadsetBand pose={pose} strokeClassName={strokeClassName} strokeWidth={2.8} />
      {visorOpacity > 0.01 && (
        <>
          <rect
            x={pose.slots.face.x + forwardShift - visorWidth / 2}
            y={pose.slots.face.y - boxHeight / 2}
            width={visorWidth}
            height={boxHeight}
            rx={3}
            fill={fill}
            className={fillClassName}
            opacity={Math.min(1, visorOpacity)}
          />
          <rect
            x={pose.slots.face.x + forwardShift - visorWidth / 2}
            y={pose.slots.face.y - boxHeight / 2}
            width={visorWidth}
            height={boxHeight}
            rx={3}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            className={strokeClassName}
            opacity={Math.min(1, visorOpacity)}
          />
        </>
      )}
    </HeadsetMotionGroup>
  );
}

function VRHeadsetBobaProp({ pose, opacity, presentation }) {
  const shellWidthFront = 44;
  const shellWidthProfile = 30;
  const shellHeight = 20;
  const { profileAmount, profileBias, lookDirection, forwardShift, visorOpacity } = getHeadsetMetrics(pose);
  const visorWidth = shellWidthFront * (1 - profileAmount) + shellWidthProfile * profileAmount;
  const centerX = pose.slots.face.x + forwardShift;
  const centerY = pose.slots.face.y;
  const frontPath = buildBobaFrontPath(centerX, centerY, visorWidth, shellHeight, profileAmount);
  const profilePath = buildProfileHeadsetPath(centerX, centerY, visorWidth, shellHeight, lookDirection);
  const frontOpacity = Math.min(1, visorOpacity * (1 - profileBias));
  const profileOpacity = Math.min(1, visorOpacity * profileBias);
  return (
    <HeadsetMotionGroup opacity={opacity} presentation={presentation}>
      <HeadsetBand pose={pose} strokeClassName="text-slate-800 dark:text-slate-300" strokeWidth={3.1} />
      {visorOpacity > 0.01 && (
        <>
          <path
            d={frontPath}
            fill="currentColor"
            className="text-slate-900 dark:text-slate-950"
            opacity={frontOpacity}
          />
          <path
            d={frontPath}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            className="text-slate-200 dark:text-slate-100"
            opacity={frontOpacity}
          />
          <path
            d={profilePath}
            fill="currentColor"
            className="text-slate-900 dark:text-slate-950"
            opacity={profileOpacity}
          />
          <path
            d={profilePath}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            className="text-slate-200 dark:text-slate-100"
            opacity={profileOpacity}
          />
        </>
      )}
    </HeadsetMotionGroup>
  );
}

function renderProp(propId, pose, opacity, layer, presentation) {
  if (!propId || propId === 'none' || opacity <= 0.01) {
    return null;
  }

  if (layer === 'head') {
    if (propId === 'vr-headset') {
      return <VRHeadsetSolidProp pose={pose} opacity={opacity} presentation={presentation} />;
    }

    if (propId === 'vr-headset-wire-dark') {
      return (
        <VRHeadsetWireProp
          pose={pose}
          opacity={opacity}
          presentation={presentation}
          fill="white"
          fillClassName=""
          strokeClassName="text-slate-900 dark:text-slate-100"
        />
      );
    }

    if (propId === 'vr-headset-wire-light') {
      return (
        <VRHeadsetWireProp
          pose={pose}
          opacity={opacity}
          presentation={presentation}
          fill="currentColor"
          fillClassName="text-slate-900 dark:text-slate-950"
          strokeClassName="text-white dark:text-slate-100"
        />
      );
    }

    if (propId === 'vr-headset-boba') {
      return <VRHeadsetBobaProp pose={pose} opacity={opacity} presentation={presentation} />;
    }
  }

  return null;
}

export default function StickmanFigure({ pose, attachments, showGizmos }) {
  const previousPropBaseOpacity =
    attachments.previousPropId !== attachments.currentPropId ? 1 - attachments.blendProgress : 0;
  const currentPropBaseOpacity =
    attachments.currentPropId === attachments.previousPropId ? 1 : attachments.blendProgress;
  const previousPropOpacity = getPropOpacity(
    attachments.previousPropId,
    attachments,
    'previous',
    previousPropBaseOpacity
  );
  const currentPropOpacity = getPropOpacity(
    attachments.currentPropId,
    attachments,
    'current',
    currentPropBaseOpacity
  );
  const previousPropPresentation = getPropRenderPresentation(
    attachments.previousPropId,
    attachments,
    'previous'
  );
  const currentPropPresentation = getPropRenderPresentation(
    attachments.currentPropId,
    attachments,
    'current'
  );
  const shouldHideEyes =
    (isHeadsetPropId(attachments.previousPropId) && previousPropOpacity > 0.01) ||
    (isHeadsetPropId(attachments.currentPropId) && currentPropOpacity > 0.01);
  const headForRender = shouldHideEyes ? { ...pose.head, eyes: [] } : pose.head;

  return (
    <g>
      {pose.limbs.rear.map((limb) => {
        const style = getLimbStyle(limb.depth);
        const gizmo = getEndpointGizmoStyle(limb.type, limb.depth, showGizmos);

        return (
          <StickmanLimbRenderer
            key={limb.id}
            styleId={STICKMAN_DEFAULT_STYLE.limbStyle}
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
        styleId={STICKMAN_DEFAULT_STYLE.bodyStyle}
        body={pose.body}
        transition={RENDER_TRANSITION}
      />

      <StickmanHeadRenderer
        styleId={STICKMAN_DEFAULT_STYLE.headStyle}
        head={headForRender}
        transition={RENDER_TRANSITION}
      />

      {renderProp(attachments.previousPropId, pose, previousPropOpacity, 'head', previousPropPresentation)}
      {renderProp(attachments.currentPropId, pose, currentPropOpacity, 'head', currentPropPresentation)}

      {pose.limbs.front.map((limb) => {
        const style = getLimbStyle(limb.depth);
        const gizmo = getEndpointGizmoStyle(limb.type, limb.depth, showGizmos);

        return (
          <StickmanLimbRenderer
            key={limb.id}
            styleId={STICKMAN_DEFAULT_STYLE.limbStyle}
            limb={limb}
            transition={RENDER_TRANSITION}
            className={style.className}
            opacity={style.opacity}
            gizmoClassName={gizmo.className}
            gizmoOpacity={gizmo.opacity}
          />
        );
      })}

      {renderProp(attachments.previousPropId, pose, previousPropOpacity, 'front', previousPropPresentation)}
      {renderProp(attachments.currentPropId, pose, currentPropOpacity, 'front', currentPropPresentation)}
    </g>
  );
}
