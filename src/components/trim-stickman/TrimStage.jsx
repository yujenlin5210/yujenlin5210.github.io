import { useEffect, useId, useRef, useState } from 'react';
import { TrimStickmanSim } from './engine';

const INK = 'text-slate-700 dark:text-slate-300';
const PAPER = 'fill-white dark:fill-slate-950';
// Flat-shading tones for faces: lit, mid, shadow.
const TONES = [PAPER, 'fill-slate-200 dark:fill-slate-800', 'fill-slate-400 dark:fill-slate-700'];
// A hairline stroke in the fill colour hides anti-aliasing seams between quads.
const STROKE_MATCH = {
  'fill-slate-800 dark:fill-slate-600': 'stroke-slate-800 dark:stroke-slate-600',
  'fill-slate-600 dark:fill-slate-500': 'stroke-slate-600 dark:stroke-slate-500',
  'fill-slate-700 dark:fill-slate-600': 'stroke-slate-700 dark:stroke-slate-600',
};

/** Trim a pathLength=1 path to [start, end]. */
function trimProps(trim, dash = false) {
  const [s, e] = trim;
  // A fully drawn "dash" stroke shows its texture (e.g. a vent grille).
  if (s <= 0.0005 && e >= 0.9995) return dash ? { strokeDasharray: '0.012 0.02', strokeLinecap: 'butt' } : {};
  return { strokeDasharray: `${Math.max(e - s, 0)} 2`, strokeDashoffset: -s };
}

const isHidden = (trim) => trim && trim[1] - trim[0] < 0.002;

