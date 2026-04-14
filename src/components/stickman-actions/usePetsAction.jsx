import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function usePetsAction(phase) {
  const isObserving = phase === 'observing';
  const isExiting = phase === 'exit';

  return {
    id: 'secret-pets',
    config: {
      isWalking: phase === 'walking',
      isBobbing: phase === 'walking',
      showHeadset: false,
      walkBreakDuration: 5000,
      stopDuration: 500,
      phases: [
        { name: 'observing', duration: 15000 },
        { name: 'exit', duration: 800 }
      ]
    },
    getLimbs: () => {
      if (isObserving) {
        return {
          head: {
            y: 18,
            rotate: [-20, 20, -20, 20], // Looking left and right
            transition: { rotate: { duration: 4, repeat: Infinity, ease: "easeInOut" } }
          },
          arms: {
            back: { targetX: 20, targetY: 55 }, // resting
            front: { targetX: 30, targetY: 55 }, // resting
            transition: { duration: 0.5, ease: "easeOut" }
          }
        };
      }
      
      if (isExiting) {
        return {
          head: { y: 18, rotate: 0 },
          arms: {
            back: { targetX: 25, targetY: 45 },
            front: { targetX: 35, targetY: 45 },
            transition: { duration: 0.5 }
          }
        };
      }

      return null;
    },
    renderHeadAssets: () => null,
    renderAssets: (direction) => (
      <AnimatePresence>
        {isObserving && (
          <motion.g
            key="pets-group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* The Dog (Positioned behind stickman) */}
            <g transform="translate(-50, 80)">
              <motion.g 
                animate={{ y: [0, -5, 0], rotate: [0, -5, 0, 5, 0] }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
              >
                {/* Dog Body */}
                <rect x="-10" y="-10" width="30" height="20" rx="8" fill="white" stroke="currentColor" strokeWidth="2.5" className="dark:fill-slate-900" />
                {/* Dog Head */}
                <circle cx="20" cy="-15" r="12" fill="white" stroke="currentColor" strokeWidth="2.5" className="dark:fill-slate-900" />
                {/* Dog Snout */}
                <rect x="25" y="-15" width="10" height="10" rx="5" fill="white" stroke="currentColor" strokeWidth="2.5" className="dark:fill-slate-900" />
                {/* Dog Nose */}
                <circle cx="34" cy="-12" r="2" fill="currentColor" />
                {/* Dog Eye */}
                <circle cx="22" cy="-18" r="1.5" fill="currentColor" />
                {/* Dog Ear */}
                <path d="M 12,-20 Q 5,-25 8,-10" fill="white" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="dark:fill-slate-900 text-slate-700 dark:text-slate-300" />
                {/* Dog Tail */}
                <motion.path 
                  d="M -10,-5 Q -20,-10 -15,-20" 
                  fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" 
                  animate={{ rotate: [0, 20, 0, -10, 0] }}
                  transition={{ duration: 0.2, repeat: Infinity }}
                  style={{ originX: "-10px", originY: "-5px" }}
                />
                {/* Dog Legs */}
                <line x1="-5" y1="10" x2="-5" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="5" y1="10" x2="5" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="15" y1="10" x2="15" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />

                {/* Bark Bubble */}
                <motion.g
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1, 1, 0.8], y: [0, -10, -10, -20] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                  transform="translate(30, -35)"
                >
                  <path d="M 0,0 Q -5,-10 5,-15 Q 20,-20 30,-10 Q 35,0 20,5 Q 10,10 0,0 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400" />
                  <text x="15" y="-5" fontSize="8" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle" fill="currentColor" transform={direction === -1 ? "scale(-1, 1) translate(-30, 0)" : ""}>WOOF!</text>
                </motion.g>
              </motion.g>
            </g>

            {/* The Cat (Positioned in front of stickman) */}
            <g transform="translate(110, 85)">
              <motion.g 
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              >
                {/* Cat Body */}
                <path d="M -10,0 Q 0,-15 10,0 Z" fill="white" stroke="currentColor" strokeWidth="2" className="dark:fill-slate-900" />
                <rect x="-10" y="0" width="20" height="15" fill="white" stroke="none" className="dark:fill-slate-900" />
                <path d="M -10,0 L -10,15 M 10,0 L 10,15" fill="none" stroke="currentColor" strokeWidth="2" />
                
                {/* Cat Head */}
                <circle cx="-5" cy="-10" r="8" fill="white" stroke="currentColor" strokeWidth="2" className="dark:fill-slate-900" />
                {/* Cat Ears */}
                <path d="M -10,-15 L -12,-22 L -5,-16 M 0,-16 L 2,-22 L -2,-15" fill="white" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="dark:fill-slate-900" />
                {/* Cat Eye */}
                <circle cx="-8" cy="-10" r="1" fill="currentColor" />
                {/* Cat Tail */}
                <motion.path 
                  d="M 10,5 Q 25,5 20,-10" 
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  animate={{ rotate: [0, 10, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  style={{ originX: "10px", originY: "5px" }}
                />

                {/* Meow Bubble */}
                <motion.g
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1, 1, 0.8], y: [0, -10, -10, -20] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5, repeatDelay: 1.5 }}
                  transform="translate(-15, -30)"
                >
                  <path d="M 0,0 Q 5,-10 -5,-15 Q -20,-20 -30,-10 Q -35,0 -20,5 Q -10,10 0,0 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400" />
                  <text x="-15" y="-5" fontSize="8" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle" fill="currentColor" transform={direction === -1 ? "scale(-1, 1) translate(30, 0)" : ""}>meow</text>
                </motion.g>
              </motion.g>
            </g>
          </motion.g>
        )}
      </AnimatePresence>
    )
  };
}
