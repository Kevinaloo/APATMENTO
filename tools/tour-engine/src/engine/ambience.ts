/* A quiet neighbourhood soundscape, made on the spot with WebAudio.

   Nothing is downloaded: every sound is synthesised from noise and
   oscillators, and follows the simulated hour and weather.
     dawn       birdsong: short FM chirps in loose phrases
     daytime    the city far off: brown noise through a low-pass, slowly swelling
     evening    crickets: band-passed noise pulsed in chirps
     rain       a soft band-limited hiss
   The whole mix stays under a master gain of 0.12, fades in and out over
   1.5 s and is suspended (no CPU) whenever it is off, the tab is hidden or
   the tour is paused. */
import { clamp, smoothstep } from './util';

export type AmbienceScene = { hour: number; elevation: number; rain: boolean };

const MASTER = 0.1;
const FADE = 1.5;
const LAYER = { city: 0.55, birds: 0.32, crickets: 0.5, rain: 0.75 };
const LAYER_NAMES = ['city', 'birds', 'crickets', 'rain'] as const;

type Layers = { city: GainNode; birds: GainNode; crickets: GainNode; rain: GainNode };

export class Ambience {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private layers: Layers | null = null;
  private pulses: GainNode[] = [];
  private nextChirp = [0, 0];
  private nextPhrase = 0;
  private sources: AudioScheduledSourceNode[] = [];
  private timer = 0;
  private sleepTimer = 0;
  private on = false;
  private held = false;
  private level = { city: 0, birds: 0, crickets: 0, rain: 0 };

  /** For local diagnostics: the audio clock state and the master level. */
  get state() { return this.ctx ? `${this.ctx.state}:${this.master ? this.master.gain.value.toFixed(3) : 0}` : 'off'; }

  /** Must be called from a user gesture the first time: browsers only start audio after one. */
  setOn(on: boolean) {
    this.on = on;
    if (on && !this.ctx && !this.create()) return;
    this.apply();
  }

  /** Tab hidden or tour paused. */
  setHeld(held: boolean) {
    if (this.held === held) return;
    this.held = held;
    this.apply();
  }

  setScene(scene: AmbienceScene) {
    const e = scene.elevation, morning = scene.hour < 12;
    const dawnChorus = smoothstep(-9, -2, e) * (1 - smoothstep(12, 32, e)) * (morning ? 1 : 0.2);
    this.level.birds = clamp(dawnChorus + smoothstep(2, 12, e) * 0.22, 0, 1) * (scene.rain ? 0.25 : 1);
    this.level.city = (0.3 + 0.7 * smoothstep(-6, 8, e)) * (scene.rain ? 0.7 : 1);
    this.level.crickets = (1 - smoothstep(-5, 5, e)) * (scene.rain ? 0.2 : 1);
    this.level.rain = scene.rain ? 1 : 0;
    if (this.ctx && this.layers) {
      const t = this.ctx.currentTime;
      for (const name of LAYER_NAMES) {
        this.layers[name].gain.setTargetAtTime(this.level[name] * LAYER[name], t, 0.8);
      }
    }
  }

  dispose() {
    clearInterval(this.timer);
    clearTimeout(this.sleepTimer);
    for (const s of this.sources) { try { s.stop(); } catch { /* already stopped */ } }
    this.sources = [];
    if (this.ctx) this.ctx.close().catch(() => {});
    this.ctx = null;
    this.master = null;
    this.layers = null;
  }

  private create() {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return false;
    const ctx = new Ctx({ latencyHint: 'playback' });
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.master = master;

    const brown = noiseBuffer(ctx, 6, true), white = noiseBuffer(ctx, 3, false);
    const layer = () => { const g = ctx.createGain(); g.gain.value = 0; g.connect(master); return g; };
    const layers: Layers = { city: layer(), birds: layer(), crickets: layer(), rain: layer() };
    this.layers = layers;

    // City: a low rumble that breathes very slowly, like traffic a few streets away.
    const swell = ctx.createGain();
    swell.gain.value = 0.75;
    const lfo = ctx.createOscillator(), lfoDepth = ctx.createGain();
    lfo.frequency.value = 0.031;
    lfoDepth.gain.value = 0.25;
    lfo.connect(lfoDepth).connect(swell.gain);
    this.loop(brown).connect(biquad(ctx, 'lowpass', 340, 0.6)).connect(swell).connect(layers.city);
    lfo.start();
    this.sources.push(lfo);

    // Rain: hiss with the lowest and highest bands taken out, so it sits behind everything.
    this.loop(white).connect(biquad(ctx, 'highpass', 650, 0.5)).connect(biquad(ctx, 'lowpass', 6200, 0.4)).connect(layers.rain);

    // Crickets: two voices a little apart in pitch, each a narrow band of noise pulsed in chirps.
    for (const f of [4350, 5150]) {
      const pulse = ctx.createGain();
      pulse.gain.value = 0;
      this.loop(white).connect(biquad(ctx, 'bandpass', f, 24)).connect(pulse).connect(layers.crickets);
      this.pulses.push(pulse);
    }
    const t = ctx.currentTime;
    this.nextChirp = [t + 0.2, t + 0.5];
    this.nextPhrase = t + 0.4;
    return true;
  }

