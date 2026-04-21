import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

// Component for the interactive video cover
function InteractiveVideoCover() {
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl mb-12 bg-slate-900 border border-slate-200 dark:border-white/10 group">
      <video 
        ref={videoRef}
        src="/assets/images/lab/sequencer/demo_ios.mp4" 
        autoPlay 
        loop 
        muted={isMuted} 
        playsInline 
        className="w-full h-auto block m-0"
        style={{ margin: 0, padding: 0 }}
      />
      <button
        onClick={toggleMute}
        className={`absolute bottom-6 right-6 px-4 py-2 backdrop-blur-xl rounded-full border border-white/20 text-white text-xs font-mono font-bold uppercase tracking-widest cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center gap-2 z-20 shadow-lg ${
          isMuted ? 'bg-black/60 hover:bg-black/80' : 'bg-indigo-600/80 hover:bg-indigo-600'
        }`}
      >
        <span className="text-base">{isMuted ? '🔇' : '🔊'}</span>
        <span>{isMuted ? 'Click to Unmute' : 'Sound ON'}</span>
      </button>
    </div>
  );
}

const sections = [
  {
    id: 'intro',
    content: () => (
      <>
        <div className="not-prose">
          <InteractiveVideoCover />
        </div>
        <p className="text-xl md:text-2xl font-light leading-relaxed text-slate-600 dark:text-slate-300">
          Achieving sample-accurate timing in a game engine's <code>Update</code> loop is notoriously difficult due to fluctuating frame rates. This project explores the architecture of a custom <strong>Beat Sequencer</strong> for Unity, designed to handle multi-track audio playback with high precision and minimal memory overhead.
        </p>
      </>
    )
  },
  {
    id: 'pulse',
    title: '1. The Pulse: BeatProvider',
    content: () => (
      <>
        <p>The core of the sequencer is the <code>BeatProvider</code>. Instead of relying purely on <code>Time.deltaTime</code>, it calculates intervals based on the BPM (Beats Per Minute) and exposes UnityEvents for different note resolutions (Whole, Half, Quarter, down to Thirty-Second notes).</p>
        
        <div className="my-6 p-4 bg-slate-900 rounded-xl font-mono text-xs md:text-sm shadow-inner border border-white/10 overflow-x-auto">
          <div className="flex gap-2 mb-2 opacity-50">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="ml-2 text-[10px] uppercase tracking-widest">BeatProvider.cs</span>
          </div>
          <pre className="text-indigo-300"><code>{`void OnSettingChange() {
    float quarterBeatLength = 60.0f / bpm;
    _beats[2].SetInterval(quarterBeatLength); // Quarter Note
    _beats[5].SetInterval(quarterBeatLength / 8); // 32nd Note
}`}</code></pre>
        </div>
      </>
    )
  },
  {
    id: 'orchestrator',
    title: '2. The Orchestrator: TrackManager',
    content: () => (
      <>
        <p>The <code>TrackManager</code> listens to these beat events. It maintains a sequence of <code>Note</code> objects and decides which sound to play at each tick. It uses a simple but effective index-based system to stay in sync with the global beat.</p>
      </>
    )
  },
  {
    id: 'engine',
    title: '3. The Engine: BeatPlayer & Object Pooling',
    content: () => (
      <>
        <p>Spawning and destroying <code>AudioSource</code> components every 16th note would cause massive Garbage Collection (GC) spikes. The <code>BeatPlayer</code> solves this by using Unity's <code>IObjectPool</code> to reuse <code>AudioHelper</code> instances.</p>

        <div className="my-6 p-4 bg-slate-900 rounded-xl font-mono text-xs md:text-sm shadow-inner border border-white/10 overflow-x-auto">
          <div className="flex gap-2 mb-2 opacity-50">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="ml-2 text-[10px] uppercase tracking-widest">BeatPlayer.cs</span>
          </div>
          <pre className="text-indigo-300"><code>{`private AudioHelper CreatePooledItem() {
    var audioHelper = Instantiate<AudioHelper>(_audioHelperPrefab, transform, false);
    audioHelper.pool = AudioSourcePool;
    return audioHelper;
}`}</code></pre>
        </div>
      </>
    )
  },
  {
    id: 'adsr',
    title: 'Technical Highlight: ADSR Envelopes',
    content: () => (
      <>
        <p>Beyond simple sample playback, I implemented a software-based <strong>ADSR (Attack, Decay, Sustain, Release)</strong> envelope. This allows for more expressive sounds by controlling the gain profile of a sample in real-time.</p>
        <p>Crucially, the ADSR logic uses <code>AudioSettings.dspTime</code>. This is the most accurate clock available in Unity, decoupled from the frame rate, ensuring that the envelope curves remain smooth even if the game's FPS drops.</p>

        <div className="my-6 p-4 bg-slate-900 rounded-xl font-mono text-xs md:text-sm shadow-inner border border-white/10 overflow-x-auto">
          <div className="flex gap-2 mb-2 opacity-50">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="ml-2 text-[10px] uppercase tracking-widest">ADSR.cs</span>
          </div>
          <pre className="text-indigo-300"><code>{`if (isKeyDown && AudioSettings.dspTime > attackStartTime) {
    double deltaTime = AudioSettings.dspTime - attackStartTime;
    if (deltaTime < attackTime) {
        adsrGain = Mathf.Lerp(0, 1, (float)(deltaTime / attackTime));
    }
    // ... handle Decay and Sustain
}`}</code></pre>
        </div>
      </>
    )
  },
  {
    id: 'pitch',
    title: 'Pitch Shifting via Frequency Mapping',
    content: () => (
      <>
        <p>The <code>AudioHelper</code> includes a lookup table for musical pitches. By adjusting the <code>pitch</code> property of the <code>AudioSource</code> based on a semi-tone ratio, the sequencer can play melodies using a single audio sample (e.g., a C4 bell sound re-pitched to play an A4).</p>

        <div className="my-6 p-4 bg-slate-900 rounded-xl font-mono text-xs md:text-sm shadow-inner border border-white/10 overflow-x-auto">
          <div className="flex gap-2 mb-2 opacity-50">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="ml-2 text-[10px] uppercase tracking-widest">PitchShift.cs</span>
          </div>
          <pre className="text-indigo-300"><code>{`if (AudioConstant.PitchTable.TryGetValue(pitch, out float pitchValue)) {
    audioSource.pitch = pitchValue;
}`}</code></pre>
        </div>
      </>
    )
  },
  {
    id: 'summary',
    title: 'Summary',
    content: () => (
      <>
        <p className="text-xl md:text-2xl font-light leading-relaxed text-slate-600 dark:text-slate-300">
          This sequencer project serves as a robust foundation for music-based games or interactive audio tools. By combining <strong>Object Pooling</strong> for performance and <strong>DSP Timing</strong> for accuracy, it overcomes the traditional limitations of game engine audio systems.
        </p>
      </>
    )
  }
];

function Section({ section, index }) {
  return (
    <motion.div 
      className={`${index === 0 ? 'min-h-[40vh] pt-10 pb-20' : 'min-h-[70vh] py-20'} flex flex-col justify-center max-w-4xl mx-auto`}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ amount: 0.3 }}
      transition={{ duration: 0.6 }}
    >
      {section.title && <h2 className="text-3xl md:text-5xl font-bold mb-8 text-slate-900 dark:text-white">{section.title}</h2>}
      <div className="prose prose-lg dark:prose-invert prose-indigo prose-p:leading-relaxed max-w-none">
        {section.content()}
      </div>
    </motion.div>
  );
}

export default function SequencerLabPresentation() {
  return (
    <div className="relative w-full px-4 md:px-0">
      <div className="relative z-10 pb-32">
        {sections.map((section, index) => (
          <Section 
            key={section.id} 
            section={section} 
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
