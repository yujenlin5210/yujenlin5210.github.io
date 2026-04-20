import { useState, useEffect, useCallback, useRef } from 'react';

export function useWakeLock(isActive) {
  const [isLocked, setIsLocked] = useState(false);
  const wakeLockRef = useRef(null);

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) {
      console.warn('Wake Lock API not supported in this browser.');
      return;
    }

    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
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
    if (isActive) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isActive, requestWakeLock, releaseWakeLock]);

  return { isLocked, requestWakeLock, releaseWakeLock };
}
