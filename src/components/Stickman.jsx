import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@nanostores/react';
import { activeProjectId } from '../store/projectStore';
import { getActiveAction } from './stickman-actions/registry';
import { WALKING_LEGS, WALKING_ARMS, STANDING_LEGS } from './stickman-actions/utils';

export default function Stickman() {
  const [posX, setX] = useState(200);
  const [direction, setDirection] = useState(1);
  const $activeId = useStore(activeProjectId);

  const [phase, setPhase] = useState('walking');
  const [isFirstEntry, setIsFirstEntry] = useState(true);

  const action = useMemo(() => getActiveAction($activeId, phase), [$activeId, phase]);

  useEffect(() => {
    if (action.id === 'idle') {
      setIsFirstEntry(true);
      setPhase('walking');
    }
  }, [action.id]);

  useEffect(() => {
    let timeout;
    if (action.id !== 'idle') {
      if (phase === 'walking') {
        if (isFirstEntry) {
          setPhase('stopping');
          setIsFirstEntry(false);
        } else {
          timeout = setTimeout(() => setPhase('stopping'), action.config.walkBreakDuration || 6000);
        }
      } else if (phase === 'stopping') {
        timeout = setTimeout(() => setPhase(action.config.phases[0].name), action.config.stopDuration || 600);
      } else {
        const currentPhaseIdx = action.config.phases.findIndex(p => p.name === phase);
        if (currentPhaseIdx !== -1) {
          const currentPhase = action.config.phases[currentPhaseIdx];
          const nextPhase = action.config.phases[currentPhaseIdx + 1];
          if (nextPhase) {
            timeout = setTimeout(() => setPhase(nextPhase.name), currentPhase.duration);
          } else {
            timeout = setTimeout(() => setPhase('walking'), currentPhase.duration);
          }
        }
      }
    }
    return () => clearTimeout(timeout);
  }, [$activeId, phase, isFirstEntry, action.id]);

  const isActuallyWalking = phase === 'walking';

  useEffect(() => {
    const move = () => {
      setX(prev => {
        if (!isActuallyWalking) return prev;
        const speed = 1.2 * (action.config.speedMultiplier || 1);
        const next = prev + (speed * direction);
        const margin = 50;
        const width = window.innerWidth;
        if (next > width - margin) {
          setDirection(-1);
          return width - margin;
        }
        if (next < margin) {
          setDirection(1);
          return margin;
        }
        return next;
      });
    };
    const interval = setInterval(move, 16);
    return () => clearInterval(interval);
  }, [direction, isActuallyWalking, action.config.speedMultiplier]);

  const walkDuration = 0.8;
  const limbs = action.getLimbs();

  return (
    <div className="fixed bottom-0 left-0 w-full h-32 pointer-events-none z-[100] overflow-visible">
      <div className="absolute bottom-0 w-full h-[1px] bg-slate-300 dark:bg-slate-800 opacity-30" />
      
      <motion.div
        animate={{ x: posX - 30 }}
        transition={{ type: "tween", ease: "linear", duration: 0.016 }}
        className="absolute bottom-0"
      >
        <motion.svg 
          width="200" height="100" viewBox="0 0 200 100" className="overflow-visible"
          animate={{ scaleX: direction }}
          style={{ originX: "30px" }}
          transition={{ duration: 0.3 }}
        >
          {/* Main Person Group - Bobbing only when walking */}
          <motion.g
            animate={isActuallyWalking ? { y: [0, -4, 0] } : { y: 0 }}
            transition={{ duration: walkDuration / 2, repeat: isActuallyWalking ? Infinity : 0, ease: "easeInOut" }}
          >
            {/* Body */}
            {!action.config.hideBody && (
              <rect x="18" y="30" width="24" height="45" rx="12" fill="white" stroke="currentColor" strokeWidth="2.5" className="dark:fill-slate-950 text-slate-700 dark:text-slate-300" />
            )}
            
            {/* Head Group */}
            <motion.g 
              key={`head-${action.id}`}
              style={{ x: 30 }}
              animate={limbs?.head ? { y: 18, ...limbs.head } : { y: 18, rotate: [-5, 5, -5] }}
              transition={limbs?.head?.transition || { 
                y: { duration: 0.5 },
                rotate: { duration: 4, repeat: Infinity, ease: "easeInOut" }
              }}
            >
              <circle cx="0" cy="0" r="16" fill="white" stroke="currentColor" strokeWidth="2.5" className="dark:fill-slate-950 text-slate-700 dark:text-slate-300" />
              {!action.config.showHeadset && (
                <circle cx="8" cy="-2" r="1.5" fill="currentColor" className="text-slate-700 dark:text-slate-300" />
              )}
              {action.renderHeadAssets?.()}
            </motion.g>

            {/* Arms */}
            {!action.config.hideArms && (
              <>
                <motion.path
                  animate={limbs?.arms?.back || (isActuallyWalking ? { d: WALKING_ARMS.back } : { d: "M 25,45 Q 25,60 25,75" })}
                  transition={limbs?.arms?.transition || { duration: walkDuration, repeat: isActuallyWalking ? Infinity : 0, ease: "linear" }}
                  fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-slate-400 dark:text-slate-500 opacity-50"
                />
                <motion.path
                  animate={limbs?.arms?.front || (isActuallyWalking ? { d: WALKING_ARMS.front } : { d: "M 35,45 Q 35,60 35,75" })}
                  transition={limbs?.arms?.transition || { duration: walkDuration, repeat: isActuallyWalking ? Infinity : 0, ease: "linear" }}
                  fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-slate-700 dark:text-slate-300" />
              </>
            )}

            {/* Custom Action Assets (Body level) */}
            {action.renderAssets()}
          </motion.g>

          {/* LEGS Group - No vertical bobbing, always grounded at y=100 */}
          {!action.config.hideLegs && (
            <g>
              <motion.path
                animate={isActuallyWalking ? { d: WALKING_LEGS.back } : { d: STANDING_LEGS.back }}
                transition={{ duration: walkDuration, repeat: isActuallyWalking ? Infinity : 0, ease: "linear" }}
                fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-slate-400 dark:text-slate-500 opacity-50"
              />
              <motion.path
                animate={isActuallyWalking ? { d: WALKING_LEGS.front } : { d: STANDING_LEGS.front }}
                transition={{ duration: walkDuration, repeat: isActuallyWalking ? Infinity : 0, ease: "linear" }}
                fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-slate-700 dark:text-slate-300"
              />
            </g>
          )}
        </motion.svg>
      </motion.div>
    </div>
  );
}
