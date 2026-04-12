import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@nanostores/react';
import { activeAnimationId } from '../store/projectStore';
import { getActiveAction } from './stickman-actions/registry';
import { getRubberHosePath, WALKING_LEGS, WALKING_ARMS, STANDING_LEGS } from './stickman-actions/utils';

export default function Stickman() {
  const [posX, setX] = useState(200);
  const [direction, setDirection] = useState(1);
  const $storeAnimId = useStore(activeAnimationId);

  const [currentAnimId, setCurrentAnimId] = useState($storeAnimId);
  const [phase, setPhase] = useState('walking');
  const [isFirstEntry, setIsFirstEntry] = useState(true);

  const action = useMemo(() => getActiveAction(currentAnimId, phase), [currentAnimId, phase]);

  // Handle changes in store
  useEffect(() => {
    if ($storeAnimId !== currentAnimId) {
      if (action.id !== 'idle' && phase !== 'walking' && phase !== 'exit') {
        const hasExit = action.config.phases?.some(p => p.name === 'exit');
        if (hasExit) {
          setPhase('exit');
          return;
        }
      }
      // If no exit phase or already walking/idle, switch immediately
      setCurrentAnimId($storeAnimId);
      setPhase('walking');
      setIsFirstEntry(true);
    }
  }, [$storeAnimId, currentAnimId, action.id, action.config.phases, phase]);

  // Normal phase transitions
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
      } else if (phase === 'exit') {
        const exitPhase = action.config.phases.find(p => p.name === 'exit');
        timeout = setTimeout(() => {
          setCurrentAnimId($storeAnimId);
          setPhase('walking');
          setIsFirstEntry(true);
        }, exitPhase?.duration || 500);
      } else {
        const currentPhaseIdx = action.config.phases.findIndex(p => p.name === phase);
        if (currentPhaseIdx !== -1) {
          const currentPhase = action.config.phases[currentPhaseIdx];
          const nextPhase = action.config.phases[currentPhaseIdx + 1];
          if (nextPhase && nextPhase.name !== 'exit') { // Don't automatically go into exit
            timeout = setTimeout(() => setPhase(nextPhase.name), currentPhase.duration);
          } else {
            timeout = setTimeout(() => setPhase('walking'), currentPhase.duration);
          }
        }
      }
    }
    return () => clearTimeout(timeout);
  }, [currentAnimId, phase, isFirstEntry, action.id, action.config.phases, $storeAnimId]);

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

  // Helper to compile arm paths
  const getArmAnimate = (side, armData) => {
    const sX = side === 'back' ? 25 : 35;
    const sY = 45;
    if (!armData) {
      return isActuallyWalking ? { d: WALKING_ARMS[side] } : { d: `M ${sX},45 Q ${sX},60 ${sX},75` };
    }
    if (armData.d) return { d: armData.d };
    if (armData.targetX !== undefined && armData.targetY !== undefined) {
      const paths = [];
      const tx = Array.isArray(armData.targetX) ? armData.targetX : [armData.targetX];
      const ty = Array.isArray(armData.targetY) ? armData.targetY : [armData.targetY];
      for (let i = 0; i < tx.length; i++) {
        paths.push(getRubberHosePath(sX, sY, tx[i], ty[i], 60));
      }
      return { d: paths.length === 1 ? paths[0] : paths };
    }
    return isActuallyWalking ? { d: WALKING_ARMS[side] } : { d: `M ${sX},45 Q ${sX},60 ${sX},75` };
  };

  // Helper to compile leg paths
  const getLegAnimate = (side, legData) => {
    const sX = side === 'back' ? 25 : 35;
    const sY = 75;
    if (!legData) {
      return isActuallyWalking ? { d: WALKING_LEGS[side] } : { d: STANDING_LEGS[side] };
    }
    if (legData.d) return { d: legData.d };
    if (legData.targetX !== undefined && legData.targetY !== undefined) {
      const paths = [];
      const tx = Array.isArray(legData.targetX) ? legData.targetX : [legData.targetX];
      const ty = Array.isArray(legData.targetY) ? legData.targetY : [legData.targetY];
      for (let i = 0; i < tx.length; i++) {
        // Leg bend might be different from arm bend, using utility
        paths.push(getRubberHosePath(sX, sY, tx[i], ty[i], 60, -10)); 
      }
      return { d: paths.length === 1 ? paths[0] : paths };
    }
    return isActuallyWalking ? { d: WALKING_LEGS[side] } : { d: STANDING_LEGS[side] };
  };

  return (
    <div className="fixed bottom-0 left-0 w-full h-32 pointer-events-none z-[5] overflow-visible">
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
          {/* Custom Back Assets (rendered behind the body) */}
          {action.renderBackAssets && action.renderBackAssets()}

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
                  animate={getArmAnimate('back', limbs?.arms?.back)}
                  transition={limbs?.arms?.transition || { duration: walkDuration, repeat: isActuallyWalking ? Infinity : 0, ease: "linear" }}
                  fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-slate-400 dark:text-slate-500 opacity-50"
                />
                <motion.path
                  animate={getArmAnimate('front', limbs?.arms?.front)}
                  transition={limbs?.arms?.transition || { duration: walkDuration, repeat: isActuallyWalking ? Infinity : 0, ease: "linear" }}
                  fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-slate-700 dark:text-slate-300" />
              </>
            )}

            {/* Custom Action Assets (Body level) */}
            {action.renderAssets && action.renderAssets()}
          </motion.g>

          {/* LEGS Group - No vertical bobbing, always grounded at y=100 */}
          {!action.config.hideLegs && (
            <g>
              <motion.path
                animate={getLegAnimate('back', limbs?.legs?.back)}
                transition={limbs?.legs?.transition || { duration: walkDuration, repeat: isActuallyWalking ? Infinity : 0, ease: "linear" }}
                fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-slate-400 dark:text-slate-500 opacity-50"
              />
              <motion.path
                animate={getLegAnimate('front', limbs?.legs?.front)}
                transition={limbs?.legs?.transition || { duration: walkDuration, repeat: isActuallyWalking ? Infinity : 0, ease: "linear" }}
                fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-slate-700 dark:text-slate-300"
              />
            </g>
          )}
        </motion.svg>
      </motion.div>
    </div>
  );
}