function Item({ item, ids }) {
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
          fill={item.paper || item.fillClass ? undefined : 'currentColor'}
          className={item.fillClass || (item.paper ? PAPER : undefined)}
          opacity={item.opacity}
        />
      ) : null;
    case 'capsule': {
      if (isHidden(item.trim)) return null;
      const t = trimProps(item.trim);
      return (
        <g>
          <path d={item.d} pathLength={1} fill="none" stroke="currentColor" strokeWidth={item.w + item.line} strokeLinecap="round" {...t} />
          <path d={item.d} pathLength={1} fill="none" className={item.innerClass || 'stroke-white dark:stroke-slate-950'} strokeWidth={Math.max(item.w - item.line, 0)} strokeLinecap="round" {...t} />
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
              className={item.ink || item.fillUrl ? undefined : item.fillClass || TONES[item.tone || 0]}
              fill={item.ink ? 'currentColor' : item.fillUrl ? `url(#${ids[item.fillUrl]})` : undefined}
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
              opacity={item.opacity}
              {...trimProps(item.trim)}
            />
          )}
        </g>
      );
    }
    case 'solid': {
      // Union shapes made of many sub-paths: a fat stroke underneath, then the
      // fill on top, leaves only the outer silhouette outlined.
      if (!(item.fill > 0.001)) return null;
      return (
        <g opacity={item.fill}>
          <path d={item.d} fill="none" stroke="currentColor" strokeWidth={item.w * 2} strokeLinejoin="round" />
          <path
            d={item.d}
            className={item.fillUrl ? undefined : item.fillClass}
            fill={item.fillUrl ? `url(#${ids[item.fillUrl]})` : undefined}
            stroke={item.fillUrl ? `url(#${ids[item.fillUrl]})` : 'currentColor'}
            strokeWidth={1.5}
            strokeLinejoin="round"
            {...(item.fillUrl ? {} : { className: `${item.fillClass} ${STROKE_MATCH[item.fillClass] || ''}` })}
          />
        </g>
      );
    }
    case 'text':
      return item.opacity > 0.01 ? (
        <text
          x={item.x}
          y={item.y}
          transform={item.matrix ? `matrix(${item.matrix.map((v) => v.toFixed(3)).join(' ')})` : undefined}
          fontSize={item.size}
          textAnchor="middle"
          fontWeight={700}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          letterSpacing={item.size * 0.18}
          fill={item.fillClass ? undefined : 'currentColor'}
          className={item.fillClass}
          opacity={item.opacity}
        >
          {item.text}
        </text>
      ) : null;
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
          className={item.strokeClass}
          {...trimProps(item.trim, item.dash)}
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
  headsetId = 'standard',
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
  const uid = useId().replace(/:/g, '');
  const filterId = `trim-sketch-${uid}`;
  const ids = { chrome: `trim-chrome-${uid}`, glare: `trim-glare-${uid}`, vig: `trim-vig-${uid}`, vigMask: `trim-vigmask-${uid}` };
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
    simInstance.current.setHeadset(headsetId);
  }, [headsetId]);

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

  const vig = frame?.vignette;
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
          <defs>
            {/* Silver chrome: bright highlight band between cool greys. */}
            <linearGradient id={ids.chrome} x1="0" y1="0" x2="0.35" y2="1">
              <stop offset="0" stopColor="#f8fafc" />
              <stop offset="0.35" stopColor="#cbd5e1" />
              <stop offset="0.55" stopColor="#f1f5f9" />
              <stop offset="0.8" stopColor="#94a3b8" />
              <stop offset="1" stopColor="#e2e8f0" />
            </linearGradient>
            {/* HDR glare: a blown-out white core fading through warm white to nothing. */}
            <radialGradient id={ids.glare}>
              <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="0.22" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="0.5" stopColor="#fffbeb" stopOpacity="0.75" />
              <stop offset="0.75" stopColor="#fffbeb" stopOpacity="0.3" />
              <stop offset="1" stopColor="#fffbeb" stopOpacity="0" />
            </radialGradient>
            {/* Scenery vignette: an ellipse around the figure, opaque in the
                middle and fading to nothing, so scenery never ends in a hard edge. */}
            {vig && (
              <>
                <radialGradient
                  id={ids.vig}
                  gradientUnits="userSpaceOnUse"
                  cx={vig.x}
                  cy={vig.y}
                  r={vig.rx}
                  gradientTransform={`translate(${vig.x} ${vig.y}) scale(1 ${vig.ry / vig.rx}) translate(${-vig.x} ${-vig.y})`}
                >
                  <stop offset="0" stopColor="#fff" />
                  <stop offset="0.68" stopColor="#fff" />
                  <stop offset="1" stopColor="#000" />
                </radialGradient>
                <mask id={ids.vigMask} maskUnits="userSpaceOnUse" x={vig.x - vig.rx} y={vig.y - vig.ry} width={vig.rx * 2} height={vig.ry * 2}>
                  <rect x={vig.x - vig.rx} y={vig.y - vig.ry} width={vig.rx * 2} height={vig.ry * 2} fill={`url(#${ids.vig})`} />
                </mask>
              </>
            )}
          </defs>
          {frame?.look?.filter === 'sketch' && (
            <defs>
              <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency={0.045 / scale} numOctaves={2} seed={frame.look.seed} />
                <feDisplacementMap in="SourceGraphic" scale={3.2 * scale} />
              </filter>
            </defs>
          )}
          <g filter={frame?.look?.filter === 'sketch' ? `url(#${filterId})` : undefined}>
            {vig && (
              <g mask={`url(#${ids.vigMask})`}>
                {frame.items.filter((item) => item.scenery === 'back').map((item) => (
                  <Item key={item.key} item={item} ids={ids} />
                ))}
              </g>
            )}
            {frame?.items.filter((item) => !vig || !item.scenery).map((item) => (
              <Item key={item.key} item={item} ids={ids} />
            ))}
            {vig && (
              <g mask={`url(#${ids.vigMask})`}>
                {frame.items.filter((item) => item.scenery === 'front').map((item) => (
                  <Item key={item.key} item={item} ids={ids} />
                ))}
              </g>
            )}
          </g>
          {frame?.rig && <RigOverlay chains={frame.rig} />}
        </svg>
      )}
    </div>
  );
}
