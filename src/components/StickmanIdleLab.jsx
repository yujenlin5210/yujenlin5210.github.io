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
];

const FACING_OPTIONS = [
  {
    id: 'quarter',
    label: 'Quarter',
    description: 'The current preferred 2.5D baseline.',
    yaw: 40,
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

function formatSignedValue(value, unit) {
  const roundedValue = Number(value.toFixed(1));
  const prefix = roundedValue > 0 ? '+' : '';
  return `${prefix}${roundedValue}${unit}`;
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

function formatUnsignedValue(value, unit) {
  return `${Number(value.toFixed(1))}${unit}`;
}

function buildAnimatedPose({ baseYaw, loopId, speed, intensity, timeline }) {
  const gain = intensity / 100;
  const t = timeline * speed;
  const pose = {
    ...BASE_IDLE_POSE,
    yaw: baseYaw,
  };

  if (loopId === 'buoyant') {
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
    metrics: {
      bodyYaw: pose.yaw,
      headOffset: pose.headYaw,
      chestLift: pose.torsoHeight - BASE_IDLE_POSE.torsoHeight,
      kneeSoftness: pose.kneeSoftness,
    },
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

function ChoiceGrid({ title, description, options, activeId, columns = 2, onSelect, renderMeta }) {
  return (
    <section>
      <div className="mb-3">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          {title}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
      </div>
      <div className={`grid gap-3 ${columns === 1 ? 'grid-cols-1' : columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {options.map((option) => {
          const isActive = activeId === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                isActive
                  ? 'border-indigo-500 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300'
              }`}
            >
              <span className="block font-mono text-[11px] uppercase tracking-[0.24em] opacity-70">
                {option.label}
              </span>
              <span className="mt-2 block text-xs font-medium leading-relaxed opacity-80">
                {option.description}
              </span>
              {renderMeta ? (
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

export default function StickmanIdleLab() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [loopId, setLoopId] = useState('calm');
  const [facingId, setFacingId] = useState('quarter');
  const [speed, setSpeed] = useState(1);
  const [intensity, setIntensity] = useState(100);
  const [showGizmos, setShowGizmos] = useState(false);
  const [paused, setPaused] = useState(false);
  const [timeline, setTimeline] = useState(0);
  const timelineRef = useRef(0);
  const facing = FACING_OPTIONS.find((option) => option.id === facingId) || FACING_OPTIONS[0];
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
    baseYaw: facing.yaw,
    loopId,
    speed,
    intensity,
    timeline,
  });
  const rig = buildStickmanLabRig(animated.pose);
  const activeLoop = LOOP_OPTIONS.find((option) => option.id === loopId) || LOOP_OPTIONS[0];
  const showScrubber = prefersReducedMotion || paused;

  return (
    <div className="my-10 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.4)] dark:border-slate-800 dark:bg-slate-950">
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
              Idle Loop Study
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
              aria-labelledby="stickman-idle-lab-title stickman-idle-lab-desc"
            >
              <title id="stickman-idle-lab-title">Stickman idle animation lab</title>
              <desc id="stickman-idle-lab-desc">
                A separate animation lab that reuses the standing 2.5D stickman rig to test subtle idle loops.
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

              <g>
                {rig.limbs.rear.map((limb) => {
                  const style = getLimbStyle(limb.depth);
                  const gizmo = getEndpointGizmoStyle(limb.type, limb.depth, showGizmos);

                  return (
                    <StickmanLimbRenderer
                      key={limb.id}
                      styleId={animated.pose.limbStyle}
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
                  styleId={animated.pose.bodyStyle}
                  body={rig.body}
                  transition={RENDER_TRANSITION}
                />

                <StickmanHeadRenderer
                  styleId={animated.pose.headStyle}
                  head={rig.head}
                  transition={RENDER_TRANSITION}
                />

                {rig.limbs.front.map((limb) => {
                  const style = getLimbStyle(limb.depth);
                  const gizmo = getEndpointGizmoStyle(limb.type, limb.depth, showGizmos);

                  return (
                    <StickmanLimbRenderer
                      key={limb.id}
                      styleId={animated.pose.limbStyle}
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
            </svg>
          </div>
        </div>

        <div className="p-6 sm:p-8 xl:p-10">
          <div className="mb-6">
            <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-indigo-600 dark:text-indigo-300">
              Separate Animation Branch
            </p>
            <h3 className="mb-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Minimal standing motion before walk cycles
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
              .
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
              description="Start with small idle behaviors before trying transitions or actions."
              options={LOOP_OPTIONS}
              activeId={loopId}
              onSelect={setLoopId}
            />

            <ChoiceGrid
              title="Facing Check"
              description="Keep checking the same loop across front, quarter, profile, and back views."
              options={FACING_OPTIONS}
              activeId={facingId}
              columns={2}
              onSelect={setFacingId}
              renderMeta={(option) => `${option.yaw}deg`}
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
                <div>
                  <p className="text-slate-400 dark:text-slate-500">Body yaw</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                    {formatSignedValue(animated.metrics.bodyYaw, 'deg')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 dark:text-slate-500">Head offset</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                    {formatSignedValue(animated.metrics.headOffset, 'deg')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 dark:text-slate-500">Chest lift</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                    {formatSignedValue(animated.metrics.chestLift, 'px')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 dark:text-slate-500">Knee softness</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                    {formatUnsignedValue(animated.metrics.kneeSoftness, 'px')}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Current Scope
              </p>
              <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                The animation layer is still deliberately small: idle only, no walking, no props, and no production action
                registry wiring yet. The goal is to make this standing loop read cleanly before the next step.
              </p>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                Renderer baseline: classic only
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
