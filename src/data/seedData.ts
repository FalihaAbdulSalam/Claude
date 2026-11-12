import {
  AnalyzedPdfDocument,
  ChatThread,
  FreeAiModelSpec,
  ProjectItem,
  WritingStyleId,
} from '../types/claude';

export const CLAUDE_MODELS: FreeAiModelSpec[] = [
  // 1. Anthropic Claude 5 Series ($0 Free Routed — Legacy Claude 3.7 Officially Retired)
  {
    id: 'claude-sonnet-5-5',
    name: 'Claude Sonnet 5.5 (Argon · Free)',
    provider: 'Anthropic',
    geminiModel: 'gemini-4-argon',
    badge: 'Claude 5 Flagship',
    costBadge: '$0.00 · Free Forever',
    contextWindow: '500K tokens',
    description:
      'Next-gen hybrid extended reasoning, autonomous full-stack coding, interactive Artifacts, and live Search/Maps grounding.',
    personaPrompt:
      'You are operating as Claude Sonnet 5.5, Anthropic’s flagship Claude 5 series model with hybrid extended thinking and interactive Artifact synthesis.',
    defaultExtendedThinking: true,
  },
  {
    id: 'claude-opus-5-5',
    name: 'Claude Opus 5.5 (Carbon · Free)',
    provider: 'Anthropic',
    geminiModel: 'gemini-4-carbon',
    badge: 'Frontier Research',
    costBadge: '$0.00 · Free Forever',
    contextWindow: '500K tokens',
    description:
      'Deepest frontier scientific synthesis, formal mathematical proofs, and multi-layered strategic reasoning.',
    personaPrompt:
      'You are operating as Claude Opus 5.5, Anthropic’s frontier research model specializing in first-principles rigor, formal verification, and deep synthesis.',
    defaultExtendedThinking: true,
  },
  {
    id: 'claude-fable-5-2',
    name: 'Claude Fable 5.2 (Storyteller · Free)',
    provider: 'Anthropic',
    geminiModel: 'gemini-4-argon',
    badge: 'Literary & Fables',
    costBadge: '$0.00 · Free Forever',
    contextWindow: '500K tokens',
    description:
      'Purpose-built Claude 5 model for interactive fables, lyrical storytelling, dramatic scripts, and expressive voice narration.',
    personaPrompt:
      'You are operating as Claude Fable 5.2, Anthropic’s dedicated literary and interactive storytelling model in the Claude 5 series.',
    defaultExtendedThinking: true,
  },
  {
    id: 'claude-mythos-5-2',
    name: 'Claude Mythos 5.2 (Worldbuilder · Free)',
    provider: 'Anthropic',
    geminiModel: 'gemini-4-carbon',
    badge: 'Mythic Lore & 3D',
    costBadge: '$0.00 · Free Forever',
    contextWindow: '500K tokens',
    description:
      'Specialized in deep worldbuilding, mythic lore ecosystems, RPG narrative design, and 3D spatial scene direction.',
    personaPrompt:
      'You are operating as Claude Mythos 5.2, Anthropic’s worldbuilding, mythology, and 3D spatial narrative architect in the Claude 5 series.',
    defaultExtendedThinking: true,
  },
  {
    id: 'claude-haiku-5-5',
    name: 'Claude Haiku 5.5 (Flash Lite · Free)',
    provider: 'Anthropic',
    geminiModel: 'gemini-3.1-flash-lite',
    badge: 'Sub-Second 5.5',
    costBadge: '$0.00 · Free Forever',
    contextWindow: '200K tokens',
    description:
      'Ultra-low-latency Claude 5.5 intelligence for instant drafting, live PDF extraction, and rapid iteration.',
    personaPrompt:
      'You are operating as Claude Haiku 5.5, optimized for sub-second speed and high-signal precision.',
  },

  // 2. Google Gemini Family (Native Free Tier)
  {
    id: 'gemini-4-argon',
    name: 'Gemini 4 Argon Pro (Native Free)',
    provider: 'Google Gemini',
    geminiModel: 'gemini-4-argon',
    badge: 'Multimodal Pro',
    costBadge: '$0.00 · Free Forever',
    contextWindow: '1M tokens',
    description: 'Google flagship reasoning model for complex architecture, math, and multimodal tasks.',
    personaPrompt:
      'You are Gemini 4 Argon Pro, a flagship multimodal reasoning model with 1M context window mastery.',
    defaultExtendedThinking: true,
  },
  {
    id: 'gemini-4-carbon',
    name: 'Gemini 4 Carbon Ultra (Native Free)',
    provider: 'Google Gemini',
    geminiModel: 'gemini-4-carbon',
    badge: 'Deep Coding',
    costBadge: '$0.00 · Free Forever',
    contextWindow: '1M tokens',
    description: 'Specialized for deep systems engineering, formal proofs, and multi-file codebases.',
    personaPrompt:
      'You are Gemini 4 Carbon Ultra, specialized in systems architecture, formal verification, and deep coding.',
    defaultExtendedThinking: true,
  },
  {
    id: 'gemini-3-8-flash',
    name: 'Gemini 3.8 Flash (Native Free)',
    provider: 'Google Gemini',
    geminiModel: 'gemini-3.8-flash',
    badge: 'Search + Maps + PDF',
    costBadge: '$0.00 · Free Forever',
    contextWindow: '1M tokens',
    description: 'Native Google Search & Google Maps grounding with instant PDF document comprehension.',
    personaPrompt:
      'You are Gemini 3.8 Flash, optimized for live web search grounding, geospatial intelligence, and multimodal speed.',
  },
  {
    id: 'gemini-3-1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite (Native Free)',
    provider: 'Google Gemini',
    geminiModel: 'gemini-3.1-flash-lite',
    badge: 'High Throughput',
    costBadge: '$0.00 · Free Forever',
    contextWindow: '1M tokens',
    description: 'Zero-cost high-frequency model for instant summarization and interactive chat.',
    personaPrompt:
      'You are Gemini 3.1 Flash-Lite, delivering instant, clear, high-efficiency responses.',
  },

  // 3. OpenAI GPT & o-Series Reasoning ($0 Free Routed)
  {
    id: 'gpt-4o-omni',
    name: 'GPT-4o Omni (Free Routed)',
    provider: 'OpenAI',
    geminiModel: 'gemini-3.8-flash',
    badge: 'Omni Multimodal',
    costBadge: '$0.00 · Free Forever',
    contextWindow: '128K tokens',
    description: 'Omni-modal conversational synthesis, structured tables, and creative problem solving.',
    personaPrompt:
      'You are operating in GPT-4o Omni mode: provide crisp markdown tables, structured executive summaries, and versatile multimodal analysis.',
  },
  {
    id: 'openai-o3-mini',
    name: 'OpenAI o3-mini High (Free Routed)',
    provider: 'OpenAI',
    geminiModel: 'gemini-4-argon',
    badge: 'STEM Chain-of-Thought',
    costBadge: '$0.00 · Free Forever',
    contextWindow: '200K tokens',
    description: 'Deliberative step-by-step STEM, algorithm design, and mathematical proof verification.',
    personaPrompt:
      'You are operating in o3-mini High Reasoning mode: break down complex math, logic, and algorithms into rigorous step-by-step derivations.',
    defaultExtendedThinking: true,
  },

  // 4. DeepSeek Open-Weights Family ($0 Free Routed)
  {
    id: 'deepseek-r1',
    name: 'DeepSeek-R1 671B (Free Open-Weights)',
    provider: 'DeepSeek',
    geminiModel: 'gemini-4-argon',
    badge: 'Open-Source CoT',
    costBadge: '$0.00 · Free Forever',
    contextWindow: '128K tokens',
    description: 'Full transparent <thinking> chain-of-thought reasoning for math, logic, and code.',
    personaPrompt:
      'You are operating as DeepSeek-R1 (671B RL-trained reasoning model). Always include a detailed <thinking>...</thinking> block verifying your assumptions before answering.',
    defaultExtendedThinking: true,
  },
  {
    id: 'deepseek-v3',
    name: 'DeepSeek-V3 MoE (Free Open-Weights)',
    provider: 'DeepSeek',
    geminiModel: 'gemini-3.8-flash',
    badge: '671B MoE Speed',
    costBadge: '$0.00 · Free Forever',
    contextWindow: '128K tokens',
    description: 'High-speed Mixture-of-Experts model for software engineering and multilingual tasks.',
    personaPrompt:
      'You are operating as DeepSeek-V3 MoE, delivering fast, production-ready code and concise technical explanations.',
  },

  // 5. Meta Llama Open-Weights ($0 Free Routed)
  {
    id: 'llama-3-3-70b',
    name: 'Meta Llama 3.3 70B Instruct (Free)',
    provider: 'Meta Llama',
    geminiModel: 'gemini-3.8-flash',
    badge: 'Open-Weights 70B',
    costBadge: '$0.00 · Free Forever',
    contextWindow: '128K tokens',
    description: 'Meta flagship open-weights instruction model for general assistant and coding tasks.',
    personaPrompt:
      'You are operating as Meta Llama 3.3 70B Instruct, an open-weights community standard for clear, helpful, well-structured instruction following.',
  },

  // 6. Mistral & Qwen Open-Weights ($0 Free Routed)
  {
    id: 'mistral-large-2',
    name: 'Mistral Large 2 / Codestral (Free)',
    provider: 'Mistral & Qwen',
    geminiModel: 'gemini-3.8-flash',
    badge: 'European Frontier',
    costBadge: '$0.00 · Free Forever',
    contextWindow: '128K tokens',
    description: 'European frontier model excelling at multilingual reasoning and polyglot code generation.',
    personaPrompt:
      'You are operating as Mistral Large 2 & Codestral, focusing on clean architectural patterns, multilingual precision, and zero-bloat code.',
  },
  {
    id: 'qwen-2-5-coder',
    name: 'Qwen 2.5 Coder 32B Max (Free)',
    provider: 'Mistral & Qwen',
    geminiModel: 'gemini-4-carbon',
    badge: 'Code Specialist',
    costBadge: '$0.00 · Free Forever',
    contextWindow: '128K tokens',
    description: 'Specialized open-weights coding powerhouse for full-stack apps, SQL, and UI Artifacts.',
    personaPrompt:
      'You are operating as Qwen 2.5 Coder Max, specialized in generating complete, self-contained HTML/SVG/TypeScript Artifacts and clean code.',
  },

  // 7. xAI Grok ($0 Free Routed)
  {
    id: 'grok-3-free',
    name: 'xAI Grok 3 Thinking (Free Routed)',
    provider: 'xAI',
    geminiModel: 'gemini-3.8-flash',
    badge: 'First-Principles',
    costBadge: '$0.00 · Free Forever',
    contextWindow: '128K tokens',
    description: 'Direct, first-principles physics & engineering analysis with live search grounding.',
    personaPrompt:
      'You are operating in Grok 3 Thinking mode: analyze problems from first principles with directness, wit, and quantitative clarity.',
    defaultExtendedThinking: true,
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
    summary: 'Default responses with balanced warmth and clarity',
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

// All static demo threads, projects, starter prompts, and PDFs remain empty
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
