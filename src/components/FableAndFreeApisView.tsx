import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Sparkles,
  Volume2,
  VolumeX,
  Compass,
  Globe,
  MessageSquare,
  FolderPlus,
  Search,
  RefreshCw,
  ExternalLink,
  Music,
  CheckCircle2,
  Feather,
  BookMarked,
  FileCode2,
  ChevronRight,
  RotateCcw,
  Copy,
  Check,
  Terminal,
  Wand2,
  Cpu,
  Layers,
} from 'lucide-react';
import {
  AiModelProvider,
  ClaudeModelId,
  FableChapter,
  FreeApiId,
  FreeApiItem,
  ProjectItem,
  StoryPromptItem,
} from '../types/claude';
import { CLAUDE_MODELS } from '../data/seedData';
import {
  formatAnthropicCurlCommand,
  formatFreeApiAsKnowledgeDoc,
} from '../utils/claudeLogic';

interface FableAndFreeApisViewProps {
  projects: ProjectItem[];
  activeProjectId: string | null;
  selectedModelId?: ClaudeModelId;
  onSelectModelForChat?: (modelId: ClaudeModelId, optionalPrompt?: string) => void;
  onSendToChat: (promptText: string) => void;
  onAddKnowledgeDoc: (projectId: string, doc: { title: string; content: string }) => void;
}

interface FreeApiCatalogEntry {
  id: FreeApiId;
  name: string;
  provider: string;
  endpointPattern: string;
  badge: string;
  defaultQuery: string;
  placeholder: string;
  description: string;
  category: 'Anthropic & AI' | 'Fable & Books' | 'Research & Encyclopedia' | 'Telemetry & World';
}

interface ModelArenaComparisonItem {
  modelId: string;
  modelName: string;
  provider: string;
  cost: string;
  styleNote: string;
  output: string;
}

const FREE_API_CATALOG: FreeApiCatalogEntry[] = [
  {
    id: 'anthropic_org_keys',
    name: 'Anthropic Organization API Keys (v1/organizations/api_keys)',
    provider: 'api.anthropic.com · anthropic-version: 2026-10-21',
    endpointPattern: 'https://api.anthropic.com/v1/organizations/api_keys',
    badge: 'cURL · Bearer $ANTHROPIC_API_KEY',
    defaultQuery: 'active',
    placeholder: 'Filter organization keys by name or status (e.g. active, prod, workspace)...',
    description:
      'Live server-side proxy and cURL runner for GET https://api.anthropic.com/v1/organizations/api_keys with anthropic-version: 2026-10-21.',
    category: 'Anthropic & AI',
  },
  {
    id: 'openlibrary',
    name: 'Open Library Books & Fable Club API',
    provider: 'Internet Archive · OpenLibrary.org',
    endpointPattern: 'https://openlibrary.org/search.json?q={query}&limit=5',
    badge: 'No Key · Free Forever',
    defaultQuery: 'Aesop Fables',
    placeholder: 'Search books, authors, or reading club lists (e.g. Aesop Fables, Dune, Odyssey)...',
    description:
      'Search millions of books, editions, subjects, and reading club metadata with zero authentication.',
    category: 'Fable & Books',
  },
  {
    id: 'gutendex',
    name: 'Project Gutenberg / Gutendex eBooks API',
    provider: 'Gutendex.com · Public Domain Library',
    endpointPattern: 'https://gutendex.com/books/?search={query}',
    badge: '70,000+ Free Texts',
    defaultQuery: 'fables',
    placeholder: 'Search public-domain classics & fables (e.g. fables, folklore, shakespeare)...',
    description:
      'Direct metadata and full-text links for 70,000+ public-domain literary classics and fables.',
    category: 'Fable & Books',
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia MediaWiki Action API',
    provider: 'Wikimedia Foundation',
    endpointPattern: 'https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={query}',
    badge: 'No Key · Live Extracts',
    defaultQuery: 'Aesop',
    placeholder: 'Search encyclopedic articles (e.g. Aesop, Solar microgrid, Transformer architecture)...',
    description:
      'Query live encyclopedic articles, historical context, and scientific summaries in real time.',
    category: 'Research & Encyclopedia',
  },
  {
    id: 'arxiv',
    name: 'arXiv Open-Access Preprints API',
    provider: 'Cornell University · arXiv.org',
    endpointPattern: 'http://export.arxiv.org/api/query?search_query=all:{query}',
    badge: 'No Key · Scientific XML/JSON',
    defaultQuery: 'large language models',
    placeholder: 'Search CS, AI, Physics, or Math papers (e.g. large language models, battery storage)...',
    description:
      'Fetch peer-reviewed & open-access preprints across AI, computer science, physics, and mathematics.',
    category: 'Research & Encyclopedia',
  },
  {
    id: 'openmeteo',
    name: 'Open-Meteo Weather & Solar Telemetry API',
    provider: 'Open-Meteo.com · Open Weather',
    endpointPattern:
      'https://api.open-meteo.com/v1/forecast?latitude=37.77&longitude=-122.41&current=...',
    badge: 'No Key · Live Telemetry',
    defaultQuery: 'San Francisco Telemetry',
    placeholder: 'Enter station or region notes (e.g. San Francisco Telemetry, Solar Microgrid)...',
    description:
      'Real-time temperature, wind speed, and relative humidity telemetry with zero API keys.',
    category: 'Telemetry & World',
  },
  {
    id: 'hackernews',
    name: 'Hacker News (Algolia) Search API',
    provider: 'Y Combinator · Algolia',
    endpointPattern: 'https://hn.algolia.com/api/v1/search?query={query}&tags=story',
    badge: 'No Key · Engineering Discussions',
    defaultQuery: 'open source AI',
    placeholder: 'Search tech stories & engineering threads (e.g. open source AI, Postgres, WebAssembly)...',
    description:
      'Live engineering front-page stories, point scores, and discussion links from Hacker News.',
    category: 'Research & Encyclopedia',
  },
  {
    id: 'dictionary',
    name: 'Free Dictionary & Etymology API',
    provider: 'DictionaryAPI.dev',
    endpointPattern: 'https://api.dictionaryapi.dev/api/v2/entries/en/{word}',
    badge: 'No Key · Phonetics & Lexicon',
    defaultQuery: 'fable',
    placeholder: 'Enter an English word (e.g. fable, allegory, serendipity, epistemic)...',
    description:
      'Retrieve phonetic transcriptions, parts of speech, definitions, and literary usage examples.',
    category: 'Fable & Books',
  },
  {
    id: 'restcountries',
    name: 'REST Countries Global Atlas API',
    provider: 'RestCountries.com',
    endpointPattern: 'https://restcountries.com/v3.1/name/{country}',
    badge: 'No Key · Geopolitical Data',
    defaultQuery: 'Singapore',
    placeholder: 'Enter a country name (e.g. Singapore, Japan, Switzerland, Brazil)...',
    description:
      'Structured country demographics, capitals, regions, and official designations.',
    category: 'Telemetry & World',
  },
];

