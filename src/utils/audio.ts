/**
 * Programmatic Web Audio Synthesizer for Z-oneApp
 * Provides lightweight, high-fidelity sound effects without any external asset dependencies.
 */

class AudioSynthesizer {
  private ctx: AudioContext | null = null;

  private initContext() {
    if (!this.ctx) {
      // Use standard or webkit AudioContext
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    // Resume context if suspended (browser security policy)
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Play a bright, cheery ascending "Ding" chime for rewards and successes
   */
  public playReward() {
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      
      // Note 1: Lower root note (C5 ~523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      // Soft fast envelope
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.12, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.16);

      // Note 2: Higher bright note, slightly delayed (E5 ~659.25 Hz or G5 ~783.99 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, now + 0.08); // Ascending fifth
      
      gain2.gain.setValueAtTime(0, now + 0.08);
      gain2.gain.linearRampToValueAtTime(0.15, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.36);
    } catch (error) {
      console.warn('Audio feedback failed:', error);
    }
  }

  /**
   * Play a simulated "Cha-Ching" register sound for cashouts / withdrawals
   */
  public playWithdraw() {
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // 1. Synthesize a metallic coin rustle using rapid short bursts of high-pass filtered noise
      // Create a buffer of white noise
      const bufferSize = ctx.sampleRate * 0.1; // 100ms of noise
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;

      // High pass filter to make noise sound metallic / rustly
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(8000, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.06, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      noiseNode.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseNode.start(now);

      // 2. Clear bell-like metallic chime (gong/chime strike) right after the rustle
      // Frequency sequence to make a "cha-ching" bell chord
      const bellFreqs = [1200, 1500, 2400];
      const startDelay = 0.05;

      bellFreqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        // Triangle/Sine mix gives a realistic bell tone
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + startDelay);
        
        // Fast attack, slow ring decay
        gain.gain.setValueAtTime(0, now + startDelay);
        gain.gain.linearRampToValueAtTime(0.08, now + startDelay + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + startDelay + 0.4 + (idx * 0.1));
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + startDelay);
        osc.stop(now + startDelay + 0.5 + (idx * 0.1));
      });

    } catch (error) {
      console.warn('Audio feedback failed:', error);
    }
  }

  /**
   * Play a celebratory ascending fanfare for special tasks or milestone accomplishments
   */
  public playFanfare() {
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const noteDuration = 0.1;
      const spacing = 0.08;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + (idx * spacing));
        
        gain.gain.setValueAtTime(0, now + (idx * spacing));
        gain.gain.linearRampToValueAtTime(0.12, now + (idx * spacing) + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (idx * spacing) + noteDuration + 0.05);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + (idx * spacing));
        osc.stop(now + (idx * spacing) + noteDuration + 0.1);
      });
    } catch (error) {
      console.warn('Audio feedback failed:', error);
    }
  }

  /**
   * A clean, quiet tactile click for buttons/interactions
   */
  public playClick() {
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(1000, now + 0.015);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch (error) {
      // Audio block or failure
    }
  }
}

export const soundEffects = new AudioSynthesizer();
