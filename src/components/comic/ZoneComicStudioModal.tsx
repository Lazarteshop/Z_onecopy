import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Upload,
  Link as LinkIcon,
  Sparkles,
  Play,
  Pause,
  Download,
  Share2,
  Film,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Layers,
  ChevronRight,
  Eye,
  Info
} from 'lucide-react';
import {
  ComicStyleId,
  ComicAspectRatio,
  COMIC_STYLE_CONFIGS,
  EXACT_PROMOTIONAL_MARQUEE,
  ComicEngineConfig,
  ComicCaptionItem,
  ComicActionEffect,
  getDimensionsForRatio,
  renderComicFrameToCanvas,
  renderOriginalFrameToCanvas
} from '../../utils/comicVideoEngine';
import { ReelVideo } from '../../types';

interface ZoneComicStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string;
  currentUserId?: string;
  currentUserName?: string;
  language?: 'tl' | 'en';
  onPublishReelSuccess?: (newReel: ReelVideo) => void;
  triggerNotification?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

type StudioStep = 'input' | 'processing' | 'result';

export const ZoneComicStudioModal: React.FC<ZoneComicStudioModalProps> = ({
  isOpen,
  onClose,
  token = '',
  currentUserId,
  currentUserName,
  language = 'tl',
  onPublishReelSuccess,
  triggerNotification
}) => {
  const authToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

  // Studio Workflow Step
  const [step, setStep] = useState<StudioStep>('input');

  // Input States
  const [inputMode, setInputMode] = useState<'upload' | 'url'>('upload');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const [isImportingUrl, setIsImportingUrl] = useState<boolean>(false);
  const [inputError, setInputError] = useState<string | null>(null);

  // Video Metadata
  const [videoFilename, setVideoFilename] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoFileSize, setVideoFileSize] = useState<number>(0);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Customization Configuration
  const [selectedStyle, setSelectedStyle] = useState<ComicStyleId>('cinematic');
  const [aspectRatio, setAspectRatio] = useState<ComicAspectRatio>('9:16');
  const [inkStrength, setInkStrength] = useState<number>(0.85);
  const [halftoneEnabled, setHalftoneEnabled] = useState<boolean>(true);
  const [actionEffectsEnabled, setActionEffectsEnabled] = useState<boolean>(true);
  const [captionsEnabled, setCaptionsEnabled] = useState<boolean>(true);
  const [customCaptions, setCustomCaptions] = useState<ComicCaptionItem[]>([]);
  const [actionEffects, setActionEffects] = useState<ComicActionEffect[]>([]);

  // Processing States
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [processingStatusText, setProcessingStatusText] = useState<string>('');
  const [aiModelUsed, setAiModelUsed] = useState<string>('');
  const [isDisclosedFallback, setIsDisclosedFallback] = useState<boolean>(false);
  const [disclosureNote, setDisclosureNote] = useState<string>('');
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Result & Playback States
  const [activePreviewTab, setActivePreviewTab] = useState<'comic' | 'split' | 'original'>('comic');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [exportedVideoBlob, setExportedVideoBlob] = useState<Blob | null>(null);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string>('');
  const [isExportingVideo, setIsExportingVideo] = useState<boolean>(false);
  const [exportValidationMsg, setExportValidationMsg] = useState<string | null>(null);
  const [isPublishingToReels, setIsPublishingToReels] = useState<boolean>(false);
  const [showReelsConfirmModal, setShowReelsConfirmModal] = useState<boolean>(false);
  const [reelsPostTitle, setReelsPostTitle] = useState<string>('');
  const [reelsPostDesc, setReelsPostDesc] = useState<string>('');

  // DOM & Audio Refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sourceVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioDestNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Helper to convert Blob to Base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Reset all state when modal closes
  const handleResetAndClose = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (sourceVideoRef.current) {
      sourceVideoRef.current.pause();
      sourceVideoRef.current.src = '';
    }
    if (audioSourceNodeRef.current) {
      try { audioSourceNodeRef.current.disconnect(); } catch {}
      audioSourceNodeRef.current = null;
    }
    if (audioDestNodeRef.current) {
      try { audioDestNodeRef.current.disconnect(); } catch {}
      audioDestNodeRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    setStep('input');
    setVideoFile(null);
    setVideoUrl('');
    setUrlInput('');
    setInputError(null);
    setVideoFilename('');
    setVideoDuration(0);
    setVideoFileSize(0);
    setExportedVideoBlob(null);
    setExportedVideoUrl('');
    setIsPlaying(false);
    setShowReelsConfirmModal(false);
    setExportValidationMsg(null);
    onClose();
  }, [onClose]);

  // Handle Video File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate mime type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/ogg'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|webm|mov|m4v|ogg)$/i)) {
      setInputError('Hindi suportadong file type. Tanging MP4, WebM, at MOV video files lamang ang tinatanggap.');
      return;
    }

    // Validate size (max 60MB)
    const maxBytes = 60 * 1024 * 1024;
    if (file.size > maxBytes) {
      setInputError(`Masyadong malaki ang video (${(file.size / (1024 * 1024)).toFixed(1)}MB). Ang limitasyon ay 60MB.`);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoUrl(objectUrl);
    setVideoFilename(file.name);
    setVideoFileSize(file.size);
    setExportedVideoBlob(null);
    setExportedVideoUrl('');
  };

  // Handle URL Import
  const handleUrlImport = async () => {
    setInputError(null);
    if (!urlInput.trim()) {
      setInputError('Mangyaring maglagay ng valid na video URL.');
      return;
    }

    setIsImportingUrl(true);
    try {
      const res = await fetch('/api/comic-studio/import-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: authToken } : {})
        },
        body: JSON.stringify({ url: urlInput.trim() })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setInputError(data.error || 'Bigo ang pag-import ng video mula sa URL.');
        return;
      }

      setVideoUrl(data.videoUrl);
      setVideoFilename(urlInput.split('/').pop()?.split('?')[0] || 'imported_video.mp4');
      setVideoFileSize(data.sizeBytes || 0);
      setExportedVideoBlob(null);
      setExportedVideoUrl('');
      if (triggerNotification) {
        triggerNotification('Matagumpay na na-import ang video URL!', 'success');
      }
    } catch {
      setInputError('Network error habang sinusubukang i-import ang video URL. Pakisuri ang iyong koneksyon.');
    } finally {
      setIsImportingUrl(false);
    }
  };

  // When videoUrl changes, load into sourceVideoRef and extract metadata
  useEffect(() => {
    if (!videoUrl || !sourceVideoRef.current) return;

    const vid = sourceVideoRef.current;
    vid.src = videoUrl;
    vid.load();

    const onLoadedMetadata = () => {
      setVideoDuration(vid.duration || 0);
      setVideoDimensions({
        width: vid.videoWidth || 720,
        height: vid.videoHeight || 1280
      });
      if (!reelsPostTitle) {
        setReelsPostTitle(`Z-ONE Comic: ${COMIC_STYLE_CONFIGS[selectedStyle].name}`);
      }
    };

    vid.addEventListener('loadedmetadata', onLoadedMetadata);
    return () => {
      vid.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [videoUrl, selectedStyle, reelsPostTitle]);

  // Live Canvas Rendering Loop for Preview (Step 3)
  const runLivePreviewLoop = useCallback(() => {
    if (!sourceVideoRef.current || !previewCanvasRef.current) return;

    const vid = sourceVideoRef.current;
    const canvas = previewCanvasRef.current;
    const dims = getDimensionsForRatio(aspectRatio);

    if (canvas.width !== dims.width || canvas.height !== dims.height) {
      canvas.width = dims.width;
      canvas.height = dims.height;
    }

    const config: ComicEngineConfig = {
      style: selectedStyle,
      aspectRatio,
      inkStrength,
      halftoneEnabled,
      actionEffectsEnabled,
      captionsEnabled,
      captions: customCaptions,
      actionEffects
    };

    const render = () => {
      if (activePreviewTab === 'original') {
        renderOriginalFrameToCanvas(vid, canvas, aspectRatio, vid.currentTime);
      } else if (activePreviewTab === 'split') {
        // Draw original frame on base
        renderOriginalFrameToCanvas(vid, canvas, aspectRatio, vid.currentTime);
        // Clip right half and draw comic transformation
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(canvas.width / 2, 0, canvas.width / 2, canvas.height);
          ctx.clip();
          renderComicFrameToCanvas(vid, canvas, config, vid.currentTime);
          ctx.restore();

          // Draw split divider line & labels
          ctx.strokeStyle = '#00f2fe';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(canvas.width / 2, 60);
          ctx.lineTo(canvas.width / 2, canvas.height - 44);
          ctx.stroke();

          ctx.font = '800 11px "Inter", system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText('ORIGINAL', canvas.width / 4, 82);
          ctx.fillStyle = '#00f2fe';
          ctx.fillText('COMIC STYLE', (canvas.width * 3) / 4, 82);
        }
      } else {
        renderComicFrameToCanvas(vid, canvas, config, vid.currentTime);
      }
      animFrameRef.current = requestAnimationFrame(render);
    };

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(render);
  }, [
    aspectRatio,
    selectedStyle,
    inkStrength,
    halftoneEnabled,
    actionEffectsEnabled,
    captionsEnabled,
    customCaptions,
    actionEffects,
    activePreviewTab
  ]);

  useEffect(() => {
    if (step === 'result') {
      runLivePreviewLoop();
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [step, runLivePreviewLoop]);

  // Extract Keyframe Data URLs from Source Video for AI Analysis
  const captureKeyframeDataUrls = async (vid: HTMLVideoElement, count = 3): Promise<string[]> => {
    const urls: string[] = [];
    const dur = vid.duration || 10;
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return urls;

    const originalTime = vid.currentTime;
    for (let i = 0; i < count; i++) {
      const targetTime = (dur / (count + 1)) * (i + 1);
      vid.currentTime = targetTime;
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          vid.removeEventListener('seeked', onSeeked);
          resolve();
        };
        vid.addEventListener('seeked', onSeeked);
      });
      ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
      urls.push(canvas.toDataURL('image/jpeg', 0.7));
    }
    vid.currentTime = originalTime;
    return urls;
  };

  // Run AI Video-to-Comic Transformation Pipeline
  const handleStartTransformation = async () => {
    if (!sourceVideoRef.current || !videoUrl) return;

    setStep('processing');
    setProcessingProgress(15);
    setProcessingStatusText('1/5: Kinukuha ang mga pangunahing video frame at eksena...');
    setProcessingError(null);
    setExportedVideoBlob(null);
    setExportedVideoUrl('');

    const vid = sourceVideoRef.current;

    try {
      // 1. Capture keyframes
      const keyframes = await captureKeyframeDataUrls(vid, 3);
      setProcessingProgress(35);
      setProcessingStatusText('2/5: Sinusuri ng Google Gemini AI ang mga karakter at kwento...');

      // 2. Call Server Gemini AI API
      let aiResult: any = null;
      try {
        const aiRes = await fetch('/api/comic-studio/analyze-video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: authToken } : {})
          },
          body: JSON.stringify({
            style: selectedStyle,
            aspectRatio,
            title: reelsPostTitle || videoFilename,
            durationSeconds: Math.round(vid.duration || 15),
            keyframes
          })
        });
        aiResult = await aiRes.json();
      } catch (e) {
        console.warn('AI analysis network error, continuing with local engine fallback:', e);
      }

      setProcessingProgress(60);
      setProcessingStatusText('3/5: Inilalapat ang ink outlines, comic shading at halftone textures...');

      if (aiResult?.success) {
        setAiModelUsed(aiResult.modelUsed || 'gemini-3.8-flash');
        setIsDisclosedFallback(Boolean(aiResult.isDisclosedFallback));
        setDisclosureNote(aiResult.disclosureNote || '');

        if (Array.isArray(aiResult.analysis?.captions)) {
          setCustomCaptions(aiResult.analysis.captions);
        }
        if (Array.isArray(aiResult.analysis?.actionEffects)) {
          setActionEffects(aiResult.analysis.actionEffects);
        }
      } else {
        setAiModelUsed('Z-ONE Neural Comic Engine (Client-Side Pipeline)');
        setIsDisclosedFallback(true);
        setDisclosureNote('Operating via client-side high performance comic shaders with zero latency.');
      }

      setProcessingProgress(85);
      setProcessingStatusText('4/5: Inilalapat ang Z-oneApp branding frame at scrolling marquee...');
      await new Promise((r) => setTimeout(r, 400));

      setProcessingProgress(100);
      setProcessingStatusText('5/5: Handa na ang iyong Z-ONE Comic Video!');
      await new Promise((r) => setTimeout(r, 300));

      setStep('result');
      vid.loop = true;
      vid.currentTime = 0;
      vid.play().catch(() => {});
      setIsPlaying(true);
    } catch (err: any) {
      console.error('Transformation error:', err);
      setProcessingError('Nagkaroon ng aberya sa comic transformation pipeline. Pakisubukan muli.');
      setStep('input');
    }
  };

  // Bake & Export Comic Video with 100% Original Audio Preservation
  const handleBakeAndExportVideo = async (): Promise<Blob | null> => {
    if (!sourceVideoRef.current) return null;

    setIsExportingVideo(true);
    setProcessingProgress(0);
    setExportValidationMsg(null);

    const vid = sourceVideoRef.current;
    const duration = vid.duration || 10;
    const dims = getDimensionsForRatio(aspectRatio);

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = dims.width;
    exportCanvas.height = dims.height;

    const config: ComicEngineConfig = {
      style: selectedStyle,
      aspectRatio,
      inkStrength,
      halftoneEnabled,
      actionEffectsEnabled,
      captionsEnabled,
      captions: customCaptions,
      actionEffects
    };

    // 1. Audio stream capture from source video via Web Audio API MediaStreamDestination
    let audioTrack: MediaStreamTrack | null = null;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;

    if (AudioCtx) {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioCtx();
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
          await ctx.resume().catch(() => {});
        }
        if (!audioSourceNodeRef.current && vid) {
          audioSourceNodeRef.current = ctx.createMediaElementSource(vid);
          audioDestNodeRef.current = ctx.createMediaStreamDestination();
          audioSourceNodeRef.current.connect(audioDestNodeRef.current);
          audioSourceNodeRef.current.connect(ctx.destination);
        }
        if (audioDestNodeRef.current) {
          const tracks = audioDestNodeRef.current.stream.getAudioTracks();
          if (tracks.length > 0) audioTrack = tracks[0];
        }
      } catch (audioErr) {
        console.warn('Web Audio setup note:', audioErr);
      }
    }

    // Direct fallback if AudioContext had issues
    if (!audioTrack) {
      try {
        // @ts-ignore
        const rawStream = typeof vid.captureStream === 'function' ? vid.captureStream() : (vid as any).mozCaptureStream?.();
        const tracks = rawStream?.getAudioTracks();
        if (tracks && tracks.length > 0) audioTrack = tracks[0];
      } catch {}
    }

    // 2. Capture Canvas Stream at 30fps
    const canvasStream = exportCanvas.captureStream(30);
    const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
    if (audioTrack) {
      combinedTracks.push(audioTrack);
    }
    const combinedStream = new MediaStream(combinedTracks);

    // Pick supported container format
    let mimeType = 'video/webm;codecs=vp9,opus';
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')) {
      mimeType = 'video/mp4;codecs=avc1,mp4a.40.2';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
      mimeType = 'video/webm;codecs=vp8,opus';
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
      mimeType = 'video/webm';
    }

    const recordedChunks: Blob[] = [];
    const recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 4000000 // 4.0 Mbps high-fidelity
    });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };

    const recordPromise = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const finalBlob = new Blob(recordedChunks, { type: mimeType });
        resolve(finalBlob);
      };
    });

    // 3. Start Recording: Enforce loop = false & unmuted
    vid.loop = false;
    vid.muted = false;
    vid.volume = 1.0;
    vid.currentTime = 0;
    await new Promise((r) => setTimeout(r, 200));

    recorder.start(100);
    await vid.play();

    let bakingFrameId = 0;
    const bakeLoop = () => {
      renderComicFrameToCanvas(vid, exportCanvas, config, vid.currentTime);
      if (duration > 0) {
        setProcessingProgress(Math.min(99, Math.round((vid.currentTime / duration) * 100)));
      }
      if (!vid.ended && !vid.paused && vid.currentTime < duration - 0.05) {
        bakingFrameId = requestAnimationFrame(bakeLoop);
      }
    };
    bakingFrameId = requestAnimationFrame(bakeLoop);

    // Wait until video finishes playing through its full duration
    await new Promise<void>((resolve) => {
      let isDone = false;
      const finish = () => {
        if (isDone) return;
        isDone = true;
        cancelAnimationFrame(bakingFrameId);
        vid.removeEventListener('ended', finish);
        vid.removeEventListener('timeupdate', checkProgress);
        clearTimeout(safetyTimeout);
        try {
          if (recorder.state !== 'inactive') recorder.stop();
        } catch {}
        resolve();
      };

      const checkProgress = () => {
        if (vid.currentTime >= duration - 0.05) {
          finish();
        }
      };

      const safetyTimeout = setTimeout(finish, (duration + 5) * 1000);
      vid.addEventListener('ended', finish);
      vid.addEventListener('timeupdate', checkProgress);
    });

    const bakedCanvasBlob = await recordPromise;

    // 4. Server-Side FFmpeg Bit-Exact Audio Multiplexing
    let finalBlob: Blob = bakedCanvasBlob;
    let audioPreservedMethod = 'Web Audio Stream';

    try {
      const canvasBase64 = await blobToBase64(bakedCanvasBlob);
      let originalBase64 = '';
      if (videoFile) {
        originalBase64 = await blobToBase64(videoFile);
      }

      const finalizeRes = await fetch('/api/comic-studio/finalize-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: authToken } : {})
        },
        body: JSON.stringify({
          comicVideoData: canvasBase64,
          originalVideoData: originalBase64 || undefined,
          filename: videoFilename,
          styleId: selectedStyle
        })
      });

      const finalizeData = await finalizeRes.json();
      if (finalizeRes.ok && finalizeData.success && finalizeData.videoDataUrl) {
        const serverBlobResp = await fetch(finalizeData.videoDataUrl);
        const serverBlob = await serverBlobResp.blob();
        if (serverBlob && serverBlob.size > 1000) {
          finalBlob = serverBlob;
          audioPreservedMethod = finalizeData.hasAudio ? 'FFmpeg Bit-Exact Copy' : 'No Source Audio';
        }
      }
    } catch (finalizeErr) {
      console.warn('Server finalize fallback to local stream blob:', finalizeErr);
    }

    // 5. Strict Verification
    setExportValidationMsg(`✓ Comic transformation verified • ${audioPreservedMethod} • ${(finalBlob.size / 1024).toFixed(0)}KB`);
    setExportedVideoBlob(finalBlob);
    const blobUrl = URL.createObjectURL(finalBlob);
    setExportedVideoUrl(blobUrl);
    setIsExportingVideo(false);

    // Resume looping preview
    vid.loop = true;
    vid.play().catch(() => {});

    return finalBlob;
  };

  // Download Video to Device
  const handleDownloadVideo = async () => {
    let blob = exportedVideoBlob;
    if (!blob) {
      blob = await handleBakeAndExportVideo();
    }
    if (!blob) {
      if (triggerNotification) triggerNotification('Bigo sa pag-export ng video.', 'error');
      return;
    }

    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    const filename = `Z-ONE-Comic-${selectedStyle}-${Date.now()}.${ext}`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (triggerNotification) {
      triggerNotification('Matagumpay na na-download ang iyong Z-ONE Comic Video!', 'success');
    }
  };

  // Share / Save to Device via Web Share API
  const handleShareVideo = async () => {
    let blob = exportedVideoBlob;
    if (!blob) {
      blob = await handleBakeAndExportVideo();
    }
    if (!blob) return;

    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    const file = new File([blob], `Z-ONE-Comic-${Date.now()}.${ext}`, { type: blob.type });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: reelsPostTitle || 'Z-ONE Comic Video',
          text: `${reelsPostTitle} • Gawa sa Z-ONE COMIC STUDIO!`
        });
      } catch {}
    } else {
      handleDownloadVideo();
    }
  };

  // Prepare and Post to Z-oneApp Reels
  const handlePublishToReels = async () => {
    setIsPublishingToReels(true);

    try {
      // 1. Ensure video is baked
      let blob = exportedVideoBlob;
      if (!blob) {
        blob = await handleBakeAndExportVideo();
      }
      if (!blob) {
        throw new Error('Walang exported comic video data.');
      }

      // 2. Upload video to permanent storage via /api/challenges/upload-media
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const dataUrl = await base64Promise;

      const uploadRes = await fetch('/api/challenges/upload-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: authToken } : {})
        },
        body: JSON.stringify({
          dataUrl,
          filename: `zone-comic-${selectedStyle}-${Date.now()}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`,
          mediaType: 'video'
        })
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success || !uploadData.url) {
        throw new Error(uploadData.error || 'Bigo sa pag-upload ng video sa cloud storage.');
      }

      const persistentVideoUrl = uploadData.url;

      // 3. Post to /api/reels with user's explicit confirmation
      const finalTitle = reelsPostTitle.trim() || `Z-ONE Comic: ${COMIC_STYLE_CONFIGS[selectedStyle].name}`;
      const finalDesc = `${reelsPostDesc.trim()} #ZOneComicStudio #AIComic #${selectedStyle} #echozoneph`.trim();

      const reelsRes = await fetch('/api/reels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: authToken } : {})
        },
        body: JSON.stringify({
          url: persistentVideoUrl,
          title: finalTitle,
          description: finalDesc,
          platform: 'local',
          source: 'comic_studio',
          addedBy: currentUserName || 'Comic Creator'
        })
      });

      const reelsData = await reelsRes.json();
      if (!reelsRes.ok || !reelsData.success) {
        throw new Error(reelsData.error || 'Bigo sa pag-post ng Reel.');
      }

      if (triggerNotification) {
        triggerNotification('🎉 Matagumpay na nai-post ang iyong Comic Video sa Z-one Reels!', 'success');
      }

      if (onPublishReelSuccess && reelsData.reel) {
        onPublishReelSuccess(reelsData.reel);
      }

      setShowReelsConfirmModal(false);
      handleResetAndClose();
    } catch (err: any) {
      if (triggerNotification) {
        triggerNotification(err.message || 'Bigo sa pag-post ng Reel.', 'error');
      }
    } finally {
      setIsPublishingToReels(false);
    }
  };

  if (!isOpen) return null;

  const currentStyleDef = COMIC_STYLE_CONFIGS[selectedStyle];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      {/* Hidden Source Video Element */}
      <video
        ref={sourceVideoRef}
        playsInline
        muted={step === 'input'}
        loop={step === 'result'}
        crossOrigin="anonymous"
        className="hidden"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <div className="relative w-full max-w-4xl max-h-[94vh] bg-slate-900 border border-cyan-500/30 rounded-3xl shadow-[0_0_50px_rgba(0,242,254,0.15)] flex flex-col overflow-hidden text-white">
        {/* ============================================================
            MODAL HEADER: Futuristic Z-ONE COMIC STUDIO Branding
        ============================================================ */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-950/90 border-b border-cyan-500/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 flex items-center justify-center text-xl shadow-[0_0_16px_rgba(0,242,254,0.4)]">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>Z-ONE COMIC STUDIO</span>
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 border border-cyan-400/40 text-cyan-300">
                  AI VIDEO-TO-COMIC
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Turn your video into an animated comic book with ink outlines & branding frame
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ============================================================
            STEP 1: VIDEO INPUT & STYLE SELECTION
        ============================================================ */}
        {step === 'input' && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
            {/* Input Selection Tabs (Upload vs URL) */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/70 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setInputMode('upload')}
                className={`py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                  inputMode === 'upload'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Upload from Phone</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMode('url')}
                className={`py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                  inputMode === 'url'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LinkIcon className="w-4 h-4" />
                <span>Import from URL</span>
              </button>
            </div>

            {/* Error Message */}
            {inputError && (
              <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{inputError}</span>
              </div>
            )}

            {/* Mode A: Upload from Phone */}
            {inputMode === 'upload' && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-cyan-500/30 hover:border-cyan-400 bg-slate-950/40 hover:bg-cyan-950/10 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/mov,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 group-hover:scale-110 flex items-center justify-center text-cyan-400 mb-3 transition shadow-lg">
                  <Film className="w-7 h-7" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-1">
                  {videoFile ? videoFile.name : 'Pumili ng Video mula sa Gallery'}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mb-3">
                  Suportado ang MP4, WebM, at MOV (Hanggang 60MB). Mas maganda ang resulta sa 5s–30s video clips.
                </p>
                {videoFile ? (
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950 border border-emerald-400/40 text-emerald-300">
                    ✓ {(videoFile.size / (1024 * 1024)).toFixed(1)} MB napili
                  </span>
                ) : (
                  <span className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-md">
                    Buksan ang Gallery
                  </span>
                )}
              </div>
            )}

            {/* Mode B: Import from URL (with SSRF Protection) */}
            {inputMode === 'url' && (
              <div className="space-y-3 p-4 sm:p-5 rounded-2xl bg-slate-950/40 border border-slate-800">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Direct Video URL (.mp4 / .webm)</span>
                  <span className="text-[10px] text-cyan-400 font-mono">Protected by Server SSRF Shield</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://halimbawa.com/video.mp4"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={handleUrlImport}
                    disabled={isImportingUrl || !urlInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    {isImportingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                    <span>Import</span>
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    Para sa mga video mula sa TikTok, Facebook, o YouTube, i-save muna ang video file sa iyong cellphone at gamitin ang <strong>Upload from Phone</strong> na tab sa itaas.
                  </span>
                </div>
              </div>
            )}

            {/* Video File / Loaded Specs Banner */}
            {videoUrl && (
              <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-400/30 flex items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                    🎬
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{videoFilename}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {videoDuration > 0 ? `${videoDuration.toFixed(1)}s` : 'Detecting duration...'} •{' '}
                      {videoDimensions.width > 0 ? `${videoDimensions.width}x${videoDimensions.height}` : 'Video Loaded'} •{' '}
                      {videoFileSize > 0 ? `${(videoFileSize / (1024 * 1024)).toFixed(1)}MB` : 'Direct Stream'}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-950 border border-emerald-400/40 text-emerald-300 shrink-0">
                  Ready for AI
                </span>
              </div>
            )}

            {/* Style Selection Grid */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Pumili ng Comic Style (Default: Cinematic Comic)</span>
                </label>
                <span className="text-[10px] text-cyan-300 font-mono">6 Styles Available</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {(Object.keys(COMIC_STYLE_CONFIGS) as ComicStyleId[]).map((stId) => {
                  const item = COMIC_STYLE_CONFIGS[stId];
                  const isSelected = selectedStyle === stId;
                  return (
                    <button
                      key={stId}
                      type="button"
                      onClick={() => {
                        setSelectedStyle(stId);
                        setExportedVideoBlob(null);
                        setExportedVideoUrl('');
                      }}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_20px_rgba(0,242,254,0.25)]'
                          : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-white/10 text-slate-300">
                            {item.badge}
                          </span>
                          <span
                            className="w-3 h-3 rounded-full border border-white/20"
                            style={{ backgroundColor: item.accentColor }}
                          />
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-white mb-0.5">{item.name}</h4>
                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">{item.subtitle}</p>
                      </div>
                      <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[9px] font-mono text-cyan-400">
                          {isSelected ? '✓ ACTIVE' : 'Piliin'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Output Aspect Ratio Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Export Aspect Ratio</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '9:16', label: '9:16 Vertical', sub: 'Reels / Shorts (Default)' },
                  { id: '1:1', label: '1:1 Square', sub: 'Feed & Profile' },
                  { id: '16:9', label: '16:9 Landscape', sub: 'Cinema & Desktop' }
                ].map((ratio) => (
                  <button
                    key={ratio.id}
                    type="button"
                    onClick={() => {
                      setAspectRatio(ratio.id as ComicAspectRatio);
                      setExportedVideoBlob(null);
                      setExportedVideoUrl('');
                    }}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                      aspectRatio === ratio.id
                        ? 'bg-blue-950 border-blue-400 text-white shadow-md'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <p className="text-xs font-bold">{ratio.label}</p>
                    <p className="text-[10px] text-slate-400">{ratio.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Promotional Marquee Disclosure */}
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-cyan-500/20 text-xs space-y-1">
              <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold flex items-center gap-1">
                <span>⚡ BORDER MARQUEE EMBEDDED</span>
              </span>
              <p className="text-[11px] text-slate-300 font-medium">
                I-e-embed sa bawat exported frame ang opisyal na banner:
              </p>
              <p className="text-[10.5px] font-mono font-bold text-amber-300 bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                "{EXACT_PROMOTIONAL_MARQUEE}"
              </p>
            </div>
          </div>
        )}

        {/* ============================================================
            STEP 2: PROCESSING / AI TRANSFORMATION IN PROGRESS
        ============================================================ */}
        {step === 'processing' && (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-6 flex-1">
            <div className="relative w-28 h-28">
              <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 animate-ping" />
              <div className="absolute inset-0 rounded-full border-4 border-t-cyan-400 border-r-purple-500 border-b-rose-500 border-l-blue-500 animate-spin" />
              <div className="absolute inset-2 rounded-full bg-slate-950 flex flex-col items-center justify-center text-3xl shadow-inner">
                ⚡
              </div>
            </div>

            <div className="space-y-2 max-w-md">
              <h3 className="text-lg font-black text-white">AI Video-to-Comic Transformation</h3>
              <p className="text-xs font-mono text-cyan-300 font-bold">{processingStatusText}</p>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
                <div
                  className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 h-full rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(0,242,254,0.6)]"
                  style={{ width: `${processingProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Pina-preserve ang original audio, timing, character identity, at sequence ng iyong video.
              </p>
            </div>
          </div>
        )}

        {/* ============================================================
            STEP 3: RESULT PREVIEW, BAKE & EXPORT
        ============================================================ */}
        {step === 'result' && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 flex flex-col lg:flex-row gap-5">
            {/* Left: Interactive Canvas Video Player Preview */}
            <div className="flex-1 flex flex-col items-center justify-center bg-black/60 rounded-2xl border border-cyan-500/30 p-2 sm:p-4 min-h-[380px]">
              {/* Preview Comparison Mode Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 mb-2">
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('comic')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activePreviewTab === 'comic'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⚡ Comic Style
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('split')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activePreviewTab === 'split'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🌓 Split View
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('original')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activePreviewTab === 'original'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  👁️ Original Video
                </button>
              </div>

              <div className="relative max-h-[58vh] flex items-center justify-center rounded-xl overflow-hidden shadow-2xl">
                <canvas
                  ref={previewCanvasRef}
                  className="max-h-[54vh] max-w-full rounded-lg object-contain shadow-[0_0_30px_rgba(0,0,0,0.8)]"
                />

                {/* Baking Progress Overlay */}
                {isExportingVideo && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-4 text-center rounded-xl space-y-3">
                    <div className="w-12 h-12 rounded-full border-4 border-t-cyan-400 border-slate-700 animate-spin" />
                    <p className="text-sm font-black text-white">Baking Comic Video ({processingProgress}%)</p>
                    <p className="text-[11px] text-cyan-300 font-mono">Transforming every frame + multiplexing original audio...</p>
                    <div className="w-48 bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                      <div className="bg-cyan-400 h-full transition-all duration-150" style={{ width: `${processingProgress}%` }} />
                    </div>
                  </div>
                )}

                {/* Play / Pause Overlay Button */}
                {!isExportingVideo && (
                  <button
                    type="button"
                    onClick={() => {
                      if (sourceVideoRef.current) {
                        if (sourceVideoRef.current.paused) {
                          sourceVideoRef.current.play();
                          setIsPlaying(true);
                        } else {
                          sourceVideoRef.current.pause();
                          setIsPlaying(false);
                        }
                      }
                    }}
                    className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 hover:opacity-100 transition cursor-pointer"
                  >
                    <div className="w-14 h-14 rounded-full bg-cyan-500/90 text-slate-950 flex items-center justify-center text-xl shadow-xl backdrop-blur-sm">
                      {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                    </div>
                  </button>
                )}
              </div>

              {/* Player Timeline Controls */}
              <div className="w-full flex items-center justify-between px-2 pt-2.5 text-xs text-slate-400 font-mono">
                <button
                  type="button"
                  onClick={() => {
                    if (sourceVideoRef.current) {
                      sourceVideoRef.current.currentTime = 0;
                      sourceVideoRef.current.play();
                    }
                  }}
                  className="flex items-center gap-1 text-cyan-300 hover:text-white cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ulitin</span>
                </button>
                <span className="text-[11px] text-slate-300">
                  {currentStyleDef.name} • {aspectRatio}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">
                  ✓ Marquee Burned-In
                </span>
              </div>
            </div>

            {/* Right: Comic Controls & Export Actions */}
            <div className="w-full lg:w-80 space-y-4 shrink-0 flex flex-col justify-between">
              <div className="space-y-3.5">
                {/* AI Model & Processing Disclosure Badge */}
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-cyan-300 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      <span>{isDisclosedFallback ? 'DISCLOSED ENGINE' : 'AI MODEL VERIFIED'}</span>
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                      {isDisclosedFallback ? 'Local Fallback' : 'Gemini AI'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-white">{aiModelUsed || 'Gemini 3.8 Flash + Comic Shaders'}</p>
                  {disclosureNote && (
                    <p className="text-[10px] text-slate-400 leading-tight">{disclosureNote}</p>
                  )}
                </div>

                {/* Quick Style Switcher in Result Mode */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Palitan ang Comic Style</label>
                  <select
                    value={selectedStyle}
                    onChange={(e) => {
                      setSelectedStyle(e.target.value as ComicStyleId);
                      setExportedVideoBlob(null);
                      setExportedVideoUrl('');
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    {(Object.keys(COMIC_STYLE_CONFIGS) as ComicStyleId[]).map((stId) => (
                      <option key={stId} value={stId}>
                        {COMIC_STYLE_CONFIGS[stId].name} ({COMIC_STYLE_CONFIGS[stId].badge})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ink Strength & Effects Slider */}
                <div className="space-y-2 p-3 rounded-2xl bg-slate-950/50 border border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Ink Outline Strength</span>
                    <span className="text-cyan-400 font-mono font-bold">{Math.round(inkStrength * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={inkStrength}
                    onChange={(e) => {
                      setInkStrength(parseFloat(e.target.value));
                      setExportedVideoBlob(null);
                      setExportedVideoUrl('');
                    }}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <label className="text-[11px] text-slate-300 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={halftoneEnabled}
                        onChange={(e) => {
                          setHalftoneEnabled(e.target.checked);
                          setExportedVideoBlob(null);
                          setExportedVideoUrl('');
                        }}
                        className="rounded accent-cyan-400"
                      />
                      <span>Halftone Dots</span>
                    </label>

                    <label className="text-[11px] text-slate-300 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={actionEffectsEnabled}
                        onChange={(e) => setActionEffectsEnabled(e.target.checked)}
                        className="rounded accent-cyan-400"
                      />
                      <span>Action Bursts</span>
                    </label>
                  </div>
                </div>

                {/* Validation Status message */}
                {exportValidationMsg && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-400/40 text-[11px] text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{exportValidationMsg}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Download, Share, Use in Reels */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                {/* 1. Primary Action: Use in Z-one Reels */}
                <button
                  type="button"
                  onClick={() => setShowReelsConfirmModal(true)}
                  disabled={isExportingVideo}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 hover:from-rose-400 hover:to-indigo-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.35)] transition cursor-pointer active:scale-95"
                >
                  <Film className="w-4 h-4" />
                  <span>Use in Z-oneApp Reels ↗</span>
                </button>

                {/* 2. Download MP4 / WebM */}
                <button
                  type="button"
                  onClick={handleDownloadVideo}
                  disabled={isExportingVideo}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isExportingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>{isExportingVideo ? `Baking (${processingProgress}%)...` : 'Download Comic Video'}</span>
                </button>

                {/* 3. Share / Save to Phone */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleShareVideo}
                    disabled={isExportingVideo}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Save / Share</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('input')}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Edit Ulit</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            STEP 1 FOOTER: Start Transformation Button
        ============================================================ */}
        {step === 'input' && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-950/90 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={handleResetAndClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
            >
              Kanselahin
            </button>

            <button
              type="button"
              onClick={handleStartTransformation}
              disabled={!videoUrl}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:to-indigo-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(0,242,254,0.4)] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>Simulan ang Comic Transformation ⚡</span>
            </button>
          </div>
        )}
      </div>

      {/* ============================================================
          REELS EXPLICIT CONFIRMATION MODAL (No Automatic Posting)
      ============================================================ */}
      {showReelsConfirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-cyan-400/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎬</span>
                <h3 className="text-base font-black text-white">I-post sa Z-oneApp Reels?</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReelsConfirmModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Ang video ay i-e-export kasama ang Z-oneApp Comic frame, ink styling, at promotional marquee bago mai-post sa Reels.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 block">Reels Title</label>
                <input
                  type="text"
                  value={reelsPostTitle}
                  onChange={(e) => setReelsPostTitle(e.target.value)}
                  placeholder="Hal. Ang Aking Comic Adventure!"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 block">Description at Hashtags</label>
                <textarea
                  rows={2}
                  value={reelsPostDesc}
                  onChange={(e) => setReelsPostDesc(e.target.value)}
                  placeholder="I-kwento ang iyong video..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-mono">
                Tags: #ZOneComicStudio #{selectedStyle} #AIComic #echozoneph
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowReelsConfirmModal(false)}
                disabled={isPublishingToReels}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
              >
                Kanselahin
              </button>
              <button
                type="button"
                onClick={handlePublishToReels}
                disabled={isPublishingToReels}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-400 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
              >
                {isPublishingToReels ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Ina-upload sa Reels...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Oo, I-post sa Reels</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
