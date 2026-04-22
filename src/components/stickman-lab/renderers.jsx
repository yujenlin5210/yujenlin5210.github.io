import { motion } from 'framer-motion';

export const STICKMAN_HEAD_STYLE_OPTIONS = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Ellipse head with the current face-plane cues.',
  },
  {
    id: 'polygon',
    label: 'Polygon',
    description: 'A square-to-pentagon hybrid head that stays cleaner during turns.',
  },
];

export const STICKMAN_BODY_STYLE_OPTIONS = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'The current rounded torso block.',
  },
  {
    id: 'michelin',
    label: 'Michelin',
    description: 'Stacked torso rings for a segmented mascot read.',
  },
];

export const STICKMAN_LIMB_STYLE_OPTIONS = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Clean rubber-hose limbs.',
  },
  {
    id: 'spring',
    label: 'Spring',
    description: 'Coiled limbs that follow the same rig anchors.',
  },
];

function buildPolygonHeadPath(centerX, centerY, rx, ry) {
  const points = [
    { x: centerX - rx * 0.56, y: centerY - ry * 0.98 },
    { x: centerX + rx * 0.56, y: centerY - ry * 0.98 },
    { x: centerX + rx * 0.98, y: centerY - ry * 0.1 },
    { x: centerX + rx * 0.62, y: centerY + ry * 0.92 },
    { x: centerX - rx * 0.62, y: centerY + ry * 0.92 },
    { x: centerX - rx * 0.98, y: centerY - ry * 0.1 },
  ];

  return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y} L ${points[2].x},${points[2].y} L ${points[3].x},${points[3].y} L ${points[4].x},${points[4].y} L ${points[5].x},${points[5].y} Z`;
}

function buildPolygonFacePath(facePlane) {
  return buildPolygonHeadPath(
    facePlane.x,
    facePlane.y,
    facePlane.rx * 0.92,
    facePlane.ry * 0.96
  );
}

function buildMichelinSegments(body) {
  const widths = [0.84, 0.94, 1, 0.95, 0.86];
  const segmentHeight = body.height / 5.25;
  const step = body.height / 5.45;

  return widths.map((scale, index) => {
    const width = body.width * scale;
    const x = body.x + (body.width - width) / 2;
    const y = body.y + index * step;

    return {
      id: `segment-${index}`,
      x,
      y,
      width,
      height: segmentHeight,
      rx: segmentHeight / 2,
    };
  });
}

function interpolateQuadraticPoint(start, control, end, t) {
  const inverse = 1 - t;

  return {
    x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
    y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
  };
}

function interpolateQuadraticTangent(start, control, end, t) {
  return {
    x: 2 * (1 - t) * (control.x - start.x) + 2 * t * (end.x - control.x),
    y: 2 * (1 - t) * (control.y - start.y) + 2 * t * (end.y - control.y),
  };
}

function buildSpringPath(start, control, end, amplitude) {
  const directLength = Math.hypot(end.x - start.x, end.y - start.y);
  const turns = Math.max(4, directLength / 16);
  const sampleCount = 48;
  const points = [];

  for (let index = 0; index <= sampleCount; index += 1) {
    const t = index / sampleCount;
    const point = interpolateQuadraticPoint(start, control, end, t);
    const tangent = interpolateQuadraticTangent(start, control, end, t);
    const tangentLength = Math.hypot(tangent.x, tangent.y) || 1;
    const normal = {
      x: -tangent.y / tangentLength,
      y: tangent.x / tangentLength,
    };
    const envelope = Math.sin(Math.PI * t);
    const offset = Math.sin(t * turns * Math.PI * 2) * amplitude * envelope;

    points.push({
      x: point.x + normal.x * offset,
      y: point.y + normal.y * offset,
    });
  }

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x},${point.y}`)
    .join(' ');
}

function EndpointGizmo({ limb, transition, className, opacity }) {
  return (
    <motion.g
      initial={false}
      animate={{
        x: limb.end.x,
        y: limb.end.y,
      }}
      transition={transition}
      opacity={opacity}
    >
      <circle
        cx="0"
        cy="0"
        r={limb.type === 'arm' ? 4.5 : 5}
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.4"
        className={className}
      />
      <line
        x1={limb.type === 'arm' ? -2.25 : -2.5}
        y1="0"
        x2={limb.type === 'arm' ? 2.25 : 2.5}
        y2="0"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        className={className}
      />
      <line
        x1="0"
        y1={limb.type === 'arm' ? -2.25 : -2.5}
        x2="0"
        y2={limb.type === 'arm' ? 2.25 : 2.5}
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        className={className}
      />
    </motion.g>
  );
}

function ClassicHead({ head, transition }) {
  return (
    <motion.g
      initial={false}
      animate={{
        x: head.x,
        y: head.y,
        rotate: head.roll,
      }}
      transition={transition}
      style={{ transformBox: 'fill-box', transformOrigin: 'center center' }}
    >
      <motion.ellipse
        initial={false}
        animate={{ rx: head.rx, ry: head.ry }}
        transition={transition}
        cx="0"
        cy="0"
        fill="white"
        stroke="currentColor"
        strokeWidth="3"
        className="fill-white text-slate-800 dark:fill-slate-950 dark:text-slate-100"
      />
      <motion.ellipse
        initial={false}
        animate={{
          cx: head.facePlane.x,
          cy: head.facePlane.y,
          rx: head.facePlane.rx,
          ry: head.facePlane.ry,
          opacity: head.facePlane.opacity,
        }}
        transition={transition}
        fill="currentColor"
        className="text-indigo-200 dark:text-slate-700"
      />
      <motion.line
        initial={false}
        animate={{
          x1: head.nose.x1,
          y1: head.nose.y1,
          x2: head.nose.x2,
          y2: head.nose.y2,
          opacity: head.nose.opacity,
        }}
        transition={transition}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        className="text-slate-500 dark:text-slate-300"
      />
      {head.eyes.map((eye) => (
        <motion.circle
          key={eye.id}
          initial={false}
          animate={{
            cx: eye.x,
            cy: eye.y,
            r: eye.radius,
            opacity: eye.opacity,
          }}
          transition={transition}
          className="fill-slate-800 dark:fill-slate-100"
        />
      ))}
    </motion.g>
  );
}

