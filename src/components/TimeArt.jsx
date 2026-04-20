import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const wakeLockRef = useRef(null);
  const wakeLockVideoRef = useRef(null);
  const isMounted = useRef(true);
  
  const ANIM_DURATION = 2.2;
  const EASE_CURVE = [0.05, 0.9, 0.1, 1.0]; // Icy Slide

  useEffect(() => {
    isMounted.current = true;
    
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
      if (audioCtx.current) {
        audioCtx.current.close();
      }
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
        silentAudioRef.current = null;
      }
    };
  }, []);

  // Helper for cancellable delay
  const wait = (ms) => new Promise((resolve) => {
    const timeout = setTimeout(resolve, ms);
    if (!isMounted.current) clearTimeout(timeout);
  });

  // Sound Synthesis (Spacious Glassy Bell)
  const playBell = (isReverse = false) => {
    if (!isMounted.current) return;
    
    if (!audioCtx.current) {
      if (navigator.audioSession) {
        navigator.audioSession.type = 'playback';
      }
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtx.current;
    
    // Safety check for closed context
    if (ctx.state === 'closed') return;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const playTone = (freq, volume, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
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
    if (isAnimating) return;
    setIsAnimating(true);

    // Helper to handle Wake Lock (Native or Video Fallback)
    const toggleWakeLock = async (enable) => {
      if (enable) {
        if ('wakeLock' in navigator) {
          try {
            if (wakeLockRef.current) await wakeLockRef.current.release();
            wakeLockRef.current = await navigator.wakeLock.request('screen');
          } catch (err) {
            console.warn("Native Wake Lock failed, trying video fallback...");
          }
        }
        
        if (!wakeLockRef.current) {
          if (!wakeLockVideoRef.current) {
            const video = document.createElement('video');
            video.setAttribute('loop', '');
            video.setAttribute('playsinline', '');
            video.setAttribute('muted', '');
            video.style.position = 'absolute';
            video.style.top = '-9999px';
            video.style.left = '-9999px';
            video.style.width = '1px';
            video.style.height = '1px';
            video.style.opacity = '0.01';
            video.src = 'data:video/mp4;base64,AAAAHGZ0eXBpc29tAAAAAGlzb21pc28yYXZjMQAAAAhmcmVlAAAAG21kYXQAAAHpYXZjQwBQAAsAEAAf/+ADhAA3/8D///AADhAA3/8D///AADhAA3/8D///AADhAA3/8D///8AAAALZ3VpZAAAAAAAAAAVAAAAGHBhc3MAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
            document.body.appendChild(video);
            wakeLockVideoRef.current = video;
          }
          wakeLockVideoRef.current.play().catch(() => {});
        }
      } else {
        if (wakeLockRef.current) {
          wakeLockRef.current.release().then(() => { wakeLockRef.current = null; }).catch(() => {});
        }
        if (wakeLockVideoRef.current) {
          wakeLockVideoRef.current.pause();
        }
      }
    };

    // Initialize silent audio to force media playback mode on mobile
    if (!silentAudioRef.current) {
      silentAudioRef.current = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
      silentAudioRef.current.loop = true;
    }
    silentAudioRef.current.play().catch(() => {});
    toggleWakeLock(true);

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
    if (isMounted.current) setPieces(history[0]);

    // Forward Split Phase
    for (let step = 0; step < n; step++) {
      if (!isMounted.current) return;

      const prevLevel = history[step];
      const nextLevel = [];

      const splitTasks = prevLevel.map(p => {
        // Purely random split based on probability weight
        let isHorizontal = Math.random() > 0.5; // 50% chance to split vertically (width)

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
        if (!isMounted.current) return;
        setPieces(current => {
            const filtered = current.filter(ap => ap.id !== task.parentId);
            return [...filtered, ...task.children];
        });
        playBell(false);
        await wait(40 + Math.random() * 120);
      }

      history.push(splitTasks.flatMap(t => t.children));
      await wait(1200); 
    }

    await wait(2000);

    // Reverse Merge Phase
    for (let step = n - 1; step >= 0; step--) {
      if (!isMounted.current) return;

      const parentLevel = history[step];
      const currentLevelIds = history[step + 1].map(p => p.id);
      const shuffledParentIds = [...parentLevel.map(p => p.id)].sort(() => Math.random() - 0.5);

      for (const pid of shuffledParentIds) {
        if (!isMounted.current) return;
        setPieces(current => current.map(p => {
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
        await wait(40 + Math.random() * 100);
      }

      await wait(ANIM_DURATION * 1000);

      if (!isMounted.current) return;
      setPieces(current => {
        const filtered = current.filter(p => !currentLevelIds.includes(p.id));
        const restoredParents = parentLevel.map(p => ({
          ...p,
          startX: p.targetX, startY: p.targetY 
        }));
        return [...filtered, ...restoredParents];
      });
      
      await wait(200);
    }

    if (isMounted.current) {
      setPieces([]);
      setIsAnimating(false);
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
      }
      toggleWakeLock(false);
    }
  };

  // Visibility and Wake Lock Management during animation
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isAnimating) {
        // Cancel everything if user leaves page
        setIsAnimating(false);
        setPieces([]);
        if (silentAudioRef.current) silentAudioRef.current.pause();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup if isAnimating changes to false
    if (!isAnimating) {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().then(() => { wakeLockRef.current = null; }).catch(() => {});
      }
      if (wakeLockVideoRef.current) {
        wakeLockVideoRef.current.pause();
      }
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [isAnimating]);

  return (
    <div className="not-prose relative w-full aspect-[4/5] md:aspect-[16/10] bg-slate-50 dark:bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-white/5 font-sans mb-12 flex flex-col items-center justify-center group transition-all duration-500">
      {/* Hidden Video Wake Lock - Must be in DOM and .play() called in user gesture */}
      <video 
        ref={wakeLockVideoRef}
        loop 
        muted 
        playsInline 
        className="absolute w-1 h-1 opacity-[0.01] pointer-events-none"
        src="data:video/mp4;base64,AAAAHGZ0eXBpc29tAAAAAGlzb21pc28yYXZjMQAAAAhmcmVlAAAAG21kYXQAAAHpYXZjQwBQAAsAEAAf/+ADhAA3/8D///AADhAA3/8D///AADhAA3/8D///AADhAA3/8D///8AAAALZ3VpZAAAAAAAAAAVAAAAGHBhc3MAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
      />
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
              <motion.rect
                key={p.id}
                initial={{ 
                  x: p.startX, 
                  y: p.startY
                }}
                animate={{ 
                  x: p.targetX, 
                  y: p.targetY
                }}
                transition={{ 
                  type: "tween", 
                  ease: EASE_CURVE,
                  duration: ANIM_DURATION
                }}
                width={p.w}
                height={p.h}
                fill="rgba(129, 140, 248, 0.35)"
                className="mix-blend-multiply dark:mix-blend-screen"
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
