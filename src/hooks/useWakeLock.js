import { useState, useEffect, useCallback, useRef } from 'react';

export function useWakeLock() {
  const [isLocked, setIsLocked] = useState(false);
  const wakeLockRef = useRef(null);
  const shouldBeLocked = useRef(false);

  const requestWakeLock = useCallback(async () => {
    shouldBeLocked.current = true;
    
    if (!('wakeLock' in navigator)) {
      console.warn('Wake Lock API not supported. Are you running on HTTPS?');
      return;
    }

    try {
      if (wakeLockRef.current) return;
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
    shouldBeLocked.current = false;
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (err) {
        // ignore
      }
      wakeLockRef.current = null;
      setIsLocked(false);
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      // Re-acquire the wake lock if the page becomes visible again
      if (document.visibilityState === 'visible' && shouldBeLocked.current) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Clean up the wake lock when the component unmounts
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [requestWakeLock]);

  return { isLocked, requestWakeLock, releaseWakeLock };
}
