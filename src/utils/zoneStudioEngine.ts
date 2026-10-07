import { ReelMusicTrack, ReelTextOverlay } from '../types';

export interface StudioFilterOption {
  id: string;
  name: string;
  css: string;
  badge: string;
}

export interface StudioEffectOption {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const STUDIO_FILTERS: StudioFilterOption[] = [
  { id: 'normal', name: 'Normal', css: 'none', badge: '✨' },
  { id: 'vibrant', name: 'Vibrant', css: 'saturate(1.45) contrast(1.12) brightness(1.04)', badge: '🌈' },
  { id: 'golden', name: 'Golden Hour', css: 'sepia(0.28) saturate(1.4) brightness(1.06) contrast(1.05)', badge: '🌅' },
  { id: 'cinema', name: 'Cinema', css: 'contrast(1.22) saturate(1.1) hue-rotate(-8deg) brightness(0.97)', badge: '🎬' },
  { id: 'vintage', name: 'Vintage 90s', css: 'sepia(0.45) contrast(0.95) brightness(1.05) saturate(0.85)', badge: '🎞️' },
  { id: 'noir', name: 'Noir B&W', css: 'grayscale(1) contrast(1.3) brightness(1.02)', badge: '🖤' },
  { id: 'cyber', name: 'Cyber Neon', css: 'saturate(1.75) contrast(1.18) hue-rotate(14deg)', badge: '💜' },
  { id: 'beauty', name: 'Soft Glow', css: 'brightness(1.09) contrast(0.96) saturate(1.15)', badge: '🌸' }
];

export const STUDIO_EFFECTS: StudioEffectOption[] = [
  { id: 'none', name: 'None', icon: '🚫', description: 'Clean natural video' },
  { id: 'sparkles', name: 'Sparkles', icon: '✨', description: 'Glittering starlight particles' },
  { id: 'bokeh', name: 'Bokeh Glow', icon: '🌟', description: 'Dreamy floating light orbs' },
  { id: 'hearts', name: 'Heart Rain', icon: '💖', description: 'Floating neon hearts' },
  { id: 'vhs', name: 'VHS Retro', icon: '📼', description: '90s camcorder scanlines & frame' },
  { id: 'gold_dust', name: 'Gold Dust', icon: '🪙', description: 'Luxury golden shimmer' },
  { id: 'neon_frame', name: 'Neon Pulse', icon: '🔮', description: 'Vibrant glowing studio border' }
];

export const STUDIO_MUSIC_LIBRARY: ReelMusicTrack[] = [
  {
    id: 'manila_sunset',
    title: 'Manila Sunset Vibe',
    artist: 'Z-one Beats PH',
    genre: 'Tropical Chill',
    bpm: 112,
    synthPreset: 'sunset',
    volume: 0.8
  },
  {
    id: 'pinoy_hustle',
    title: 'Pinoy Street Hustle',
    artist: 'MNL Trap Collective',
    genre: 'Hip-Hop / Trap',
    bpm: 130,
    synthPreset: 'hustle',
    volume: 0.85
  },
  {
    id: 'harana_acoustic',
    title: 'Harana Acoustic Chill',
    artist: 'Indie OPM Sessions',
    genre: 'Acoustic Pop',
    bpm: 96,
    synthPreset: 'harana',
    volume: 0.75
  },
  {
    id: 'viral_dance_pop',
    title: 'Viral Dance Challenge',
    artist: 'HyperPop Studio',
    genre: 'Dance Pop',
    bpm: 124,
    synthPreset: 'dance',
    volume: 0.85
  },
  {
    id: 'lofi_study',
    title: 'Late Night Katipunan Lo-Fi',
    artist: 'ChillHop PH',
    genre: 'Lo-Fi Beats',
    bpm: 84,
    synthPreset: 'lofi',
    volume: 0.75
  },
  {
    id: 'cinema_epic',
    title: 'Tagumpay Motivation',
    artist: 'Z-one Cinema Score',
    genre: 'Inspiring',
    bpm: 108,
    synthPreset: 'epic',
    volume: 0.8
  },
  {
    id: 'island_bounce',
    title: 'Siargao Island Bounce',
    artist: 'Tropiko Sound',
    genre: 'Island Reggae',
    bpm: 105,
    synthPreset: 'island',
    volume: 0.8
  },
  {
    id: 'cyber_synth',
    title: 'BGC Midnight Drive',
    artist: 'Neon Synthwave',
    genre: 'Synthwave',
    bpm: 118,
    synthPreset: 'synthwave',
    volume: 0.8
  }
];

export const TEXT_FONT_STYLES: Array<{
  id: NonNullable<ReelTextOverlay['fontStyle']>;
  label: string;
  className: string;
  canvasFont: string;
}> = [
  { id: 'modern', label: 'Modern Bold', className: 'font-sans font-black tracking-tight', canvasFont: '900 28px Inter, system-ui, sans-serif' },
  { id: 'neon', label: 'Neon Glow', className: 'font-sans font-extrabold tracking-wide drop-shadow-[0_0_10px_rgba(236,72,153,0.9)]', canvasFont: '800 28px Inter, system-ui, sans-serif' },
  { id: 'serif', label: 'Editorial', className: 'font-serif font-bold italic', canvasFont: 'italic 700 28px Georgia, serif' },
  { id: 'mono', label: 'Typewriter', className: 'font-mono font-bold tracking-tight', canvasFont: '700 24px monospace' },
  { id: 'impact', label: 'Meme Impact', className: 'font-sans font-black uppercase tracking-wider [text-shadow:0_2px_0_#000,0_-2px_0_#000,2px_0_0_#000,-2px_0_0_#000]', canvasFont: '900 30px Impact, Arial Black, sans-serif' }
];

export const TEXT_COLOR_PRESETS = [
  { color: '#ffffff', bg: 'rgba(0,0,0,0.65)', label: 'White / Dark Pill' },
  { color: '#fde047', bg: 'rgba(0,0,0,0.75)', label: 'Gold / Black' },
  { color: '#ffffff', bg: 'rgba(225,29,72,0.88)', label: 'Rose Badge' },
  { color: '#ffffff', bg: 'rgba(37,99,235,0.88)', label: 'Blue Badge' },
  { color: '#38bdf8', bg: 'rgba(15,23,42,0.85)', label: 'Cyan Neon' },
  { color: '#4ade80', bg: 'rgba(15,23,42,0.85)', label: 'Emerald Pop' },
  { color: '#f472b6', bg: 'transparent', label: 'Pink Clean' },
  { color: '#ffffff', bg: 'transparent', label: 'Pure White' }
];

/**
 * Procedural Web Audio Synthesizer & Custom Audio Loop Player for Z-one Create Studio
 * Plays real rhythmic melodies & chords in browser without external copyright or CORS failures.
 */
export class StudioAudioController {
  private ctx: AudioContext | null = null;
  private timerId: number | null = null;
  private htmlAudio: HTMLAudioElement | null = null;
  private isPlaying = false;
  private step = 0;
  private currentTrack: ReelMusicTrack | null = null;
  private volume = 0.8;

