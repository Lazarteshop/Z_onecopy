import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Coins, 
  Globe, 
  Users, 
  Wallet, 
  Upload, 
  CheckCircle,
  MessageCircle,
  Heart,
  Smartphone,
  ChevronRight,
  Info,
  Video,
  FileText,
  UserPlus,
  RefreshCw,
  Volume2,
  VolumeX,
  Volume1,
  ExternalLink,
  Volume,
  Camera,
  Download,
  Loader2,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundEffects } from '../utils/audio';

interface ExplainerSlide {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  accentColor?: string;
  visual?: React.ReactNode;
  narration: string;
  visualType?: string;
}

export default function ZoneTagalogExplainer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [progress, setProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'interactive' | 'script' | 'generator'>('interactive');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [voiceMode, setVoiceMode] = useState<'normal' | 'happy' | 'romance' | 'sad' | 'horror' | 'news'>('normal');
  
  // Advanced Human Voice & SSML Tuning States
  const [ttsSpeakNaturally, setTtsSpeakNaturally] = useState(true);
  const [ttsWarmTone, setTtsWarmTone] = useState(true);
  const [ttsPauseNaturally, setTtsPauseNaturally] = useState(true);
  const [ttsNewsPresenter, setTtsNewsPresenter] = useState(false);
  const [ttsEmotionEmphasis, setTtsEmotionEmphasis] = useState(true);
  const [ttsHighQualityAI, setTtsHighQualityAI] = useState(true);
  const [ttsAutoPunctuate, setTtsAutoPunctuate] = useState(true);
  const [ttsSSMLMode, setTtsSSMLMode] = useState(true);
  const [ttsVerbatim, setTtsVerbatim] = useState(true);

  const [hasInteracted, setHasInteracted] = useState(false);
  const speechActiveRef = useRef<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [voiceErrorMsg, setVoiceErrorMsg] = useState<string | null>(null);

  // Video Exporter States
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState("");
  const [videoDownloadUrl, setVideoDownloadUrl] = useState<string | null>(null);

  // Helper for rendering wrapped text to canvas
  const wrapText = (context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = context.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        context.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    context.fillText(line, x, currentY);
  };

  // Helper for drawing interactive devices onto recording canvas
  const drawVisualMockup = (ctx: CanvasRenderingContext2D, stepOrType: number | string, frame: number, x: number, y: number, w: number, h: number) => {
    // Draw outer card shadow & background
    ctx.fillStyle = '#1e293b'; // slate-800
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 24);
    ctx.fill();
    ctx.stroke();

    // Draw top browser/device header bar
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 10, w - 20, 45, 12);
    ctx.fill();

    ctx.fillStyle = '#38bdf8'; // sky-400
    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.fillText('📱 Z-ONEAPP SIMULATOR ENGINE', x + 25, y + 36);

    let activeType = '';
    if (typeof stepOrType === 'number') {
      const types = ['registration', 'campaigns', 'spin', 'feed', 'cashout'];
      activeType = types[stepOrType] || 'info';
    } else {
      activeType = stepOrType;
    }

    if (activeType === 'registration') {
      // REGISTRATION
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(x + 20, y + 70, w - 40, 200, 16);
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '900 12px "Inter", sans-serif';
      ctx.fillText('MOBILE REGISTRATION', x + 35, y + 100);

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(x + 35, y + 120, w - 70, 35, 8);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px "Inter", sans-serif';
      ctx.fillText('+63 917 123 4567', x + 45, y + 142);

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(x + 35, y + 165, w - 70, 35, 8);
      ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.fillText('••••••••••••', x + 45, y + 187);

      // Glowing submit button
      const pulse = Math.abs(Math.sin(frame * 0.08)) * 0.2 + 0.8;
      ctx.fillStyle = `rgba(79, 70, 229, ${pulse})`;
      ctx.beginPath();
      ctx.roundRect(x + 35, y + 215, w - 70, 40, 10);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 11px "Inter", sans-serif';
      ctx.fillText('CREATE MY ACCOUNT (5s)', x + 55, y + 239);
    } else if (activeType === 'campaigns') {
      // BROWSE & EARN Countdowns
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(x + 20, y + 70, w - 40, 200, 16);
      ctx.fill();

      ctx.fillStyle = '#f59e0b'; // amber
      ctx.font = '900 28px "Inter", sans-serif';
      const secRemaining = Math.max(1, 5 - Math.floor((frame % 150) / 30));
      ctx.fillText(`${secRemaining}s`, x + w/2 - 20, y + 125);

      // Countdown progress
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x + 40, y + 150, w - 80, 8);
      ctx.fillStyle = '#f59e0b';
      const progressRatio = ((frame % 150) / 150) * (w - 80);
      ctx.fillRect(x + 40, y + 150, progressRatio, 8);

      // Reward banner
      ctx.fillStyle = '#10b981'; // emerald
      ctx.font = '900 16px "Inter", sans-serif';
      ctx.fillText('💰 WALLET REWARD: +₱5.00', x + 40, y + 205);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'medium 10px "Inter", sans-serif';
      ctx.fillText('Sponsor visits are recorded in Firestore db!', x + 40, y + 240);
    } else if (activeType === 'spin') {
      // SPIN WHEEL
      ctx.save();
      ctx.translate(x + w/2, y + h/2 + 20);
      ctx.rotate(frame * 0.06);

      const parts = 6;
      const palette = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
      const textLabels = ['₱10', '₱50', 'TRY', '₱100', '₱5', 'TRY'];

      for (let i = 0; i < parts; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 80, (i * 2 * Math.PI) / parts, ((i + 1) * 2 * Math.PI) / parts);
        ctx.lineTo(0, 0);
        ctx.fillStyle = palette[i];
        ctx.fill();

        ctx.save();
        ctx.rotate((i + 0.5) * 2 * Math.PI / parts);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 10px "Inter", sans-serif';
        ctx.fillText(textLabels[i], 40, 4);
        ctx.restore();
      }
      ctx.restore();

      // Pin Indicator
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(x + w/2 - 8, y + h/2 - 60);
      ctx.lineTo(x + w/2 + 8, y + h/2 - 60);
      ctx.lineTo(x + w/2, y + h/2 - 40);
      ctx.closePath();
      ctx.fill();
    } else if (activeType === 'feed') {
      // COMMUNITY POST
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(x + 15, y + 70, w - 30, 200, 16);
      ctx.fill();

      // Avatar
      ctx.fillStyle = '#818cf8';
      ctx.beginPath();
      ctx.arc(x + 40, y + 100, 15, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.font = '900 11px "Inter", sans-serif';
      ctx.fillText('Lara Santos', x + 65, y + 98);
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 8px "Inter", sans-serif';
      ctx.fillText('Kapamilyer Member • 5 mins ago', x + 65, y + 110);

      ctx.fillStyle = '#334155';
      ctx.font = 'bold 9px "Inter", sans-serif';
      ctx.fillText('Salamat Z-oneApp! Approved kaagad ang GCash payout ko! ❤️', x + 30, y + 140);

      // Shared Image simulation
      ctx.fillStyle = '#bfdbfe';
      ctx.beginPath();
      ctx.roundRect(x + 30, y + 155, w - 60, 65, 8);
      ctx.fill();
      ctx.fillStyle = '#1e3a8a';
      ctx.font = '900 11px "Inter", sans-serif';
      ctx.fillText('₱100.00 GCASH RECEIPT', x + w/2 - 60, y + 195);

      // Hearts
      ctx.fillStyle = '#f43f5e';
      ctx.font = '900 9px "Inter", sans-serif';
      ctx.fillText('💖 48 Likes', x + 30, y + 250);
    } else if (activeType === 'cashout') {
      // GCASH WITHDRAWAL
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.roundRect(x + 20, y + 70, w - 40, 90, 16);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 14px "Inter", sans-serif';
      ctx.fillText('✓ GCASH CASHOUT COMPLETED', x + 35, y + 110);
      ctx.font = 'bold 11px "Inter", sans-serif';
      ctx.fillText('₱100.00 transferred instantly', x + 35, y + 135);

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(x + 20, y + 175, w - 40, 95, 12);
      ctx.fill();

      ctx.fillStyle = '#10b981';
      ctx.font = '900 10px "Inter", sans-serif';
      ctx.fillText('DESTINATION: 0917-123-4567', x + 35, y + 205);
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'medium 9px "Inter", sans-serif';
      ctx.fillText('System verified by Secure Gateway.', x + 35, y + 235);
    } else if (activeType === 'info') {
      // GENERAL INFORMATION DASHBOARD
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(x + 20, y + 70, w - 40, 200, 16);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.font = '900 13px "Inter", sans-serif';
      ctx.fillText('⚡ ACTIVE USER STATISTICS', x + 35, y + 100);

      // Draw mini visual chart
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x + 35, y + 120, w - 70, 80);
      
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 40, y + 180);
      ctx.lineTo(x + 80, y + 150 + Math.sin(frame * 0.05) * 10);
      ctx.lineTo(x + 120, y + 160 + Math.cos(frame * 0.05) * 12);
      ctx.lineTo(x + 160, y + 135 + Math.sin(frame * 0.03) * 15);
      ctx.lineTo(x + 200, y + 145);
      ctx.lineTo(x + w - 45, y + 125);
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.font = '900 11px "Inter", sans-serif';
      ctx.fillText('₱ ACTIVE REWARDS POOL', x + 35, y + 225);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px "Inter", sans-serif';
      ctx.fillText('Sponsor networks verified via API.', x + 35, y + 245);
    }
  };

  // Video recording and export engine
  const exportVideo = async () => {
    setExporting(true);
    setExportProgress(0);
    setVideoDownloadUrl(null);
    setExportStatus("Inihahanda ang studio at high-fidelity voice stream...");

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setExportStatus("Error: Failed to initialize 2D canvas context.");
      setExporting(false);
      return;
    }

    const recordedChunks: Blob[] = [];
    let currentExportSlide = 0;
    let isRecordingActive = true;
    let frame = 0;

    // Set up Audio Context and Destination for recording audio from TTS
    let audioCtx: AudioContext | null = null;
    let dest: MediaStreamAudioDestinationNode | null = null;

    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      dest = audioCtx.createMediaStreamDestination();
    } catch (e) {
      console.warn("Could not create Web Audio Context for video recording, exporting silently:", e);
    }

    // Capture the 30fps stream from canvas
    const canvasStream = canvas.captureStream(30);

    // Combine tracks (Video from canvas + Audio from Web Audio API Destination)
    const combinedStream = new MediaStream();
    canvasStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
    if (dest) {
      dest.stream.getAudioTracks().forEach(track => {
        combinedStream.addTrack(track);
      });
    }

    let options = { mimeType: 'video/webm;codecs=vp9,opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm;codecs=vp8,opus' };
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm' };
    }

    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(combinedStream, options);
    } catch (recorderErr) {
      console.warn("MediaRecorder creation failed, trying default stream fallback:", recorderErr);
      mediaRecorder = new MediaRecorder(combinedStream);
    }

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setVideoDownloadUrl(url);
      setExporting(false);
      setExportProgress(100);
      setExportStatus("Matagumpay na natapos! Handa nang i-download ang iyong Explainer Video.");
      try {
        soundEffects.playReward();
      } catch (err) {}
    };

    // Start recording chunks
    mediaRecorder.start();

    // Custom Animation loop inside recording canvas
    const drawFrame = () => {
      if (!isRecordingActive) return;

      frame++;
      // Background base
      ctx.fillStyle = '#020617'; // slate-950
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Beautiful tech grid design
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let j = 0; j < canvas.height; j += 50) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(canvas.width, j);
        ctx.stroke();
      }

      // Glowing radial overlay
      const radGrad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 100, canvas.width / 2, canvas.height / 2, 700);
      radGrad.addColorStop(0, 'rgba(99, 102, 241, 0.18)'); // indigo
      radGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header branding
      ctx.fillStyle = '#818cf8'; // indigo-400
      ctx.font = '900 20px "Inter", sans-serif';
      ctx.fillText('⚡ ZONEAPP PILIPINAS • CO-CREATOR STUDIO', 60, 70);

      const activeExpSlide = slides[currentExportSlide];
      if (activeExpSlide) {
        // Step indicator tag
        ctx.fillStyle = 'rgba(79, 70, 229, 0.15)';
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
        ctx.beginPath();
        ctx.roundRect(60, 100, 160, 32, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#a5b4fc';
        ctx.font = '900 11px "Inter", sans-serif';
        ctx.fillText(`HAKBANG ${currentExportSlide + 1} NG ${slides.length}`, 80, 120);

        // Slide Title & Subtitle
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 38px "Inter", sans-serif';
        ctx.fillText(activeExpSlide.title, 60, 190);

        ctx.fillStyle = '#94a3b8'; // slate-400
        ctx.font = 'bold 20px "Inter", sans-serif';
        ctx.fillText(activeExpSlide.subtitle, 60, 230);

        // Beautiful rounded narration box
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(60, 460, canvas.width - 120, 200, 24);
        ctx.fill();
        ctx.stroke();

        // Title for voice script
        ctx.fillStyle = '#6366f1';
        ctx.font = '900 12px "Inter", sans-serif';
        ctx.fillText('🎙️ CO-CREATOR NARRATION SCRIPT (TAGALOG AUDIO):', 90, 500);

        // Text wrapping
        ctx.fillStyle = '#f1f5f9';
        ctx.font = 'bold 18px "Inter", sans-serif';
        wrapText(ctx, `"${activeExpSlide.narration}"`, 90, 535, canvas.width - 180, 30);

        // Waveform audio feedback simulation
        ctx.fillStyle = 'rgba(99, 102, 241, 0.3)';
        for (let x = 60; x < canvas.width - 60; x += 20) {
          const h = Math.abs(Math.sin((x + frame) * 0.04)) * 35 + 5;
          ctx.fillRect(x, 420 - h/2, 8, h);
        }

        // Draw Interactive Mockup Graphics
        drawVisualMockup(ctx, activeExpSlide.visualType || currentExportSlide, frame, canvas.width - 480, 80, 420, 350);
      }

      // Bottom glowing timeline
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(60, 690, canvas.width - 120, 8);
      ctx.fillStyle = '#10b981'; // emerald
      const totalStepsWidth = (canvas.width - 120);
      const segmentWidth = totalStepsWidth / slides.length;
      const progressWidth = segmentWidth * currentExportSlide + (segmentWidth * ((frame % 240) / 240));
      ctx.fillRect(60, 690, Math.min(totalStepsWidth, progressWidth), 8);

      requestAnimationFrame(drawFrame);
    };

    // Run render loops
    requestAnimationFrame(drawFrame);

    const playNextScene = async () => {
      if (currentExportSlide >= slides.length) {
        isRecordingActive = false;
        try {
          mediaRecorder.stop();
        } catch (e) {}
        if (audioCtx) {
          try {
            audioCtx.close();
          } catch (e) {}
        }
        return;
      }

      setExportProgress(Math.round((currentExportSlide / slides.length) * 100));
      setExportStatus(`Kasalukuyang nag-sasalita para sa: "${slides[currentExportSlide].title}"...`);

      const text = slides[currentExportSlide].narration;
      let spokenText = text;

      const ttsUrl = `/api/tts?text=${encodeURIComponent(spokenText)}&lang=tl&voiceMode=${voiceMode}&v=${Date.now()}&speakNaturally=${ttsSpeakNaturally}&warmTone=${ttsWarmTone}&pauseNaturally=${ttsPauseNaturally}&newsPresenter=${ttsNewsPresenter}&emotionEmphasis=${ttsEmotionEmphasis}&highQualityAI=${ttsHighQualityAI}&autoPunctuate=${ttsAutoPunctuate}&ssmlMode=${ttsSSMLMode}&verbatim=${ttsVerbatim}`;

      try {
        // Fetch audio directly as ArrayBuffer and decode via AudioContext for 100% reliable stream input
        const response = await fetch(ttsUrl);
        if (!response.ok) throw new Error(`Fetch TTS failed with status: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();

        if (audioCtx && dest) {
          const currentCtx = audioCtx;
          const currentDest = dest;
          // Decode arrayBuffer asynchronously
          currentCtx.decodeAudioData(
            arrayBuffer,
            (audioBuffer) => {
              if (!isRecordingActive) return;
              
              const sourceNode = currentCtx.createBufferSource();
              sourceNode.buffer = audioBuffer;
              
              // Configure dynamic playbackRate for export matching the chosen style
              let rate = 1.0;
              if (voiceMode === 'happy') rate = 1.16;
              else if (voiceMode === 'romance') rate = 0.88;
              else if (voiceMode === 'sad') rate = 0.80;
              else if (voiceMode === 'horror') rate = 0.70;
              else if (voiceMode === 'news') rate = 1.24;

              try {
                sourceNode.playbackRate.setValueAtTime(rate, currentCtx.currentTime);
              } catch (e) {}

              // Build professional voice effects pipeline
              let lastNode: AudioNode = sourceNode;

              try {
                if (voiceMode === 'horror') {
                  // Ghostly echo feedback loop
                  const delayNode = currentCtx.createDelay(2.0);
                  delayNode.delayTime.value = 0.35;
                  const feedbackNode = currentCtx.createGain();
                  feedbackNode.gain.value = 0.45;
                  
                  delayNode.connect(feedbackNode);
                  feedbackNode.connect(delayNode);
                  
                  const dryGain = currentCtx.createGain();
                  dryGain.gain.value = 0.65;
                  const wetGain = currentCtx.createGain();
                  wetGain.gain.value = 0.45;
                  
                  sourceNode.connect(dryGain);
                  sourceNode.connect(delayNode);
                  delayNode.connect(wetGain);
                  
                  const outputMixer = currentCtx.createGain();
                  dryGain.connect(outputMixer);
                  wetGain.connect(outputMixer);
                  lastNode = outputMixer;
                } else if (voiceMode === 'romance') {
                  // Sweet spacious echo
                  const delayNode = currentCtx.createDelay(1.0);
                  delayNode.delayTime.value = 0.22;
                  const feedbackNode = currentCtx.createGain();
                  feedbackNode.gain.value = 0.25;
                  
                  delayNode.connect(feedbackNode);
                  feedbackNode.connect(delayNode);
                  
                  const dryGain = currentCtx.createGain();
                  dryGain.gain.value = 0.8;
                  const wetGain = currentCtx.createGain();
                  wetGain.gain.value = 0.25;
                  
                  sourceNode.connect(dryGain);
                  sourceNode.connect(delayNode);
                  delayNode.connect(wetGain);
                  
                  const outputMixer = currentCtx.createGain();
                  dryGain.connect(outputMixer);
                  wetGain.connect(outputMixer);
                  lastNode = outputMixer;
                } else if (voiceMode === 'news') {
                  // Radio broadcast filter (crisp highpass)
                  const filterNode = currentCtx.createBiquadFilter();
                  filterNode.type = 'highpass';
                  filterNode.frequency.setValueAtTime(220, currentCtx.currentTime);
                  sourceNode.connect(filterNode);
                  lastNode = filterNode;
                }
              } catch (err) {
                console.warn("Failed to apply web audio node effects, using clean bypass:", err);
                lastNode = sourceNode;
              }

              // Route final node to MediaRecorder and user's speakers simultaneously
              lastNode.connect(currentDest);
              lastNode.connect(currentCtx.destination);
              
              sourceNode.onended = () => {
                currentExportSlide++;
                frame = 0; // reset slide frame count
                playNextScene();
              };
              
              sourceNode.start(0);
            },
            (decodeErr) => {
              console.error("Audio decoding failed, fallback to delay:", decodeErr);
              setTimeout(() => {
                currentExportSlide++;
                frame = 0;
                playNextScene();
              }, 8000);
            }
          );
        } else {
          // Fallback if no audioCtx
          setTimeout(() => {
            currentExportSlide++;
            frame = 0;
            playNextScene();
          }, 8000);
        }
      } catch (err) {
        console.warn("Failed to fetch/decode audio during export, fallback to delay", err);
        setTimeout(() => {
          currentExportSlide++;
          frame = 0;
          playNextScene();
        }, 8000);
      }
    };

    // Start scene 1
    playNextScene();
  };

  // Function to trigger voice narration using server-side TTS stream via HTML5 Audio
  const speakText = (text: string) => {
    // 1. Cancel and clean up existing audio stream to prevent overlap
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch (err) {}
      audioRef.current = null;
    }

    if (!isVoiceEnabled) return;

    // Determine playback speed and pitch based on active voiceMode
    let currentRate = 1.0;
    let currentPitch = 1.0;
    
    if (voiceMode === 'happy') {
      currentRate = 1.16;
      currentPitch = 1.15;
    } else if (voiceMode === 'romance') {
      currentRate = 0.88;
      currentPitch = 0.96;
    } else if (voiceMode === 'sad') {
      currentRate = 0.80;
      currentPitch = 0.86;
    } else if (voiceMode === 'horror') {
      currentRate = 0.70;
      currentPitch = 0.75;
    } else if (voiceMode === 'news') {
      currentRate = 1.24;
      currentPitch = 1.05;
    }

    // Formatting currency symbols & numbers to Tagalog words for fluent pronunciation
    let spokenText = text;

    // Trigger programmatic sound click to wake up Web Audio Context
    try {
      soundEffects.playClick();
    } catch (e) {
      console.warn("Web Audio Context could not be initialized:", e);
    }

    try {
      // Create HTML5 Audio pointing to our server-side proxy
      const ttsUrl = `/api/tts?text=${encodeURIComponent(spokenText)}&lang=tl&voiceMode=${voiceMode}&v=${Date.now()}&speakNaturally=${ttsSpeakNaturally}&warmTone=${ttsWarmTone}&pauseNaturally=${ttsPauseNaturally}&newsPresenter=${ttsNewsPresenter}&emotionEmphasis=${ttsEmotionEmphasis}&highQualityAI=${ttsHighQualityAI}&autoPunctuate=${ttsAutoPunctuate}&ssmlMode=${ttsSSMLMode}&verbatim=${ttsVerbatim}`;
      const audioInstance = new Audio();
      audioInstance.crossOrigin = "anonymous";
      audioInstance.src = ttsUrl;
      
      // Set playback speed
      try {
        audioInstance.defaultPlaybackRate = currentRate;
        audioInstance.playbackRate = currentRate;
      } catch (e) {}
      
      audioRef.current = audioInstance;

      audioInstance.onplay = () => {
        speechActiveRef.current = true;
        setVoiceErrorMsg(null);
        try {
          audioInstance.playbackRate = currentRate;
        } catch (e) {}
      };
      audioInstance.onended = () => {
        speechActiveRef.current = false;
      };
      audioInstance.onerror = (e) => {
        console.error("Audio streaming error:", e);
        
        // --- 100% BULLETPROOF FALLBACK ENGINE ---
        // If server-side stream fails or receives a 500 error (e.g. cloud IP blocking),
        // fallback to browser's native client-side SpeechSynthesis immediately!
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          console.log("Audio streaming failed, trying browser native SpeechSynthesis as fallback...");
          try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(spokenText);
            utterance.lang = 'tl-PH';
            utterance.rate = currentRate;
            utterance.pitch = currentPitch;
            window.speechSynthesis.speak(utterance);
            speechActiveRef.current = true;
          } catch (speechErr) {
            console.error("Browser speech fallback failed:", speechErr);
            setVoiceErrorMsg("Hindi ma-stream ang boses mula sa server at hindi suportado ang boses sa browser na ito.");
          }
        } else {
          speechActiveRef.current = false;
          setVoiceErrorMsg("Hindi ma-stream ang boses mula sa server. Pakiclick ang Subukan ang Tunog.");
        }
      };

      const playPromise = audioInstance.play();
      if (playPromise !== undefined) {
        playPromise.catch((playErr) => {
          console.warn("Autoplay was blocked by browser, trying fallback speech:", playErr);
          
          // Autoplay blocked fallback
          if (typeof window !== 'undefined' && window.speechSynthesis) {
            try {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(spokenText);
              utterance.lang = 'tl-PH';
              utterance.rate = currentRate;
              utterance.pitch = currentPitch;
              window.speechSynthesis.speak(utterance);
            } catch (fallbackErr) {}
          }
          setVoiceErrorMsg("I-click ang kahit saan sa screen o pindutin ang 'Pakinggan ang Boses' button upang payagan ang boses.");
        });
      }
    } catch (err: any) {
      console.error("Error setting up audio stream:", err);
      setVoiceErrorMsg("Hindi ma-initialize ang boses sa browser na ito.");
    }
  };

  // Trigger speech whenever active slide changes, but only if they have interacted
  useEffect(() => {
    if (hasInteracted) {
      speakText(slides[activeSlide].narration);
    }

    return () => {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch (e) {}
      }
    };
  }, [activeSlide, isVoiceEnabled, hasInteracted]);

  // Clean up any speaking voice when component is destroyed/unmounted
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch (e) {}
      }
    };
  }, []);

  const renderVisualNode = (visualType: string | undefined, step: number) => {
    const type = visualType || ['registration', 'campaigns', 'spin', 'feed', 'cashout'][step] || 'info';
    
    if (type === 'registration') {
      return (
        <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-left">
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <div className="h-2.5 w-2.5 rounded-full bg-blue-500"></div>
            <span className="text-[10px] font-black text-slate-300 font-mono">Z-one REGISTRATION SYSTEM</span>
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-[8px] text-slate-400 font-bold block mb-1">MOBILE NUMBER</label>
              <div className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white font-mono flex items-center gap-1">
                <span className="text-slate-500 text-[10px]">+63</span>
                <span>917 123 4567</span>
              </div>
            </div>
            <div>
              <label className="text-[8px] text-slate-400 font-bold block mb-1">SECURED PASSWORD</label>
              <div className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-500 font-mono">
                ••••••••••••
              </div>
            </div>
          </div>
          <button className="w-full py-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl text-[10px] font-black text-white uppercase tracking-wider shadow-lg shadow-indigo-950/50">
            Daftar / Register Account
          </button>
        </div>
      );
    }
    
    if (type === 'campaigns') {
      return (
        <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-left relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-[9px] text-indigo-400 font-bold">Lazada Boost Traffic</span>
            <span className="bg-emerald-500/10 text-emerald-400 text-[8px] px-1 rounded font-bold">ACTIVE TASK</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-center space-y-1">
            <div className="text-2xl font-black text-amber-400 font-mono">3s</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full w-3/5"></div>
            </div>
            <p className="text-[8px] text-slate-400 font-semibold mt-1">Sponsor analytics is updating...</p>
          </div>
          <div className="flex items-center justify-between text-[9px] text-slate-400">
            <span>Visit Reward:</span>
            <span className="text-emerald-400 font-extrabold">₱5.00 Cash</span>
          </div>
        </div>
      );
    }

    if (type === 'spin') {
      return (
        <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center space-y-3 relative">
          <div className="text-[10px] font-black text-pink-400 uppercase tracking-widest">Lucky Spin Wheel</div>
          
          <div className="relative w-24 h-24 mx-auto border-4 border-slate-750 rounded-full flex items-center justify-center bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 shadow-xl shadow-pink-950/20">
            <div className="absolute w-0.5 h-full bg-slate-900/30"></div>
            <div className="absolute h-0.5 w-full bg-slate-900/30"></div>
            <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-800 flex items-center justify-center shadow z-10 text-[10px] font-black text-slate-900">
              SPIN
            </div>
          </div>
          
          <p className="text-[8px] text-slate-400 font-bold">I-click lamang ang SPIN para makuha ang iyong Swerteng Premyo!</p>
        </div>
      );
    }

    if (type === 'feed') {
      return (
        <div className="w-full max-w-xs bg-white rounded-2xl p-3 text-slate-900 border border-slate-200 text-left space-y-2">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
            <span className="text-base">👩‍🦰</span>
            <div>
              <div className="text-[10px] font-extrabold text-slate-900">Lara Santos</div>
              <div className="text-[8px] text-slate-400">10 mins ago</div>
            </div>
          </div>
          <p className="text-[9px] font-semibold text-slate-600 font-sans">Salamat Z-oneApp! Ang dali mag-post at magbahagi ng paboritong memories. ❤️</p>
          <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
            <img 
              src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=500&auto=format&fit=crop&q=60" 
              alt="Community post" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex items-center justify-between text-[8px] text-slate-400 font-bold border-t border-slate-50 pt-1.5">
            <span className="text-red-500 flex items-center gap-0.5">❤️ 24 Likes</span>
            <span>💬 8 Comments</span>
          </div>
        </div>
      );
    }

    if (type === 'cashout') {
      return (
        <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 text-left relative">
          <div className="flex items-center gap-1 text-indigo-400 text-[10px] font-black border-b border-slate-800 pb-1.5 font-mono">
            <Wallet className="w-3.5 h-3.5" />
            <span>SECURED PAYMENT SERVICE</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[8px] text-slate-400 font-bold font-mono">
              <span>CASHOUT TYPE:</span>
              <span className="text-white font-mono">GCASH INSTAPAY</span>
            </div>
            <div className="flex justify-between text-[8px] text-slate-400 font-bold font-mono">
              <span>RECIPIENT NUMBER:</span>
              <span className="text-white font-mono">0917-XXX-1234</span>
            </div>
            <div className="flex justify-between text-[8px] text-slate-400 font-bold font-mono">
              <span>AMOUNT:</span>
              <span className="text-emerald-400 font-black">₱100.00</span>
            </div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 py-1 rounded-lg text-center">
            <span className="text-[8px] text-emerald-400 font-extrabold">✓ SENT SUCCESSFULLY VIA SECURE GATEWAY</span>
          </div>
        </div>
      );
    }

    // Fallback / info
    return (
      <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-left">
        <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] font-black text-slate-300 font-mono">SYSTEM METRICS PANEL</span>
        </div>
        <div className="space-y-2 text-[10px]">
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-850">
            <div className="text-[8px] text-slate-400 font-bold">TOTAL REGISTERED MEMBERS</div>
            <div className="text-lg font-black text-white font-mono mt-0.5">18,248+</div>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-850">
            <div className="text-[8px] text-emerald-400 font-bold">✓ SERVER UPTIME STATUS</div>
            <div className="text-xs font-bold text-slate-200 mt-1 flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>100% Operational & Secured</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const defaultSlides: ExplainerSlide[] = [
    {
      title: "1. Paano Mag-register",
      subtitle: "Gumawa ng account sa loob ng 5 segundo",
      icon: <UserPlus className="w-5 h-5 text-blue-400" />,
      accentColor: "from-blue-600 to-indigo-600",
      narration: "Mabuhay! Upang makapagsimula sa Z-oneApp, buksan ang app at magrehistro. Ilagay lamang ang iyong Mobile Number, gumawa ng secured na password, at i-click ang Register! Ganun lang kabilis, may access ka na sa pinaka-bago at pinaka-secure na platform sa Pilipinas.",
      visualType: "registration"
    },
    {
      title: "2. Paano Kumita sa Campaigns",
      subtitle: "Mag-open ng sponsor web pages para kumita",
      icon: <Coins className="w-5 h-5 text-yellow-400" />,
      accentColor: "from-amber-500 to-yellow-500",
      narration: "Sa 'Browse & Earn' tab, makikita ang mga listahan ng sponsor campaigns. I-click lamang ang alinman dito para mag-open ang Sponsor Website Simulator. Manatili lamang doon at hintaying matapos ang 5-segundong countdown. Awtomatikong papasok ang dagdag na ₱5.00 sa iyong wallet balance bawat matagumpay na visit!",
      visualType: "campaigns"
    },
    {
      title: "3. Spin Wheel of Fortune",
      subtitle: "Paikutin ang gulong para sa karagdagang premyo",
      icon: <RefreshCw className="w-5 h-5 text-pink-400 animate-spin-slow" />,
      accentColor: "from-pink-600 to-rose-600",
      narration: "Gusto mo pa ba ng mas maraming rewards? Subukan ang aming Gulong ng Kapalaran o Spin Wheel! Dito ay may tsansa kang manalo ng karagdagang barya, dagdag na wallet rewards, o referral boosts na makakatulong para mas mabilis mong mapalago ang iyong ipon.",
      visualType: "spin"
    },
    {
      title: "4. Z-one Social Community Feed",
      subtitle: "Mag-post ng memories at kumonekta sa iba",
      icon: <Users className="w-5 h-5 text-emerald-400" />,
      accentColor: "from-emerald-600 to-teal-600",
      narration: "Ang Z-oneApp ay hindi lang pangkabuhayan, ito rin ay isang masiglang komunidad! Sa Z-one Feed, maaari kang kumuha ng larawan o mag-upload mula sa iyong phone gallery upang ibahagi ang iyong paboritong alaala. Sumulat ng status, mag-react ng puso, at mag-comment sa posts ng ibang ka-miyembro para sa mas masayang talakayan.",
      visualType: "feed"
    },
    {
      title: "5. Ligtas at Mabilis na GCash Cash-out",
      subtitle: "I-withdraw ang ipon diretso sa iyong GCash wallet",
      icon: <Wallet className="w-5 h-5 text-indigo-400" />,
      accentColor: "from-indigo-600 to-purple-600",
      narration: "Kapag umabot na sa ₱100.00 ang iyong wallet balance, maaari mo na itong i-withdraw! Pumunta lamang sa 'GCash Cash-Out' tab, ilagay ang iyong GCash Name at Registered Number. Awtomatikong ipapadala ng aming secured server system ang pondo diretso sa iyong GCash account na may kasamang simulated network SMS alert para sa iyong seguridad.",
      visualType: "cashout"
    }
  ];

  const [slides, setSlides] = useState<ExplainerSlide[]>(defaultSlides);

  // Dynamic state for custom script generator
  const [userPrompt, setUserPrompt] = useState("");
  const [generatingScript, setGeneratingScript] = useState(false);
  const [generatorError, setGeneratorError] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState(false);

  const handleGenerateScript = async (promptText: string) => {
    if (!promptText.trim()) return;
    setGeneratingScript(true);
    setGeneratorError(null);
    setGenerationSuccess(false);
    try {
      const response = await fetch('/api/gemini/generate-video-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: promptText })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.scenes) {
        const mappedSlides = data.scenes.map((scene: any, index: number) => {
          let icon = <Sparkles className="w-5 h-5 text-indigo-400" />;
          let accentColor = "from-indigo-600 to-purple-600";
          
          if (scene.visualType === 'registration') {
            icon = <UserPlus className="w-5 h-5 text-blue-400" />;
            accentColor = "from-blue-600 to-indigo-600";
          } else if (scene.visualType === 'campaigns') {
            icon = <Coins className="w-5 h-5 text-yellow-400" />;
            accentColor = "from-amber-500 to-yellow-500";
          } else if (scene.visualType === 'spin') {
            icon = <RefreshCw className="w-5 h-5 text-pink-400 animate-spin-slow" />;
            accentColor = "from-pink-600 to-rose-600";
          } else if (scene.visualType === 'feed') {
            icon = <Users className="w-5 h-5 text-emerald-400" />;
            accentColor = "from-emerald-600 to-teal-600";
          } else if (scene.visualType === 'cashout') {
            icon = <Wallet className="w-5 h-5 text-indigo-400" />;
            accentColor = "from-indigo-600 to-purple-600";
          }

          return {
            title: scene.title,
            subtitle: scene.subtitle,
            narration: scene.narration,
            icon,
            accentColor,
            visualType: scene.visualType,
            visual: renderVisualNode(scene.visualType, index)
          };
        });

        setSlides(mappedSlides);
        setActiveSlide(0);
        setGenerationSuccess(true);
        try {
          soundEffects.playReward();
        } catch (e) {}
      } else {
        throw new Error(data.message || "Failed to fetch valid scenes.");
      }
    } catch (err: any) {
      console.error("Failed to generate custom video script:", err);
      setGeneratorError("Hindi ma-access ang AI service sa kasalukuyan. Paki-pili ang isa sa mga auto-presets o subukan muli.");
    } finally {
      setGeneratingScript(false);
    }
  };

  // Auto-play timer for slides when playing
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setActiveSlide((prevSlide) => (prevSlide + 1) % slides.length);
            return 0;
          }
          return prev + 1.25; // advance progress
        });
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, slides.length]);

  const handlePlayPause = () => {
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    setHasInteracted(true);
    if (nextPlaying) {
      speakText(slides[activeSlide].narration);
    }
  };

  const selectSlide = (index: number) => {
    setActiveSlide(index);
    setProgress(0);
    setIsPlaying(false);
    setHasInteracted(true);
    speakText(slides[index].narration);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl space-y-4">
      {/* HEADER CONTROLS */}
      <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40">
        <div>
          <span className="bg-indigo-500/15 text-indigo-400 text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
            🎬 Opisyal na Tagalog Guide & Video Explainer
          </span>
          <h3 className="text-base font-black text-white mt-1.5">Mekanismo at Gabay sa Paggamit</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Alamin kung paano magrehistro at gamitin ang lahat ng features ng Z-oneApp</p>
        </div>

        {/* TOGGLE VIEW MODE */}
        <div className="flex bg-slate-850 p-1 rounded-xl border border-slate-800 gap-1 flex-wrap">
          <button
            onClick={() => setViewMode('interactive')}
            className={`px-3 py-1.5 text-[10px] font-black rounded-lg cursor-pointer transition flex items-center gap-1 ${
              viewMode === 'interactive' 
                ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Interactive Demo</span>
          </button>
          <button
            onClick={() => {
              setViewMode('generator');
              // Cancel ongoing speech to not interrupt recorder
              if (audioRef.current) {
                try { audioRef.current.pause(); } catch (e) {}
              }
            }}
            className={`px-3 py-1.5 text-[10px] font-black rounded-lg cursor-pointer transition flex items-center gap-1.5 ${
              viewMode === 'generator' 
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
            title="Gumawa ng sariling explainer video na may boses"
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>Video Generator Studio 🎬</span>
          </button>
          <button
            onClick={() => setViewMode('script')}
            className={`px-3 py-1.5 text-[10px] font-black rounded-lg cursor-pointer transition flex items-center gap-1 ${
              viewMode === 'script' 
                ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Script sa Video</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: INTERACTIVE SLIDESHOW SIMULATOR */}
      {viewMode === 'interactive' ? (
        <div className="p-5 space-y-6">
          {/* VOICE TROUBLESHOOTING & TESTING BANNER */}
          <div className="bg-slate-950/80 border border-slate-800 p-4.5 rounded-2xl space-y-3.5 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 shrink-0 mt-0.5">
                  <Volume2 className="w-5 h-5 animate-pulse" />
                </span>
                <div>
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                    <span>💡 Gabay sa Pagpapagana ng Tunog at Boses</span>
                    <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">Interactive Audio</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-0.5">
                    Dahil ang preview na ito ay nasa loob ng isang <strong>Iframe</strong>, maaaring harangan ng iyong browser (Chrome/Safari) ang Speech Synthesis. Buksan ang app sa bagong tab para sa siguradong boses!
                  </p>
                </div>
              </div>

              {/* ACTION CONTROLS */}
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. TEST SOUND BUTTON (Plays Programmatic Fanfare) */}
                <button
                  onClick={() => {
                    try {
                      soundEffects.playFanfare();
                      setHasInteracted(true);
                      // Try to speak as well
                      speakText("Salamat sa pagsubok ng tunog sa Zone App!");
                    } catch (e) {
                      console.warn(e);
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-750 rounded-xl text-[10px] font-black text-amber-400 flex items-center gap-1.5 cursor-pointer transition shadow-sm"
                  title="Subukan kung may tunog ang iyong speaker gamit ang magandang tono"
                >
                  <Volume className="w-3.5 h-3.5 text-amber-400" />
                  <span>🔊 Subukan ang Tunog (Audio Test)</span>
                </button>

                {/* 2. OPEN IN NEW TAB BUTTON */}
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setHasInteracted(true)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl text-[10px] font-black text-white flex items-center gap-1 cursor-pointer transition shadow-md shadow-indigo-950/40"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buksan sa Bagong Tab (Para sa Boses) ↗</span>
                </a>
              </div>
            </div>

            {/* SHOW DETECTED ERROR OR VOICE PACK STATUS */}
            {voiceErrorMsg ? (
              <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-[9px] text-rose-300 font-bold flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping shrink-0"></span>
                <span>💡 Status: {voiceErrorMsg} (Subukan ang "Buksan sa Bagong Tab" sa itaas upang ma-bypass ang harang ng browser).</span>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-xl text-[9px] text-slate-400 font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span>🎤 High-fidelity server-side stream: <strong className="text-emerald-400 font-bold">Cloud Tagalog Voice activated</strong>.</span>
                <span className="text-[8px] text-indigo-400">Kung hindi pa rin marinig, pakiclick ang "Subukan ang Tunog" button.</span>
              </div>
            )}
          </div>

          {/* FLASHING VOICE ACTIVATION BANNER FOR BROWSERS */}
          {!hasInteracted && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 border border-indigo-500/20 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 animate-pulse">
                  <Volume2 className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-xs font-black text-white">Handang mag-salita ang Gabay! 📢</h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">I-click ang button sa kanan upang simulan ang audio guide sa Tagalog.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setHasInteracted(true);
                  speakText(slides[activeSlide].narration);
                }}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md hover:brightness-110 transition cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Pakinggan ang Boses</span>
              </button>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* LEFT SIDE: SELECTION BUTTONS */}
            <div className="lg:col-span-5 space-y-2">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block mb-1">MGA HAKBANG SA GABAY:</span>
              <div className="space-y-2">
                {slides.map((sc, index) => {
                  const isActive = activeSlide === index;
                  return (
                    <button
                      key={index}
                      onClick={() => selectSlide(index)}
                      className={`w-full text-left p-3 rounded-2xl border transition duration-200 cursor-pointer flex items-center gap-3 ${
                        isActive 
                          ? 'bg-slate-850 border-indigo-500 text-white shadow-lg' 
                          : 'bg-slate-900/50 border-slate-850 text-slate-400 hover:bg-slate-850/50 hover:text-slate-300'
                      }`}
                    >
                      <span className={`p-2 rounded-xl border shrink-0 ${isActive ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                        {sc.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-black leading-snug">{sc.title}</div>
                        <div className="text-[9px] text-slate-500 font-bold leading-none mt-0.5 truncate">{sc.subtitle}</div>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isActive ? 'translate-x-1 text-indigo-400' : 'text-slate-600'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT SIDE: BEAUTIFUL ACTIVE STAGE */}
            <div className="lg:col-span-7 flex flex-col h-full bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden min-h-[340px] shadow-2xl relative">
              {/* STAGE HEADER BACKGROUND */}
              <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-indigo-900/10 to-transparent pointer-events-none"></div>

              {/* PROGRESS STATUS BAR */}
              <div className="p-3 bg-slate-950/90 border-b border-slate-850 flex items-center justify-between text-white z-10">
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                  <span>Interactive Walkthrough Player</span>
                </span>
                <span className="text-[9px] font-mono font-extrabold text-slate-500">
                  Step {activeSlide + 1} of {slides.length}
                </span>
              </div>

              {/* ACTUAL CONTENT VISUAL CONTAINER */}
              <div className="flex-1 flex items-center justify-center p-6 relative min-h-[180px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSlide}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="w-full flex items-center justify-center"
                  >
                    {slides[activeSlide].visual}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* AUDIO / NARRATIVE / VOICE DESCRIPTION BOX */}
              <div className="bg-slate-900/90 border-t border-slate-850 p-4 relative z-10 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="p-1 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-[9px] font-black tracking-wider uppercase">
                    📢 Tagalog Voice Walkthrough
                  </span>

                  {/* VOICE NARRATION SWITCH BUTTON */}
                  <button
                    onClick={() => {
                      const nextState = !isVoiceEnabled;
                      setIsVoiceEnabled(nextState);
                      if (nextState) {
                        speakText(slides[activeSlide].narration);
                      } else {
                        if (typeof window !== 'undefined' && window.speechSynthesis) {
                          window.speechSynthesis.cancel();
                        }
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1.5 cursor-pointer transition ${
                      isVoiceEnabled 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' 
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-300'
                    }`}
                    title={isVoiceEnabled ? "I-mute ang boses" : "I-on ang boses"}
                  >
                    {isVoiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    <span>{isVoiceEnabled ? 'BOSES: ON' : 'BOSES: OFF'}</span>
                  </button>
                </div>

                {/* VOICE STYLE / EMOTION TUNING PANEL */}
                <div className="space-y-1.5 bg-slate-950/30 p-2.5 rounded-2xl border border-slate-850/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-slate-400 font-bold tracking-wider uppercase flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
                      <span>Estilo at Tono ng Boses (Voice Emotion Tuning):</span>
                    </span>
                    <span className="text-[8px] text-indigo-400 font-mono font-black uppercase">Aktibo: {voiceMode}</span>
                  </div>
                  <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1">
                    {(['normal', 'happy', 'romance', 'sad', 'horror', 'news'] as const).map((mode) => {
                      const isActive = voiceMode === mode;
                      let label = '';
                      let icon = '';
                      let hoverStyle = '';
                      let activeStyle = '';
                      
                      if (mode === 'normal') {
                        label = 'Normal';
                        icon = '🗣️';
                        hoverStyle = 'hover:border-slate-600 hover:text-slate-200';
                        activeStyle = 'bg-slate-800 text-white border-slate-600';
                      } else if (mode === 'happy') {
                        label = 'Masaya';
                        icon = '😊';
                        hoverStyle = 'hover:border-amber-700/50 hover:text-amber-300';
                        activeStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                      } else if (mode === 'romance') {
                        label = 'Romance';
                        icon = '💖';
                        hoverStyle = 'hover:border-rose-700/50 hover:text-rose-300';
                        activeStyle = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
                      } else if (mode === 'sad') {
                        label = 'Malungkot';
                        icon = '😢';
                        hoverStyle = 'hover:border-blue-700/50 hover:text-blue-300';
                        activeStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
                      } else if (mode === 'horror') {
                        label = 'Horror';
                        icon = '👻';
                        hoverStyle = 'hover:border-purple-700/50 hover:text-purple-300';
                        activeStyle = 'bg-purple-500/10 text-purple-400 border-purple-500/30';
                      } else if (mode === 'news') {
                        label = 'Balita';
                        icon = '📢';
                        hoverStyle = 'hover:border-emerald-700/50 hover:text-emerald-300';
                        activeStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                      }

                      return (
                        <button
                          key={mode}
                          onClick={() => {
                            setVoiceMode(mode);
                            // Give brief state propagation time then speak
                            setTimeout(() => {
                              speakText(slides[activeSlide].narration);
                            }, 50);
                          }}
                          className={`px-2 py-1.5 rounded-xl text-[9px] font-black border flex items-center justify-center gap-1 transition cursor-pointer ${
                            isActive 
                              ? `${activeStyle} shadow-sm shadow-black/20` 
                              : `bg-slate-900 border-slate-850 text-slate-400 ${hoverStyle}`
                          }`}
                        >
                          <span>{icon}</span>
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* HUMAN-LIKE VOICE TUNING & SSML CONTROLS */}
                <div className="space-y-2 bg-slate-950/40 p-3 rounded-2xl border border-slate-850/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-slate-300 font-bold tracking-wider uppercase flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      <span>Human-Like Speech Tuning & SSML Prosody Configs:</span>
                    </span>
                  </div>
                  
                  {/* Grid of Toggles */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Speak Naturally */}
                    <button
                      onClick={() => {
                        setTtsSpeakNaturally(!ttsSpeakNaturally);
                        setTimeout(() => speakText(slides[activeSlide].narration), 150);
                      }}
                      className={`px-2 py-1.5 rounded-xl border flex items-center justify-between text-[9px] font-bold transition cursor-pointer ${
                        ttsSpeakNaturally 
                          ? 'bg-indigo-600/10 text-indigo-300 border-indigo-500/30' 
                          : 'bg-slate-900/60 text-slate-500 border-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <span>🗣️</span>
                        <span>Speak naturally</span>
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full ${ttsSpeakNaturally ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`} />
                    </button>

                    {/* Warm Conversational Tone */}
                    <button
                      onClick={() => {
                        setTtsWarmTone(!ttsWarmTone);
                        setTimeout(() => speakText(slides[activeSlide].narration), 150);
                      }}
                      className={`px-2 py-1.5 rounded-xl border flex items-center justify-between text-[9px] font-bold transition cursor-pointer ${
                        ttsWarmTone 
                          ? 'bg-indigo-600/10 text-indigo-300 border-indigo-500/30' 
                          : 'bg-slate-900/60 text-slate-500 border-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <span>❤️</span>
                        <span>Warm & conversational tone</span>
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full ${ttsWarmTone ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`} />
                    </button>

                    {/* Pause Naturally */}
                    <button
                      onClick={() => {
                        setTtsPauseNaturally(!ttsPauseNaturally);
                        setTimeout(() => speakText(slides[activeSlide].narration), 150);
                      }}
                      className={`px-2 py-1.5 rounded-xl border flex items-center justify-between text-[9px] font-bold transition cursor-pointer ${
                        ttsPauseNaturally 
                          ? 'bg-indigo-600/10 text-indigo-300 border-indigo-500/30' 
                          : 'bg-slate-900/60 text-slate-500 border-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-1 flex-wrap text-left">
                        <span>⏳</span>
                        <span>Pause naturally between sentences</span>
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ttsPauseNaturally ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`} />
                    </button>

                    {/* Sound Like Filipino News Presenter */}
                    <button
                      onClick={() => {
                        setTtsNewsPresenter(!ttsNewsPresenter);
                        setTimeout(() => speakText(slides[activeSlide].narration), 150);
                      }}
                      className={`px-2 py-1.5 rounded-xl border flex items-center justify-between text-[9px] font-bold transition cursor-pointer ${
                        ttsNewsPresenter 
                          ? 'bg-emerald-600/10 text-emerald-300 border-emerald-500/30' 
                          : 'bg-slate-900/60 text-slate-500 border-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-1 text-left">
                        <span>🎤</span>
                        <span>Sound like Filipino news presenter</span>
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ttsNewsPresenter ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                    </button>

                    {/* Slight Emotion & Emphasis */}
                    <button
                      onClick={() => {
                        setTtsEmotionEmphasis(!ttsEmotionEmphasis);
                        setTimeout(() => speakText(slides[activeSlide].narration), 150);
                      }}
                      className={`px-2 py-1.5 rounded-xl border flex items-center justify-between text-[9px] font-bold transition cursor-pointer ${
                        ttsEmotionEmphasis 
                          ? 'bg-indigo-600/10 text-indigo-300 border-indigo-500/30' 
                          : 'bg-slate-900/60 text-slate-500 border-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-1 text-left">
                        <span>✨</span>
                        <span>Add slight emotion & emphasis</span>
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ttsEmotionEmphasis ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`} />
                    </button>

                    {/* High Quality AI Model */}
                    <button
                      onClick={() => {
                        setTtsHighQualityAI(!ttsHighQualityAI);
                        setTimeout(() => speakText(slides[activeSlide].narration), 150);
                      }}
                      className={`px-2 py-1.5 rounded-xl border flex items-center justify-between text-[9px] font-bold transition cursor-pointer ${
                        ttsHighQualityAI 
                          ? 'bg-purple-600/10 text-purple-300 border-purple-500/30' 
                          : 'bg-slate-900/60 text-slate-500 border-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-1 text-left">
                        <span>🧠</span>
                        <span>Mataas na kalidad ng AI model</span>
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ttsHighQualityAI ? 'bg-purple-400 animate-pulse' : 'bg-slate-600'}`} />
                    </button>

                    {/* Auto Punctuate & Breath Breakers */}
                    <button
                      onClick={() => {
                        setTtsAutoPunctuate(!ttsAutoPunctuate);
                        setTimeout(() => speakText(slides[activeSlide].narration), 150);
                      }}
                      className={`px-2 py-1.5 rounded-xl border flex items-center justify-between text-[9px] font-bold transition cursor-pointer ${
                        ttsAutoPunctuate 
                          ? 'bg-indigo-600/10 text-indigo-300 border-indigo-500/30' 
                          : 'bg-slate-900/60 text-slate-500 border-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-1 text-left">
                        <span>✍️</span>
                        <span>Tamang punctuation (comma, period, ellipsis)</span>
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ttsAutoPunctuate ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`} />
                    </button>

                    {/* SSML Mode */}
                    <button
                      onClick={() => {
                        setTtsSSMLMode(!ttsSSMLMode);
                        setTimeout(() => speakText(slides[activeSlide].narration), 150);
                      }}
                      className={`px-2 py-1.5 rounded-xl border flex items-center justify-between text-[9px] font-bold transition cursor-pointer ${
                        ttsSSMLMode 
                          ? 'bg-indigo-600/10 text-indigo-300 border-indigo-500/30' 
                          : 'bg-slate-900/60 text-slate-500 border-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-1 text-left">
                        <span>⚙️</span>
                        <span>SSML (Speech Synthesis Markup Language)</span>
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ttsSSMLMode ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`} />
                    </button>

                    {/* Verbatim Mode */}
                    <button
                      onClick={() => {
                        setTtsVerbatim(!ttsVerbatim);
                        setTimeout(() => speakText(slides[activeSlide].narration), 150);
                      }}
                      className={`px-2 py-1.5 rounded-xl border flex items-center justify-between text-[9px] font-bold transition cursor-pointer ${
                        ttsVerbatim 
                          ? 'bg-amber-600/10 text-amber-300 border-amber-500/30' 
                          : 'bg-slate-900/60 text-slate-500 border-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-1 text-left">
                        <span>📝</span>
                        <span>Verbatim Mode (Huwag baguhin ang mga salita)</span>
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ttsVerbatim ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2.5 items-start bg-slate-950/40 p-3 rounded-2xl border border-slate-850/50">
                  <p className="text-xs text-indigo-100 font-semibold leading-relaxed flex-1">
                    "{slides[activeSlide].narration}"
                  </p>

                  {/* SPEAK NARRATION RE-PLAY BUTTON */}
                  <button
                    onClick={() => speakText(slides[activeSlide].narration)}
                    disabled={!isVoiceEnabled}
                    className={`p-2 rounded-xl shrink-0 cursor-pointer transition ${
                      isVoiceEnabled
                        ? 'bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 hover:text-indigo-300 border border-indigo-500/20'
                        : 'bg-slate-800 text-slate-600 border border-slate-750 cursor-not-allowed'
                    }`}
                    title="Muling bigkasin ang gabay"
                  >
                    <Volume1 className="w-4 h-4" />
                  </button>
                </div>

                {/* SLIDESHOW AUTO-PLAY BAR & PLAYER CONTROLS */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handlePlayPause}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase cursor-pointer transition flex items-center gap-1 ${
                      isPlaying 
                        ? 'bg-slate-800 hover:bg-slate-750 text-white border border-slate-700' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950/50'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                    <span>{isPlaying ? 'PAUSE TOUR' : 'AUTO-PLAY TOUR'}</span>
                  </button>

                  <button
                    onClick={() => { setProgress(0); selectSlide(0); }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white rounded-lg transition pointer-events-auto cursor-pointer"
                    title="Restart Tour"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  {/* Tiny progress line */}
                  <div className="flex-1 bg-slate-800 h-1 rounded-full overflow-hidden relative">
                    <div 
                      className="bg-indigo-500 h-full transition-all duration-100"
                      style={{ width: `${isPlaying ? progress : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* BONUS TIP */}
          <div className="bg-slate-950/60 border border-slate-850 p-3.5 rounded-2xl flex items-start gap-2 text-[10px] text-slate-400 font-semibold">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="leading-normal">
              <strong className="text-white">Tip para sa mga bagong miyembro:</strong> Huwag kalimutang i-verify na tama ang iyong GCash Name at Number sa cash-out tab bago sumite ng inyong withdrawal, upang maiwasan ang anumang aberya sa awtomatikong proseso ng payout.
            </p>
          </div>
        </div>
      ) : viewMode === 'generator' ? (
        /* VIEW 3: VIDEO GENERATOR CO-CREATOR STUDIO */
        <div className="p-5 space-y-6">
          <div className="bg-slate-950/85 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
                <Camera className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <h4 className="text-xs font-black text-white flex items-center gap-2">
                  <span>🎥 Z-oneApp Co-Creator Studio</span>
                  <span className="bg-emerald-500/15 text-emerald-400 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">High Definition 720p</span>
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-1">
                  Maaari ka nang gumawa at mag-download ng sariling opisyal na **Tagalog Tour Explainer Video**! Awtomatikong isasama ng aming studio ang visual animations ng app at ang mataas na kalidad na boses na nagsasalita sa bawat eksena.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2">
              <div className="md:col-span-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-4">
                {/* AI PROMPT INPUT SECTION */}
                <div className="space-y-3 pb-3 border-b border-slate-800/80">
                  <span className="text-[9px] text-indigo-400 font-black uppercase tracking-wider block">✨ AI Video Tour Prompt:</span>
                  <textarea
                    value={userPrompt}
                    onChange={(e) => {
                      setUserPrompt(e.target.value);
                      setGeneratorError(null);
                      setGenerationSuccess(false);
                    }}
                    placeholder="Halimbawa: Paano mag-cashout ng ating ipon sa GCash na mabilis..."
                    className="w-full h-20 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[10.5px] font-semibold text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition resize-none leading-relaxed"
                  />
                  
                  {generatorError && (
                    <p className="text-[9px] text-rose-400 font-bold bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                      ⚠️ {generatorError}
                    </p>
                  )}

                  {generationSuccess && (
                    <p className="text-[9px] text-emerald-400 font-bold bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                      ✓ Nagawa ang custom AI script! Handa na itong i-play sa interactive preview o i-record sa ibaba.
                    </p>
                  )}

                  <button
                    onClick={() => handleGenerateScript(userPrompt)}
                    disabled={generatingScript || !userPrompt.trim()}
                    className="w-full py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none text-white rounded-lg text-[9.5px] font-black uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 transition shadow-md shadow-indigo-950/20"
                  >
                    {generatingScript ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Nag-iisip ng Script...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>I-generate ang Video Script</span>
                      </>
                    )}
                  </button>
                </div>

                {/* PRESETS SECTION */}
                <div className="space-y-2 pb-3 border-b border-slate-800/80">
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">📺 Mga Auto-Generated Pre-sets:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => {
                        const prompt = "Kumpletong pangkalahatang tour ng Z-oneApp para sa bagong miyembro";
                        setUserPrompt(prompt);
                        handleGenerateScript(prompt);
                      }}
                      disabled={generatingScript}
                      className="p-1.5 bg-slate-950 border border-slate-850 hover:border-slate-700 text-left rounded-lg text-[9px] font-bold text-slate-300 transition cursor-pointer flex flex-col justify-between h-14"
                    >
                      <span className="text-slate-500 text-[10px]">📺</span>
                      <span>Kumpletong App Tour</span>
                    </button>
                    <button
                      onClick={() => {
                        const prompt = "Paano kumita ng limang piso sa browse and earn campaigns";
                        setUserPrompt(prompt);
                        handleGenerateScript(prompt);
                      }}
                      disabled={generatingScript}
                      className="p-1.5 bg-slate-950 border border-slate-850 hover:border-slate-700 text-left rounded-lg text-[9px] font-bold text-slate-300 transition cursor-pointer flex flex-col justify-between h-14"
                    >
                      <span className="text-slate-500 text-[10px]">💰</span>
                      <span>Paano Kumita sa Campaigns</span>
                    </button>
                    <button
                      onClick={() => {
                        const prompt = "Ang masayang komunidad ng mga Pilipino sa Z-one social feed";
                        setUserPrompt(prompt);
                        handleGenerateScript(prompt);
                      }}
                      disabled={generatingScript}
                      className="p-1.5 bg-slate-950 border border-slate-850 hover:border-slate-700 text-left rounded-lg text-[9px] font-bold text-slate-300 transition cursor-pointer flex flex-col justify-between h-14"
                    >
                      <span className="text-slate-500 text-[10px]">💖</span>
                      <span>Social Feed at Komunidad</span>
                    </button>
                    <button
                      onClick={() => {
                        const prompt = "Paano mag-withdraw at mag-cashout ng payout sa GCash";
                        setUserPrompt(prompt);
                        handleGenerateScript(prompt);
                      }}
                      disabled={generatingScript}
                      className="p-1.5 bg-slate-950 border border-slate-850 hover:border-slate-700 text-left rounded-lg text-[9px] font-bold text-slate-300 transition cursor-pointer flex flex-col justify-between h-14"
                    >
                      <span className="text-slate-500 text-[10px]">💳</span>
                      <span>GCash Cashout Tutorial</span>
                    </button>
                  </div>
                </div>

                <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">MGA CONFIGURATION:</span>
                
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-300">Wika (Voice Language)</div>
                  <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-extrabold text-indigo-400 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Tagalog (Filipino Voice)</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-300">Format & Resolution</div>
                  <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-extrabold text-emerald-400 flex items-center gap-2">
                    <Video className="w-3.5 h-3.5" />
                    <span>MP4 / WebM HD (1280x720)</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  {/* EXPORT CONTROL BUTTON */}
                  {!exporting ? (
                    <button
                      onClick={exportVideo}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-emerald-950/20 cursor-pointer flex items-center justify-center gap-2 transition"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Simulan ang Pag-generate</span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-300">
                        <span>Nag-gegenerate...</span>
                        <span>{exportProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-300"
                          style={{ width: `${exportProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-[9px] text-slate-400 font-semibold italic">{exportStatus}</p>
                    </div>
                  )}

                  {/* DOWNLOAD BUTTON */}
                  {videoDownloadUrl && !exporting && (
                    <motion.a
                      href={videoDownloadUrl}
                      download="zone-app-explainer-guide.webm"
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider text-center flex items-center justify-center gap-2 cursor-pointer transition shadow-lg shadow-indigo-950/30"
                    >
                      <Download className="w-4 h-4" />
                      <span>I-download ang Explainer Video</span>
                    </motion.a>
                  )}
                </div>
              </div>

              {/* VIDEO PREVIEW BOX */}
              <div className="md:col-span-8 bg-slate-950 rounded-xl border border-slate-800/80 p-4 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[220px]">
                {exporting ? (
                  <div className="space-y-3 z-10">
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                    <p className="text-xs text-white font-black">Huwag isara o i-refresh ang page</p>
                    <p className="text-[10px] text-slate-400 font-semibold">Inire-record ang canvas frames at boses mula sa virtual player...</p>
                  </div>
                ) : videoDownloadUrl ? (
                  <div className="space-y-4 z-10 w-full p-2 flex flex-col items-center">
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                        Live Explainer Video Preview
                      </span>
                      <button
                        onClick={() => setVideoDownloadUrl(null)}
                        className="text-[9px] text-slate-500 hover:text-rose-400 font-bold transition cursor-pointer"
                      >
                        ✕ I-clear / Ulitin ang Pag-generate
                      </button>
                    </div>

                    {/* INTERACTIVE VIDEO PLAYER PREVIEW */}
                    <div className="w-full relative aspect-video bg-black rounded-xl overflow-hidden border-2 border-emerald-500/30 shadow-2xl">
                      <video 
                        src={videoDownloadUrl}
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                        style={{ maxHeight: '320px' }}
                      />
                    </div>

                    <div className="text-left w-full bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1">
                      <h5 className="text-[11px] font-black text-white flex items-center gap-1.5">
                        🎉 Tapos na ang pag-record!
                      </h5>
                      <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                        I-play ang video sa itaas upang pakinggan ang high-fidelity Tagalog voice-over at panoorin ang kasabay na app tour animations. Maaari mo ring i-download ito gamit ang button sa kaliwa!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 z-10 max-w-sm">
                    <Video className="w-8 h-8 text-slate-600 mx-auto" />
                    <h5 className="text-xs font-black text-slate-300">Handa nang gumawa ng video</h5>
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                      I-click ang **Simulan ang Pag-generate** sa kaliwa. Mag-re-record ang platform sa background habang nagpapatugtog ng Tagalog boses.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW 2: COMPLETE TAGALOG VIDEO EXPLAINER SCRIPT */
        <div className="p-5 space-y-4">
          <div className="bg-indigo-600/10 border border-indigo-500/20 p-4 rounded-2xl space-y-2">
            <h4 className="text-xs font-black text-white flex items-center gap-1.5">
              <Video className="w-4 h-4 text-indigo-400" />
              <span>Kumpletong Voiceover Script para sa Tagalog Explainer Video</span>
            </h4>
            <p className="text-[10px] text-slate-300 font-semibold leading-relaxed">
              Gamitin ang script na ito kung nais mong i-record o gawan ng voiceover ang iyong sariling explainer video para sa mga bagong miyembro ng iyong app. Ang script na ito ay malinis at ligtas — walang anumang admin panel details!
            </p>
          </div>

          <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
            {slides.map((sc, index) => (
              <div key={index} className="bg-slate-900 border border-slate-850 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <span className="text-[10px] font-black text-indigo-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                    SCENE {index + 1}
                  </span>
                  <h5 className="text-xs font-extrabold text-white">{sc.title}</h5>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-[10px]">
                  <div className="md:col-span-4 bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
                    <span className="font-extrabold text-slate-400 block uppercase tracking-wider mb-1">Visual sa Screen:</span>
                    <p className="text-slate-300 font-semibold leading-relaxed">
                      {index === 0 && "Ipakita ang Login at Registration Form sa Z-oneApp. I-highlight ang fields ng Mobile Number at Secured Password."}
                      {index === 1 && "I-zoom-in ang 'Browse & Earn' dashboard na may sponsor campaign cards, saka ang interactive website simulator at countdown timer."}
                      {index === 2 && "Ipakita ang makulay na Spin Wheel na umiikot nang mabilis at huminto sa wallet reward slot na may kasamang coin sounds."}
                      {index === 3 && "Ipakita ang dynamic Z-one Feed. Mag-scroll pababa sa mga magagandang posts, mag-upload ng photo galing sa phone gallery, at mag-comment."}
                      {index === 4 && "Ipakita ang GCash Cash-Out form. Ipakita ang pagpasok ng details, ang tagumpay na notice, at ang real-time SMS alert na natanggap."}
                    </p>
                  </div>
                  
                  <div className="md:col-span-8 bg-slate-950/80 p-3 rounded-xl border border-slate-850">
                    <span className="font-extrabold text-indigo-400 block uppercase tracking-wider mb-1">Voiceover (Sasabihin):</span>
                    <p className="text-indigo-100 font-bold text-xs italic leading-relaxed">
                      "{sc.narration}"
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-850 rounded-2xl text-[9px] text-slate-500 font-bold text-center">
            🔒 Ang script na ito ay protektado at angkop para sa pangkalahatang publiko. Walang binanggit na anomang administratibong operasyon o server credentials.
          </div>
        </div>
      )}
    </div>
  );
}
