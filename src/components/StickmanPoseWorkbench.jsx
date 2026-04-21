import { useState } from 'react';
import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import {
  buildStickmanLabRig,
  DEFAULT_STICKMAN_LAB_POSE,
  normalizeYaw,
  STICKMAN_FACING_PRESETS,
} from './stickman-lab/rig';

const CONTROLS = [
  { key: 'yaw', label: 'Yaw', min: -180, max: 180, step: 1, unit: 'deg' },
  { key: 'headTilt', label: 'Head tilt', min: -18, max: 18, step: 1, unit: 'deg' },
  { key: 'torsoLean', label: 'Torso lean', min: -14, max: 14, step: 1, unit: 'px' },
  { key: 'armSpread', label: 'Arm spread', min: 10, max: 36, step: 1, unit: 'px' },
  { key: 'stanceWidth', label: 'Stance width', min: 10, max: 34, step: 1, unit: 'px' },
  { key: 'kneeSoftness', label: 'Knee softness', min: 0, max: 18, step: 1, unit: 'px' },
];

const SVG_TRANSITION = {
  type: 'spring',
  stiffness: 220,
  damping: 22,
  mass: 0.6,
};

function formatValue(value, unit) {
  if (value > 0 && unit === 'deg') {
    return `+${value}${unit}`;
  }

  if (value > 0 && unit === 'px') {
    return `+${value}${unit}`;
  }

  return `${value}${unit}`;
}

