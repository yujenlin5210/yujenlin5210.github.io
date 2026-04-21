import { motion } from 'framer-motion';

export function useMarioKartAction(phase) {
  const isDriving = phase === 'driving';
  
  return {
    id: 'mario-kart',
    config: {
      isWalking: phase === 'walking',
      isBobbing: phase === 'walking',
      hideBody: isDriving,
      hideArms: isDriving,
      hideLegs: isDriving,
      showHeadset: isDriving, // Hide the stickman's eye when driving
      walkBreakDuration: 4000,
      stopDuration: 500,
      phases: [
        { name: 'driving', duration: 10000 }
      ]
    },
    getLimbs: () => {
      if (!isDriving) return null;
      return {
        head: {
          y: [28, 26.5, 28.5, 27, 28], // More aggressive jitter
          rotate: [0, -8, 8, 0],
          transition: { 
            rotate: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            y: { duration: 0.08, repeat: Infinity, ease: "linear" }
          }
        }
      };
    },
    renderHeadAssets: () => (
      isDriving && (
        <g transform="translate(0, 0)">
          {/* Helmet Outer Shell */}
          <path d="M -18,0 A 18,18 0 1,1 18,0 L 18,5 Q 18,15 0,15 Q -18,15 -18,5 Z" fill="white" stroke="currentColor" strokeWidth="2" className="dark:fill-slate-900" />
          {/* Visor */}
          <path d="M 5,-5 L 18,-5 L 18,5 L 5,5 Z" fill="currentColor" className="text-slate-800 dark:text-slate-200" />
          {/* Logo Circle on the side */}
          <circle cx="-6" cy="-5" r="5" fill="white" stroke="currentColor" strokeWidth="1.5" className="dark:fill-slate-950" />
          {/* Simplified "M" */}
          <path d="M -8,-3 L -8,-7 L -6,-5 L -4,-7 L -4,-3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )
    ),
    renderAssets: () => (
      <>
        {isDriving && (
          <motion.g
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: [0, -1.5, 0.5, -1, 0] }} // More aggressive car jitter
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ 
              opacity: { duration: 0.5 },
              scale: { duration: 0.5 },
              y: { duration: 0.08, repeat: Infinity, ease: "linear" }
            }}
          >
            {/* F1-style Mario Kart - Re-centered and raised to sit on the browser edge */}
            <g transform="translate(-15, 22) scale(1.3)">
              {/* Chassis (Bottom edge raised to y=52 to create ground gap) */}
              <path 
                d="M 0,35 L 15,35 L 20,20 L 60,20 L 65,35 L 85,35 L 85,45 L 85,52 L 0,52 L 0,45 Z" 
                fill="white" stroke="currentColor" strokeWidth="2" className="dark:fill-slate-950 text-slate-700 dark:text-slate-300" 
              />
              
              {/* Wings and details */}
              <path d="M 0,35 L -5,15 L 10,15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              {/* Front Wing (Triangular) */}
              <path d="M 85,52 L 98,52 L 85,42 Z" fill="white" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="dark:fill-slate-950 text-slate-700 dark:text-slate-300" />
              
              {/* Engine Exhaust vibration effect */}
              <motion.path 
                d="M -5,42 L -15,42 M -5,45 L -12,45" 
                animate={{ x: [-2, 2, -2], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.1, repeat: Infinity }}
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" 
              />

              {/* REAR WHEEL - Grounded at y=60 (group bottom) */}
              <motion.g 
                animate={{ rotate: 360 }}
                transition={{ duration: 0.4, repeat: Infinity, ease: "linear" }}
                style={{ x: 12, y: 50 }} 
              >
                <circle cx="0" cy="0" r="10" fill="white" stroke="currentColor" strokeWidth="2" className="dark:fill-slate-950" />
                <line x1="-10" y1="0" x2="10" y2="0" stroke="currentColor" strokeWidth="1" />
                <line x1="0" y1="-10" x2="0" y2="10" stroke="currentColor" strokeWidth="1" />
              </motion.g>

              {/* FRONT WHEEL - Grounded at y=60 (group bottom) */}
              <motion.g 
                animate={{ rotate: 360 }}
                transition={{ duration: 0.4, repeat: Infinity, ease: "linear" }}
                style={{ x: 72, y: 52 }} 
              >
                <circle cx="0" cy="0" r="8" fill="white" stroke="currentColor" strokeWidth="2" className="dark:fill-slate-950" />
                <line x1="-8" y1="0" x2="8" y2="0" stroke="currentColor" strokeWidth="1" />
                <line x1="0" y1="-8" x2="0" y2="8" stroke="currentColor" strokeWidth="1" />
              </motion.g>
            </g>
          </motion.g>
        )}
      </>
    )
  };
}
