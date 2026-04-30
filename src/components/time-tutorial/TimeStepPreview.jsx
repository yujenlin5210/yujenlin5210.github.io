import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

const STAGE = { w: 1200, h: 750 };
const ROOT_SIZE = 280;
const ANIM_EASING = 'cubic-bezier(0.05, 0.9, 0.1, 1)';

const PREVIEW_COPY = {
  data: {
    label: 'Data Model',
    description: 'One root piece rendered from a single object.',
    action: 'Static',
  },
  split: {
    label: 'One Split',
    description: 'The parent is replaced by two child records.',
    action: 'Regenerate Split',
  },
  recursive: {
    label: 'Recursive History',
    description: 'Scrub through each saved level of the split tree.',
    action: 'Regenerate Tree',
  },
  animate: {
    label: 'Animated Handoff',
    description: 'Pieces inherit parent coordinates before sliding outward.',
    action: 'Run Split',
  },
  merge: {
    label: 'Reverse Merge',
    description: 'The saved tree history plays backward into one square.',
    action: 'Run Split + Merge',
  },
};

function createRng(seed) {
  let value = seed >>> 0;

  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function shuffleWithRng(items, rng) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function makeRootPiece() {
  const x = (STAGE.w - ROOT_SIZE) / 2;
  const y = (STAGE.h - ROOT_SIZE) / 2;

  return {
    id: 'root',
    x,
    y,
    w: ROOT_SIZE,
    h: ROOT_SIZE,
    startX: x,
    startY: y,
    targetX: x,
    targetY: y,
  };
}

function makeCenteredViewBox(size) {
  return {
    x: (STAGE.w - size) / 2,
    y: (STAGE.h - size) / 2,
    w: size,
    h: size,
  };
}

function getPreviewViewBox(mode, depth, recursiveLevel) {
  if (mode === 'data') {
    return makeCenteredViewBox(440);
  }

  if (mode === 'split') {
    return makeCenteredViewBox(560);
  }

  if (mode === 'recursive') {
    return makeCenteredViewBox(Math.min(820, 440 + recursiveLevel * 95));
  }

  return makeCenteredViewBox(Math.min(820, 580 + depth * 75));
}

function splitPiece(piece, step, rng) {
  const ratio = 0.2 + rng() * 0.6;
  const baseForce = (15 + rng() * 55) * Math.pow(0.85, step);
  const f1 = baseForce * (0.8 + rng() * 0.4);
  const f2 = baseForce * (0.8 + rng() * 0.4);

  if (rng() > 0.5) {
    const h1 = piece.h * ratio;
    const h2 = piece.h - h1;

    return [
      {
        id: `${piece.id}-1`,
        x: piece.targetX,
        y: piece.targetY,
        w: piece.w,
        h: h1,
        startX: piece.targetX,
        startY: piece.targetY,
        targetX: piece.targetX,
        targetY: piece.targetY - f1,
      },
      {
        id: `${piece.id}-2`,
        x: piece.targetX,
        y: piece.targetY + h1,
        w: piece.w,
        h: h2,
        startX: piece.targetX,
        startY: piece.targetY + h1,
        targetX: piece.targetX,
        targetY: piece.targetY + h1 + f2,
      },
    ];
  }

  const w1 = piece.w * ratio;
  const w2 = piece.w - w1;

  return [
    {
      id: `${piece.id}-1`,
      x: piece.targetX,
      y: piece.targetY,
      w: w1,
      h: piece.h,
      startX: piece.targetX,
      startY: piece.targetY,
      targetX: piece.targetX - f1,
      targetY: piece.targetY,
    },
    {
      id: `${piece.id}-2`,
      x: piece.targetX + w1,
      y: piece.targetY,
      w: w2,
      h: piece.h,
      startX: piece.targetX + w1,
      startY: piece.targetY,
      targetX: piece.targetX + w1 + f2,
      targetY: piece.targetY,
    },
  ];
}

function buildHistory(depth, seed) {
  return buildSplitPlan(depth, seed).history;
}

function buildSplitPlan(depth, seed) {
  const splitRng = createRng(seed);
  const shuffleRng = createRng(seed + 1009);
  const history = [[makeRootPiece()]];
  const tasksByStep = [];
  const mergeParentOrders = [];

  for (let step = 0; step < depth; step += 1) {
    const tasks = history[step].map((piece) => ({
      parentId: piece.id,
      children: splitPiece(piece, step, splitRng),
    }));

    tasksByStep.push(shuffleWithRng(tasks, shuffleRng));
    mergeParentOrders.push(shuffleWithRng(history[step].map((piece) => piece.id), shuffleRng));
    history.push(tasks.flatMap((task) => task.children));
  }

  return { history, tasksByStep, mergeParentOrders };
}

function getInitialPieces(mode, depth, seed) {
  const history = buildHistory(depth, seed);

  if (mode === 'data' || mode === 'animate' || mode === 'merge') {
    return history[0];
  }

  if (mode === 'split') {
    return history[1];
  }

  return history[depth];
}

function PreviewPiece({ piece, animate, duration }) {
  const elementRef = useRef(null);
  const fromTransform = `translate(${piece.startX - piece.x}px, ${piece.startY - piece.y}px)`;
  const toTransform = `translate(${piece.targetX - piece.x}px, ${piece.targetY - piece.y}px)`;

  useLayoutEffect(() => {
    const element = elementRef.current;

    if (!element) {
      return undefined;
    }

    element.style.transform = animate ? fromTransform : toTransform;

    if (!animate || fromTransform === toTransform) {
      return undefined;
    }

    const animation = element.animate(
      [
        { transform: fromTransform },
        { transform: toTransform },
      ],
      {
        duration,
        easing: ANIM_EASING,
        fill: 'forwards',
      }
    );

    element.style.transform = toTransform;

    return () => animation.cancel();
  }, [animate, duration, fromTransform, toTransform]);

  return (
    <g
      ref={elementRef}
      style={{
        transformBox: 'fill-box',
        transformOrigin: '0 0',
        willChange: animate ? 'transform' : 'auto',
      }}
    >
      <rect
        x={piece.x}
        y={piece.y}
        width={piece.w}
        height={piece.h}
        rx="1.5"
        fill="rgba(129, 140, 248, 0.35)"
      />
    </g>
  );
}

export default function TimeStepPreview({ mode = 'data', depth = 4 }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const config = PREVIEW_COPY[mode] ?? PREVIEW_COPY.data;
  const timerRef = useRef([]);
  const seedRef = useRef(23);
  const [pieces, setPieces] = useState(() => getInitialPieces(mode, depth, 23));
  const [isRunning, setIsRunning] = useState(false);
  const [recursiveLevel, setRecursiveLevel] = useState(depth);
  const animationDuration = prefersReducedMotion ? 250 : 2200;
  const splitStagger = prefersReducedMotion ? 18 : 70;
  const mergeStagger = prefersReducedMotion ? 18 : 65;
  const stepSettle = prefersReducedMotion ? 120 : 1200;
  const holdDuration = prefersReducedMotion ? 200 : 1600;
  const mergeSettle = prefersReducedMotion ? 80 : 200;
  const animatePieces = mode === 'animate' || mode === 'merge';
  const rootPiece = useMemo(() => makeRootPiece(), []);
  const previewViewBox = getPreviewViewBox(mode, depth, recursiveLevel);

  const clearTimers = () => {
    timerRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timerRef.current = [];
  };

  const schedule = (callback, delay) => {
    const timerId = window.setTimeout(callback, delay);
    timerRef.current.push(timerId);
  };

  const resetToSeed = (nextSeed) => {
    clearTimers();
    setIsRunning(false);
    if (mode === 'recursive') {
      setPieces(buildHistory(depth, nextSeed)[recursiveLevel]);
      return;
    }

    setPieces(getInitialPieces(mode, depth, nextSeed));
  };

  const handleRecursiveLevelChange = (event) => {
    const nextLevel = Number(event.target.value);
    setRecursiveLevel(nextLevel);
    setPieces(buildHistory(depth, seedRef.current)[nextLevel]);
  };

  const runSequence = (nextSeed) => {
    const { history, tasksByStep, mergeParentOrders } = buildSplitPlan(depth, nextSeed);

    clearTimers();
    setIsRunning(true);
    setPieces(history[0]);

    let cursor = 180;

    for (let step = 0; step < depth; step += 1) {
      for (const task of tasksByStep[step]) {
        schedule(() => {
          setPieces((current) => {
            const filtered = current.filter((piece) => piece.id !== task.parentId);
            return [...filtered, ...task.children];
          });
        }, cursor);
        cursor += splitStagger;
      }

      cursor += stepSettle;
    }

    if (mode === 'animate') {
      schedule(() => setIsRunning(false), cursor + animationDuration);
      return;
    }

    cursor += holdDuration;

    for (let step = depth - 1; step >= 0; step -= 1) {
      const parentLevel = history[step];
      const currentLevelIds = new Set(history[step + 1].map((piece) => piece.id));

      for (const parentId of mergeParentOrders[step]) {
        schedule(() => {
          setPieces((current) => current.map((piece) => {
            if (!piece.id.startsWith(`${parentId}-`)) {
              return piece;
            }

            return {
              ...piece,
              startX: piece.targetX,
              startY: piece.targetY,
              targetX: piece.x,
              targetY: piece.y,
            };
          }));
        }, cursor);
        cursor += mergeStagger;
      }

      cursor += animationDuration;

      schedule(() => {
        setPieces((current) => {
          const filtered = current.filter((piece) => !currentLevelIds.has(piece.id));
          const restoredParents = parentLevel.map((piece) => ({
            ...piece,
            startX: piece.targetX,
            startY: piece.targetY,
          }));

          return [...filtered, ...restoredParents];
        });
      }, cursor);

      cursor += mergeSettle;
    }

    schedule(() => setIsRunning(false), cursor);
  };

  const handleAction = () => {
    if (mode === 'data' || isRunning) {
      return;
    }

    const nextSeed = seedRef.current + 17;
    seedRef.current = nextSeed;

    if (mode === 'animate' || mode === 'merge') {
      runSequence(nextSeed);
    } else {
      resetToSeed(nextSeed);
    }
  };

  useEffect(() => () => clearTimers(), []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.32),transparent_34%),radial-gradient(circle_at_72%_70%,rgba(14,165,233,0.18),transparent_38%)]" />
      <div className="absolute top-4 left-4 right-4 z-20 flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] font-black text-indigo-300">
            {config.label}
          </div>
          <p className="mt-1 max-w-[18rem] text-xs leading-relaxed text-slate-300">
            {config.description}
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-mono text-indigo-100">
          {pieces.length} piece{pieces.length === 1 ? '' : 's'}
        </div>
      </div>

      <svg
        viewBox={`${previewViewBox.x} ${previewViewBox.y} ${previewViewBox.w} ${previewViewBox.h}`}
        className="relative z-10 h-full w-full p-1 md:p-2"
        role="img"
        aria-label={`${config.label} preview with ${pieces.length} visible pieces`}
      >
        <rect
          x={rootPiece.x}
          y={rootPiece.y}
          width={rootPiece.w}
          height={rootPiece.h}
          fill="transparent"
          stroke="rgba(148, 163, 184, 0.24)"
          strokeDasharray="8 8"
          strokeWidth="2"
        />
        {pieces.map((piece) => (
          <PreviewPiece
            key={piece.id}
            piece={piece}
            animate={animatePieces}
            duration={animationDuration}
          />
        ))}
      </svg>

      <div className="absolute bottom-4 left-4 right-4 z-20 flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
            {mode === 'recursive'
              ? `Level ${recursiveLevel} of ${depth}`
              : `Depth ${mode === 'split' ? 1 : mode === 'data' ? 0 : depth}`}
          </div>
          {mode === 'recursive' && (
            <input
              aria-label="Preview recursion level"
              type="range"
              min="0"
              max={depth}
              step="1"
              value={recursiveLevel}
              onChange={handleRecursiveLevelChange}
              className="mt-2 w-full max-w-[18rem] accent-indigo-300"
            />
          )}
        </div>
        <button
          type="button"
          disabled={mode === 'data' || isRunning}
          onClick={handleAction}
          className="rounded-full border border-indigo-300/40 bg-indigo-400/15 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100 transition hover:bg-indigo-400/25 disabled:cursor-default disabled:opacity-45"
        >
          {isRunning ? 'Running' : config.action}
        </button>
      </div>
    </div>
  );
}
