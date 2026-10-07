import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Camera,
  RefreshCw,
  Music,
  Sparkles,
  Type,
  Scissors,
  Upload,
  Play,
  Pause,
  Check,
  ChevronRight,
  ChevronLeft,
  Volume2,
  VolumeX,
  Timer,
  Gauge,
  Film,
  Image as ImageIcon,
  Trash2,
  Plus,
  ShoppingBag,
  Users,
  Eye,
  Send,
  Loader2,
  Mic,
  MicOff,
  Sliders,
  FileText,
  Wand2
} from 'lucide-react';
import { ReelVideo, ReelMusicTrack, ReelTextOverlay, SocialProductRef } from '../../types';
import {
  STUDIO_FILTERS,
  STUDIO_EFFECTS,
  STUDIO_MUSIC_LIBRARY,
  TEXT_FONT_STYLES,
  TEXT_COLOR_PRESETS,
  StudioAudioController,
  drawStudioOverlaysOnCanvas
} from '../../utils/zoneStudioEngine';
import { StudioVisualOverlays } from './StudioVisualOverlays';

interface ZoneCreateStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string;
  isAdmin?: boolean;
  currentUserId?: string;
  currentUserName?: string;
  userTokens?: number;
  language?: 'tl' | 'en';
  onPublishSuccess?: (newReel: ReelVideo) => void;
  onSwitchToPostComposer?: () => void;
  onSwitchToClassicUpload?: () => void;
  triggerNotification?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

type StudioStep = 'capture' | 'edit' | 'preview';
type EditToolTab = 'music' | 'effects' | 'text' | 'trim';

