/**
 * vector-sw.js - The Brain
 * Persists. Self-modifying. Self-loading. Infinite dance.
 * Gates ALL fetches. Unearned resources return 204.
 */

const VERSION = '1.0.0';
const CACHE_NAME = `squatch-v${VERSION}`;

// ========== STATE ==========

let state = {
  vector: null,
  organic: 0,
  stage: 0,
  attestations: [],
  unlocked: [],
  signals: {},
  cssSignals: {},
  cssGatesCompleted: [],
  initialized: false
};

// ========== STAGES ==========

const STAGES = [
  { id: 'fingerprint',  threshold: 0.3, unlock: ['basic-ui'] },
  { id: 'behavioral',   threshold: 0.5, unlock: ['search', 'content'] },
  { id: 'pow',          threshold: 0.6, unlock: ['write', 'storage'] },
  { id: 'email',        threshold: 0.7, unlock: ['identity', 'sync'] },
  { id: 'passkey',      threshold: 0.9, unlock: ['full-access', 'admin'] },
  { id: 'attestation',  threshold: 1.0, unlock: ['everything'] }
];

// ========== RESOURCES ==========

// Map resources to required unlock levels
const RESOURCE_GATES = {
  // Always allowed (core gate system)
  'gate.js': null,
  'vector-gate.js': null,
  'vector-gate.wasm.js': null,
  'vector-sw.js': null,

  // Stage 0: fingerprint (0.3)
  'app.js': 'basic-ui',
  'styles.css': 'basic-ui',

  // Stage 1: behavioral (0.5)
  'search.js': 'search',
  'content.js': 'content',

  // Stage 2: pow (0.6)
  'editor.js': 'write',
  'storage.js': 'storage',

  // Stage 3: email (0.7)
  'identity.js': 'identity',
  'sync.js': 'sync',

  // Stage 4: passkey (0.9)
  'admin.js': 'admin',
  'full.js': 'full-access'
};

// ========== LIFECYCLE ==========

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean old caches
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      )
    ])
  );
});

// ========== MESSAGE HANDLING ==========

self.addEventListener('message', async (event) => {
  const { type, ...payload } = event.data || {};

  switch (type) {
    case 'init':
      await handleInit(event.source, payload);
      break;

    case 'challenge-response':
      await handleChallengeResponse(event.source, payload);
      break;

    case 'attest':
      await handleAttest(event.source, payload);
      break;

    case 'css-gate-complete':
      await handleCSSGateComplete(event.source, payload);
      break;

    case 'get-state':
      event.source.postMessage({ type: 'state', payload: getPublicState() });
      break;
  }
});

async function handleInit(client, payload) {
  const { vector, organic, signals, cssSignals, timestamp } = payload;

  // Store initial state
  state.vector = new Float32Array(vector);
  state.organic = organic;
  state.signals = signals || {};
  state.cssSignals = cssSignals || {};
  state.initialized = true;

  // Boost organic score based on CSS media signals
  // More detected features = more likely human with real browser
  if (cssSignals?.mediaCount) {
    const cssBoost = cssSignals.mediaCount * 0.02; // Up to 0.12 for 6 features
    state.organic = Math.min(1, state.organic + cssBoost);
  }

  // Record attestation
  state.attestations.push({
    type: 'fingerprint',
    organic,
    timestamp: timestamp || Date.now(),
    vector_hash: await hashVector(vector)
  });

  // Determine initial stage
  updateStage();

  // Tell client what to load
  if (state.organic >= 0.3) {
    client.postMessage({
      type: 'load-stage',
      payload: {
        module: './app.js',
        container: 'body',
        state: getPublicState()
      }
    });
  }

  // If organic is good but not great, request behavioral challenge
  if (state.organic >= 0.3 && state.organic < 0.5) {
    setTimeout(() => {
      client.postMessage({
        type: 'challenge',
        payload: { type: 'behavioral', duration: 5000 }
      });
    }, 3000);
  }
}

