/**
 * app.js - Main Application
 * Only loaded after gate passes threshold 0.3
 */

const STAGES = [
  { id: 'fingerprint', label: 'Vector Gate', desc: 'Content filtering via similarity' },
  { id: 'behavioral', label: 'Behavioral', desc: 'Mouse, scroll, timing patterns' },
  { id: 'pow', label: 'Proof of Work', desc: 'Compute hash challenge' },
  { id: 'email', label: 'Email', desc: 'Click verification link' },
  { id: 'passkey', label: 'Passkey', desc: 'WebAuthn usernameless-first' },
  { id: 'attestation', label: 'Full Attestation', desc: 'Human vouches for you' }
];

export function mount(container, state) {
  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0a0a; color: #888; font-family: system-ui, -apple-system, sans-serif; min-height: 100vh; }
    .container { padding: 40px 20px; max-width: 900px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #1a1a1a; }
    .logo { font-size: 24px; color: #fff; font-weight: 300; letter-spacing: -0.5px; }
    .organic-badge { font-size: 11px; padding: 8px 16px; background: #0f0f0f; border: 1px solid #222; border-radius: 4px; }
    .organic-badge span { color: #0f0; font-weight: 600; }
    .hero { text-align: center; padding: 60px 0; }
    .hero h1 { font-size: 36px; color: #fff; font-weight: 300; margin-bottom: 16px; }
    .hero p { color: #555; font-size: 14px; max-width: 500px; margin: 0 auto; line-height: 1.6; }
    .stages { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin: 40px 0; }
    .stage { padding: 16px; background: #0f0f0f; border: 1px solid #1a1a1a; transition: all 0.3s; }
    .stage.unlocked { border-color: #0f02; }
    .stage.current { border-color: #0f0; background: #0f01; }
    .stage.locked { opacity: 0.4; }
    .stage h3 { font-size: 12px; color: #fff; font-weight: 500; margin-bottom: 6px; }
    .stage p { font-size: 10px; color: #555; line-height: 1.4; }
    .stage .status { font-size: 9px; margin-top: 10px; font-weight: 600; letter-spacing: 0.5px; }
    .stage.unlocked .status { color: #0f04; }
    .stage.current .status { color: #0f0; }
    .stage.locked .status { color: #333; }
    .vector-state { background: #0f0f0f; border: 1px solid #1a1a1a; padding: 20px; margin: 40px 0; }
    .vector-state h3 { font-size: 12px; color: #fff; margin-bottom: 16px; font-weight: 500; }
    .vector-state .row { display: flex; justify-content: space-between; font-size: 11px; padding: 6px 0; border-bottom: 1px solid #151515; font-family: 'SF Mono', Monaco, monospace; }
    .vector-state .label { color: #555; }
    .vector-state .value { color: #0f0; }
    .attestations { margin: 40px 0; }
    .attestations h3 { font-size: 12px; color: #fff; margin-bottom: 16px; font-weight: 500; }
    .attestation-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .attestation { padding: 6px 12px; background: #0f01; border: 1px solid #0f02; font-size: 10px; color: #0f0; }
    footer { text-align: center; padding: 40px 0; border-top: 1px solid #1a1a1a; margin-top: 60px; }
    footer p { font-size: 11px; color: #333; }
    footer a { color: #555; text-decoration: none; }
    footer a:hover { color: #888; }
    .dance-indicator { position: fixed; bottom: 20px; right: 20px; width: 8px; height: 8px; background: #0f0; border-radius: 50%; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 1; transform: scale(1.2); } }
  `;
  document.head.appendChild(style);

  // Build UI
  container.innerHTML = `
    <div class="container">
      <header>
        <div class="logo">squatch.cc</div>
        <div class="organic-badge">
          Organic: <span id="organic-score">${(state.organic * 100).toFixed(0)}%</span>
        </div>
      </header>

      <section class="hero">
        <h1>Vector Fabric</h1>
        <p>Decentralized reasoning. Data destroyed. Vectors persist. Everything signed. The gate is gated. Nothing revealed until earned.</p>
      </section>

      <section class="stages" id="stages">
        ${STAGES.map((s, i) => renderStage(s, i, state)).join('')}
      </section>

      <section class="vector-state">
        <h3>Your Vector State</h3>
        <div class="row">
          <span class="label">Fingerprint</span>
          <span class="value">${state.fingerprint || 'generating...'}</span>
        </div>
        <div class="row">
          <span class="label">Stage</span>
          <span class="value">${state.stageName || 'fingerprint'}</span>
        </div>
        <div class="row">
          <span class="label">Attestations</span>
          <span class="value" id="attestation-count">${state.attestationCount || 1}</span>
        </div>
        <div class="row">
          <span class="label">CSS Layer 0</span>
          <span class="value" id="css-gates">${state.cssGatesCompleted?.length || 0}/5 gates</span>
        </div>
        <div class="row">
          <span class="label">Media Signals</span>
          <span class="value">${state.cssMediaCount || 0}/6 detected</span>
        </div>
        <div class="row">
          <span class="label">Unlocked</span>
          <span class="value">${state.unlocked?.join(', ') || 'basic-ui'}</span>
        </div>
      </section>

      <section class="attestations" id="attestations">
        <h3>Attestation Chain</h3>
        <div class="attestation-list">
          <div class="attestation">fingerprint @ ${new Date().toLocaleTimeString()}</div>
        </div>
      </section>

      <footer>
        <p>
          <a href="https://github.com/squatch-cc">GitHub</a>
          <span style="margin: 0 15px; color: #222;">|</span>
          Data destroyed. Vectors persist.
        </p>
      </footer>
    </div>

    <div class="dance-indicator" title="The dance continues..."></div>
  `;

  // Listen for state updates
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, payload } = event.data || {};

      if (type === 'unlock' || type === 'state') {
        updateUI(payload);
      }
    });

    // Request current state
    navigator.serviceWorker.controller.postMessage({ type: 'get-state' });
  }
}

function renderStage(stage, index, state) {
  const currentStage = state.stage || 0;
  let status = 'locked';

  if (index < currentStage) status = 'unlocked';
  else if (index === currentStage) status = 'current';

  const statusLabel = status === 'locked' ? 'LOCKED' : status === 'current' ? 'CURRENT' : 'PASSED';

  return `
    <div class="stage ${status}">
      <h3>Stage ${index}: ${stage.label}</h3>
      <p>${stage.desc}</p>
      <div class="status">${statusLabel}</div>
    </div>
  `;
}

function updateUI(state) {
  // Update organic score
  const scoreEl = document.getElementById('organic-score');
  if (scoreEl) {
    scoreEl.textContent = `${(state.organic * 100).toFixed(0)}%`;
  }

  // Update attestation count
  const attCountEl = document.getElementById('attestation-count');
  if (attCountEl) {
    attCountEl.textContent = state.attestationCount || 1;
  }

  // Update CSS gates count
  const cssGatesEl = document.getElementById('css-gates');
  if (cssGatesEl) {
    cssGatesEl.textContent = `${state.cssGatesCompleted?.length || 0}/5 gates`;
  }

  // Update stages
  const stagesEl = document.getElementById('stages');
  if (stagesEl) {
    stagesEl.innerHTML = STAGES.map((s, i) => renderStage(s, i, state)).join('');
  }

  // Add attestation to chain
  const attestList = document.querySelector('.attestation-list');
  if (attestList) {
    // Check for CSS gate completion
    if (state.cssGate) {
      const att = document.createElement('div');
      att.className = 'attestation';
      att.textContent = `css-${state.cssGate} @ ${new Date().toLocaleTimeString()}`;
      attestList.appendChild(att);
    }
    // Check for stage change
    else if (state.stageName) {
      const existing = attestList.querySelectorAll('.attestation');
      const lastType = existing[existing.length - 1]?.textContent.split(' @')[0];

      if (lastType !== state.stageName) {
        const att = document.createElement('div');
        att.className = 'attestation';
        att.textContent = `${state.stageName} @ ${new Date().toLocaleTimeString()}`;
        attestList.appendChild(att);
      }
    }
  }
}
