import { motion, AnimatePresence } from 'framer-motion';

export function useTiramisuAction(phase) {
  const isInspecting = phase === 'inspecting';
  const showHeadset = phase === 'donning' || phase === 'inspecting' || phase === 'doffing';

  // Animation timing
  const loopDuration = 6;
  const vTime = [0, 0.4, 0.6, 1];

  return {
    id: 'tiramisu',
    config: {
      isWalking: phase === 'walking',
      isBobbing: phase === 'walking',
      showHeadset: showHeadset,
      walkBreakDuration: 6000,
      stopDuration: 600,
      phases: [
        { name: 'donning', duration: 1000 },
        { name: 'inspecting', duration: 10000 },
        { name: 'doffing', duration: 1200 }
      ]
    },
    getLimbs: () => {
      if (!isInspecting) return null;
      
      return {
        head: {
          y: 22, // Lean down a bit
          rotate: [25, 40, 30, 35], // Looking down sharply at the flower
          transition: { 
            rotate: { duration: loopDuration, times: vTime, repeat: Infinity, ease: "easeInOut" },
            y: { duration: 0.5 }
          }
        }
      };
    },
    renderHeadAssets: () => (
      <AnimatePresence>
        {showHeadset && (
          <motion.g 
            key="headset"
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: phase === 'doffing' ? -30 : -8, opacity: phase === 'doffing' ? 0 : 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{ x: -2 }}
          >
            {/* Tiramisu Prototype: Handheld/Binocular look but "worn" */}
            <rect x="0" y="0" width="22" height="15" rx="4" fill="white" stroke="currentColor" strokeWidth="2.5" className="dark:fill-slate-900" />
            <path d="M 0,7 Q -10,7 -15,4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </motion.g>
        )}
      </AnimatePresence>
    ),
    renderAssets: () => (
      <AnimatePresence>
        {isInspecting && (
          <motion.g
            key="tiramisu-scene"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* The Bright Sun (HDR Test) - Positioning via style to avoid transform override */}
            <motion.g style={{ x: -40, y: -100 }}>
              <motion.circle 
                r="35" 
                fill="currentColor" 
                className="text-white"
                animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                style={{ filter: 'blur(12px)' }}
              />
              <circle r="18" fill="white" />
              {/* Sun Rays */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
                <motion.line 
                  key={deg}
                  x1="0" y1="22" x2="0" y2="40"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  transform={`rotate(${deg})`}
                  animate={{ y2: [40, 50, 40], opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              ))}
            </motion.g>

            {/* The Flower (Hyperrealistic Detail Test) - Positioning via style */}
            <motion.g 
              style={{ x: 80, y: 95 }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
            >
              <path d="M 0,0 Q -2,-10 0,-20" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500" />
              <path d="M 0,-10 Q -8,-12 -5,-16 Q -2,-14 0,-10" fill="currentColor" className="text-emerald-600" />
              <path d="M 0,-12 Q 8,-14 5,-18 Q 2,-16 0,-12" fill="currentColor" className="text-emerald-600" />
              <motion.g 
                style={{ y: -22 }}
                animate={{ rotate: [-5, 5, -5] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                {[0, 60, 120, 180, 240, 300].map(deg => (
                  <ellipse 
                    key={deg}
                    cx="0" cy="6" rx="4" ry="7"
                    fill="currentColor"
                    className="text-rose-400"
                    transform={`rotate(${deg})`}
                    style={{ originX: "0px", originY: "0px" }}
                  />
                ))}
                <circle r="4" fill="currentColor" className="text-yellow-400" />
              </motion.g>
            </motion.g>

            {/* HDR Light Shafts */}
            <motion.path 
              d="M -40,-100 L 80,95" 
              stroke="white" 
              strokeWidth="60" 
              className="opacity-10"
              style={{ filter: 'blur(30px)' }}
            />
          </motion.g>
        )}
      </AnimatePresence>
    )
  };
}
