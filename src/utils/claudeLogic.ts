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
