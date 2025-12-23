/**
 * vector-gate.js - Deep Fingerprinting Module
 * JS implementation (WASM version would be vector-gate.wasm.js)
 * Creates 128-dimensional vector from browser signals
 */

export class VectorGate {
  constructor() {
    this.vector = null;
    this.fingerprint_hash = null;
  }

  /**
   * Generate 128-dimensional fingerprint vector
   */
  async fingerprint() {
    const signals = await Promise.all([
      this.#canvasFingerprint(),
      this.#webglFingerprint(),
      this.#audioFingerprint(),
      this.#fontFingerprint(),
      this.#timingAnalysis(),
      this.#mathPrecision(),
      this.#memoryPatterns(),
      this.#screenMetrics(),
      this.#hardwareSignals(),
      this.#browserFeatures()
    ]);

    // Flatten all signals into raw values
    const raw = signals.flat();

    // Normalize to 128-dimensional vector
    this.vector = this.#normalize(raw, 128);
    this.fingerprint_hash = await this.#hash(this.vector);

    return this.vector;
  }

  /**
   * Attest organic score from vector
   */
  async attest(vector) {
    let score = 0.5; // Base score

    // Check for fingerprint consistency
    const variance = this.#variance(vector);
    if (variance > 0.1) score += 0.1; // Natural variance is good

    // Check for suspicious patterns
    const zeros = vector.filter(v => v === 0).length;
    if (zeros > vector.length * 0.3) score -= 0.2; // Too many zeros = suspicious

    // Check for perfect patterns (bot-like)
    const sorted = [...vector].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const nearMedian = vector.filter(v => Math.abs(v - median) < 0.01).length;
    if (nearMedian > vector.length * 0.5) score -= 0.15; // Too uniform

    // Timing entropy check
    const timingEntropy = this.#entropy(vector.slice(64, 80));
    if (timingEntropy > 3) score += 0.1; // Good timing entropy

    // Clamp to 0-1
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Handle challenge from service worker
   */
  async challenge(payload) {
    const { type, data } = payload || {};

    switch (type) {
      case 'pow':
        return await this.#proofOfWork(data.challenge, data.difficulty);

      case 'behavioral':
        return await this.#behavioralChallenge(data);

      case 'timing':
        return await this.#timingChallenge(data);

      default:
        return null;
    }
  }

  // ========== FINGERPRINTING METHODS ==========

  async #canvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');

      // Draw complex pattern
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('squatch.cc', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('vector', 4, 17);

      // Add curves
      ctx.beginPath();
      ctx.arc(50, 25, 20, 0, Math.PI * 2);
      ctx.stroke();

      const data = canvas.toDataURL();
      const hash = await this.#hash(data);
      return this.#hashToFloats(hash, 16);
    } catch {
      return new Array(16).fill(0);
    }
  }

