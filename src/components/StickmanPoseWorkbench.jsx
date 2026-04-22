import { useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import {
  buildStickmanLabRig,
  DEFAULT_STICKMAN_LAB_POSE,
  normalizeYaw,
  STICKMAN_BODY_PROFILE_PRESETS,
  STICKMAN_FACING_PRESETS,
  STICKMAN_HEAD_PROFILE_PRESETS,
  STICKMAN_SHAPE_PRESETS,
} from './stickman-lab/rig';
import {
  StickmanBodyRenderer,
  StickmanHeadRenderer,
  StickmanLimbRenderer,
  STICKMAN_BODY_STYLE_OPTIONS,
  STICKMAN_HEAD_STYLE_OPTIONS,
  STICKMAN_LIMB_STYLE_OPTIONS,
} from './stickman-lab/renderers';

const CONTROLS = [
  { key: 'yaw', label: 'Body yaw', min: -180, max: 180, step: 1, unit: 'deg' },
  { key: 'headYaw', label: 'Head yaw', min: -90, max: 90, step: 1, unit: 'deg' },
  { key: 'headPitch', label: 'Head pitch', min: -35, max: 35, step: 1, unit: 'deg' },
  { key: 'headRoll', label: 'Head roll', min: -35, max: 35, step: 1, unit: 'deg' },
  { key: 'headSize', label: 'Head size', min: 80, max: 130, step: 1, unit: '%' },
  { key: 'bodySize', label: 'Body size', min: 80, max: 130, step: 1, unit: '%' },
  { key: 'headWidth', label: 'Head width', min: 28, max: 48, step: 1, unit: 'px' },
  { key: 'headHeight', label: 'Head height', min: 30, max: 50, step: 1, unit: 'px' },
  { key: 'torsoWidth', label: 'Torso width', min: 24, max: 46, step: 1, unit: 'px' },
  { key: 'torsoHeight', label: 'Torso height', min: 42, max: 72, step: 1, unit: 'px' },
  { key: 'armLength', label: 'Arm length', min: 56, max: 90, step: 1, unit: 'px' },
  { key: 'legLength', label: 'Leg length', min: 44, max: 104, step: 1, unit: 'px' },
  { key: 'torsoLean', label: 'Torso lean', min: -14, max: 14, step: 1, unit: 'px' },
  { key: 'armSpread', label: 'Arm spread', min: 10, max: 36, step: 1, unit: 'px' },
  { key: 'stanceWidth', label: 'Stance width', min: 10, max: 34, step: 1, unit: 'px' },
  { key: 'kneeSoftness', label: 'Knee softness', min: 0, max: 18, step: 1, unit: 'px' },
];

const CONTROL_KEYS = {
  body: ['yaw'],
  head: ['headYaw', 'headPitch', 'headRoll'],
  size: ['headSize', 'bodySize'],
  proportions: ['headWidth', 'headHeight', 'torsoWidth', 'torsoHeight', 'armLength', 'legLength'],
  pose: ['torsoLean', 'armSpread', 'stanceWidth', 'kneeSoftness'],
};

const CONTROL_SECTIONS = [
  {
    id: 'body',
    label: 'Body',
    title: 'Body Orientation',
    description: 'Use quick headings or fine-tune body yaw for the overall facing.',
    badge: '360 ready',
  },
  {
    id: 'head',
    label: 'Head',
    title: 'Head Rotation',
    description: 'Yaw turns the face, pitch looks up or down, and roll tilts in screen space.',
  },
  {
    id: 'pose',
    label: 'Shape',
    title: 'Body Shape',
    description: 'Tune the silhouette once the body and head orientation feel right.',
  },
];

const SHAPE_PANELS = [
  {
    id: 'silhouette',
    label: 'Silhouette',
    description: 'Swap the overall profile language before touching detailed dimensions.',
  },
  {
    id: 'size',
    label: 'Size',
    description: 'Use master size sliders for head and torso massing.',
  },
  {
    id: 'proportions',
    label: 'Proportions',
    description: 'Fine-tune the specific head, torso, arm, and leg dimensions.',
  },
  {
    id: 'stance',
    label: 'Stance',
    description: 'Adjust posture and spacing without changing the base silhouette family.',
  },
];

const SILHOUETTE_PANELS = [
  {
    id: 'styles',
    label: 'Styles',
    description: 'Swap the head, body, and limb visual families.',
  },
  {
    id: 'profiles',
    label: 'Profiles',
    description: 'Tune how the head and torso compress through turns.',
  },
  {
    id: 'presets',
    label: 'Presets',
    description: 'Load saved silhouette bundles before fine-tuning.',
  },
];

const LIMB_ARC_OPTIONS = [
  { id: 'down', label: 'Down' },
  { id: 'up', label: 'Up' },
];

const SVG_TRANSITION = {
  type: 'spring',
  stiffness: 220,
  damping: 22,
  mass: 0.6,
};

const LIMB_TRANSITION = {
  type: 'tween',
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1],
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

function StyleChoiceGroup({ title, value, options, onSelect }) {
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
            </button>
          );
        })}
      </div>
    </div>
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

