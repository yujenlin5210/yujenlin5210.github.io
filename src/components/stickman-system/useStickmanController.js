import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyHeadsetTransitionChannels,
  blendChannels,
  buildHeadsetPropTransition,
  evaluateStickmanClip,
  getTransitionDurationMs,
} from './clips';
import { evaluateStickmanRig } from './rig';

function easeInOutCubic(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - ((-2 * value + 2) ** 3) / 2;
}

function buildDriver(params, enteredAt) {
  return {
    ...params,
    enteredAt,
    signature: JSON.stringify(params),
  };
}

export function useStickmanController({
  clipId,
  facingId,
  bodyYaw,
  propId,
  tempo,
  intensity,
  transitionSoftness,
  reducedMotion,
}) {
  const [clock, setClock] = useState(0);
  const clockRef = useRef(0);
  const startTimeRef = useRef(null);
  const [currentDriver, setCurrentDriver] = useState(() =>
    buildDriver(
      {
        clipId,
        facingId,
        bodyYaw,
        propId,
        tempo,
        intensity,
      },
      0
    )
  );
  const currentDriverRef = useRef(currentDriver);
  const [transition, setTransition] = useState({
    fromDriver: null,
    startAt: 0,
    duration: 0,
  });

  useEffect(() => {
    currentDriverRef.current = currentDriver;
  }, [currentDriver]);

  useEffect(() => {
    if (reducedMotion) {
      setClock(0);
      clockRef.current = 0;
      startTimeRef.current = null;
      setTransition({
        fromDriver: null,
        startAt: 0,
        duration: 0,
      });
      return undefined;
    }

    let animationFrameId = 0;

    const tick = (time) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = time;
      }

      const elapsed = time - startTimeRef.current;
      clockRef.current = elapsed;
      startTransition(() => {
        setClock(elapsed);
      });
      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [reducedMotion]);

  useEffect(() => {
    const nextParams = {
      clipId,
      facingId,
      bodyYaw,
      propId,
      tempo,
      intensity,
    };
    const nextSignature = JSON.stringify(nextParams);
    const previousDriver = currentDriverRef.current;

    if (previousDriver.signature === nextSignature) {
      return;
    }

    const now = reducedMotion ? 0 : clockRef.current;
    const nextEnteredAt = previousDriver.clipId === clipId ? previousDriver.enteredAt : now;
    const nextDriver = buildDriver(nextParams, nextEnteredAt);
    const duration = reducedMotion
      ? 0
      : getTransitionDurationMs({
          fromClipId: previousDriver.clipId,
          toClipId: clipId,
          fromFacingId: previousDriver.facingId,
          toFacingId: facingId,
          fromPropId: previousDriver.propId,
          toPropId: propId,
          transitionSoftness,
        });

    setTransition({
      fromDriver: previousDriver,
      startAt: now,
      duration,
    });
    setCurrentDriver(nextDriver);
  }, [bodyYaw, clipId, facingId, intensity, propId, reducedMotion, tempo, transitionSoftness]);

  const output = useMemo(() => {
    const activeClock = reducedMotion ? 0 : clock;
    const current = evaluateStickmanClip({
      clipId: currentDriver.clipId,
      bodyYaw: currentDriver.bodyYaw,
      tempo: currentDriver.tempo,
      intensity: currentDriver.intensity,
      timeMs: activeClock - currentDriver.enteredAt,
      reducedMotion,
    });

    let blendProgress = 1;
    let fromDriver = null;
    let fromDebug = null;
    let displayChannels = current.channels;
    let headsetPropTransition = null;

    if (transition.fromDriver && transition.duration > 0) {
      blendProgress = Math.min(Math.max((activeClock - transition.startAt) / transition.duration, 0), 1);

      if (blendProgress < 1) {
        fromDriver = transition.fromDriver;
        const previous = evaluateStickmanClip({
          clipId: fromDriver.clipId,
          bodyYaw: fromDriver.bodyYaw,
          tempo: fromDriver.tempo,
          intensity: fromDriver.intensity,
          timeMs: activeClock - fromDriver.enteredAt,
          reducedMotion,
        });
        fromDebug = previous.debug;
        displayChannels = blendChannels(previous.channels, current.channels, easeInOutCubic(blendProgress));
        headsetPropTransition = buildHeadsetPropTransition({
          fromPropId: fromDriver.propId,
          toPropId: currentDriver.propId,
          progress: easeInOutCubic(blendProgress),
        });
      }
    }

    if (headsetPropTransition) {
      displayChannels = applyHeadsetTransitionChannels(displayChannels, headsetPropTransition);
    }

    return {
      projected: evaluateStickmanRig(displayChannels),
      currentDebug: current.debug,
      previousDebug: fromDebug,
      transition: {
        isActive: Boolean(fromDriver),
        progress: blendProgress,
        fromClipId: fromDriver?.clipId || null,
        toClipId: currentDriver.clipId,
        fromFacingId: fromDriver?.facingId || null,
        toFacingId: currentDriver.facingId,
        fromPropId: fromDriver?.propId || null,
        toPropId: currentDriver.propId,
        duration: transition.duration,
      },
      attachments: {
        previousPropId: fromDriver?.propId || currentDriver.propId,
        currentPropId: currentDriver.propId,
        blendProgress,
        headsetPropTransition,
        bodyYaw: displayChannels.bodyYaw,
      },
      activeState: {
        clipId: currentDriver.clipId,
        facingId: currentDriver.facingId,
        propId: currentDriver.propId,
      },
    };
  }, [clock, currentDriver, reducedMotion, transition]);

  return output;
}
