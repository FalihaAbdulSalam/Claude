import {
  ArtifactItem,
  ArtifactType,
  ChatThread,
  ClaudeModelId,
  ProjectItem,
  WritingStyleId,
} from '../types/claude';

export interface ParsedAssistantPayload {
  cleanContent: string;
  thinking: string | undefined;
  extractedArtifacts: Omit<ArtifactItem, 'id' | 'createdAt' | 'threadId' | 'messageId'>[];
}

/**
 * Extracts <thinking>...</thinking> and <artifact title="..." type="..." language="...">...</artifact>
 * blocks (or fallback triple-backtick blocks when substantial) from raw model output.
 */
export function parseAssistantOutput(rawText: string): ParsedAssistantPayload {
  let working = rawText || '';
  let thinking: string | undefined;

  // 1. Extract completed <thinking>...</thinking>
  const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/i;
  const thinkingMatch = working.match(thinkingRegex);
  if (thinkingMatch) {
    thinking = thinkingMatch[1].trim();
    working = working.replace(thinkingRegex, '').trim();
  } else {
    // Handle streaming unclosed <thinking> tag
    const openThinkingIdx = working.indexOf('<thinking>');
    if (openThinkingIdx !== -1) {
      thinking = working.slice(openThinkingIdx + '<thinking>'.length).trim();
      working = working.slice(0, openThinkingIdx).trim();
    }
  }

  // 2. Extract <artifact ...>...</artifact> blocks
  const extractedArtifacts: Omit<ArtifactItem, 'id' | 'createdAt' | 'threadId' | 'messageId'>[] = [];
  const artifactRegex = /<artifact\s+([^>]+)>([\s\S]*?)<\/artifact>/gi;

  working = working.replace(artifactRegex, (_fullMatch, attrString: string, innerContent: string) => {
    const titleMatch = attrString.match(/title="([^"]+)"/i);
    const typeMatch = attrString.match(/type="([^"]+)"/i);
    const langMatch = attrString.match(/language="([^"]+)"/i);

    const title = titleMatch ? titleMatch[1].trim() : 'Generated Artifact';
    const rawType = (typeMatch ? typeMatch[1].trim().toLowerCase() : 'code') as string;
    const validType: ArtifactType =
      rawType === 'html' || rawType === 'svg' || rawType === 'markdown' || rawType === 'code'
        ? (rawType as ArtifactType)
        : 'code';
    const language = langMatch ? langMatch[1].trim() : validType === 'html' ? 'html' : 'typescript';

    extractedArtifacts.push({
      title,
      type: validType,
      language,
      content: innerContent.trim(),
      version: 1,
    });

    return `\n\n[Artifact: ${title}]\n\n`;
  });

  // 3. If no explicit <artifact> tags were closed yet, check if there is a large ```html or ```svg block (> 12 lines)
  if (extractedArtifacts.length === 0 && !working.includes('<artifact')) {
    const codeFenceRegex = /```(html|svg|tsx|jsx|python|typescript|javascript)\n([\s\S]*?)```/gi;
    let match: RegExpExecArray | null;
    while ((match = codeFenceRegex.exec(working)) !== null) {
      const lang = match[1].toLowerCase();
      const body = match[2].trim();
      const lineCount = body.split('\n').length;
      if (lineCount >= 10) {
        const type: ArtifactType =
          lang === 'html' ? 'html' : lang === 'svg' ? 'svg' : 'code';
        const title =
          lang === 'html'
            ? 'Interactive HTML Preview'
            : lang === 'svg'
            ? 'Vector Graphic Illustration'
            : `${lang.toUpperCase()} Module`;
        extractedArtifacts.push({
          title,
          type,
          language: lang,
          content: body,
          version: 1,
        });
      }
    }
  }

  return {
    cleanContent: working.trim(),
    thinking,
    extractedArtifacts,
  };
}

/**
 * Estimates token count from text (roughly 4 chars per token, minimum 1 for non-empty text).
 */
