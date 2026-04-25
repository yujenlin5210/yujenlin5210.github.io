import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import StickmanWorkspaceShell from './StickmanWorkspaceShell';
import StickmanFigure from './stickman-system/StickmanFigure';
import {
  STICKMAN_CLIP_OPTIONS,
  STICKMAN_FACING_OPTIONS,
  STICKMAN_PROP_OPTIONS,
} from './stickman-system/config';
import { useStickmanController } from './stickman-system/useStickmanController';

function formatPercentage(value) {
  return `${Math.round(value * 100)}%`;
}

function formatTransitionMs(value) {
  return `${Math.round(value)}ms`;
}


function formatRangePercent(value) {
  return `${Math.round(value)}%`;
}

function OptionCardGroup({ title, value, options, onSelect, disabledIds = [] }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          {title}
        </p>
        <span className="rounded-full bg-white px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:bg-slate-950 dark:text-slate-500">
          {value}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const isActive = value === option.id;
          const isDisabled = disabledIds.includes(option.id);

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                if (!isDisabled) {
                  onSelect(option.id);
                }
              }}
              disabled={isDisabled}
              className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                isActive
                  ? 'border-indigo-500 bg-indigo-600 text-white'
                  : isDisabled
                    ? 'cursor-not-allowed border-slate-200/70 bg-slate-100/80 text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-600'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300'
              }`}
            >
              <span className="block font-mono text-[11px] uppercase tracking-[0.24em] opacity-70">
                {option.label}
              </span>
              <span className="mt-2 block text-xs font-medium leading-relaxed opacity-80">
                {option.description}
              </span>
              {'status' in option && option.status === 'planned' && (
                <span className="mt-3 inline-flex rounded-full border border-current/20 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">
                  Planned
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RangeField({ id, label, value, min, max, step, formatter, onChange }) {
  return (
    <label htmlFor={id} className="block">
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
        <output
          htmlFor={id}
          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          {formatter(value)}
        </output>
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

function InfoPill({ label, value, tone = 'default' }) {
  const toneClass =
    tone === 'active'
      ? 'border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-300'
      : tone === 'quiet'
        ? 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
        : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300';

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] opacity-70">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}

export default function StickmanRigLab({
  initialClipId = 'idle',
  initialFacingId = 'quarter',
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [clipId, setClipId] = useState(initialClipId);
  const [facingId, setFacingId] = useState(initialFacingId);
  const [propId, setPropId] = useState('none');
  const [tempo, setTempo] = useState(1);
  const [intensity, setIntensity] = useState(1);
  const [transitionSoftness, setTransitionSoftness] = useState(1);
  const [patrolMode, setPatrolMode] = useState(false);
  const [patrolFacingId, setPatrolFacingId] = useState('left');
  const [patrolX, setPatrolX] = useState(0);
  const [patrolRange, setPatrolRange] = useState(60);
  const [showGizmos, setShowGizmos] = useState(false);

  const activeFacing = STICKMAN_FACING_OPTIONS.find((option) => option.id === facingId) || STICKMAN_FACING_OPTIONS[1];
  const activeProp = STICKMAN_PROP_OPTIONS.find((option) => option.id === propId) || STICKMAN_PROP_OPTIONS[0];

  const patrolRef = useRef({ x: 0, facingId: 'left', lastTime: 0 });

  // Patrol mode: continuous walk with collision at boundaries
  // Speed synced to walk animation: ~2 steps/cycle × stepLength × cycleRate
  useEffect(() => {
    if (!patrolMode || prefersReducedMotion) {
      setPatrolX(0);
      return;
    }
    const speed = 30.6 * tempo; // viewBox units per second, synced to walk clip
    let rafId;
    patrolRef.current.lastTime = 0;
    const step = (timestamp) => {
      const state = patrolRef.current;
      if (state.lastTime === 0) { state.lastTime = timestamp; }
      const dt = Math.min((timestamp - state.lastTime) / 1000, 0.1);
      state.lastTime = timestamp;
      const dir = state.facingId === 'right' ? 1 : -1;
      state.x += dir * speed * dt;
      const halfRange = (patrolRange / 100) * 180;
      if (state.x >= halfRange) { state.x = halfRange; state.facingId = 'left'; setPatrolFacingId('left'); }
      if (state.x <= -halfRange) { state.x = -halfRange; state.facingId = 'right'; setPatrolFacingId('right'); }
      setPatrolX(state.x);
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [patrolMode, patrolRange, tempo, prefersReducedMotion]);

  const effectiveClipId = patrolMode ? 'walk' : clipId;
  const effectiveFacingId = patrolMode ? patrolFacingId : facingId;
  const effectiveFacing = STICKMAN_FACING_OPTIONS.find((o) => o.id === effectiveFacingId) || activeFacing;

  const {
    projected,
    currentDebug,
    previousDebug,
    transition,
    attachments,
    activeState,
  } = useStickmanController({
    clipId: effectiveClipId,
    facingId: effectiveFacingId,
    bodyYaw: effectiveFacing.yaw,
    propId,
    tempo,
    intensity,
    transitionSoftness,
    reducedMotion: prefersReducedMotion,
  });

  const previewPane = (
    <div className="relative h-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.4)] dark:border-slate-800 dark:bg-slate-950">
      <div
        className="absolute inset-0 opacity-80 dark:opacity-60"
        style={{
          backgroundImage: [
            'radial-gradient(circle at 18% 20%, rgba(99, 102, 241, 0.16), transparent 30%)',
            'radial-gradient(circle at 82% 18%, rgba(14, 165, 233, 0.12), transparent 26%)',
            'linear-gradient(rgba(148, 163, 184, 0.12) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(148, 163, 184, 0.12) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '100% 100%, 100% 100%, 30px 30px, 30px 30px',
        }}
      />

      <div className="relative flex h-full min-h-[420px] flex-col p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex rounded-full border border-indigo-200 bg-white/90 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-indigo-600 shadow-sm backdrop-blur dark:border-indigo-900/60 dark:bg-slate-950/80 dark:text-indigo-300">
              SVG 2.5D Rig Runtime
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              New canonical sandbox for the rebuilt stickman controller, projection rig, and attachment slots.
            </p>
          </div>

          <div className="space-y-2 text-right">
            <div className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
              {effectiveClipId.charAt(0).toUpperCase() + effectiveClipId.slice(1)}
            </div>
            <div className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
              {transition.isActive && previousDebug
                ? `${previousDebug.phaseLabel} -> ${currentDebug.phaseLabel}`
                : currentDebug.phaseLabel}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center py-8">
          <svg
            viewBox="0 0 360 260"
            className="w-full max-w-[40rem] overflow-visible"
            role="img"
            aria-labelledby="stickman-rig-runtime-title stickman-rig-runtime-desc"
          >
            <title id="stickman-rig-runtime-title">Stickman rig runtime sandbox</title>
            <desc id="stickman-rig-runtime-desc">
              A rebuilt 2.5D SVG stickman runtime with standing, idle, walking, prop slots, and smooth clip transitions.
            </desc>

            <line
              x1="48"
              y1={projected.guides.groundY}
              x2="312"
              y2={projected.guides.groundY}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="6 6"
              className="text-slate-300 dark:text-slate-700"
            />
            <line
              x1={projected.guides.centerX}
              y1="24"
              x2={projected.guides.centerX}
              y2={projected.guides.groundY}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 6"
              className="text-slate-200 dark:text-slate-800"
            />
            {/* Walkable boundary lines */}
            {patrolMode && (
              <>
                <line
                  x1={projected.guides.centerX - (patrolRange / 100) * 180}
                  y1="24"
                  x2={projected.guides.centerX - (patrolRange / 100) * 180}
                  y2={projected.guides.groundY}
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="3 5"
                  className="text-indigo-300 dark:text-indigo-700"
                />
                <line
                  x1={projected.guides.centerX + (patrolRange / 100) * 180}
                  y1="24"
                  x2={projected.guides.centerX + (patrolRange / 100) * 180}
                  y2={projected.guides.groundY}
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="3 5"
                  className="text-indigo-300 dark:text-indigo-700"
                />
              </>
            )}
            <text x="52" y={projected.guides.groundY - 10} className="fill-slate-400 text-[9px] font-mono uppercase tracking-[0.24em]">
              Ground
            </text>

            <g style={{ transform: `translateX(${patrolMode ? patrolX : 0}px)` }}>
              <StickmanFigure pose={projected} attachments={attachments} showGizmos={showGizmos} />
            </g>
          </svg>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
            {projected.headingLabel}
          </div>
          <div className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
            Facing {effectiveFacing.label}
          </div>
          <div className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
            Prop {activeProp.label}
          </div>
          <div className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
            {transition.isActive ? `Blend ${formatPercentage(transition.progress)}` : 'Stable'}
          </div>
        </div>
      </div>
    </div>
  );

  const controlsPane = (
    <>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <OptionCardGroup
          title="Animation clip"
          value={clipId}
          options={STICKMAN_CLIP_OPTIONS}
          onSelect={setClipId}
        />
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <OptionCardGroup
          title="Facing preset"
          value={effectiveFacingId}
          options={STICKMAN_FACING_OPTIONS}
          onSelect={(id) => { setPatrolMode(false); setFacingId(id); }}
        />
        <button
          type="button"
          onClick={() => setPatrolMode((v) => !v)}
          className={`mt-3 w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
            patrolMode
              ? 'border-indigo-500 bg-indigo-600 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300'
          }`}
        >
          <span className="block font-mono text-[11px] uppercase tracking-[0.24em] opacity-70">
            {patrolMode ? 'Patrol Active' : 'Patrol'}
          </span>
          <span className="mt-2 block text-xs font-medium leading-relaxed opacity-80">
            Auto-walk side to side with boundary collision.
          </span>
        </button>
        {patrolMode && (
          <div className="mt-3">
            <RangeField
              id="stickman-rig-patrol-range"
              label="Patrol range"
              value={patrolRange}
              min={20}
              max={100}
              step={5}
              formatter={formatRangePercent}
              onChange={setPatrolRange}
            />
          </div>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="space-y-5">
          <RangeField
            id="stickman-rig-tempo"
            label="Tempo"
            value={tempo}
            min={0.55}
            max={1.45}
            step={0.01}
            formatter={formatPercentage}
            onChange={setTempo}
          />
          <RangeField
            id="stickman-rig-intensity"
            label="Intensity"
            value={intensity}
            min={0.55}
            max={1.35}
            step={0.01}
            formatter={formatPercentage}
            onChange={setIntensity}
          />
          <RangeField
            id="stickman-rig-softness"
            label="Transition softness"
            value={transitionSoftness}
            min={0.7}
            max={1.35}
            step={0.01}
            formatter={formatPercentage}
            onChange={setTransitionSoftness}
          />
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <OptionCardGroup
          title="Prop set"
          value={propId}
          options={STICKMAN_PROP_OPTIONS}
          onSelect={setPropId}
        />
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Transition Debug
            </p>
            <h3 className="mt-2 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Runtime State
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowGizmos((current) => !current)}
            className={`rounded-full border px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] transition-colors ${
              showGizmos
                ? 'border-indigo-500 bg-indigo-600 text-white'
                : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300'
            }`}
          >
            {showGizmos ? 'Hide Gizmos' : 'Show Gizmos'}
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoPill label="Active clip" value={activeState.clipId} tone="active" />
          <InfoPill label="Facing" value={activeState.facingId} />
          <InfoPill label="Current note" value={currentDebug.note} />
          <InfoPill
            label="Blend duration"
            value={transition.duration > 0 ? formatTransitionMs(transition.duration) : '0ms'}
            tone="quiet"
          />
          <InfoPill
            label="Previous state"
            value={previousDebug ? previousDebug.phaseLabel : 'None'}
            tone="quiet"
          />
          <InfoPill
            label="Blend progress"
            value={transition.isActive ? formatPercentage(transition.progress) : 'Stable'}
            tone={transition.isActive ? 'active' : 'quiet'}
          />
        </div>
        {prefersReducedMotion && (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
            Reduced motion is enabled, so the sandbox is holding on static samples instead of running the live loops.
          </p>
        )}
      </section>
    </>
  );

  return <StickmanWorkspaceShell preview={previewPane} controls={controlsPane} />;
}
