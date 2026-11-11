import {
  AnalyzedPdfDocument,
  ChatThread,
  ClaudeModelId,
  ProjectItem,
  WritingStyleId,
} from '../types/claude';

export const CLAUDE_MODELS: Array<{
  id: ClaudeModelId;
  name: string;
  geminiModel: string;
  badge: string;
  description: string;
}> = [
  {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet (Argon)',
    geminiModel: 'gemini-4-argon',
    badge: 'Hybrid reasoning',
    description: 'Complex coding, STEM reasoning, and toggleable Extended Thinking.',
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus (Carbon)',
    geminiModel: 'gemini-4-carbon',
    badge: 'Deep nuance',
    description: 'Deepest multi-step reasoning, scientific synthesis, and strategic analysis.',
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet (Flash 3.8)',
    geminiModel: 'gemini-3.8-flash',
    badge: 'Balanced + Grounding',
    description: 'High-speed intelligence with Google Search, Google Maps, and PDF reading.',
  },
  {
    id: 'claude-3-5-haiku',
    name: 'Claude 3.5 Haiku (Flash Lite)',
    geminiModel: 'gemini-3.1-flash-lite',
    badge: 'Fastest',
    description: 'Sub-second responses for quick drafting, classification, and rapid iteration.',
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

// All static demo threads, projects, starter prompts, and PDFs removed per user request
export const INITIAL_PDF_DOCUMENTS: AnalyzedPdfDocument[] = [];
export const STARTER_PROMPTS: Array<{
  id: string;
  category: string;
  title: string;
  prompt: string;
  extendedThinking?: boolean;
}> = [];
export const INITIAL_PROJECTS: ProjectItem[] = [];
export const INITIAL_THREADS: ChatThread[] = [];
