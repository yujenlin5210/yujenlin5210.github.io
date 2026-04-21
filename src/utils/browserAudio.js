export function getAudioContextConstructor() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.AudioContext || window.webkitAudioContext || null;
}

export function isIOSPlaybackDevice() {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(userAgent) || (/Mac/.test(userAgent) && navigator.maxTouchPoints > 1);
}
