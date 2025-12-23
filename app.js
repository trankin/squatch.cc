/**
 * squatch.cc Main Application
 * Only loaded after gate passes
 */

export function mount(container, state) {
  container.innerHTML = `
    <div style="padding:40px 20px;max-width:900px;margin:0 auto">
      <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:40px;padding-bottom:20px;border-bottom:1px solid #222">
        <div style="font-size:24px;color:#fff">squatch.cc</div>
        <div style="font-size:11px;padding:8px 12px;background:#111;border:1px solid #333;border-radius:4px">
          Organic: <span style="color:#0f0">${(state.organic * 100).toFixed(0)}%</span>
        </div>
      </header>

      <section style="text-align:center;padding:60px 0">
        <h1 style="font-size:32px;color:#fff;font-weight:300;margin-bottom:15px">Vector Fabric</h1>
        <p style="color:#666;font-size:14px;margin-bottom:40px">
          Decentralized reasoning. Data destroyed. Vectors persist. Everything signed.
        </p>
      </section>

      <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin:40px 0">
        ${renderStage('Stage 1: Vector Gate', 'Content filtering via similarity', state.organic >= 0.5)}
        ${renderStage('Stage 2: P2P Mesh', 'Browser-to-browser WebRTC', state.organic >= 0.6)}
        ${renderStage('Stage 3: GPU Mesh', 'Distributed compute', state.organic >= 0.8)}
        ${renderStage('Stage 4: Private Social', 'Sovereign identity', state.organic >= 0.9)}
      </section>

      <section style="background:#111;border:1px solid #222;padding:20px;margin:40px 0">
        <h3 style="font-size:14px;color:#fff;margin-bottom:15px">Your Vector State</h3>
        <div style="font-size:11px;color:#666;font-family:monospace">
          <div>Fingerprint: <span style="color:#0f0">${state.fingerprint}</span></div>
          <div>Vector: [${Array.from(state.vector).slice(0,6).map(v => v.toFixed(3)).join(', ')}, ...]</div>
          <div>Gates: ${state.gates.filter(g => g.type === 'pass').length}/${state.gates.length} passed</div>
        </div>
      </section>

      <footer style="text-align:center;padding:40px 0;color:#444;font-size:11px">
        <a href="https://github.com/squatch-cc" style="color:#666;text-decoration:none">GitHub</a>
        <span style="margin:0 15px">•</span>
        Data destroyed. Vectors persist.
      </footer>
    </div>
  `;
}

function renderStage(title, desc, unlocked) {
  return `
    <div style="padding:20px;background:#111;border:1px solid ${unlocked ? '#0f0' : '#333'};opacity:${unlocked ? 1 : 0.5}">
      <h3 style="font-size:13px;color:#fff;margin-bottom:8px">${title}</h3>
      <p style="font-size:11px;color:#666;margin-bottom:10px">${desc}</p>
      <div style="font-size:10px;color:${unlocked ? '#0f0' : '#666'}">${unlocked ? 'UNLOCKED' : 'LOCKED'}</div>
    </div>
  `;
}
