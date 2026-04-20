import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Plus, Minus, Save, Trash2, Volume2, VolumeX } from 'lucide-react';

const defaultTsShortcuts = [{b:1,n:4}, {b:2,n:4}, {b:3,n:4}, {b:4,n:4}, {b:6,n:8}];

export default function Metronome() {
  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [noteValue, setNoteValue] = useState(4);
  const [volume, setVolume] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('metronome-volume');
      if (saved) return parseFloat(saved);
    }
    return 0.8;
  });
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('metronome-muted');
      if (saved) return saved === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('metronome-volume', volume.toString());
      localStorage.setItem('metronome-muted', isMuted.toString());
    }
  }, [volume, isMuted]);
  
  const [shortcuts, setShortcuts] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('metronome-shortcuts');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return [60, 80, 90, 100, 120];
        }
      }
    }
    return [60, 80, 90, 100, 120];
  });

  const [tsShortcuts, setTsShortcuts] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('metronome-ts-shortcuts');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return defaultTsShortcuts;
        }
      }
    }
    return defaultTsShortcuts;
  });
  
  const [visualBeat, setVisualBeat] = useState(-1);

  // Audio Context & Scheduling Refs
  const audioContext = useRef(null);
  const masterGain = useRef(null);
  const silentAudioRef = useRef(null);
  const wakeLockRef = useRef(null);
  const wakeLockVideoRef = useRef(null);
  const nextNoteTime = useRef(0);
  const currentBeatInBar = useRef(0);
  const timerID = useRef(null);
  const noteQueue = useRef([]);
  const animationRef = useRef(null);
  const lastNoteDrawn = useRef(-1);
  const isPlayingRef = useRef(false);

  const lookahead = 25.0; // ms
  const scheduleAheadTime = 0.1; // s

  // Keep refs in sync with state for the scheduler loop
  const bpmRef = useRef(bpm);
  const beatsPerBarRef = useRef(beatsPerBar);
  const noteValueRef = useRef(noteValue);
  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { beatsPerBarRef.current = beatsPerBar; }, [beatsPerBar]);
  useEffect(() => { noteValueRef.current = noteValue; }, [noteValue]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // Audio Context Initialization
  useEffect(() => {
    const initAudio = () => {
      if (!audioContext.current) {
        // Set AudioSession type to 'playback' to bypass silent switch and use media volume
        if (navigator.audioSession) {
          navigator.audioSession.type = 'playback';
        }

        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioContext.current = ctx;
        masterGain.current = ctx.createGain();
        masterGain.current.connect(ctx.destination);
        // Set initial volume
        masterGain.current.gain.value = isMutedRef.current ? 0 : volumeRef.current;
      }
    };
    
    window.addEventListener('mousedown', initAudio, { once: true });
    window.addEventListener('touchstart', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });

    return () => {
      window.removeEventListener('mousedown', initAudio);
      window.removeEventListener('touchstart', initAudio);
      window.removeEventListener('keydown', initAudio);
      if (audioContext.current?.state !== 'closed') {
         audioContext.current?.close();
      }
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
        silentAudioRef.current = null;
      }
    };
  }, []);

  // Update master volume when state changes
  useEffect(() => {
    if (masterGain.current) {
      masterGain.current.gain.value = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const scheduleNote = (beatNumber, time) => {
    noteQueue.current.push({ note: beatNumber, time: time });

    if (!audioContext.current || !masterGain.current) return;

    const osc = audioContext.current.createOscillator();
    const noteGain = audioContext.current.createGain();

    osc.connect(noteGain);
    noteGain.connect(masterGain.current);

    const isAccent = beatsPerBarRef.current > 1 && beatNumber === 0;
    
    if (isAccent) {
      osc.frequency.value = 880.0;
    } else {
      osc.frequency.value = 440.0;
    }

    noteGain.gain.setValueAtTime(1, time);
    noteGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.start(time);
    osc.stop(time + 0.1);
  };

  const nextNote = () => {
    // If user is currently typing and bpm is not a number, fallback to 100 for scheduling
    const activeBpm = typeof bpmRef.current === 'number' ? bpmRef.current : 100;
    
    // The BPM defines the duration of a quarter note (1/4).
    // If the time signature is 6/8, the note value is 8 (an eighth note).
    // An eighth note is half the duration of a quarter note.
    // multiplier = 4 / noteValue (e.g., 4 / 8 = 0.5)
    // So the seconds per beat will be adjusted correctly.
    const noteValueMultiplier = 4 / noteValueRef.current; 
    const secondsPerBeat = (60.0 / activeBpm) * noteValueMultiplier;

    nextNoteTime.current += secondsPerBeat;
    currentBeatInBar.current = (currentBeatInBar.current + 1) % beatsPerBarRef.current;
  };

  const scheduler = useCallback(() => {
    if (!isPlayingRef.current || !audioContext.current) return;

    while (nextNoteTime.current < audioContext.current.currentTime + scheduleAheadTime) {
      scheduleNote(currentBeatInBar.current, nextNoteTime.current);
      nextNote();
    }
    timerID.current = setTimeout(scheduler, lookahead);
  }, []);

  const draw = useCallback(() => {
    if (!isPlayingRef.current || !audioContext.current) return;

    let currentNote = lastNoteDrawn.current;
    const currentTime = audioContext.current.currentTime;

    while (noteQueue.current.length && noteQueue.current[0].time < currentTime) {
      currentNote = noteQueue.current[0].note;
      noteQueue.current.splice(0, 1);
    }

    if (lastNoteDrawn.current !== currentNote) {
      setVisualBeat(currentNote);
      lastNoteDrawn.current = currentNote;
    }

    animationRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      if (audioContext.current && audioContext.current.state === 'suspended') {
        audioContext.current.resume();
      }
      
      isPlayingRef.current = true;
      currentBeatInBar.current = 0;
      
      nextNoteTime.current = audioContext.current ? audioContext.current.currentTime + 0.05 : 0.05;
      
      noteQueue.current = [];
      lastNoteDrawn.current = -1;
      
      scheduler();
      animationRef.current = requestAnimationFrame(draw);
    } else {
      isPlayingRef.current = false;
      clearTimeout(timerID.current);
      cancelAnimationFrame(animationRef.current);
      setVisualBeat(-1);
    }

    return () => {
      clearTimeout(timerID.current);
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, scheduler, draw]);

  const handlePlayPause = () => {
    if (!audioContext.current) {
        // Set AudioSession type to 'playback'
        if (navigator.audioSession) {
          navigator.audioSession.type = 'playback';
        }

        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioContext.current = ctx;
        masterGain.current = ctx.createGain();
        masterGain.current.gain.value = isMuted ? 0 : volume;
        masterGain.current.connect(ctx.destination);
    }

    // Explicitly resume to handle iOS suspend state
    if (audioContext.current.state === 'suspended') {
        audioContext.current.resume();
    }

    // Helper to handle Wake Lock (Native and Video Fallback)
    const toggleWakeLock = async (enable) => {
      if (enable) {
        // 1. Try Native Wake Lock
        if ('wakeLock' in navigator) {
          const requestNativeLock = async () => {
            try {
              if (wakeLockRef.current) await wakeLockRef.current.release();
              wakeLockRef.current = await navigator.wakeLock.request('screen');
              
              // If it's released by the system (not by us), try to re-acquire if we are still playing
              wakeLockRef.current.addEventListener('release', () => {
                if (isPlayingRef.current && document.visibilityState === 'visible') {
                  requestNativeLock();
                }
              });
            } catch (err) {
              console.warn("Native Wake Lock failed:", err);
            }
          };
          await requestNativeLock();
        }
        
        // 2. Video "Wake Lock" (Extra insurance)
        // Some browsers require the video to be 'visible' in the viewport and playing to prevent sleep.
        if (wakeLockVideoRef.current) {
          wakeLockVideoRef.current.play().catch(err => {
            console.warn("Video Wake Lock failed:", err);
          });
        }
      } else {
        if (wakeLockRef.current) {
          wakeLockRef.current.release().then(() => { wakeLockRef.current = null; }).catch(() => {});
        }
        if (wakeLockVideoRef.current) {
          wakeLockVideoRef.current.pause();
        }
      }
    };

    // Play a looping silent HTML5 audio element to force iOS/Android into media playback mode
    if (!isPlaying) {
      if (!silentAudioRef.current) {
        silentAudioRef.current = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
        silentAudioRef.current.loop = true;
      }
      silentAudioRef.current.play().catch(() => {});
      toggleWakeLock(true);
    } else {
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
      }
      toggleWakeLock(false);
    }

    setIsPlaying(!isPlaying);
  };

  // Visibility and Wake Lock Management
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isPlaying) {
        // Stop metronome when not in foreground
        setIsPlaying(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Explicitly sync refs for use in event listeners
    isPlayingRef.current = isPlaying;

    if (!isPlaying) {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().then(() => { wakeLockRef.current = null; }).catch(() => {});
      }
      if (wakeLockVideoRef.current) {
        wakeLockVideoRef.current.pause();
      }
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [isPlaying]);

  const handleBpmChange = (e) => {
    const val = parseInt(e.target.value);
    setBpm(isNaN(val) ? '' : val); // allow empty temporarily while typing
  };

  const handleBpmBlur = () => {
    let val = parseInt(bpm);
    if (isNaN(val) || val < 20) val = 20;
    if (val > 300) val = 300;
    setBpm(val);
  };

  const handleBeatsPerBarChange = (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0 && val <= 32) {
      setBeatsPerBar(val);
      if (isPlaying) {
        currentBeatInBar.current = 0;
        lastNoteDrawn.current = -1;
      }
    }
  };

  const handleNoteValueChange = (e) => {
    const val = parseInt(e.target.value);
    // Ensure the note value is a power of 2 (1, 2, 4, 8, 16, 32)
    if (!isNaN(val) && [1, 2, 4, 8, 16, 32].includes(val)) {
      setNoteValue(val);
    }
  };

  const saveShortcut = () => {
    if (typeof bpm === 'number' && !shortcuts.includes(bpm)) {
      const newShortcuts = [...shortcuts, bpm].sort((a, b) => a - b);
      setShortcuts(newShortcuts);
      if (typeof window !== 'undefined') {
        localStorage.setItem('metronome-shortcuts', JSON.stringify(newShortcuts));
      }
    }
  };

  const removeShortcut = (bpmToRemove) => {
    const newShortcuts = shortcuts.filter(s => s !== bpmToRemove);
    setShortcuts(newShortcuts);
    if (typeof window !== 'undefined') {
      localStorage.setItem('metronome-shortcuts', JSON.stringify(newShortcuts));
    }
  };

  const saveTsShortcut = () => {
    const isExists = tsShortcuts.some(ts => ts.b === beatsPerBar && ts.n === noteValue);
    if (!isExists) {
      const newShortcuts = [...tsShortcuts, {b: beatsPerBar, n: noteValue}];
      setTsShortcuts(newShortcuts);
      if (typeof window !== 'undefined') {
        localStorage.setItem('metronome-ts-shortcuts', JSON.stringify(newShortcuts));
      }
    }
  };

  const removeTsShortcut = (tsToRemove) => {
    const newShortcuts = tsShortcuts.filter(ts => !(ts.b === tsToRemove.b && ts.n === tsToRemove.n));
    setTsShortcuts(newShortcuts);
    if (typeof window !== 'undefined') {
      localStorage.setItem('metronome-ts-shortcuts', JSON.stringify(newShortcuts));
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 md:p-8 bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 text-white font-mono relative">
      {/* 
         Hidden Video Wake Lock - Must be in DOM and .play() called in user gesture.
         Covering the screen (but invisible) ensures browsers treat it as 'main' content.
      */}
      <video 
        ref={wakeLockVideoRef}
        loop 
        muted 
        playsInline 
        className="fixed inset-0 w-full h-full opacity-0 pointer-events-none z-[-1]"
        src="data:video/mp4;base64,AAAAHGZ0eXBpc29tAAAAAGlzb21pc28yYXZjMQAAAAhmcmVlAAAALW1kYXQAAAHpYXZjQwBQAAsAEAAf/+ADhAA3/8D///AADhAA3/8D///AADhAA3/8D///AADhAA3/8D///8AAAALZ3VpZAAAAAAAAAAVAAAAGHBhc3MAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
      />
      <div className="flex flex-col items-center gap-8">
        
        {/* Header / Volume / BPM Display */}
        <div className="text-center w-full relative pt-2">
          {/* Volume Control & Mobile Title */}
          <div className="flex justify-between items-center mb-6 md:mb-0 md:absolute md:-top-2 md:right-0 w-full md:w-auto z-10">
            <h2 className="text-zinc-400 text-xs tracking-widest uppercase md:hidden text-left font-bold">Metronome</h2>
            <div className="flex items-center gap-2 bg-zinc-800/80 p-2 rounded-xl backdrop-blur-sm ml-auto">
              <button onClick={() => setIsMuted(!isMuted)} className="text-zinc-400 hover:text-white transition-colors">
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input 
                type="range" 
                min="0" max="5" step="0.01" 
                value={isMuted ? 0 : volume} 
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  if (isMuted) setIsMuted(false);
                }}
                className="w-16 md:w-24 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>

          <h2 className="text-zinc-400 text-sm tracking-widest uppercase mb-2 hidden md:block">Digital Metronome</h2>
          
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center justify-center gap-2 md:gap-4 w-full flex-wrap md:flex-nowrap">
              
              <div className="flex items-end justify-center gap-2 w-full md:w-auto order-1 md:order-2 mb-2 md:mb-0">
                {/* Invisible spacer to perfectly center the BPM number */}
                <span className="text-xl font-bold pb-2 md:pb-3 invisible" aria-hidden="true">BPM</span>
                
                <input
                  type="number"
                  value={bpm}
                  onChange={handleBpmChange}
                  onBlur={handleBpmBlur}
                  className="w-32 md:w-48 text-center text-6xl md:text-8xl font-black tracking-tighter bg-transparent outline-none text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-400 [&::-webkit-inner-spin-button]:appearance-none focus:scale-105 transition-transform"
                  min="20"
                  max="300"
                />
                <span className="text-xl text-zinc-500 font-bold pb-2 md:pb-3">BPM</span>
              </div>

              <div className="flex justify-center gap-2 order-2 md:order-1 w-[48%] md:w-auto pr-1 md:pr-0">
                <button
                  onClick={() => setBpm(b => typeof b === 'number' ? Math.max(20, b - 5) : 20)}
                  className="flex-1 md:flex-none px-3 py-3 md:px-4 md:py-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 transition-colors shrink-0 text-zinc-400 font-bold"
                  aria-label="Decrease BPM by 5"
                >
                  -5
                </button>
                <button
                  onClick={() => setBpm(b => typeof b === 'number' ? Math.max(20, b - 1) : 20)}
                  className="flex-1 md:flex-none flex justify-center items-center p-3 md:p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 transition-colors shrink-0 text-zinc-400"
                  aria-label="Decrease BPM"
                >
                  <Minus size={24} />
                </button>
              </div>

              <div className="flex justify-center gap-2 order-3 md:order-3 w-[48%] md:w-auto pl-1 md:pl-0">
                <button
                  onClick={() => setBpm(b => typeof b === 'number' ? Math.min(300, b + 1) : 300)}
                  className="flex-1 md:flex-none flex justify-center items-center p-3 md:p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 transition-colors shrink-0 text-zinc-400"
                  aria-label="Increase BPM"
                >
                  <Plus size={24} />
                </button>
                <button
                  onClick={() => setBpm(b => typeof b === 'number' ? Math.min(300, b + 5) : 300)}
                  className="flex-1 md:flex-none px-3 py-3 md:px-4 md:py-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 transition-colors shrink-0 text-zinc-400 font-bold"
                  aria-label="Increase BPM by 5"
                >
                  +5
                </button>
              </div>
              
            </div>

            <input
              type="range"
              min="20"
              max="300"
              value={typeof bpm === 'number' ? bpm : 20}
              onChange={handleBpmChange}
              className="w-full max-w-md h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-2"
            />
          </div>
        </div>

        {/* Visualizer */}
        <div className="flex justify-center gap-2 md:gap-4 my-4 w-full h-12 flex-wrap">
          {Array.from({ length: beatsPerBar }).map((_, i) => {
            const isActive = visualBeat === i;
            const isAccent = beatsPerBar > 1 && i === 0;
            return (
              <div
                key={i}
                className={`flex-1 min-w-[0.5rem] rounded-full transition-all duration-75 ${
                  isActive
                    ? isAccent
                      ? 'bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)]' // Accent beat
                      : 'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)]' // Normal beat
                    : 'bg-zinc-800'
                }`}
              />
            );
          })}
        </div>

        {/* Main Controls */}
        <div className="w-full space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            
            {/* Custom Time Signature Input */}
            <div className="flex flex-col gap-2 w-full md:w-auto items-center md:items-start">
              <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3">
                <span className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Time Signature</span>
                <div className="flex gap-1 flex-wrap">
                  {tsShortcuts.map(ts => {
                    const isDefault = defaultTsShortcuts.some(d => d.b === ts.b && d.n === ts.n);
                    return (
                      <div key={`${ts.b}/${ts.n}`} className="flex bg-zinc-800 rounded overflow-hidden group">
                        <button
                          onClick={() => {
                            setBeatsPerBar(ts.b);
                            setNoteValue(ts.n);
                            if (isPlaying) {
                              currentBeatInBar.current = 0;
                              lastNoteDrawn.current = -1;
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
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-2xl font-bold bg-zinc-800 rounded-xl p-2">
                <input 
                  type="number" 
                  value={beatsPerBar} 
                  onChange={handleBeatsPerBarChange}
                  min="1" max="32"
                  className="w-12 md:w-16 bg-transparent text-center outline-none focus:text-blue-400 [&::-webkit-inner-spin-button]:appearance-none transition-colors"
                />
                <span className="text-zinc-600">/</span>
                <input 
                  type="number" 
                  value={noteValue} 
                  onChange={handleNoteValueChange}
                  min="1" max="32"
                  className="w-12 md:w-16 bg-transparent text-center outline-none focus:text-emerald-400 [&::-webkit-inner-spin-button]:appearance-none transition-colors"
                />
              </div>
            </div>

            {/* Play/Pause */}
            <button
              onClick={handlePlayPause}
              className={`flex items-center justify-center w-20 h-20 shrink-0 rounded-full transition-all shadow-lg hover:scale-105 active:scale-95 ${
                isPlaying 
                  ? 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/20' 
                  : 'bg-white text-black hover:bg-zinc-200'
              }`}
            >
              {isPlaying ? (
                <Pause size={32} className="text-white fill-current" />
              ) : (
                <Play size={32} className="ml-2 fill-current" />
              )}
            </button>

          </div>
        </div>

        {/* Shortcuts */}
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
