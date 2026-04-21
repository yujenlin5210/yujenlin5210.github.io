import { memo, startTransition, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAudioContextConstructor, isIOSPlaybackDevice } from '../utils/browserAudio';

const SILENT_AUDIO_SRC =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
const ANIM_EASING = 'cubic-bezier(0.05, 0.9, 0.1, 1)';

const AnimatedPiece = memo(function AnimatedPiece({ piece, duration }) {
  const elementRef = useRef(null);
  const animationRef = useRef(null);
  const fromTransform = `translate(${piece.startX - piece.x}px, ${piece.startY - piece.y}px)`;
  const toTransform = `translate(${piece.targetX - piece.x}px, ${piece.targetY - piece.y}px)`;

  useLayoutEffect(() => {
    const element = elementRef.current;

    if (!element) {
      return undefined;
    }

    animationRef.current?.cancel();
    element.style.transform = fromTransform;

    if (fromTransform === toTransform) {
      element.style.transform = toTransform;
      animationRef.current = null;
      return undefined;
    }

    const animation = element.animate(
      [
        { transform: fromTransform },
        { transform: toTransform },
      ],
      {
        duration: duration * 1000,
        easing: ANIM_EASING,
        fill: 'forwards',
      }
    );

    animationRef.current = animation;
    element.style.transform = toTransform;

    return () => {
      animation.cancel();

      if (animationRef.current === animation) {
        animationRef.current = null;
      }
    };
  }, [duration, fromTransform, toTransform]);

  return (
    <g
      ref={elementRef}
      style={{
        transformBox: 'fill-box',
        transformOrigin: '0 0',
        willChange: 'transform',
      }}
    >
      <rect
        x={piece.x}
        y={piece.y}
        width={piece.w}
        height={piece.h}
        fill="rgba(129, 140, 248, 0.35)"
      />
    </g>
  );
}, (prevProps, nextProps) => {
  const prev = prevProps.piece;
  const next = nextProps.piece;

  return (
    prevProps.duration === nextProps.duration &&
    prev.id === next.id &&
    prev.x === next.x &&
    prev.y === next.y &&
    prev.w === next.w &&
    prev.h === next.h &&
    prev.startX === next.startX &&
    prev.startY === next.startY &&
    prev.targetX === next.targetX &&
    prev.targetY === next.targetY
  );
});

