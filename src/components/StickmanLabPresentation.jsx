import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import StickmanPreview from './StickmanPreview.jsx';

const sections = [
  {
    id: 'intro',
    animationId: 'idle',
    content: () => (
      <>
        <p className="text-xl md:text-2xl font-light leading-relaxed text-slate-600 dark:text-slate-300">
          In this lab session, we explore the engineering behind the interactive Stickman companion that roams the bottom of the screen. We wanted to build a character that felt alive, reacted to the page content, and was easily extensible for future projects.
        </p>
      </>
    )
  },
  {
    id: 'registry',
    title: 'The Action Registry Architecture',
    animationId: 'idle',
    content: () => (
      <>
        <p>To support a wide variety of animations without cluttering a single component, we decoupled the logic into custom hooks. A central <strong>Action Registry</strong> maps animation IDs to these hooks.</p>
        
        <div className="my-6 p-4 bg-slate-900 rounded-xl font-mono text-xs md:text-sm shadow-inner border border-white/10">
          <div className="flex gap-2 mb-2 opacity-50">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="ml-2 text-[10px] uppercase tracking-widest">registry.js</span>
          </div>
          <div className="text-indigo-300">const ActionRegistry = {'{'}</div>
          <div className="pl-4 text-slate-300">
            <div>"varifocal": useVarifocalAction,</div>
            <div>"mario-kart": useMarioKartAction,</div>
            <div>"idle": useIdleAction</div>
          </div>
          <div className="text-indigo-300">{'}'};</div>
        </div>

        <p>Notice the <strong>Action Registry</strong> monitor attached to the Stickman at the bottom of your screen. As you scroll, the system dynamically swaps the active module based on this mapping.</p>
      </>
    )
  },
  {
    id: 'ik',
    title: '"Rubber Hose" Inverse Kinematics (IK)',
    animationId: 'varifocal',
    content: () => (
      <>
        <p>Instead of manually generating SVG paths for every frame of every animation, the system uses a generalized Inverse Kinematics (IK) math function. The custom hooks simply return <code>targetX</code> and <code>targetY</code> coordinates for the hands and feet.</p>
        <p>The component compiles these coordinates into a quadratic bezier (<code>Q</code>) curve on the fly. The math ensures that the "elbows" and "knees" always point in the correct direction based on the distance between the joint and the target, providing that classic, bouncy "Rubber Hose" animation style.</p>
      </>
    )
  },
  {
    id: 'z-layering',
    title: 'Z-Layering and Custom Assets',
    animationId: 'mario-kart',
    content: () => (
      <>
        <p>Certain animations require the Stickman to wear or interact with objects. We implemented a robust Z-Layering hook system to render assets in relation to the Stickman's SVG body:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><code>renderBackAssets()</code>: Renders elements behind the body (e.g., backpacks, vehicles).</li>
          <li><code>renderAssets()</code>: Renders elements in front of the body (e.g., held items).</li>
          <li><code>renderHeadAssets()</code>: Renders elements attached specifically to the head group so they inherit head bobbing and rotation.</li>
        </ul>
      </>
    )
  },
  {
    id: 'interruptions',
    title: 'Graceful Interruptions',
    animationId: 'idle',
    content: (activeAnimation, setActiveAnimation) => (
      <>
        <p>Navigating through the site means the Stickman frequently needs to switch contexts. Our internal state machine intercepts changes to the active animation ID.</p>
        <p>If an action defines an <code>exit</code> or <code>interrupted</code> phase, the state machine plays that exit sequence before seamlessly transitioning to the new action, preventing jarring cuts or sudden teleportation of limbs.</p>
        
        <div className="mt-8 p-6 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Try Manual Transitions</p>
          <div className="flex flex-wrap gap-3">
            {['idle', 'varifocal', 'mario-kart'].map(id => (
              <button
                key={id}
                onClick={() => setActiveAnimation(id)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                  activeAnimation === id 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {id === 'idle' ? 'Idle' : id === 'varifocal' ? 'Varifocal' : 'Mario Kart'}
              </button>
            ))}
          </div>
        </div>
      </>
    )
  }
];

function Section({ section, index, activeAnimation, setActiveAnimation, setActiveSectionIndex }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { amount: 0.5 }); // Trigger when 50% visible

  useEffect(() => {
    if (isInView) {
      setActiveAnimation(section.animationId);
      setActiveSectionIndex(index);
    }
  }, [isInView, section.animationId, index, setActiveAnimation, setActiveSectionIndex]);

  return (
    <motion.div 
      ref={ref}
      className={`${index === 0 ? 'min-h-[40vh] pt-10 pb-20' : 'min-h-[70vh] py-20'} flex flex-col justify-center`}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ amount: 0.3 }}
      transition={{ duration: 0.6 }}
    >
      {section.title && <h2 className="text-3xl md:text-5xl font-bold mb-8 text-slate-900 dark:text-white">{section.title}</h2>}
      <div className="prose prose-lg dark:prose-invert prose-indigo prose-p:leading-relaxed">
        {section.content(activeAnimation, setActiveAnimation)}
      </div>
    </motion.div>
  );
}

export default function StickmanLabPresentation() {
  const [activeAnimation, setActiveAnimation] = useState('idle');
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  return (
    <div className="relative w-full">
      {/* Sections Container */}
      <div className="relative z-10 pb-64">
        {sections.map((section, index) => (
          <Section 
            key={section.id} 
            section={section} 
            index={index}
            activeAnimation={activeAnimation}
            setActiveAnimation={setActiveAnimation}
            setActiveSectionIndex={setActiveSectionIndex}
          />
        ))}
      </div>

      {/* Fixed Stickman at the Bottom with Registry Inspector */}
      <div className="fixed bottom-0 left-0 w-full z-50 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/90 dark:from-slate-950 dark:via-slate-950/90 to-transparent" />
        
        {/* Registry Inspector - technical badge that follows the stickman concept */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
        >
          <div className="px-3 py-1 bg-slate-900/80 dark:bg-white/10 backdrop-blur-sm rounded-full flex items-center gap-2 border border-white/10 shadow-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono text-white/70 uppercase tracking-widest">Action Registry:</span>
            <span className="text-[10px] font-mono text-indigo-400 font-bold">"{activeAnimation}"</span>
          </div>
        </motion.div>

        <StickmanPreview animationId={activeAnimation} variant="fixed" />
      </div>
    </div>
  );
}
