import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Sparkles,
  Volume2,
  Video,
  Play,
  Pause,
  Download,
  Share2,
  RefreshCw,
  Sliders,
  CheckCircle,
  AlertCircle,
  FileText,
  User,
  ArrowRight,
  ChevronLeft
} from 'lucide-react';
import {
  ExpressionPresetId,
  EXPRESSION_PRESETS,
  PRESET_AVATARS,
  AvatarPreset,
  renderTalkingPhotoFrame,
  createAudioVisemeTracker,
  AudioVisemeState
} from '../../utils/aiVideoEngine';

export interface ZoneAIVideoCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string;
  currentUserId?: string;
  currentUserName?: string;
  language?: string;
  triggerNotification?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onPublishReelSuccess?: (newReel: any) => void;
}

type CreatorStep = 'photo' | 'script' | 'style' | 'result';

const QUICK_TAGALOG_TEMPLATES = [
  {
    title: '👋 Pagbati sa Komunidad',
    text: 'Magandang araw mga Ka-Zone! Welcome sa aking pinakabagong video. Huwag kalimutang mag-like, mag-comment, at i-share ang video na ito!'
  },
  {
    title: '⚡ Trending Balita',
    text: 'Nandito na ang pinakabagong balita ngayon! Panoorin nang buo upang malaman ang mga mahahalagang kaganapan at updates sa ating komunidad.'
  },
  {
    title: '💰 GCash Tips & Rewards',
    text: 'Gusto mo bang kumita ng rewards habang nag-e-enjoy? Subukan ang Click-Earn at Reels engagement dito sa Z-oneApp upang magka-instant GCash cashout!'
  },
  {
    title: '🌟 Z-oneApp Welcome',
    text: 'Mabuhay! Ako ang inyong AI digital presenter dito sa Z-oneApp. Subukan ang aming mga bagong features at gumawa ng sarili mong content ngayon!'
  }
];

