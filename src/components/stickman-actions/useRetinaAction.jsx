import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function useRetinaAction(phase) {
  const isEquipping = phase === 'equipVR';
  const isReading = phase === 'readChart';
  const isExiting = phase === 'exit';
  
  const showHeadset = isEquipping || isReading || isExiting;
  const showChart = isReading;

  return {
    id: 'retina-resolution',
    config: {
      isWalking: phase === 'walking',
      isBobbing: phase === 'walking',
      showHeadset: showHeadset, // Let stickman hide eyes
      walkBreakDuration: 5000,
      stopDuration: 500,
      phases: [
        { name: 'equipVR', duration: 1000 },
        { name: 'readChart', duration: 15000 },
        { name: 'exit', duration: 800 }
      ]
    },
    getLimbs: () => {
      if (isEquipping) {
        return {
          head: { y: 18, rotate: 0 },
          arms: {
            back: { targetX: 25, targetY: 15 },
            front: { targetX: 35, targetY: 15 },
            transition: { duration: 0.8, ease: "easeOut" }
          }
        };
      }
      
      if (isReading) {
        return {
          head: {
            y: 18,
            rotate: [-5, 5, -2, 2, -5],
            transition: { rotate: { duration: 8, repeat: Infinity, ease: "easeInOut" } }
          },
          arms: {
            back: { targetX: 20, targetY: 60 }, // resting
            front: { targetX: [70, 75, 68, 70], targetY: [30, 25, 35, 30] }, // pointing
            transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
          }
        };
      }

      if (isExiting) {
        return {
          head: { y: 18, rotate: 0 },
          arms: {
            back: { targetX: 25, targetY: 15 },
            front: { targetX: 35, targetY: 15 },
            transition: { duration: 0.5 }
          }
        };
      }

      return null;
    },
    renderHeadAssets: () => (
      <AnimatePresence>
        {showHeadset && (
          <motion.g 
            key="headset"
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: isExiting ? -30 : -8, opacity: isExiting ? 0 : 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ x: -2 }}
          >
            {/* Sleek Retina VR Headset */}
            <rect x="-2" y="-2" width="24" height="14" rx="6" fill="white" stroke="currentColor" strokeWidth="2.5" className="dark:fill-slate-900" />
            <path d="M 0,5 L 20,5" stroke="currentColor" strokeWidth="1" className="text-indigo-400 opacity-50" />
            <circle cx="20" cy="5" r="1.5" fill="currentColor" className="text-indigo-500" />
            <path d="M -2,7 Q -12,7 -15,4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </motion.g>
        )}
      </AnimatePresence>
    ),
    renderAssets: (direction) => (
      <AnimatePresence>
        {showChart && (
          <motion.g
            key="eye-chart"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ duration: 0.8, ease: "backOut" }}
          >
            {/* Floating Eye Chart */}
            <g transform="translate(130, 5)">
              <g transform={direction === -1 ? "translate(50, 0) scale(-1, 1)" : ""}>
                <rect x="0" y="0" width="50" height="70" rx="4" fill="white" stroke="currentColor" strokeWidth="2" className="dark:fill-slate-900" />
                {/* Eye Chart Letters */}
                <text x="25" y="20" fontSize="16" fontFamily="sans-serif" fontWeight="900" textAnchor="middle" fill="currentColor">E</text>
                <text x="25" y="32" fontSize="10" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle" fill="currentColor" letterSpacing="2">F P</text>
                <text x="25" y="42" fontSize="7" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle" fill="currentColor" letterSpacing="1">T O Z</text>
                <text x="25" y="50" fontSize="5" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle" fill="currentColor" letterSpacing="1">L P E D</text>
                <text x="25" y="58" fontSize="4" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle" fill="currentColor" letterSpacing="0.5">P E C F D</text>
                <line x1="10" y1="62" x2="40" y2="62" stroke="currentColor" strokeWidth="0.5" className="text-red-500" />
                <text x="25" y="67" fontSize="3" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle" fill="currentColor">E D F C Z P</text>
                
                {/* Digital Glow/Grid behind the chart to emphasize VR */}
                <rect x="-5" y="-5" width="60" height="80" rx="6" fill="none" stroke="currentColor" strokeWidth="1" className="text-indigo-500 opacity-20" strokeDasharray="2 2" />
              </g>
            </g>

            {/* Laser Pointer line from empty hand to chart */}
            <motion.line 
              animate={{
                x1: [70, 75, 68, 70],
                y1: [30, 25, 35, 30],
                opacity: [0.2, 0.8, 0.2]
              }}
              x2="135" y2="35"
              stroke="currentColor" 
              strokeWidth="1.5" 
              className="text-indigo-400 mix-blend-screen"
              transition={{ 
                x1: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                y1: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                opacity: { duration: 1.5, repeat: Infinity }
              }}
            />
          </motion.g>
        )}
      </AnimatePresence>
    )
  };
}
