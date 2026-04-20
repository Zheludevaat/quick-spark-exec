/**
 * Tiny chiptune engine: square + triangle + noise oscillators driven by a
 * cooperative scheduler. No external assets; everything is synthesized live
 * with the WebAudio API. Designed to evoke the 4-channel Game Boy sound chip
 * (PU1, PU2, WAV, NOISE) without trying to be cycle-accurate.
 */

const NOTE_FREQ: Record<string, number> = (() => {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const out: Record<string, number> = {};
  // A4 = 440 Hz. Compute MIDI 24..96 → C1..C7
  for (let midi = 24; midi <= 96; midi++) {
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const name = names[midi % 12] + Math.floor(midi / 12 - 1);
    out[name] = freq;
  }
  return out;
})();

type Wave = "square" | "triangle" | "sawtooth" | "sine";

class ChipChannel {
  osc?: OscillatorNode;
  gain: GainNode;
  pan: StereoPannerNode;
  constructor(
    private ctx: AudioContext,
    private wave: Wave,
    output: AudioNode,
    panValue = 0,
  ) {
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.pan = ctx.createStereoPanner();
    this.pan.pan.value = panValue;
    this.gain.connect(this.pan);
    this.pan.connect(output);
  }
  note(noteName: string, when: number, durSec: number, velocity = 0.18) {
    const f = NOTE_FREQ[noteName];
    if (!f) return;
    this.freq(f, when, durSec, velocity);
  }
  freq(f: number, when: number, durSec: number, velocity = 0.18) {
    const o = this.ctx.createOscillator();
    o.type = this.wave;
    o.frequency.setValueAtTime(f, when);
    o.connect(this.gain);
    // tight envelope: 6ms attack, then sustain, 40ms release
    const g = this.gain.gain;
    g.cancelScheduledValues(when);
    g.setValueAtTime(0, when);
    g.linearRampToValueAtTime(velocity, when + 0.006);
    g.setValueAtTime(velocity, when + Math.max(0.01, durSec - 0.04));
    g.linearRampToValueAtTime(0, when + durSec);
    o.start(when);
    o.stop(when + durSec + 0.02);
  }
}

class NoiseChannel {
  gain: GainNode;
  buffer: AudioBuffer;
  constructor(
    private ctx: AudioContext,
    output: AudioNode,
  ) {
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(output);
    const len = ctx.sampleRate;
    this.buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  hit(when: number, durSec: number, velocity = 0.18, lowpass = 4000) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = lowpass;
    src.connect(filter);
    filter.connect(this.gain);
    const g = this.gain.gain;
    g.cancelScheduledValues(when);
    g.setValueAtTime(0, when);
    g.linearRampToValueAtTime(velocity, when + 0.005);
    g.exponentialRampToValueAtTime(0.0001, when + durSec);
    src.start(when);
    src.stop(when + durSec + 0.02);
  }
}

type SongStep = [string | null, string | null, string | null]; // [pu1, pu2, wav]

type Song = {
  bpm: number;
  steps: SongStep[]; // 16th-note grid
  noise?: (number | null)[]; // optional snare/kick triggers per step
  loop?: boolean;
};

class Music {
  private timer?: number;
  private startTime = 0;
  private nextStep = 0;
  private song?: Song;
  private currentName = "";

  constructor(
    private ctx: AudioContext,
    private pu1: ChipChannel,
    private pu2: ChipChannel,
    private wav: ChipChannel,
    private noise: NoiseChannel,
  ) {}

  play(name: string, song: Song) {
    if (this.currentName === name) return;
    this.stop();
    this.currentName = name;
    this.song = song;
    this.nextStep = 0;
    this.startTime = this.ctx.currentTime + 0.05;
    this.tick();
  }

