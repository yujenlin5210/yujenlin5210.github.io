import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Plus, Minus, Save, Trash2, Volume2, VolumeX, Settings2 } from 'lucide-react';
import { useWakeLock } from '../hooks/useWakeLock';

const defaultTsShortcuts = [{b:1,n:4}, {b:2,n:4}, {b:3,n:4}, {b:4,n:4}, {b:6,n:8}];

export default function Metronome() {
  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [noteValue, setNoteValue] = useState(4);
  const [showSettings, setShowSettings] = useState(false);
  
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
          return [60, 80, 100, 120];
        }
      }
    }
    return [60, 80, 100, 120];
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

  // Wake Lock Hook
  const { requestWakeLock, releaseWakeLock } = useWakeLock();

  // Audio Context & Scheduling Refs
  const audioContext = useRef(null);
  const masterGain = useRef(null);
  const silentAudioRef = useRef(null);
  const nextNoteTime = useRef(0);
  const currentBeatInBar = useRef(0);
  const timerID = useRef(null);
  const noteQueue = useRef([]);
  const animationRef = useRef(null);
  const lastNoteDrawn = useRef(-1);
  const isPlayingRef = useRef(false);

  const lookahead = 25.0; 
  const scheduleAheadTime = 0.1; 

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
        if (navigator.audioSession) {
          navigator.audioSession.type = 'playback';
        }
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioContext.current = ctx;
        masterGain.current = ctx.createGain();
        masterGain.current.connect(ctx.destination);
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
    osc.frequency.value = isAccent ? 880.0 : 440.0;

    noteGain.gain.setValueAtTime(1, time);
    noteGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.start(time);
    osc.stop(time + 0.1);
  };

  const nextNote = () => {
    const activeBpm = typeof bpmRef.current === 'number' ? bpmRef.current : 100;
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
    const nextPlayingState = !isPlaying;
    isPlayingRef.current = nextPlayingState;
    if (nextPlayingState) {
      requestWakeLock();
      if (!silentAudioRef.current) {
        silentAudioRef.current = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
        silentAudioRef.current.loop = true;
      }
      silentAudioRef.current.play().catch(() => {});
    } else {
      if (silentAudioRef.current) silentAudioRef.current.pause();
      releaseWakeLock();
    }
    if (!audioContext.current) {
        if (navigator.audioSession) navigator.audioSession.type = 'playback';
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioContext.current = ctx;
        masterGain.current = ctx.createGain();
        masterGain.current.gain.value = isMuted ? 0 : volume;
        masterGain.current.connect(ctx.destination);
    }
    if (audioContext.current.state === 'suspended') audioContext.current.resume();
    setIsPlaying(nextPlayingState);
  };

  const adjustBpm = (delta) => {
    setBpm(prev => {
        const val = (typeof prev === 'number' ? prev : 100) + delta;
        return Math.min(300, Math.max(20, val));
    });
  };

  const handleBpmChange = (e) => {
    const val = parseInt(e.target.value);
    setBpm(isNaN(val) ? '' : val);
  };

  const handleBpmBlur = () => {
    let val = parseInt(bpm);
    if (isNaN(val) || val < 20) val = 20;
    if (val > 300) val = 300;
    setBpm(val);
  };

  const saveShortcut = () => {
    if (typeof bpm === 'number' && !shortcuts.includes(bpm)) {
      const newShortcuts = [...shortcuts, bpm].sort((a, b) => a - b);
      setShortcuts(newShortcuts);
      localStorage.setItem('metronome-shortcuts', JSON.stringify(newShortcuts));
    }
  };

  const removeShortcut = (bpmToRemove) => {
    const newShortcuts = shortcuts.filter(s => s !== bpmToRemove);
    setShortcuts(newShortcuts);
    localStorage.setItem('metronome-shortcuts', JSON.stringify(newShortcuts));
  };

  return (
    <div className="w-full max-w-md mx-auto aspect-[9/16] md:aspect-auto md:h-auto bg-zinc-950 md:bg-zinc-900 md:rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white font-sans relative border border-zinc-800">
      
      {/* 1. Header Area (Compact) */}
      <div className="flex justify-between items-center px-6 pt-8 pb-4 z-20">
        <div className="flex flex-col">
            <h2 className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Tempo</h2>
            <div className="flex items-center gap-1">
                <span className="text-zinc-400 text-xs font-mono font-bold">{beatsPerBar}/{noteValue}</span>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <button 
                onClick={() => setIsMuted(!isMuted)} 
                className={`p-2 rounded-full transition-all ${isMuted ? 'bg-rose-500/20 text-rose-500' : 'bg-zinc-800 text-zinc-400'}`}
            >
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button 
                onClick={() => setShowSettings(!showSettings)} 
                className={`p-2 rounded-full transition-all ${showSettings ? 'bg-blue-500/20 text-blue-500' : 'bg-zinc-800 text-zinc-400'}`}
            >
                <Settings2 size={18} />
            </button>
        </div>
      </div>

      {/* 2. Visualizer (Top priority feedback) */}
      <div className="px-6 py-2 flex justify-center gap-1.5 h-6">
        {Array.from({ length: beatsPerBar }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full transition-all duration-75 ${
              visualBeat === i
                ? (beatsPerBar > 1 && i === 0 ? 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]' : 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]')
                : 'bg-zinc-800'
            }`}
          />
        ))}
      </div>

      {/* 3. Main BPM Display Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4">
        <div className="relative group cursor-pointer" onClick={() => { /* Focus input */ }}>
            <input
                type="number"
                value={bpm}
                onChange={handleBpmChange}
                onBlur={handleBpmBlur}
                className="w-full text-center text-[120px] md:text-[140px] leading-none font-black tracking-tighter bg-transparent outline-none text-white selection:bg-blue-500/30 [&::-webkit-inner-spin-button]:appearance-none transition-transform active:scale-95"
                min="20" max="300"
            />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-zinc-600 text-sm font-black tracking-widest uppercase">BPM</div>
        </div>

        {/* 4. Controls Area */}
        <div className="w-full mt-12 grid grid-cols-4 gap-3">
          {['-5', '-1', '+1', '+5'].map((val) => (
            <button
              key={val}
              onClick={() => adjustBpm(parseInt(val))}
              className="aspect-square flex items-center justify-center bg-zinc-800/50 hover:bg-zinc-800 active:bg-blue-600 active:text-white rounded-2xl text-lg font-bold text-zinc-300 transition-all border border-white/5 active:scale-90"
            >
              {val}
            </button>
          ))}
        </div>

        <div className="w-full mt-8 px-2">
            <input
                type="range"
                min="20" max="300"
                value={typeof bpm === 'number' ? bpm : 20}
                onChange={handleBpmChange}
                className="w-full h-8 bg-transparent appearance-none cursor-pointer accent-blue-500"
            />
        </div>
      </div>

      {/* 5. Shortcuts & Volume (Slide up logic or just tidy) */}
      <div className={`px-6 pb-8 transition-all duration-300 ${showSettings ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <div className="bg-zinc-800/40 rounded-3xl p-5 border border-white/5 backdrop-blur-md">
            <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Presets</span>
                <button onClick={saveShortcut} className="text-[10px] font-black text-blue-400 hover:text-blue-300">Add Current</button>
            </div>
            <div className="flex flex-wrap gap-2">
                {shortcuts.map(s => (
                    <div key={s} className="flex bg-zinc-900 rounded-xl overflow-hidden border border-white/5 group">
                        <button onClick={() => setBpm(s)} className="px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-800">{s}</button>
                        <button onClick={() => removeShortcut(s)} className="px-2 bg-zinc-900 hover:bg-rose-500 text-zinc-700 hover:text-white transition-colors">
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-6 flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Volume</span>
                <div className="flex items-center gap-3">
                    <Volume2 size={14} className="text-zinc-600" />
                    <input 
                        type="range" 
                        min="0" max="1" step="0.01" 
                        value={isMuted ? 0 : volume} 
                        onChange={(e) => {
                            setVolume(parseFloat(e.target.value));
                            if (isMuted) setIsMuted(false);
                        }}
                        className="flex-1 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                </div>
            </div>
          </div>
      </div>

      {/* 6. Footer Primary Action */}
      <div className="px-6 pb-12 pt-4 flex flex-col items-center gap-4">
        <button
          onClick={handlePlayPause}
          className={`w-24 h-24 flex items-center justify-center rounded-full transition-all shadow-2xl active:scale-90 ${
            isPlaying 
              ? 'bg-rose-500 text-white shadow-rose-500/40 rotate-180' 
              : 'bg-white text-zinc-950 shadow-white/10'
          }`}
        >
          {isPlaying ? <Pause size={42} fill="currentColor" /> : <Play size={42} className="ml-1.5" fill="currentColor" />}
        </button>
      </div>

      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>
    </div>
  );
}
