// Client-side Web Audio synthesizer for premium gamified sound effects
export class AudioSynthesizer {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playClick() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.05);
      
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // Ignored if browser blocks audio
    }
  }

  playReward() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, this.ctx.currentTime + 0.16); // G5
      osc.frequency.setValueAtTime(1046.50, this.ctx.currentTime + 0.24); // C6
      
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
    } catch {
      // Ignored
    }
  }

  playWithdraw() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      
      // Fun cash drawer sound (bell chime + noise shake)
      const now = this.ctx.currentTime;
      
      // Chime
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(987.77, now); // B5
      osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.15); // E6
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.start();
      osc1.stop(now + 0.6);

      // Sizzle
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(2000, now);
      gain2.gain.setValueAtTime(0.02, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc2.start();
      osc2.stop(now + 0.2);
    } catch {
      // Ignored
    }
  }
}

export const soundEffects = new AudioSynthesizer();
export default soundEffects;