  stop() {
    this.currentName = "";
    this.song = undefined;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private tick = () => {
    const lookAheadSec = 0.15;
    const scheduleAheadSec = 0.25;
    const schedule = () => {
      if (!this.song) return;
      const stepDur = 60 / this.song.bpm / 4; // 16th note
      const horizon = this.ctx.currentTime + scheduleAheadSec;
      while (true) {
        const when = this.startTime + this.nextStep * stepDur;
        if (when > horizon) break;
        const step = this.song.steps[this.nextStep % this.song.steps.length];
        const [a, b, c] = step;
        if (a) this.pu1.note(a, when, stepDur * 0.95, 0.13);
        if (b) this.pu2.note(b, when, stepDur * 0.95, 0.1);
        if (c) this.wav.note(c, when, stepDur * 1.5, 0.08);
        const drum = this.song.noise?.[this.nextStep % this.song.noise.length];
        if (drum) this.noise.hit(when, 0.08, 0.1 * drum, 1500);
        this.nextStep++;
        if (!this.song.loop && this.nextStep >= this.song.steps.length) {
          this.stop();
          return;
        }
      }
    };
    schedule();
    this.timer = window.setInterval(schedule, lookAheadSec * 1000);
  };
}

class AudioEngine {
  ctx: AudioContext;
  master: GainNode;
  pu1: ChipChannel;
  pu2: ChipChannel;
  wav: ChipChannel;
  noise: NoiseChannel;
  music: Music;
  muted = false;
  /** Master volume 0..1 (independent of mute). Persisted to localStorage. */
  volume = 0.5;

  constructor() {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    // Restore persisted volume / mute
    try {
      const v = parseFloat(localStorage.getItem("hermetic_volume_v1") || "");
      if (!Number.isNaN(v) && v >= 0 && v <= 1) this.volume = v;
      this.muted = localStorage.getItem("hermetic_muted_v1") === "1";
    } catch {
      /* ignore */
    }
    this.master.gain.value = this.muted ? 0 : this.volume;
    // gentle low-pass to soften the harshness
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 6500;
    this.master.connect(lp);
    lp.connect(this.ctx.destination);
    this.pu1 = new ChipChannel(this.ctx, "square", this.master, -0.25);
    this.pu2 = new ChipChannel(this.ctx, "square", this.master, 0.25);
    this.wav = new ChipChannel(this.ctx, "triangle", this.master, 0);
    this.noise = new NoiseChannel(this.ctx, this.master);
    this.music = new Music(this.ctx, this.pu1, this.pu2, this.wav, this.noise);
  }

