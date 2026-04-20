import { useState, useEffect, useCallback, useRef } from 'react';

export function useWakeLock() {
  const [isLocked, setIsLocked] = useState(false);
  const wakeLockRef = useRef(null);
  const releaseHandlerRef = useRef(null);
  const shouldBeLockedRef = useRef(false);
  const isMountedRef = useRef(false);
  const isRequestPendingRef = useRef(false);
  const requestIdRef = useRef(0);

  const detachReleaseListener = useCallback((lock = wakeLockRef.current) => {
    if (lock && releaseHandlerRef.current) {
      lock.removeEventListener('release', releaseHandlerRef.current);
    }
    releaseHandlerRef.current = null;
  }, []);

  const requestWakeLock = useCallback(async () => {
    shouldBeLockedRef.current = true;

    if (typeof navigator === 'undefined' || typeof document === 'undefined') {
      return;
    }

    if (document.visibilityState !== 'visible') {
      return;
    }

    if (!('wakeLock' in navigator)) {
      return;
    }

    if (wakeLockRef.current || isRequestPendingRef.current) {
      return;
    }

    isRequestPendingRef.current = true;
    const requestId = ++requestIdRef.current;

    try {
      const lock = await navigator.wakeLock.request('screen');

      if (
        !isMountedRef.current ||
        !shouldBeLockedRef.current ||
        requestId !== requestIdRef.current
      ) {
        try {
          await lock.release();
        } catch {
          // Ignore failures while tearing down a stale request.
        }
        return;
      }

      detachReleaseListener();

      const handleRelease = () => {
        if (wakeLockRef.current === lock) {
          wakeLockRef.current = null;
        }
        detachReleaseListener(lock);
        if (isMountedRef.current) {
          setIsLocked(false);
        }
      };

      releaseHandlerRef.current = handleRelease;
      wakeLockRef.current = lock;
      lock.addEventListener('release', handleRelease);

      if (isMountedRef.current) {
        setIsLocked(true);
      }
    } catch (err) {
      if (requestId === requestIdRef.current && isMountedRef.current) {
        setIsLocked(false);
      }
      if (err?.name !== 'AbortError') {
        console.error(`Wake Lock error: ${err.name}, ${err.message}`);
      }
    } finally {
      isRequestPendingRef.current = false;
    }
  }, [detachReleaseListener]);

  const releaseWakeLock = useCallback(async () => {
    shouldBeLockedRef.current = false;
    requestIdRef.current += 1;

    const lock = wakeLockRef.current;
    detachReleaseListener(lock);
    wakeLockRef.current = null;

    if (isMountedRef.current) {
      setIsLocked(false);
    }

    if (lock) {
      try {
        await lock.release();
      } catch {
        // Ignore failures while releasing a stale sentinel.
      }
    }
  }, [detachReleaseListener]);

  useEffect(() => {
    isMountedRef.current = true;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && shouldBeLockedRef.current) {
        void requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      shouldBeLockedRef.current = false;
      requestIdRef.current += 1;
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      const lock = wakeLockRef.current;
      detachReleaseListener(lock);
      wakeLockRef.current = null;

      if (lock) {
        lock.release().catch(() => {});
      }
    };
  }, [detachReleaseListener, requestWakeLock]);

  return { isLocked, requestWakeLock, releaseWakeLock };
}