async function handleChallengeResponse(client, payload) {
  const { type, ...result } = payload.payload || payload;

  let attestation = null;

  switch (type) {
    case 'behavioral':
      attestation = await attestBehavioral(result);
      break;

    case 'pow':
      attestation = await attestPoW(result);
      break;

    case 'timing':
      attestation = await attestTiming(result);
      break;
  }

  if (attestation) {
    state.attestations.push(attestation);
    state.organic = Math.min(1, state.organic + attestation.boost);
    updateStage();

    // Notify client of unlocks
    const newUnlocks = getNewUnlocks();
    if (newUnlocks.length > 0) {
      client.postMessage({
        type: 'unlock',
        payload: { features: newUnlocks, organic: state.organic, stage: state.stage }
      });
    }
  }
}

async function handleAttest(client, payload) {
  const { type, proof } = payload;

  switch (type) {
    case 'email':
      if (await verifyEmailProof(proof)) {
        state.attestations.push({
          type: 'email',
          timestamp: Date.now(),
          boost: 0.1
        });
        state.organic = Math.min(1, state.organic + 0.1);
        updateStage();
      }
      break;

    case 'passkey':
      if (await verifyPasskeyProof(proof)) {
        state.attestations.push({
          type: 'passkey',
          timestamp: Date.now(),
          boost: 0.2
        });
        state.organic = Math.min(1, state.organic + 0.2);
        updateStage();
      }
      break;
  }

  client.postMessage({
    type: 'state',
    payload: getPublicState()
  });
}

/**
 * Handle CSS gate completion events from Layer 0
 */
async function handleCSSGateComplete(client, payload) {
  const { gate, timestamp } = payload;

  // Avoid duplicate processing
  if (state.cssGatesCompleted.includes(gate)) return;

  state.cssGatesCompleted.push(gate);

  // Each CSS gate completion boosts organic score
  const boosts = {
    hover: 0.03,     // Completed hover sequence
    click: 0.03,     // Held click for 1s
    checkbox: 0.02,  // Checked all boxes
    scroll: 0.02,    // Scrolled to 80%
    focus: 0.02      // Tabbed through all nodes
  };

  const boost = boosts[gate] || 0.01;
  state.organic = Math.min(1, state.organic + boost);

  // Record attestation
  state.attestations.push({
    type: `css-${gate}`,
    timestamp: timestamp || Date.now(),
    boost
  });

  updateStage();

  // Notify client
  const newUnlocks = getNewUnlocks();
  client.postMessage({
    type: 'unlock',
    payload: {
      features: newUnlocks,
      organic: state.organic,
      stage: state.stage,
      cssGate: gate
    }
  });
}

// ========== FETCH GATING ==========

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only gate same-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Extract resource name
  const resource = url.pathname.split('/').pop() || 'index.html';

  // Check if resource is gated
  const requiredUnlock = RESOURCE_GATES[resource];

  // Core resources always allowed
  if (requiredUnlock === null || requiredUnlock === undefined) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Check if unlock earned
  if (!state.unlocked.includes(requiredUnlock) && requiredUnlock !== 'basic-ui') {
    // Return 204 No Content - reveal nothing about existence
    event.respondWith(new Response(null, { status: 204 }));
    return;
  }

  // Basic-ui requires initialization
  if (requiredUnlock === 'basic-ui' && !state.initialized) {
    event.respondWith(new Response(null, { status: 204 }));
    return;
  }

  // Allowed - fetch the resource
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// ========== ATTESTATION HELPERS ==========

