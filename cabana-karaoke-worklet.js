/* ═══════════════════════════════════════════════════════════════════
   CABANA KARAOKE · the voice worklet
   ───────────────────────────────────────────────────────────────────
   Runs on the audio thread, next to the microphone. Fifty times a
   second it reports what the singer is doing:

     f0   the sung pitch in Hz (YIN, on a 16 kHz copy of the signal),
          0 when nothing pitched is there
     c    how sure it is (1 − the YIN dip)
     db   loudness, dBFS

   When the room asks for it (a live room with listeners), it also
   hands over the voice itself, resampled to 12 kHz in 40 ms chunks,
   for the relay. Nothing leaves the device from here; the page
   decides what is sent.
   ═══════════════════════════════════════════════════════════════════ */
/* global sampleRate, currentTime, registerProcessor, AudioWorkletProcessor */
class CabanaVoice extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sr = sampleRate;
    this.dec = Math.max(1, Math.round(this.sr / 16000));
    this.rate = this.sr / this.dec;
    this.W = Math.round(this.rate * 0.032);            /* 32 ms integration window */
    this.tauMin = Math.floor(this.rate / 1100);
    this.tauMax = Math.ceil(this.rate / 65);
    this.N = this.W + this.tauMax + 2;
    this.ring = new Float32Array(this.N * 2);
    this.w = 0;
    this.filled = 0;
    this.hop = Math.round(this.rate / 50);             /* 20 ms */
    this.sinceHop = 0;
    this.acc = 0; this.accN = 0;                        /* decimation */
    this.sq = 0; this.sqN = 0;                          /* rms at full rate */
    this.d = new Float32Array(this.tauMax + 1);
    this.frame = new Float32Array(this.N);
    /* relay */
    this.relay = false;
    this.rOut = 12000;
    this.rStep = this.sr / this.rOut;
    this.rPos = 0;
    this.rBuf = new Int16Array(480);
    this.rN = 0;
    this.prev = 0;
    this.port.onmessage = (e) => {
      const m = e.data || {};
      if (m.relay != null) { this.relay = !!m.relay; this.rN = 0; }
    };
  }

  yin() {
    const N = this.N, W = this.W, x = this.frame, d = this.d;
    /* newest N samples, oldest first */
    const L = this.ring.length;
    for (let i = 0; i < N; i++) x[i] = this.ring[(this.w - N + i + L) % L];
    let running = 0, best = -1;
    d[0] = 1;
    for (let tau = 1; tau <= this.tauMax; tau++) {
      let s = 0;
      for (let j = 0; j < W; j++) { const v = x[j] - x[j + tau]; s += v * v; }
      running += s;
      d[tau] = running > 0 ? s * tau / running : 1;
    }
    for (let tau = this.tauMin; tau <= this.tauMax; tau++) {
      if (d[tau] < 0.15) {
        while (tau + 1 <= this.tauMax && d[tau + 1] < d[tau]) tau++;
        best = tau;
        break;
      }
    }
    if (best < 0) return { f0: 0, c: 0 };
    /* parabolic interpolation around the dip */
    let t = best;
    if (best > 1 && best < this.tauMax) {
      const a = d[best - 1], b = d[best], c = d[best + 1];
      const den = a + c - 2 * b;
      if (den !== 0) t = best + (a - c) / (2 * den);
    }
    return { f0: this.rate / t, c: 1 - d[best] };
  }

  process(inputs) {
    const input = inputs[0];
    const ch = input && input[0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      const s = ch[i];
      this.sq += s * s; this.sqN++;
      this.acc += s; this.accN++;
      if (this.accN >= this.dec) {
        const v = this.acc / this.accN;
        this.acc = 0; this.accN = 0;
        this.ring[this.w] = v;
        this.w = (this.w + 1) % this.ring.length;
        if (this.filled < this.N) this.filled++;
        if (++this.sinceHop >= this.hop) {
          this.sinceHop = 0;
          const rms = Math.sqrt(this.sq / Math.max(1, this.sqN));
          this.sq = 0; this.sqN = 0;
          const db = rms > 1e-7 ? 20 * Math.log10(rms) : -140;
          let f0 = 0, c = 0;
          if (this.filled >= this.N && db > -58) {
            const r = this.yin();
            if (r.f0 >= 65 && r.f0 <= 1100) { f0 = r.f0; c = r.c; }
          }
          this.port.postMessage({ t: currentTime, f0: f0, c: c, db: db });
        }
      }
      if (this.relay) {
        /* linear resample to 12 kHz; the one-pole smoothing keeps most
           of the aliasing out of a voice-band signal */
        const sm = this.prev + (s - this.prev) * 0.55;
        this.prev = sm;
        this.rPos += 1;
        while (this.rPos >= this.rStep) {
          this.rPos -= this.rStep;
          const v = Math.max(-1, Math.min(1, sm));
          this.rBuf[this.rN++] = v < 0 ? v * 0x8000 : v * 0x7fff;
          if (this.rN >= this.rBuf.length) {
            const out = this.rBuf;
            this.port.postMessage({ pcm: out, t: currentTime + i / this.sr }, [out.buffer]);
            this.rBuf = new Int16Array(480);
            this.rN = 0;
          }
        }
      }
    }
    return true;
  }
}

registerProcessor('cabana-voice', CabanaVoice);