export const ZoneCreateStudioModal: React.FC<ZoneCreateStudioModalProps> = ({
  isOpen,
  onClose,
  token = '',
  isAdmin = false,
  currentUserId,
  currentUserName,
  userTokens = 0,
  language = 'tl',
  onPublishSuccess,
  onSwitchToPostComposer,
  onSwitchToClassicUpload,
  triggerNotification
}) => {
  const authToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

  // Studio Flow Step
  const [step, setStep] = useState<StudioStep>('capture');
  const [activeEditTab, setActiveEditTab] = useState<EditToolTab>('effects');
  const [isFullPreviewMode, setIsFullPreviewMode] = useState(false);

  // Camera & Recording States
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [maxDuration, setMaxDuration] = useState<15 | 30 | 60>(15);
  const [countdownSetting, setCountdownSetting] = useState<0 | 3 | 10>(0);
  const [countdownRemaining, setCountdownRemaining] = useState<number>(0);
  const [recordSpeed, setRecordSpeed] = useState<0.5 | 1 | 1.5 | 2>(1);

  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string>('');
  const [mediaSourceKind, setMediaSourceKind] = useState<'camera' | 'uploaded_video' | 'photo_reel'>('camera');
  const [isGeneratingSlideshow, setIsGeneratingSlideshow] = useState(false);

  // Creative Studio States (Music, Filters, Effects, Text, Trim)
  const [selectedFilterId, setSelectedFilterId] = useState<string>('normal');
  const [selectedEffectId, setSelectedEffectId] = useState<string>('none');
  const [selectedMusic, setSelectedMusic] = useState<ReelMusicTrack | null>(null);
  const [customAudioBlob, setCustomAudioBlob] = useState<Blob | null>(null);
  const [musicVolume, setMusicVolume] = useState<number>(0.8);
  const [originalAudioVolume, setOriginalAudioVolume] = useState<number>(1.0);
  const [muteOriginalAudio, setMuteOriginalAudio] = useState<boolean>(false);

  // Text Overlays State
  const [textOverlays, setTextOverlays] = useState<ReelTextOverlay[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [draftFontStyle, setDraftFontStyle] = useState<NonNullable<ReelTextOverlay['fontStyle']>>('modern');
  const [draftFontSize, setDraftFontSize] = useState<NonNullable<ReelTextOverlay['fontSize']>>('md');
  const [draftColorIdx, setDraftColorIdx] = useState<number>(0);

  // Trim & Playback States
  const [videoDuration, setVideoDuration] = useState<number>(15);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(15);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(true);
  const [coverDataUrl, setCoverDataUrl] = useState<string>('');

  // Quick Camera Drawer States
  const [showCameraFilterDrawer, setShowCameraFilterDrawer] = useState(false);
  const [showCameraMusicDrawer, setShowCameraMusicDrawer] = useState(false);

  // Publish Metadata States
  const [reelTitle, setReelTitle] = useState('');
  const [reelDescription, setReelDescription] = useState('');
  const [communities, setCommunities] = useState<Array<{ id: string; name: string; privacy?: string }>>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>('');
  const [availableProducts, setAvailableProducts] = useState<SocialProductRef[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SocialProductRef[]>([]);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [alsoShareToFeed, setAlsoShareToFeed] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStageText, setPublishStageText] = useState('');

  // Refs
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const compositorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const accumulatedElapsedRef = useRef<number>(0);
  const segmentStartTsRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const audioControllerRef = useRef<StudioAudioController | null>(null);

  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const customAudioInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  // Live refs for canvas compositor loop
  const filterRef = useRef(selectedFilterId);
  const effectRef = useRef(selectedEffectId);
  const textOverlaysRef = useRef(textOverlays);
  const facingModeRef = useRef(facingMode);

  useEffect(() => {
    filterRef.current = selectedFilterId;
  }, [selectedFilterId]);
  useEffect(() => {
    effectRef.current = selectedEffectId;
  }, [selectedEffectId]);
  useEffect(() => {
    textOverlaysRef.current = textOverlays;
  }, [textOverlays]);
  useEffect(() => {
    facingModeRef.current = facingMode;
  }, [facingMode]);

  const currentFilterObj = STUDIO_FILTERS.find((f) => f.id === selectedFilterId) || STUDIO_FILTERS[0];

  // Initialize audio controller
  useEffect(() => {
    audioControllerRef.current = new StudioAudioController();
    return () => {
      audioControllerRef.current?.stop();
    };
  }, []);

  // Load communities & shop products when modal opens
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/zone/communities', {
      headers: { ...(authToken ? { Authorization: authToken } : {}) }
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.communities)) {
          setCommunities(d.communities);
        }
      })
      .catch(() => {});

    fetch('/api/shop/products')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.products)) {
          setAvailableProducts(d.products);
        }
      })
      .catch(() => {});
  }, [isOpen, authToken]);

  // Stop camera stream & audio when modal closes
  const stopCameraStream = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdownRemaining(0);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  // Start live camera & canvas compositor loop
  const startCameraStream = useCallback(async () => {
    stopCameraStream();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported on this browser. You can record Studio Canvas or upload media below.');
      startCanvasRenderLoop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 720 },
          height: { ideal: 1280 }
        },
        audio: !isMicMuted
      });

      mediaStreamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        await liveVideoRef.current.play().catch(() => {});
      }
      setCameraReady(true);
      startCanvasRenderLoop();
    } catch (err: any) {
      // Fallback: Try video-only if microphone permission caused failure
      try {
        const videoOnlyStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode }
        });
        mediaStreamRef.current = videoOnlyStream;
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = videoOnlyStream;
          await liveVideoRef.current.play().catch(() => {});
        }
        setCameraReady(true);
        startCanvasRenderLoop();
      } catch (fallbackErr: any) {
        setCameraError(
          language === 'tl'
            ? 'Walang camera access o naka-block ang camera permission. Maaari kang mag-upload ng video/litrato o gumamit ng Studio Canvas.'
            : 'Camera access unavailable. You can upload a video/photos from your device or record with Studio Canvas.'
        );
        startCanvasRenderLoop();
      }
    }
  }, [facingMode, isMicMuted, language, stopCameraStream]);

  // Continuous 30fps compositor loop onto compositorCanvasRef (clean 9:16 video frames; filters & overlays are applied non-destructively so they can be edited in Step 2 without double-baking)
  const startCanvasRenderLoop = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    const renderFrame = (timestamp: number) => {
      const canvas = compositorCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;

          ctx.save();
          const videoEl = liveVideoRef.current;
          if (videoEl && videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
            // Center-crop video into 9:16 canvas
            const vw = videoEl.videoWidth;
            const vh = videoEl.videoHeight;
            const targetRatio = w / h;
            const videoRatio = vw / vh;
            let sx = 0,
              sy = 0,
              sw = vw,
              sh = vh;
            if (videoRatio > targetRatio) {
              sw = vh * targetRatio;
              sx = (vw - sw) / 2;
            } else {
              sh = vw / targetRatio;
              sy = (vh - sh) / 2;
            }

            if (facingModeRef.current === 'user') {
              ctx.translate(w, 0);
              ctx.scale(-1, 1);
            }
            ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, w, h);
          } else {
            // Animated Studio Backdrop when camera hardware is unavailable
            const grad = ctx.createLinearGradient(0, 0, w, h);
            const shift = Math.sin(timestamp * 0.001) * 30;
            grad.addColorStop(0, `hsl(${(260 + shift) % 360}, 75%, 18%)`);
            grad.addColorStop(0.5, `hsl(${(320 + shift) % 360}, 70%, 22%)`);
            grad.addColorStop(1, `hsl(${(200 + shift) % 360}, 80%, 15%)`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.font = '900 26px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Z-ONE CREATE STUDIO', w / 2, h / 2);
          }
          ctx.restore();
        }
      }
      animFrameRef.current = requestAnimationFrame(renderFrame);
    };

    animFrameRef.current = requestAnimationFrame(renderFrame);
  }, []);

  // Manage camera lifecycle based on modal open & step
  useEffect(() => {
    if (isOpen && step === 'capture') {
      startCameraStream();
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen, step, startCameraStream, stopCameraStream]);

  // Sync music playback during Edit & Preview steps
  useEffect(() => {
    if (!isOpen) {
      audioControllerRef.current?.stop();
      return;
    }

    if ((step === 'edit' || step === 'preview') && selectedMusic && isPreviewPlaying) {
      audioControllerRef.current?.startTrack(selectedMusic, musicVolume);
    } else if (step === 'capture' && isRecording && !isRecordingPaused && selectedMusic) {
      audioControllerRef.current?.startTrack(selectedMusic, musicVolume);
    } else if (!showCameraMusicDrawer) {
      audioControllerRef.current?.stop();
    }
  }, [isOpen, step, selectedMusic, isPreviewPlaying, isRecording, isRecordingPaused, musicVolume, showCameraMusicDrawer]);

  useEffect(() => {
    audioControllerRef.current?.setVolume(musicVolume);
  }, [musicVolume]);

  // Sync preview video speed, volume, and trim loop
  useEffect(() => {
    const v = previewVideoRef.current;
    if (!v) return;
    v.playbackRate = playbackSpeed;
    v.muted = muteOriginalAudio || originalAudioVolume <= 0.01;
    v.volume = muteOriginalAudio ? 0 : Math.max(0, Math.min(1, originalAudioVolume));
  }, [playbackSpeed, muteOriginalAudio, originalAudioVolume, step]);

  // Capture a JPEG cover thumbnail from a video element or canvas
  const captureCoverFromSource = useCallback((videoEl?: HTMLVideoElement | null) => {
    try {
      const targetVideo = videoEl || previewVideoRef.current || liveVideoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = 540;
      canvas.height = 960;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      const activeFilter = STUDIO_FILTERS.find((f) => f.id === selectedFilterId) || STUDIO_FILTERS[0];
      ctx.filter = activeFilter.css !== 'none' ? activeFilter.css : 'none';

      if (targetVideo && targetVideo.videoWidth > 0) {
        ctx.drawImage(targetVideo, 0, 0, canvas.width, canvas.height);
      } else if (compositorCanvasRef.current) {
        ctx.drawImage(compositorCanvasRef.current, 0, 0, canvas.width, canvas.height);
      }
      ctx.filter = 'none';
      drawStudioOverlaysOnCanvas(ctx, canvas.width, canvas.height, selectedEffectId, textOverlays, Date.now());
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      setCoverDataUrl(dataUrl);
      return dataUrl;
    } catch {
      return '';
    }
  }, [selectedFilterId, selectedEffectId, textOverlays]);

  // Finish recording and transition to Edit Studio
  const finishRecordingSession = useCallback(() => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setIsRecording(false);
    setIsRecordingPaused(false);
    audioControllerRef.current?.stop();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
  }, []);

  // Pause or Resume multi-segment recording
  const handlePauseResumeRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || !isRecording) return;

    try {
      if (recorder.state === 'recording' && typeof recorder.pause === 'function') {
        recorder.pause();
        if (recordTimerRef.current) {
          clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
        accumulatedElapsedRef.current += (Date.now() - segmentStartTsRef.current) / 1000;
        setIsRecordingPaused(true);
        audioControllerRef.current?.stop();
      } else if (recorder.state === 'paused' && typeof recorder.resume === 'function') {
        recorder.resume();
        segmentStartTsRef.current = Date.now();
        setIsRecordingPaused(false);
        recordTimerRef.current = window.setInterval(() => {
          const elapsed = accumulatedElapsedRef.current + (Date.now() - segmentStartTsRef.current) / 1000;
          setRecordedSeconds(elapsed);
          if (elapsed >= maxDuration) {
            finishRecordingSession();
          }
        }, 100);
      }
    } catch {
      // Fallback if pause/resume unsupported
    }
  };

  // Begin actual MediaRecorder capture from compositorCanvasRef + audio tracks
  const beginMediaRecording = useCallback(() => {
    const canvas = compositorCanvasRef.current;
    if (!canvas) return;

    try {
      const canvasStream = canvas.captureStream(30);
      // Attach microphone track if available and not muted
      if (mediaStreamRef.current && !isMicMuted) {
        mediaStreamRef.current.getAudioTracks().forEach((track) => {
          canvasStream.addTrack(track);
        });
      }

      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4'
      ];
      const supportedMime = mimeTypes.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) || '';

      recordedChunksRef.current = [];
      const recorder = supportedMime
        ? new MediaRecorder(canvasStream, { mimeType: supportedMime, videoBitsPerSecond: 2500000 })
        : new MediaRecorder(canvasStream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const cleanMime = (recorder.mimeType || 'video/webm').split(';')[0].trim() || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: cleanMime });
        if (blob.size > 0) {
          setMediaPreviewUrl((prev) => {
            if (prev && prev.startsWith('blob:')) {
              try { URL.revokeObjectURL(prev); } catch {}
            }
            return URL.createObjectURL(blob);
          });
          setRecordedBlob(blob);
          setMediaSourceKind('camera');
          setPlaybackSpeed(recordSpeed);
          captureCoverFromSource(liveVideoRef.current);
          setStep('edit');
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
      setIsRecordingPaused(false);
      setRecordedSeconds(0);
      accumulatedElapsedRef.current = 0;
      segmentStartTsRef.current = Date.now();

      recordTimerRef.current = window.setInterval(() => {
        const elapsed = accumulatedElapsedRef.current + (Date.now() - segmentStartTsRef.current) / 1000;
        setRecordedSeconds(elapsed);
        if (elapsed >= maxDuration) {
          finishRecordingSession();
        }
      }, 100);
    } catch (err: any) {
      if (triggerNotification) {
        triggerNotification('Hindi masimulan ang recording sa browser na ito. Mag-upload ng video mula sa gallery.', 'error');
      }
    }
  }, [isMicMuted, maxDuration, recordSpeed, captureCoverFromSource, finishRecordingSession, triggerNotification]);

  // Handle Record Button Tap (with optional 3s/10s countdown)
  const handleRecordButtonTap = () => {
    if (countdownRemaining > 0) {
      // Cancel active countdown if tapped again
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      setCountdownRemaining(0);
      return;
    }

    if (isRecording) {
      finishRecordingSession();
      return;
    }

    if (countdownSetting > 0) {
      setCountdownRemaining(countdownSetting);
      let count = countdownSetting;
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      countdownTimerRef.current = window.setInterval(() => {
        count -= 1;
        setCountdownRemaining(count);
        if (count <= 0) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          setCountdownRemaining(0);
          beginMediaRecording();
        }
      }, 1000);
    } else {
      beginMediaRecording();
    }
  };

  // Handle Importing an Existing Video File from Device
  const handleImportVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      if (triggerNotification) {
        triggerNotification(
          language === 'tl' ? 'Masyadong malaki ang video file (Max 50MB).' : 'Video file is too large (Max 50MB).',
          'error'
        );
      }
      return;
    }

    setMediaPreviewUrl((prev) => {
      if (prev && prev.startsWith('blob:')) {
        try { URL.revokeObjectURL(prev); } catch {}
      }
      return URL.createObjectURL(file);
    });
    setRecordedBlob(file);
    setMediaSourceKind('uploaded_video');
    setTrimStart(0);
    setStep('edit');
    e.target.value = '';
  };

  // Handle Photo Slideshow -> Vertical Video Reel Generator
  const handleImportPhotosForReel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    e.target.value = '';

    setIsGeneratingSlideshow(true);
    const tempObjectUrls: string[] = [];
    try {
      const selectedFiles = files.slice(0, 8);
      const loadedImages: HTMLImageElement[] = await Promise.all(
        selectedFiles.map(
          (file) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              const objUrl = URL.createObjectURL(file);
              tempObjectUrls.push(objUrl);
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = objUrl;
            })
        )
      );

      const canvas = document.createElement('canvas');
      canvas.width = 540;
      canvas.height = 960;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');

      const stream = canvas.captureStream(30);
      const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
      const supportedMime = mimeTypes.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) || '';
      const recorder = supportedMime ? new MediaRecorder(stream, { mimeType: supportedMime }) : new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      const totalDurationMs = Math.min(12000, Math.max(4000, loadedImages.length * 2000));
      const perSlideMs = totalDurationMs / loadedImages.length;

      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.start(200);

        const startTs = performance.now();
        const drawSlide = (now: number) => {
          const elapsed = now - startTs;
          const slideIdx = Math.min(loadedImages.length - 1, Math.floor(elapsed / perSlideMs));
          const slideProgress = (elapsed % perSlideMs) / perSlideMs;
          const img = loadedImages[slideIdx];

          // Blurred background
          ctx.save();
          ctx.filter = 'blur(24px) brightness(0.55)';
          ctx.drawImage(img, -40, -40, canvas.width + 80, canvas.height + 80);
          ctx.restore();

          // Ken Burns subtle zoom
          const scale = 1 + slideProgress * 0.08;
          const imgRatio = img.width / img.height;
          const canvasRatio = canvas.width / canvas.height;
          let dw = canvas.width;
          let dh = canvas.height;
          if (imgRatio > canvasRatio) {
            dh = canvas.width / imgRatio;
          } else {
            dw = canvas.height * imgRatio;
          }
          dw *= scale;
          dh *= scale;
          const dx = (canvas.width - dw) / 2;
          const dy = (canvas.height - dh) / 2;

          ctx.save();
          ctx.drawImage(img, dx, dy, dw, dh);
          ctx.restore();

          if (slideIdx === 0 && elapsed < 250) {
            try {
              setCoverDataUrl(canvas.toDataURL('image/jpeg', 0.82));
            } catch {}
          }

          if (elapsed < totalDurationMs) {
            requestAnimationFrame(drawSlide);
          } else {
            recorder.stop();
          }
        };

        requestAnimationFrame(drawSlide);
      });

      const cleanMime = (recorder.mimeType || 'video/webm').split(';')[0].trim() || 'video/webm';
      const finalBlob = new Blob(chunks, { type: cleanMime });
      setMediaPreviewUrl((prev) => {
        if (prev && prev.startsWith('blob:')) {
          try { URL.revokeObjectURL(prev); } catch {}
        }
        return URL.createObjectURL(finalBlob);
      });
      setRecordedBlob(finalBlob);
      setMediaSourceKind('photo_reel');
      setTrimStart(0);
      setVideoDuration(Math.round(totalDurationMs / 1000));
      setTrimEnd(Math.round(totalDurationMs / 1000));
      setStep('edit');
    } catch (err) {
      if (triggerNotification) {
        triggerNotification('Hindi makagawa ng Photo Reel. Subukan ang ibang larawan.', 'error');
      }
    } finally {
      tempObjectUrls.forEach((u) => {
        try { URL.revokeObjectURL(u); } catch {}
      });
      setIsGeneratingSlideshow(false);
    }
  };

  // Handle Custom Audio File Upload in Music Tab
  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      if (triggerNotification) {
        triggerNotification(
          language === 'tl' ? 'Masyadong malaki ang audio file (Max 15MB).' : 'Audio file is too large (Max 15MB).',
          'error'
        );
      }
      e.target.value = '';
      return;
    }
    const url = URL.createObjectURL(file);
    setCustomAudioBlob(file);
    const customTrack: ReelMusicTrack = {
      id: 'custom-' + Date.now(),
      title: file.name.replace(/\.[^/.]+$/, '').slice(0, 45) || 'Original Custom Sound',
      artist: currentUserName || 'Creator Audio',
      genre: 'Custom Audio',
      audioUrl: url,
      volume: musicVolume
    };
    setSelectedMusic(customTrack);
    audioControllerRef.current?.startTrack(customTrack, musicVolume);
    e.target.value = '';
  };

  // Add or Update Text Overlay
  const handleAddOrUpdateText = () => {
    if (!draftText.trim()) return;
    const preset = TEXT_COLOR_PRESETS[draftColorIdx] || TEXT_COLOR_PRESETS[0];

    if (selectedTextId) {
      setTextOverlays((prev) =>
        prev.map((t) =>
          t.id === selectedTextId
            ? {
                ...t,
                text: draftText.trim(),
                fontStyle: draftFontStyle,
                fontSize: draftFontSize,
                color: preset.color,
                bgColor: preset.bg
              }
            : t
        )
      );
      setSelectedTextId(null);
    } else {
      const newOverlay: ReelTextOverlay = {
        id: 'txt-' + Date.now(),
        text: draftText.trim(),
        fontStyle: draftFontStyle,
        fontSize: draftFontSize,
        color: preset.color,
        bgColor: preset.bg,
        x: 50,
        y: 28 + ((textOverlays.length * 14) % 45)
      };
      setTextOverlays((prev) => [...prev, newOverlay]);
    }
    setDraftText('');
  };

  const handleQuickStickerAdd = (emoji: string) => {
    const newSticker: ReelTextOverlay = {
      id: 'stk-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
      text: emoji,
      fontStyle: 'modern',
      fontSize: 'lg',
      color: '#ffffff',
      bgColor: 'transparent',
      x: 25 + Math.floor(Math.random() * 50),
      y: 25 + Math.floor(Math.random() * 50)
    };
    setTextOverlays((prev) => [...prev, newSticker]);
  };

  // Convert Blob/File to base64 dataUrl and upload to Cloudflare R2 via /api/zone/upload
  const uploadBlobToR2 = async (blob: Blob, category = 'reels'): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          const res = await fetch('/api/zone/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authToken ? { Authorization: authToken } : {})
            },
            body: JSON.stringify({
              dataUrl,
              category,
              entityId: currentUserId || 'studio-creator'
            })
          });
          const data = await res.json();
          if (res.ok && data.url) {
            resolve(data.url);
          } else {
            reject(new Error(data.error || 'Cloudflare R2 upload failed'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read media file'));
      reader.readAsDataURL(blob);
    });
  };

  const uploadDataUrlToR2 = async (dataUrl: string, category = 'reels'): Promise<string> => {
    const res = await fetch('/api/zone/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: authToken } : {})
      },
      body: JSON.stringify({
        dataUrl,
        category,
        entityId: currentUserId || 'studio-creator'
      })
    });
    const data = await res.json();
    if (res.ok && data.url) {
      return data.url;
    }
    throw new Error(data.error || 'Failed to upload thumbnail');
  };

  // Publish Reel to Z-oneReels (and optionally Z-oneSocial Feed)
  const handlePublishReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordedBlob) {
      if (triggerNotification) {
        triggerNotification('Walang naka-record o na-import na video.', 'error');
      }
      return;
    }

    if (!authToken || !currentUserId) {
      if (triggerNotification) {
        triggerNotification(
          language === 'tl'
            ? 'Kailangan mag-login upang makapag-upload ng Reel.'
            : 'Please log in to publish a Reel.',
          'error'
        );
      }
      return;
    }

    // Pre-validate 0.50 Reel Token requirement for non-admin users BEFORE uploading files to Cloudflare R2
    if (!isAdmin && userTokens < 0.5) {
      if (triggerNotification) {
        triggerNotification(
          `Kailangan mo ng 0.50 Tokens bawat Reel (Balance: ${userTokens.toFixed(2)} Tokens). Mag-subscribe ng '20 Reels & Shorts' package (₱10.00).`,
          'error'
        );
      }
      return;
    }

    setIsPublishing(true);
    audioControllerRef.current?.stop();

    try {
      // 1. Upload Video to Cloudflare R2
      setPublishStageText(language === 'tl' ? 'Ina-upload ang Reel video sa Cloud Storage...' : 'Uploading Reel video to Cloud Storage...');
      const permanentVideoUrl = await uploadBlobToR2(recordedBlob, 'reels');

      // 2. Upload Cover Thumbnail if available
      let permanentCoverUrl = '';
      const finalCoverData = coverDataUrl || captureCoverFromSource(previewVideoRef.current);
      if (finalCoverData && finalCoverData.startsWith('data:')) {
        setPublishStageText(language === 'tl' ? 'Ina-upload ang Reel cover...' : 'Uploading Reel cover...');
        try {
          permanentCoverUrl = await uploadDataUrlToR2(finalCoverData, 'reels');
        } catch {
          // Non-fatal if cover upload fails
        }
      }

      // 3. Prepare Music Track Metadata (upload custom audio file to R2 if present so no blob: URL is ever stored)
      let finalMusicTrack: ReelMusicTrack | undefined = undefined;
      if (selectedMusic) {
        let resolvedAudioUrl = selectedMusic.audioUrl;
        if (resolvedAudioUrl && resolvedAudioUrl.startsWith('blob:') && customAudioBlob) {
          setPublishStageText(language === 'tl' ? 'Ina-upload ang Custom Sound sa Cloud Storage...' : 'Uploading custom audio...');
          try {
            resolvedAudioUrl = await uploadBlobToR2(customAudioBlob, 'reels');
          } catch {
            resolvedAudioUrl = undefined;
          }
        } else if (resolvedAudioUrl && resolvedAudioUrl.startsWith('blob:')) {
          resolvedAudioUrl = undefined;
        }
        finalMusicTrack = {
          ...selectedMusic,
          audioUrl: resolvedAudioUrl,
          volume: musicVolume,
          originalAudioMuted: muteOriginalAudio,
          originalAudioVolume
        };
      }

      // 4. Submit to POST /api/reels
      setPublishStageText(language === 'tl' ? 'Pina-publish sa Z-oneReels...' : 'Publishing to Z-oneReels...');
      const finalTitle =
        reelTitle.trim() ||
        (selectedMusic ? `🎬 ${selectedMusic.title} • #ZOneReels` : '🎬 Created with Z-one Create Studio #ZOneReels');

      const res = await fetch('/api/reels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: authToken } : {})
        },
        body: JSON.stringify({
          url: permanentVideoUrl,
          embedUrl: permanentVideoUrl,
          platform: 'direct',
          title: finalTitle,
          description: reelDescription.trim() || undefined,
          thumbnailUrl: permanentCoverUrl || undefined,
          communityId: selectedCommunityId || undefined,
          productRefs: selectedProducts.length > 0 ? selectedProducts : undefined,
          productRef: selectedProducts.length > 0 ? selectedProducts[0] : undefined,
          addedBy: currentUserName || 'Creator',
          source: 'zone_create_studio',
          musicTrack: finalMusicTrack,
          filterPreset: selectedFilterId,
          filterCss: currentFilterObj.css !== 'none' ? currentFilterObj.css : undefined,
          effectPreset: selectedEffectId !== 'none' ? selectedEffectId : undefined,
          textOverlays: textOverlays.length > 0 ? textOverlays : undefined,
          playbackSpeed,
          durationSeconds: videoDuration,
          trimStart,
          trimEnd
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Bigo ang pag-publish ng Reel.');
      }

      // 5. Optional: Also share to Z-oneSocial Feed ONLY when Reel is approved (or created by Admin) so pending reels do not bypass moderation
      if (alsoShareToFeed && (isAdmin || data.reel?.status === 'approved')) {
        try {
          await fetch('/api/zone/posts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authToken ? { Authorization: authToken } : {})
            },
            body: JSON.stringify({
              text: `${finalTitle}${reelDescription.trim() ? '\n\n' + reelDescription.trim() : ''}`,
              mediaUrl: permanentVideoUrl,
              mediaType: 'video',
              communityId: selectedCommunityId || undefined,
              productRefs: selectedProducts.length > 0 ? selectedProducts : undefined
            })
          });
          window.dispatchEvent(new Event('zone-refresh-feed'));
        } catch {
          // Non-fatal
        }
      }

      if (triggerNotification) {
        triggerNotification(
          data.message || (language === 'tl' ? '🎬 Matagumpay na naisumite ang iyong Reel!' : '🎬 Your Reel has been submitted!'),
          'success'
        );
      }

      if (onPublishSuccess && data.reel) {
        onPublishSuccess(data.reel);
      }
      handleResetAndClose();
    } catch (err: any) {
      if (triggerNotification) {
        triggerNotification(err?.message || 'Error sa pag-publish ng Reel. Subukan muli.', 'error');
      }
    } finally {
      setIsPublishing(false);
      setPublishStageText('');
    }
  };

  const handleResetAndClose = () => {
    stopCameraStream();
    audioControllerRef.current?.stop();
    if (mediaPreviewUrl && mediaPreviewUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(mediaPreviewUrl); } catch {}
    }
    if (selectedMusic?.audioUrl && selectedMusic.audioUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(selectedMusic.audioUrl); } catch {}
    }
    setStep('capture');
    setRecordedBlob(null);
    setCustomAudioBlob(null);
    setMediaPreviewUrl('');
    setRecordedSeconds(0);
    setSelectedFilterId('normal');
    setSelectedEffectId('none');
    setSelectedMusic(null);
    setTextOverlays([]);
    setReelTitle('');
    setReelDescription('');
    setSelectedProducts([]);
    setSelectedCommunityId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9998] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center select-none overflow-hidden">
      {/* Hidden File Inputs */}
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/*"
        className="hidden"
        onChange={handleImportVideoFile}
      />
      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        multiple
        className="hidden"
        onChange={handleImportPhotosForReel}
      />
      <input
        ref={customAudioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleCustomAudioUpload}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => setCoverDataUrl(reader.result as string);
          reader.readAsDataURL(file);
          e.target.value = '';
        }}
      />

      {/* Main 9:16 Mobile-First Studio Container */}
      <div className="relative w-full max-w-[440px] h-[100dvh] sm:h-[94dvh] sm:rounded-3xl bg-slate-950 border border-white/10 shadow-2xl overflow-hidden flex flex-col justify-between">
        {/* ============================================================
            STEP 1: Z-ONE CREATE CAMERA & MEDIA CAPTURE
        ============================================================ */}
        {step === 'capture' && (
          <>
            {/* Offscreen raw video element feeding the compositor canvas (not display:none so mobile browsers decode frames continuously) */}
            <video
              ref={liveVideoRef}
              playsInline
              muted
              autoPlay
              className="absolute opacity-0 pointer-events-none w-px h-px -z-10"
            />

            {/* Live 9:16 Compositor Canvas + Non-Destructive Filter & Overlay Preview */}
            <canvas
              ref={compositorCanvasRef}
              width={540}
              height={960}
              style={{
                filter: currentFilterObj.css !== 'none' ? currentFilterObj.css : undefined
              }}
              className="absolute inset-0 w-full h-full object-cover z-0"
            />
            {(selectedEffectId !== 'none' || textOverlays.length > 0) && (
              <StudioVisualOverlays
                effectPreset={selectedEffectId}
                textOverlays={textOverlays}
                interactive={false}
              />
            )}

            {/* Recording Duration Progress Bar at Top */}
            <div className="relative z-30 pt-2 px-3 space-y-2 bg-gradient-to-b from-black/80 via-black/30 to-transparent pb-4">
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 transition-all duration-100"
                  style={{ width: `${Math.min(100, (recordedSeconds / maxDuration) * 100)}%` }}
                />
              </div>

              {/* Top Header Row: Close | Add Sound Pill | Flip Camera */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/75 transition cursor-pointer active:scale-90"
                  title="Close Z-one Create"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Add Sound / Music Pill */}
                <button
                  type="button"
                  onClick={() => {
                    setShowCameraMusicDrawer((prev) => !prev);
                    setShowCameraFilterDrawer(false);
                  }}
                  className="px-4 py-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition cursor-pointer active:scale-95 max-w-[210px]"
                >
                  <Music className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-bounce" />
                  <span className="truncate">
                    {selectedMusic ? `${selectedMusic.title}` : language === 'tl' ? 'Magdagdag ng Tunog' : 'Add Sound'}
                  </span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
                    className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/75 transition cursor-pointer active:scale-90"
                    title="Flip Camera"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Camera Notice Banner if Fallback Mode */}
              {cameraError && (
                <div className="bg-slate-900/90 backdrop-blur-md border border-amber-500/40 rounded-2xl p-2.5 text-[11px] text-amber-200 flex items-center justify-between gap-2">
                  <span>{cameraError}</span>
                  <button
                    type="button"
                    onClick={startCameraStream}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-[10px] shrink-0 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {/* Countdown Overlay (3.. 2.. 1..) */}
            {countdownRemaining > 0 && (
              <div className="absolute inset-0 z-40 bg-black/50 backdrop-blur-xs flex items-center justify-center">
                <span className="text-8xl font-black text-white drop-shadow-[0_0_30px_rgba(244,63,94,0.9)] animate-ping">
                  {countdownRemaining}
                </span>
              </div>
            )}

            {/* Slideshow Generation Loading Overlay */}
            {isGeneratingSlideshow && (
              <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-3 p-6 text-center">
                <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
                <p className="text-sm font-black text-white">
                  {language === 'tl' ? 'Ginagawang Reel Video ang iyong mga larawan...' : 'Creating vertical Reel from your photos...'}
                </p>
              </div>
            )}

            {/* Right-Side Vertical Tool Rail (TikTok / Shorts Camera Controls) */}
            <aside className="absolute right-3 top-24 z-30 flex flex-col items-center gap-3">
              {/* Flip */}
              <button
                type="button"
                onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
                className="flex flex-col items-center gap-0.5 text-white drop-shadow cursor-pointer active:scale-90"
              >
                <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold">Flip</span>
              </button>

              {/* Speed */}
              <button
                type="button"
                onClick={() => {
                  const speeds: Array<0.5 | 1 | 1.5 | 2> = [0.5, 1, 1.5, 2];
                  const next = speeds[(speeds.indexOf(recordSpeed) + 1) % speeds.length];
                  setRecordSpeed(next);
                }}
                className="flex flex-col items-center gap-0.5 text-white drop-shadow cursor-pointer active:scale-90"
              >
                <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center font-black text-xs text-amber-300">
                  {recordSpeed}x
                </div>
                <span className="text-[10px] font-bold">Speed</span>
              </button>

              {/* Timer Countdown */}
              <button
                type="button"
                onClick={() => {
                  const timers: Array<0 | 3 | 10> = [0, 3, 10];
                  const next = timers[(timers.indexOf(countdownSetting) + 1) % timers.length];
                  setCountdownSetting(next);
                }}
                className="flex flex-col items-center gap-0.5 text-white drop-shadow cursor-pointer active:scale-90"
              >
                <div className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center ${
                  countdownSetting > 0 ? 'bg-rose-600/80 border-rose-400 text-white' : 'bg-black/50 border-white/15 text-white'
                }`}>
                  <Timer className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold">{countdownSetting > 0 ? `${countdownSetting}s` : 'Timer'}</span>
              </button>

              {/* Filters & Effects Drawer Toggle */}
              <button
                type="button"
                onClick={() => {
                  setShowCameraFilterDrawer((prev) => !prev);
                  setShowCameraMusicDrawer(false);
                }}
                className="flex flex-col items-center gap-0.5 text-white drop-shadow cursor-pointer active:scale-90"
              >
                <div className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center ${
                  selectedFilterId !== 'normal' || selectedEffectId !== 'none'
                    ? 'bg-pink-600/80 border-pink-400 text-white'
                    : 'bg-black/50 border-white/15 text-amber-300'
                }`}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold">Effects</span>
              </button>

              {/* Mic Mute/Unmute */}
              <button
                type="button"
                onClick={() => setIsMicMuted((prev) => !prev)}
                className="flex flex-col items-center gap-0.5 text-white drop-shadow cursor-pointer active:scale-90"
              >
                <div className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center ${
                  isMicMuted ? 'bg-rose-900/80 border-rose-500 text-rose-300' : 'bg-black/50 border-white/15 text-white'
                }`}>
                  {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </div>
                <span className="text-[10px] font-bold">{isMicMuted ? 'Muted' : 'Mic'}</span>
              </button>
            </aside>

            {/* Camera Quick Filter & Effects Drawer */}
            {showCameraFilterDrawer && (
              <div className="absolute inset-x-0 bottom-36 z-30 mx-3 p-3 rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-white/15 space-y-2.5 animate-slideUp">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Camera Filters & Live Effects</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCameraFilterDrawer(false)}
                    className="text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Done
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {STUDIO_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFilterId(f.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 border transition cursor-pointer ${
                        selectedFilterId === f.id
                          ? 'bg-rose-600 text-white border-rose-400'
                          : 'bg-slate-900 text-slate-300 border-slate-800'
                      }`}
                    >
                      <span>{f.badge}</span>
                      <span>{f.name}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {STUDIO_EFFECTS.map((ef) => (
                    <button
                      key={ef.id}
                      type="button"
                      onClick={() => setSelectedEffectId(ef.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 border transition cursor-pointer ${
                        selectedEffectId === ef.id
                          ? 'bg-indigo-600 text-white border-indigo-400'
                          : 'bg-slate-900 text-slate-300 border-slate-800'
                      }`}
                    >
                      <span>{ef.icon}</span>
                      <span>{ef.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Camera Quick Music Drawer */}
            {showCameraMusicDrawer && (
              <div className="absolute inset-x-0 bottom-36 z-30 mx-3 p-3.5 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-white/15 space-y-2.5 max-h-[45vh] overflow-y-auto animate-slideUp">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-rose-400" />
                    <span>Z-one Sound Library</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => customAudioInputRef.current?.click()}
                      className="text-[11px] font-bold text-cyan-400 hover:underline cursor-pointer"
                    >
                      + Upload Audio
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        audioControllerRef.current?.stop();
                        setShowCameraMusicDrawer(false);
                      }}
                      className="text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {STUDIO_MUSIC_LIBRARY.map((track) => {
                    const isSelected = selectedMusic?.id === track.id;
                    return (
                      <div
                        key={track.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedMusic(null);
                            audioControllerRef.current?.stop();
                          } else {
                            setSelectedMusic(track);
                            audioControllerRef.current?.startTrack(track, musicVolume);
                          }
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? 'bg-rose-600/20 border-rose-500 text-white'
                            : 'bg-slate-900/90 border-slate-800 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-rose-600 text-white' : 'bg-slate-800 text-rose-400'
                          }`}>
                            <Music className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{track.title}</p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {track.artist} · {track.genre}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-white/10 shrink-0">
                          {isSelected ? '✓ Selected' : 'Use'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Camera Controls: Duration Pills + Record Shutter + Upload Gallery + Mode Switcher */}
            <div className="relative z-30 bg-gradient-to-t from-black via-black/85 to-transparent pt-6 pb-3 px-4 space-y-3">
              {/* Duration Selector Pills (15s | 30s | 60s) */}
              <div className="flex items-center justify-center gap-2">
                {([15, 30, 60] as const).map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    disabled={isRecording}
                    onClick={() => setMaxDuration(dur)}
                    className={`px-3 py-1 rounded-full text-[11px] font-black transition cursor-pointer ${
                      maxDuration === dur
                        ? 'bg-white text-slate-950 shadow-md'
                        : 'bg-black/50 text-slate-300 hover:text-white border border-white/15'
                    }`}
                  >
                    {dur}s
                  </button>
                ))}
              </div>

              {/* Main Shutter Row: Photo Reel / Pause | Record Button | Upload Video / Done */}
              <div className="flex items-center justify-around">
                {/* Left: Photo Slideshow Reel Picker (or Pause/Resume while recording) */}
                {isRecording ? (
                  <button
                    type="button"
                    onClick={handlePauseResumeRecording}
                    className="flex flex-col items-center gap-1 text-white hover:text-amber-300 transition cursor-pointer active:scale-95"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/20 backdrop-blur-md border border-amber-400/50 flex items-center justify-center shadow-lg">
                      {isRecordingPaused ? <Play className="w-5 h-5 text-amber-300 fill-current" /> : <Pause className="w-5 h-5 text-amber-300" />}
                    </div>
                    <span className="text-[10px] font-bold">{isRecordingPaused ? 'Resume' : 'Pause'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="flex flex-col items-center gap-1 text-white hover:text-amber-300 transition cursor-pointer active:scale-95"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
                      <ImageIcon className="w-5 h-5 text-amber-300" />
                    </div>
                    <span className="text-[10px] font-bold">Photo Reel</span>
                  </button>
                )}

                {/* Center: TikTok/Reels Record Shutter Button */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    id="zone-create-shutter-btn"
                    onClick={handleRecordButtonTap}
                    className="relative w-20 h-20 rounded-full p-1.5 border-4 border-white flex items-center justify-center transition active:scale-90 cursor-pointer shadow-[0_0_25px_rgba(244,63,94,0.5)]"
                  >
                    <div
                      className={`transition-all duration-200 ${
                        isRecording
                          ? 'w-8 h-8 rounded-lg bg-rose-600 animate-pulse'
                          : 'w-full h-full rounded-full bg-gradient-to-tr from-rose-600 via-pink-500 to-amber-500'
                      }`}
                    />
                  </button>
                  <span className="text-[11px] font-black text-white tracking-wide">
                    {isRecording
                      ? `${recordedSeconds.toFixed(1)}s / ${maxDuration}s${isRecordingPaused ? ' (Paused)' : ''}`
                      : 'Tap to Record'}
                  </span>
                </div>

                {/* Right: Upload Video from Gallery (or Finish/Next while recording) */}
                {isRecording ? (
                  <button
                    type="button"
                    onClick={finishRecordingSession}
                    className="flex flex-col items-center gap-1 text-white hover:text-emerald-300 transition cursor-pointer active:scale-95"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/25 backdrop-blur-md border border-emerald-400/50 flex items-center justify-center shadow-lg">
                      <Check className="w-5 h-5 text-emerald-300" />
                    </div>
                    <span className="text-[10px] font-bold">Done</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="flex flex-col items-center gap-1 text-white hover:text-cyan-300 transition cursor-pointer active:scale-95"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
                      <Upload className="w-5 h-5 text-cyan-300" />
                    </div>
                    <span className="text-[10px] font-bold">Upload Video</span>
                  </button>
                )}
              </div>

              {/* Bottom Mode Switcher Bar (Reel Camera | Upload | Social Post | Classic Upload) */}
              <div className="flex items-center justify-center gap-1.5 pt-1 border-t border-white/10 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-black text-[11px] shrink-0 cursor-pointer"
                >
                  🎬 Reel Studio
                </button>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-[11px] shrink-0 cursor-pointer transition"
                >
                  📤 Import Video
                </button>
                {onSwitchToPostComposer && (
                  <button
                    type="button"
                    onClick={() => {
                      handleResetAndClose();
                      onSwitchToPostComposer();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-[11px] shrink-0 cursor-pointer transition flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3 text-blue-400" />
                    <span>Social Post</span>
                  </button>
                )}
                {onSwitchToClassicUpload && (
                  <button
                    type="button"
                    onClick={() => {
                      handleResetAndClose();
                      onSwitchToClassicUpload();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-[11px] shrink-0 cursor-pointer transition"
                  >
                    🔗 Paste Link / Tokens
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* ============================================================
            STEP 2: EDIT STUDIO (MUSIC, EFFECTS, TEXT, TRIM)
        ============================================================ */}
        {step === 'edit' && (
          <div className="flex flex-col h-full justify-between bg-slate-950">
            {/* Top Bar: Retake | Title | Next: Preview */}
            <div className="relative z-30 flex items-center justify-between px-3.5 py-3 bg-slate-950/90 border-b border-white/10">
              <button
                type="button"
                onClick={() => {
                  audioControllerRef.current?.stop();
                  setStep('capture');
                }}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{language === 'tl' ? 'Ulitin' : 'Retake'}</span>
              </button>

              <div className="text-center">
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Z-one Reels Studio
                </span>
                {selectedMusic && (
                  <p className="text-[10px] text-rose-400 font-semibold truncate max-w-[160px]">
                    🎵 {selectedMusic.title}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  captureCoverFromSource(previewVideoRef.current);
                  setStep('preview');
                }}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-black flex items-center gap-1 shadow-lg cursor-pointer transition active:scale-95"
              >
                <span>{language === 'tl' ? 'Sunod' : 'Next'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Center 9:16 Interactive Video Preview Canvas */}
            <div
              onClick={(e) => {
                // If user has a selected text overlay in 'text' tab, move it to the tapped position!
                if (activeEditTab === 'text' && selectedTextId) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                  const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                  setTextOverlays((prev) =>
                    prev.map((t) =>
                      t.id === selectedTextId ? { ...t, x: Math.max(10, Math.min(90, x)), y: Math.max(10, Math.min(90, y)) } : t
                    )
                  );
                  return;
                }
                // Otherwise toggle play/pause
                const v = previewVideoRef.current;
                if (!v) return;
                if (v.paused) {
                  v.play().catch(() => {});
                  setIsPreviewPlaying(true);
                } else {
                  v.pause();
                  setIsPreviewPlaying(false);
                }
              }}
              className="relative flex-1 bg-black overflow-hidden flex items-center justify-center cursor-pointer"
            >
              <video
                ref={previewVideoRef}
                src={mediaPreviewUrl}
                playsInline
                loop
                autoPlay
                style={{
                  filter: currentFilterObj.css !== 'none' ? currentFilterObj.css : undefined
                }}
                onLoadedMetadata={(e) => {
                  const dur = e.currentTarget.duration;
                  if (dur && isFinite(dur) && dur > 0) {
                    const rounded = Math.ceil(dur);
                    setVideoDuration(rounded);
                    setTrimEnd(rounded);
                  }
                }}
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  if (trimEnd > trimStart && v.currentTime >= trimEnd) {
                    v.currentTime = trimStart;
                  }
                }}
                className="w-full h-full object-contain max-h-full"
              />

              {/* Live Visual Effects & Text Overlays */}
              <StudioVisualOverlays
                effectPreset={selectedEffectId}
                textOverlays={textOverlays}
                interactive={true}
                selectedTextId={selectedTextId}
                onSelectText={(id) => {
                  setSelectedTextId(id);
                  const found = textOverlays.find((t) => t.id === id);
                  if (found) {
                    setDraftText(found.text);
                    setDraftFontStyle(found.fontStyle || 'modern');
                    setDraftFontSize(found.fontSize || 'md');
                  }
                  setActiveEditTab('text');
                }}
              />

              {/* Play/Pause Indicator Badge */}
              {!isPreviewPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none z-30">
                  <div className="w-14 h-14 rounded-full bg-black/60 border border-white/30 flex items-center justify-center text-white">
                    <Play className="w-7 h-7 fill-current ml-1" />
                  </div>
                </div>
              )}

              {/* Helper hint when positioning text */}
              {activeEditTab === 'text' && selectedTextId && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-cyan-500/90 text-slate-950 text-[11px] font-black px-3 py-1 rounded-full shadow">
                  Tap anywhere on video to move selected text
                </div>
              )}
            </div>

            {/* Bottom Creative Tool Panel */}
            <div className="relative z-30 bg-slate-950 border-t border-slate-800 p-3 space-y-3">
              {/* Tool Selector Tabs: Effects | Music | Text | Trim */}
              <div className="grid grid-cols-4 gap-1.5 bg-slate-900 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveEditTab('effects')}
                  className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeEditTab === 'effects' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Effects</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEditTab('music')}
                  className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeEditTab === 'music' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>Music</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEditTab('text')}
                  className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeEditTab === 'text' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEditTab('trim')}
                  className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeEditTab === 'trim' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              {/* 1. EFFECTS & FILTERS TAB */}
              {activeEditTab === 'effects' && (
                <div className="space-y-2.5 max-h-44 overflow-y-auto pr-1">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                      Color Filters
                    </span>
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {STUDIO_FILTERS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setSelectedFilterId(f.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 border transition cursor-pointer ${
                            selectedFilterId === f.id
                              ? 'bg-rose-600 text-white border-rose-400 shadow'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          <span>{f.badge}</span>
                          <span>{f.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                      Visual Effects
                    </span>
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {STUDIO_EFFECTS.map((ef) => (
                        <button
                          key={ef.id}
                          type="button"
                          onClick={() => setSelectedEffectId(ef.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 border transition cursor-pointer ${
                            selectedEffectId === ef.id
                              ? 'bg-indigo-600 text-white border-indigo-400 shadow'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          <span>{ef.icon}</span>
                          <span>{ef.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. MUSIC & AUDIO MIXER TAB */}
              {activeEditTab === 'music' && (
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Select Background Music
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => customAudioInputRef.current?.click()}
                        className="text-[11px] font-bold text-cyan-400 hover:underline cursor-pointer"
                      >
                        + Upload MP3/Audio
                      </button>
                      {selectedMusic && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMusic(null);
                            audioControllerRef.current?.stop();
                          }}
                          className="text-[11px] font-bold text-rose-400 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Audio Volume Mixer Controls */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-900/90 p-2 rounded-xl border border-slate-800 text-[11px]">
                    <div>
                      <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
                        <span>Original Sound</span>
                        <button
                          type="button"
                          onClick={() => setMuteOriginalAudio((prev) => !prev)}
                          className="text-[10px] text-amber-400 font-bold cursor-pointer"
                        >
                          {muteOriginalAudio ? 'Muted' : `${Math.round(originalAudioVolume * 100)}%`}
                        </button>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={muteOriginalAudio ? 0 : originalAudioVolume}
                        onChange={(e) => {
                          setMuteOriginalAudio(false);
                          setOriginalAudioVolume(parseFloat(e.target.value));
                        }}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
                        <span>Music Volume</span>
                        <span className="text-[10px] text-rose-400 font-bold">{Math.round(musicVolume * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={musicVolume}
                        onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                        className="w-full accent-rose-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Music Library List */}
                  <div className="grid grid-cols-1 gap-1.5">
                    {STUDIO_MUSIC_LIBRARY.map((track) => {
                      const isSelected = selectedMusic?.id === track.id;
                      return (
                        <div
                          key={track.id}
                          onClick={() => {
                            setSelectedMusic(track);
                            audioControllerRef.current?.startTrack(track, musicVolume);
                          }}
                          className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                            isSelected
                              ? 'bg-rose-600/20 border-rose-500 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Music className="w-4 h-4 text-rose-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">{track.title}</p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {track.artist} · {track.genre}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white/10 shrink-0">
                            {isSelected ? '✓ Active' : 'Select'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. TEXT OVERLAYS & STICKERS TAB */}
              {activeEditTab === 'text' && (
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {/* Text Input + Add Button */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      placeholder={language === 'tl' ? 'Mag-type ng text sa video...' : 'Type text overlay...'}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-rose-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddOrUpdateText}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shrink-0 cursor-pointer"
                    >
                      {selectedTextId ? 'Update' : '+ Add'}
                    </button>
                  </div>

                  {/* Font Style & Color Presets */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {TEXT_FONT_STYLES.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setDraftFontStyle(f.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 border cursor-pointer ${
                          draftFontStyle === f.id
                            ? 'bg-white text-slate-950 border-white'
                            : 'bg-slate-900 text-slate-300 border-slate-800'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                      {TEXT_COLOR_PRESETS.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setDraftColorIdx(idx)}
                          style={{ backgroundColor: p.bg !== 'transparent' ? p.bg : p.color }}
                          className={`w-6 h-6 rounded-full border-2 shrink-0 cursor-pointer ${
                            draftColorIdx === idx ? 'border-white scale-110' : 'border-slate-700'
                          }`}
                          title={p.label}
                        />
                      ))}
                    </div>

                    {/* Quick Stickers */}
                    <div className="flex items-center gap-1 shrink-0">
                      {['🔥', '😂', '🇵🇭', '💖', '💯', '✨'].map((emo) => (
                        <button
                          key={emo}
                          type="button"
                          onClick={() => handleQuickStickerAdd(emo)}
                          className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-sm cursor-pointer"
                        >
                          {emo}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Text Layers List */}
                  {textOverlays.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {textOverlays.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setSelectedTextId(item.id);
                            setDraftText(item.text);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border cursor-pointer ${
                            selectedTextId === item.id
                              ? 'bg-cyan-950 border-cyan-400 text-cyan-200'
                              : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          <span className="truncate max-w-[110px]">{item.text}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTextOverlays((prev) => prev.filter((t) => t.id !== item.id));
                              if (selectedTextId === item.id) setSelectedTextId(null);
                            }}
                            className="text-rose-400 hover:text-rose-300"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 4. TRIM, SPEED & COVER TAB */}
              {activeEditTab === 'trim' && (
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">
                        Trim Start: {trimStart}s
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={Math.max(0, trimEnd - 1)}
                        step={0.5}
                        value={trimStart}
                        onChange={(e) => setTrimStart(parseFloat(e.target.value))}
                        className="w-full accent-rose-500 cursor-pointer"
                      />
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">
                        Trim End: {trimEnd}s
                      </span>
                      <input
                        type="range"
                        min={Math.min(videoDuration, trimStart + 1)}
                        max={Math.max(1, videoDuration)}
                        step={0.5}
                        value={trimEnd}
                        onChange={(e) => setTrimEnd(parseFloat(e.target.value))}
                        className="w-full accent-rose-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-300">Playback Speed</span>
                    <div className="flex items-center gap-1">
                      {[0.5, 1, 1.5, 2].map((sp) => (
                        <button
                          key={sp}
                          type="button"
                          onClick={() => setPlaybackSpeed(sp)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer ${
                            playbackSpeed === sp ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {sp}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-300">Reel Cover Image</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          captureCoverFromSource(previewVideoRef.current);
                          if (triggerNotification) triggerNotification('📸 Na-save ang kasalukuyang frame bilang Cover!', 'success');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold cursor-pointer"
                      >
                        Capture Frame
                      </button>
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-[11px] font-bold cursor-pointer"
                      >
                        Upload Cover
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            STEP 3: PREVIEW & PUBLISH TO REELS
        ============================================================ */}
        {step === 'preview' && (
          <div className="flex flex-col h-full justify-between bg-slate-950 overflow-y-auto">
            {/* Top Header */}
            <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
              <button
                type="button"
                disabled={isPublishing}
                onClick={() => setStep('edit')}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{language === 'tl' ? 'I-edit' : 'Back to Edit'}</span>
              </button>

              <span className="text-xs font-black text-white uppercase tracking-wider">
                {language === 'tl' ? 'Preview & I-Publish' : 'Preview & Publish'}
              </span>

              <button
                type="button"
                onClick={() => setIsFullPreviewMode((prev) => !prev)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isFullPreviewMode ? 'Details' : 'Full View'}</span>
              </button>
            </div>

            {/* Live Video Preview Card */}
            <div className={`relative bg-black mx-auto w-full flex items-center justify-center overflow-hidden transition-all ${
              isFullPreviewMode ? 'h-[76vh]' : 'h-64 sm:h-72 border-b border-slate-800'
            }`}>
              <video
                ref={previewVideoRef}
                src={mediaPreviewUrl}
                playsInline
                loop
                autoPlay
                style={{
                  filter: currentFilterObj.css !== 'none' ? currentFilterObj.css : undefined
                }}
                className="w-full h-full object-contain"
              />
              <StudioVisualOverlays
                effectPreset={selectedEffectId}
                textOverlays={textOverlays}
                interactive={false}
              />

              {/* Creative Summary Badges on Preview */}
              <div className="absolute bottom-2.5 left-3 right-3 z-30 flex flex-wrap items-center gap-1.5 pointer-events-none">
                {selectedFilterId !== 'normal' && (
                  <span className="text-[10px] font-bold bg-black/70 text-amber-300 px-2 py-0.5 rounded-md border border-amber-400/30">
                    {currentFilterObj.badge} {currentFilterObj.name}
                  </span>
                )}
                {selectedEffectId !== 'none' && (
                  <span className="text-[10px] font-bold bg-black/70 text-pink-300 px-2 py-0.5 rounded-md border border-pink-400/30">
                    ✨ {STUDIO_EFFECTS.find((e) => e.id === selectedEffectId)?.name}
                  </span>
                )}
                {selectedMusic && (
                  <span className="text-[10px] font-bold bg-black/70 text-cyan-300 px-2 py-0.5 rounded-md border border-cyan-400/30 truncate max-w-[200px]">
                    🎵 {selectedMusic.title}
                  </span>
                )}
              </div>
            </div>

            {/* Publish Details Form */}
            {!isFullPreviewMode && (
              <form onSubmit={handlePublishReel} className="p-4 space-y-3.5 flex-1">
                {/* Caption / Title */}
                <div>
                  <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                    {language === 'tl' ? 'Pamagat at #Hashtags ng Reel' : 'Reel Caption & #Hashtags'}
                  </label>
                  <input
                    type="text"
                    value={reelTitle}
                    onChange={(e) => setReelTitle(e.target.value)}
                    placeholder="Maglagay ng catchy title... #ZOneReels #TrendingPH"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-rose-500"
                  />
                  {/* Quick Hashtag Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['#ZOneReels', '#PinoyCreator', '#TrendingPH', '#WatchAndEarn', '#FYP'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (!reelTitle.includes(tag)) {
                            setReelTitle((prev) => `${prev.trim()} ${tag}`.trim());
                          }
                        }}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 cursor-pointer"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Description */}
                <div>
                  <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                    {language === 'tl' ? 'Deskripsyon (Opsyonal)' : 'Description (Optional)'}
                  </label>
                  <textarea
                    rows={2}
                    value={reelDescription}
                    onChange={(e) => setReelDescription(e.target.value)}
                    placeholder={language === 'tl' ? 'Kwento o detalye tungkol sa iyong Reel...' : 'Tell viewers more about your Reel...'}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-rose-500 resize-none"
                  />
                </div>

                {/* Community Selector */}
                {communities.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{language === 'tl' ? 'I-tag sa Community (Opsyonal)' : 'Tag Community (Optional)'}</span>
                    </label>
                    <select
                      value={selectedCommunityId}
                      onChange={(e) => setSelectedCommunityId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">🌐 Public Z-oneReels Feed</option>
                      {communities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Z-oneShop Product Tagging (Max 3) */}
                {availableProducts.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-amber-300 flex items-center gap-1">
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Tag Z-oneShop Products ({selectedProducts.length}/3)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowProductSelector((prev) => !prev)}
                        className="text-[11px] font-bold text-cyan-400 hover:underline cursor-pointer"
                      >
                        {showProductSelector ? 'Hide Products' : '+ Tag Product'}
                      </button>
                    </div>

                    {selectedProducts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProducts.map((p) => (
                          <div
                            key={p.id}
                            className="bg-slate-900 border border-amber-500/40 rounded-lg px-2.5 py-1 text-[11px] text-white flex items-center gap-1.5"
                          >
                            <span className="truncate max-w-[140px]">{p.name}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedProducts((prev) => prev.filter((item) => item.id !== p.id))}
                              className="text-rose-400 font-bold cursor-pointer"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {showProductSelector && (
                      <div className="max-h-32 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl p-2 space-y-1">
                        {availableProducts.map((prod) => {
                          const isAdded = selectedProducts.some((p) => p.id === prod.id);
                          return (
                            <div
                              key={prod.id}
                              onClick={() => {
                                if (isAdded) {
                                  setSelectedProducts((prev) => prev.filter((p) => p.id !== prod.id));
                                } else if (selectedProducts.length < 3) {
                                  setSelectedProducts((prev) => [...prev, prod]);
                                }
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-800 flex items-center justify-between text-xs cursor-pointer"
                            >
                              <span className="text-slate-200 font-semibold truncate">{prod.name}</span>
                              <span className="text-emerald-400 font-bold shrink-0">
                                {isAdded ? '✓ Tagged' : `₱${prod.price}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Reel Token Balance & Admin Moderation Notice */}
                {!isAdmin && (
                  <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                    userTokens >= 0.5
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-amber-950/50 border-amber-500/50 text-amber-200'
                  }`}>
                    <div className="text-[11px] leading-snug">
                      <span className="font-black block">
                        🎟️ Reel Tokens: {userTokens.toFixed(2)} (0.50 Token / Approved Reel)
                      </span>
                      <span className="text-[10px] opacity-85">
                        {userTokens >= 0.5
                          ? 'Isasailalim sa Admin Review; mababawas lang ang 0.50 token kapag na-approve.'
                          : 'Kulang ang iyong Reel Tokens (kailangan ng 0.50 token upang makapag-submit).'}
                      </span>
                    </div>
                    {userTokens < 0.5 && onSwitchToClassicUpload && (
                      <button
                        type="button"
                        onClick={() => {
                          handleResetAndClose();
                          onSwitchToClassicUpload();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px] shrink-0 cursor-pointer"
                      >
                        Get Tokens
                      </button>
                    )}
                  </div>
                )}

                {/* Also share to Z-oneSocial Feed checkbox (Admin only or after approval) */}
                {isAdmin && (
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-800 cursor-pointer">
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {language === 'tl' ? 'I-share din sa Z-oneSocial Feed' : 'Also share to Z-oneSocial Feed'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {language === 'tl' ? 'Makikita rin ng iyong Friends at Followers sa Home Feed' : 'Visible in both Reels and Home Feed'}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={alsoShareToFeed}
                      onChange={(e) => setAlsoShareToFeed(e.target.checked)}
                      className="w-4 h-4 accent-rose-500 cursor-pointer"
                    />
                  </label>
                )}

                {/* Publish to Reels Submit Button */}
                <button
                  type="submit"
                  disabled={isPublishing || (!isAdmin && userTokens < 0.5)}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 disabled:opacity-60 text-white font-black text-sm uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{publishStageText || 'Publishing Reel...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{language === 'tl' ? 'I-Publish sa Z-oneReels' : 'Publish to Reels'}</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
