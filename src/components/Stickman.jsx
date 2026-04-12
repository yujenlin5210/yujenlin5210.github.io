import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@nanostores/react';
import { activeProjectId } from '../store/projectStore';

export default function Stickman() {
  const [posX, setX] = useState(200); // Represents the CENTER of the stickman
  const [direction, setDirection] = useState(1);
  const $activeId = useStore(activeProjectId);

  const isVarifocalProject = $activeId === '2023-08-01-bsv';
  const [phase, setPhase] = useState('walking');
  const [isFirstEntry, setIsFirstEntry] = useState(true);

  // Reset logic when scrolling away
  useEffect(() => {
    if (!isVarifocalProject) {
      setIsFirstEntry(true);
      setPhase('walking');
    }
  }, [isVarifocalProject]);

  // State Machine for Varifocal Cycle
  useEffect(() => {
    let timeout;
    if (isVarifocalProject) {
      if (phase === 'walking') {
        if (isFirstEntry) {
          setPhase('stopping');
          setIsFirstEntry(false);
        } else {
          timeout = setTimeout(() => setPhase('stopping'), 6000);
        }
      } else if (phase === 'stopping') {
        timeout = setTimeout(() => setPhase('donning'), 600);
      } else if (phase === 'donning') {
        timeout = setTimeout(() => setPhase('inspecting'), 1000);
      } else if (phase === 'inspecting') {
        timeout = setTimeout(() => setPhase('doffing'), 12000);
      } else if (phase === 'doffing') {
        timeout = setTimeout(() => setPhase('walking'), 1500);
      }
    }
    return () => clearTimeout(timeout);
  }, [isVarifocalProject, phase, isFirstEntry]);

  const isActuallyWalking = phase === 'walking';
  const isInspecting = phase === 'inspecting';
  const showHeadset = phase === 'donning' || phase === 'inspecting';
  const showCar = phase === 'inspecting';

  // Boundary-aware Movement
  useEffect(() => {
    const move = () => {
      setX(prev => {
        if (!isActuallyWalking) return prev;
        
        const speed = 1.2;
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
  }, [direction, isActuallyWalking]);

  const walkDuration = 0.8;
  const vDuration = 6;
  const vTime = [0, 0.35, 0.5, 0.85, 1];
  
  // Varifocal Positions - Scaled back for shorter arms (0.8x)
  const vX = [62, 62, 92, 92, 62]; 
  const vY = [45, 40, 55, 50, 45];

  const getArmPath = (sX, sY, tX, tY) => {
    const dx = tX - sX;
    const dy = tY - sY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const armLen = 60; // 0.8x of previous 75
    const bendBase = Math.sqrt(Math.max(0, (armLen * armLen) - (dist * dist))) / 1.5;
    const minimumBend = 8; 
    const bend = bendBase + minimumBend;
    const midX = (sX + tX) / 2;
    const midY = (sY + tY) / 2;
    return `M ${sX},${sY} Q ${midX},${midY + bend} ${tX},${tY}`;
  };

  const walkArmsFront = ["M 35,45 Q 30,60 25,75", "M 35,45 Q 35,60 35,75", "M 35,45 Q 50,60 55,75", "M 35,45 Q 35,60 35,75", "M 35,45 Q 30,60 25,75"];
  const walkArmsBack = ["M 25,45 Q 30,60 35,75", "M 25,45 Q 25,60 25,75", "M 25,45 Q 10,60 5,75", "M 25,45 Q 25,60 25,75", "M 25,45 Q 30,60 35,75"];

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
          {/* Person Group - Vertical bounce ONLY when walking */}
          <motion.g
            animate={isActuallyWalking ? { y: [0, -4, 0] } : { y: 0 }}
            transition={{ duration: walkDuration / 2, repeat: isActuallyWalking ? Infinity : 0, ease: "easeInOut" }}
          >
            {/* Body */}
            <rect x="18" y="30" width="24" height="45" rx="12" fill="white" stroke="currentColor" strokeWidth="2.5" className="dark:fill-slate-950 text-slate-700 dark:text-slate-300" />
            
            {/* Head Group */}
            <motion.g 
              style={{ x: 30, y: 18 }}
              animate={isInspecting ? { rotate: [10, 0, 20, 15, 10] } : { rotate: [-5, 5, -5] }}
              transition={isInspecting ? { duration: vDuration, times: vTime, repeat: Infinity, ease: "easeInOut" } : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <circle cx="0" cy="0" r="16" fill="white" stroke="currentColor" strokeWidth="2.5" className="dark:fill-slate-950 text-slate-700 dark:text-slate-300" />
              
              <AnimatePresence mode='wait'>
                {!showHeadset && (
                  <motion.circle 
                    key="eye"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    cx="8" cy="-2" r="1.5" fill="currentColor" className="text-slate-700 dark:text-slate-300" 
                  />
                )}
                {showHeadset && (
                  <motion.g 
                    key="headset"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: -8, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    style={{ x: -2 }}
                  >
                    <rect x="0" y="0" width="22" height="16" rx="4" fill="white" stroke="currentColor" strokeWidth="2.5" className="dark:fill-slate-900" />
                    <path d="M 0,8 Q -10,8 -15,5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </motion.g>
                )}
              </AnimatePresence>
            </motion.g>

            {/* Arms */}
            <motion.path
              animate={isInspecting ? { d: vX.map((x, i) => getArmPath(25, 45, x, vY[i])) } : (!isActuallyWalking ? { d: "M 25,45 Q 25,60 25,75" } : { d: walkArmsBack })}
              transition={isInspecting ? { duration: vDuration, times: vTime, repeat: Infinity, ease: "easeInOut" } : { duration: walkDuration, repeat: isActuallyWalking ? Infinity : 0, ease: "linear" }}
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-slate-400 dark:text-slate-500 opacity-50"
            />
            <motion.path
              animate={isInspecting ? { d: vX.map((x, i) => getArmPath(35, 45, x, vY[i])) } : (!isActuallyWalking ? { d: "M 35,45 Q 35,60 35,75" } : { d: walkArmsFront })}
              transition={isInspecting ? { duration: vDuration, times: vTime, repeat: Infinity, ease: "easeInOut" } : { duration: walkDuration, repeat: isActuallyWalking ? Infinity : 0, ease: "linear" }}
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-slate-700 dark:text-slate-300" />

            {/* F1 Toy Car - Synchronized and properly positioned */}
            <motion.g
              animate={{ 
                opacity: showCar ? 1 : 0,
                scale: showCar ? 1 : 0.5,
                x: showCar ? vX : 70,
                y: showCar ? vY : 80 
              }}
              transition={{ 
                opacity: { duration: 0.4 },
                scale: { duration: 0.4 },
                x: showCar ? { duration: vDuration, times: vTime, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4 },
                y: showCar ? { duration: vDuration, times: vTime, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4 }
              }}
            >
              <g transform="rotate(-45) translate(-22, -12) scale(0.7)">
                <path d="M 0,10 L 10,10 L 15,5 L 25,5 L 35,8 L 45,8 L 45,12 L 0,12 Z" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-700 dark:text-slate-300" />
                <path d="M 0,10 L 0,5 L 5,5" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M 40,12 L 50,12" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="8" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="38" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
              </g>
            </motion.g>
          </motion.g>

          {/* LEGS Group - No vertical bobbing, always grounded */}
          <g>
            <motion.path
              animate={isActuallyWalking ? { 
                d: ["M 25,75 Q 15,85 10,100", "M 25,75 Q 25,85 25,100", "M 25,75 Q 35,85 40,100", "M 25,75 Q 25,85 25,100", "M 25,75 Q 15,85 10,100"] 
              } : { d: "M 25,75 L 25,100" }}
              transition={{ duration: walkDuration, repeat: isActuallyWalking ? Infinity : 0, ease: "linear" }}
              fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-slate-400 dark:text-slate-500 opacity-50"
            />
            <motion.path
              animate={isActuallyWalking ? { 
                d: ["M 35,75 Q 45,85 50,100", "M 35,75 Q 35,85 35,100", "M 35,75 Q 25,85 20,100", "M 35,75 Q 35,85 35,100", "M 35,75 Q 45,85 50,100"] 
              } : { d: "M 35,75 L 35,100" }}
              transition={{ duration: walkDuration, repeat: isActuallyWalking ? Infinity : 0, ease: "linear" }}
              fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-slate-700 dark:text-slate-300"
            />
          </g>
        </motion.svg>
      </motion.div>
    </div>
  );
}
