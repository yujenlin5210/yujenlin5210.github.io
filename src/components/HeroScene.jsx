import { Suspense, lazy } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const HeroSceneCanvas = lazy(() => import('./HeroSceneCanvas.jsx'));

function HeroSceneFallback() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(99,102,241,0.28),transparent_42%),radial-gradient(circle_at_50%_80%,rgba(15,23,42,0.12),transparent_55%)] dark:bg-[radial-gradient(circle_at_50%_45%,rgba(129,140,248,0.22),transparent_40%),radial-gradient(circle_at_50%_80%,rgba(2,6,23,0.32),transparent_55%)]" />
      <div className="absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-400/20 bg-indigo-500/10 blur-3xl" />
      <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-400/25" />
    </div>
  );
}

export default function HeroScene() {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion) {
    return <HeroSceneFallback />;
  }

  return (
    <Suspense fallback={<HeroSceneFallback />}>
      <HeroSceneCanvas />
    </Suspense>
  );
}