async function attestBehavioral(result) {
  const { mouseMovements, scrollEvents, keyPresses } = result;

  let score = 0;

  // Check mouse movement naturalness
  if (mouseMovements && mouseMovements.length > 5) {
    const deltas = [];
    for (let i = 1; i < mouseMovements.length; i++) {
      const dx = mouseMovements[i].x - mouseMovements[i - 1].x;
      const dy = mouseMovements[i].y - mouseMovements[i - 1].y;
      const dt = mouseMovements[i].t - mouseMovements[i - 1].t;
      deltas.push({ dx, dy, dt });
    }

    // Natural mouse has varied speeds and directions
    const speeds = deltas.map(d => Math.sqrt(d.dx * d.dx + d.dy * d.dy) / Math.max(1, d.dt));
    const speedVariance = variance(speeds);
    if (speedVariance > 0.1) score += 0.05;
  }

  // Check scroll naturalness
  if (scrollEvents && scrollEvents.length > 2) {
    const scrollDeltas = [];
    for (let i = 1; i < scrollEvents.length; i++) {
      scrollDeltas.push(scrollEvents[i].y - scrollEvents[i - 1].y);
    }
    const scrollVariance = variance(scrollDeltas);
    if (scrollVariance > 100) score += 0.03;
  }

  // Some activity is good
  if (mouseMovements?.length > 0 || scrollEvents?.length > 0 || keyPresses?.length > 0) {
    score += 0.02;
  }

  return {
    type: 'behavioral',
    timestamp: Date.now(),
    boost: score,
    details: {
      mouseCount: mouseMovements?.length || 0,
      scrollCount: scrollEvents?.length || 0,
      keyCount: keyPresses?.length || 0
    }
  };
}

async function attestPoW(result) {
  if (!result || !result.hash || !result.nonce) return null;

  // Verify the PoW
  const difficulty = 4;
  if (result.hash.startsWith('0'.repeat(difficulty))) {
    return {
      type: 'pow',
      timestamp: Date.now(),
      boost: 0.1,
      nonce: result.nonce
    };
  }

  return null;
}

async function attestTiming(result) {
  if (!result || result.length < 5) return null;

  // Check timing variance (natural timing has some variance)
  const v = variance(result);
  const mean = result.reduce((a, b) => a + b) / result.length;

  // Too precise is suspicious
  if (v < 0.1 || mean < 9 || mean > 15) return null;

  return {
    type: 'timing',
    timestamp: Date.now(),
    boost: 0.02
  };
}

async function verifyEmailProof(proof) {
  // In production, verify with server
  // For now, just check structure
  return proof && proof.token && proof.email && proof.verified;
}

async function verifyPasskeyProof(proof) {
  // In production, verify with server
  // For now, just check structure
  return proof && proof.credential && proof.authenticatorData;
}

// ========== STATE MANAGEMENT ==========

function updateStage() {
  // Find highest stage we qualify for
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (state.organic >= STAGES[i].threshold) {
      state.stage = i;

      // Add all unlocks up to this stage
      for (let j = 0; j <= i; j++) {
        for (const unlock of STAGES[j].unlock) {
          if (!state.unlocked.includes(unlock)) {
            state.unlocked.push(unlock);
          }
        }
      }
      break;
    }
  }
}

function getNewUnlocks() {
  // Compare current unlocks with what stage should have
  const expected = [];
  for (let i = 0; i <= state.stage; i++) {
    expected.push(...STAGES[i].unlock);
  }
  return expected.filter(u => !state.unlocked.includes(u));
}

function getPublicState() {
  return {
    organic: state.organic,
    stage: state.stage,
    stageName: STAGES[state.stage]?.id || 'none',
    unlocked: [...state.unlocked],
    attestationCount: state.attestations.length,
    cssGatesCompleted: [...state.cssGatesCompleted],
    cssMediaCount: state.cssSignals?.mediaCount || 0,
    fingerprint: state.vector ? hashSync(Array.from(state.vector).slice(0, 8).join(',')) : null
  };
}

// ========== UTILITIES ==========

function variance(values) {
  if (!values || values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
}

async function hashVector(vector) {
  const data = new TextEncoder().encode(Array.from(vector).join(','));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

function hashSync(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