  public startTrack(track: ReelMusicTrack, customVolume?: number) {
    this.stop();
    this.currentTrack = track;
    this.volume = typeof customVolume === 'number' ? customVolume : (track.volume ?? 0.8);
    this.isPlaying = true;
    this.step = 0;

    if (track.audioUrl) {
      try {
        this.htmlAudio = new Audio(track.audioUrl);
        this.htmlAudio.loop = true;
        this.htmlAudio.volume = Math.max(0, Math.min(1, this.volume));
        this.htmlAudio.play().catch(() => {});
        return;
      } catch {
        // Fallback to synth if audioUrl fails
      }
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      const bpm = track.bpm || 110;
      const stepDurationMs = (60 / bpm / 2) * 1000; // 8th notes

      this.playSynthStep();
      this.timerId = window.setInterval(() => {
        if (!this.isPlaying) return;
        this.playSynthStep();
      }, stepDurationMs);
    } catch {
      // Ignore audio context restriction errors
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.htmlAudio) {
      this.htmlAudio.volume = this.volume;
    }
  }

  private playSynthStep() {
    if (!this.ctx || !this.currentTrack || this.volume <= 0.01) return;
    const now = this.ctx.currentTime;
    const preset = this.currentTrack.synthPreset || 'sunset';

    // Musical scales (frequencies in Hz)
    const scales: Record<string, number[]> = {
      sunset: [261.63, 329.63, 392.00, 493.88, 523.25, 392.00, 329.63, 293.66],
      hustle: [146.83, 146.83, 174.61, 196.00, 220.00, 196.00, 174.61, 130.81],
      harana: [293.66, 369.99, 440.00, 587.33, 493.88, 440.00, 369.99, 329.63],
      dance: [329.63, 392.00, 440.00, 523.25, 587.33, 523.25, 440.00, 392.00],
      lofi: [220.00, 261.63, 329.63, 392.00, 349.23, 293.66, 261.63, 246.94],
      epic: [196.00, 246.94, 293.66, 392.00, 440.00, 392.00, 293.66, 246.94],
      island: [261.63, 329.63, 392.00, 329.63, 293.66, 349.23, 440.00, 349.23],
      synthwave: [220.00, 220.00, 329.63, 293.66, 261.63, 246.94, 220.00, 196.00]
    };

    const notes = scales[preset] || scales.sunset;
    const noteFreq = notes[this.step % notes.length];

    // 1. Melodic pluck / lead note
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = preset === 'hustle' || preset === 'synthwave' ? 'sawtooth' : preset === 'lofi' || preset === 'harana' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(noteFreq, now);

    const noteGain = 0.08 * this.volume;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(noteGain, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.24);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);