  async #webglFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return new Array(16).fill(0);

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const signals = [
        gl.getParameter(gl.VENDOR),
        gl.getParameter(gl.RENDERER),
        debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : '',
        debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '',
        gl.getParameter(gl.VERSION),
        gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        gl.getParameter(gl.MAX_TEXTURE_SIZE),
        gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
        gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
        gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS)
      ];

      const hash = await this.#hash(signals.join('|'));
      return this.#hashToFloats(hash, 16);
    } catch {
      return new Array(16).fill(0);
    }
  }

  async #audioFingerprint() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return new Array(12).fill(0);

      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const analyser = ctx.createAnalyser();
      const gain = ctx.createGain();
      const compressor = ctx.createDynamicsCompressor();

      oscillator.type = 'triangle';
      oscillator.frequency.value = 10000;
      gain.gain.value = 0;

      oscillator.connect(compressor);
      compressor.connect(analyser);
      analyser.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start(0);

      const dataArray = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(dataArray);

      oscillator.stop();
      ctx.close();

      // Extract first 12 meaningful values
      const values = Array.from(dataArray.slice(0, 12)).map(v => isFinite(v) ? v : 0);
      return values.map(v => (v + 140) / 140); // Normalize to 0-1
    } catch {
      return new Array(12).fill(0);
    }
  }

  async #fontFingerprint() {
    const testFonts = [
      'Arial', 'Arial Black', 'Courier', 'Courier New', 'Georgia',
      'Helvetica', 'Impact', 'Times', 'Times New Roman', 'Trebuchet MS',
      'Verdana', 'Comic Sans MS', 'Lucida Console', 'Palatino Linotype'
    ];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const testString = 'mmmmmmmmmmlli';
    const baseFont = 'monospace';

    ctx.font = `72px ${baseFont}`;
    const baseWidth = ctx.measureText(testString).width;

    const detected = testFonts.map(font => {
      ctx.font = `72px '${font}', ${baseFont}`;
      return ctx.measureText(testString).width !== baseWidth ? 1 : 0;
    });

    return detected.map(v => v * 0.7 + 0.15); // Scale to 0.15-0.85
  }

  async #timingAnalysis() {
    const samples = [];
    const iterations = 50;

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      // Do some work
      let x = 0;
      for (let j = 0; j < 1000; j++) {
        x += Math.sin(j) * Math.cos(j);
      }
      const end = performance.now();
      samples.push(end - start);
    }

    // Statistical features
    const mean = samples.reduce((a, b) => a + b) / samples.length;
    const variance = samples.reduce((s, v) => s + (v - mean) ** 2, 0) / samples.length;
    const sorted = [...samples].sort((a, b) => a - b);
    const median = sorted[Math.floor(samples.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const range = max - min;

    // Normalize and return 16 timing features
    return [
      mean / 10, variance / 10, median / 10, min / 10, max / 10, range / 10,
      ...samples.slice(0, 10).map(v => v / 10)
    ].map(v => Math.min(1, v));
  }

  async #mathPrecision() {
    const tests = [
      Math.tan(-1e300),
      Math.sin(0.5),
      Math.cos(0.5),
      Math.exp(1),
      Math.log(2),
      Math.sqrt(2),
      Math.pow(2, 53),
      Math.atan2(1, 1),
      Math.sinh(1),
      Math.cosh(1)
    ];

    return tests.map(v => {
      if (!isFinite(v)) return 0.5;
      // Extract mantissa bits
      const str = v.toString();
      const hash = str.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
      return ((hash & 0xFFFF) / 0xFFFF);
    });
  }

  async #memoryPatterns() {
    const arrays = [];
    const signals = [];

    // Allocation timing
    const start = performance.now();
    for (let i = 0; i < 10; i++) {
      arrays.push(new ArrayBuffer(1024 * 1024)); // 1MB each
    }
    const allocTime = performance.now() - start;

    // GC hints
    const beforeGC = performance.memory?.usedJSHeapSize || 0;
    arrays.length = 0; // Release
    const afterGC = performance.memory?.usedJSHeapSize || 0;

    signals.push(
      allocTime / 100,
      beforeGC / (1024 * 1024 * 1024),
      afterGC / (1024 * 1024 * 1024),
      (beforeGC - afterGC) / (1024 * 1024),
      performance.memory?.jsHeapSizeLimit / (1024 * 1024 * 1024) || 0,
      navigator.deviceMemory || 0
    );

    // Pad to 10 values
    while (signals.length < 10) signals.push(0);
    return signals.slice(0, 10).map(v => Math.min(1, v));
  }

  async #screenMetrics() {
    return [
      screen.width / 3840,
      screen.height / 2160,
      screen.colorDepth / 32,
      screen.pixelDepth / 32,
      window.devicePixelRatio / 3,
      screen.availWidth / 3840,
      screen.availHeight / 2160,
      (screen.width * screen.height) / (3840 * 2160)
    ].map(v => Math.min(1, v));
  }

  async #hardwareSignals() {
    return [
      navigator.hardwareConcurrency / 32 || 0.25,
      navigator.maxTouchPoints / 10 || 0,
      ('ontouchstart' in window) ? 1 : 0,
      navigator.pdfViewerEnabled ? 1 : 0,
      navigator.cookieEnabled ? 1 : 0,
      navigator.doNotTrack === '1' ? 1 : 0,
      navigator.languages?.length / 10 || 0.1,
      window.matchMedia('(prefers-color-scheme: dark)').matches ? 1 : 0
    ];
  }

  async #browserFeatures() {
    return [
      'serviceWorker' in navigator ? 1 : 0,
      'credentials' in navigator ? 1 : 0,
      'bluetooth' in navigator ? 1 : 0,
      'usb' in navigator ? 1 : 0,
      'xr' in navigator ? 1 : 0,
      'gpu' in navigator ? 1 : 0,
      typeof SharedArrayBuffer !== 'undefined' ? 1 : 0,
      typeof Atomics !== 'undefined' ? 1 : 0,
      typeof BigInt !== 'undefined' ? 1 : 0,
      typeof WebAssembly !== 'undefined' ? 1 : 0,
      typeof OffscreenCanvas !== 'undefined' ? 1 : 0,
      'locks' in navigator ? 1 : 0
    ];
  }

  // ========== CHALLENGE METHODS ==========

  async #proofOfWork(challenge, difficulty) {
    const target = '0'.repeat(difficulty);
    let nonce = 0;
    const maxIterations = 1000000;

    while (nonce < maxIterations) {
      const attempt = await this.#hash(challenge + nonce);
      if (attempt.startsWith(target)) {
        return { nonce, hash: attempt };
      }
      nonce++;
      // Yield every 1000 iterations
      if (nonce % 1000 === 0) {
        await new Promise(r => setTimeout(r, 0));
      }
    }

    return null; // Failed
  }

  async #behavioralChallenge(data) {
    // Collect behavioral signals over time
    return new Promise(resolve => {
      const signals = {
        mouseMovements: [],
        scrollEvents: [],
        keyPresses: []
      };

      const handlers = {
        mousemove: (e) => signals.mouseMovements.push({ x: e.clientX, y: e.clientY, t: Date.now() }),
        scroll: () => signals.scrollEvents.push({ y: window.scrollY, t: Date.now() }),
        keydown: () => signals.keyPresses.push({ t: Date.now() })
      };

      Object.entries(handlers).forEach(([event, handler]) => {
        document.addEventListener(event, handler, { passive: true });
      });

      setTimeout(() => {
        Object.entries(handlers).forEach(([event, handler]) => {
          document.removeEventListener(event, handler);
        });
        resolve(signals);
      }, data.duration || 5000);
    });
  }

  async #timingChallenge(data) {
    const results = [];
    for (let i = 0; i < (data.samples || 10); i++) {
      const start = performance.now();
      await new Promise(r => setTimeout(r, 10));
      results.push(performance.now() - start);
    }
    return results;
  }

  // ========== UTILITY METHODS ==========

  #normalize(values, targetLength) {
    const result = new Float32Array(targetLength);

    if (values.length >= targetLength) {
      // Downsample
      for (let i = 0; i < targetLength; i++) {
        const idx = Math.floor(i * values.length / targetLength);
        result[i] = values[idx];
      }
    } else {
      // Interpolate
      for (let i = 0; i < values.length; i++) {
        result[i] = values[i];
      }
      // Fill remaining with hash-derived values
      for (let i = values.length; i < targetLength; i++) {
        result[i] = (result[i - 1] * 0.7 + result[i % values.length] * 0.3);
      }
    }

    // Ensure 0-1 range
    for (let i = 0; i < targetLength; i++) {
      result[i] = Math.max(0, Math.min(1, result[i]));
    }

    return result;
  }

  async #hash(data) {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  #hashToFloats(hash, count) {
    const floats = [];
    for (let i = 0; i < count && i * 4 < hash.length; i++) {
      const hex = hash.substring(i * 4, i * 4 + 4);
      floats.push(parseInt(hex, 16) / 65535);
    }
    while (floats.length < count) floats.push(0);
    return floats;
  }

  #variance(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  }

  #entropy(values) {
    const counts = {};
    const binned = values.map(v => Math.floor(v * 10));
    binned.forEach(v => counts[v] = (counts[v] || 0) + 1);
    const total = binned.length;
    return -Object.values(counts).reduce((e, c) => {
      const p = c / total;
      return e + p * Math.log2(p);
    }, 0);
  }
}
