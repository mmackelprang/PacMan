/**
 * Sound system using Web Audio API.
 * Generates all sounds programmatically — no external files needed.
 */
export class SoundManager {
  private ctx: AudioContext | null = null;
  private muted = false;

  // Looping sound nodes
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private wakaPhase = 0;
  private frightOsc: OscillatorNode | null = null;
  private frightGain: GainNode | null = null;
  private retreatOsc: OscillatorNode | null = null;
  private retreatGain: GainNode | null = null;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  toggleMute(): void {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopAllLoops();
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  // ─── One-shot sounds ──────────────────────────────

  /** Waka-waka dot eating (alternating pitch) */
  playWaka(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    // Alternate between two pitches for waka-waka effect
    osc.frequency.value = this.wakaPhase === 0 ? 400 : 300;
    this.wakaPhase = 1 - this.wakaPhase;

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);

    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.07);
  }

  /** Power pellet eaten */
  playPowerPellet(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }

  /** Ghost eaten */
  playGhostEaten(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  }

  /** Pac-Man death */
  playDeath(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();

    // Descending tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 1.5);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime + 1.0);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.5);
  }

  /** Fruit eaten */
  playFruitEaten(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();

    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + i * 0.08;

      osc.type = 'square';
      osc.frequency.value = 600 + i * 200;
      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    }
  }

  /** Extra life */
  playExtraLife(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();

    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    for (let i = 0; i < notes.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + i * 0.1;

      osc.type = 'square';
      osc.frequency.value = notes[i];
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    }
  }

  /** Level start jingle */
  playIntro(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();

    // Simple ascending arpeggio
    const notes = [262, 330, 392, 523, 659, 784];
    for (let i = 0; i < notes.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + i * 0.15;

      osc.type = 'square';
      osc.frequency.value = notes[i];
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.setValueAtTime(0.06, t + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    }
  }

  // ─── Looping sounds ───────────────────────────────

  /** Ghost siren (normal gameplay) */
  startSiren(): void {
    if (this.muted || this.sirenOsc) return;
    const ctx = this.ensureContext();

    this.sirenOsc = ctx.createOscillator();
    this.sirenGain = ctx.createGain();

    this.sirenOsc.type = 'sawtooth';
    this.sirenOsc.frequency.value = 100;
    this.sirenGain.gain.value = 0.03;

    // Wobble the frequency for siren effect
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.4;
    lfoGain.gain.value = 30;
    lfo.connect(lfoGain).connect(this.sirenOsc.frequency);
    lfo.start();

    this.sirenOsc.connect(this.sirenGain).connect(ctx.destination);
    this.sirenOsc.start();
  }

  stopSiren(): void {
    if (this.sirenOsc) {
      this.sirenOsc.stop();
      this.sirenOsc.disconnect();
      this.sirenOsc = null;
      this.sirenGain = null;
    }
  }

  /** Frightened mode background sound */
  startFrightened(): void {
    if (this.muted || this.frightOsc) return;
    const ctx = this.ensureContext();

    this.frightOsc = ctx.createOscillator();
    this.frightGain = ctx.createGain();

    this.frightOsc.type = 'square';
    this.frightOsc.frequency.value = 55;
    this.frightGain.gain.value = 0.04;

    // Fast tremolo
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'square';
    lfo.frequency.value = 8;
    lfoGain.gain.value = 0.04;
    lfo.connect(lfoGain).connect(this.frightGain.gain);
    lfo.start();

    this.frightOsc.connect(this.frightGain).connect(ctx.destination);
    this.frightOsc.start();
  }

  stopFrightened(): void {
    if (this.frightOsc) {
      this.frightOsc.stop();
      this.frightOsc.disconnect();
      this.frightOsc = null;
      this.frightGain = null;
    }
  }

  /** Ghost retreating (eyes returning to house) */
  startRetreat(): void {
    if (this.muted || this.retreatOsc) return;
    const ctx = this.ensureContext();

    this.retreatOsc = ctx.createOscillator();
    this.retreatGain = ctx.createGain();

    this.retreatOsc.type = 'square';
    this.retreatOsc.frequency.value = 220;
    this.retreatGain.gain.value = 0.03;

    // Fast pitch wobble for urgency
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 6;
    lfoGain.gain.value = 80;
    lfo.connect(lfoGain).connect(this.retreatOsc.frequency);
    lfo.start();

    this.retreatOsc.connect(this.retreatGain).connect(ctx.destination);
    this.retreatOsc.start();
  }

  stopRetreat(): void {
    if (this.retreatOsc) {
      this.retreatOsc.stop();
      this.retreatOsc.disconnect();
      this.retreatOsc = null;
      this.retreatGain = null;
    }
  }

  /** Stop all looping sounds */
  stopAllLoops(): void {
    this.stopSiren();
    this.stopFrightened();
    this.stopRetreat();
  }
}