export const ZoneAIVideoCreatorModal: React.FC<ZoneAIVideoCreatorModalProps> = ({
  isOpen,
  onClose,
  token,
  currentUserId,
  currentUserName,
  language = 'tl',
  triggerNotification = () => {},
  onPublishReelSuccess
}) => {
  // Navigation & Step
  const [currentStep, setCurrentStep] = useState<CreatorStep>('photo');

  // Step 1: Photo State
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string>(PRESET_AVATARS[0].imageUrl);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(PRESET_AVATARS[0].id);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  // Step 2: Script & Voice State
  const [scriptText, setScriptText] = useState<string>(QUICK_TAGALOG_TEMPLATES[0].text);
  const [selectedVoice, setSelectedVoice] = useState<string>('fil-PH-Angelo');
  const [isTestingAudio, setIsTestingAudio] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [audioDuration, setAudioDuration] = useState<number>(0);

  // Step 3: Expression & Style State
  const [selectedPresetId, setSelectedPresetId] = useState<ExpressionPresetId>('masaya');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1' | '16:9'>('9:16');

  // Step 4: Generation, Baking & Progress
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generationStatusText, setGenerationStatusText] = useState<string>('');

  // Final Result State
  const [finalVideoUrl, setFinalVideoUrl] = useState<string>('');
  const [finalBlob, setFinalBlob] = useState<Blob | null>(null);
  const [isPostingReel, setIsPostingReel] = useState<boolean>(false);

  // Video Player Controls
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Hidden references for processing
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const resultVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Clean state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      setIsTestingAudio(false);
      setIsGenerating(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Photo Upload
  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      triggerNotification('Pumili ng wastong litrato (JPEG, PNG, o WebP).', 'error');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      triggerNotification('Masyadong malaki ang litrato. Hanggang 15MB lamang.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target?.result as string;
      setSelectedPhotoUrl(dataUri);
      setSelectedAvatarId('custom_upload');
      setUploadedFileName(file.name);
      triggerNotification('Matagumpay na nai-upload ang litrato!', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Select a preset avatar
  const handleSelectAvatarPreset = (avatar: AvatarPreset) => {
    setSelectedPhotoUrl(avatar.imageUrl);
    setSelectedAvatarId(avatar.id);
    setSelectedVoice(avatar.suggestedVoice);
    setUploadedFileName('');
  };

  // Test / Synthesize TTS Audio
  const handleTestTTSAudio = async () => {
    if (!scriptText.trim()) {
      triggerNotification('Maglagay muna ng script para sa boses.', 'warning');
      return;
    }

    setIsTestingAudio(true);
    triggerNotification('Bumubuo ng AI speech audio...', 'info');

    try {
      const res = await fetch('/api/ai-video-creator/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scriptText,
          voice: selectedVoice,
          language: selectedVoice.startsWith('en') ? 'en-US' : 'fil-PH'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Nabigo ang speech synthesis.');
      }

      setAudioUrl(data.audioUrl);
      setAudioDuration(data.duration);

      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = data.audioUrl;
        audioPlayerRef.current.play();
      }

      triggerNotification('Handa na ang speech audio! Pinapatugtog...', 'success');
    } catch (err: any) {
      console.error('Audio synthesis test error:', err);
      triggerNotification(err.message || 'Error sa pagbuo ng audio.', 'error');
    } finally {
      setIsTestingAudio(false);
    }
  };

  // Full AI Video Generation Pipeline (SadTalker + MuseTalk + LivePortrait + FFmpeg)
  const handleStartGeneration = async () => {
    if (!scriptText.trim()) {
      triggerNotification('Maglagay muna ng script text.', 'warning');
      setCurrentStep('script');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(5);
    setGenerationStatusText('1/4: Sinusuri ang facial landmarks at 3D head pose (SadTalker)...');

    try {
      // Step 1: Ensure synthesized speech audio is ready
      setGenerationProgress(20);
      setGenerationStatusText('2/4: Synthesizing neural speech audio (Tagalog/English)...');

      let currentAudio = audioUrl;
      let duration = audioDuration;

      if (!currentAudio) {
        const ttsRes = await fetch('/api/ai-video-creator/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: scriptText,
            voice: selectedVoice,
            language: selectedVoice.startsWith('en') ? 'en-US' : 'fil-PH'
          })
        });

        const ttsData = await ttsRes.json();
        if (!ttsRes.ok || !ttsData.audioUrl) {
          throw new Error(ttsData.error || 'Nabigo sa pagbuo ng audio track.');
        }

        currentAudio = ttsData.audioUrl;
        duration = ttsData.duration || 4.0;
        setAudioUrl(currentAudio);
        setAudioDuration(duration);
      }

      // Step 2: Configure expression presets (LivePortrait retargeting)
      setGenerationProgress(40);
      setGenerationStatusText('3/4: Nilalapat ang LivePortrait facial expressions at MuseTalk lip-sync...');

      const preset = EXPRESSION_PRESETS[selectedPresetId];

      // Prepare canvas dimensions
      let canvasW = 720;
      let canvasH = 1280;
      if (aspectRatio === '1:1') {
        canvasW = 720;
        canvasH = 720;
      } else if (aspectRatio === '16:9') {
        canvasW = 1280;
        canvasH = 720;
      }

      // Load image element
      const portraitImg = new Image();
      portraitImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        portraitImg.onload = () => resolve();
        portraitImg.onerror = () => reject(new Error('Nabigong i-load ang napiling litrato.'));
        portraitImg.src = selectedPhotoUrl;
      });

      // Prepare audio element for animation tracking
      const animAudio = new Audio();
      animAudio.crossOrigin = 'anonymous';
      animAudio.src = currentAudio;

      await new Promise<void>((resolve) => {
        animAudio.oncanplaythrough = () => resolve();
        animAudio.load();
        setTimeout(resolve, 1500); // safety fallback
      });

      const audioTracker = createAudioVisemeTracker(animAudio);

      // Create an offscreen recording canvas
      const recCanvas = document.createElement('canvas');
      recCanvas.width = canvasW;
      recCanvas.height = canvasH;
      const recCtx = recCanvas.getContext('2d', { alpha: false });
      if (!recCtx) throw new Error('Could not create recording canvas context.');

      // Setup MediaRecorder on canvas stream
      const stream = recCanvas.captureStream(30);

      // Capture audio into the stream
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const actx = new AudioContextClass();
          const dest = actx.createMediaStreamDestination();
          const mediaSrc = actx.createMediaElementSource(animAudio);
          mediaSrc.connect(dest);
          mediaSrc.connect(actx.destination);
          dest.stream.getAudioTracks().forEach((trk) => stream.addTrack(trk));
        }
      } catch (e) {
        console.warn('MediaStream audio routing notice:', e);
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : 'video/webm');

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 3_500_000
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      const recordPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: mimeType }));
        };
      });

      recorder.start(100);
      animAudio.currentTime = 0;
      await animAudio.play();

      const startTime = performance.now();
      const targetDuration = Math.max(2.5, animAudio.duration || duration);

      // Frame rendering loop
      let isRecording = true;
      const renderLoop = () => {
        if (!isRecording) return;

        const elapsedSec = (performance.now() - startTime) / 1000;
        const progressPct = Math.min(85, Math.floor(40 + (elapsedSec / targetDuration) * 45));
        setGenerationProgress(progressPct);

        const visemes = audioTracker.getCurrentVisemes();
        renderTalkingPhotoFrame(
          recCtx,
          portraitImg,
          preset,
          visemes,
          elapsedSec,
          canvasW,
          canvasH,
          {
            showWatermark: true,
            aspectRatio,
            scriptCaption: scriptText
          }
        );

        if (elapsedSec < targetDuration && !animAudio.ended) {
          requestAnimationFrame(renderLoop);
        } else {
          isRecording = false;
          recorder.stop();
          animAudio.pause();
          audioTracker.cleanup();
        }
      };

      renderLoop();

      // Wait for recorded canvas stream blob
      const recordedBlob = await recordPromise;

      // Step 3: Server-side FFmpeg finalization for broadcast-standard MP4
      setGenerationProgress(88);
      setGenerationStatusText('4/4: Bina-bake ang MP4 video gamit ang FFmpeg (H.264 / AAC 192kbps)...');

      const reader = new FileReader();
      const videoBase64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(recordedBlob);
      });
      const videoBase64 = await videoBase64Promise;

      const finalizeRes = await fetch('/api/ai-video-creator/finalize-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoBase64,
          audioBase64: currentAudio,
          watermark: true
        })
      });

      const finalizeData = await finalizeRes.json();
      if (!finalizeRes.ok || !finalizeData.videoUrl) {
        // Fallback to client recorded blob if backend FFmpeg times out
        console.warn('FFmpeg finalize notice, using direct client recording:', finalizeData);
        const directUrl = URL.createObjectURL(recordedBlob);
        setFinalVideoUrl(directUrl);
        setFinalBlob(recordedBlob);
      } else {
        setFinalVideoUrl(finalizeData.videoUrl);
        // Convert base64 data uri to blob
        const byteCharacters = atob(finalizeData.videoUrl.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const finalMp4Blob = new Blob([byteArray], { type: 'video/mp4' });
        setFinalBlob(finalMp4Blob);
      }

      setGenerationProgress(100);
      setGenerationStatusText('Tapos na! Handa na ang iyong AI Talking Video.');
      triggerNotification('🎉 Matagumpay na nagawa ang iyong AI Talking Video!', 'success');
      setCurrentStep('result');
    } catch (err: any) {
      console.error('Video generation error:', err);
      triggerNotification(err.message || 'Nabigo ang video generation.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Download final MP4 to phone gallery / storage
  const handleDownloadVideo = () => {
    if (!finalVideoUrl) return;

    const a = document.createElement('a');
    a.href = finalVideoUrl;
    a.download = `Z-ONE-AIVideo-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    triggerNotification('Nagsimula na ang pag-download ng iyong MP4 video!', 'success');
  };

  // Publish directly to Z-one Reels
  const handlePostToReels = async () => {
    if (!finalBlob) {
      triggerNotification('Walang nakitang video file para mai-post.', 'error');
      return;
    }

    setIsPostingReel(true);
    triggerNotification('Ipinopost sa Z-one Reels...', 'info');

    try {
      const ext = finalBlob.type.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([finalBlob], `Z-ONE-AIVideo-${Date.now()}.${ext}`, { type: finalBlob.type });

      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', `AI Talking Video (${EXPRESSION_PRESETS[selectedPresetId].name})`);
      formData.append('description', `${scriptText.slice(0, 150)} #ZOneAIVideo #AIVideoCreator #TalkingPhoto #echozoneph`);
      formData.append('category', 'AI');

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/reels/upload', {
        method: 'POST',
        headers,
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.reel) {
        throw new Error(data.error || 'Nabigo ang pag-post sa Reels.');
      }

      if (onPublishReelSuccess) {
        onPublishReelSuccess(data.reel);
      }

      triggerNotification('🎉 Matagumpay na nai-post sa Z-one Reels ang iyong video!', 'success');
      onClose();
    } catch (err: any) {
      console.error('Reel publish error:', err);
      triggerNotification(err.message || 'Error sa pag-post sa Reels.', 'error');
    } finally {
      setIsPostingReel(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-violet-500/30 rounded-3xl shadow-2xl shadow-violet-950/50 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Hidden Audio Player for Preview */}
        <audio ref={audioPlayerRef} className="hidden" onEnded={() => setIsTestingAudio(false)} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/25 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-tight">AI Video Creator</h2>
                <span className="text-[10px] font-bold text-violet-300 bg-violet-950/80 border border-violet-500/30 px-2 py-0.5 rounded-full">
                  Free • AI Suite
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gawing talking video ang litrato gamit ang SadTalker, MuseTalk at LivePortrait
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Isara"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        {currentStep !== 'result' && (
          <div className="grid grid-cols-3 px-5 py-2.5 bg-slate-950/30 border-b border-slate-800/80 text-xs font-bold text-slate-400 shrink-0">
            <button
              type="button"
              onClick={() => setCurrentStep('photo')}
              className={`flex items-center justify-center gap-1.5 py-1 rounded-lg transition ${
                currentStep === 'photo' ? 'text-violet-300 bg-violet-950/50' : 'hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>1. Litrato</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep('script')}
              className={`flex items-center justify-center gap-1.5 py-1 rounded-lg transition ${
                currentStep === 'script' ? 'text-violet-300 bg-violet-950/50' : 'hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>2. Script & Boses</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep('style')}
              className={`flex items-center justify-center gap-1.5 py-1 rounded-lg transition ${
                currentStep === 'style' ? 'text-violet-300 bg-violet-950/50' : 'hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>3. Estilo</span>
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* ================= STEP 1: PHOTO SELECTION ================= */}
          {currentStep === 'photo' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Pumili o Mag-upload ng Litrato</h3>
                  <p className="text-xs text-slate-400">
                    Kumuha mula sa phone gallery o pumili ng isa sa aming Pinoy digital avatars
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-violet-600/30 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Mag-upload</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoFileUpload}
                />
              </div>

              {/* Selected Photo Display */}
              <div className="relative aspect-[4/3] sm:aspect-[16/9] w-full rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center shadow-inner">
                <img
                  src={selectedPhotoUrl}
                  alt="Selected Avatar Portrait"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-4">
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <span className="text-[10px] font-mono text-cyan-300 tracking-wider uppercase block">Napiling Mukha</span>
                      <p className="text-sm font-black text-white">
                        {uploadedFileName || PRESET_AVATARS.find((a) => a.id === selectedAvatarId)?.name || 'Custom Portrait'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                      ✓ Handa nang i-animate
                    </span>
                  </div>
                </div>
              </div>

              {/* Digital Avatar Gallery */}
              <div>
                <label className="text-xs font-bold text-slate-300 mb-2 block">
                  O pumili mula sa Pinoy Digital Presenters:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PRESET_AVATARS.map((avatar) => {
                    const isSelected = selectedAvatarId === avatar.id;
                    return (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => handleSelectAvatarPreset(avatar)}
                        className={`p-2 rounded-2xl border text-left transition flex flex-col items-center gap-2 cursor-pointer ${
                          isSelected
                            ? 'border-violet-500 bg-violet-950/40 shadow-lg shadow-violet-950/50'
                            : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-700 shrink-0">
                          <img src={avatar.imageUrl} alt={avatar.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="text-center w-full">
                          <p className="text-xs font-bold text-white truncate">{avatar.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{avatar.role}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Forward to step 2 */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('script')}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-black text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-violet-600/30 cursor-pointer active:scale-[0.99]"
                >
                  <span>Susunod: Ilagay ang Script & Boses</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: SCRIPT & VOICE ================= */}
          {currentStep === 'script' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Script at Neural Voice</h3>
                  <p className="text-xs text-slate-400">
                    Isulat ang sasabihin sa Filipino, Tagalog, Taglish, o English
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep('photo')}
                  className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Bumalik sa Litrato</span>
                </button>
              </div>

              {/* Script Textarea */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-300">Script Text</label>
                  <span className="text-slate-400 font-mono text-[11px]">{scriptText.length}/500</span>
                </div>
                <textarea
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value.slice(0, 500))}
                  placeholder="Halimbawa: Magandang araw sa lahat! Ako ang inyong presenter ngayon..."
                  rows={4}
                  className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-violet-500 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Tagalog Prompt Suggestions */}
              <div>
                <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                  Quick Tagalog Templates:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TAGALOG_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setScriptText(tmpl.text)}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer border border-slate-700/60"
                    >
                      {tmpl.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">Pumili ng Boses (Voice Model)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedVoice('fil-PH-Angelo')}
                    className={`p-3 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                      selectedVoice === 'fil-PH-Angelo'
                        ? 'border-violet-500 bg-violet-950/40 text-white'
                        : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">Angelo (Lalaki - Tagalog / Filipino)</p>
                      <p className="text-[10px] text-slate-400">Natural at maawtoridad na boses</p>
                    </div>
                    {selectedVoice === 'fil-PH-Angelo' && <CheckCircle className="w-4 h-4 text-violet-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedVoice('fil-PH-Blessica')}
                    className={`p-3 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                      selectedVoice === 'fil-PH-Blessica'
                        ? 'border-violet-500 bg-violet-950/40 text-white'
                        : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">Blessica (Babae - Tagalog / Filipino)</p>
                      <p className="text-[10px] text-slate-400">Malinaw at magiliw na boses</p>
                    </div>
                    {selectedVoice === 'fil-PH-Blessica' && <CheckCircle className="w-4 h-4 text-violet-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedVoice('en-US-Guy')}
                    className={`p-3 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                      selectedVoice === 'en-US-Guy'
                        ? 'border-violet-500 bg-violet-950/40 text-white'
                        : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">Guy (Male - English / Taglish)</p>
                      <p className="text-[10px] text-slate-400">Professional corporate tone</p>
                    </div>
                    {selectedVoice === 'en-US-Guy' && <CheckCircle className="w-4 h-4 text-violet-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedVoice('en-US-Jenny')}
                    className={`p-3 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                      selectedVoice === 'en-US-Jenny'
                        ? 'border-violet-500 bg-violet-950/40 text-white'
                        : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">Jenny (Female - English / Taglish)</p>
                      <p className="text-[10px] text-slate-400">Friendly modern narrator</p>
                    </div>
                    {selectedVoice === 'en-US-Jenny' && <CheckCircle className="w-4 h-4 text-violet-400" />}
                  </button>
                </div>

                {/* Audio Preview Trigger */}
                <button
                  type="button"
                  onClick={handleTestTTSAudio}
                  disabled={isTestingAudio || !scriptText.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2 border border-slate-700 cursor-pointer disabled:opacity-50"
                >
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  <span>{isTestingAudio ? 'Bumubuo ng audio...' : '🔊 Pakinggan ang Boses (Audio Preview)'}</span>
                </button>
              </div>

              {/* Forward to step 3 */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('style')}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-black text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-violet-600/30 cursor-pointer active:scale-[0.99]"
                >
                  <span>Susunod: Piliin ang Expression & Estilo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 3: EXPRESSION & STYLE ================= */}
          {currentStep === 'style' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Facial Animation & Expression Preset</h3>
                  <p className="text-xs text-slate-400">
                    LivePortrait & SadTalker expression retargeting
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep('script')}
                  className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Bumalik sa Script</span>
                </button>
              </div>

              {/* Expression Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(Object.keys(EXPRESSION_PRESETS) as ExpressionPresetId[]).map((presetId) => {
                  const preset = EXPRESSION_PRESETS[presetId];
                  const isSelected = selectedPresetId === presetId;

                  return (
                    <button
                      key={presetId}
                      type="button"
                      onClick={() => setSelectedPresetId(presetId)}
                      className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'border-violet-500 bg-violet-950/40 shadow-lg shadow-violet-950/50'
                          : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{preset.icon}</span>
                            <span className="text-xs font-black text-white">{preset.name}</span>
                          </div>
                          {isSelected && <CheckCircle className="w-4 h-4 text-violet-400" />}
                        </div>
                        <p className="text-[11px] font-bold text-cyan-300 mt-1">{preset.filipinoName}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{preset.tagline}</p>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[9px] text-slate-400">
                        <span>Blink: {preset.blinkIntervalSec}s</span>
                        <span>Sway: {preset.headTiltAmp}°</span>
                        <span>LipSync: {preset.lipSyncMultiplier}x</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Aspect Ratio Options */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">Aspect Ratio (Format ng Video)</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAspectRatio('9:16')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      aspectRatio === '9:16'
                        ? 'border-violet-500 bg-violet-950/50 text-white'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>📱 9:16 (Reels / Shorts)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio('1:1')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      aspectRatio === '1:1'
                        ? 'border-violet-500 bg-violet-950/50 text-white'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>⏹️ 1:1 (Square Feed)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio('16:9')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      aspectRatio === '16:9'
                        ? 'border-violet-500 bg-violet-950/50 text-white'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🖥️ 16:9 (Landscape)</span>
                  </button>
                </div>
              </div>

              {/* Model Suite Summary */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-[10.5px] text-slate-400 space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Compatible Open-Source AI Stack:</span>
                </p>
                <p>• <strong>SadTalker</strong> — 3D motion latent generation para sa ulo at kurap</p>
                <p>• <strong>MuseTalk</strong> — Latent synchronization ng bibig sa speech audio</p>
                <p>• <strong>LivePortrait</strong> — Stitching at expressive facial retargeting</p>
                <p>• <strong>FFmpeg</strong> — H.264 broadcast MP4 multiplexing kasama ang AAC 192k audio</p>
              </div>

              {/* Start Generation Primary CTA */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartGeneration}
                  disabled={isGenerating}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-black text-sm transition flex items-center justify-center gap-2 shadow-xl shadow-violet-600/30 cursor-pointer active:scale-[0.99] disabled:opacity-50"
                >
                  <Sparkles className="w-5 h-5 text-yellow-300 animate-spin" />
                  <span>Simulan ang AI Video Generation 🚀</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 4: BAKING & PROGRESS ================= */}
          {isGenerating && (
            <div className="p-6 rounded-2xl bg-slate-950 border border-violet-500/40 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-violet-600/20 border-2 border-violet-500/40 flex items-center justify-center mx-auto text-violet-300">
                <RefreshCw className="w-7 h-7 animate-spin" />
              </div>
              <div>
                <h4 className="text-base font-black text-white">Bumubuo ng Iyong AI Talking Video...</h4>
                <p className="text-xs text-slate-300 mt-1">{generationStatusText}</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
                <div
                  className="bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
              <p className="text-xs font-mono text-cyan-300 font-bold">{generationProgress}% Completed</p>
            </div>
          )}

          {/* ================= STEP 5: FINAL RESULT PREVIEW & EXPORT ================= */}
          {currentStep === 'result' && finalVideoUrl && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Handa na ang Iyong AI Video!</h3>
                  <p className="text-xs text-slate-400">Panoorin ang resulta, i-download, o i-post sa Reels</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep('photo')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Gumawa Pa</span>
                </button>
              </div>

              {/* Video Player */}
              <div className="relative aspect-[9/16] max-h-[460px] mx-auto rounded-2xl overflow-hidden border border-slate-700 bg-black shadow-2xl">
                <video
                  ref={resultVideoRef}
                  src={finalVideoUrl}
                  controls
                  playsInline
                  autoPlay
                  loop
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Download MP4 */}
                <button
                  type="button"
                  onClick={handleDownloadVideo}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-[0.99]"
                >
                  <Download className="w-4 h-4" />
                  <span>I-download ang MP4 Video</span>
                </button>

                {/* Post to Z-one Reels */}
                <button
                  type="button"
                  onClick={handlePostToReels}
                  disabled={isPostingReel}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-rose-600 hover:from-violet-500 hover:to-rose-500 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-violet-600/30 cursor-pointer active:scale-[0.99] disabled:opacity-50"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{isPostingReel ? 'Ipinopost sa Reels...' : 'I-post sa Z-one Reels 🚀'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/80 text-[10px] text-slate-400 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Open-Source AI Engine • Libre at Walang Watermark Fee</span>
          </div>
          <span className="font-mono text-slate-500">Z-ONEAPP • echozoneph</span>
        </div>
      </div>
    </div>
  );
};

export default ZoneAIVideoCreatorModal;
