/**
 * gate.js - The Invisible Beginning
 * NOTHING is revealed. We observe. We measure. We decide.
 *
 * Layer 0: CSS Gates (already running)
 * Layer 1: This file - JS fingerprinting + SW installation
 */

/**
 * Read CSS custom properties set by Layer 0
 * These are set via @media queries and CSS animations
 */
function readCSSGates() {
  const root = document.documentElement;
  const styles = getComputedStyle(root);

  // Read media query results
  const get = (prop) => parseInt(styles.getPropertyValue(prop).trim()) || 0;

  return {
    // Media fingerprint (auto-detected by CSS)
    hasHover: get('--has-hover'),
    hasPointer: get('--has-pointer'),
    prefersDark: get('--prefers-dark'),
    allowsMotion: get('--allows-motion'),
    isHidpi: get('--is-hidpi'),
    hasP3: get('--has-p3'),

    // Interactive gate states (set by CSS when completed)
    timeGate: get('--css-time-gate'),
    hoverGate: get('--css-hover-gate'),
    scrollGate: get('--css-scroll-gate'),
    clickGate: get('--css-click-gate'),
    focusGate: get('--css-focus-gate'),
    checkboxGate: get('--css-checkbox-gate'),

    // Count how many media features detected
    mediaCount: ['--has-hover', '--has-pointer', '--prefers-dark', '--allows-motion', '--is-hidpi', '--has-p3']
      .filter(p => get(p) === 1).length
  };
}

/**
 * Observe CSS gate completions and report to SW
 */
function observeCSSGates(callback) {
  // Watch for checkbox changes
  document.querySelectorAll('.checkbox-gate input').forEach(cb => {
    cb.addEventListener('change', () => {
      const all = document.querySelectorAll('.checkbox-gate input:checked').length === 3;
      if (all) callback('checkbox', true);
    });
  });

  // Watch for hover gate completion (via MutationObserver on status dot)
  const hoverStatus = document.querySelector('.hover-gate .css-status');
  if (hoverStatus) {
    const observer = new MutationObserver(() => {
      const bg = getComputedStyle(hoverStatus).backgroundColor;
      if (bg.includes('0, 255, 0') || bg.includes('0, 255, 0')) {
        callback('hover', true);
        observer.disconnect();
      }
    });
    observer.observe(hoverStatus, { attributes: true, attributeFilter: ['style', 'class'] });
  }

  // Watch for scroll progress
  let scrollReported = false;
  window.addEventListener('scroll', () => {
    if (scrollReported) return;
    const scrolled = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    if (scrolled > 0.8) {
      callback('scroll', true);
      scrollReported = true;
    }
  }, { passive: true });
}

(async () => {
  // Stage 0: Can we even run?
  if (!window.crypto?.subtle) return;
  if (!window.WebAssembly) return;
  if (typeof navigator === 'undefined') return;

  // Read CSS Layer 0 signals
  const cssSignals = readCSSGates();

  // Stage 1: Instant signals (no fingerprinting yet - just obvious tells)
  const signals = {
    // CSS Layer 0 results
    cssMediaHover: cssSignals.hasHover,
    cssMediaPointer: cssSignals.hasPointer,
    cssMediaDark: cssSignals.prefersDark,
    cssMediaMotion: cssSignals.allowsMotion,
    cssMediaHidpi: cssSignals.isHidpi,
    cssMediaP3: cssSignals.hasP3,
    // JS detection
    webdriver: navigator.webdriver === true,
    headless: /HeadlessChrome/i.test(navigator.userAgent),
    phantom: !!(window.callPhantom || window._phantom),
    nightmare: !!window.__nightmare,
    selenium: !!(document.__selenium_unwrapped || document.__webdriver_evaluate || document.__webdriver_script_fn),
    puppeteer: !!window.__puppeteer_evaluation_script__,
    playwright: !!window._playwrightBinding,
    cdc: Object.keys(window).some(k => /^cdc_|^_cdc/.test(k)),
    devtools: window.outerWidth - window.innerWidth > 160 || window.outerHeight - window.innerHeight > 160,
    bot: /bot|crawl|spider|slurp|googlebot|bingbot|yandex|baidu/i.test(navigator.userAgent)
  };

  // Threshold 0: If obviously automated, load nothing - silent exit
  const autoScore = Object.values(signals).filter(Boolean).length;
  if (autoScore >= 2) return;

  // Stage 2: Load vector-gate module (WASM in production, JS polyfill for now)
  let VectorGate;
  try {
    // Try WASM first
    const wasmModule = await import('./vector-gate.wasm.js');
    VectorGate = wasmModule.VectorGate;
  } catch {
    // Fallback to JS implementation
    const jsModule = await import('./vector-gate.js');
    VectorGate = jsModule.VectorGate;
  }

  const gate = new VectorGate();

  // Stage 3: Deep fingerprint (harder to detect than inline JS)
  const vector = await gate.fingerprint();
  const organic = await gate.attest(vector);

  // Threshold 1: Minimum organic score to continue
  if (organic < 0.3) return; // Silent exit - reveal nothing

  // Stage 4: Install the service worker (the real brain)
  if (!('serviceWorker' in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.register('./vector-sw.js', { scope: './' });

    // Wait for SW to be ready
    await navigator.serviceWorker.ready;

    // Stage 5: Handshake with SW
    const active = reg.active || reg.installing || reg.waiting;
    if (active) {
      active.postMessage({
        type: 'init',
        vector: Array.from(vector),
        organic,
        signals,
        cssSignals,
        timestamp: Date.now()
      });
    }

    // Stage 5.5: Observe CSS gate completions and report to SW
    observeCSSGates((gateType, passed) => {
      if (active && passed) {
        active.postMessage({
          type: 'css-gate-complete',
          gate: gateType,
          timestamp: Date.now()
        });
      }
    });

    // Stage 6: Listen for SW instructions
    navigator.serviceWorker.addEventListener('message', async (event) => {
      const { type, payload } = event.data || {};

      switch (type) {
        case 'load-stage':
          // SW tells us what to load next
          if (payload?.module) {
            const module = await import(payload.module);
            if (module.mount && payload.container) {
              const container = document.body;
              module.mount(container, payload.state);
            }
          }
          break;

        case 'challenge':
          // SW requests additional attestation
          const result = await gate.challenge(payload);
          active.postMessage({ type: 'challenge-response', payload: result });
          break;

        case 'unlock':
          // SW grants access to new features
          console.debug('[gate] Unlocked:', payload?.features);
          break;
      }
    });

  } catch (e) {
    // Silent failure - reveal nothing
    return;
  }

  // The dance begins...
})();
