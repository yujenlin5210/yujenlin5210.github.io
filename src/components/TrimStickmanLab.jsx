import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import TrimStage from './trim-stickman/TrimStage';
import { HEADSETS, HEADSET_IDS, SCENES, SCENE_IDS, STYLES, STYLE_IDS } from './trim-stickman/engine';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const SECTIONS = [
  {
    scene: 'walk',
    kicker: '01 · Walk',
    title: 'Everything is a stroke',
    body: [
      'The figure is a tiny 3D skeleton: pelvis, chest, head, and two-bone arms and legs. Each frame the pose is solved in 3D, then projected to 2D through a slightly raised camera.',
      'Nothing is a hand-drawn path. The torso is a capsule, and a projected capsule is just a fat line with round caps. The head is a sphere, and a projected sphere is always a circle. Limbs are one quadratic curve through shoulder, elbow, and hand.',
    ],
  },
  {
    scene: 'wave',
    kicker: '02 · Wave',
    title: 'Turning is rotation, not flipping',
    body: [
      'At the edge of the screen the figure turns for real: yaw keeps decreasing, so it turns through the front at one edge and through the back at the other. That is why it walks a small oval, and why the far lane looks slightly smaller.',
      'Eyes are points on the head sphere. They slide around as the head turns and hide on the back hemisphere, so there is never a front/side/back sprite swap.',
    ],
  },
  {
    scene: 'vr',
    kicker: '03 · VR headset',
    title: 'Props draw themselves on',
    body: [
      'Every path uses pathLength="1" plus a dash array, which makes it a Trim Paths control: [start, end] from 0 to 1. Props trim on when a section starts and erase themselves when it ends, while the pose crossfades underneath.',
      'The headset is a solid shape parented to the head and depth-sorted with it, so it wraps around the face as the head turns. Pick a different headset below and the old one erases while the new one draws on.',
    ],
  },
  {
    scene: 'kart',
    kicker: '04 · Kart',
    title: 'Same rig, different stage',
    body: [
      'The kart is boxes and rings in the figure’s local space. The wheels are 3D circles: in profile they are circles, and they flatten to ellipses as the kart turns. Spokes show the spin.',
      'Speed lines are the purest form of the idea: three straight strokes whose trim window loops.',
    ],
  },
  {
    scene: 'dog',
    kicker: '05 · Dog walk',
    title: 'And it scales to new characters',
    body: [
      'The dog uses the same pieces: a capsule body, a circle head, and four two-bone legs on a trot cycle. The leash is one trimmed curve from hand to collar.',
      'Adding an action is a pose function plus an optional prop builder, with no new path art.',
    ],
  },
  {
    scene: 'encounters',
    kicker: '06 · First Encounters',
    title: 'Aiming is just solving for a direction',
    body: [
      'The Boba 3 demo game: fluffy puffians pop up around the player, who turns, aims, and fires. The aiming arm is solved straight at the target in 3D, the torso and head twist toward it, and the pose blends to the next target before it is shot.',
      'The laser is a trim window sliding along one line, and the bubble that wraps a hit puffian is a circle drawing itself on, then drifting up and away. The whole game loop is a pure function of time.',
    ],
  },
  {
    scene: 'tiramisu',
    kicker: '07 · Tiramisu',
    title: 'Stepping into the world',
    body: [
      'Tiramisu is too thick and heavy for a strap, so you hold it to your face with both hands. The figure does exactly that: a small reach solver puts its hands on the box, and its elbows sag a little under the weight.',
      'What people remember is the world inside: Epic’s Electric Dreams gorge, with layered rock cliffs, vines, ferns, and a stony creek bed, and how blindingly bright it was. The gorge grows around the figure in the same line style, and the sun is HDR glare: a bloom that washes out the lines around it.',
    ],
  },
];

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
      <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function Inspector({ styleId, onStyle, headsetId, onHeadset }) {
  const [scene, setScene] = useState('walk');
  const [manual, setManual] = useState(false);
  const [yaw, setYaw] = useState(30);
  const [roam, setRoam] = useState(false);
  const [rig, setRig] = useState(false);
  const [slow, setSlow] = useState(false);
  const [tilt, setTilt] = useState(11);
  const [readout, setReadout] = useState({ yaw: 0 });
  const simRef = useRef(null);
  const lastReadout = useRef(0);

  const onFrame = (debug) => {
    const now = performance.now();
    if (now - lastReadout.current > 120) {
      lastReadout.current = now;
      setReadout(debug);
    }
  };

  const shownYaw = ((Math.round(readout.yaw) % 360) + 540) % 360 - 180;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-xl shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none sm:p-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle, rgb(148 163 184 / 0.6) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        <TrimStage
          className="h-[340px] sm:h-[420px]"
          scene={scene}
          styleId={styleId}
          headsetId={headsetId}
          scale={2.4}
          groundRatio={0.84}
          roam={roam && !manual}
          manualYaw={manual ? yaw : null}
          timeScale={slow ? 0.25 : 1}
          showRig={rig}
          tilt={tilt}
          simRef={simRef}
          onFrame={onFrame}
          ariaLabel="Inspector view of the trim-path stickman"
        />
        <div className="pointer-events-none absolute left-4 top-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          yaw {shownYaw}° · {SCENES[scene].label} · {STYLES[styleId].label}
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Character style</p>
        <div className="flex flex-wrap gap-2">
          {STYLE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                onStyle(id);
                simRef.current?.redraw();
              }}
              className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                styleId === id
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
              }`}
            >
              <span className="block text-xs font-bold">{STYLES[id].label}</span>
              <span className="block max-w-[14rem] text-[11px] leading-snug opacity-70">{STYLES[id].note}</span>
            </button>
          ))}
        </div>
        <p className="mb-2 mt-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Scene</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {SCENE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setScene(id)}
            className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition-colors ${
              scene === id
                ? 'border-indigo-500 bg-indigo-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
            }`}
          >
            {SCENES[id].label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => simRef.current?.redraw()}
          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300"
        >
          ↻ Redraw
        </button>
      </div>

      <p className="mb-2 mt-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">VR headset</p>
      <div className="flex flex-wrap gap-2">
        {HEADSET_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              onHeadset(id);
              setScene('vr');
            }}
            title={HEADSETS[id].note}
            className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition-colors ${
              headsetId === id
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200'
                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
            }`}
          >
            {HEADSETS[id].label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          <Toggle label="Manual yaw (turntable)" checked={manual} onChange={setManual} />
          <input
            type="range"
            min={-180}
            max={180}
            value={yaw}
            disabled={!manual}
            onChange={(e) => setYaw(Number(e.target.value))}
            className="w-full accent-indigo-600 disabled:opacity-40"
            aria-label="Yaw"
          />
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Camera tilt {tilt}°
            <input
              type="range"
              min={0}
              max={35}
              value={tilt}
              onChange={(e) => setTilt(Number(e.target.value))}
              className="mt-2 w-full accent-indigo-600"
            />
          </label>
        </div>
        <div className="flex flex-col gap-3">
          <Toggle label="Roam (turn at edges)" checked={roam} onChange={setRoam} />
          <Toggle label="Show rig" checked={rig} onChange={setRig} />
          <Toggle label="Slow motion (0.25×)" checked={slow} onChange={setSlow} />
        </div>
      </div>
    </div>
  );
}

function useActiveSection(refs) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const els = refs.current.filter(Boolean);
    if (!els.length) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number(entry.target.dataset.index));
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [refs]);
  return active;
}

function useInView(ref) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return undefined;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: '0px 0px -30% 0px',
    });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [ref]);
  return inView;
}

export default function TrimStickmanLab() {
  const reduced = usePrefersReducedMotion();
  const sectionRefs = useRef([]);
  const storyRef = useRef(null);
  const active = useActiveSection(sectionRefs);
  const storyInView = useInView(storyRef);
  const activeScene = SECTIONS[active]?.scene ?? 'walk';
  const [styleId, setStyleId] = useState('classic');
  const [headsetId, setHeadsetId] = useState('boba3');
  // The MDX wrapper is transformed, which would trap position:fixed, so the
  // roaming band is portalled to <body> after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="not-prose">
      <Inspector styleId={styleId} onStyle={setStyleId} headsetId={headsetId} onHeadset={setHeadsetId} />

      <div className="mx-auto mt-20 max-w-3xl">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-indigo-500">Scroll test</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          The roaming figure, driven by scroll
        </h2>
        <p className="mt-3 text-lg font-light text-slate-600 dark:text-slate-400">
          This is the /projects behaviour rebuilt on the new engine. Watch the strip at the bottom of the screen: each section below switches its scene, and it erases itself when you scroll past the last one.
        </p>
      </div>

      <div ref={storyRef} className="mx-auto max-w-3xl pb-[40vh]">
        {SECTIONS.map((section, i) => (
          <section
            key={section.scene}
            ref={(el) => {
              sectionRefs.current[i] = el;
            }}
            data-index={i}
            className={`flex min-h-[80vh] flex-col justify-center border-l-2 pl-6 transition-colors duration-500 ${
              active === i ? 'border-indigo-500' : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-indigo-500">{section.kicker}</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">{section.title}</h3>
            {section.body.map((para) => (
              <p key={para.slice(0, 24)} className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300 md:text-lg">
                {para}
              </p>
            ))}
          </section>
        ))}
      </div>

      {!reduced && mounted && createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[5]">
          <div className="absolute bottom-0 h-px w-full bg-slate-300 opacity-40 dark:bg-slate-800" />
          <TrimStage
            className="h-40 w-full"
            scene={activeScene}
            styleId={styleId}
            headsetId={headsetId}
            scale={1}
            groundRatio={0.84}
            roam
            present={storyInView}
            ariaLabel="Roaming trim-path stickman"
          />
        </div>,
        document.body,
      )}
    </div>
  );
}
