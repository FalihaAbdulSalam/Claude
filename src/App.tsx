import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArtifactItem,
  AttachmentItem,
  ChatThread,
  ClaudeModelId,
  MessageItem,
  ProjectItem,
  WritingStyleId,
} from './types/claude';
import { INITIAL_PROJECTS, INITIAL_THREADS } from './data/seedData';
import {
  buildClaudeSystemInstruction,
  deriveThreadTitle,
  estimateTokens,
  parseAssistantOutput,
} from './utils/claudeLogic';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { ArtifactDrawer } from './components/ArtifactDrawer';
import { ProjectsView } from './components/ProjectsView';
import { ArtifactsLibraryView } from './components/ArtifactsLibraryView';

const STORAGE_KEYS = {
  THREADS: 'claude_workspace_threads_v1',
  PROJECTS: 'claude_workspace_projects_v1',
  THEME: 'claude_workspace_dark_v1',
};

export default function App() {
  const [threads, setThreads] = useState<ChatThread[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THREADS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_THREADS;
  });

  const [projects, setProjects] = useState<ProjectItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_PROJECTS;
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.THEME) === 'true';
    } catch {
      return false;
    }
  });

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<'chat' | 'projects' | 'artifacts'>('chat');
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Composer defaults when starting a new conversation
  const [selectedModelId, setSelectedModelId] = useState<ClaudeModelId>('claude-3-7-sonnet');
  const [selectedStyleId, setSelectedStyleId] = useState<WritingStyleId>('normal');
  const [extendedThinking, setExtendedThinking] = useState<boolean>(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Split-screen Artifact drawer state
  const [activeArtifact, setActiveArtifact] = useState<ArtifactItem | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, String(darkMode));
    } catch {
      // ignore
    }
  }, [darkMode]);

  // Persist threads
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(threads));
    } catch {
      // ignore
    }
  }, [threads]);

  // Persist projects
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    } catch {
      // ignore
    }
  }, [projects]);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) || null,
    [threads, activeThreadId]
  );

  const allArtifacts = useMemo(() => {
    const list: ArtifactItem[] = [];
    for (const t of threads) {
      for (const m of t.messages) {
        if (m.artifacts) {
          list.push(...m.artifacts);
        }
      }
    }
    return list;
  }, [threads]);

  const activeThreadArtifacts = useMemo(() => {
    if (!activeThread) return [];
    const list: ArtifactItem[] = [];
    for (const m of activeThread.messages) {
      if (m.artifacts) {
        list.push(...m.artifacts);
      }
    }
    return list;
  }, [activeThread]);

  const handleNewChat = () => {
    setActiveSection('chat');
    setActiveThreadId(null);
    setActiveArtifact(null);
  };

  const handleSelectThread = (threadId: string) => {
    setActiveSection('chat');
    setActiveThreadId(threadId);
    const found = threads.find((t) => t.id === threadId);
    if (found) {
      // Automatically open the latest artifact in this thread if one exists
      const threadArts: ArtifactItem[] = [];
      found.messages.forEach((m) => {
        if (m.artifacts) threadArts.push(...m.artifacts);
      });
      setActiveArtifact(threadArts.length > 0 ? threadArts[threadArts.length - 1] : null);
    }
  };

  const handleToggleStarThread = (threadId: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, starred: !t.starred } : t))
    );
  };

  const handleDeleteThread = (threadId: string) => {
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    if (activeThreadId === threadId) {
      setActiveThreadId(null);
      setActiveArtifact(null);
    }
  };

  const handleRenameThread = (threadId: string, newTitle: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, title: newTitle } : t))
    );
  };

  const handleSendMessage = async (
    content: string,
    attachments: AttachmentItem[],
    overrideThinking?: boolean
  ) => {
    const now = new Date().toISOString();
    const useThinking =
      overrideThinking !== undefined
        ? overrideThinking
        : activeThread
        ? activeThread.extendedThinking
        : extendedThinking;

    const targetModelId = activeThread ? activeThread.modelId : selectedModelId;
    const targetStyleId = activeThread ? activeThread.styleId : selectedStyleId;
    const targetProjectId = activeThread ? activeThread.projectId : selectedProjectId;

    const userMsg: MessageItem = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content,
      attachments: attachments.length > 0 ? attachments : undefined,
      createdAt: now,
    };

    const assistantMsgId = `msg-${Date.now()}-a`;
    const placeholderAssistantMsg: MessageItem = {
      id: assistantMsgId,
      role: 'assistant',
      modelId: targetModelId,
      content: '...',
      thinking: useThinking ? 'Structuring reasoning steps...' : undefined,
      createdAt: now,
    };

    let targetThreadId = activeThreadId;
    let historyMessages: MessageItem[] = [];

    if (!targetThreadId) {
      targetThreadId = `thread-${Date.now()}`;
      const newThread: ChatThread = {
        id: targetThreadId,
        title: deriveThreadTitle(content),
        projectId: targetProjectId,
        modelId: targetModelId,
        styleId: targetStyleId,
        extendedThinking: useThinking,
        starred: false,
        createdAt: now,
        updatedAt: now,
        messages: [userMsg, placeholderAssistantMsg],
      };
      historyMessages = [userMsg];
      setThreads((prev) => [newThread, ...prev]);
      setActiveThreadId(targetThreadId);
    } else {
      const existing = threads.find((t) => t.id === targetThreadId);
      historyMessages = existing ? [...existing.messages, userMsg] : [userMsg];
      setThreads((prev) =>
        prev.map((t) =>
          t.id === targetThreadId
            ? {
                ...t,
                updatedAt: now,
                messages: [...t.messages, userMsg, placeholderAssistantMsg],
              }
            : t
        )
      );
    }

    const activeProj = projects.find((p) => p.id === targetProjectId) || null;
    const systemInstruction = buildClaudeSystemInstruction({
      modelId: targetModelId,
      styleId: targetStyleId,
      extendedThinking: useThinking,
      project: activeProj,
    });

    setIsStreaming(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const startTime = Date.now();

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyMessages,
          systemInstruction,
          modelId: targetModelId,
          extendedThinking: useThinking,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to connect to Claude streaming endpoint.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedRaw = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payloadStr = trimmed.slice(5).trim();
          if (!payloadStr) continue;
          try {
            const parsed = JSON.parse(payloadStr);
            if (parsed.text) {
              accumulatedRaw += parsed.text;
              const { cleanContent, thinking, extractedArtifacts } =
                parseAssistantOutput(accumulatedRaw);
              const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));

              const builtArtifacts: ArtifactItem[] = extractedArtifacts.map((art, idx) => ({
                ...art,
                id: `art-${assistantMsgId}-${idx}`,
                createdAt: now,
                threadId: targetThreadId!,
                messageId: assistantMsgId,
              }));

              if (builtArtifacts.length > 0) {
                setActiveArtifact(builtArtifacts[builtArtifacts.length - 1]);
              }

              setThreads((prev) =>
                prev.map((t) =>
                  t.id === targetThreadId
                    ? {
                        ...t,
                        messages: t.messages.map((m) =>
                          m.id === assistantMsgId
                            ? {
                                ...m,
                                content: cleanContent || '...',
                                thinking: thinking || m.thinking,
                                thinkingDurationSec: useThinking ? durationSec : undefined,
                                artifacts: builtArtifacts.length > 0 ? builtArtifacts : m.artifacts,
                              }
                            : m
                        ),
                      }
                    : t
                )
              );
            }
          } catch {
            // ignore partial SSE JSON
          }
        }
      }
    } catch {
      // If aborted by user, keep partial content
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopStreaming = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  };

  const handleRegenerateLast = () => {
    if (!activeThread || isStreaming) return;
    const lastUserIdx = [...activeThread.messages]
      .map((m) => m.role)
      .lastIndexOf('user');
    if (lastUserIdx === -1) return;
    const lastUserMsg = activeThread.messages[lastUserIdx];
    const trimmedMessages = activeThread.messages.slice(0, lastUserIdx);
    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThread.id ? { ...t, messages: trimmedMessages } : t
      )
    );
    setTimeout(() => {
      handleSendMessage(lastUserMsg.content, lastUserMsg.attachments || []);
    }, 20);
  };

  const handleFeedbackMessage = (messageId: string, feedback: 'up' | 'down') => {
    if (!activeThreadId) return;
    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThreadId
          ? {
              ...t,
              messages: t.messages.map((m) =>
                m.id === messageId
                  ? { ...m, feedback: m.feedback === feedback ? null : feedback }
                  : m
              ),
            }
          : t
      )
    );
  };

  // Project Handlers
  const handleCreateProject = (data: {
    name: string;
    description: string;
    customInstructions: string;
  }) => {
    const newProj: ProjectItem = {
      id: `proj-${Date.now()}`,
      name: data.name,
      description: data.description,
      customInstructions: data.customInstructions,
      knowledgeDocs: [],
      updatedAt: new Date().toISOString(),
    };
    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
  };

  const handleUpdateProjectInstructions = (projectId: string, customInstructions: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, customInstructions, updatedAt: new Date().toISOString() }
          : p
      )
    );
  };

  const handleAddKnowledgeDoc = (
    projectId: string,
    doc: { title: string; content: string }
  ) => {
    const newDoc = {
      id: `doc-${Date.now()}`,
      title: doc.title,
      content: doc.content,
      tokens: estimateTokens(doc.content),
      updatedAt: new Date().toISOString(),
    };
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              knowledgeDocs: [...p.knowledgeDocs, newDoc],
              updatedAt: new Date().toISOString(),
            }
          : p
      )
    );
  };

  const handleRemoveKnowledgeDoc = (projectId: string, docId: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              knowledgeDocs: p.knowledgeDocs.filter((d) => d.id !== docId),
            }
          : p
      )
    );
  };

  const handleStartProjectChat = (projectId: string) => {
    setSelectedProjectId(projectId);
    setActiveThreadId(null);
    setActiveArtifact(null);
    setActiveSection('chat');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FAF9F5] dark:bg-[#191918] text-[#191918] dark:text-[#ECEAE2]">
      <Sidebar
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen((v) => !v)}
        activeSection={activeSection}
        onSelectSection={(sec) => {
          setActiveSection(sec);
          if (sec === 'projects' && !activeProjectId) {
            setActiveProjectId(null);
          }
        }}
        threads={threads}
        activeThreadId={activeThreadId}
        onSelectThread={handleSelectThread}
        onNewChat={handleNewChat}
        onToggleStarThread={handleToggleStarThread}
        onDeleteThread={handleDeleteThread}
        onRenameThread={handleRenameThread}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={(pid) => setActiveProjectId(pid)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
        totalArtifactsCount={allArtifacts.length}
      />

      {activeSection === 'chat' && (
        <ChatView
          thread={activeThread}
          projects={projects}
          selectedModelId={selectedModelId}
          onChangeModelId={(m) => {
            setSelectedModelId(m);
            if (activeThreadId) {
              setThreads((prev) =>
                prev.map((t) => (t.id === activeThreadId ? { ...t, modelId: m } : t))
              );
            }
          }}
          selectedStyleId={selectedStyleId}
          onChangeStyleId={(s) => {
            setSelectedStyleId(s);
            if (activeThreadId) {
              setThreads((prev) =>
                prev.map((t) => (t.id === activeThreadId ? { ...t, styleId: s } : t))
              );
            }
          }}
          extendedThinking={extendedThinking}
          onToggleExtendedThinking={() => {
            const next = !(activeThread ? activeThread.extendedThinking : extendedThinking);
            setExtendedThinking(next);
            if (activeThreadId) {
              setThreads((prev) =>
                prev.map((t) =>
                  t.id === activeThreadId ? { ...t, extendedThinking: next } : t
                )
              );
            }
          }}
          selectedProjectId={selectedProjectId}
          onChangeProjectId={(pid) => {
            setSelectedProjectId(pid);
            if (activeThreadId) {
              setThreads((prev) =>
                prev.map((t) => (t.id === activeThreadId ? { ...t, projectId: pid } : t))
              );
            }
          }}
          isStreaming={isStreaming}
          onStopStreaming={handleStopStreaming}
          onSendMessage={handleSendMessage}
          onRegenerateLast={handleRegenerateLast}
          onFeedbackMessage={handleFeedbackMessage}
          activeArtifact={activeArtifact}
          onOpenArtifact={(art) => setActiveArtifact(art)}
          allThreadArtifacts={activeThreadArtifacts}
        />
      )}

      {activeSection === 'projects' && (
        <ProjectsView
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={setActiveProjectId}
          onCreateProject={handleCreateProject}
          onUpdateProjectInstructions={handleUpdateProjectInstructions}
          onAddKnowledgeDoc={handleAddKnowledgeDoc}
          onRemoveKnowledgeDoc={handleRemoveKnowledgeDoc}
          threads={threads}
          onStartProjectChat={handleStartProjectChat}
          onOpenThread={handleSelectThread}
        />
      )}

      {activeSection === 'artifacts' && (
        <ArtifactsLibraryView
          artifacts={allArtifacts}
          onInspectArtifact={(art) => {
            setActiveThreadId(art.threadId);
            setActiveSection('chat');
            setActiveArtifact(art);
          }}
        />
      )}

      {/* Split-Screen Artifacts Drawer */}
      {activeSection === 'chat' && activeArtifact && (
        <ArtifactDrawer
          artifact={activeArtifact}
          allThreadArtifacts={
            activeThreadArtifacts.length > 0 ? activeThreadArtifacts : [activeArtifact]
          }
          onSelectArtifact={(art) => setActiveArtifact(art)}
          onClose={() => setActiveArtifact(null)}
        />
      )}
    </div>
  );
}
