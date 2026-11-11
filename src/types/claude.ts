export type ClaudeModelId = 'claude-3-7-sonnet' | 'claude-3-5-sonnet' | 'claude-3-5-haiku' | 'claude-3-opus';

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
  content: string; // text content or base64 data URL
  isImage: boolean;
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
