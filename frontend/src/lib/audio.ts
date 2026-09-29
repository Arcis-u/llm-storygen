class AudioEngine {
  private isMuted: boolean = false;
  private audioCtx: AudioContext | null = null;
  private currentBgm: HTMLAudioElement | null = null;
  private currentGenre: string | null = null;
  private fadeTimers = new Map<HTMLAudioElement, ReturnType<typeof setInterval>>();
  private generation = 0;

  constructor() {
    // Initialize AudioContext only on client side when needed
  }

  private getContext() {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public playSfx(type: "click" | "buy" | "error" | "success" | "glitch") {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "click") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } 
    else if (type === "buy") {
      osc.type = "square";
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.setValueAtTime(1600, now + 0.05);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
    else if (type === "glitch") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }
    else if (type === "success") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.setValueAtTime(600, now + 0.1);
      osc.frequency.setValueAtTime(800, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
    else if (type === "error") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.setValueAtTime(100, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  }

  public playBGM(tone: string) {
    if (typeof window === "undefined" || this.isMuted) return;
    const track = ["ambient", "tense", "combat", "sad", "epic"].includes(tone) ? tone : "ambient";
    if (this.currentGenre === track) return;
    const generation = ++this.generation;
    this.currentGenre = track;
    const next = new Audio(`/audio/${track}.wav`);
    next.loop = true; next.volume = 0;
    next.play().then(() => {
      if (generation !== this.generation || this.isMuted) { next.pause(); return; }
      const previous = this.currentBgm;
      this.currentBgm = next;
      if (previous) this.fade(previous, 0, () => { previous.pause(); previous.currentTime = 0; });
      this.fade(next, .3);
    }).catch(() => { if (generation === this.generation) this.currentGenre = null; });
  }

  private fade(audio: HTMLAudioElement, target: number, done?: () => void) {
    const existing = this.fadeTimers.get(audio);
    if (existing) clearInterval(existing);
    const step = (target - audio.volume) / 12;
    let ticks = 0;
    const timer = setInterval(() => {
      ticks++;
      audio.volume = Math.max(0, Math.min(1, ticks >= 12 ? target : audio.volume + step));
      if (ticks >= 12) { clearInterval(timer); this.fadeTimers.delete(audio); done?.(); }
    }, 60);
    this.fadeTimers.set(audio, timer);
  }

  public stopBGM() {
    ++this.generation;
    this.fadeTimers.forEach((timer, audio) => { clearInterval(timer); audio.pause(); });
    this.fadeTimers.clear();
    this.currentBgm?.pause(); this.currentBgm = null; this.currentGenre = null;
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.fadeTimers.forEach((timer, audio) => { clearInterval(timer); audio.pause(); });
      this.fadeTimers.clear();
      this.currentBgm?.pause();
    } else if (!this.isMuted && this.currentBgm) {
      this.currentBgm.volume = .3;
      this.currentBgm.play().catch(() => {});
    }
    return this.isMuted;
  }

  public getMuted() { return this.isMuted; }
}

export const audioEngine = new AudioEngine();