    // 2. Kick / Bass pulse on beat (steps 0, 2, 4, 6)
    if (this.step % 2 === 0) {
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(noteFreq / 2, now);
      bassOsc.frequency.exponentialRampToValueAtTime(48, now + 0.14);

      const kickVol = 0.12 * this.volume;
      bassGain.gain.setValueAtTime(kickVol, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      bassOsc.connect(bassGain);
      bassGain.connect(this.ctx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 0.16);
    }

    this.step++;
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.htmlAudio) {
      try {
        this.htmlAudio.pause();
        this.htmlAudio.currentTime = 0;
      } catch {}
      this.htmlAudio = null;
    }
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {}
      this.ctx = null;
    }
  }
}

/**
 * Draws active visual effects & text overlays onto a 2D canvas context
 * Used during live camera recording & photo-to-reel rendering so effects are baked into the video!
 */
export function drawStudioOverlaysOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  effectId: string,
  textOverlays: ReelTextOverlay[],
  timestampMs: number
) {
  ctx.save();

  // 1. Visual Effect Preset
  if (effectId === 'sparkles' || effectId === 'gold_dust') {
    const count = 22;
    for (let i = 0; i < count; i++) {
      const seed = i * 137.5;
      const x = ((seed * 17 + timestampMs * 0.03) % width);
      const y = ((seed * 29 + timestampMs * (effectId === 'gold_dust' ? 0.06 : 0.04)) % height);
      const pulse = 0.4 + 0.6 * Math.abs(Math.sin(timestampMs * 0.005 + i));
      const radius = (i % 3 + 2) * pulse;

      ctx.fillStyle = effectId === 'gold_dust'
        ? `rgba(251, 191, 36, ${0.75 * pulse})`
        : `rgba(255, 255, 255, ${0.85 * pulse})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (effectId === 'bokeh') {
    for (let i = 0; i < 12; i++) {
      const x = ((i * 97 + timestampMs * 0.02) % width);
      const y = height - ((i * 83 + timestampMs * 0.035) % height);
      const r = 18 + (i % 4) * 10;
      const colors = ['rgba(244,114,182,0.22)', 'rgba(56,189,248,0.22)', 'rgba(250,204,21,0.20)'];
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (effectId === 'hearts') {
    ctx.font = '24px sans-serif';
    for (let i = 0; i < 10; i++) {
      const x = ((i * 73 + Math.sin(timestampMs * 0.002 + i) * 30 + width) % width);
      const y = height - ((i * 95 + timestampMs * 0.08) % height);
      ctx.fillText(i % 2 === 0 ? '💖' : '❤️', x, y);
    }
  } else if (effectId === 'vhs') {
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let y = 0; y < height; y += 6) {
      ctx.fillRect(0, y, width, 2);
    }
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#fde047';
    ctx.fillText('PLAY ▶ Z-ONE VHS', 24, 42);
  } else if (effectId === 'neon_frame') {
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, width - 20, height - 20);
  }

  // 2. Text Overlays
  if (Array.isArray(textOverlays) && textOverlays.length > 0) {
    for (const item of textOverlays) {
      if (!item.text || !item.text.trim()) continue;
      const px = (item.x / 100) * width;
      const py = (item.y / 100) * height;
      const sizePx = item.fontSize === 'sm' ? 22 : item.fontSize === 'lg' ? 38 : 28;
      ctx.font = `900 ${sizePx}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const metrics = ctx.measureText(item.text);
      const padX = 16;
      const padY = 10;
      const boxW = metrics.width + padX * 2;
      const boxH = sizePx + padY * 2;

      if (item.bgColor && item.bgColor !== 'transparent') {
        ctx.fillStyle = item.bgColor;
        ctx.beginPath();
        ctx.roundRect(px - boxW / 2, py - boxH / 2, boxW, boxH, 12);
        ctx.fill();
      } else {
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 8;
      }

      ctx.fillStyle = item.color || '#ffffff';
      ctx.fillText(item.text, px, py);
      ctx.shadowBlur = 0;
    }
  }

  ctx.restore();
}
