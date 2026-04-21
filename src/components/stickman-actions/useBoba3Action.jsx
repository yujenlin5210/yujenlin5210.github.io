import { motion } from 'framer-motion';

export function useBoba3Action(phase) {
  // We turn the stickman to face us during these phases!
  const isFrontFacing = phase === 'donning' || phase === 'inspecting' || phase === 'doffing';
  const isInspecting = phase === 'inspecting';
  const showHeadset = isFrontFacing;

  // Duration for the inspecting loop
  const loopDuration = 2; // Faster, more frantic pace

  const leftArmDonning = "M 18,45 Q 0,40 -15,10";
  const leftArmInspecting = "M 18,45 Q 0,50 -25,45"; // Pointing straight left
  
  const rightArmDonning = "M 42,45 Q 60,40 75,10";
  const rightArmInspecting = "M 42,45 Q 60,50 85,45"; // Pointing straight right

  // Rapid random shooting:
  // Left shoots at 10%, 40%, 70% of the loop
  const lBoltTimes = [0, 0.1, 0.15, 0.2, 0.4, 0.45, 0.5, 0.7, 0.75, 0.8, 1];

  // Right shoots at 20%, 60%, 80% of the loop
  const rBoltTimes = [0, 0.2, 0.25, 0.3, 0.6, 0.65, 0.7, 0.8, 0.85, 0.9, 1];

  // Head twitches slightly
  const headTimes = [0, 0.2, 0.4, 0.6, 0.8, 1];
  const headRotate = [0, -10, 15, -5, 10, 0];

  return {
    id: 'boba3',
    config: {
      isWalking: phase === 'walking',
      isBobbing: phase === 'walking',
      showHeadset: showHeadset, // hides default profile eye
      hideArms: isFrontFacing,  // Hide profile arms
      hideLegs: isFrontFacing,  // Hide profile legs
      walkBreakDuration: 6000,
      stopDuration: 600,
      phases: [
        { name: 'donning', duration: 1000 },
        { name: 'inspecting', duration: 8000 },
        { name: 'doffing', duration: 1000 }
      ]
    },
    getLimbs: () => {
      if (!isFrontFacing) return null;
      return {
        head: {
          y: 18,
          // Tilting head side to side rapidly
          rotate: isInspecting ? headRotate : 0,
          transition: {
            rotate: { duration: loopDuration, times: headTimes, ease: "easeInOut", repeat: Infinity },
            y: { duration: 0.5 }
          }
        }
      };
    },
    renderHeadAssets: () => (
      <>
        {showHeadset && (
          <motion.g
            key="headset"
            initial={{ y: -20, opacity: 0, scale: 0.8 }}
            animate={{ y: -4, opacity: phase === 'doffing' ? 0 : 1, scale: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.5, type: "spring" }}
            style={{ x: 0 }} // Center relative to head circle (0,0)
          >
            {/* Straps wrapping to the back */}
            <path d="M -16,-2 Q -24,-2 -24,2" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-slate-800 dark:text-slate-900" />
            <path d="M 16,-2 Q 24,-2 24,2" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-slate-800 dark:text-slate-900" />

            {/* Display Housing Outline (Diving Goggle Shape) with nose cutout */}
            <path 
              d="M -8,-8 
                 L 8,-8 
                 Q 16,-8 16,2 
                 Q 16,12 8,12 
                 Q 5,12 3,8 
                 Q 0,6 -3,8 
                 Q -5,12 -8,12 
                 Q -16,12 -16,2 
                 Q -16,-8 -8,-8 Z"
              fill="white" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              className="dark:fill-slate-950 text-slate-700 dark:text-slate-300" 
              strokeLinejoin="round" 
            />
          </motion.g>
        )}
      </>
    ),
    renderAssets: () => (
      <>
        {isFrontFacing && (
          <g className="text-slate-700 dark:text-slate-300">
            {/* Front facing Legs */}
            <path d="M 24,74 L 20,100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M 36,74 L 40,100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />

            {/* Front facing Left Arm & Gun */}
            <motion.g>
              <motion.path
                initial={{ d: leftArmDonning }}
                animate={{ d: isInspecting ? leftArmInspecting : leftArmDonning }}
                transition={{ duration: 0.5 }}
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              />
              {/* Left Gun */}
              {isInspecting && (
                <motion.g 
                  style={{ x: -25, y: 45 }}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.2, type: "spring" }}
                >
                  <g>
                    {/* Barrel pointing left: left tip is at -14 */}
                    <rect x="-14" y="-4" width="16" height="6" rx="2" fill="white" stroke="currentColor" strokeWidth="2" className="dark:fill-slate-900" />
                    <rect x="-2" y="2" width="4" height="8" rx="1" fill="white" stroke="currentColor" strokeWidth="2" className="dark:fill-slate-900" />
                  </g>
                  
                  {/* Left Laser Blast */}
                  <motion.rect
                    x="-20" y="-2" width="12" height="2" rx="1"
                    fill="#ef4444"
                    animate={{
                      x: [0, -80, -80, 0, -80, -80, 0, -80, -80, 0, 0], // CSS translation relative to x=-20
                      opacity: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
                      scaleX: [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0]
                    }}
                    transition={{ duration: loopDuration, times: lBoltTimes, ease: "linear", repeat: Infinity }}
                    style={{ originX: 1, filter: 'blur(1px)' }}
                  />
                </motion.g>
              )}
            </motion.g>

            {/* Front facing Right Arm & Gun */}
            <motion.g>
              <motion.path
                initial={{ d: rightArmDonning }}
                animate={{ d: isInspecting ? rightArmInspecting : rightArmDonning }}
                transition={{ duration: 0.5 }}
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              />
              {/* Right Gun */}
              {isInspecting && (
                <motion.g 
                  style={{ x: 85, y: 45 }}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.2, type: "spring" }}
                >
                  <g>
                    {/* Barrel pointing right: right tip is at 14 */}
                    <rect x="-2" y="-4" width="16" height="6" rx="2" fill="white" stroke="currentColor" strokeWidth="2" className="dark:fill-slate-900" />
                    <rect x="-2" y="2" width="4" height="8" rx="1" fill="white" stroke="currentColor" strokeWidth="2" className="dark:fill-slate-900" />
                  </g>
                  
                  {/* Right Laser Blast */}
                  <motion.rect
                    x="8" y="-2" width="12" height="2" rx="1"
                    fill="#3b82f6"
                    animate={{
                      x: [0, 80, 80, 0, 80, 80, 0, 80, 80, 0, 0], // CSS translation relative to x=8
                      opacity: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
                      scaleX: [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0]
                    }}
                    transition={{ duration: loopDuration, times: rBoltTimes, ease: "linear", repeat: Infinity }}
                    style={{ originX: 0, filter: 'blur(1px)' }}
                  />
                </motion.g>
              )}
            </motion.g>
          </g>
        )}
      </>
    )
  };
}