function RangeField({ control, value, onChange }) {
  const inputId = `stickman-pose-${control.key}`;

  return (
    <label htmlFor={inputId} className="block">
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{control.label}</span>
        <output
          htmlFor={inputId}
          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          {formatValue(value, control.unit)}
        </output>
      </div>
      <input
        id={inputId}
        type="range"
        min={control.min}
        max={control.max}
        step={control.step}
        value={value}
        onChange={(event) => onChange(control.key, Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-500 dark:bg-slate-800"
      />
    </label>
  );
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

export default function StickmanPoseWorkbench() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [pose, setPose] = useState(DEFAULT_STICKMAN_LAB_POSE);

  const setPoseValue = (key, value) => {
    setPose((currentPose) => ({ ...currentPose, [key]: value }));
  };

  const rig = buildStickmanLabRig(pose);
  const motionTransition = prefersReducedMotion ? { duration: 0 } : SVG_TRANSITION;

  return (
    <div className="my-10 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.4)] dark:border-slate-800 dark:bg-slate-950">
      <div className="grid lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
        <div className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800 lg:border-b-0 lg:border-r">
          <div
            className="absolute inset-0 opacity-80 dark:opacity-60"
            style={{
              backgroundImage: [
                'radial-gradient(circle at top left, rgba(99, 102, 241, 0.12), transparent 35%)',
                'linear-gradient(rgba(148, 163, 184, 0.14) 1px, transparent 1px)',
                'linear-gradient(90deg, rgba(148, 163, 184, 0.14) 1px, transparent 1px)',
              ].join(', '),
              backgroundSize: '100% 100%, 32px 32px, 32px 32px',
            }}
          />

          <div className="relative flex min-h-[420px] items-center justify-center p-6 sm:p-10">
            <div className="absolute left-6 top-6 rounded-full border border-indigo-200 bg-white/90 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-indigo-600 shadow-sm backdrop-blur dark:border-indigo-900/60 dark:bg-slate-950/80 dark:text-indigo-300">
              2.5D Standing Rig
            </div>
            <div className="absolute bottom-6 left-6 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
              {rig.headingLabel}
            </div>
            <div className="absolute bottom-6 right-6 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
              Yaw {formatValue(rig.yaw, 'deg')}
            </div>

            <svg
              viewBox="0 0 300 240"
              className="w-full max-w-[34rem] overflow-visible"
              role="img"
              aria-labelledby="stickman-pose-lab-title stickman-pose-lab-desc"
            >
              <title id="stickman-pose-lab-title">2.5D standing stickman workbench</title>
              <desc id="stickman-pose-lab-desc">
                A lab-only standing stickman with continuous yaw and cardinal facing presets, built as a 2.5D
                rig for front, back, left, right, and in-between turns.
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

              {rig.limbs.rear.map((limb) => {
                const style = getLimbStyle(limb.depth);

                return (
                  <g key={limb.id}>
                    <motion.path
                      initial={false}
                      animate={{ d: limb.path }}
                      transition={motionTransition}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={limb.type === 'arm' ? 4 : 4.5}
                      strokeLinecap="round"
                      className={style.className}
                      opacity={style.opacity}
                    />
                    <motion.circle
                      initial={false}
                      animate={{
                        cx: limb.end.x,
                        cy: limb.end.y,
                        r: limb.type === 'arm' ? 3.5 : 4,
                      }}
                      transition={motionTransition}
                      fill="currentColor"
                      className={style.className}
                      opacity={style.opacity}
                    />
                  </g>
                );
              })}

              <motion.rect
                initial={false}
                animate={{
                  x: rig.body.x,
                  y: rig.body.y,
                  width: rig.body.width,
                  height: rig.body.height,
                  rx: rig.body.radius,
                }}
                transition={motionTransition}
                fill="white"
                stroke="currentColor"
                strokeWidth="3"
                className="fill-white text-slate-800 dark:fill-slate-950 dark:text-slate-100"
              />

              <motion.g
                initial={false}
                animate={{
                  x: rig.head.x,
                  y: rig.head.y,
                  rotate: pose.headTilt,
                }}
                transition={motionTransition}
                style={{ transformBox: 'fill-box', transformOrigin: 'center center' }}
              >
                <motion.ellipse
                  initial={false}
                  animate={{ rx: rig.head.rx, ry: rig.head.ry }}
                  transition={motionTransition}
                  cx="0"
                  cy="0"
                  fill="white"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="fill-white text-slate-800 dark:fill-slate-950 dark:text-slate-100"
                />
                {rig.head.eyes.map((eye) => (
                  <motion.circle
                    key={eye.id}
                    initial={false}
                    animate={{
                      cx: eye.x,
                      cy: eye.y,
                      r: eye.radius,
                      opacity: eye.opacity,
                    }}
                    transition={motionTransition}
                    className="fill-slate-800 dark:fill-slate-100"
                  />
                ))}
              </motion.g>

              {rig.limbs.front.map((limb) => {
                const style = getLimbStyle(limb.depth);

                return (
                  <g key={limb.id}>
                    <motion.path
                      initial={false}
                      animate={{ d: limb.path }}
                      transition={motionTransition}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={limb.type === 'arm' ? 4 : 4.5}
                      strokeLinecap="round"
                      className={style.className}
                      opacity={style.opacity}
                    />
                    <motion.circle
                      initial={false}
                      animate={{
                        cx: limb.end.x,
                        cy: limb.end.y,
                        r: limb.type === 'arm' ? 3.5 : 4,
                      }}
                      transition={motionTransition}
                      fill="currentColor"
                      className={style.className}
                      opacity={style.opacity}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="mb-8">
            <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-indigo-600 dark:text-indigo-300">
              Pose Controls
            </p>
            <h3 className="mb-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Standing 2.5D stickman playground
            </h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              This lab rig is isolated from the projects page. It now uses a reusable yaw-driven model so we can
              test front, back, left, right, and in-between rotations before porting any of it into production.
            </p>
          </div>

          <div className="mb-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Facing presets
              </p>
              <span className="rounded-full bg-white px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:bg-slate-950 dark:text-slate-500">
                360 ready
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {STICKMAN_FACING_PRESETS.map((preset) => {
                const isActive = normalizeYaw(pose.yaw) === preset.yaw;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setPoseValue('yaw', preset.yaw)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300'
                    }`}
                  >
                    <span className="block font-mono text-[11px] uppercase tracking-[0.24em] opacity-70">
                      {preset.label}
                    </span>
                    <span className="mt-1 block">{formatValue(preset.yaw, 'deg')}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-5">
            {CONTROLS.map((control) => (
              <RangeField
                key={control.key}
                control={control}
                value={pose[control.key]}
                onChange={setPoseValue}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPose(DEFAULT_STICKMAN_LAB_POSE)}
            className="mt-6 inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300"
          >
            Reset to baseline
          </button>

          <div className="mt-8 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Portable preset
              </p>
              <span className="rounded-full bg-white px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:bg-slate-950 dark:text-slate-500">
                local only
              </span>
            </div>
            <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-200">
{`{
  "yaw": ${pose.yaw},
  "heading": "${rig.headingLabel}",
  "headTilt": ${pose.headTilt},
  "torsoLean": ${pose.torsoLean},
  "armSpread": ${pose.armSpread},
  "stanceWidth": ${pose.stanceWidth},
  "kneeSoftness": ${pose.kneeSoftness}
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