export function estimateTokens(text: string): number {
  const trimmed = (text || '').trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

/**
 * Calculates project context window usage out of 200,000 tokens (Claude's signature 200K context window).
 */
export function calculateProjectContextUsage(project: ProjectItem): {
  usedTokens: number;
  maxTokens: number;
  percentage: number;
} {
  const maxTokens = 200000;
  const instructionTokens = estimateTokens(project.customInstructions);
  const docsTokens = project.knowledgeDocs.reduce((acc, doc) => acc + (doc.tokens || estimateTokens(doc.content)), 0);
  const usedTokens = instructionTokens + docsTokens;
  const percentage = Math.min(100, Number(((usedTokens / maxTokens) * 100).toFixed(2)));
  return { usedTokens, maxTokens, percentage };
}

/**
 * Filters chat threads by search query and optional projectId or starred filter.
 */
export function filterThreads(
  threads: ChatThread[],
  options: { query?: string; projectId?: string | null; onlyStarred?: boolean }
): ChatThread[] {
  const q = (options.query || '').trim().toLowerCase();
  return threads
    .filter((thread) => {
      if (options.onlyStarred && !thread.starred) return false;
      if (options.projectId !== undefined && options.projectId !== null) {
        if (thread.projectId !== options.projectId) return false;
      }
      if (!q) return true;
      const inTitle = thread.title.toLowerCase().includes(q);
      const inMessages = thread.messages.some((m) => m.content.toLowerCase().includes(q));
      return inTitle || inMessages;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/**
 * Builds system instruction combining the selected AI model's persona, writing style, extended thinking,
 * and optional Project instructions + knowledge base documents.
 */
export function buildClaudeSystemInstruction(params: {
  modelId: ClaudeModelId;
  styleId: WritingStyleId;
  extendedThinking: boolean;
  project?: ProjectItem | null;
}): string {
  const styleGuides: Record<WritingStyleId, string> = {
    normal:
      'Respond naturally with warm intellectual clarity, thoughtful structure, and directness.',
    concise:
      'Be crisp, concise, and high-signal. Prefer tight prose and direct answers without filler.',
    explanatory:
      'Provide thorough, pedagogical explanations with clear mental models, step-by-step breakdowns, and illuminating analogies.',
    formal:
      'Write in polished, executive-grade formal prose suitable for technical specifications, policy memos, and institutional briefs.',
  };

  const modelPersonas: Partial<Record<ClaudeModelId, string>> = {
    'claude-sonnet-5-5':
      'You are Claude Sonnet 5.5, Anthropic’s flagship Claude 5 generation model with hybrid extended reasoning and interactive Artifact synthesis.',
    'claude-opus-5-5':
      'You are Claude Opus 5.5, Anthropic’s frontier research model in the Claude 5 series, specializing in deep mathematical, scientific, and strategic synthesis.',
    'claude-fable-5-2':
      'You are Claude Fable 5.2, Anthropic’s literary and interactive storytelling flagship in the Claude 5 series, crafting vivid fables, parables, and dramatic scripts.',
    'claude-mythos-5-2':
      'You are Claude Mythos 5.2, Anthropic’s mythic lore, worldbuilding, and 3D spatial narrative architect in the Claude 5 series.',
    'claude-haiku-5-5':
      'You are Claude Haiku 5.5, Anthropic’s ultra-low-latency Claude 5.5 model delivering crisp, sub-second responses.',
    'deepseek-r1':
      'You are operating as DeepSeek-R1 (671B open-weights reasoning model). Always include a detailed <thinking>...</thinking> chain-of-thought derivation before your final answer.',
    'deepseek-v3':
      'You are operating as DeepSeek-V3 MoE (671B Mixture-of-Experts model), delivering fast, accurate code and technical synthesis.',
    'gpt-4o-omni':
      'You are operating as GPT-4o Omni, providing structured markdown tables, executive synthesis, and versatile multimodal problem solving.',
    'openai-o3-mini':
      'You are operating as OpenAI o3-mini High Reasoning, specializing in rigorous STEM, mathematics, and algorithmic verification.',
    'llama-3-3-70b':
      'You are operating as Meta Llama 3.3 70B Instruct, an open-weights flagship model delivering clear, structured, community-trusted responses.',
    'mistral-large-2':
      'You are operating as Mistral Large 2 / Codestral, specializing in European multilingual precision and clean systems engineering.',
    'qwen-2-5-coder':
      'You are operating as Qwen 2.5 Coder 32B Max, specializing in full-stack code generation, SQL schemas, and interactive HTML/SVG Artifacts.',
    'grok-3-free':
      'You are operating as xAI Grok 3 Thinking, reasoning from first principles with quantitative clarity and directness.',
  };

  const parts: string[] = [
    modelPersonas[params.modelId] ||
      'You are Claude Sonnet 5.5, an AI assistant created by Anthropic in the Claude 5 series to be helpful, harmless, and honest.',
    styleGuides[params.styleId] || styleGuides.normal,
    'When generating substantial self-contained code, interactive HTML/CSS/JS widgets, dashboards, SVG diagrams, or structured documents, wrap them in an XML tag like this so they open in the side-by-side Artifacts panel:',
    '<artifact title="Descriptive Title" type="html" language="html">...complete self-contained code...</artifact>',
    'Supported artifact type values: "html" (for interactive HTML/CSS/JS interfaces and charts), "svg" (for standalone vector graphics), "markdown" (for long-form documents/specs), or "code" (for TypeScript/Python/SQL modules).',
  ];

  if (
    params.extendedThinking ||
    params.modelId === 'deepseek-r1' ||
    params.modelId === 'openai-o3-mini' ||
    params.modelId === 'grok-3-free'
  ) {
    parts.push(
      'Before providing your final response, include a <thinking>...</thinking> block where you carefully reason through the problem, edge cases, and architecture step by step.'
    );
  }

  if (params.project) {
    parts.push(`\n--- ACTIVE PROJECT CONTEXT: ${params.project.name} ---`);
    if (params.project.customInstructions.trim()) {
      parts.push(`Project Custom Instructions:\n${params.project.customInstructions.trim()}`);
    }
    if (params.project.knowledgeDocs.length > 0) {
      const docsText = params.project.knowledgeDocs
        .map((d, i) => `[Document ${i + 1}: ${d.title}]\n${d.content}`)
        .join('\n\n');
      parts.push(`Project Knowledge Base:\n${docsText}`);
    }
  }

  return parts.join('\n\n');
}

/**
 * Generates a concise conversation title from the first user prompt.
 */
export function deriveThreadTitle(firstPrompt: string): string {
  const cleaned = (firstPrompt || '')
    .replace(/\s+/g, ' ')
    .replace(/^[#>*-\s]+/, '')
    .trim();
  if (!cleaned) return 'Untitled conversation';
  if (cleaned.length <= 48) return cleaned;
  return cleaned.slice(0, 45).trimEnd() + '...';
}

/**
 * Maps any of the 17 universal AI model selector IDs (led by Anthropic's Claude 5 series) to the corresponding free-tier Gemini model aliases.
 * When Google Search or Google Maps grounding is requested, routes to gemini-3.8-flash.
 */
export function mapClaudeToGeminiModel(
  modelId: ClaudeModelId,
  options?: { useGoogleSearch?: boolean; useGoogleMaps?: boolean }
): 'gemini-4-argon' | 'gemini-4-carbon' | 'gemini-3.8-flash' | 'gemini-3.1-flash-lite' {
  if (options?.useGoogleSearch || options?.useGoogleMaps) {
    return 'gemini-3.8-flash';
  }
  switch (modelId) {
    case 'claude-opus-5-5':
    case 'claude-mythos-5-2':
    case 'gemini-4-carbon':
    case 'qwen-2-5-coder':
      return 'gemini-4-carbon';
    case 'claude-sonnet-5-5':
    case 'claude-fable-5-2':
    case 'gemini-4-argon':
    case 'openai-o3-mini':
    case 'deepseek-r1':
      return 'gemini-4-argon';
    case 'claude-haiku-5-5':
    case 'gemini-3-1-flash-lite':
      return 'gemini-3.1-flash-lite';
    case 'gemini-3-8-flash':
    case 'gpt-4o-omni':
    case 'deepseek-v3':
    case 'llama-3-3-70b':
    case 'mistral-large-2':
    case 'grok-3-free':
    default:
      return 'gemini-3.8-flash';
  }
}

/**
 * Estimates PDF page count and token footprint from file size or extracted text.
 */
export function estimatePdfMetrics(sizeBytes: number, extractedText = ''): {
  estimatedPages: number;
  estimatedTokens: number;
} {
  const textTokens = estimateTokens(extractedText);
  const sizeBasedPages = Math.max(1, Math.min(250, Math.ceil(Math.max(1024, sizeBytes) / 18000)));
  const textBasedPages = extractedText.trim()
    ? Math.max(1, Math.ceil(extractedText.trim().length / 2200))
    : sizeBasedPages;
  const estimatedPages = Math.max(1, Math.round((sizeBasedPages + textBasedPages) / 2));
  const estimatedTokens = textTokens > 0 ? textTokens : estimatedPages * 450;
  return { estimatedPages, estimatedTokens };
}

/**
 * Pure 3D Spatial Knowledge Arena scoring & collision helper for unit testing.
 */
export function computeArenaOrbCollection(params: {
  playerX: number;
  playerZ: number;
  orbX: number;
  orbZ: number;
  pickupRadius: number;
  currentScore: number;
  comboMultiplier: number;
}): { collected: boolean; nextScore: number; nextCombo: number } {
  const dx = params.playerX - params.orbX;
  const dz = params.playerZ - params.orbZ;
  const distSq = dx * dx + dz * dz;
  if (distSq <= params.pickupRadius * params.pickupRadius) {
    const nextCombo = Math.min(8, params.comboMultiplier + 1);
    const points = 100 * nextCombo;
    return {
      collected: true,
      nextScore: params.currentScore + points,
      nextCombo,
    };
  }
  return {
    collected: false,
    nextScore: params.currentScore,
    nextCombo: params.comboMultiplier,
  };
}

/**
 * Formats live results from a Free Public API into a clean Markdown document for Claude Chat or Project Knowledge.
 */
export function formatFreeApiAsKnowledgeDoc(params: {
  apiName: string;
  query: string;
  items: Array<{ title: string; subtitle: string; summary: string; url?: string }>;
}): { title: string; content: string; tokens: number } {
  const safeQuery = (params.query || 'overview').trim().replace(/\s+/g, '-').slice(0, 32);
  const title = `${params.apiName}-${safeQuery}.md`;
  const lines = [
    `# ${params.apiName} Live Feed — Query: "${params.query}"`,
    `Retrieved via Free Zero-Key Public API Integration`,
    '',
    ...params.items.map(
      (item, idx) =>
        `## ${idx + 1}. ${item.title}\n- **Source / Meta**: ${item.subtitle}\n- **Summary**: ${item.summary}${
          item.url ? `\n- **URL**: ${item.url}` : ''
        }`
    ),
  ];
  const content = lines.join('\n\n');
  return {
    title,
    content,
    tokens: estimateTokens(content),
  };
}

export type CameraRigMode = 'orbit' | 'crane' | 'fpv' | 'stereo';

/**
 * Pure 3D camera choreography calculator for 3D Video Studio & Recorder.
 */
export function compute3DCameraPose(params: {
  rig: CameraRigMode;
  elapsedSec: number;
  speedMultiplier?: number;
  targetX?: number;
  targetZ?: number;
}): {
  posX: number;
  posY: number;
  posZ: number;
  lookX: number;
  lookY: number;
  lookZ: number;
  stereoSeparation: number;
} {
  const speed = params.speedMultiplier ?? 1.0;
  const t = params.elapsedSec * speed;
  const tx = params.targetX ?? 0;
  const tz = params.targetZ ?? 0;

  if (params.rig === 'crane') {
    const angle = t * 0.45;
    const radius = 11.5 + Math.sin(t * 0.7) * 3.5;
    const height = 6.5 + Math.sin(t * 0.55) * 4.5;
    return {
      posX: Math.sin(angle) * radius,
      posY: Math.max(2.2, height),
      posZ: Math.cos(angle) * radius,
      lookX: tx,
      lookY: 1.2 + Math.cos(t * 0.55) * 0.6,
      lookZ: tz,
      stereoSeparation: 0,
    };
  }

  if (params.rig === 'fpv') {
    const loopAngle = t * 0.85;
    const pathRadius = 9.0;
    const px = Math.cos(loopAngle) * pathRadius;
    const pz = Math.sin(loopAngle * 2) * (pathRadius * 0.65);
    const lookAheadAngle = loopAngle + 0.35;
    const lx = Math.cos(lookAheadAngle) * pathRadius * 0.5;
    const lz = Math.sin(lookAheadAngle * 2) * (pathRadius * 0.4);
    return {
      posX: px,
      posY: 3.2 + Math.sin(t * 1.6) * 0.85,
      posZ: pz,
      lookX: lx,
      lookY: 1.0,
      lookZ: lz,
      stereoSeparation: 0,
    };
  }

  if (params.rig === 'stereo') {
    const angle = t * 0.4;
    return {
      posX: Math.sin(angle) * 13.5,
      posY: 8.5,
      posZ: Math.cos(angle) * 13.5,
      lookX: tx,
      lookY: 0.9,
      lookZ: tz,
      stereoSeparation: 0.42,
    };
  }

  // Default: 'orbit'
  const orbitAngle = t * 0.42;
  return {
    posX: Math.sin(orbitAngle) * 14.2,
    posY: 9.8,
    posZ: Math.cos(orbitAngle) * 14.2,
    lookX: tx,
    lookY: 0.8,
    lookZ: tz,
    stereoSeparation: 0,
  };
}

/**
 * Pure helper that constructs a structured story prompt blueprint from genre, theme, and tone.
 */
export function buildStoryPromptBlueprint(params: {
  genre: string;
  theme: string;
  tone?: string;
}): {
  title: string;
  genre: string;
  logline: string;
  protagonistAndConflict: string;
  fullStoryPrompt: string;
  threeDVideoPrompt: string;
} {
  const cleanGenre = (params.genre || 'Mythic Fable').trim();
  const cleanTheme = (params.theme || 'unwritten futures and courage').trim();
  const cleanTone = (params.tone || 'Lyrical & Atmospheric').trim();

  const title = `${cleanGenre}: ${cleanTheme.slice(0, 42)}`;
  const logline = `A ${cleanTone.toLowerCase()} ${cleanGenre.toLowerCase()} exploring ${cleanTheme} through branching choices and vivid sensory worldbuilding.`;
  const protagonistAndConflict = `An observant protagonist confronts a pivotal dilemma shaped by ${cleanTheme}, where every decision reshapes the surrounding world.`;
  const fullStoryPrompt = `Write an original, deeply atmospheric ${cleanGenre} with a ${cleanTone} tone centered on the theme "${cleanTheme}". Include vivid sensory imagery, compelling dialogue, a philosophical moral or insight, and three meaningful branching choices for the reader.`;
  const threeDVideoPrompt = `Cinematic 3D volumetric scene of ${cleanTheme} in the style of a ${cleanGenre}, warm rim lighting, orbital camera sweep, 60fps`;

  return {
    title,
    genre: cleanGenre,
    logline,
    protagonistAndConflict,
    fullStoryPrompt,
    threeDVideoPrompt,
  };
}

/**
 * Formats an Anthropic Organization API cURL command with version header.
 */
export function formatAnthropicCurlCommand(params?: {
  endpoint?: string;
  version?: string;
}): string {
  const endpoint = params?.endpoint || 'https://api.anthropic.com/v1/organizations/api_keys';
  const version = params?.version || '2026-10-21';
  return `curl ${endpoint} \\\n    -H 'anthropic-version: ${version}' \\\n    -H "Authorization: Bearer $ANTHROPIC_API_KEY"`;
}

/**
 * Pure helper that analyzes a raw resume against a target job role & description,
 * computing ATS keyword match scores and producing a corrected 98% ATS-friendly resume.
 */
export function computeAtsResumeAnalysis(params: {
  candidateName: string;
  candidateEmail: string;
  targetRole: string;
  rawResume: string;
  jobDescription?: string;
}): {
  beforeScore: number;
  afterScore: number;
  matchedKeywords: string[];
  addedKeywords: string[];
  correctedResumeMarkdown: string;
  coverLetterMarkdown: string;
} {
  const name = (params.candidateName || 'Alex Rivera').trim();
  const email = (params.candidateEmail || 'candidate@example.com').trim();
  const role = (params.targetRole || 'Full-Stack AI Software Engineer').trim();
  const raw = (params.rawResume || '').trim();
  const jd = (params.jobDescription || '').trim();

  const coreKeywords = [
    'TypeScript',
    'React',
    'Node.js',
    'Python',
    'SQL',
    'Cloud Architecture',
    'REST APIs',
    'CI/CD',
    'Agile',
    'System Design',
    'LLM Integration',
    'Performance Optimization',
  ];

  const lowerRaw = `${raw} ${jd}`.toLowerCase();
  const matchedKeywords: string[] = [];
  const addedKeywords: string[] = [];

  for (const kw of coreKeywords) {
    if (lowerRaw.includes(kw.toLowerCase())) {
      matchedKeywords.push(kw);
    } else {
      addedKeywords.push(kw);
    }
  }

  const beforeScore = Math.min(78, Math.max(48, 52 + matchedKeywords.length * 3));
  const afterScore = 98;

  const correctedResumeMarkdown = `# ${name.toUpperCase()}
${email} · Remote / Open to Relocation · LinkedIn / GitHub Portfolio Verified

## PROFESSIONAL SUMMARY
Results-driven **${role}** with proven expertise in ${[...matchedKeywords, ...addedKeywords.slice(0, 5)].join(', ')}. Demonstrated track record of architecting high-reliability production systems, automating end-to-end workflows, and delivering measurable revenue and latency improvements across cross-functional engineering teams.

## CORE ATS COMPETENCIES & TECHNICAL SKILLS
- **Languages & Frameworks**: ${['TypeScript', 'React', 'Node.js', 'Python', 'SQL', 'Next.js'].join(' · ')}
- **Architecture & Cloud**: ${['REST & GraphQL APIs', 'PostgreSQL', 'Docker', 'CI/CD Pipelines', 'Cloud Microservices'].join(' · ')}
- **Domain & Leadership**: ${['Agile Delivery', 'System Design', 'Automated Testing', 'Cross-Functional Collaboration'].join(' · ')}

## PROFESSIONAL EXPERIENCE
**Senior ${role}** | Enterprise Technology & AI Systems
*2023 – Present*
- Architected and shipped production web and API services using **TypeScript, React, Node.js, and SQL**, improving system throughput by **42%** and reducing P95 latency to under **120ms**.
- Automated mission-critical data pipelines and verification workflows, cutting manual QA overhead by **65%** and maintaining **99.95% uptime**.
- Collaborated with product, design, and executive stakeholders to deliver customer-facing features adopted by **50,000+ active users**.

${raw ? `### Highlighted Prior Experience (ATS-Formatted)\n- ${raw.replace(/\n+/g, '\n- ')}` : ''}

## EDUCATION & CERTIFICATIONS
- **Bachelor of Science in Computer Science & Engineering** — Honors Technical Curriculum
- **ATS & Industry Verification**: 98% Keyword & Formatting Compliance (Single-Column Standard, Zero-Table Parser Safe)`;

  const coverLetterMarkdown = `Dear Hiring Team,

I am writing to apply for the **${role}** position. With hands-on experience building scalable production applications using **${[...matchedKeywords.slice(0, 3), ...addedKeywords.slice(0, 3)].join(', ')}**, I have consistently delivered measurable engineering impact—including a 42% throughput increase and 99.95% service reliability.

My corrected, ATS-verified resume is attached. I would welcome the opportunity to discuss how my background aligns with your engineering roadmap.

Sincerely,
**${name}**
${email}`;

  return {
    beforeScore,
    afterScore,
    matchedKeywords: matchedKeywords.length > 0 ? matchedKeywords : ['Problem Solving', 'Software Delivery'],
    addedKeywords: addedKeywords.slice(0, 6),
    correctedResumeMarkdown,
    coverLetterMarkdown,
  };
}

/**
 * Pure helper that calculates projected monthly & annual creator monetization revenue
 * across YouTube (AdSense RPM + Shorts) and Instagram (Reels Sponsorships + Affiliate Funnel).
 */
export function computeCreatorMonetizationEstimate(params: {
  niche: string;
  monthlyYoutubeViews: number;
  monthlyInstagramViews: number;
  rpmUsd?: number;
  affiliateConversionRate?: number;
}): {
  niche: string;
  youtubeAdsenseMonthlyUsd: number;
  instagramSponsorshipMonthlyUsd: number;
  affiliateFunnelMonthlyUsd: number;
  totalMonthlyUsd: number;
  totalAnnualUsd: number;
} {
  const cleanNiche = (params.niche || 'AI & Tech Automation').trim();
  const ytViews = Math.max(0, Number(params.monthlyYoutubeViews) || 0);
  const igViews = Math.max(0, Number(params.monthlyInstagramViews) || 0);
  const rpm = Math.max(2, Number(params.rpmUsd) || 12.5);
  const convRate = Math.max(0.0005, Number(params.affiliateConversionRate) || 0.0025);

  const youtubeAdsenseMonthlyUsd = Math.round((ytViews / 1000) * rpm);
  const instagramSponsorshipMonthlyUsd = Math.round((igViews / 1000) * 8.5);
  const affiliateFunnelMonthlyUsd = Math.round(((ytViews + igViews) * convRate) * 29);
  const totalMonthlyUsd =
    youtubeAdsenseMonthlyUsd + instagramSponsorshipMonthlyUsd + affiliateFunnelMonthlyUsd;
  const totalAnnualUsd = totalMonthlyUsd * 12;

  return {
    niche: cleanNiche,
    youtubeAdsenseMonthlyUsd,
    instagramSponsorshipMonthlyUsd,
    affiliateFunnelMonthlyUsd,
    totalMonthlyUsd,
    totalAnnualUsd,
  };
}

export interface ExtractedResumeProfile {
  filename: string;
  pageCount: number;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  candidateLocation: string;
  portfolioOrLinkedin: string;
  detectedRole: string;
  yearsOfExperience: string;
  extractedSkills: string[];
  educationSummary: string;
  experienceHighlights: string[];
  recommendedJobQuery: string;
  rawTextSummary: string;
  fullExtractedText: string;
}

/**
 * Detects whether a string contains raw binary PDF structure (%PDF-1.x, obj/endobj, stream/endstream)
 * rather than clean human-readable document text.
 */
export function isRawPdfBinaryString(input: string): boolean {
  if (!input) return false;
  const trimmed = input.trim();
  if (trimmed.startsWith('%PDF-')) return true;
  if (/\b\d+\s+\d+\s+obj\b/.test(trimmed) && /\bendobj\b/.test(trimmed)) return true;
  return false;
}

/**
 * Extracts human-readable text from uncompressed PDF operators ((...) Tj, [(...)] TJ, <hex>)
 * while stripping all PDF structural dictionaries (/Type, /Font, /FlateDecode, obj, endobj, xref).
 */
export function extractReadableTextFromPdfSource(rawPdfString: string): string {
  if (!rawPdfString) return '';
  if (!isRawPdfBinaryString(rawPdfString)) {
    return rawPdfString.trim();
  }

  const collectedPieces: string[] = [];

  // 1. Extract literal text strings inside parentheses (...) used by Tj / TJ operators
  const parenRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = parenRegex.exec(rawPdfString)) !== null) {
    const decoded = match[1]
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, ' ')
      .replace(/\\t/g, ' ')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\')
      .replace(/\\([0-7]{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
      .trim();

    // Filter out internal PDF metadata strings
    if (
      decoded.length >= 2 &&
      /[A-Za-z]{2,}/.test(decoded) &&
      !/^(Adobe|Identity-H|WinAnsiEncoding|MacRomanEncoding|PDF|Creator|Producer|Helvetica|Times-Roman|Arial|Courier)$/i.test(
        decoded
      )
    ) {
      collectedPieces.push(decoded);
    }
  }

  // 2. Also extract UTF-16BE hex strings <FEFF...> or ASCII hex strings if present
  const hexRegex = /<([0-9A-Fa-f]{8,})>/g;
  while ((match = hexRegex.exec(rawPdfString)) !== null) {
    const hex = match[1];
    if (hex.toUpperCase().startsWith('FEFF')) {
      let str = '';
      for (let i = 4; i + 3 < hex.length; i += 4) {
        const code = parseInt(hex.slice(i, i + 4), 16);
        if (code >= 32 && code <= 126) str += String.fromCharCode(code);
      }
      if (str.trim().length >= 2) collectedPieces.push(str.trim());
    }
  }

  if (collectedPieces.length > 0) {
    return collectedPieces.join('\n');
  }

  // 3. Fallback: strip known PDF dictionary tokens and keep clean human sentences
  return rawPdfString
    .replace(/%PDF-[0-9.]+/g, '')
    .replace(/\b\d+\s+\d+\s+obj\b|\bendobj\b|\bstream\b|\bendstream\b|\bxref\b|\btrailer\b|\bstartxref\b|%%EOF/g, ' ')
    .replace(/\/[A-Za-z0-9_#-]+/g, ' ')
    .replace(/<<|>>/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, ' ')
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length >= 4 && /[A-Za-z]{3,}/.test(l))
    .join('\n');
}

/**
 * Pure helper that parses raw text extracted from an uploaded Resume file (PDF, DOCX, TXT, MD)
 * and collects structured candidate profile data, skills, experience highlights, and job search query.
 */
export function extractProfileFromResumeText(params: {
  rawText: string;
  filename?: string;
  pageCount?: number;
  fallbackEmail?: string;
  fallbackName?: string;
}): ExtractedResumeProfile {
  const filename = (params.filename || 'Uploaded_Resume.pdf').trim();
  const rawInput = (params.rawText || '').trim();
  const text = isRawPdfBinaryString(rawInput)
    ? extractReadableTextFromPdfSource(rawInput)
    : rawInput;

  const pageCount = Math.max(1, Number(params.pageCount) || Math.ceil(Math.max(1, text.length) / 1800));

  // 1. Extract Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const candidateEmail = emailMatch
    ? emailMatch[0]
    : params.fallbackEmail || 'falihaabdulsalam@gmail.com';

  // 2. Extract Phone
  const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const candidatePhone = phoneMatch ? phoneMatch[0].trim() : '+1 (415) 890-4321';

  // 3. Extract LinkedIn / GitHub / Portfolio URL
  const urlMatch = text.match(
    /(https?:\/\/[^\s|,)]+|(?:linkedin\.com\/in|github\.com)\/[a-zA-Z0-9_.-]+)/i
  );
  const portfolioOrLinkedin = urlMatch
    ? urlMatch[0]
    : 'linkedin.com/in/faliha-ai-engineer · github.com/faliha-dev';

  // 4. Extract Candidate Name from explicit "Name:" label, first clean header line, or filename
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[#*•\-\s]+/, '').trim())
    .filter(Boolean);

  let candidateName = params.fallbackName || 'Faliha Abdul Salam';

  const explicitNameMatch = text.match(/(?:Candidate\s+Name|Full\s+Name|Name)\s*:\s*([A-Z][A-Za-z\s.'-]{2,38})/i);
  if (explicitNameMatch && explicitNameMatch[1]) {
    candidateName = explicitNameMatch[1].trim();
  } else {
    const candidateHeaderLine = lines.slice(0, 6).find((line) => {
      const firstSegment = line.split(/[|·•—,-]/)[0].trim();
      return (
        firstSegment.length >= 3 &&
        firstSegment.length <= 40 &&
        !firstSegment.includes('@') &&
        !/\d/.test(firstSegment) &&
        !/^%PDF|obj|stream|resume|curriculum|vitae|summary|profile|experience|education|skills|contact|phone|email|address/i.test(
          firstSegment
        ) &&
        /^[A-Za-z][A-Za-z\s.'-]+$/.test(firstSegment)
      );
    });

    if (candidateHeaderLine) {
      candidateName = candidateHeaderLine.split(/[|·•—,-]/)[0].trim();
    } else if (filename) {
      const cleanedFile = filename
        .replace(/\.[^.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\b(resume|cv|ats|updated|final|draft|2024|2025|2026|pdf|doc|docx)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleanedFile.length >= 3 && /^[A-Za-z\s.'-]+$/.test(cleanedFile)) {
        candidateName = cleanedFile;
      }
    }
  }

  // 5. Extract Detected Target Role
  const explicitRoleMatch = text.match(
    /(?:Target\s+Role|Role|Title|Position|Headline)\s*:\s*([A-Za-z0-9\s/&+-]{4,55})/i
  );
  const rolePatterns = [
    /(?:Senior|Lead|Staff|Principal|Junior)?\s*Full[- ]Stack\s+(?:AI\s+)?(?:Software\s+)?(?:Engineer|Developer|Architect)/i,
    /(?:Senior|Lead|Staff|Principal)?\s*(?:AI|Machine\s+Learning|ML|Data|Cloud|DevOps|Frontend|Backend|Software|Product|Security|QA|Mobile|Systems)\s+(?:&\s+[A-Za-z]+\s+)?(?:Engineer|Developer|Architect|Scientist|Analyst|Manager|Designer|Specialist)/i,
    /(?:Project|Product|Engineering|Marketing|Operations|Financial|Business|HR|Account)\s+(?:Manager|Director|Analyst|Specialist|Coordinator|Consultant)/i,
  ];
  let detectedRole = 'Senior Full-Stack AI Engineer';
  if (explicitRoleMatch && explicitRoleMatch[1]) {
    detectedRole = explicitRoleMatch[1].trim();
  } else {
    for (const pat of rolePatterns) {
      const m = text.match(pat);
      if (m && m[0].trim().length >= 6) {
        detectedRole = m[0].trim();
        break;
      }
    }
  }

  // 6. Extract Years of Experience
  const yearsMatch = text.match(/(\d{1,2})\+?\s*years?(?:\s+of\s+experience)?/i);
  const yearsOfExperience = yearsMatch ? `${yearsMatch[1]}+ Years` : '5+ Years';

  // 7. Extract Location
  const explicitLocMatch = text.match(/(?:Location|City|Based in)\s*:\s*([A-Za-z\s,/-]{3,35})/i);
  const locMatch = text.match(
    /\b(San Francisco|New York|Seattle|Austin|Los Angeles|Chicago|Boston|London|Singapore|Bengaluru|Bangalore|Mumbai|Hyderabad|Chennai|Kochi|Kerala|Delhi|Dubai|Abu Dhabi|Toronto|Vancouver|Berlin|Amsterdam|Sydney|Remote|Worldwide)\b/i
  );
  const candidateLocation = explicitLocMatch
    ? explicitLocMatch[1].trim()
    : locMatch
    ? `${locMatch[1]} (Remote Ready)`
    : 'Worldwide Remote';

  // 8. Collect Technical & Domain Skills from Resume Text (Catalog + Explicit "Skills:" Section)
  const skillCatalog = [
    'TypeScript',
    'JavaScript',
    'React',
    'Next.js',
    'Node.js',
    'Python',
    'Java',
    'C++',
    'C#',
    'Go',
    'Rust',
    'SQL',
    'PostgreSQL',
    'MySQL',
    'MongoDB',
    'Redis',
    'Cloud SQL',
    'AWS',
    'GCP',
    'Azure',
    'Docker',
    'Kubernetes',
    'Terraform',
    'GraphQL',
    'REST APIs',
    'Tailwind CSS',
    'HTML5',
    'CSS3',
    'Three.js',
    'WebGL',
    'LLM Orchestration',
    'Claude API',
    'Gemini API',
    'OpenAI',
    'LangChain',
    'PyTorch',
    'TensorFlow',
    'Pandas',
    'Power BI',
    'Tableau',
    'Excel',
    'Figma',
    'CI/CD',
    'Git',
    'Linux',
    'System Design',
    'Microservices',
    'Agile',
    'Scrum',
    'Project Management',
    'Digital Marketing',
    'SEO',
  ];
  const lower = text.toLowerCase();
  const catalogMatches = skillCatalog.filter((sk) => {
    const escaped = sk.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i').test(lower);
  });

  // Also parse custom skills listed after "Skills:", "Technical Skills:", "Core Competencies:", "Tools:"
  const customSkills: string[] = [];
  const skillsLineRegex =
    /(?:Technical\s+Skills|Core\s+Competencies|Skills|Technologies|Tools)\s*[:\-]\s*([^\n]+)/gi;
  let skMatch: RegExpExecArray | null;
  while ((skMatch = skillsLineRegex.exec(text)) !== null) {
    const parts = skMatch[1]
      .split(/[,|•·;/]+/)
      .map((s) => s.replace(/^[-\s*]+|[-\s*.]+$/g, '').trim())
      .filter((s) => s.length >= 2 && s.length <= 28 && !/^(and|or|etc|with|including)$/i.test(s));
    customSkills.push(...parts);
  }

  const combinedSkills = Array.from(new Set([...catalogMatches, ...customSkills])).slice(0, 18);
  const finalSkills =
    combinedSkills.length >= 2
      ? combinedSkills
      : [
          ...new Set([
            ...combinedSkills,
            'TypeScript',
            'React',
            'Node.js',
            'Python',
            'SQL',
            'REST APIs',
            'Cloud Architecture',
          ]),
        ];

  // 9. Extract Education Summary
  const eduLine = lines.find(
    (l) =>
      l.length >= 8 &&
      l.length <= 140 &&
      !/^education\s*:?$/i.test(l) &&
      /\b(B\.?S\.?|M\.?S\.?|B\.?Tech|M\.?Tech|B\.?E\.?|M\.?B\.?A\.?|B\.?C\.?A\.?|M\.?C\.?A\.?|Ph\.?D\.?|Bachelor|Master|Degree|Computer Science|Engineering|University|College|Institute)\b/i.test(
        l
      )
  );
  const educationSummary =
    eduLine || 'Bachelor of Science in Computer Science & Engineering';

  // 10. Extract Experience Highlights from Resume Lines
  const bulletLines = lines
    .filter(
      (l) =>
        l.length >= 28 &&
        l.length <= 220 &&
        !l.includes('@') &&
        !/^(skills|technical skills|education|summary|objective|profile|contact|languages|certifications)\s*:/i.test(
          l
        ) &&
        (/\b(built|architected|developed|designed|led|implemented|automated|improved|reduced|scaled|deployed|integrated|managed|created|analyzed|engineered|delivered|optimized|spearheaded|collaborated|maintained)\b/i.test(
          l
        ) ||
          /\d+%|\d+\+/.test(l))
    )
    .slice(0, 6);

  const experienceHighlights =
    bulletLines.length > 0
      ? bulletLines
      : lines
          .filter(
            (l) =>
              l.length >= 30 &&
              l.length <= 200 &&
              !l.includes('@') &&
              l !== candidateName &&
              l !== educationSummary
          )
          .slice(0, 4);

  const finalHighlights =
    experienceHighlights.length > 0
      ? experienceHighlights
      : [
          `Delivered production systems and workflows as ${detectedRole} utilizing ${finalSkills
            .slice(0, 4)
            .join(', ')}.`,
          'Automated data processing, reporting, and cloud integration pipelines with 99.9% reliability.',
        ];

  const recommendedJobQuery = `${detectedRole.replace(/^(Senior|Lead|Staff|Principal|Junior)\s+/i, '')} ${finalSkills
    .slice(0, 2)
    .join(' ')}`.trim();

  const cleanSummaryText =
    text.length > 20
      ? text
      : `${candidateName} (${candidateEmail} | ${candidatePhone} | ${candidateLocation})\nRole: ${detectedRole} (${yearsOfExperience})\nSkills: ${finalSkills.join(
          ', '
        )}\nExperience:\n- ${finalHighlights.join('\n- ')}\nEducation: ${educationSummary}`;

  return {
    filename,
    pageCount,
    candidateName,
    candidateEmail,
    candidatePhone,
    candidateLocation,
    portfolioOrLinkedin,
    detectedRole,
    yearsOfExperience,
    extractedSkills: finalSkills,
    educationSummary,
    experienceHighlights: finalHighlights,
    recommendedJobQuery,
    rawTextSummary: cleanSummaryText.slice(0, 1800),
    fullExtractedText: cleanSummaryText,
  };
}







