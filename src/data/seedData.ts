import { ChatThread, ClaudeModelId, ProjectItem, WritingStyleId } from '../types/claude';

export const CLAUDE_MODELS: Array<{
  id: ClaudeModelId;
  name: string;
  badge: string;
  description: string;
}> = [
  {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet',
    badge: 'Hybrid reasoning',
    description: 'Our most intelligent model with toggleable Extended Thinking and rapid coding.',
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    badge: 'Balanced',
    description: 'High-speed intelligence for everyday engineering, writing, and synthesis.',
  },
  {
    id: 'claude-3-5-haiku',
    name: 'Claude 3.5 Haiku',
    badge: 'Fastest',
    description: 'Sub-second responses for quick drafting, classification, and rapid iteration.',
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    badge: 'Deep nuance',
    description: 'Rich literary prose, complex research synthesis, and strategic analysis.',
  },
];

export const WRITING_STYLES: Array<{
  id: WritingStyleId;
  name: string;
  summary: string;
}> = [
  {
    id: 'normal',
    name: 'Normal',
    summary: 'Default responses from Claude with balanced warmth and clarity',
  },
  {
    id: 'concise',
    name: 'Concise',
    summary: 'Shorter, direct responses that get straight to the point',
  },
  {
    id: 'explanatory',
    name: 'Explanatory',
    summary: 'Educational responses with clear mental models and examples',
  },
  {
    id: 'formal',
    name: 'Formal',
    summary: 'Structured executive prose for memos and technical specifications',
  },
];

export const STARTER_PROMPTS: Array<{
  id: string;
  category: string;
  title: string;
  prompt: string;
  extendedThinking?: boolean;
}> = [
  {
    id: 'sp-1',
    category: 'Interactive Artifact',
    title: 'Build an interactive compound interest & runway visualizer',
    prompt:
      'Create an interactive HTML financial runway and compound growth calculator with sliders for monthly burn, ARR growth rate, and capital reserve.',
    extendedThinking: true,
  },
  {
    id: 'sp-2',
    category: 'System Architecture',
    title: 'Diagram a multi-region active-active database topology',
    prompt:
      'Design a high-availability multi-region PostgreSQL and read-replica architecture with an SVG topology diagram and failover latency analysis.',
    extendedThinking: true,
  },
  {
    id: 'sp-3',
    category: 'Algorithm Design',
    title: 'Implement a zero-dependency token bucket rate limiter in TypeScript',
    prompt:
      'Write a production-ready distributed token bucket rate limiter in TypeScript with sliding window burst support and unit test examples.',
    extendedThinking: false,
  },
  {
    id: 'sp-4',
    category: 'Executive Synthesis',
    title: 'Draft an engineering RFC for migrating to micro-frontends',
    prompt:
      'Draft a formal Engineering RFC evaluating module federation versus monolithic SPA builds for a 60-engineer product organization.',
    extendedThinking: false,
  },
];

export const INITIAL_PROJECTS: ProjectItem[] = [
  {
    id: 'proj-solar-grid',
    name: 'GridScale Telemetry & Storage',
    description: 'Architecture specs, battery dispatch algorithms, and regulatory compliance for utility microgrids.',
    customInstructions:
      'Always format power metrics in tabular numerals (MW / MWh). Emphasize LFP battery cycle longevity, IEEE 1547 inverter telemetry, and deterministic fallback logic.',
    starred: true,
    updatedAt: '2026-11-11T00:30:00Z',
    knowledgeDocs: [
      {
        id: 'doc-1',
        title: 'IEEE-1547-Inverter-Spec.md',
        content: `# Grid-Forming Inverter Telemetry Specification
- Nominal Voltage: 34.5 kV collector bus
- Frequency droop response: <= 140 ms under +/- 0.5 Hz deviation
- State of Charge (SoC) operating envelope: 12% floor to 92% ceiling to preserve 6,500-cycle LFP warranty.`,
        tokens: 840,
        updatedAt: '2026-11-10T18:15:00Z',
      },
      {
        id: 'doc-2',
        title: 'Tariff-Arbitrage-Rules.ts',
        content: `export interface TariffWindow {
  period: 'off-peak' | 'shoulder' | 'peak';
  ratePerMWh: number;
  allowGridCharge: boolean;
}
// Peak window: 16:00 - 21:00 local solar time ($185/MWh)`,
        tokens: 620,
        updatedAt: '2026-11-10T21:00:00Z',
      },
    ],
  },
  {
    id: 'proj-design-system',
    name: 'Editorial Design System v4',
    description: 'Typography scale, warm parchment color tokens, and WCAG AA contrast rules for knowledge workspaces.',
    customInstructions:
      'Use Plus Jakarta Sans for UI chrome, Source Serif 4 for long-form prose, and JetBrains Mono for tabular metrics. Avoid neon gradients and nested bordered cards.',
    starred: false,
    updatedAt: '2026-11-09T14:20:00Z',
    knowledgeDocs: [
      {
        id: 'doc-3',
        title: 'Color-Tokens.json',
        content: `{
  "canvas": { "light": "#FAF9F5", "dark": "#191918" },
  "surface": { "light": "#F3F1EA", "dark": "#232220" },
  "accent": { "terracotta": "#C96442", "hover": "#B55535" }
}`,
        tokens: 510,
        updatedAt: '2026-11-09T14:20:00Z',
      },
    ],
  },
];

