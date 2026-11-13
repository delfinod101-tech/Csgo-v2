export class CarAudioEngine {
  private ctx: AudioContext | null = null;
  private oscPrimary: OscillatorNode | null = null;
  private oscHarmonic: OscillatorNode | null = null;
  private masterGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private enabled = false;

  public setEnabled(enable: boolean): void {
    this.enabled = enable;
    if (enable) {
      this.ensureInitialized();
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(0.06, this.ctx.currentTime, 0.08);
      }
    } else if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    }
  }

  private ensureInitialized(): void {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 260;
    this.filter.Q.value = 2.4;

    this.oscPrimary = this.ctx.createOscillator();
    this.oscPrimary.type = 'sawtooth';
    this.oscPrimary.frequency.value = 58;

    this.oscHarmonic = this.ctx.createOscillator();
    this.oscHarmonic.type = 'triangle';
    this.oscHarmonic.frequency.value = 116;

    const harmonicGain = this.ctx.createGain();
    harmonicGain.gain.value = 0.45;

    this.oscPrimary.connect(this.filter);
    this.oscHarmonic.connect(harmonicGain);
    harmonicGain.connect(this.filter);
    this.filter.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this.oscPrimary.start();
    this.oscHarmonic.start();
  }

  public updateDrive(speedRatio: number, throttle: number): void {
    if (!this.enabled || !this.ctx || !this.oscPrimary || !this.oscHarmonic || !this.filter || !this.masterGain) {
      return;
    }
    const clamped = Math.min(Math.max(speedRatio, 0), 1);
    const baseFreq = 56 + clamped * 165 + throttle * 14;
    const now = this.ctx.currentTime;
    this.oscPrimary.frequency.setTargetAtTime(baseFreq, now, 0.06);
    this.oscHarmonic.frequency.setTargetAtTime(baseFreq * 2.5, now, 0.06);
    this.filter.frequency.setTargetAtTime(220 + clamped * 1100 + throttle * 250, now, 0.08);
    this.masterGain.gain.setTargetAtTime(0.035 + clamped * 0.075, now, 0.08);
  }

  public playMechanicalToggle(): void {
    if (!this.enabled) return;
    this.ensureInitialized();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.07);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  public dispose(): void {
    try {
      this.oscPrimary?.stop();
      this.oscHarmonic?.stop();
      void this.ctx?.close();
    } catch {
      // ignore close errors
    }
    this.ctx = null;
  }
}