function PolygonHead({ head, transition }) {
  return (
    <motion.g
      initial={false}
      animate={{
        x: head.x,
        y: head.y,
        rotate: head.roll,
      }}
      transition={transition}
      style={{ transformBox: 'fill-box', transformOrigin: 'center center' }}
    >
      <motion.path
        initial={false}
        animate={{ d: buildPolygonHeadPath(0, 0, head.rx, head.ry) }}
        transition={transition}
        fill="white"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
        className="fill-white text-slate-800 dark:fill-slate-950 dark:text-slate-100"
      />
      <motion.path
        initial={false}
        animate={{
          d: buildPolygonFacePath(head.facePlane),
          opacity: Math.max(0.16, head.facePlane.opacity * 1.6),
        }}
        transition={transition}
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
        className="text-indigo-200 dark:text-slate-700"
      />
      <motion.line
        initial={false}
        animate={{
          x1: head.nose.x1,
          y1: head.nose.y1,
          x2: head.nose.x2,
          y2: head.nose.y2,
          opacity: head.nose.opacity,
        }}
        transition={transition}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="text-slate-500 dark:text-slate-300"
      />
      {head.eyes.map((eye) => (
        <motion.circle
          key={eye.id}
          initial={false}
          animate={{
            cx: eye.x,
            cy: eye.y,
            r: eye.radius,
            opacity: eye.opacity,
          }}
          transition={transition}
          className="fill-slate-800 dark:fill-slate-100"
        />
      ))}
    </motion.g>
  );
}

function ClassicBody({ body, transition }) {
  return (
    <motion.rect
      initial={false}
      animate={{
        x: body.x,
        y: body.y,
        width: body.width,
        height: body.height,
        rx: body.radius,
      }}
      transition={transition}
      fill="white"
      stroke="currentColor"
      strokeWidth="3"
      className="fill-white text-slate-800 dark:fill-slate-950 dark:text-slate-100"
    />
  );
}

function MichelinBody({ body, transition }) {
  const segments = buildMichelinSegments(body);

  return (
    <g>
      {segments.map((segment) => (
        <motion.rect
          key={segment.id}
          initial={false}
          animate={{
            x: segment.x,
            y: segment.y,
            width: segment.width,
            height: segment.height,
            rx: segment.rx,
          }}
          transition={transition}
          fill="white"
          stroke="currentColor"
          strokeWidth="2.4"
          className="fill-white text-slate-800 dark:fill-slate-950 dark:text-slate-100"
        />
      ))}
    </g>
  );
}

function ClassicLimb({ limb, transition, className, opacity, gizmoClassName, gizmoOpacity }) {
  return (
    <g>
      <motion.path
        initial={false}
        animate={{ d: limb.path }}
        transition={transition}
        fill="none"
        stroke="currentColor"
        strokeWidth={limb.type === 'arm' ? 4 : 4.5}
        strokeLinecap="round"
        className={className}
        opacity={opacity}
      />
      <EndpointGizmo
        limb={limb}
        transition={transition}
        className={gizmoClassName}
        opacity={gizmoOpacity}
      />
    </g>
  );
}

function SpringLimb({ limb, transition, className, opacity, gizmoClassName, gizmoOpacity }) {
  const springPath = buildSpringPath(
    limb.start,
    limb.control,
    limb.end,
    limb.type === 'arm' ? 2.8 : 3.3
  );

  return (
    <g>
      <motion.path
        initial={false}
        animate={{ d: springPath }}
        transition={transition}
        fill="none"
        stroke="currentColor"
        strokeWidth={limb.type === 'arm' ? 2.5 : 2.8}
        strokeLinecap="round"
        className={className}
        opacity={opacity}
      />
      <EndpointGizmo
        limb={limb}
        transition={transition}
        className={gizmoClassName}
        opacity={gizmoOpacity}
      />
    </g>
  );
}

export function StickmanHeadRenderer({ styleId, head, transition }) {
  if (styleId === 'polygon' || styleId === 'soccer') {
    return <PolygonHead head={head} transition={transition} />;
  }

  return <ClassicHead head={head} transition={transition} />;
}

export function StickmanBodyRenderer({ styleId, body, transition }) {
  if (styleId === 'michelin') {
    return <MichelinBody body={body} transition={transition} />;
  }

  return <ClassicBody body={body} transition={transition} />;
}

export function StickmanLimbRenderer({
  styleId,
  limb,
  transition,
  className,
  opacity,
  gizmoClassName,
  gizmoOpacity,
}) {
  if (styleId === 'spring') {
    return (
      <SpringLimb
        limb={limb}
        transition={transition}
        className={className}
        opacity={opacity}
        gizmoClassName={gizmoClassName}
        gizmoOpacity={gizmoOpacity}
      />
    );
  }

  return (
    <ClassicLimb
      limb={limb}
      transition={transition}
      className={className}
      opacity={opacity}
      gizmoClassName={gizmoClassName}
      gizmoOpacity={gizmoOpacity}
    />
  );
}