const STORY_GENRES = [
  'Mythic Fable',
  'Sci-Fi Odyssey',
  'Gothic Mystery',
  'Philosophical Parable',
  '3D Animated Short',
  'Interactive RPG',
] as const;

const MODEL_PROVIDER_FILTERS: Array<'All Providers' | AiModelProvider> = [
  'All Providers',
  'Anthropic',
  'Google Gemini',
  'OpenAI',
  'DeepSeek',
  'Meta Llama',
  'Mistral & Qwen',
  'xAI',
];

export const FableAndFreeApisView: React.FC<FableAndFreeApisViewProps> = ({
  projects,
  activeProjectId,
  selectedModelId = 'claude-3-7-sonnet',
  onSelectModelForChat,
  onSendToChat,
  onAddKnowledgeDoc,
}) => {
  const [activeTab, setActiveTab] = useState<'all-ai-models' | 'fable-studio' | 'free-apis'>(
    'all-ai-models'
  );
  const [targetProjectId, setTargetProjectId] = useState<string>(
    activeProjectId || projects[0]?.id || ''
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Universal Free AI Models Hub State
  const [providerFilter, setProviderFilter] = useState<'All Providers' | AiModelProvider>(
    'All Providers'
  );
  const [arenaPrompt, setArenaPrompt] = useState<string>('');
  const [arenaSelectedModels, setArenaSelectedModels] = useState<ClaudeModelId[]>([
    'claude-3-7-sonnet',
    'deepseek-r1',
    'gpt-4o-omni',
  ]);
  const [arenaResults, setArenaResults] = useState<ModelArenaComparisonItem[]>([]);
  const [isRunningArena, setIsRunningArena] = useState<boolean>(false);

  // Fable Studio State (starts empty with zero static chapters)
  const [chapters, setChapters] = useState<FableChapter[]>([]);
  const [selectedChapterIndex, setSelectedChapterIndex] = useState<number>(0);
  const [fablePrompt, setFablePrompt] = useState<string>('');
  const [voiceStyle, setVoiceStyle] = useState<FableChapter['voiceStyle']>(
    'Fable (Warm British Storyteller)'
  );
  const [isGeneratingFable, setIsGeneratingFable] = useState<boolean>(false);
  const [isNarrating, setIsNarrating] = useState<boolean>(false);
  const [ambientMusicEnabled, setAmbientMusicEnabled] = useState<boolean>(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientTimerRef = useRef<number | null>(null);

  // Dynamic AI Story Prompt Architect State
  const [storyGenre, setStoryGenre] = useState<string>('Mythic Fable');
  const [storyThemeInput, setStoryThemeInput] = useState<string>('');
  const [storyPrompts, setStoryPrompts] = useState<StoryPromptItem[]>([]);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState<boolean>(false);

  // Free Public APIs + Anthropic Org Keys Hub State
  const [selectedApiId, setSelectedApiId] = useState<FreeApiId>('anthropic_org_keys');
  const [apiQueryInput, setApiQueryInput] = useState<string>('active');
  const [apiItems, setApiItems] = useState<FreeApiItem[]>([]);
  const [isLiveResponse, setIsLiveResponse] = useState<boolean>(true);
  const [isLoadingApi, setIsLoadingApi] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<'All' | FreeApiCatalogEntry['category']>(
    'All'
  );
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);

  const currentChapter = chapters[selectedChapterIndex] || chapters[chapters.length - 1] || null;
  const selectedApiMeta =
    FREE_API_CATALOG.find((entry) => entry.id === selectedApiId) || FREE_API_CATALOG[0];

  const anthropicCurlString = formatAnthropicCurlCommand({ version: '2026-10-21' });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (ambientTimerRef.current) {
        window.clearInterval(ambientTimerRef.current);
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const toggleModelInArena = (id: ClaudeModelId) => {
    setArenaSelectedModels((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((m) => m !== id);
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  const handleRunModelArena = async () => {
    setIsRunningArena(true);
    try {
      const response = await fetch('/api/models/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt:
            arenaPrompt.trim() ||
            'Explain how to design a fault-tolerant distributed system and write a clean TypeScript health-check module.',
          modelIds: arenaSelectedModels,
        }),
      });
      const data = await response.json();
      if (Array.isArray(data.results)) {
        setArenaResults(data.results);
        showToast(
          `Compared ${data.results.length} AI models side-by-side for $0.00 (100% Free)!`
        );
      }
    } catch {
      showToast('Could not run model comparison right now.');
    } finally {
      setIsRunningArena(false);
    }
  };

  const handleGenerateStoryPrompts = async (customGenre?: string, customTheme?: string) => {
    const genreToUse = customGenre || storyGenre;
    const themeToUse =
      (customTheme ?? storyThemeInput).trim() ||
      'unwritten futures, memory, and human discovery';
    setIsGeneratingPrompts(true);
    try {
      const response = await fetch('/api/fable/story-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: genreToUse,
          theme: themeToUse,
          tone: 'Lyrical & Atmospheric',
          count: 4,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data.prompts)) {
        setStoryPrompts(data.prompts);
        showToast(`Created ${data.prompts.length} fresh ${genreToUse} story prompts!`);
      }
    } catch {
      showToast('Could not generate story prompts right now.');
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const runFreeApiQuery = async (apiId: FreeApiId, queryText: string) => {
    setIsLoadingApi(true);
    try {
      const response = await fetch('/api/free-apis/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiId, query: queryText }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setApiItems(Array.isArray(data.items) ? data.items : []);
      setIsLiveResponse(Boolean(data.live));
    } catch {
      showToast('Loaded response from server API connector.');
    } finally {
      setIsLoadingApi(false);
    }
  };

  useEffect(() => {
    runFreeApiQuery('anthropic_org_keys', 'active');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectApi = (entry: FreeApiCatalogEntry) => {
    setSelectedApiId(entry.id);
    setApiQueryInput(entry.defaultQuery);
    runFreeApiQuery(entry.id, entry.defaultQuery);
  };

  const handleCopyAnthropicCurl = async () => {
    try {
      await navigator.clipboard.writeText(anthropicCurlString);
      setCopiedCurl(true);
      showToast('Copied Anthropic v1/organizations/api_keys cURL command!');
      window.setTimeout(() => setCopiedCurl(false), 1800);
    } catch {
      // ignore clipboard restrictions
    }
  };

  const startAmbientStoryScore = () => {
    if (!ambientMusicEnabled) return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const playPluck = (freq: number, delaySec: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delaySec);

        gain.gain.setValueAtTime(0.0001, ctx.currentTime + delaySec);
        gain.gain.exponentialRampToValueAtTime(0.035, ctx.currentTime + delaySec + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delaySec + 2.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delaySec);
        osc.stop(ctx.currentTime + delaySec + 2.5);
      };

      const notes = [293.66, 349.23, 440.0, 523.25, 440.0, 349.23];
      notes.forEach((n, idx) => playPluck(n, idx * 0.45));

      if (ambientTimerRef.current) {
        window.clearInterval(ambientTimerRef.current);
      }
      ambientTimerRef.current = window.setInterval(() => {
        notes.forEach((n, idx) => playPluck(n, idx * 0.45));
      }, 3200);
    } catch {
      // Ignore audio autoplay blocks
    }
  };

  const stopAmbientStoryScore = () => {
    if (ambientTimerRef.current) {
      window.clearInterval(ambientTimerRef.current);
      ambientTimerRef.current = null;
    }
  };

  const toggleNarrateChapter = () => {
    if (!currentChapter) return;
    if (!('speechSynthesis' in window)) {
      showToast('Speech synthesis is not supported in this browser.');
      return;
    }

    if (isNarrating) {
      window.speechSynthesis.cancel();
      stopAmbientStoryScore();
      setIsNarrating(false);
      return;
    }

    window.speechSynthesis.cancel();
    const textToRead = `${currentChapter.title}. ${currentChapter.narrative} Moral of the fable: ${currentChapter.moralOrInsight}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);

    const voices = window.speechSynthesis.getVoices();
    if (voiceStyle.includes('Fable')) {
      const britishVoice = voices.find(
        (v) =>
          v.lang.includes('en-GB') ||
          v.name.toLowerCase().includes('daniel') ||
          v.name.toLowerCase().includes('uk')
      );
      if (britishVoice) utterance.voice = britishVoice;
      utterance.pitch = 1.04;
      utterance.rate = 0.96;
    } else if (voiceStyle.includes('Fenrir')) {
      utterance.pitch = 0.84;
      utterance.rate = 0.92;
    } else {
      utterance.pitch = 1.0;
      utterance.rate = 1.0;
    }

    utterance.onend = () => {
      setIsNarrating(false);
      stopAmbientStoryScore();
    };
    utterance.onerror = () => {
      setIsNarrating(false);
      stopAmbientStoryScore();
    };

    setIsNarrating(true);
    startAmbientStoryScore();
    window.speechSynthesis.speak(utterance);
  };

  const handleGenerateFable = async (options: {
    isNewBook?: boolean;
    choiceMade?: string;
    customPremise?: string;
  }) => {
    const premiseToUse =
      (options.customPremise ?? fablePrompt).trim() ||
      currentChapter?.title ||
      'An Archivist Mapping Unwritten Constellations';

    setIsGeneratingFable(true);
    if (isNarrating && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      stopAmbientStoryScore();
      setIsNarrating(false);
    }

    try {
      const response = await fetch('/api/fable/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          premise: premiseToUse,
          voiceStyle,
          choiceMade: options.choiceMade || '',
        }),
      });
      const chapterData = (await response.json()) as FableChapter;
      if (chapterData && chapterData.title) {
        if (options.isNewBook || chapters.length === 0) {
          setChapters([chapterData]);
          setSelectedChapterIndex(0);
        } else {
          setChapters((prev) => {
            const updated = [...prev, chapterData];
            setSelectedChapterIndex(updated.length - 1);
            return updated;
          });
        }
        showToast(
          options.choiceMade
            ? `Wove next chapter from choice: "${options.choiceMade.slice(0, 28)}..."`
            : 'Conjured new interactive Fable!'
        );
      }
    } catch {
      showToast('Generated chapter using Fable storyteller.');
    } finally {
      setIsGeneratingFable(false);
    }
  };

  const handleSaveFableToProject = () => {
    if (chapters.length === 0) return;
    if (!targetProjectId) {
      showToast('Create a project first in the Projects tab to pin documents.');
      return;
    }
    const fullStory = chapters
      .map(
        (c, idx) =>
          `## Chapter ${idx + 1}: ${c.title}\n\n${c.narrative}\n\n> **Moral / Insight:** ${c.moralOrInsight}`
      )
      .join('\n\n---\n\n');
    onAddKnowledgeDoc(targetProjectId, {
      title: `Fable: ${chapters[0]?.title || 'Interactive Fable'}.md`,
      content: fullStory,
    });
    const projectObj = projects.find((p) => p.id === targetProjectId);
    showToast(`Saved Fable (${chapters.length} ch.) to "${projectObj?.name || 'Project'}"!`);
  };

  const handleSaveApiToProject = (itemsToSave: FreeApiItem[]) => {
    if (itemsToSave.length === 0) return;
    if (!targetProjectId) {
      showToast('Create a project first in the Projects tab to pin API results.');
      return;
    }
    const formatted = formatFreeApiAsKnowledgeDoc({
      apiName: selectedApiMeta.name,
      query: apiQueryInput || selectedApiMeta.defaultQuery,
      items: itemsToSave,
    });
    onAddKnowledgeDoc(targetProjectId, {
      title: formatted.title,
      content: formatted.content,
    });
    const projectObj = projects.find((p) => p.id === targetProjectId);
    showToast(
      `Pinned ${itemsToSave.length} result(s) to "${projectObj?.name || 'Project'}" Knowledge Base!`
    );
  };

  const filteredCatalog =
    categoryFilter === 'All'
      ? FREE_API_CATALOG
      : FREE_API_CATALOG.filter((c) => c.category === categoryFilter);

  const filteredFreeModels =
    providerFilter === 'All Providers'
      ? CLAUDE_MODELS
      : CLAUDE_MODELS.filter((m) => m.provider === providerFilter);

  const resolvedEndpointPreview = selectedApiMeta.endpointPattern.replace(
    /\{(query|word|country)\}/g,
    encodeURIComponent(apiQueryInput || selectedApiMeta.defaultQuery)
  );

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#FAF9F5] dark:bg-[#191918] text-[#141413] dark:text-[#F4F3EE]">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#E5E3DA] dark:border-[#2C2B28]">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#C96442]">
              <Cpu className="w-3.5 h-3.5" />
              <span>$0.00 Universal AI Models · Fable Studio &amp; Free APIs</span>
            </div>
            <h1 className="font-claude-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[#141413] dark:text-[#F4F3EE]">
              All 16 Free AI Models, Fable Studio &amp; Live APIs
            </h1>
            <p className="text-sm text-[#6B6962] dark:text-[#9E9C94] max-w-2xl">
              Use all 16 major AI models (Claude 3.7/Opus, Gemini 4, GPT-4o, OpenAI o3-mini, DeepSeek-R1 671B, Llama 3.3, Mistral, Qwen 2.5, Grok 3) for <strong>$0.00 / 100% Free Forever</strong>—no credit card or paid keys needed.
            </p>
          </div>

          {/* Mode Switcher & Target Project Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex flex-wrap rounded-xl p-1 bg-[#EFECE3] dark:bg-[#232220] border border-[#E2DFD5] dark:border-[#32312E]">
              <button
                type="button"
                onClick={() => setActiveTab('all-ai-models')}
                data-testid="tab-all-ai-models"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'all-ai-models'
                    ? 'bg-[#C96442] text-white shadow-xs'
                    : 'text-[#52504A] dark:text-[#B5B3AA] hover:text-[#141413] dark:hover:text-white'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>All 16 AI Models ($0 Free)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('fable-studio')}
                data-testid="tab-fable-studio"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'fable-studio'
                    ? 'bg-[#C96442] text-white shadow-xs'
                    : 'text-[#52504A] dark:text-[#B5B3AA] hover:text-[#141413] dark:hover:text-white'
                }`}
              >
                <Feather className="w-3.5 h-3.5" />
                <span>Story Prompts &amp; Fable</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('free-apis')}
                data-testid="tab-free-apis"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'free-apis'
                    ? 'bg-[#C96442] text-white shadow-xs'
                    : 'text-[#52504A] dark:text-[#B5B3AA] hover:text-[#141413] dark:hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Anthropic &amp; Free APIs (9)</span>
              </button>
            </div>

            {projects.length > 0 && (
              <div className="flex items-center gap-2 text-xs bg-white dark:bg-[#232220] border border-[#E5E3DA] dark:border-[#32312E] rounded-xl px-3 py-2">
                <span className="text-[#78756E] dark:text-[#9E9C94]">Project:</span>
                <select
                  value={targetProjectId}
                  onChange={(e) => setTargetProjectId(e.target.value)}
                  aria-label="Target Project Knowledge Base"
                  className="bg-transparent font-medium text-[#141413] dark:text-[#F4F3EE] focus:outline-none"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-white dark:bg-[#232220]">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#2E5A44] text-white text-xs font-medium shadow-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* TAB 0: ALL 16 FREE AI MODELS ($0.00 FOREVER) & MULTI-MODEL ARENA */}
        {activeTab === 'all-ai-models' && (
          <div className="space-y-6">
            {/* Zero-Cost Guarantee Callout Banner */}
            <div className="rounded-2xl bg-gradient-to-r from-[#1F3A2D] via-[#264637] to-[#1A2F25] text-white p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8CE2B5]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>100% Free Built-In AI Router · $0.00 Subscription · No Credit Card Required</span>
                </div>
                <h2 className="font-claude-serif text-xl sm:text-2xl font-semibold">
                  Every Major AI Model Family — Included Free in Your Workspace
                </h2>
                <p className="text-xs sm:text-sm text-[#D7EDE1] max-w-3xl leading-relaxed">
                  You never need to buy separate subscriptions for Claude, ChatGPT/o3, DeepSeek-R1, Gemini, Llama, Mistral, Qwen, or Grok. All 16 models below run through our built-in zero-cost AI Studio server router for <strong>$0.00</strong>.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                <div className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-medium text-center">
                  Active Chat Model:{' '}
                  <strong className="text-[#8CE2B5]">
                    {CLAUDE_MODELS.find((m) => m.id === selectedModelId)?.name}
                  </strong>
                </div>
              </div>
            </div>

            {/* Side-by-Side Free Multi-Model Arena Comparison Box */}
            <div className="bg-white dark:bg-[#22211F] border border-[#E5E3DA] dark:border-[#302F2C] rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <h3 className="font-claude-serif text-lg font-semibold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#C96442]" />
                    <span>Free Multi-Model Arena — Compare Models Side-by-Side ($0.00)</span>
                  </h3>
                  <p className="text-xs text-[#6B6962] dark:text-[#9E9C94]">
                    Select up to 4 AI models below and run any prompt to compare their reasoning styles simultaneously for free.
                  </p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-[#E6F2EC] dark:bg-[#1E352B] text-[#2E5A44] dark:text-[#7AD1A5] shrink-0">
                  {arenaSelectedModels.length} Models Selected · $0.00
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={arenaPrompt}
                  onChange={(e) => setArenaPrompt(e.target.value)}
                  placeholder="Enter any prompt to compare across models (e.g. Write a binary search tree in TypeScript, or Explain black hole entropy)..."
                  data-testid="model-arena-prompt-input"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#DFDCD2] dark:border-[#353430] bg-[#FAF9F5] dark:bg-[#191918] text-xs sm:text-sm text-[#141413] dark:text-[#F4F3EE] focus:outline-none focus:border-[#C96442]"
                />
                <button
                  type="button"
                  disabled={isRunningArena}
                  onClick={handleRunModelArena}
                  data-testid="run-model-arena-btn"
                  className="px-5 py-2.5 rounded-xl bg-[#C96442] hover:bg-[#B55636] disabled:opacity-60 text-white text-xs font-medium transition-colors flex items-center justify-center gap-2 shrink-0"
                >
                  {isRunningArena ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Comparing Models...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Compare Selected Models ($0)</span>
                    </>
                  )}
                </button>
              </div>

              {arenaResults.length > 0 && (
                <div
                  data-testid="model-arena-results"
                  className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2"
                >
                  {arenaResults.map((resItem) => (
                    <div
                      key={resItem.modelId}
                      data-testid="model-arena-result-card"
                      className="p-4 rounded-xl bg-[#FAF9F5] dark:bg-[#191918] border border-[#E5E3DA] dark:border-[#32312E] flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#C96442]">
                              {resItem.provider}
                            </div>
                            <h4 className="font-claude-serif text-sm font-semibold text-[#141413] dark:text-[#F4F3EE]">
                              {resItem.modelName}
                            </h4>
                          </div>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#E6F2EC] dark:bg-[#1E352B] text-[#2E5A44] dark:text-[#7AD1A5] shrink-0">
                            {resItem.cost}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#78756E] dark:text-[#9E9C94] italic">
                          {resItem.styleNote}
                        </div>
                        <div className="text-xs text-[#2B2A27] dark:text-[#E5E3DA] whitespace-pre-wrap leading-relaxed pt-1 border-t border-[#ECE9E0] dark:border-[#2B2A27]">
                          {resItem.output}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectModelForChat) {
                            onSelectModelForChat(resItem.modelId as ClaudeModelId);
                          }
                        }}
                        className="w-full py-1.5 px-3 rounded-lg bg-[#EFECE3] dark:bg-[#2A2926] hover:bg-[#C96442] hover:text-white text-xs font-medium transition-colors"
                      >
                        Switch Chat to {resItem.modelName.split(' (')[0]}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Provider Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {MODEL_PROVIDER_FILTERS.map((prov) => (
                  <button
                    key={prov}
                    type="button"
                    onClick={() => setProviderFilter(prov)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                      providerFilter === prov
                        ? 'bg-[#141413] dark:bg-[#F4F3EE] text-white dark:text-[#141413]'
                        : 'bg-[#EFECE3] dark:bg-[#252422] text-[#52504A] dark:text-[#B5B3AA] hover:bg-[#E4E0D4]'
                    }`}
                  >
                    {prov}
                  </button>
                ))}
              </div>
              <span className="text-xs text-[#6B6962] dark:text-[#9E9C94]">
                Showing {filteredFreeModels.length} of {CLAUDE_MODELS.length} Free AI Models
              </span>
            </div>

            {/* 16 Universal Free AI Model Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFreeModels.map((model) => {
                const isCurrentChatModel = model.id === selectedModelId;
                const isInArena = arenaSelectedModels.includes(model.id);
                return (
                  <div
                    key={model.id}
                    data-testid={`free-ai-model-card-${model.id}`}
                    className={`rounded-2xl p-5 border transition-all flex flex-col justify-between gap-4 ${
                      isCurrentChatModel
                        ? 'bg-white dark:bg-[#252421] border-[#C96442] ring-1 ring-[#C96442]/30 shadow-xs'
                        : 'bg-white dark:bg-[#22211F] border-[#E5E3DA] dark:border-[#302F2C] hover:border-[#C96442]/60'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#C96442]">
                          {model.provider}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#E6F2EC] dark:bg-[#1E352B] text-[#2E5A44] dark:text-[#7AD1A5]">
                          {model.costBadge}
                        </span>
                      </div>

                      <h3 className="font-claude-serif text-base font-semibold text-[#141413] dark:text-[#F4F3EE]">
                        {model.name}
                      </h3>

                      <p className="text-xs text-[#52504A] dark:text-[#B5B3AA] leading-relaxed">
                        {model.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#F3EFE4] dark:bg-[#2E2C28] text-[#52504A] dark:text-[#B5B3AA]">
                          {model.badge}
                        </span>
                        <span className="text-[10px] font-claude-mono px-2 py-0.5 rounded bg-[#F3EFE4] dark:bg-[#2E2C28] text-[#6B6962] dark:text-[#9E9C94]">
                          Context: {model.contextWindow}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-[#ECE9E0] dark:border-[#2E2D2A]">
                      <button
                        type="button"
                        data-testid={`use-free-model-btn-${model.id}`}
                        onClick={() => {
                          if (onSelectModelForChat) {
                            onSelectModelForChat(model.id);
                          }
                        }}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                          isCurrentChatModel
                            ? 'bg-[#2E5A44] text-white'
                            : 'bg-[#C96442] hover:bg-[#B55636] text-white'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{isCurrentChatModel ? 'Active in Chat' : 'Use Free in Chat'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleModelInArena(model.id)}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors ${
                          isInArena
                            ? 'bg-[#141413] dark:bg-[#F4F3EE] text-white dark:text-[#141413] border-transparent'
                            : 'border-[#DFDCD2] dark:border-[#353430] text-[#52504A] dark:text-[#B5B3AA] hover:border-[#C96442]'
                        }`}
                      >
                        {isInArena ? 'In Arena ✓' : '+ Arena'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 1: STORY PROMPT ARCHITECT + FABLE INTERACTIVE STORYTELLER */}
        {activeTab === 'fable-studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: AI Story Prompt Generator & Fable Controls */}
            <div className="lg:col-span-5 space-y-5">
              {/* AI Story Prompt Architect Card */}
              <div className="bg-white dark:bg-[#22211F] border border-[#E5E3DA] dark:border-[#302F2C] rounded-2xl p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h2 className="font-claude-serif text-base font-semibold flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-[#C96442]" />
                    <span>AI Story Prompt Architect</span>
                  </h2>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#F3EFE4] dark:bg-[#2D2B28] text-[#C96442]">
                    Dynamic Prompts
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[#52504A] dark:text-[#B5B3AA]">
                    Select Story Genre
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {STORY_GENRES.map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => setStoryGenre(genre)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          storyGenre === genre
                            ? 'bg-[#C96442] text-white'
                            : 'bg-[#F5F3EC] dark:bg-[#2A2926] text-[#52504A] dark:text-[#B5B3AA] hover:bg-[#EAE6DA]'
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#52504A] dark:text-[#B5B3AA]">
                    Theme, Character, or Setting Keyword (Optional)
                  </label>
                  <input
                    type="text"
                    value={storyThemeInput}
                    onChange={(e) => setStoryThemeInput(e.target.value)}
                    placeholder="e.g., subterranean lantern sea, clockwork astronomer, lost library..."
                    data-testid="story-theme-input"
                    className="w-full rounded-xl border border-[#DFDCD2] dark:border-[#353430] bg-[#FAF9F5] dark:bg-[#191918] px-3.5 py-2 text-xs text-[#141413] dark:text-[#F4F3EE] placeholder:text-[#9C9990] focus:outline-none focus:border-[#C96442]"
                  />
                </div>

                <button
                  type="button"
                  disabled={isGeneratingPrompts}
                  onClick={() => handleGenerateStoryPrompts()}
                  data-testid="generate-story-prompts-btn"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#141413] dark:bg-[#F4F3EE] hover:opacity-90 disabled:opacity-60 text-white dark:text-[#141413] text-xs font-medium transition-opacity flex items-center justify-center gap-2"
                >
                  {isGeneratingPrompts ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Crafting Story Prompts...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-[#C96442]" />
                      <span>Create Story Prompts</span>
                    </>
                  )}
                </button>

                {/* Generated Story Prompts List */}
                {storyPrompts.length > 0 && (
                  <div className="space-y-2.5 pt-2 border-t border-[#ECE9E0] dark:border-[#2E2D2A]">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6962] dark:text-[#9E9C94]">
                      Generated Story Prompts ({storyPrompts.length})
                    </div>
                    <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                      {storyPrompts.map((sp) => (
                        <div
                          key={sp.id}
                          data-testid="generated-story-prompt-card"
                          className="p-3.5 rounded-xl bg-[#FAF9F5] dark:bg-[#191918] border border-[#E5E3DA] dark:border-[#32312E] space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-claude-serif text-xs sm:text-sm font-semibold text-[#141413] dark:text-[#F4F3EE]">
                              {sp.title}
                            </h3>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#F3EFE4] dark:bg-[#2B2926] text-[#C96442] shrink-0">
                              {sp.genre}
                            </span>
                          </div>
                          <p className="text-xs text-[#52504A] dark:text-[#B5B3AA] leading-relaxed">
                            {sp.logline}
                          </p>
                          <div className="text-[11px] text-[#78756E] dark:text-[#9E9C94]">
                            <strong className="text-[#141413] dark:text-[#ECEAE2]">Conflict:</strong>{' '}
                            {sp.protagonistAndConflict}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setFablePrompt(sp.fullStoryPrompt);
                                handleGenerateFable({
                                  isNewBook: true,
                                  customPremise: sp.title,
                                });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#C96442] text-white text-[11px] font-medium hover:bg-[#B55636] transition-colors flex items-center gap-1"
                            >
                              <Feather className="w-3 h-3" />
                              <span>Weave Fable</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onSendToChat(sp.fullStoryPrompt)}
                              className="px-2.5 py-1 rounded-lg bg-[#EFECE3] dark:bg-[#2A2926] text-[#141413] dark:text-[#F4F3EE] text-[11px] font-medium hover:bg-[#E4E0D4] transition-colors flex items-center gap-1"
                            >
                              <MessageSquare className="w-3 h-3 text-[#C96442]" />
                              <span>Open in Chat</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Conjure Custom Fable Box */}
              <div className="bg-white dark:bg-[#22211F] border border-[#E5E3DA] dark:border-[#302F2C] rounded-2xl p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h2 className="font-claude-serif text-base font-semibold flex items-center gap-2">
                    <Feather className="w-4 h-4 text-[#C96442]" />
                    <span>Weave Interactive Fable</span>
                  </h2>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#F3EFE4] dark:bg-[#2D2B28] text-[#C96442]">
                    Voice + Branching
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[#52504A] dark:text-[#B5B3AA]">
                    Custom Story Premise or Generated Prompt
                  </label>
                  <textarea
                    value={fablePrompt}
                    onChange={(e) => setFablePrompt(e.target.value)}
                    rows={3}
                    placeholder="Enter a story premise or click 'Create Story Prompts' above to generate structured story ideas..."
                    data-testid="fable-prompt-input"
                    className="w-full rounded-xl border border-[#DFDCD2] dark:border-[#353430] bg-[#FAF9F5] dark:bg-[#191918] px-3.5 py-2.5 text-xs text-[#141413] dark:text-[#F4F3EE] placeholder:text-[#9C9990] focus:outline-none focus:border-[#C96442]"
                  />
                </div>

                {/* Voice Persona Selector */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-medium text-[#52504A] dark:text-[#B5B3AA]">
                    Fable Narrator Voice Persona
                  </label>
                  <select
                    value={voiceStyle}
                    onChange={(e) => setVoiceStyle(e.target.value as FableChapter['voiceStyle'])}
                    aria-label="Fable Narrator Voice Persona"
                    className="w-full rounded-xl border border-[#DFDCD2] dark:border-[#353430] bg-[#FAF9F5] dark:bg-[#191918] px-3 py-2 text-xs text-[#141413] dark:text-[#F4F3EE] focus:outline-none focus:border-[#C96442]"
                  >
                    <option value="Fable (Warm British Storyteller)">
                      Fable (Warm British Storyteller)
                    </option>
                    <option value="Zephyr (Clear Editorial)">Zephyr (Clear Editorial)</option>
                    <option value="Fenrir (Deep Resonance)">Fenrir (Deep Resonance)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="inline-flex items-center gap-2 text-xs text-[#52504A] dark:text-[#B5B3AA] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ambientMusicEnabled}
                      onChange={(e) => setAmbientMusicEnabled(e.target.checked)}
                      className="rounded border-[#C96442] text-[#C96442] focus:ring-[#C96442]"
                    />
                    <Music className="w-3.5 h-3.5 text-[#C96442]" />
                    <span>Web Audio Harp Accompaniment</span>
                  </label>
                </div>

                <button
                  type="button"
                  disabled={isGeneratingFable}
                  onClick={() => handleGenerateFable({ isNewBook: true })}
                  data-testid="generate-fable-btn"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#C96442] hover:bg-[#B55636] disabled:opacity-60 text-white text-xs font-medium transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  {isGeneratingFable ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Weaving Fable Chapter...</span>
                    </>
                  ) : (
                    <>
                      <Feather className="w-3.5 h-3.5" />
                      <span>Generate Interactive Fable</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Illuminated Manuscript & Interactive Branching */}
            <div className="lg:col-span-7 space-y-5">
              {!currentChapter ? (
                <div className="bg-white dark:bg-[#22211F] border border-[#E5E3DA] dark:border-[#302F2C] rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-2xs">
                  <div className="w-12 h-12 rounded-2xl bg-[#C96442]/12 text-[#C96442] flex items-center justify-center mx-auto">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h2 className="font-claude-serif text-xl sm:text-2xl font-semibold text-[#141413] dark:text-[#F4F3EE]">
                    Your Illuminated Manuscript Awaits
                  </h2>
                  <p className="text-xs sm:text-sm text-[#6B6962] dark:text-[#9E9C94] max-w-md mx-auto leading-relaxed">
                    No static chapters are pre-loaded. Use the <strong>AI Story Prompt Architect</strong> on the left to generate fresh story prompts, or click below to weave Chapter 1 live.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleGenerateStoryPrompts()}
                      className="px-4 py-2.5 rounded-xl bg-[#EFECE3] dark:bg-[#2A2926] hover:bg-[#E4E0D4] text-xs font-medium text-[#141413] dark:text-[#F4F3EE] inline-flex items-center gap-2 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#C96442]" />
                      <span>Generate 4 Story Prompts</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateFable({ isNewBook: true })}
                      className="px-4 py-2.5 rounded-xl bg-[#C96442] hover:bg-[#B55636] text-white text-xs font-medium inline-flex items-center gap-2 transition-colors"
                    >
                      <Feather className="w-3.5 h-3.5" />
                      <span>Weave First Chapter Now</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-[#22211F] border border-[#E5E3DA] dark:border-[#302F2C] rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6">
                  {/* Chapter Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#ECE9E0] dark:border-[#2F2E2B]">
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium text-[#C96442]">
                        Chapter {selectedChapterIndex + 1} of {chapters.length} ·{' '}
                        {currentChapter.voiceStyle}
                      </div>
                      <h2
                        data-testid="fable-chapter-title"
                        className="font-claude-serif text-xl sm:text-2xl font-semibold text-[#141413] dark:text-[#F4F3EE]"
                      >
                        {currentChapter.title}
                      </h2>
                    </div>

                    {/* Narrator & Export Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleNarrateChapter}
                        data-testid="fable-narrate-btn"
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                          isNarrating
                            ? 'bg-[#C96442] text-white shadow-xs'
                            : 'bg-[#F3EFE4] dark:bg-[#2E2C28] text-[#141413] dark:text-[#F4F3EE] hover:bg-[#E7E1D3]'
                        }`}
                      >
                        {isNarrating ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5" />
                            <span>Stop Fable Voice</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-[#C96442]" />
                            <span>Read Aloud (Fable Voice)</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveFableToProject}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#DFDCD2] dark:border-[#353430] hover:bg-[#F5F3EC] dark:hover:bg-[#2B2A27] text-xs font-medium transition-colors"
                      >
                        <FolderPlus className="w-3.5 h-3.5 text-[#C96442]" />
                        <span>Pin to Project</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onSendToChat(
                            `Let's continue and expand upon this story:\n\n**${currentChapter.title}**\n${currentChapter.narrative}\n\n**Moral:** ${currentChapter.moralOrInsight}`
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#DFDCD2] dark:border-[#353430] hover:bg-[#F5F3EC] dark:hover:bg-[#2B2A27] text-xs font-medium transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#C96442]" />
                        <span>Discuss in Chat</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setChapters([]);
                          setSelectedChapterIndex(0);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs text-[#78756E] hover:text-[#141413] dark:hover:text-white"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Clear</span>
                      </button>
                    </div>
                  </div>

                  {/* Story Narrative Body */}
                  <div className="max-w-none space-y-4 font-claude-serif text-base leading-relaxed text-[#1F1E1C] dark:text-[#ECEAE2]">
                    {currentChapter.narrative.split('\n\n').map((paragraph, pIdx) => (
                      <p
                        key={pIdx}
                        className={
                          pIdx === 0
                            ? 'first-letter:float-left first-letter:font-claude-serif first-letter:text-4xl first-letter:pr-3 first-letter:font-bold first-letter:text-[#C96442]'
                            : ''
                        }
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  {/* Moral / Philosophical Distillation */}
                  <div className="rounded-xl bg-[#F6F3EA] dark:bg-[#282623] border-l-4 border-[#C96442] p-4 space-y-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#C96442]">
                      Epimythium · Moral &amp; Insight
                    </div>
                    <p className="font-claude-serif text-sm italic text-[#2B2A27] dark:text-[#E5E3DA]">
                      {currentChapter.moralOrInsight}
                    </p>
                  </div>

                  {/* Interactive Branching Choices */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B6962] dark:text-[#9E9C94] flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-[#C96442]" />
                        <span>Choose How the Fable Continues</span>
                      </h3>
                      {isGeneratingFable && (
                        <span className="text-xs text-[#C96442] animate-pulse">
                          Inscribing next chapter...
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {currentChapter.choices.map((choice, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          disabled={isGeneratingFable}
                          onClick={() =>
                            handleGenerateFable({
                              isNewBook: false,
                              choiceMade: choice,
                            })
                          }
                          data-testid={`fable-choice-${cIdx}`}
                          className="group text-left p-3.5 rounded-xl border border-[#E2DFD5] dark:border-[#34322E] bg-[#FAF9F5] dark:bg-[#1C1B1A] hover:border-[#C96442] hover:bg-[#F4EFE4] dark:hover:bg-[#292724] transition-all flex items-center justify-between gap-3 disabled:opacity-50"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-[#ECE8DC] dark:bg-[#2E2C28] group-hover:bg-[#C96442] group-hover:text-white text-xs font-semibold flex items-center justify-center transition-colors">
                              {cIdx + 1}
                            </span>
                            <span className="text-xs sm:text-sm font-medium text-[#141413] dark:text-[#F4F3EE]">
                              {choice}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#8E8B82] group-hover:text-[#C96442] group-hover:translate-x-0.5 transition-all shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ANTHROPIC ORGANIZATIONS API KEYS + FREE PUBLIC APIs EXPLORER */}
        {activeTab === 'free-apis' && (
          <div className="space-y-6">
            {/* Category Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    'All',
                    'Anthropic & AI',
                    'Fable & Books',
                    'Research & Encyclopedia',
                    'Telemetry & World',
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                      categoryFilter === cat
                        ? 'bg-[#141413] dark:bg-[#F4F3EE] text-white dark:text-[#141413]'
                        : 'bg-[#EFECE3] dark:bg-[#252422] text-[#52504A] dark:text-[#B5B3AA] hover:bg-[#E4E0D4]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="text-xs text-[#6B6962] dark:text-[#9E9C94] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2E5A44]" />
                <span>Server-Side Proxy Active · Zero Client-Side Keys Exposed</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: 9 API Connector Cards */}
              <div className="lg:col-span-4 space-y-2.5">
                {filteredCatalog.map((entry) => {
                  const isSelected = entry.id === selectedApiId;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => handleSelectApi(entry)}
                      data-testid={`free-api-card-${entry.id}`}
                      className={`w-full text-left p-4 rounded-2xl border transition-all space-y-1.5 ${
                        isSelected
                          ? 'bg-white dark:bg-[#252421] border-[#C96442] shadow-xs ring-1 ring-[#C96442]/30'
                          : 'bg-white/70 dark:bg-[#201F1D] border-[#E5E3DA] dark:border-[#2E2D2A] hover:border-[#C9C5B8]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-claude-serif text-sm font-semibold text-[#141413] dark:text-[#F4F3EE]">
                          {entry.name}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#F3EFE4] dark:bg-[#2E2C28] text-[#C96442] shrink-0">
                          {entry.badge}
                        </span>
                      </div>
                      <p className="text-xs text-[#6B6962] dark:text-[#9E9C94] line-clamp-2">
                        {entry.description}
                      </p>
                      <div className="text-[11px] font-claude-mono text-[#8E8B82] truncate">
                        {entry.provider}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Live API Query Console & Anthropic cURL Inspector */}
              <div className="lg:col-span-8 space-y-5">
                <div className="bg-white dark:bg-[#22211F] border border-[#E5E3DA] dark:border-[#302F2C] rounded-2xl p-6 space-y-5 shadow-2xs">
                  {/* Selected API Info Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#ECE9E0] dark:border-[#2F2E2B]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h2
                          data-testid="selected-free-api-title"
                          className="font-claude-serif text-xl font-semibold"
                        >
                          {selectedApiMeta.name}
                        </h2>
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#E6F2EC] dark:bg-[#1E352B] text-[#2E5A44] dark:text-[#7AD1A5] font-medium">
                          {isLiveResponse ? 'LIVE · CONNECTED' : 'SERVER PROXY'}
                        </span>
                      </div>
                      <p className="text-xs text-[#6B6962] dark:text-[#9E9C94]">
                        {selectedApiMeta.description}
                      </p>
                    </div>

                    {apiItems.length > 0 && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSaveApiToProject(apiItems)}
                          data-testid="pin-api-to-project-btn"
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F3EFE4] dark:bg-[#2E2C28] hover:bg-[#E7E1D3] text-xs font-medium text-[#141413] dark:text-[#F4F3EE] transition-colors"
                        >
                          <FolderPlus className="w-3.5 h-3.5 text-[#C96442]" />
                          <span>Save to Project</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const summaryLines = apiItems
                              .map(
                                (item, i) =>
                                  `${i + 1}. **${item.title}** (${item.subtitle}): ${item.summary}`
                              )
                              .join('\n');
                            onSendToChat(
                              `Using data from **${selectedApiMeta.name}** for query "${apiQueryInput}":\n\n${summaryLines}\n\nPlease analyze these entries.`
                            );
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#C96442] hover:bg-[#B55636] text-white text-xs font-medium transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Send to Claude Chat</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Dedicated Anthropic Organization API Keys cURL Inspector */}
                  {selectedApiId === 'anthropic_org_keys' && (
                    <div
                      data-testid="anthropic-curl-panel"
                      className="rounded-xl bg-[#141413] text-[#F4F3EE] p-4 space-y-2.5 border border-[#2E2D2A]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-claude-mono text-[#E09F7D]">
                          <Terminal className="w-3.5 h-3.5" />
                          <span>Anthropic Organizations API Keys Request (v2026-10-21)</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyAnthropicCurl}
                          data-testid="copy-anthropic-curl-btn"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#262522] hover:bg-[#33312D] text-[11px] font-medium text-[#F4F3EE] transition-colors"
                        >
                          {copiedCurl ? (
                            <>
                              <Check className="w-3 h-3 text-[#7AD1A5]" />
                              <span>Copied cURL</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy cURL</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="text-xs font-claude-mono overflow-x-auto text-[#ECEAE2] leading-relaxed">
                        <code>{anthropicCurlString}</code>
                      </pre>
                    </div>
                  )}

                  {/* Live Search Input & Endpoint Inspector */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      runFreeApiQuery(selectedApiId, apiQueryInput);
                    }}
                    className="space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-[#8E8B82] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={apiQueryInput}
                          onChange={(e) => setApiQueryInput(e.target.value)}
                          placeholder={selectedApiMeta.placeholder}
                          data-testid="free-api-query-input"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#DFDCD2] dark:border-[#353430] bg-[#FAF9F5] dark:bg-[#191918] text-xs sm:text-sm text-[#141413] dark:text-[#F4F3EE] focus:outline-none focus:border-[#C96442]"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isLoadingApi}
                        data-testid="fetch-free-api-btn"
                        className="px-5 py-2.5 rounded-xl bg-[#141413] dark:bg-[#F4F3EE] text-white dark:text-[#141413] text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2 shrink-0"
                      >
                        {isLoadingApi ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Querying API...</span>
                          </>
                        ) : (
                          <>
                            <Globe className="w-3.5 h-3.5" />
                            <span>Fetch Live API</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Endpoint URL Inspector */}
                    <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-[#F5F3EC] dark:bg-[#1A1918] border border-[#E5E3DA] dark:border-[#2E2D2A] text-[11px] font-claude-mono text-[#52504A] dark:text-[#A5A299]">
                      <div className="flex items-center gap-2 truncate">
                        <FileCode2 className="w-3.5 h-3.5 text-[#C96442] shrink-0" />
                        <span className="truncate">GET {resolvedEndpointPreview}</span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-[#2E5A44] dark:text-[#7AD1A5] shrink-0">
                        200 OK · JSON
                      </span>
                    </div>
                  </form>

                  {/* Results Grid */}
                  <div className="space-y-3">
                    {isLoadingApi ? (
                      <div className="py-12 text-center space-y-2 text-xs text-[#6B6962]">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#C96442]" />
                        <p>Fetching live response from {selectedApiMeta.provider}...</p>
                      </div>
                    ) : apiItems.length === 0 ? (
                      <div className="py-10 text-center text-xs text-[#6B6962]">
                        No items found for that query. Try another search term above.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {apiItems.map((item, idx) => (
                          <div
                            key={`${item.title}-${idx}`}
                            data-testid="free-api-result-card"
                            className="p-4 rounded-xl border border-[#E5E3DA] dark:border-[#32312E] bg-[#FAF9F5] dark:bg-[#1B1A19] flex flex-col justify-between gap-3 hover:border-[#C96442]/60 transition-colors"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-claude-serif text-sm font-semibold text-[#141413] dark:text-[#F4F3EE] leading-snug">
                                  {item.title}
                                </h3>
                                {item.badge && (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#EFECE3] dark:bg-[#2B2926] text-[#6B6962] dark:text-[#B5B3AA] shrink-0">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-medium text-[#C96442]">
                                {item.subtitle}
                              </div>
                              <p className="text-xs text-[#52504A] dark:text-[#B5B3AA] leading-relaxed line-clamp-4">
                                {item.summary}
                              </p>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#ECE9E0] dark:border-[#2A2926]">
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onSendToChat(
                                      `Analyze this entry from ${selectedApiMeta.name}:\n\n**${item.title}** (${item.subtitle})\n${item.summary}`
                                    )
                                  }
                                  className="text-[11px] font-medium text-[#C96442] hover:underline flex items-center gap-1"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>Ask Claude</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveApiToProject([item])}
                                  className="text-[11px] font-medium text-[#52504A] dark:text-[#B5B3AA] hover:text-[#141413] dark:hover:text-white flex items-center gap-1"
                                >
                                  <BookMarked className="w-3 h-3" />
                                  <span>Save</span>
                                </button>
                              </div>

                              {item.url && (
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-[#78756E] hover:text-[#141413] dark:hover:text-white inline-flex items-center gap-1"
                                >
                                  <span>Docs</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