  private loop(buffer: AudioBuffer) {
    const ctx = this.ctx!;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    // The tail was cross-faded into the samples before loopStart, so the jump back is seamless.
    source.loopStart = loopEdge(buffer.length) / buffer.sampleRate;
    source.loopEnd = buffer.duration;
    // Start each loop at a different offset so identical buffers never phase against each other.
    source.start(0, source.loopStart + Math.random() * (buffer.duration - source.loopStart));
    this.sources.push(source);
    return source;
  }

  private apply() {
    const ctx = this.ctx, master = this.master;
    if (!ctx || !master) return;
    const audible = this.on && !this.held;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    clearTimeout(this.sleepTimer);
    if (audible) {
      ctx.resume().catch(() => {});
      master.gain.linearRampToValueAtTime(MASTER, t + FADE);
      if (!this.timer) this.timer = window.setInterval(() => this.schedule(), 200);
      this.schedule();
    } else {
      // A hidden tab can't hear a long fade; a switch-off should get the full one.
      const fade = this.on ? 0.35 : FADE;
      master.gain.linearRampToValueAtTime(0, t + fade);
      this.sleepTimer = window.setTimeout(() => {
        clearInterval(this.timer);
        this.timer = 0;
        if (this.ctx && !(this.on && !this.held)) this.ctx.suspend().catch(() => {});
      }, fade * 1000 + 120);
    }
  }

  /** Look-ahead scheduler: events are placed on the audio clock up to half a second ahead. */
  private schedule() {
    const ctx = this.ctx;
    if (!ctx || !this.layers || ctx.state !== 'running') return;
    const horizon = ctx.currentTime + 0.5;
    for (let v = 0; v < this.pulses.length; v++) {
      if (this.nextChirp[v] < ctx.currentTime) this.nextChirp[v] = ctx.currentTime + 0.05;
      while (this.nextChirp[v] < horizon) {
        const start = this.nextChirp[v], g = this.pulses[v].gain;
        const pulses = 3 + (Math.random() < 0.4 ? 1 : 0);
        for (let p = 0; p < pulses; p++) {
          const at = start + p * 0.034;
          g.setValueAtTime(0, at);
          g.linearRampToValueAtTime(1, at + 0.005);
          g.setValueAtTime(1, at + 0.013);
          g.linearRampToValueAtTime(0, at + 0.019);
        }
        this.nextChirp[v] = start + 0.5 + Math.random() * 0.55;
      }
    }
    if (this.level.birds > 0.02) {
      if (this.nextPhrase < ctx.currentTime) this.nextPhrase = ctx.currentTime + 0.1;
      while (this.nextPhrase < horizon) {
        this.phrase(this.nextPhrase);
        // A dawn chorus is busy; a midday garden has the odd call.
        this.nextPhrase += (1.2 + Math.random() * 4.5) / (0.35 + this.level.birds);
      }
    }
  }

  /** One bird: a few frequency-modulated chirps, placed somewhere in the stereo field. */
  private phrase(start: number) {
    const ctx = this.ctx!, out = this.layers!.birds;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; pan.connect(out); }
    const dest = pan || out;
    const high = Math.random() < 0.5;
    const notes = 2 + Math.floor(Math.random() * 4);
    let at = start;
    const nodes: AudioNode[] = pan ? [pan] : [];
    let last: OscillatorNode | null = null;
    for (let n = 0; n < notes; n++) {
      const length = 0.05 + Math.random() * 0.11;
      const f0 = (high ? 3600 : 2300) + Math.random() * 1500;
      const f1 = f0 * (Math.random() < 0.6 ? 0.72 + Math.random() * 0.2 : 1.12 + Math.random() * 0.25);
      const carrier = ctx.createOscillator(), mod = ctx.createOscillator(), depth = ctx.createGain(), env = ctx.createGain();
      carrier.frequency.setValueAtTime(f0, at);
      carrier.frequency.exponentialRampToValueAtTime(f1, at + length);
      mod.frequency.value = 28 + Math.random() * 60;
      depth.gain.value = 90 + Math.random() * 320;
      mod.connect(depth).connect(carrier.frequency);
      env.gain.setValueAtTime(0, at);
      env.gain.linearRampToValueAtTime(0.5 + Math.random() * 0.5, at + 0.012);
      env.gain.exponentialRampToValueAtTime(0.001, at + length);
      carrier.connect(env).connect(dest);
      carrier.start(at); mod.start(at);
      carrier.stop(at + length + 0.02); mod.stop(at + length + 0.02);
      nodes.push(carrier, mod, depth, env);
      last = carrier;
      at += length + 0.035 + Math.random() * 0.1;
    }
    if (last) last.onended = () => nodes.forEach(node => node.disconnect());
  }
}

const loopEdge = (length: number) => Math.min(2048, length >> 2);

function biquad(ctx: AudioContext, type: BiquadFilterType, frequency: number, q: number) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  f.Q.value = q;
  return f;
}

/** White noise, or brown noise (integrated white noise: the rumble of distant traffic). */
function noiseBuffer(ctx: AudioContext, seconds: number, brown: boolean) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * white) / 1.02; data[i] = last * 3.5; } else data[i] = white * 0.5;
  }
  // Cross-fade the tail into the head so the loop point never clicks (the loop restarts at `edge`).
  const edge = loopEdge(data.length);
  for (let i = 0; i < edge; i++) {
    const t = i / edge, j = data.length - edge + i;
    data[j] = data[j] * (1 - t) + data[i] * t;
  }
  return buffer;
}
