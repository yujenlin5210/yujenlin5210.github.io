import { motion } from 'framer-motion';
import {
  StickmanBodyRenderer,
  StickmanHeadRenderer,
  StickmanLimbRenderer,
} from '../stickman-lab/renderers';
import { STICKMAN_DEFAULT_STYLE } from './config';

const RENDER_TRANSITION = { duration: 0 };

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

function VRHeadsetProp({ pose, opacity }) {
  const boxWidth = 40;   // front-facing width
  const boxDepth = 24;   // side-facing depth
  const boxHeight = 19;
  const yawRad = (pose.yaw * Math.PI) / 180;
  const profileAmount = Math.abs(Math.sin(yawRad));
  const visorWidth = boxWidth * (1 - profileAmount) + boxDepth * profileAmount;
  const visorHeight = boxHeight;
  // Shift visor forward (away from face) so it doesn't sit flat on the head
  const forwardShift = -Math.sin(yawRad) * 6;
  const absYaw = Math.abs(pose.yaw);
  // Visor visible from front, quarter, and profile; fades out toward back
  const visorOpacity = absYaw < 100 ? 1 : Math.max(0, 1 - (absYaw - 100) / 30);
  const bandY = pose.slots.face.y;

  return (
    <motion.g initial={false} animate={{ opacity }} transition={RENDER_TRANSITION}>
      {/* Headband strap — wraps around the head, visible from all angles */}
      <line
        x1={pose.head.x - pose.head.rx - 1}
        y1={bandY}
        x2={pose.head.x + pose.head.rx + 1}
        y2={bandY}
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="text-slate-700 dark:text-slate-300"
      />
      {/* Visor box — only visible when facing forward */}
      {visorOpacity > 0.01 && (
        <rect
          x={pose.slots.face.x + forwardShift - visorWidth / 2}
          y={pose.slots.face.y - visorHeight / 2}
          width={visorWidth}
          height={visorHeight}
          rx={3}
          fill="currentColor"
          className="text-slate-900 dark:text-slate-100"
          opacity={Math.min(1, visorOpacity)}
        />
      )}
    </motion.g>
  );
}

function renderProp(propId, pose, opacity, layer) {
  if (!propId || propId === 'none' || opacity <= 0.01) {
    return null;
  }

  if (propId === 'vr-headset' && layer === 'head') {
    return <VRHeadsetProp pose={pose} opacity={opacity} />;
  }

  return null;
}

export default function StickmanFigure({ pose, attachments, showGizmos }) {
  const previousPropOpacity =
    attachments.previousPropId !== attachments.currentPropId ? 1 - attachments.blendProgress : 0;
  const currentPropOpacity = attachments.currentPropId === attachments.previousPropId ? 1 : attachments.blendProgress;

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
        head={pose.head}
        transition={RENDER_TRANSITION}
      />

      {renderProp(attachments.previousPropId, pose, previousPropOpacity, 'head')}
      {renderProp(attachments.currentPropId, pose, currentPropOpacity, 'head')}

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

      {renderProp(attachments.previousPropId, pose, previousPropOpacity, 'front')}
      {renderProp(attachments.currentPropId, pose, currentPropOpacity, 'front')}
    </g>
  );
}
