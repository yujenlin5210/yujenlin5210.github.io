import { useState, useEffect, useCallback, useRef } from 'react';

export function useWakeLock() {
  const [isLocked, setIsLocked] = useState(false);
  const wakeLockRef = useRef(null);
  const shouldBeLockedRef = useRef(false);

  const requestWakeLock = useCallback(async () => {
    shouldBeLockedRef.current = true;
    if (!('wakeLock' in navigator)) {
      console.warn('Wake Lock API not supported in this browser.');
      return;
    }

    try {
      if (wakeLockRef.current) {
        return; // Already locked
      }
      const lock = await navigator.wakeLock.request('screen');
      wakeLockRef.current = lock;
      setIsLocked(true);
      console.log('Screen Wake Lock is active');

      lock.addEventListener('release', () => {
        setIsLocked(false);
        wakeLockRef.current = null;
        console.log('Screen Wake Lock was released');
      });
    } catch (err) {
      console.error(`Wake Lock error: ${err.name}, ${err.message}`);
      setIsLocked(false);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    shouldBeLockedRef.current = false;
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (err) {
        // ignore
      }
      wakeLockRef.current = null;
      setIsLocked(false);
      console.log('Screen Wake Lock explicitly released');
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      // Re-acquire the wake lock if it should be locked and we just became visible
      if (document.visibilityState === 'visible' && shouldBeLockedRef.current) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [requestWakeLock]);

  return { isLocked, requestWakeLock, releaseWakeLock };
}