const TimeArt = () => {
  const [n, setN] = useState(5);
  const [isAnimating, setIsAnimating] = useState(false);
  const [pieces, setPieces] = useState([]);
  const [dimensions, setDimensions] = useState({ w: 1200, h: 750 });
  const [initialSize, setInitialSize] = useState(280);
  const [isTouch, setIsTouch] = useState(false);
  const initialSizeRef = useRef(280);
  const audioCtx = useRef(null);
  const silentAudioRef = useRef(null);
  const isMounted = useRef(true);
  const isAnimatingRef = useRef(false);
  const interactionRunIdRef = useRef(0);
  const pendingWaitsRef = useRef(new Set());
  const activeNotesRef = useRef(new Set());
  const useSilentAudioWorkaroundRef = useRef(false);
  
  const ANIM_DURATION = 2.2;

  const setPiecesDeferred = (value) => {
    startTransition(() => {
      setPieces(value);
    });
  };

  const setAnimatingDeferred = (value) => {
    startTransition(() => {
      setIsAnimating(value);
    });
  };

  const isInteractionActive = (runId) =>
    isMounted.current && interactionRunIdRef.current === runId;

  const clearPendingWaits = () => {
    pendingWaitsRef.current.forEach((waitEntry) => {
      window.clearTimeout(waitEntry.id);
      waitEntry.resolve(false);
    });
    pendingWaitsRef.current.clear();
  };

  const cleanupNote = (note) => {
    if (!activeNotesRef.current.has(note)) {
      return;
    }

    activeNotesRef.current.delete(note);
    note.osc.onended = null;

    try {
      note.osc.disconnect();
    } catch {
      // Ignore disconnect failures during teardown.
    }

    try {
      note.gain.disconnect();
    } catch {
      // Ignore disconnect failures during teardown.
    }
  };

  const stopActiveNotes = () => {
    activeNotesRef.current.forEach((note) => {
      try {
        note.osc.stop(0);
      } catch {
        // Ignore notes that have already stopped.
      }

      cleanupNote(note);
    });
  };

  const ensureSilentAudio = () => {
    if (!useSilentAudioWorkaroundRef.current) {
      return null;
    }

    if (!silentAudioRef.current) {
      const silentAudio = new Audio(SILENT_AUDIO_SRC);
      silentAudio.loop = true;
      silentAudio.preload = 'auto';
      silentAudio.playsInline = true;
      silentAudioRef.current = silentAudio;
    }

    return silentAudioRef.current;
  };

  const stopSilentAudio = () => {
    const silentAudio = silentAudioRef.current;

    if (!silentAudio) {
      return;
    }

    silentAudio.pause();

    try {
      silentAudio.currentTime = 0;
    } catch {
      // Ignore browsers that reject seeks immediately after pause.
    }
  };

  const teardownSilentAudio = () => {
    const silentAudio = silentAudioRef.current;

    if (!silentAudio) {
      return;
    }

    stopSilentAudio();
    silentAudio.removeAttribute('src');
    silentAudio.load();
    silentAudioRef.current = null;
  };

  const finishInteraction = ({ resetPieces = true } = {}) => {
    clearPendingWaits();
    stopActiveNotes();
    stopSilentAudio();
    isAnimatingRef.current = false;

    if (!isMounted.current) {
      return;
    }

    setAnimatingDeferred(false);

    if (resetPieces) {
      setPiecesDeferred([]);
    }
  };

  const cancelInteraction = (options) => {
    interactionRunIdRef.current += 1;
    finishInteraction(options);
  };

  useEffect(() => {
    isAnimatingRef.current = isAnimating;
  }, [isAnimating]);

  useEffect(() => {
    isMounted.current = true;
    useSilentAudioWorkaroundRef.current = isIOSPlaybackDevice();
    
    const updateLayout = () => {
      const mobile = window.innerWidth < 768;
      setIsTouch(window.matchMedia('(pointer: coarse)').matches);
      if (mobile) {
        setDimensions({ w: 800, h: 1000 });
        setInitialSize(220);
        initialSizeRef.current = 220;
      } else {
        setDimensions({ w: 1200, h: 750 });
        setInitialSize(280);
        initialSizeRef.current = 280;
      }
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);

    return () => {
      isMounted.current = false;
      window.removeEventListener('resize', updateLayout);

      cancelInteraction({ resetPieces: false });
      teardownSilentAudio();

      const context = audioCtx.current;
      audioCtx.current = null;

      if (context && context.state !== 'closed') {
        void context.close().catch(() => {});
      }
    };
  }, []);

  // Helper for cancellable delay
  const wait = (ms, runId) => new Promise((resolve) => {
    if (!isInteractionActive(runId)) {
      resolve(false);
      return;
    }

    const waitEntry = { id: 0, resolve };
    waitEntry.id = window.setTimeout(() => {
      pendingWaitsRef.current.delete(waitEntry);
      resolve(isInteractionActive(runId));
    }, ms);

    pendingWaitsRef.current.add(waitEntry);
  });

  // Sound Synthesis (Spacious Glassy Bell)
  const playBell = (isReverse = false) => {
    if (!isMounted.current) return;
    
    if (!audioCtx.current) {
      if (useSilentAudioWorkaroundRef.current && navigator.audioSession) {
        navigator.audioSession.type = 'playback';
      }
      const AudioContextCtor = getAudioContextConstructor();

      if (!AudioContextCtor) {
        return;
      }

      audioCtx.current = new AudioContextCtor();
    }
    const ctx = audioCtx.current;
    
    // Safety check for closed context
    if (ctx.state === 'closed') return;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }

    const playTone = (freq, volume, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const note = { osc, gain };

      activeNotesRef.current.add(note);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      if (!isReverse) {
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      } else {
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + duration - 0.1);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
      }

      osc.onended = () => {
        cleanupNote(note);
      };
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    };

    const baseFreq = 180 + Math.random() * 330;
    playTone(baseFreq, 0.1, 2.5);
    playTone(baseFreq * 1.5, 0.05, 2.0); 
    playTone(baseFreq * 2.01, 0.03, 1.5); 
  };

  const startInteraction = async () => {
    if (isAnimatingRef.current) return;

    const runId = interactionRunIdRef.current + 1;
    interactionRunIdRef.current = runId;
    clearPendingWaits();
    stopActiveNotes();
    stopSilentAudio();
    isAnimatingRef.current = true;
    setAnimatingDeferred(true);

    // Initialize silent audio to force media playback mode on mobile
    const silentAudio = ensureSilentAudio();
    if (silentAudio) {
      void silentAudio.play().catch(() => {});
    }

    const initial = {
      id: 'root',
      x: (dimensions.w - initialSize) / 2, 
      y: (dimensions.h - initialSize) / 2, 
      w: initialSize, 
      h: initialSize,
      startX: (dimensions.w - initialSize) / 2, 
      startY: (dimensions.h - initialSize) / 2,
      targetX: (dimensions.w - initialSize) / 2, 
      targetY: (dimensions.h - initialSize) / 2
    };

    const history = [[initial]];
    if (isInteractionActive(runId)) {
      setPiecesDeferred(history[0]);
    }

    // Forward Split Phase
    for (let step = 0; step < n; step++) {
      if (!isInteractionActive(runId)) return;

      const prevLevel = history[step];

      const splitTasks = prevLevel.map(p => {
        // Purely random split based on probability weight
        const isHorizontal = Math.random() > 0.5; // 50% chance to split vertically (width)

        const ratio = 0.2 + Math.random() * 0.6;
        const baseForce = (15 + Math.random() * 55) * Math.pow(0.85, step);
        
        let c1, c2;
        if (isHorizontal) {
          const h1 = p.h * ratio;
          const h2 = p.h * (1 - ratio);
          const f1 = baseForce * (0.8 + Math.random() * 0.4);
          const f2 = baseForce * (0.8 + Math.random() * 0.4);
          c1 = { id: `${p.id}-1`, x: p.targetX, y: p.targetY, w: p.w, h: h1, startX: p.targetX, startY: p.targetY, targetX: p.targetX, targetY: p.targetY - f1 };
          c2 = { id: `${p.id}-2`, x: p.targetX, y: p.targetY + h1, w: p.w, h: h2, startX: p.targetX, startY: p.targetY + h1, targetX: p.targetX, targetY: p.targetY + h1 + f2 };
        } else {
          const w1 = p.w * ratio;
          const w2 = p.w * (1 - ratio);
          const f1 = baseForce * (0.8 + Math.random() * 0.4);
          const f2 = baseForce * (0.8 + Math.random() * 0.4);
          c1 = { id: `${p.id}-1`, x: p.targetX, y: p.targetY, w: w1, h: p.h, startX: p.targetX, startY: p.targetY, targetX: p.targetX - f1, targetY: p.targetY };
          c2 = { id: `${p.id}-2`, x: p.targetX + w1, y: p.targetY, w: w2, h: p.h, startX: p.targetX + w1, startY: p.targetY, targetX: p.targetX + w1 + f2, targetY: p.targetY };
        }
        return { parentId: p.id, children: [c1, c2] };
      });

      const shuffledTasks = [...splitTasks].sort(() => Math.random() - 0.5);
      
      for (const task of shuffledTasks) {
        if (!isInteractionActive(runId)) return;
        setPiecesDeferred((current) => {
          const filtered = current.filter(ap => ap.id !== task.parentId);
          return [...filtered, ...task.children];
        });
        playBell(false);
        if (!(await wait(40 + Math.random() * 120, runId))) return;
      }

      history.push(splitTasks.flatMap(t => t.children));
      if (!(await wait(1200, runId))) return;
    }

    if (!(await wait(2000, runId))) return;

    // Reverse Merge Phase
    for (let step = n - 1; step >= 0; step--) {
      if (!isInteractionActive(runId)) return;

      const parentLevel = history[step];
      const currentLevelIds = history[step + 1].map(p => p.id);
      const shuffledParentIds = [...parentLevel.map(p => p.id)].sort(() => Math.random() - 0.5);

      for (const pid of shuffledParentIds) {
        if (!isInteractionActive(runId)) return;
        setPiecesDeferred((current) => current.map(p => {
          if (p.id.startsWith(pid + '-')) {
            return {
              ...p,
              startX: p.targetX, startY: p.targetY,
              targetX: p.x, targetY: p.y
            };
          }
          return p;
        }));
        playBell(true);
        if (!(await wait(40 + Math.random() * 100, runId))) return;
      }

      if (!(await wait(ANIM_DURATION * 1000, runId))) return;

      if (!isInteractionActive(runId)) return;
      setPiecesDeferred((current) => {
        const filtered = current.filter(p => !currentLevelIds.includes(p.id));
        const restoredParents = parentLevel.map(p => ({
          ...p,
          startX: p.targetX, startY: p.targetY 
        }));
        return [...filtered, ...restoredParents];
      });
      
      if (!(await wait(200, runId))) return;
    }

    if (isInteractionActive(runId)) {
      clearPendingWaits();
      setPiecesDeferred([]);
      setAnimatingDeferred(false);
      stopSilentAudio();
      isAnimatingRef.current = false;
    }
  };

  // Visibility Management during animation
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isAnimatingRef.current) {
        cancelInteraction();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="not-prose relative w-full aspect-[4/5] md:aspect-[16/10] bg-slate-50 dark:bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-white/5 font-sans mb-12 flex flex-col items-center justify-center group transition-all duration-500">
      <AnimatePresence>
        {!isAnimating && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-8 md:top-12 w-full max-w-[280px] md:max-w-sm px-6 md:px-12 z-30"
          >
            <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-mono text-[10px] uppercase tracking-[0.2em] mb-4 font-black text-center w-full">
              <span className="flex-1 text-left">Complexity</span>
              <span className="bg-indigo-100 dark:bg-indigo-900/30 px-3 py-0.5 rounded-full text-indigo-700 dark:text-indigo-300 text-xs">{n}</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="10" 
              value={n} 
              onChange={(e) => setN(parseInt(e.target.value))}
              className="w-full h-2 md:h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAnimating && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-8 right-8 md:bottom-12 md:right-12 z-30 pointer-events-none"
          >
            <div className="flex flex-col items-end">
              <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[10px] uppercase tracking-[0.3em] font-black mb-1 opacity-50">Fragments</span>
              <span className="text-slate-900 dark:text-white font-mono text-2xl md:text-3xl font-black tabular-nums tracking-tighter">
                {pieces.length || 1}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative w-full h-full flex items-center justify-center transition-all duration-1000">
        <svg viewBox={`0 0 ${dimensions.w} ${dimensions.h}`} className="w-full h-full p-4 md:p-8">
          {pieces.length === 0 ? (
            <motion.rect
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              x={(dimensions.w - initialSize) / 2}
              y={(dimensions.h - initialSize) / 2}
              width={initialSize}
              height={initialSize}
              fill="rgba(129, 140, 248, 0.2)"
              stroke="rgba(129, 140, 248, 0.6)"
              strokeWidth="2"
              className="cursor-pointer"
              whileHover={{ scale: 1.01, fill: "rgba(129, 140, 248, 0.35)" }}
              onClick={startInteraction}
            />
          ) : (
            pieces.map((p) => (
              <AnimatedPiece
                key={p.id}
                piece={p}
                duration={ANIM_DURATION}
              />
            ))
          )}
        </svg>

        {!isAnimating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-center px-6">
            <span className="text-indigo-900/10 dark:text-white/10 font-black tracking-[0.4em] md:tracking-[0.8em] text-[10px] md:text-xs uppercase animate-pulse">
              {isTouch ? 'Tap to Fragment' : 'Click to Fragment'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeArt;
