// Web Audio sound effects for AI mode (entry swell and UI beeps).
// Shared by the eager activation screen and the lazily loaded AI world.

class PortaSfxSynth {
  private ctx: AudioContext | null = null;
  private bgmOsc1: OscillatorNode | null = null;
  private bgmOsc2: OscillatorNode | null = null;
  private bgmGain: GainNode | null = null;
  public isMuted = false;

  isMobile() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume().catch(() => undefined);
      return;
    }
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) this.ctx = new Ctor();
    } catch (e) {
      console.error("Audio Context initialization failed", e);
    }
  }

  playBeep(freq = 550, duration = 0.08, gainVal = 0.015) {
    if (this.isMuted || this.isMobile()) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Sound is decoration; never let it break AI mode.
    }
  }

  playClick() {
    this.playBeep(330, 0.06, 0.02);
  }

  // Entry swell played while AI mode boots
  playEntryBgm() {
    if (this.isMuted || this.isMobile()) return;
    this.init();
    if (!this.ctx) return;
    try {
      this.stopEntryBgm();

      const now = this.ctx.currentTime;
      this.bgmOsc1 = this.ctx.createOscillator();
      this.bgmOsc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      this.bgmGain = this.ctx.createGain();

      this.bgmOsc1.type = "sawtooth";
      this.bgmOsc2.type = "sine";
      filter.type = "lowpass";

      this.bgmOsc1.frequency.setValueAtTime(65, now);
      this.bgmOsc1.frequency.exponentialRampToValueAtTime(220, now + 3.0);

      this.bgmOsc2.frequency.setValueAtTime(130, now);
      this.bgmOsc2.frequency.exponentialRampToValueAtTime(440, now + 3.0);

      filter.frequency.setValueAtTime(300, now);
      filter.frequency.exponentialRampToValueAtTime(2500, now + 3.0);

      this.bgmGain.gain.setValueAtTime(0.01, now);
      this.bgmGain.gain.linearRampToValueAtTime(0.06, now + 1.5);
      this.bgmGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);

      this.bgmOsc1.connect(filter);
      this.bgmOsc2.connect(filter);
      filter.connect(this.bgmGain);
      this.bgmGain.connect(this.ctx.destination);

      this.bgmOsc1.start(now);
      this.bgmOsc2.start(now);
      this.bgmOsc1.stop(now + 3.5);
      this.bgmOsc2.stop(now + 3.5);
    } catch {
      // ignore
    }
  }

  stopEntryBgm() {
    try {
      if (this.bgmOsc1) { this.bgmOsc1.stop(); this.bgmOsc1.disconnect(); this.bgmOsc1 = null; }
      if (this.bgmOsc2) { this.bgmOsc2.stop(); this.bgmOsc2.disconnect(); this.bgmOsc2 = null; }
      if (this.bgmGain) { this.bgmGain.disconnect(); this.bgmGain = null; }
    } catch {
      // already stopped
    }
  }

  /** Stop everything and let the audio thread idle while AI mode is closed. */
  sleep() {
    this.stopEntryBgm();
    if (this.ctx && this.ctx.state === "running") void this.ctx.suspend().catch(() => undefined);
  }
}

export const sfx = new PortaSfxSynth();