const SOLAR_SIMULATOR_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; }
    body { margin: 0; padding: 24px; background: #FAF9F5; color: #191918; }
    .shell { background: #FFFFFF; border: 1px solid #E5E2D9; border-radius: 12px; padding: 22px; }
    .header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #ECE9DF; padding-bottom: 14px; margin-bottom: 18px; }
    h2 { margin: 0; font-size: 17px; font-weight: 700; color: #191918; }
    .meta { font-size: 12px; color: #6E6D68; font-family: 'JetBrains Mono', monospace; }
    .sliders { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 20px; }
    .field { background: #F6F4EE; border-radius: 8px; padding: 12px 14px; }
    label { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; color: #3D3C38; margin-bottom: 8px; }
    input[type="range"] { width: 100%; accent-color: #C96442; cursor: pointer; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .kpi { border: 1px solid #E5E2D9; border-radius: 8px; padding: 12px; background: #FAF9F5; }
    .kpi-label { font-size: 11px; color: #6E6D68; margin-bottom: 4px; }
    .kpi-val { font-size: 20px; font-weight: 700; color: #191918; font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
    .kpi-val.accent { color: #C96442; }
    .bars { display: flex; align-items: flex-end; gap: 6px; height: 110px; padding: 12px; background: #F6F4EE; border-radius: 8px; }
    .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }
    .bar { width: 100%; background: #C96442; border-radius: 4px 4px 0 0; transition: height 0.15s ease; }
    .bar-hr { font-size: 10px; color: #6E6D68; font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body>
  <div class="shell">
    <div class="header">
      <h2>LFP Microgrid Dispatch &amp; Arbitrage Model</h2>
      <span class="meta">IEEE 1547 · 12%–92% SoC Envelope</span>
    </div>
    <div class="sliders">
      <div class="field">
        <label><span>Solar Array Capacity</span><span id="solarLabel">85 MW</span></label>
        <input id="solarRange" type="range" min="20" max="200" value="85" />
      </div>
      <div class="field">
        <label><span>BESS Storage Duration</span><span id="bessLabel">4.0 Hours</span></label>
        <input id="bessRange" type="range" min="1" max="8" step="0.5" value="4" />
      </div>
    </div>
    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-label">Usable Storage Capacity</div>
        <div class="kpi-val" id="capVal">272.0 MWh</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Evening Peak Dispatch</div>
        <div class="kpi-val accent" id="peakVal">68.0 MW</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Est. Daily Arbitrage Revenue</div>
        <div class="kpi-val" id="revVal">$42,160</div>
      </div>
    </div>
    <div class="bars" id="chartBars"></div>
  </div>
  <script>
    const solarInput = document.getElementById('solarRange');
    const bessInput = document.getElementById('bessRange');
    const chartBars = document.getElementById('chartBars');
    const hours = ['08h','10h','12h','14h','16h','18h','20h','22h'];
    const profile = [0.25, 0.62, 0.95, 1.0, 0.78, 0.88, 0.92, 0.45];

    function render() {
      const mw = Number(solarInput.value);
      const hrs = Number(bessInput.value);
      document.getElementById('solarLabel').textContent = mw + ' MW';
      document.getElementById('bessLabel').textContent = hrs.toFixed(1) + ' Hours';
      const usableMWh = mw * hrs * 0.8;
      const peakMW = mw * 0.8;
      const revenue = Math.round(usableMWh * 155);
      document.getElementById('capVal').textContent = usableMWh.toFixed(1) + ' MWh';
      document.getElementById('peakVal').textContent = peakMW.toFixed(1) + ' MW';
      document.getElementById('revVal').textContent = '$' + revenue.toLocaleString();

      chartBars.innerHTML = '';
      hours.forEach((h, idx) => {
        const col = document.createElement('div');
        col.className = 'bar-col';
        const bar = document.createElement('div');
        bar.className = 'bar';
        const pct = Math.min(100, Math.round(profile[idx] * (mw / 200) * 85 + 15));
        bar.style.height = pct + '%';
        if (idx >= 4) bar.style.background = '#2D6A4F';
        const lbl = document.createElement('span');
        lbl.className = 'bar-hr';
        lbl.textContent = h;
        col.appendChild(bar);
        col.appendChild(lbl);
        chartBars.appendChild(col);
      });
    }
    solarInput.addEventListener('input', render);
    bessInput.addEventListener('input', render);
    render();
  </script>
</body>
</html>`;

const RAFT_TOPOLOGY_SVG = `<svg viewBox="0 0 760 400" xmlns="http://www.w3.org/2000/svg" font-family="Plus Jakarta Sans, sans-serif">
  <rect width="760" height="400" rx="14" fill="#FAF9F5"/>
  <rect x="20" y="20" width="720" height="360" rx="10" fill="#F3F1EA" stroke="#E5E2D9" stroke-width="1.5"/>
  <text x="44" y="54" font-size="15" font-weight="700" fill="#191918">Raft Consensus Quorum &amp; Log Replication Flow</text>
  <text x="44" y="74" font-size="12" fill="#6E6D68">Term 42 · Commit Index #18,492 · Heartbeat Interval 150ms</text>

  <!-- Leader Node -->
  <g transform="translate(60, 140)">
    <rect width="180" height="130" rx="12" fill="#191918" stroke="#C96442" stroke-width="2.5"/>
    <text x="90" y="38" text-anchor="middle" font-size="13" font-weight="700" fill="#FAF9F5">Node A (Leader)</text>
    <text x="90" y="62" text-anchor="middle" font-size="11" fill="#D97757">us-east-1a · Active</text>
    <rect x="24" y="80" width="132" height="28" rx="6" fill="#2A2927"/>
    <text x="90" y="98" text-anchor="middle" font-size="11" font-family="JetBrains Mono, monospace" fill="#ECEAE2">log[18492]: SET k=9</text>
  </g>

  <!-- Arrows -->
  <path d="M240 175 L460 125" stroke="#C96442" stroke-width="2" stroke-dasharray="5 4"/>
  <path d="M240 230 L460 275" stroke="#C96442" stroke-width="2" stroke-dasharray="5 4"/>
  <text x="345" y="135" text-anchor="middle" font-size="11" font-weight="600" fill="#C96442">AppendEntries RPC</text>
  <text x="345" y="275" text-anchor="middle" font-size="11" font-weight="600" fill="#2D6A4F">Quorum ACK (2/3)</text>

  <!-- Follower 1 -->
  <g transform="translate(460, 75)">
    <rect width="230" height="105" rx="10" fill="#FFFFFF" stroke="#2D6A4F" stroke-width="2"/>
    <text x="115" y="34" text-anchor="middle" font-size="13" font-weight="700" fill="#191918">Node B (Follower)</text>
    <text x="115" y="54" text-anchor="middle" font-size="11" fill="#2D6A4F">eu-west-1b · Synced (18,492)</text>
    <text x="115" y="78" text-anchor="middle" font-size="11" font-family="JetBrains Mono, monospace" fill="#6E6D68">RTT: 68.4 ms</text>
  </g>

  <!-- Follower 2 -->
  <g transform="translate(460, 220)">
    <rect width="230" height="105" rx="10" fill="#FFFFFF" stroke="#2D6A4F" stroke-width="2"/>
    <text x="115" y="34" text-anchor="middle" font-size="13" font-weight="700" fill="#191918">Node C (Follower)</text>
    <text x="115" y="54" text-anchor="middle" font-size="11" fill="#2D6A4F">ap-northeast-1a · Synced (18,492)</text>
    <text x="115" y="78" text-anchor="middle" font-size="11" font-family="JetBrains Mono, monospace" fill="#6E6D68">RTT: 142.1 ms</text>
  </g>
</svg>`;

export const INITIAL_THREADS: ChatThread[] = [
  {
    id: 'thread-solar-dispatch',
    title: 'LFP Microgrid Dispatch & Arbitrage Model',
    projectId: 'proj-solar-grid',
    modelId: 'claude-3-7-sonnet',
    styleId: 'explanatory',
    extendedThinking: true,
    starred: true,
    createdAt: '2026-11-11T00:15:00Z',
    updatedAt: '2026-11-11T00:42:00Z',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content:
          'Using our GridScale project specs, build an interactive HTML dispatch simulator for an 85 MW solar array paired with a 4-hour LFP battery system operating within the 12%–92% SoC warranty envelope.',
        createdAt: '2026-11-11T00:15:00Z',
      },
      {
        id: 'msg-2',
        role: 'assistant',
        modelId: 'claude-3-7-sonnet',
        thinkingDurationSec: 6,
        thinking:
          '1. Referencing Project Knowledge `IEEE-1547-Inverter-Spec.md`: operating SoC window is strictly 12% to 92% (80% usable depth of discharge).\n2. For an 85 MW nominal array with a 4.0-hour BESS duration, nominal energy is 340 MWh and usable dispatch energy is 340 * 0.80 = 272.0 MWh.\n3. Referencing `Tariff-Arbitrage-Rules.ts`: evening peak window (16:00–21:00) clears at $185/MWh vs $30/MWh charging cost ($155/MWh net spread).\n4. Constructing a self-contained HTML artifact with real-time sliders for array MW and storage duration.',
        content: `I have designed an interactive **LFP Microgrid Dispatch & Arbitrage Model** calibrated to your IEEE 1547 project constraints.

### Key Engineering Assumptions

- **Usable Depth of Discharge (80%)**: Enforces the \`12%–92%\` State of Charge envelope to protect the 6,500-cycle LFP cell warranty.
- **Tariff Spread Calculation**: Applies the evening peak window (\`16:00–21:00\`) spread across usable MWh capacity with tabular numeric readouts.

[Artifact: LFP Microgrid Dispatch & Arbitrage Model]

Use the sliders inside the **Artifacts** preview pane to test solar sizing from \`20 MW\` up to \`200 MW\` and storage durations from \`1.0\` to \`8.0\` hours.`,
        createdAt: '2026-11-11T00:16:00Z',
        artifacts: [
          {
            id: 'art-solar-sim',
            title: 'LFP Microgrid Dispatch & Arbitrage Model',
            type: 'html',
            language: 'html',
            content: SOLAR_SIMULATOR_HTML,
            version: 1,
            createdAt: '2026-11-11T00:16:00Z',
            threadId: 'thread-solar-dispatch',
            messageId: 'msg-2',
          },
        ],
      },
    ],
  },
  {
    id: 'thread-raft-quorum',
    title: 'Raft Consensus Quorum & Log Replication',
    projectId: null,
    modelId: 'claude-3-7-sonnet',
    styleId: 'normal',
    extendedThinking: true,
    starred: true,
    createdAt: '2026-11-10T19:10:00Z',
    updatedAt: '2026-11-10T19:12:00Z',
    messages: [
      {
        id: 'msg-3',
        role: 'user',
        content: 'Create an SVG architecture diagram illustrating a 3-node cross-region Raft consensus quorum during AppendEntries log replication.',
        createdAt: '2026-11-10T19:10:00Z',
      },
      {
        id: 'msg-4',
        role: 'assistant',
        modelId: 'claude-3-7-sonnet',
        thinkingDurationSec: 4,
        thinking:
          'Designing a clean vector topology illustrating Leader Node A (us-east-1a) replicating log index #18,492 to Follower Node B (eu-west-1b) and Follower Node C (ap-northeast-1a). Highlighting RTT latencies and majority quorum acknowledgment.',
        content: `Here is the cross-region **Raft Consensus Quorum** vector diagram showing \`AppendEntries\` replication and majority commit acknowledgment across three availability zones.

### Replication Guarantees

1. **Leader Completeness**: Node A only advances \`commitIndex\` to \`#18,492\` once a majority quorum (2 of 3 nodes) persists the entry to their write-ahead log.
2. **Latency Envelope**: Commit latency is governed by the fastest follower (\`eu-west-1b\` at \`68.4 ms\` RTT) rather than the slowest tail replica.

[Artifact: Raft Consensus Quorum Topology]`,
        createdAt: '2026-11-10T19:12:00Z',
        artifacts: [
          {
            id: 'art-raft-svg',
            title: 'Raft Consensus Quorum Topology',
            type: 'svg',
            language: 'svg',
            content: RAFT_TOPOLOGY_SVG,
            version: 1,
            createdAt: '2026-11-10T19:12:00Z',
            threadId: 'thread-raft-quorum',
            messageId: 'msg-4',
          },
        ],
      },
    ],
  },
];
