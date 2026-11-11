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
 * Builds system instruction combining Claude's persona, selected writing style, extended thinking,
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

  const parts: string[] = [
    'You are Claude, an AI assistant created by Anthropic to be helpful, harmless, and honest.',
    styleGuides[params.styleId] || styleGuides.normal,
    'When generating substantial self-contained code, interactive HTML/CSS/JS widgets, dashboards, SVG diagrams, or structured documents, wrap them in an XML tag like this so they open in the side-by-side Artifacts panel:',
    '<artifact title="Descriptive Title" type="html" language="html">...complete self-contained code...</artifact>',
    'Supported artifact type values: "html" (for interactive HTML/CSS/JS interfaces and charts), "svg" (for standalone vector graphics), "markdown" (for long-form documents/specs), or "code" (for TypeScript/Python/SQL modules).',
  ];

  if (params.extendedThinking) {
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
 * Maps Claude model selector IDs to the corresponding Gemini model aliases.
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
    case 'claude-3-opus':
      return 'gemini-4-carbon';
    case 'claude-3-7-sonnet':
      return 'gemini-4-argon';
    case 'claude-3-5-haiku':
      return 'gemini-3.1-flash-lite';
    case 'claude-3-5-sonnet':
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




