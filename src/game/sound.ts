import { WeaponId } from '@/src/types/game';

class TacticalSoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private masterGain: GainNode | null = null;
  public muted = false;
  public volume = 0.85;

  public setVolume(vol: number, muted: boolean): void {
    this.volume = Math.min(1, Math.max(0, vol));
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : this.volume,
        this.ctx.currentTime,
        0.02
      );
    }
  }

  private ensureContext(): { ctx: AudioContext; out: GainNode } | null {
    if (this.muted || this.volume <= 0.01) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);

      const sr = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, sr, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < sr; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (!this.masterGain) return null;
    this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
    return { ctx: this.ctx, out: this.masterGain };
  }

  public playWeaponFire(weapon: WeaponId): void {
    const audio = this.ensureContext();
    if (!audio || !this.noiseBuffer) return;
    const { ctx, out } = audio;
    const now = ctx.currentTime;

    if (weapon === 'knife') {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.frequency.exponentialRampToValueAtTime(520, now + 0.12);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      noise.start(now);
      noise.stop(now + 0.15);
      return;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = weapon === 'm4a1s' ? 'bandpass' : 'lowpass';
    const gain = ctx.createGain();

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    if (weapon === 'm4a1s') {
      filter.frequency.setValueAtTime(2200, now);
      filter.frequency.exponentialRampToValueAtTime(550, now + 0.08);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.06);
      oscGain.gain.setValueAtTime(0.14, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    } else if (weapon === 'awp') {
      filter.frequency.setValueAtTime(3400, now);
      filter.frequency.exponentialRampToValueAtTime(220, now + 0.42);
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(145, now);
      osc.frequency.exponentialRampToValueAtTime(34, now + 0.25);
      oscGain.gain.setValueAtTime(0.35, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    } else if (weapon === 'deagle') {
      filter.frequency.setValueAtTime(3800, now);
      filter.frequency.exponentialRampToValueAtTime(380, now + 0.2);
      gain.gain.setValueAtTime(0.36, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.type = 'square';
      osc.frequency.setValueAtTime(195, now);
      osc.frequency.exponentialRampToValueAtTime(52, now + 0.14);
      oscGain.gain.setValueAtTime(0.24, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    } else {
      filter.frequency.setValueAtTime(3200, now);
      filter.frequency.exponentialRampToValueAtTime(420, now + 0.14);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(170, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 0.1);
      oscGain.gain.setValueAtTime(0.24, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    }

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    osc.connect(oscGain);
    oscGain.connect(out);

    const stopDur = weapon === 'awp' ? 0.46 : 0.24;
    noise.start(now);
    noise.stop(now + stopDur);
    osc.start(now);
    osc.stop(now + stopDur);
  }

  public playHeadshotDink(): void {
    const audio = this.ensureContext();
    if (!audio) return;
    const { ctx, out } = audio;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc2.type = 'triangle';
    osc.frequency.setValueAtTime(1880, now);
    osc.frequency.exponentialRampToValueAtTime(1240, now + 0.12);
    osc2.frequency.setValueAtTime(2840, now);
    osc2.frequency.exponentialRampToValueAtTime(1920, now + 0.1);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.15);
    osc2.stop(now + 0.15);
  }

  public playHitmarker(): void {
    const audio = this.ensureContext();
    if (!audio) return;
    const { ctx, out } = audio;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.04);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playReload(): void {
    const audio = this.ensureContext();
    if (!audio) return;
    const { ctx, out } = audio;
    const now = ctx.currentTime;
    const clicks = [0, 0.35, 0.78];
    const freqs = [520, 680, 920];
    clicks.forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freqs[idx], now + offset);
      osc.frequency.exponentialRampToValueAtTime(freqs[idx] * 0.5, now + offset + 0.04);
      gain.gain.setValueAtTime(0.08, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.05);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now + offset);
      osc.stop(now + offset + 0.055);
    });
  }

  public playEquip(): void {
    const audio = this.ensureContext();
    if (!audio) return;
    const { ctx, out } = audio;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.06);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  public playUiClick(): void {
    const audio = this.ensureContext();
    if (!audio) return;
    const { ctx, out } = audio;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(720, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.03);
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  public playCaseTick(): void {
    const audio = this.ensureContext();
    if (!audio) return;
    const { ctx, out } = audio;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1150, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.025);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.032);
  }

  public playCaseUnlock(isHighTier: boolean): void {
    const audio = this.ensureContext();
    if (!audio) return;
    const { ctx, out } = audio;
    const now = ctx.currentTime;
    const notes = isHighTier ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t0 = now + i * 0.075;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.11, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
      osc.connect(gain);
      gain.connect(out);
      osc.start(t0);
      osc.stop(t0 + 0.3);
    });
  }
}

export const soundEngine = new TacticalSoundEngine();
