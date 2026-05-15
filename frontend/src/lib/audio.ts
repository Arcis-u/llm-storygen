class AudioEngine {
  private isMuted: boolean = false;
  private audioCtx: AudioContext | null = null;
  private currentBgm: HTMLAudioElement | null = null;
  private currentGenre: string | null = null;
  private fadeInterval: NodeJS.Timeout | null = null;

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

  public playBGM(genre: string) {
    if (typeof window === "undefined" || this.isMuted) return;
    
    // Normalize genre
    const normalizedGenre = genre.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (this.currentGenre === normalizedGenre) return; // Already playing
    
    console.log(`[AudioEngine] BGM changing to: ${normalizedGenre}`);
    this.currentGenre = normalizedGenre;

    // Fade out current BGM
    if (this.currentBgm) {
      const oldBgm = this.currentBgm;
      this.fadeOut(oldBgm, () => {
        oldBgm.pause();
        oldBgm.currentTime = 0;
      });
    }

    // Try to load the new BGM track
    // Convention: put files in /audio/{genre}.mp3
    // Fallback logic handled gracefully if file is missing (404)
    const newBgm = new Audio(`/audio/${normalizedGenre}.mp3`);
    newBgm.loop = true;
    newBgm.volume = 0;
    
    newBgm.play().then(() => {
      this.currentBgm = newBgm;
      this.fadeIn(newBgm, 0.3); // Target volume 0.3
    }).catch(e => {
      console.warn(`[AudioEngine] BGM track not found or play prevented for: ${normalizedGenre}. Make sure /audio/${normalizedGenre}.mp3 exists!`, e);
      this.currentGenre = null; // reset if failed
    });
  }

  private fadeOut(audio: HTMLAudioElement, callback: () => void) {
    let vol = audio.volume;
    const fade = setInterval(() => {
      if (vol > 0.05) {
        vol -= 0.05;
        audio.volume = vol;
      } else {
        clearInterval(fade);
        audio.volume = 0;
        callback();
      }
    }, 100);
  }

  private fadeIn(audio: HTMLAudioElement, targetVolume: number) {
    let vol = 0;
    audio.volume = vol;
    const fade = setInterval(() => {
      if (vol < targetVolume - 0.05) {
        vol += 0.05;
        audio.volume = vol;
      } else {
        clearInterval(fade);
        audio.volume = targetVolume;
      }
    }, 100);
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.currentBgm) {
      this.currentBgm.pause();
    } else if (!this.isMuted && this.currentBgm) {
      this.currentBgm.play().catch(e => console.warn(e));
    }
    return this.isMuted;
  }
}

export const audioEngine = new AudioEngine();
