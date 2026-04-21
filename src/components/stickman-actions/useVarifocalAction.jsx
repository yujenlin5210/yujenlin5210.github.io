import { motion } from 'framer-motion';

export function useVarifocalAction(phase) {
  const vDuration = 6;
  const vTime = [0, 0.35, 0.5, 0.85, 1];
  
  // Hand/Car positions (relative to stickman's internal 0,0)
  const vX = [60, 60, 95, 95, 60];
  const vY = [45, 40, 55, 50, 45];

  const isInspecting = phase === 'inspecting';
  const showHeadset = phase === 'donning' || phase === 'inspecting' || phase === 'doffing';
  const showCar = phase === 'inspecting';

  return {
    id: 'varifocal',
    config: {
      isWalking: phase === 'walking',
      isBobbing: phase === 'walking',
      showHeadset: showHeadset, // NEW: Controls eye visibility in Stickman.jsx
      walkBreakDuration: 6000,
      stopDuration: 600,
      phases: [
        { name: 'donning', duration: 1000 },
        { name: 'inspecting', duration: 12000 },
        { name: 'doffing', duration: 1500 }
      ]
    },
    getLimbs: () => {
      if (!isInspecting) return null;
      
      return {
        head: {
          y: 18, // Stable height
          rotate: [10, 0, 20, 15, 10],
          transition: { 
            rotate: { duration: vDuration, times: vTime, repeat: Infinity, ease: "easeInOut" },
            y: { duration: 0.5 }
          }
        },
        arms: {
          back: { targetX: vX, targetY: vY },
          front: { targetX: vX, targetY: vY },
          transition: { duration: vDuration, times: vTime, repeat: Infinity, ease: "easeInOut" }
        }
      };
    },
    renderHeadAssets: () => (
      <>
        {showHeadset && (
          <motion.g
            key="headset"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: -8, opacity: phase === 'doffing' ? 0 : 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{ x: -2 }} // Center relative to head circle (0,0)
          >
            <rect x="0" y="0" width="22" height="16" rx="4" fill="white" stroke="currentColor" strokeWidth="2.5" className="dark:fill-slate-900" />
            <path d="M 0,8 Q -10,8 -15,5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </motion.g>
        )}
      </>
    ),
    renderAssets: () => (
      <>
        {/* F1 Toy Car */}
        {showCar && (
          <motion.g
            initial={{ opacity: 0, scale: 0.5, y: 80 }}
            animate={{ opacity: 1, scale: 1, x: vX, y: vY }}
            transition={{ 
              opacity: { duration: 0.4 },
              scale: { duration: 0.4 },
              x: { duration: vDuration, times: vTime, repeat: Infinity, ease: "easeInOut" },
              y: { duration: vDuration, times: vTime, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            <g transform="rotate(-45) translate(-15, -12) scale(0.7)">
              <path d="M 0,10 L 10,10 L 15,5 L 25,5 L 35,8 L 45,8 L 45,12 L 0,12 Z" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-700 dark:text-slate-300" />
              <path d="M 0,10 L 0,5 L 5,5" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M 40,12 L 50,12" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="8" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="38" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
            </g>
          </motion.g>
        )}
      </>
    )
  };
}
