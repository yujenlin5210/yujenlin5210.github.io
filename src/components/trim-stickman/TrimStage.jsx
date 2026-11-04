import { useEffect, useId, useRef, useState } from 'react';
import { TrimStickmanSim } from './engine';

const INK = 'text-slate-700 dark:text-slate-300';
const PAPER = 'fill-white dark:fill-slate-950';
// Flat-shading tones for faces: lit, mid, shadow.
const TONES = [PAPER, 'fill-slate-200 dark:fill-slate-800', 'fill-slate-400 dark:fill-slate-700'];

/** Trim a pathLength=1 path to [start, end]. */
function trimProps(trim) {
  const [s, e] = trim;
  if (s <= 0.0005 && e >= 0.9995) return {};
  return { strokeDasharray: `${Math.max(e - s, 0)} 2`, strokeDashoffset: -s };
}

const isHidden = (trim) => trim && trim[1] - trim[0] < 0.002;

function Item({ item }) {
  const fadeOpacity = item.fade ? 1 - item.fade * 0.55 : 1;
  switch (item.type) {
    case 'shadow':
      return <path d={item.d} fill="currentColor" opacity={item.opacity} />;
    case 'dot':
      return item.r > 0.05 ? (
        <circle
          cx={item.x}
          cy={item.y}
          r={item.r}
          fill={item.paper ? undefined : 'currentColor'}
          className={item.paper ? PAPER : undefined}
          opacity={item.opacity}
        />
      ) : null;
    case 'capsule': {
      if (isHidden(item.trim)) return null;
      const t = trimProps(item.trim);
      return (
        <g>
          <path d={item.d} pathLength={1} fill="none" stroke="currentColor" strokeWidth={item.w + item.line} strokeLinecap="round" {...t} />
          <path d={item.d} pathLength={1} fill="none" className="stroke-white dark:stroke-slate-950" strokeWidth={Math.max(item.w - item.line, 0)} strokeLinecap="round" {...t} />
        </g>
      );
    }
    case 'shape': {
      if (isHidden(item.trim) && !item.fill) return null;
      return (
        <g>
          {item.fill > 0.001 && (
            <path
              d={item.d}
              className={item.ink ? undefined : TONES[item.tone || 0]}
              fill={item.ink ? 'currentColor' : undefined}
              stroke="none"
              opacity={item.fill}
            />
          )}
          {!isHidden(item.trim) && (
            <path
              d={item.d}
              pathLength={1}
              fill="none"
              stroke="currentColor"
              strokeWidth={item.w}
              strokeLinecap="round"
              strokeLinejoin={item.join || 'round'}
              {...trimProps(item.trim)}
            />
          )}
        </g>
      );
    }
    case 'stroke':
    default:
      if (isHidden(item.trim)) return null;
      return (
        <path
          d={item.d}
          pathLength={1}
          fill="none"
          stroke="currentColor"
          strokeWidth={item.w}
          strokeLinecap="round"
          strokeLinejoin={item.join || 'round'}
          opacity={item.opacity ?? fadeOpacity}
          {...trimProps(item.trim)}
        />
      );
  }
}

function RigOverlay({ chains }) {
  return (
    <g className="text-indigo-500" pointerEvents="none">
      {chains.map((chain, i) => (
        <g key={i}>
          <polyline
            points={chain.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="3 2"
          />
          {chain.map((p, j) => (
            <circle key={j} cx={p.x} cy={p.y} r={2.2} fill="currentColor" />
          ))}
        </g>
      ))}
    </g>
  );
}

/**
 * Renders a TrimStickmanSim into an SVG that fills its container.
 *
 * Props:
 *  scene, scale, groundRatio (0..1 of height), roam, manualYaw (deg | null),
 *  timeScale, showRig, present, tilt, paused, simRef (receives the sim), className
 */
export default function TrimStage({
  scene = 'walk',
  styleId = 'classic',
  scale = 1,
  groundRatio = 0.8,
  roam = true,
  manualYaw = null,
  timeScale = 1,
  showRig = false,
  present = true,
  tilt = 11,
  paused = false,
  simRef,
  onFrame,
  className = '',
  ariaLabel = 'Animated stickman',
}) {
  const wrapRef = useRef(null);
  const filterId = `trim-sketch-${useId().replace(/:/g, '')}`;
  const simInstance = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [frame, setFrame] = useState(null);
  const live = useRef({});
  live.current = { roam, manualYaw, timeScale, showRig, tilt, scale, groundRatio, paused, onFrame };

  if (!simInstance.current) simInstance.current = new TrimStickmanSim({ scene, present: false });
  if (simRef) simRef.current = simInstance.current;

  useEffect(() => {
    simInstance.current.setScene(scene);
  }, [scene]);

  useEffect(() => {
    simInstance.current.setStyle(styleId);
  }, [styleId]);

  useEffect(() => {
    simInstance.current.setPresent(present);
  }, [present]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!size.w || !size.h) return undefined;
    let raf = 0;
    let last = performance.now();
    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(wrapRef.current);

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const o = live.current;
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      if (!visible || o.paused || document.hidden) return;
      const sim = simInstance.current;
      sim.step(dt * o.timeScale, {
        halfWidth: size.w / 2 / o.scale,
        roam: o.roam,
        manualYaw: o.manualYaw,
      });
      const fr = sim.frame(
        { cx: size.w / 2, cy: size.h * o.groundRatio, scale: o.scale, tilt: o.tilt },
        { rig: o.showRig },
      );
      setFrame(fr);
      o.onFrame?.(fr.debug);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [size.w, size.h]);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {size.w > 0 && (
        <svg
          width={size.w}
          height={size.h}
          viewBox={`0 0 ${size.w} ${size.h}`}
          className={`absolute inset-0 overflow-visible ${INK}`}
          role="img"
          aria-label={ariaLabel}
        >
          {frame?.look?.filter === 'sketch' && (
            <defs>
              <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency={0.045 / scale} numOctaves={2} seed={frame.look.seed} />
                <feDisplacementMap in="SourceGraphic" scale={3.2 * scale} />
              </filter>
            </defs>
          )}
          <g filter={frame?.look?.filter === 'sketch' ? `url(#${filterId})` : undefined}>
            {frame?.items.map((item) => (
              <Item key={item.key} item={item} />
            ))}
          </g>
          {frame?.rig && <RigOverlay chains={frame.rig} />}
        </svg>
      )}
    </div>
  );
}
