import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import StickmanPreview from './StickmanPreview.jsx';

const sections = [
  {
    id: 'intro',
    animationId: 'idle',
    content: (
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
    content: (
      <>
        <p>To support a wide variety of animations for different projects without cluttering a single React component, we decoupled the animation logic into custom hooks (e.g., <code>useVarifocalAction</code>, <code>useMarioKartAction</code>).</p>
        <p>By standardizing the interface (<code>config</code>, <code>getLimbs()</code>, <code>renderAssets()</code>), the core <code>Stickman.jsx</code> remains clean and agnostic to the actual animation being played.</p>
        <p>A central registry maps an <code>animation</code> string defined in a project's Markdown frontmatter directly to the corresponding action hook.</p>
      </>
    )
  },
  {
    id: 'ik',
    title: '"Rubber Hose" Inverse Kinematics (IK)',
    animationId: 'varifocal',
    content: (
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
    content: (
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
    content: (
      <>
        <p>Navigating through the site means the Stickman frequently needs to switch contexts. Our internal state machine intercepts changes to the active animation ID.</p>
        <p>If an action defines an <code>exit</code> or <code>interrupted</code> phase, the state machine plays that exit sequence before seamlessly transitioning to the new action, preventing jarring cuts or sudden teleportation of limbs.</p>
      </>
    )
  }
];

function Section({ section, index, setActiveAnimation, setActiveSectionIndex }) {
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
      className="min-h-screen flex flex-col justify-center py-20"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ amount: 0.3 }}
      transition={{ duration: 0.6 }}
    >
      {section.title && <h2 className="text-3xl md:text-5xl font-bold mb-8 text-slate-900 dark:text-white">{section.title}</h2>}
      <div className="prose prose-lg dark:prose-invert prose-indigo prose-p:leading-relaxed">
        {section.content}
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
      <div className="relative z-10 pb-48">
        {sections.map((section, index) => (
          <Section 
            key={section.id} 
            section={section} 
            index={index}
            setActiveAnimation={setActiveAnimation}
            setActiveSectionIndex={setActiveSectionIndex}
          />
        ))}
      </div>

      {/* Floating Action Registry Tag */}
      {activeSectionIndex > 0 && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed top-1/2 right-6 -translate-y-1/2 z-40 hidden xl:flex flex-col items-end gap-2"
        >
          <div className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">Action Registry</div>
          <div className="px-4 py-2 bg-indigo-600 text-white rounded-full font-mono text-sm font-bold shadow-lg shadow-indigo-500/20">
            {`"${activeAnimation}"`}
          </div>
        </motion.div>
      )}

      {/* Fixed Stickman at the Bottom */}
      <div className="fixed bottom-0 left-0 w-full z-50 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 dark:from-slate-950 dark:via-slate-950/80 to-transparent" />
        <StickmanPreview animationId={activeAnimation} variant="fixed" />
      </div>
    </div>
  );
}
