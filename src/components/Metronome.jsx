import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Plus, Minus, Save, Trash2, Volume2, VolumeX } from 'lucide-react';
import { useWakeLock } from '../hooks/useWakeLock';
import { getAudioContextConstructor, isIOSPlaybackDevice } from '../utils/browserAudio';

const DEFAULT_BPM_SHORTCUTS = Object.freeze([60, 80, 90, 100, 120]);
const DEFAULT_TS_SHORTCUTS = Object.freeze([
  { b: 1, n: 4 },
  { b: 2, n: 4 },
  { b: 3, n: 4 },
  { b: 4, n: 4 },
  { b: 6, n: 8 },
]);
const VALID_NOTE_VALUES = new Set([1, 2, 4, 8, 16, 32]);
const MIN_BPM = 20;
const MAX_BPM = 300;
const MAX_BEATS_PER_BAR = 32;
const MAX_VOLUME = 5;
const NOTE_DURATION = 0.1;
const LOOKAHEAD_MS = 25;
const HIDDEN_LOOKAHEAD_MS = 250;
const SCHEDULE_AHEAD_TIME = 0.1;
const HIDDEN_SCHEDULE_AHEAD_TIME = 1.5;
const MAX_QUEUED_VISUAL_NOTES = 128;
const SILENT_AUDIO_SRC =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getAccentType(beatIndex, beatsPerBar, noteValue) {
  if (beatIndex === 0) {
    return 'primary';
  }

  const isCompoundMeter =
    noteValue >= 8 &&
    beatsPerBar > 3 &&
    beatsPerBar % 3 === 0;

  if (isCompoundMeter && beatIndex % 3 === 0) {
    return 'secondary';
  }

  return 'normal';
}

function readLocalStorage(key) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key, value) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in private browsing or restricted environments.
  }
}

function normalizeBpmShortcuts(value) {
  if (!Array.isArray(value)) {
    return [...DEFAULT_BPM_SHORTCUTS];
  }

  const normalized = [...new Set(
    value
      .map(entry => Number(entry))
      .filter(Number.isFinite)
      .map(entry => Math.round(entry))
      .filter(entry => entry >= MIN_BPM && entry <= MAX_BPM)
  )].sort((a, b) => a - b);

  return normalized;
}

function normalizeTsShortcuts(value) {
  if (!Array.isArray(value)) {
    return [...DEFAULT_TS_SHORTCUTS];
  }

  const seen = new Set();
  const normalized = [];

  for (const entry of value) {
    const beats = Math.round(Number(entry?.b));
    const note = Math.round(Number(entry?.n));

    if (
      Number.isFinite(beats) &&
      Number.isFinite(note) &&
      beats >= 1 &&
      beats <= MAX_BEATS_PER_BAR &&
      VALID_NOTE_VALUES.has(note)
    ) {
      const key = `${beats}/${note}`;
      if (!seen.has(key)) {
        seen.add(key);
        normalized.push({ b: beats, n: note });
      }
    }
  }

  return normalized.length > 0 ? normalized : [...DEFAULT_TS_SHORTCUTS];
}

function loadInitialVolume() {
  const saved = readLocalStorage('metronome-volume');
  const parsed = Number(saved);
  return Number.isFinite(parsed) ? clamp(parsed, 0, MAX_VOLUME) : 0.8;
}

function loadInitialMuted() {
  return readLocalStorage('metronome-muted') === 'true';
}

function loadInitialBpmShortcuts() {
  const saved = readLocalStorage('metronome-shortcuts');

  if (!saved) {
    return [...DEFAULT_BPM_SHORTCUTS];
  }

  try {
    return normalizeBpmShortcuts(JSON.parse(saved));
  } catch {
    return [...DEFAULT_BPM_SHORTCUTS];
  }
}

function loadInitialTsShortcuts() {
  const saved = readLocalStorage('metronome-ts-shortcuts');

  if (!saved) {
    return [...DEFAULT_TS_SHORTCUTS];
  }

  try {
    return normalizeTsShortcuts(JSON.parse(saved));
  } catch {
    return [...DEFAULT_TS_SHORTCUTS];
  }
}

function isMobilePlaybackDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const coarsePointer = window.matchMedia?.('(hover: none) and (pointer: coarse)').matches ?? false;
  const userAgent = navigator.userAgent || '';
  return coarsePointer || /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
}

export default function Metronome() {
  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [noteValue, setNoteValue] = useState(4);
  const [beatsPerBarInput, setBeatsPerBarInput] = useState('4');
  const [noteValueInput, setNoteValueInput] = useState('4');
  const [volume, setVolume] = useState(loadInitialVolume);
  const [isMuted, setIsMuted] = useState(loadInitialMuted);
  const [shortcuts, setShortcuts] = useState(loadInitialBpmShortcuts);
  const [tsShortcuts, setTsShortcuts] = useState(loadInitialTsShortcuts);
  const [visualBeat, setVisualBeat] = useState(-1);

  const { requestWakeLock, releaseWakeLock } = useWakeLock();

  const audioContextRef = useRef(null);
  const masterGainRef = useRef(null);
  const silentAudioRef = useRef(null);
  const nextNoteTimeRef = useRef(0);
  const currentBeatInBarRef = useRef(0);
  const timerIdRef = useRef(null);
  const noteQueueRef = useRef([]);
  const noteQueueHeadRef = useRef(0);
  const animationRef = useRef(null);
  const lastNoteDrawnRef = useRef(-1);
  const isPlayingRef = useRef(false);
  const isPageVisibleRef = useRef(true);
  const transportRunIdRef = useRef(0);
  const scheduledNotesRef = useRef(new Set());
  const isMobileDeviceRef = useRef(false);
  const useSilentAudioWorkaroundRef = useRef(false);

  const bpmRef = useRef(bpm);
  const beatsPerBarRef = useRef(beatsPerBar);
  const noteValueRef = useRef(noteValue);
  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    beatsPerBarRef.current = beatsPerBar;
  }, [beatsPerBar]);

  useEffect(() => {
    setBeatsPerBarInput(String(beatsPerBar));
  }, [beatsPerBar]);

  useEffect(() => {
    noteValueRef.current = noteValue;
  }, [noteValue]);

  useEffect(() => {
    setNoteValueInput(String(noteValue));
  }, [noteValue]);

  useEffect(() => {
    volumeRef.current = clamp(volume, 0, MAX_VOLUME);
  }, [volume]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    writeLocalStorage('metronome-volume', clamp(volume, 0, MAX_VOLUME).toString());
    writeLocalStorage('metronome-muted', isMuted.toString());
  }, [volume, isMuted]);

  useEffect(() => {
    writeLocalStorage('metronome-shortcuts', JSON.stringify(shortcuts));
  }, [shortcuts]);

  useEffect(() => {
    writeLocalStorage('metronome-ts-shortcuts', JSON.stringify(tsShortcuts));
  }, [tsShortcuts]);

  const flushVisualQueue = useCallback(() => {
    noteQueueRef.current = [];
    noteQueueHeadRef.current = 0;
    lastNoteDrawnRef.current = -1;
  }, []);

  const resetVisualizer = useCallback(() => {
    flushVisualQueue();
    setVisualBeat(-1);
  }, [flushVisualQueue]);

  const clearSchedulerLoop = useCallback(() => {
    if (timerIdRef.current !== null) {
      window.clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
  }, []);

  const clearAnimationLoop = useCallback(() => {
    if (animationRef.current !== null) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const stopScheduledNotes = useCallback(() => {
    scheduledNotesRef.current.forEach(({ osc, noteGain }) => {
      osc.onended = null;

      try {
        osc.stop(0);
      } catch {
        // Ignore nodes that are already stopped.
      }

      try {
        osc.disconnect();
      } catch {
        // Ignore disconnect failures during teardown.
      }

      try {
        noteGain.disconnect();
      } catch {
        // Ignore disconnect failures during teardown.
      }
    });

    scheduledNotesRef.current.clear();
  }, []);

  const updateMasterGain = useCallback(() => {
    const context = audioContextRef.current;
    const masterGain = masterGainRef.current;

    if (!context || !masterGain || context.state === 'closed') {
      return;
    }

    const now = context.currentTime;
    const nextGain = isMutedRef.current ? 0 : clamp(volumeRef.current, 0, MAX_VOLUME);
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(nextGain, now);
  }, []);

  useEffect(() => {
    updateMasterGain();
  }, [volume, isMuted, updateMasterGain]);

  const ensureAudioEngine = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    if (navigator.audioSession) {
      try {
        navigator.audioSession.type = 'playback';
      } catch {
        // Ignore browsers that expose but do not allow writing audioSession.
      }
    }

    let context = audioContextRef.current;

    if (!context || context.state === 'closed') {
      const AudioContextCtor = getAudioContextConstructor();

      if (!AudioContextCtor) {
        return null;
      }

      context = new AudioContextCtor();
      audioContextRef.current = context;

      const masterGain = context.createGain();
      masterGain.connect(context.destination);
      masterGainRef.current = masterGain;
    }

    updateMasterGain();
    return context;
  }, [updateMasterGain]);

  const ensureSilentAudio = useCallback(() => {
    if (!useSilentAudioWorkaroundRef.current) {
      return null;
    }

    if (!silentAudioRef.current) {
      const silentAudio = new Audio(SILENT_AUDIO_SRC);
      silentAudio.loop = true;
      silentAudio.preload = 'auto';
      silentAudio.playsInline = true;
      silentAudioRef.current = silentAudio;
    }

    return silentAudioRef.current;
  }, []);

  const setSilentAudioActive = useCallback((shouldPlay) => {
    const silentAudio = shouldPlay ? ensureSilentAudio() : silentAudioRef.current;

    if (!silentAudio) {
      return;
    }

    if (shouldPlay) {
      void silentAudio.play().catch(() => {});
      return;
    }

    silentAudio.pause();

    try {
      silentAudio.currentTime = 0;
    } catch {
      // Ignore browsers that disallow seeking immediately after pause.
    }
  }, [ensureSilentAudio]);

  const teardownSilentAudio = useCallback(() => {
    const silentAudio = silentAudioRef.current;

    if (!silentAudio) {
      return;
    }

    silentAudio.pause();

    try {
      silentAudio.currentTime = 0;
    } catch {
      // Ignore browsers that disallow seeking immediately after pause.
    }

    silentAudio.removeAttribute('src');
    silentAudio.load();
    silentAudioRef.current = null;
  }, []);

  const queueVisualNote = useCallback((note, time) => {
    if (!isPageVisibleRef.current) {
      return;
    }

    noteQueueRef.current.push({ note, time });

    if (
      noteQueueHeadRef.current > 32 &&
      noteQueueHeadRef.current * 2 >= noteQueueRef.current.length
    ) {
      noteQueueRef.current = noteQueueRef.current.slice(noteQueueHeadRef.current);
      noteQueueHeadRef.current = 0;
    } else if (noteQueueRef.current.length > MAX_QUEUED_VISUAL_NOTES) {
      noteQueueRef.current = noteQueueRef.current.slice(
        Math.max(noteQueueHeadRef.current, noteQueueRef.current.length - 16)
      );
      noteQueueHeadRef.current = 0;
    }
  }, []);

  const nextNote = useCallback(() => {
    const activeBpm = typeof bpmRef.current === 'number' ? bpmRef.current : 100;
    const secondsPerBeat = 60 / activeBpm;

    nextNoteTimeRef.current += secondsPerBeat;
    currentBeatInBarRef.current = (currentBeatInBarRef.current + 1) % beatsPerBarRef.current;
  }, []);

  const scheduleNote = useCallback((beatNumber, time) => {
    queueVisualNote(beatNumber, time);

    const context = audioContextRef.current;
    const masterGain = masterGainRef.current;

    if (!context || !masterGain || context.state === 'closed') {
      return;
    }

    const osc = context.createOscillator();
    const noteGain = context.createGain();
    const scheduledNote = { osc, noteGain };

    scheduledNotesRef.current.add(scheduledNote);

    const cleanupScheduledNote = () => {
      if (!scheduledNotesRef.current.has(scheduledNote)) {
        return;
      }

      scheduledNotesRef.current.delete(scheduledNote);
      osc.onended = null;

      try {
        osc.disconnect();
      } catch {
        // Ignore disconnect failures during teardown.
      }

      try {
        noteGain.disconnect();
      } catch {
        // Ignore disconnect failures during teardown.
      }
    };

    osc.onended = cleanupScheduledNote;
    osc.connect(noteGain);
    noteGain.connect(masterGain);

    const accentType = getAccentType(
      beatNumber,
      beatsPerBarRef.current,
      noteValueRef.current
    );

    if (accentType === 'primary') {
      osc.frequency.value = 880;
      noteGain.gain.setValueAtTime(1, time);
    } else if (accentType === 'secondary') {
      osc.frequency.value = 660;
      noteGain.gain.setValueAtTime(0.8, time);
    } else {
      osc.frequency.value = 440;
      noteGain.gain.setValueAtTime(0.6, time);
    }

    noteGain.gain.exponentialRampToValueAtTime(0.001, time + NOTE_DURATION);

    osc.start(time);
    osc.stop(time + NOTE_DURATION);
  }, [queueVisualNote]);

  const startDrawLoop = useCallback((runId) => {
    clearAnimationLoop();

    if (!isPageVisibleRef.current) {
      return;
    }

    const draw = () => {
      if (
        runId !== transportRunIdRef.current ||
        !isPlayingRef.current ||
        !isPageVisibleRef.current
      ) {
        animationRef.current = null;
        return;
      }

      const context = audioContextRef.current;

      if (!context || context.state === 'closed') {
        animationRef.current = null;
        return;
      }

      let currentNote = lastNoteDrawnRef.current;
      const queue = noteQueueRef.current;
      let head = noteQueueHeadRef.current;
      const currentTime = context.currentTime;

      while (head < queue.length && queue[head].time < currentTime) {
        currentNote = queue[head].note;
        head += 1;
      }

      noteQueueHeadRef.current = head;

      if (head > 32 && head * 2 >= queue.length) {
        noteQueueRef.current = queue.slice(head);
        noteQueueHeadRef.current = 0;
      }

      if (lastNoteDrawnRef.current !== currentNote) {
        lastNoteDrawnRef.current = currentNote;
        setVisualBeat(currentNote);
      }

      animationRef.current = window.requestAnimationFrame(draw);
    };

    animationRef.current = window.requestAnimationFrame(draw);
  }, [clearAnimationLoop]);

  const startSchedulerLoop = useCallback((runId) => {
    clearSchedulerLoop();

    const tick = () => {
      if (runId !== transportRunIdRef.current || !isPlayingRef.current) {
        timerIdRef.current = null;
        return;
      }

      const context = audioContextRef.current;

      if (!context || context.state === 'closed') {
        timerIdRef.current = null;
        return;
      }

      const isHidden = !isPageVisibleRef.current;
      const scheduleWindow = isHidden ? HIDDEN_SCHEDULE_AHEAD_TIME : SCHEDULE_AHEAD_TIME;
      const nextDelay = isHidden ? HIDDEN_LOOKAHEAD_MS : LOOKAHEAD_MS;
      const currentTime = context.currentTime;

      if (nextNoteTimeRef.current < currentTime) {
        nextNoteTimeRef.current = currentTime;
      }

      while (nextNoteTimeRef.current < currentTime + scheduleWindow) {
        scheduleNote(currentBeatInBarRef.current, nextNoteTimeRef.current);
        nextNote();
      }

      timerIdRef.current = window.setTimeout(tick, nextDelay);
    };

    tick();
  }, [clearSchedulerLoop, nextNote, scheduleNote]);

  const startTransport = useCallback(async () => {
    const runId = transportRunIdRef.current + 1;
    transportRunIdRef.current = runId;
    isPlayingRef.current = true;

    const context = ensureAudioEngine();

    if (!context) {
      return;
    }

    setSilentAudioActive(true);
    void requestWakeLock();

    if (context.state !== 'running') {
      try {
        await context.resume();
      } catch {
        // Resume can fail when the browser rejects autoplay-like behavior.
      }
    }

    if (runId !== transportRunIdRef.current || !isPlayingRef.current) {
      return;
    }

    currentBeatInBarRef.current = 0;
    nextNoteTimeRef.current = context.currentTime + 0.05;
    resetVisualizer();

    startSchedulerLoop(runId);

    if (isPageVisibleRef.current) {
      startDrawLoop(runId);
    }
  }, [
    ensureAudioEngine,
    requestWakeLock,
    resetVisualizer,
    setSilentAudioActive,
    startDrawLoop,
    startSchedulerLoop,
  ]);

  const stopTransport = useCallback((options = {}) => {
    const {
      resetVisual = true,
      releaseScreenWakeLock = true,
      pauseSilentAudio = true,
    } = options;

    transportRunIdRef.current += 1;
    isPlayingRef.current = false;

    clearSchedulerLoop();
    clearAnimationLoop();
    stopScheduledNotes();
    flushVisualQueue();

    currentBeatInBarRef.current = 0;
    nextNoteTimeRef.current = 0;

    if (pauseSilentAudio) {
      setSilentAudioActive(false);
    }

    if (releaseScreenWakeLock) {
      void releaseWakeLock();
    }

    if (resetVisual) {
      setVisualBeat(-1);
    }
  }, [
    clearAnimationLoop,
    clearSchedulerLoop,
    flushVisualQueue,
    releaseWakeLock,
    setSilentAudioActive,
    stopScheduledNotes,
  ]);

  useEffect(() => {
    isMobileDeviceRef.current = isMobilePlaybackDevice();
    useSilentAudioWorkaroundRef.current = isIOSPlaybackDevice();
    isPageVisibleRef.current = document.visibilityState === 'visible';

    const prewarmAudioEngine = () => {
      ensureAudioEngine();
    };

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      isPageVisibleRef.current = isVisible;

      if (!isPlayingRef.current) {
        return;
      }

      if (!isVisible) {
        clearAnimationLoop();

        if (isMobileDeviceRef.current) {
          stopTransport();
          setIsPlaying(false);
        } else {
          resetVisualizer();
        }
        return;
      }

      if (isMobileDeviceRef.current) {
        return;
      }

      resetVisualizer();
      startDrawLoop(transportRunIdRef.current);
    };

    const handlePageHide = () => {
      if (!isMobileDeviceRef.current || !isPlayingRef.current) {
        return;
      }

      stopTransport();
      setIsPlaying(false);
    };

    window.addEventListener('pointerdown', prewarmAudioEngine, { once: true, passive: true });
    window.addEventListener('keydown', prewarmAudioEngine, { once: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('pointerdown', prewarmAudioEngine);
      window.removeEventListener('keydown', prewarmAudioEngine);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);

      stopTransport({ resetVisual: false });
      teardownSilentAudio();

      const context = audioContextRef.current;
      audioContextRef.current = null;
      masterGainRef.current = null;

      if (context && context.state !== 'closed') {
        void context.close().catch(() => {});
      }
    };
  }, [clearAnimationLoop, ensureAudioEngine, resetVisualizer, startDrawLoop, stopTransport, teardownSilentAudio]);

  const handlePlayPause = () => {
    const nextPlayingState = !isPlayingRef.current;

    if (nextPlayingState) {
      setIsPlaying(true);
      void startTransport();
      return;
    }

    stopTransport();
    setIsPlaying(false);
  };

  const handleBpmChange = (event) => {
    const nextValue = Number.parseInt(event.target.value, 10);
    setBpm(Number.isNaN(nextValue) ? '' : nextValue);
  };

  const handleBpmBlur = () => {
    let nextValue = Number.parseInt(bpm, 10);

    if (Number.isNaN(nextValue) || nextValue < MIN_BPM) {
      nextValue = MIN_BPM;
    }

    if (nextValue > MAX_BPM) {
      nextValue = MAX_BPM;
    }

    setBpm(nextValue);
  };

  const handleBeatsPerBarChange = (event) => {
    const rawValue = event.target.value;
    if (!/^\d*$/.test(rawValue)) {
      return;
    }

    setBeatsPerBarInput(rawValue);
  };

  const handleBeatsPerBarBlur = () => {
    let nextValue = Number.parseInt(beatsPerBarInput, 10);

    if (Number.isNaN(nextValue) || nextValue < 1) {
      nextValue = 1;
    }

    if (nextValue > MAX_BEATS_PER_BAR) {
      nextValue = MAX_BEATS_PER_BAR;
    }

    setBeatsPerBar(nextValue);

    if (isPlayingRef.current) {
      currentBeatInBarRef.current = 0;
      resetVisualizer();
    }
  };

  const handleNoteValueChange = (event) => {
    const rawValue = event.target.value;
    if (!/^\d*$/.test(rawValue)) {
      return;
    }

    setNoteValueInput(rawValue);
  };

  const handleNoteValueBlur = () => {
    let nextValue = Number.parseInt(noteValueInput, 10);

    if (Number.isNaN(nextValue)) {
      nextValue = noteValue;
    }

    if (!VALID_NOTE_VALUES.has(nextValue)) {
      const fallbackNoteValue = [...VALID_NOTE_VALUES].reduce((closest, candidate) => {
        if (Math.abs(candidate - nextValue) < Math.abs(closest - nextValue)) {
          return candidate;
        }
        return closest;
      }, noteValue);

      nextValue = fallbackNoteValue;
    }

    setNoteValue(nextValue);

    if (isPlayingRef.current) {
      currentBeatInBarRef.current = 0;
      resetVisualizer();
    }
  };

  const saveShortcut = () => {
    if (typeof bpm !== 'number') {
      return;
    }

    setShortcuts(currentShortcuts => normalizeBpmShortcuts([...currentShortcuts, bpm]));
  };

  const removeShortcut = (bpmToRemove) => {
    setShortcuts(currentShortcuts =>
      currentShortcuts.filter(shortcut => shortcut !== bpmToRemove)
    );
  };

  const saveTsShortcut = () => {
    setTsShortcuts(currentShortcuts =>
      normalizeTsShortcuts([...currentShortcuts, { b: beatsPerBar, n: noteValue }])
    );
  };

  const removeTsShortcut = (shortcutToRemove) => {
    setTsShortcuts(currentShortcuts =>
      currentShortcuts.filter(
        shortcut => !(shortcut.b === shortcutToRemove.b && shortcut.n === shortcutToRemove.n)
      )
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 md:p-8 bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 text-white font-mono relative">
      <div className="flex flex-col items-center gap-8">
        <div className="text-center w-full relative pt-2">
          <div className="flex justify-between items-center mb-6 md:mb-0 md:absolute md:-top-2 md:right-0 w-full md:w-auto z-10">
            <h2 className="text-zinc-400 text-xs tracking-widest uppercase md:hidden text-left font-bold">Metronome</h2>
            <div className="flex items-center gap-2 bg-zinc-800/80 p-2 rounded-xl backdrop-blur-sm ml-auto">
              <button
                onClick={() => setIsMuted(currentMuted => !currentMuted)}
                className="text-zinc-400 hover:text-white transition-colors"
                aria-label={isMuted || volume === 0 ? 'Unmute metronome' : 'Mute metronome'}
                aria-pressed={isMuted}
              >
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min="0"
                max={MAX_VOLUME}
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(event) => {
                  const nextVolume = Number.parseFloat(event.target.value);
                  setVolume(Number.isFinite(nextVolume) ? clamp(nextVolume, 0, MAX_VOLUME) : 0);
                  if (isMuted) {
                    setIsMuted(false);
                  }
                }}
                className="w-16 md:w-24 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                aria-label="Metronome volume"
              />
            </div>
          </div>

          <h2 className="text-zinc-400 text-sm tracking-widest uppercase mb-2 hidden md:block">Digital Metronome</h2>

          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center justify-center gap-2 md:gap-4 w-full flex-wrap md:flex-nowrap">
              <div className="flex items-end justify-center gap-2 w-full md:w-auto order-1 md:order-2 mb-2 md:mb-0">
                <span className="text-xl font-bold pb-2 md:pb-3 invisible" aria-hidden="true">BPM</span>

                <input
                  type="number"
                  value={bpm}
                  onChange={handleBpmChange}
                  onBlur={handleBpmBlur}
                  className="w-32 md:w-48 text-center text-6xl md:text-8xl font-black tracking-tighter bg-transparent outline-none text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-400 [&::-webkit-inner-spin-button]:appearance-none focus:scale-105 transition-transform"
                  min={MIN_BPM}
                  max={MAX_BPM}
                  aria-label="Beats per minute"
                />
                <span className="text-xl text-zinc-500 font-bold pb-2 md:pb-3">BPM</span>
              </div>

              <div className="flex justify-center gap-2 order-2 md:order-1 w-[48%] md:w-auto pr-1 md:pr-0">
                <button
                  onClick={() => setBpm(currentBpm => typeof currentBpm === 'number' ? Math.max(MIN_BPM, currentBpm - 5) : MIN_BPM)}
                  className="flex-1 md:flex-none px-3 py-3 md:px-4 md:py-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 transition-colors shrink-0 text-zinc-400 font-bold"
                  aria-label="Decrease BPM by 5"
                >
                  -5
                </button>
                <button
                  onClick={() => setBpm(currentBpm => typeof currentBpm === 'number' ? Math.max(MIN_BPM, currentBpm - 1) : MIN_BPM)}
                  className="flex-1 md:flex-none flex justify-center items-center p-3 md:p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 transition-colors shrink-0 text-zinc-400"
                  aria-label="Decrease BPM"
                >
                  <Minus size={24} />
                </button>
              </div>

              <div className="flex justify-center gap-2 order-3 md:order-3 w-[48%] md:w-auto pl-1 md:pl-0">
                <button
                  onClick={() => setBpm(currentBpm => typeof currentBpm === 'number' ? Math.min(MAX_BPM, currentBpm + 1) : MAX_BPM)}
                  className="flex-1 md:flex-none flex justify-center items-center p-3 md:p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 transition-colors shrink-0 text-zinc-400"
                  aria-label="Increase BPM"
                >
                  <Plus size={24} />
                </button>
                <button
                  onClick={() => setBpm(currentBpm => typeof currentBpm === 'number' ? Math.min(MAX_BPM, currentBpm + 5) : MAX_BPM)}
                  className="flex-1 md:flex-none px-3 py-3 md:px-4 md:py-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 transition-colors shrink-0 text-zinc-400 font-bold"
                  aria-label="Increase BPM by 5"
                >
                  +5
                </button>
              </div>
            </div>

            <input
              type="range"
              min={MIN_BPM}
              max={MAX_BPM}
              value={typeof bpm === 'number' ? bpm : MIN_BPM}
              onChange={handleBpmChange}
              className="w-full max-w-md h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-2"
              aria-label="Adjust BPM"
            />
          </div>
        </div>

        <div className="flex justify-center gap-2 md:gap-4 my-4 w-full h-12 flex-wrap">
          {Array.from({ length: beatsPerBar }).map((_, index) => {
            const isActive = visualBeat === index;
            const accentType = getAccentType(index, beatsPerBar, noteValue);

            return (
              <div
                key={index}
                className={`flex-1 min-w-[0.5rem] rounded-full transition-all duration-75 ${
                  isActive
                    ? accentType === 'primary'
                      ? 'bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)]'
                      : accentType === 'secondary'
                        ? 'bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.7)]'
                        : 'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)]'
                    : 'bg-zinc-800'
                }`}
              />
            );
          })}
        </div>

        <div className="w-full space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-col gap-2 w-full md:w-auto items-center md:items-start">
              <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3">
                <span className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Time Signature</span>
                <div className="flex gap-1 flex-wrap">
                  {tsShortcuts.map(ts => {
                    const isDefault = DEFAULT_TS_SHORTCUTS.some(defaultShortcut => defaultShortcut.b === ts.b && defaultShortcut.n === ts.n);

                    return (
                      <div key={`${ts.b}/${ts.n}`} className="flex bg-zinc-800 rounded overflow-hidden group">
                        <button
                          onClick={() => {
                            setBeatsPerBar(ts.b);
                            setNoteValue(ts.n);

                            if (isPlayingRef.current) {
                              currentBeatInBarRef.current = 0;
                              resetVisualizer();
                            }
                          }}
                          className={`px-2 py-0.5 text-[10px] font-bold transition-colors ${
                            beatsPerBar === ts.b && noteValue === ts.n
                              ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.6)]'
                              : 'text-zinc-400 hover:bg-zinc-700'
                          }`}
                        >
                          {ts.b}/{ts.n}
                        </button>
                        {!isDefault && (
                          <button
                            onClick={() => removeTsShortcut(ts)}
                            className="flex items-center justify-center px-1 bg-zinc-800 hover:bg-rose-500 transition-colors text-zinc-600 hover:text-white"
                            title="Remove shortcut"
                            aria-label={`Remove ${ts.b}/${ts.n} time signature shortcut`}
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <button
                    onClick={saveTsShortcut}
                    disabled={tsShortcuts.some(ts => ts.b === beatsPerBar && ts.n === noteValue)}
                    className="flex items-center justify-center px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add Current Time Signature"
                    aria-label="Save current time signature shortcut"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-2xl font-bold bg-zinc-800 rounded-xl p-2">
                <input
                  type="number"
                  value={beatsPerBarInput}
                  onChange={handleBeatsPerBarChange}
                  onBlur={handleBeatsPerBarBlur}
                  min="1"
                  max={MAX_BEATS_PER_BAR}
                  className="w-12 md:w-16 bg-transparent text-center outline-none focus:text-blue-400 [&::-webkit-inner-spin-button]:appearance-none transition-colors"
                  aria-label="Beats per bar"
                />
                <span className="text-zinc-600">/</span>
                <input
                  type="number"
                  value={noteValueInput}
                  onChange={handleNoteValueChange}
                  onBlur={handleNoteValueBlur}
                  min="1"
                  max="32"
                  className="w-12 md:w-16 bg-transparent text-center outline-none focus:text-emerald-400 [&::-webkit-inner-spin-button]:appearance-none transition-colors"
                  aria-label="Note value"
                />
              </div>
            </div>

            <button
              onClick={handlePlayPause}
              className={`flex items-center justify-center w-20 h-20 shrink-0 rounded-full transition-all shadow-lg hover:scale-105 active:scale-95 ${
                isPlaying
                  ? 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/20'
                  : 'bg-white text-black hover:bg-zinc-200'
              }`}
              aria-label={isPlaying ? 'Pause metronome' : 'Play metronome'}
              aria-pressed={isPlaying}
            >
              {isPlaying ? (
                <Pause size={32} className="text-white fill-current" />
              ) : (
                <Play size={32} className="ml-2 fill-current" />
              )}
            </button>
          </div>
        </div>

        <div className="w-full pt-6 border-t border-zinc-800">
          <div className="flex justify-between items-end mb-3">
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Custom Shortcuts</span>
            <button
              onClick={saveShortcut}
              disabled={typeof bpm !== 'number' || shortcuts.includes(bpm)}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={14} /> Add Current BPM
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {shortcuts.map(shortcutBpm => (
              <div key={shortcutBpm} className="flex bg-zinc-800 rounded-lg overflow-hidden group">
                <button
                  onClick={() => setBpm(shortcutBpm)}
                  className="min-w-[3rem] py-2 px-3 text-sm transition-colors text-zinc-300 font-bold hover:bg-zinc-700"
                >
                  {shortcutBpm}
                </button>
                <button
                  onClick={() => removeShortcut(shortcutBpm)}
                  className="flex items-center justify-center px-2 bg-zinc-800 hover:bg-rose-500 transition-colors text-zinc-600 hover:text-white"
                  title="Remove shortcut"
                  aria-label={`Remove ${shortcutBpm} BPM shortcut`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {shortcuts.length === 0 && (
              <span className="text-sm text-zinc-500 italic py-2">No shortcuts saved. Click "Add Current BPM" to create one.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
