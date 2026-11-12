export type ClaudeModelId =
  | 'claude-sonnet-5-5'
  | 'claude-opus-5-5'
  | 'claude-fable-5-2'
  | 'claude-mythos-5-2'
  | 'claude-haiku-5-5'
  | 'gemini-4-argon'
  | 'gemini-4-carbon'
  | 'gemini-3-8-flash'
  | 'gemini-3-1-flash-lite'
  | 'gpt-4o-omni'
  | 'openai-o3-mini'
  | 'deepseek-r1'
  | 'deepseek-v3'
  | 'llama-3-3-70b'
  | 'mistral-large-2'
  | 'qwen-2-5-coder'
  | 'grok-3-free';

export type AiModelProvider =
  | 'Anthropic'
  | 'Google Gemini'
  | 'OpenAI'
  | 'DeepSeek'
  | 'Meta Llama'
  | 'Mistral & Qwen'
  | 'xAI';

export interface FreeAiModelSpec {
  id: ClaudeModelId;
  name: string;
  provider: AiModelProvider;
  geminiModel: 'gemini-4-argon' | 'gemini-4-carbon' | 'gemini-3.8-flash' | 'gemini-3.1-flash-lite';
  badge: string;
  costBadge: '$0.00 · Free Forever';
  contextWindow: string;
  description: string;
  personaPrompt: string;
  defaultExtendedThinking?: boolean;
}

export type GeminiModelAlias =
  | 'gemini-4-argon'
  | 'gemini-4-carbon'
  | 'gemini-3.8-flash'
  | 'gemini-3.1-flash-lite';

export type WorkspaceSection =
  | 'chat'
  | 'projects'
  | 'artifacts'
  | 'studio'
  | 'fable'
  | 'career'
  | 'maps'
  | 'spatial3d';

export type WritingStyleId = 'normal' | 'concise' | 'explanatory' | 'formal';

export type ArtifactType = 'html' | 'svg' | 'code' | 'markdown';

export interface ArtifactItem {
  id: string;
  title: string;
  type: ArtifactType;
  language?: string;
  content: string;
  version: number;
  createdAt: string;
  threadId: string;
  messageId: string;
}

export interface AttachmentItem {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  content: string; // text content or base64 data URL (including application/pdf)
  isImage: boolean;
  isPdf?: boolean;
  pageCount?: number;
}

export interface GroundingCitation {
  title: string;
  uri: string;
  sourceType: 'web' | 'maps';
}

export interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  thinkingDurationSec?: number;
  createdAt: string;
  modelId?: ClaudeModelId;
  attachments?: AttachmentItem[];
  artifacts?: ArtifactItem[];
  citations?: GroundingCitation[];
  feedback?: 'up' | 'down' | null;
}

export interface ProjectKnowledgeDoc {
  id: string;
  title: string;
  content: string;
  tokens: number;
  updatedAt: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  customInstructions: string;
  knowledgeDocs: ProjectKnowledgeDoc[];
  starred?: boolean;
  updatedAt: string;
}

export interface ChatThread {
  id: string;
  title: string;
  projectId?: string | null;
  modelId: ClaudeModelId;
  styleId: WritingStyleId;
  extendedThinking: boolean;
  starred: boolean;
  createdAt: string;
  updatedAt: string;
  messages: MessageItem[];
}

export interface AnalyzedPdfDocument {
  id: string;
  filename: string;
  mimeType: string;
  pageCount: number;
  summary: string;
  keyFindings: string[];
  extractedText: string;
  createdAt: string;
}

export type FreeApiId =
  | 'anthropic_org_keys'
  | 'openlibrary'
  | 'gutendex'
  | 'wikipedia'
  | 'arxiv'
  | 'openmeteo'
  | 'hackernews'
  | 'dictionary'
  | 'restcountries';

export interface FreeApiItem {
  title: string;
  subtitle: string;
  summary: string;
  url?: string;
  badge?: string;
}

export interface StoryPromptItem {
  id: string;
  title: string;
  genre: string;
  logline: string;
  protagonistAndConflict: string;
  fullStoryPrompt: string;
  threeDVideoPrompt: string;
}

export interface FableChapter {
  id: string;
  title: string;
  narrative: string;
  moralOrInsight: string;
  voiceStyle:
    | 'Fable (Warm British Storyteller)'
    | 'Zephyr (Clear Editorial)'
    | 'Fenrir (Deep Resonance)';
  choices: string[];
  illustrationSvg: string;
}
