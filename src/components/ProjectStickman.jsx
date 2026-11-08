import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { activeAnimationId } from '../store/projectStore';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import TrimStage from './trim-stickman/TrimStage.jsx';
import { PROJECT_SCENES } from './trim-stickman/engine.js';

// After each showing of a project's scene the figure turns back to normal and
// walks for a while, then plays the scene again.
const WALK_BREAK = 5.5; // seconds of walking (sim time)

/**
 * The /projects roaming figure (trim-path engine). The project in view sets
 * `activeAnimationId` (its frontmatter `animation`), which picks the scene.
 *
 * Event based: the scene plays until the sim reports its ending event
 * (`debug.ended`, e.g. the Demogorgon has turned to ash), then the figure walks
 * for WALK_BREAK seconds of sim time, then the scene starts again. Sim time
 * pauses with the stage (hidden tab, off screen), so nothing drifts.
 */
export default function ProjectStickman() {
  const reduced = usePrefersReducedMotion();
  const animationId = useStore(activeAnimationId);
  const projectScene = PROJECT_SCENES[animationId] || null;
  const [walking, setWalking] = useState(false);

  // A new project starts straight into its scene.
  useEffect(() => {
    setWalking(false);
  }, [projectScene]);

  const scene = projectScene && !walking ? projectScene : 'walk';

  const onFrame = useCallback(
    (debug) => {
      if (!projectScene || debug.scene !== scene) return;
      if (!walking && debug.ended) setWalking(true);
      if (walking && debug.sceneT >= WALK_BREAK) setWalking(false);
    },
    [projectScene, scene, walking],
  );

  if (reduced) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[5]">
      <div className="absolute bottom-0 h-px w-full bg-slate-300 opacity-30 dark:bg-slate-800" />
      <TrimStage
        className="h-40 w-full"
        scene={scene}
        scale={1}
        groundRatio={0.84}
        roam
        onFrame={onFrame}
        ariaLabel="Stick figure acting out the project in view"
      />
    </div>
  );
}
