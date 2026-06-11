import { useState, useEffect, useRef } from 'react';
import { Wind, Play, Square, Volume2, Compass, ChevronDown } from 'lucide-react';

type SoundType = 'none' | 'ocean' | 'rain' | 'focus';

export function StressRelief() {
  const [isExpanded, setIsExpanded] = useState(false);
  // ─── Box Breathing State ──────────────────────────────────────────────────
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathCycle, setBreathCycle] = useState(0); // 0 to 15 seconds
  const breathingTimer = useRef<number | null>(null);

  useEffect(() => {
    if (breathingActive) {
      setBreathCycle(0);
      breathingTimer.current = window.setInterval(() => {
        setBreathCycle((c) => (c + 1) % 16);
      }, 1000);
    } else {
      if (breathingTimer.current) {
        clearInterval(breathingTimer.current);
        breathingTimer.current = null;
      }
      setBreathCycle(0);
    }

    return () => {
      if (breathingTimer.current) clearInterval(breathingTimer.current);
    };
  }, [breathingActive]);

  // Determine breathing phase
  let phaseText = 'Click Start to Begin';
  let circleClass = 'scale-75 opacity-40 bg-gray-100 dark:bg-neutral-800';
  if (breathingActive) {
    if (breathCycle < 4) {
      phaseText = 'Breathe In';
      circleClass = 'scale-110 opacity-100 bg-emerald-500/80 shadow-[0_0_20px_rgba(52,211,153,0.5)]';
    } else if (breathCycle < 8) {
      phaseText = 'Hold Your Breath';
      circleClass = 'scale-110 opacity-100 bg-teal-500/80 shadow-[0_0_20px_rgba(20,184,166,0.6)]';
    } else if (breathCycle < 12) {
      phaseText = 'Breathe Out';
      circleClass = 'scale-75 opacity-70 bg-sky-500/85 shadow-[0_0_15px_rgba(14,165,233,0.4)]';
    } else {
      phaseText = 'Hold';
      circleClass = 'scale-75 opacity-40 bg-gray-200 dark:bg-neutral-700';
    }
  }

  // ─── Ambient Soundscape Synth ─────────────────────────────────────────────
  const [activeSound, setActiveSound] = useState<SoundType>('none');
  const [volume, setVolume] = useState(0.2); // 0.0 to 1.0

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | OscillatorNode | null>(null);
  const oscRNodeRef = useRef<OscillatorNode | null>(null); // For binaural right ear
  const gainNodeRef = useRef<GainNode | null>(null);

  // Stop current sound synth
  const stopSound = () => {
    try {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      if (oscRNodeRef.current) {
        oscRNodeRef.current.stop();
        oscRNodeRef.current.disconnect();
        oscRNodeRef.current = null;
      }
    } catch (e) {
      // already stopped or not started
    }
    setActiveSound('none');
  };

  // Adjust volume dynamically
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  // Clean up audio context on unmount
  useEffect(() => {
    return () => {
      stopSound();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playSound = (type: SoundType) => {
    stopSound();
    if (type === 'none') return;

    const ctx = initAudio();
    const gainNode = ctx.createGain();
    gainNode.gain.value = volume;
    gainNode.connect(ctx.destination);
    gainNodeRef.current = gainNode;

    if (type === 'ocean') {
      // Brown Noise Generator (Ocean swell effect)
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Gain multiplier
      }

      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      // Add a lowpass filter to make it warmer/deeper
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      // Add a slow LFO to create waves rolling in
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.08; // 12 seconds per wave swell
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.08; // swell intensity

      lfo.connect(lfoGain);
      lfoGain.connect(gainNode.gain);

      source.connect(filter);
      filter.connect(gainNode);

      lfo.start();
      source.start();
      sourceNodeRef.current = source;
      setActiveSound('ocean');
    } else if (type === 'rain') {
      // Pink Noise + Lowpass = Rain sounds
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11;
        b6 = white * 0.115926;
      }

      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      filter.Q.value = 0.6;

      source.connect(filter);
      filter.connect(gainNode);

      source.start();
      sourceNodeRef.current = source;
      setActiveSound('rain');
    } else if (type === 'focus') {
      // Binaural Beats (100Hz in left ear, 110Hz in right ear -> 10Hz Alpha beat)
      const oscL = ctx.createOscillator();
      const oscR = ctx.createOscillator();
      const merger = ctx.createChannelMerger(2);

      oscL.type = 'sine';
      oscL.frequency.value = 100;
      oscR.type = 'sine';
      oscR.frequency.value = 106; // 6Hz theta/alpha boundary focus beat

      const gainL = ctx.createGain();
      const gainR = ctx.createGain();
      gainL.gain.value = 0.5;
      gainR.gain.value = 0.5;

      oscL.connect(gainL);
      oscR.connect(gainR);

      gainL.connect(merger, 0, 0);
      gainR.connect(merger, 0, 1);

      merger.connect(gainNode);

      oscL.start();
      oscR.start();

      sourceNodeRef.current = oscL;
      oscRNodeRef.current = oscR;
      setActiveSound('focus');
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl transition-all overflow-hidden">
      {/* Header bar (always visible) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left outline-none hover:bg-gray-100 dark:bg-neutral-800/55 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Compass size={14} className="text-blue-500" />
          <h3 className="text-xs font-medium tracking-widest text-gray-500 dark:text-neutral-400 uppercase">
            Mindfulness & Chill
          </h3>
        </div>
        <ChevronDown size={14} className={`text-gray-400 dark:text-neutral-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 pt-0 flex flex-col gap-5 border-t border-gray-200 dark:border-neutral-800/40">
          {/* Breathing Coach */}
          <div className="flex flex-col items-center gap-4 bg-gray-50 dark:bg-neutral-950/40 border border-gray-200 dark:border-neutral-800/40 rounded-xl p-4">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div
                className={`w-16 h-16 rounded-full transition-all duration-[1000ms] ease-in-out ${circleClass}`}
              />
              {breathingActive && (
                <span className="absolute text-[10px] font-bold text-gray-800 dark:text-neutral-200 font-mono tracking-wider">
                  {4 - (breathCycle % 4)}s
                </span>
              )}
            </div>

            <div className="text-center">
              <p className="text-xs font-medium text-gray-800 dark:text-neutral-200 mb-1">{phaseText}</p>
              <p className="text-[10px] text-neutral-550 max-w-[200px]">
                Box breathing helps restore calm. Equal parts inhale, hold, exhale, hold.
              </p>
            </div>

            <button
              onClick={() => setBreathingActive(!breathingActive)}
              className={`flex items-center gap-1.5 text-[10px] rounded-lg px-3 py-1.5 transition-colors font-medium ${
                breathingActive
                  ? 'bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:bg-neutral-700 text-gray-500 dark:text-neutral-400 hover:text-gray-800 dark:text-neutral-200'
                  : 'bg-blue-600 hover:bg-blue-600 text-white'
              }`}
            >
              <Wind size={12} />
              {breathingActive ? 'Stop Session' : 'Start Box Breathing'}
            </button>
          </div>

          {/* Ambient Soundscape Synthesizer */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest text-gray-400 dark:text-neutral-500 uppercase">
                Focus Soundscapes
              </span>
              {activeSound !== 'none' && (
                <button
                  onClick={stopSound}
                  className="text-[10px] text-red-400 hover:text-red-300 font-medium"
                >
                  Stop Sound
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'ocean', label: 'Ocean Waves' },
                { id: 'rain', label: 'Rain Storm' },
                { id: 'focus', label: 'Binaural Beats' },
              ].map((snd) => {
                const isActive = activeSound === snd.id;
                return (
                  <button
                    key={snd.id}
                    onClick={() => (isActive ? stopSound() : playSound(snd.id as SoundType))}
                    className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border text-center transition-all ${
                      isActive
                        ? 'bg-blue-900/30 border-blue-700 text-blue-500'
                        : 'bg-gray-50 dark:bg-neutral-950/30 border-gray-200 dark:border-neutral-800 text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:bg-neutral-800/50'
                    }`}
                  >
                    {isActive ? <Square size={12} /> : <Play size={12} />}
                    <span className="text-[10px] font-medium leading-none mt-1">{snd.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Volume slider */}
            {activeSound !== 'none' && (
              <div className="flex items-center gap-2 mt-1 px-1">
                <Volume2 size={12} className="text-gray-400 dark:text-neutral-500" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-gray-100 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