  resume() {
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.master.gain.value = m ? 0 : this.volume;
    try {
      localStorage.setItem("hermetic_muted_v1", m ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  /** Set master volume 0..1. Applied immediately unless muted. */
  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (!this.muted) this.master.gain.value = this.volume;
    try {
      localStorage.setItem("hermetic_volume_v1", String(this.volume));
    } catch {
      /* ignore */
    }
  }

  /** SFX: tiny one-shot sounds. */
  sfx(
    kind:
      | "cursor"
      | "confirm"
      | "cancel"
      | "hit"
      | "miss"
      | "resolve"
      | "boss"
      | "dialog"
      | "open"
      | "wipe",
  ) {
    const t = this.ctx.currentTime + 0.005;
    switch (kind) {
      case "cursor":
        this.pu1.freq(880, t, 0.05, 0.12);
        break;
      case "confirm":
        this.pu1.freq(660, t, 0.06, 0.16);
        this.pu1.freq(990, t + 0.06, 0.08, 0.14);
        break;
      case "cancel":
        this.pu2.freq(440, t, 0.08, 0.12);
        this.pu2.freq(330, t + 0.06, 0.1, 0.1);
        break;
      case "hit":
        this.noise.hit(t, 0.12, 0.2, 2200);
        this.pu1.freq(220, t, 0.08, 0.14);
        break;
      case "miss":
        this.noise.hit(t, 0.1, 0.12, 600);
        break;
      case "resolve":
        this.wav.freq(523, t, 0.18, 0.12);
        this.wav.freq(659, t + 0.1, 0.18, 0.12);
        this.wav.freq(784, t + 0.2, 0.3, 0.14);
        this.pu2.freq(1046, t + 0.2, 0.3, 0.1);
        break;
      case "boss":
        this.wav.freq(110, t, 0.5, 0.18);
        this.pu1.freq(220, t, 0.5, 0.14);
        this.noise.hit(t, 0.4, 0.18, 800);
        break;
      case "dialog":
        this.pu2.freq(1320, t, 0.012, 0.05);
        break;
      case "open":
        this.pu1.freq(660, t, 0.04, 0.1);
        this.pu2.freq(990, t + 0.04, 0.06, 0.1);
        break;
      case "wipe":
        for (let i = 0; i < 6; i++) {
          this.noise.hit(t + i * 0.04, 0.05, 0.1, 1500 + i * 400);
        }
        break;
    }
  }
}

let _engine: AudioEngine | null = null;

export function getAudio(): AudioEngine {
  if (!_engine) _engine = new AudioEngine();
  return _engine;
}

// ----- SONGS (16th-note grids; all in C-minor / A-minor for melancholy) -----

const N = null;

/** Title — slow, hopeful arpeggios over a held bass. */
export const SONG_TITLE: Song = {
  bpm: 84,
  loop: true,
  steps: [
    ["A4", "E4", "A2"],
    [N, N, N],
    ["C5", N, N],
    [N, N, N],
    ["E5", "G4", N],
    [N, N, N],
    ["A5", N, N],
    [N, N, N],
    ["G5", "E4", "G2"],
    [N, N, N],
    ["E5", N, N],
    [N, N, N],
    ["C5", "A4", N],
    [N, N, N],
    ["A4", N, N],
    [N, N, N],
    ["F4", "C4", "F2"],
    [N, N, N],
    ["A4", N, N],
    [N, N, N],
    ["C5", "E4", N],
    [N, N, N],
    ["F5", N, N],
    [N, N, N],
    ["E5", "C4", "E2"],
    [N, N, N],
    ["C5", N, N],
    [N, N, N],
    ["G4", "B3", N],
    [N, N, N],
    ["E4", N, N],
    [N, N, N],
  ],
};

/** Silver Threshold — drifting minor 7ths, ambient. */
export const SONG_SILVER: Song = {
  bpm: 72,
  loop: true,
  steps: [
    ["A4", "C4", "A2"],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    ["B4", "D4", N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    ["C5", "E4", "G2"],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    ["B4", "D4", N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    ["G4", "B3", "F2"],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    ["A4", "C4", N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    ["G4", "B3", "E2"],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    ["F4", "A3", N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
  ],
};

/** Moon Hall — pulsing dorian, slightly nervous. */
export const SONG_MOON: Song = {
  bpm: 96,
  loop: true,
  steps: [
    ["A4", "E4", "A2"],
    [N, N, N],
    ["C5", N, N],
    [N, N, N],
    ["E5", "G4", N],
    [N, N, N],
    ["D5", N, N],
    [N, N, N],
    ["B4", "F4", "G2"],
    [N, N, N],
    ["D5", N, N],
    [N, N, N],
    ["F5", "A4", N],
    [N, N, N],
    ["E5", N, N],
    [N, N, N],
    ["C5", "E4", "F2"],
    [N, N, N],
    ["G4", N, N],
    [N, N, N],
    ["E5", "G4", N],
    [N, N, N],
    ["F5", N, N],
    [N, N, N],
    ["D5", "F4", "E2"],
    [N, N, N],
    ["B4", N, N],
    [N, N, N],
    ["A4", "C4", N],
    [N, N, N],
    ["G4", N, N],
    [N, N, N],
  ],
  noise: [
    1,
    N,
    N,
    N,
    N,
    N,
    1,
    N,
    1,
    N,
    N,
    N,
    N,
    N,
    1,
    N,
    1,
    N,
    N,
    N,
    N,
    N,
    1,
    N,
    1,
    N,
    N,
    N,
    N,
    N,
    1,
    N,
  ],
};

/** Battle — driving, tight loop. */
export const SONG_BATTLE: Song = {
  bpm: 132,
  loop: true,
  steps: [
    ["A4", "E4", "A2"],
    ["A4", N, N],
    [N, N, "A3"],
    ["E5", N, N],
    ["C5", "G4", N],
    ["C5", N, N],
    [N, N, "C3"],
    ["G5", N, N],
    ["B4", "F4", "G2"],
    ["B4", N, N],
    [N, N, "G3"],
    ["F5", N, N],
    ["D5", "A4", N],
    ["D5", N, N],
    [N, N, "D3"],
    ["A5", N, N],
    ["A4", "E4", "F2"],
    ["A4", N, N],
    [N, N, "F3"],
    ["E5", N, N],
    ["F5", "C5", N],
    ["F5", N, N],
    [N, N, "C3"],
    ["A5", N, N],
    ["E5", "B4", "E2"],
    ["E5", N, N],
    [N, N, "E3"],
    ["G5", N, N],
    ["A4", "E4", N],
    ["A4", N, N],
    [N, N, "A3"],
    ["C5", N, N],
  ],
  noise: [
    2,
    N,
    1,
    N,
    2,
    N,
    1,
    N,
    2,
    N,
    1,
    N,
    2,
    N,
    1,
    N,
    2,
    N,
    1,
    N,
    2,
    N,
    1,
    N,
    2,
    N,
    1,
    N,
    2,
    N,
    1,
    N,
  ],
};

/** Boss — slower, ominous, with a tritone. */
export const SONG_BOSS: Song = {
  bpm: 100,
  loop: true,
  steps: [
    ["E4", "B3", "E2"],
    [N, N, N],
    ["G4", N, N],
    [N, N, N],
    ["A4", "E4", N],
    [N, N, N],
    ["B4", N, "B2"],
    [N, N, N],
    ["D5", "A4", "A2"],
    [N, N, N],
    ["B4", N, N],
    [N, N, N],
    ["A4", "F4", N],
    [N, N, N],
    ["G4", N, "G2"],
    [N, N, N],
    ["F4", "C4", "F2"],
    [N, N, N],
    ["A4", N, N],
    [N, N, N],
    ["G4", "D4", N],
    [N, N, N],
    ["F4", N, "F2"],
    [N, N, N],
    ["E4", "B3", "E2"],
    [N, N, N],
    ["G4", N, N],
    [N, N, N],
    ["A4", "C5", N],
    [N, N, N],
    ["B4", N, "B2"],
    [N, N, N],
  ],
  noise: [
    2,
    N,
    N,
    N,
    N,
    N,
    1,
    N,
    2,
    N,
    N,
    N,
    N,
    N,
    1,
    1,
    2,
    N,
    N,
    N,
    N,
    N,
    1,
    N,
    2,
    N,
    N,
    N,
    1,
    N,
    1,
    1,
  ],
};

/** Last Day — muted, piano-like, melancholy minor. */
export const SONG_LASTDAY: Song = {
  bpm: 60,
  loop: true,
  steps: [
    ["A4", N, "A2"],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    ["C5", N, N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    ["E4", N, "E2"],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    ["G4", N, N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    ["F4", N, "F2"],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    ["A4", N, N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    ["E4", N, "C2"],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    ["D4", N, N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
  ],
};

/** Crossing — held drone with sparse high tones. Almost music. */
export const SONG_CROSSING: Song = {
  bpm: 50,
  loop: true,
  steps: [
    [N, N, "A2"],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    ["A5", N, N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    [N, N, "G2"],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    ["E5", N, N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
  ],
};

/** Epilogue — major-key resolution, gentle. */
export const SONG_EPILOGUE: Song = {
  bpm: 72,
  loop: true,
  steps: [
    ["C5", "E4", "C3"],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    ["E5", "G4", N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    ["G5", "C5", "G2"],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    ["E5", "G4", N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    ["F5", "A4", "F2"],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    ["A5", "C5", N],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    ["G5", "B4", "G2"],
    [N, N, N],
    [N, N, N],
    [N, N, N],
    ["E5", "C5", "C3"],
    [N, N, N],
    [N, N, N],
    [N, N, N],
  ],
};
