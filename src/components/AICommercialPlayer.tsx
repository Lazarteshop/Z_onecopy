import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, ExternalLink, Tv, FileText } from 'lucide-react';

interface Scene {
  id: string;
  text: string;
  visualDescription: string;
  imageUrl: string;
}

interface AICommercial {
  title: string;
  musicMood: string;
  ctaText: string;
  scenes: Scene[];
  duration: number;
}

interface AICommercialPlayerProps {
  commercial: AICommercial;
  businessUrl: string;
  businessTitle: string;
  onClose?: () => void;
}

export default function AICommercialPlayer({ commercial, businessUrl, businessTitle, onClose }: AICommercialPlayerProps) {
  const { title, musicMood, ctaText, scenes } = commercial;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [progress, setProgress] = useState(0); // 0 to 100 for current scene
  const [isMuted, setIsMuted] = useState(false);
  const [showScript, setShowScript] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Web Audio API background beat synthesizer
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const beatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and clean up speech
  useEffect(() => {
    return () => {
      stopSpeech();
      stopSynthesizer();
    };
  }, []);

  // Handle scene index changes -> Speak the scene text
  useEffect(() => {
    if (isPlaying) {
      speakScene(currentSceneIndex);
    } else {
      stopSpeech();
    }
  }, [currentSceneIndex, isPlaying]);

  // Audio Beat Synthesizer for "musicMood"
  const startSynthesizer = () => {
    if (isMuted) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.08, ctx.currentTime); // keep it low and ambient
      gainNode.connect(ctx.destination);
      gainNodeRef.current = gainNode;

      // Play a steady loop of cozy warm chords / tech beats depending on musicMood
      let beatCount = 0;
      beatIntervalRef.current = setInterval(() => {
        if (!isPlaying || isMuted) return;
        
        const now = ctx.currentTime;
        // Kick/low pulse
        const osc = ctx.createOscillator();
        const amp = ctx.createGain();
        osc.connect(amp);
        amp.connect(gainNode);

        if (beatCount % 2 === 0) {
          // Deep pulse
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(55, now);
          osc.frequency.exponentialRampToValueAtTime(1, now + 0.4);
          amp.gain.setValueAtTime(0.3, now);
          amp.gain.linearRampToValueAtTime(0.01, now + 0.4);
          osc.start(now);
          osc.stop(now + 0.4);
        } else {
          // Soft ambient chord/chime
          osc.type = 'sine';
          const notes = [220, 277.18, 329.63, 440]; // A major ambient chord notes
          const note = notes[Math.floor(Math.random() * notes.length)];
          osc.frequency.setValueAtTime(note, now);
          amp.gain.setValueAtTime(0.15, now);
          amp.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
          osc.start(now);
          osc.stop(now + 0.8);
        }
        beatCount++;
      }, 600);
    } catch (e) {
      console.warn("Web Audio Synthesis failed to load:", e);
    }
  };

  const stopSynthesizer = () => {
    if (beatIntervalRef.current) {
      clearInterval(beatIntervalRef.current);
      beatIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  // Speaks the text of a specific scene with Web Speech Synthesis
  const speakScene = (index: number) => {
    stopSpeech();
    if (isMuted) return;

    try {
      const scene = scenes[index];
      if (!scene) return;

      const utterance = new SpeechSynthesisUtterance(scene.text);
      
      // Try to find a Filipino/Tagalog voice, otherwise fallback
      const voices = window.speechSynthesis.getVoices();
      const filVoice = voices.find(v => v.lang.includes('fil') || v.lang.includes('tl') || v.lang.includes('ph'));
      if (filVoice) {
        utterance.voice = filVoice;
        utterance.rate = 0.95; // speak slightly slower for clarity
      } else {
        // Fallback to a warm UK/US voice if available
        const enVoice = voices.find(v => v.lang.includes('en-GB') || v.lang.includes('en-US'));
        if (enVoice) utterance.voice = enVoice;
        utterance.rate = 1.0;
      }
      
      utterance.pitch = 1.1; // friendly, enthusiastic pitch
      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech Synthesis error:", e);
    }
  };

  const stopSpeech = () => {
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Manage playback timer loop
  useEffect(() => {
    if (isPlaying) {
      // Start ambient sound on play
      if (!beatIntervalRef.current) {
        startSynthesizer();
      }

      const intervalMs = 50; // smooth 50ms updates
      const durationPerScene = 5000; // 5 seconds per scene
      let elapsed = (progress / 100) * durationPerScene;

      timerRef.current = setInterval(() => {
        elapsed += intervalMs;
        const newProgress = (elapsed / durationPerScene) * 100;

        if (newProgress >= 100) {
          // Transition to next scene
          if (currentSceneIndex < scenes.length - 1) {
            setCurrentSceneIndex(prev => prev + 1);
            setProgress(0);
          } else {
            // End of commercial loop/completion
            setIsPlaying(false);
            setProgress(100);
            stopSpeech();
            stopSynthesizer();
          }
        } else {
          setProgress(newProgress);
        }
      }, intervalMs);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      stopSpeech();
      stopSynthesizer();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, currentSceneIndex, progress]);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      // If completed, restart
      if (currentSceneIndex === scenes.length - 1 && progress >= 99) {
        setCurrentSceneIndex(0);
        setProgress(0);
      }
      setIsPlaying(true);
    }
  };

  const handleMuteToggle = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (nextMuted) {
      stopSpeech();
      stopSynthesizer();
    } else {
      if (isPlaying) {
        speakScene(currentSceneIndex);
        startSynthesizer();
      }
    }
  };

  const restartPlay = () => {
    stopSpeech();
    stopSynthesizer();
    setCurrentSceneIndex(0);
    setProgress(0);
    setIsPlaying(true);
  };

  return (
    <div className="bg-slate-950 text-white rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col md:flex-row max-w-4xl mx-auto">
      
      {/* LEFT COLUMN: THE PREMIUM INTERACTIVE VIDEO FRAME */}
      <div className="relative flex-1 bg-black aspect-video md:aspect-auto md:h-[420px] overflow-hidden group select-none flex flex-col justify-between p-4">
        
        {/* Background Slide with Smooth Animation Transitions */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60 z-10" />
          {scenes.map((scene, index) => (
            <img
              key={scene.id}
              src={scene.imageUrl}
              alt={scene.visualDescription}
              referrerPolicy="no-referrer"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                index === currentSceneIndex ? 'opacity-100 scale-105 duration-[5000ms] ease-out' : 'opacity-0 scale-100'
              }`}
            />
          ))}
        </div>

        {/* TOP OVERLAYS: BADGES & TOP PROGRESS BARS */}
        <div className="relative z-20 space-y-3">
          {/* Progress Indicators (Instagram/Shorts Style) */}
          <div className="grid grid-cols-4 gap-1.5">
            {scenes.map((_, index) => {
              let width = '0%';
              if (index < currentSceneIndex) width = '100%';
              else if (index === currentSceneIndex) width = `${progress}%`;

              return (
                <div key={index} className="h-1 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-400 transition-all duration-75 ease-linear"
                    style={{ width }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center">
            <span className="bg-emerald-500/95 text-slate-950 text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5 shadow-lg shadow-emerald-950/20">
              <Sparkles className="w-3 h-3 animate-pulse" />
              <span>AI Commercial Live</span>
            </span>
            
            <div className="flex items-center gap-1.5">
              <span className="bg-black/60 text-slate-300 text-[9px] font-mono tracking-wider px-2 py-0.5 rounded-md border border-white/5">
                🎵 {musicMood}
              </span>
              <button
                onClick={handleMuteToggle}
                className="bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full border border-white/5 transition"
                title={isMuted ? "Unmute Sound" : "Mute Sound"}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
            </div>
          </div>
        </div>

        {/* MID SCREEN: GLOWING COMMERCIAL INTERACTIVE BADGE */}
        <div className="relative z-20 flex justify-center items-center pointer-events-none">
          {(!isPlaying && progress === 0) && (
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-4 rounded-2xl flex flex-col items-center gap-2 max-w-xs text-center animate-bounce">
              <Tv className="w-8 h-8 text-emerald-400" />
              <p className="text-[11px] font-black text-slate-200">
                Pindutin ang Play para mapakinggan ang AI Voiceover at Music!
              </p>
            </div>
          )}
        </div>

        {/* BOTTOM OVERLAYS: SYNCED SUBTITLES & MEDIA CONTROLS */}
        <div className="relative z-20 space-y-4">
          
          {/* Subtitles Area */}
          <div className="bg-black/80 backdrop-blur-xs border border-white/10 p-3 rounded-2xl shadow-xl text-center min-h-[60px] flex items-center justify-center">
            <p className="text-sm font-extrabold text-slate-50 leading-relaxed tracking-wide transition-all duration-300 animate-fadeIn">
              "{scenes[currentSceneIndex]?.text}"
            </p>
          </div>

          {/* Media Player Control Bar */}
          <div className="flex items-center justify-between gap-4 bg-slate-950/80 backdrop-blur-md p-2 rounded-2xl border border-white/5 shadow-2xl">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className={`p-3 rounded-xl transition cursor-pointer select-none font-bold text-xs flex items-center gap-1.5 ${
                  isPlaying 
                    ? 'bg-rose-500 hover:bg-rose-600 text-white' 
                    : 'bg-emerald-400 hover:bg-emerald-500 text-slate-950'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>PAUSE</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>PLAY COMMERCIAL</span>
                  </>
                )}
              </button>

              <button
                onClick={restartPlay}
                className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl transition cursor-pointer"
                title="I-restart"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={businessUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-white hover:bg-slate-100 text-slate-950 font-black text-[11px] px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-white/5 transition"
              >
                <span>{ctaText || 'Bisitahin'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

        </div>

      </div>

      {/* RIGHT COLUMN: AI SCRIPT & METRICS OUTLINE */}
      <div className="w-full md:w-[320px] bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-5 flex flex-col justify-between gap-5">
        
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 className="font-extrabold text-sm text-slate-100 leading-none">{businessTitle}</h3>
              <span className="text-[10px] text-slate-400 font-bold select-none">{title}</span>
            </div>
            <button
              onClick={() => setShowScript(!showScript)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-extrabold text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1 transition select-none cursor-pointer"
            >
              <FileText className="w-3 h-3" />
              <span>{showScript ? 'Itago Script' : 'Ipakita Script'}</span>
            </button>
          </div>

          {/* SCRIPT TIMELINE OUTLINE */}
          <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1 scrollbar-thin">
            {scenes.map((scene, index) => {
              const isActive = index === currentSceneIndex;
              return (
                <div 
                  key={scene.id}
                  onClick={() => {
                    setCurrentSceneIndex(index);
                    setProgress(0);
                    setIsPlaying(true);
                  }}
                  className={`border p-2.5 rounded-xl text-left transition duration-200 cursor-pointer ${
                    isActive 
                      ? 'bg-slate-800/80 border-emerald-500/50 shadow-lg shadow-emerald-500/5' 
                      : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-[9px] font-black tracking-wider uppercase ${
                      isActive ? 'text-emerald-400' : 'text-slate-500'
                    }`}>
                      Scene {index + 1} (5s)
                    </span>
                    {isActive && <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-ping" />}
                  </div>
                  <p className={`text-[11px] font-medium leading-relaxed ${
                    isActive ? 'text-slate-100' : 'text-slate-400'
                  }`}>
                    {scene.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA CARD FOOTER */}
        <div className="bg-slate-950/50 rounded-2xl p-3 border border-slate-800 flex items-center justify-between gap-3 text-[10px] font-bold text-slate-400 select-none">
          <div className="space-y-0.5">
            <div>⚡ Boses: <span className="font-extrabold text-slate-200">AI Tagalog Engine</span></div>
            <div>⏱️ Kabuuang Oras: <span className="font-extrabold text-slate-200">20 Segundo</span></div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl font-black cursor-pointer"
            >
              Isara
            </button>
          )}
        </div>

      </div>

    </div>
  );
}