function getEndpointGizmoStyle(type, depth) {
  const baseOpacity = depth < -6 ? 0.42 : depth > 6 ? 0.9 : 0.7;

  return {
    className:
      type === 'arm'
        ? 'text-cyan-500 dark:text-cyan-300'
        : 'text-amber-500 dark:text-amber-300',
    opacity: baseOpacity,
  };
}

function getControl(key) {
  return CONTROLS.find((control) => control.key === key);
}

export default function StickmanPoseWorkbench() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [pose, setPose] = useState(DEFAULT_STICKMAN_LAB_POSE);
  const [activeSection, setActiveSection] = useState('body');
  const [activeShapePanel, setActiveShapePanel] = useState('silhouette');
  const [activeSilhouettePanel, setActiveSilhouettePanel] = useState('styles');
  const [showPreset, setShowPreset] = useState(false);
  const [activeShapePreset, setActiveShapePreset] = useState('baseline');

  const setPoseValue = (key, value) => {
    if (
      CONTROL_KEYS.size.includes(key) ||
      CONTROL_KEYS.proportions.includes(key) ||
      CONTROL_KEYS.pose.includes(key) ||
      key === 'headStyle' ||
      key === 'bodyStyle' ||
      key === 'limbStyle' ||
      key === 'headProfilePreset' ||
      key === 'bodyProfilePreset' ||
      key === 'limbArcDirection'
    ) {
      setActiveShapePreset('custom');
    }

    setPose((currentPose) => ({ ...currentPose, [key]: value }));
  };

  const applyShapePreset = (preset) => {
    setPose((currentPose) => ({ ...currentPose, ...preset.values }));
    setActiveShapePreset(preset.id);
  };

  const applyHeadProfilePreset = (preset) => {
    setActiveShapePreset('custom');
    setPose((currentPose) => ({ ...currentPose, headProfilePreset: preset.id }));
  };

  const applyBodyProfilePreset = (preset) => {
    setActiveShapePreset('custom');
    setPose((currentPose) => ({ ...currentPose, bodyProfilePreset: preset.id }));
  };

  const rig = buildStickmanLabRig(pose);
  const activeSectionConfig = CONTROL_SECTIONS.find((section) => section.id === activeSection);
  const motionTransition = prefersReducedMotion ? { duration: 0 } : SVG_TRANSITION;
  const limbTransition = prefersReducedMotion ? { duration: 0 } : LIMB_TRANSITION;

  return (
    <div className="my-10 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.4)] dark:border-slate-800 dark:bg-slate-950">
      <div className="grid lg:min-h-[720px] xl:grid-cols-[minmax(0,1.22fr)_minmax(440px,1fr)] lg:grid-cols-[minmax(0,1.1fr)_minmax(390px,1fr)]">
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

          <div className="relative flex min-h-[420px] items-center justify-center p-6 sm:p-10 lg:min-h-[720px]">
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
                const gizmo = getEndpointGizmoStyle(limb.type, limb.depth);

                return (
                  <StickmanLimbRenderer
                    key={limb.id}
                    styleId={pose.limbStyle}
                    limb={limb}
                    transition={limbTransition}
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
                transition={motionTransition}
              />

              <StickmanHeadRenderer
                styleId={pose.headStyle}
                head={rig.head}
                transition={motionTransition}
              />

              {rig.limbs.front.map((limb) => {
                const style = getLimbStyle(limb.depth);
                const gizmo = getEndpointGizmoStyle(limb.type, limb.depth);

                return (
                  <StickmanLimbRenderer
                    key={limb.id}
                    styleId={pose.limbStyle}
                    limb={limb}
                    transition={limbTransition}
                    className={style.className}
                    opacity={style.opacity}
                    gizmoClassName={gizmo.className}
                    gizmoOpacity={gizmo.opacity}
                  />
                );
              })}
            </svg>
          </div>
        </div>

        <div className="p-6 sm:p-8 xl:p-10">
          <div className="mb-6">
            <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-indigo-600 dark:text-indigo-300">
              Rig Editor
            </p>
            <h3 className="mb-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Standing 2.5D stickman playground
            </h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              This lab rig is isolated from the projects page. It now uses a reusable yaw-driven model so we can
              test front, back, left, right, and in-between rotations before porting any of it into production.
            </p>
          </div>

          <div className="mb-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="grid grid-cols-3 gap-2">
              {CONTROL_SECTIONS.map((section) => {
                const isActive = activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:text-indigo-600 dark:bg-slate-950 dark:text-slate-300 dark:hover:text-indigo-300'
                    }`}
                  >
                    <span className="block font-mono text-[11px] uppercase tracking-[0.24em] opacity-70">
                      {section.label}
                    </span>
                    <span className="mt-1 block">{section.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  {activeSectionConfig.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {activeSectionConfig.description}
                </p>
              </div>
              {activeSectionConfig.badge && (
                <span className="rounded-full bg-white px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:bg-slate-950 dark:text-slate-500">
                  {activeSectionConfig.badge}
                </span>
              )}
            </div>

            {activeSection === 'body' && (
              <div className="space-y-5">
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
                {CONTROL_KEYS.body.map((key) => {
                  const control = getControl(key);

                  return (
                    <RangeField
                      key={control.key}
                      control={control}
                      value={pose[control.key]}
                      onChange={setPoseValue}
                    />
                  );
                })}
              </div>
            )}

            {activeSection === 'head' && (
              <div className="space-y-5">
                {CONTROL_KEYS.head.map((key) => {
                  const control = getControl(key);

                  return (
                    <RangeField
                      key={control.key}
                      control={control}
                      value={pose[control.key]}
                      onChange={setPoseValue}
                    />
                  );
                })}
              </div>
            )}

            {activeSection === 'pose' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                  <div className="grid grid-cols-2 gap-2">
                    {SHAPE_PANELS.map((panel) => {
                      const isActive = activeShapePanel === panel.id;

                      return (
                        <button
                          key={panel.id}
                          type="button"
                          onClick={() => setActiveShapePanel(panel.id)}
                          className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-50 text-slate-600 hover:text-indigo-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-indigo-300'
                          }`}
                        >
                          <span className="block font-mono text-[11px] uppercase tracking-[0.24em] opacity-70">
                            {panel.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 px-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {SHAPE_PANELS.find((panel) => panel.id === activeShapePanel)?.description}
                  </p>
                </div>

                {activeShapePanel === 'silhouette' && (
                  <>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                      <div className="grid grid-cols-3 gap-2">
                        {SILHOUETTE_PANELS.map((panel) => {
                          const isActive = activeSilhouettePanel === panel.id;

                          return (
                            <button
                              key={panel.id}
                              type="button"
                              onClick={() => setActiveSilhouettePanel(panel.id)}
                              className={`rounded-2xl px-3 py-3 text-left text-sm font-semibold transition-colors ${
                                isActive
                                  ? 'bg-indigo-600 text-white shadow-sm'
                                  : 'bg-slate-50 text-slate-600 hover:text-indigo-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-indigo-300'
                              }`}
                            >
                              <span className="block font-mono text-[11px] uppercase tracking-[0.24em] opacity-70">
                                {panel.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-3 px-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {SILHOUETTE_PANELS.find((panel) => panel.id === activeSilhouettePanel)?.description}
                      </p>
                    </div>

                    {activeSilhouettePanel === 'styles' && (
                      <>
                        <StyleChoiceGroup
                          title="Head style"
                          value={pose.headStyle}
                          options={STICKMAN_HEAD_STYLE_OPTIONS}
                          onSelect={(value) => setPoseValue('headStyle', value)}
                        />

                        <StyleChoiceGroup
                          title="Body style"
                          value={pose.bodyStyle}
                          options={STICKMAN_BODY_STYLE_OPTIONS}
                          onSelect={(value) => setPoseValue('bodyStyle', value)}
                        />

                        <StyleChoiceGroup
                          title="Limb style"
                          value={pose.limbStyle}
                          options={STICKMAN_LIMB_STYLE_OPTIONS}
                          onSelect={(value) => setPoseValue('limbStyle', value)}
                        />
                      </>
                    )}

                    {activeSilhouettePanel === 'profiles' && (
                      <>
                        <div>
                          <div className="mb-3 flex items-center justify-between gap-4">
                            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                              Body profile
                            </p>
                            <span className="rounded-full bg-white px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:bg-slate-950 dark:text-slate-500">
                              {pose.bodyProfilePreset}
                            </span>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-3">
                            {STICKMAN_BODY_PROFILE_PRESETS.map((preset) => {
                              const isActive = pose.bodyProfilePreset === preset.id;

                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => applyBodyProfilePreset(preset)}
                                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                                    isActive
                                      ? 'border-indigo-500 bg-indigo-600 text-white'
                                      : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300'
                                  }`}
                                >
                                  <span className="block font-mono text-[11px] uppercase tracking-[0.24em] opacity-70">
                                    {preset.label}
                                  </span>
                                  <span className="mt-2 block text-xs font-medium leading-relaxed opacity-80">
                                    {preset.description}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <div className="mb-3 flex items-center justify-between gap-4">
                            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                              Head profile
                            </p>
                            <span className="rounded-full bg-white px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:bg-slate-950 dark:text-slate-500">
                              {pose.headProfilePreset}
                            </span>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-3">
                            {STICKMAN_HEAD_PROFILE_PRESETS.map((preset) => {
                              const isActive = pose.headProfilePreset === preset.id;

                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => applyHeadProfilePreset(preset)}
                                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                                    isActive
                                      ? 'border-indigo-500 bg-indigo-600 text-white'
                                      : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300'
                                  }`}
                                >
                                  <span className="block font-mono text-[11px] uppercase tracking-[0.24em] opacity-70">
                                    {preset.label}
                                  </span>
                                  <span className="mt-2 block text-xs font-medium leading-relaxed opacity-80">
                                    {preset.description}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}

                    {activeSilhouettePanel === 'presets' && (
                      <div>
                        <div className="mb-3 flex items-center justify-between gap-4">
                          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                            Shape presets
                          </p>
                          <span className="rounded-full bg-white px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:bg-slate-950 dark:text-slate-500">
                            {activeShapePreset === 'custom' ? 'custom' : activeShapePreset}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {STICKMAN_SHAPE_PRESETS.map((preset) => {
                            const isActive = activeShapePreset === preset.id;

                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => applyShapePreset(preset)}
                                className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                                  isActive
                                    ? 'border-indigo-500 bg-indigo-600 text-white'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300'
                                }`}
                              >
                                <span className="block font-mono text-[11px] uppercase tracking-[0.24em] opacity-70">
                                  {preset.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {activeShapePanel === 'size' && (
                  <div>
                    <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                      Size
                    </p>
                    <div className="grid gap-5 xl:grid-cols-2">
                      {CONTROL_KEYS.size.map((key) => {
                        const control = getControl(key);

                        return (
                          <RangeField
                            key={control.key}
                            control={control}
                            value={pose[control.key]}
                            onChange={setPoseValue}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeShapePanel === 'proportions' && (
                  <div>
                    <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                      Proportions
                    </p>
                    <div className="grid gap-5 xl:grid-cols-2">
                      {CONTROL_KEYS.proportions.map((key) => {
                        const control = getControl(key);

                        return (
                          <RangeField
                            key={control.key}
                            control={control}
                            value={pose[control.key]}
                            onChange={setPoseValue}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeShapePanel === 'stance' && (
                  <div>
                    <div className="mb-5">
                      <div className="mb-3 flex items-center justify-between gap-4">
                        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                          Limb arc
                        </p>
                        <span className="rounded-full bg-white px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:bg-slate-950 dark:text-slate-500">
                          {pose.limbArcDirection}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {LIMB_ARC_OPTIONS.map((option) => {
                          const isActive = pose.limbArcDirection === option.id;

                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setPoseValue('limbArcDirection', option.id)}
                              className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                                isActive
                                  ? 'border-indigo-500 bg-indigo-600 text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300'
                              }`}
                            >
                              <span className="block font-mono text-[11px] uppercase tracking-[0.24em] opacity-70">
                                {option.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                      Stance
                    </p>
                    <div className="grid gap-5 xl:grid-cols-2">
                      {CONTROL_KEYS.pose.map((key) => {
                        const control = getControl(key);

                        return (
                          <RangeField
                            key={control.key}
                            control={control}
                            value={pose[control.key]}
                            onChange={setPoseValue}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  Utilities
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  Reset the rig or open the portable preset snapshot only when you need it.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPose(DEFAULT_STICKMAN_LAB_POSE);
                    setActiveShapePreset('baseline');
                  }}
                  className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300"
                >
                  Reset to baseline
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreset((current) => !current)}
                  className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    showPreset
                      ? 'border-indigo-500 bg-indigo-600 text-white'
                      : 'border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300'
                  }`}
                >
                  {showPreset ? 'Hide preset' : 'Show preset'}
                </button>
              </div>
            </div>

            {showPreset && (
              <div className="mt-5">
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
  "headYaw": ${pose.headYaw},
  "headPitch": ${pose.headPitch},
  "headRoll": ${pose.headRoll},
  "headStyle": "${pose.headStyle}",
  "bodyStyle": "${pose.bodyStyle}",
  "limbStyle": "${pose.limbStyle}",
  "headProfilePreset": "${pose.headProfilePreset}",
  "bodyProfilePreset": "${pose.bodyProfilePreset}",
  "headSize": ${pose.headSize},
  "bodySize": ${pose.bodySize},
  "headWidth": ${pose.headWidth},
  "headHeight": ${pose.headHeight},
  "torsoWidth": ${pose.torsoWidth},
  "torsoHeight": ${pose.torsoHeight},
  "armLength": ${pose.armLength},
  "legLength": ${pose.legLength},
  "torsoLean": ${pose.torsoLean},
  "armSpread": ${pose.armSpread},
  "stanceWidth": ${pose.stanceWidth},
  "kneeSoftness": ${pose.kneeSoftness},
  "limbArcDirection": "${pose.limbArcDirection}"
}`}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
