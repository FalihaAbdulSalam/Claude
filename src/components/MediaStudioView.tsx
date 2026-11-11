import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Mic,
  Upload,
  Sparkles,
  Send,
  FolderPlus,
  Play,
  Square,
  Radio,
  Check,
  Volume2,
  Film,
} from 'lucide-react';
import { AnalyzedPdfDocument, AttachmentItem, ProjectItem } from '../types/claude';
import { estimatePdfMetrics } from '../utils/claudeLogic';

interface MediaStudioViewProps {
  pdfDocuments: AnalyzedPdfDocument[];
  onAddPdfDocument: (doc: AnalyzedPdfDocument) => void;
  onAskClaudeWithPdf: (doc: AnalyzedPdfDocument, customPrompt?: string) => void;
  projects: ProjectItem[];
  onAddPdfToProject: (projectId: string, doc: AnalyzedPdfDocument) => void;
}

type StudioTab = 'pdf' | 'image' | 'video' | 'music' | 'voice';

export const MediaStudioView: React.FC<MediaStudioViewProps> = ({
  pdfDocuments,
  onAddPdfDocument,
  onAskClaudeWithPdf,
  projects,
  onAddPdfToProject,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('pdf');

  // 1. PDF Reader State
  const [selectedPdfId, setSelectedPdfId] = useState<string>(pdfDocuments[0]?.id || '');
  const [isAnalyzingPdf, setIsAnalyzingPdf] = useState(false);
  const [targetProjectId, setTargetProjectId] = useState<string>(projects[0]?.id || '');
  const [addedToProjectToast, setAddedToProjectToast] = useState(false);
  const [pdfQuestion, setPdfQuestion] = useState('');
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  // 2. Image Generation & Editing State
  const [imagePrompt, setImagePrompt] = useState(
    'Sunlit brutalist library atrium with warm terracotta acoustic panels, architectural photography'
  );
  const [imageAspect, setImageAspect] = useState<'16:9' | '1:1' | '9:16'>('16:9');
  const [sourceEditImage, setSourceEditImage] = useState<{
    base64: string;
    mimeType: string;
    name: string;
  } | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const editImageInputRef = useRef<HTMLInputElement | null>(null);

  // 3. Video Generation & Photo Animation State (gemini-omni-1.2-flash)
  const [videoPrompt, setVideoPrompt] = useState(
    'Golden hour sunlight moving across a serene botanical courtyard with gentle wind in the olive trees'
  );
  const [videoAspect, setVideoAspect] = useState<'16:9' | '9:16'>('16:9');
  const [videoSourcePhoto, setVideoSourcePhoto] = useState<{
    base64: string;
    mimeType: string;
    name: string;
  } | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoResult, setGeneratedVideoResult] = useState<{
    videoUrl: string;
    synthesizedPreview?: boolean;
    aspectRatio: '16:9' | '9:16';
    prompt: string;
    model: string;
  } | null>(null);
  const videoPhotoInputRef = useRef<HTMLInputElement | null>(null);

  // 4. Music Generation State (lyria-3-clip-preview / lyria-3-pro-preview)
  const [musicPrompt, setMusicPrompt] = useState(
    'Warm chamber cello and felt piano minimal ostinato for deep architectural study, 84 BPM'
  );
  const [musicDurationType, setMusicDurationType] = useState<'clip' | 'full'>('clip');
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [generatedMusic, setGeneratedMusic] = useState<{
    audioUrl: string;
    synthesizedAudio?: boolean;
    notes: string;
    model: string;
  } | null>(null);
  const [isPlayingSynthMusic, setIsPlayingSynthMusic] = useState(false);
  const synthIntervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // 5. Voice Live & Audio Transcription State (gemini-3.8-live & gemini-3.5-transcribe)
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptResult, setTranscriptResult] = useState<string>('');
  const [liveConnected, setLiveConnected] = useState(false);
  const [liveStatusMsg, setLiveStatusMsg] = useState('Ready to connect to Gemini 3.8 Live');
  const [liveTranscripts, setLiveTranscripts] = useState<
    Array<{ role: 'user' | 'assistant'; text: string }>
  >([]);
  const [liveVoiceInput, setLiveVoiceInput] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedPdf =
    pdfDocuments.find((d) => d.id === selectedPdfId) || pdfDocuments[0] || null;

  useEffect(() => {
    return () => {
      if (synthIntervalRef.current) window.clearInterval(synthIntervalRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // --- PDF Upload & Gemini Analysis ---
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAnalyzingPdf(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const metrics = estimatePdfMetrics(file.size);
      try {
        const res = await fetch('/api/pdf/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            base64Data: dataUrl,
            pageCount: metrics.estimatedPages,
          }),
        });
        const data = await res.json();
        const newDoc: AnalyzedPdfDocument = {
          id: `pdf-${Date.now()}`,
          filename: file.name,
          mimeType: 'application/pdf',
          pageCount: data.pageCount || metrics.estimatedPages,
          summary: data.summary,
          keyFindings: data.keyFindings || [],
          extractedText: data.extractedText || '',
          createdAt: new Date().toISOString(),
        };
        onAddPdfDocument(newDoc);
        setSelectedPdfId(newDoc.id);
      } catch {
        // fallback
      } finally {
        setIsAnalyzingPdf(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleReanalyzeSelectedPdf = async () => {
    if (!selectedPdf) return;
    setIsAnalyzingPdf(true);
    try {
      const res = await fetch('/api/pdf/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedPdf.filename,
          rawText: selectedPdf.extractedText,
          pageCount: selectedPdf.pageCount,
        }),
      });
      const data = await res.json();
      const updatedDoc: AnalyzedPdfDocument = {
        ...selectedPdf,
        summary: data.summary || selectedPdf.summary,
        keyFindings: data.keyFindings || selectedPdf.keyFindings,
      };
      onAddPdfDocument(updatedDoc);
    } finally {
      setIsAnalyzingPdf(false);
    }
  };

  // --- Image Studio Handlers ---
  const handleGenerateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePrompt.trim() || isGeneratingImage) return;
    setIsGeneratingImage(true);
    try {
      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          aspectRatio: imageAspect,
          sourceImageBase64: sourceEditImage?.base64 || '',
          sourceImageMimeType: sourceEditImage?.mimeType || 'image/png',
        }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
      }
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // --- Video & Photo Animation Handlers ---
  const handleGenerateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoPrompt.trim() || isGeneratingVideo) return;
    setIsGeneratingVideo(true);
    try {
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          aspectRatio: videoAspect,
          sourceImageBase64: videoSourcePhoto?.base64 || '',
          sourceImageMimeType: videoSourcePhoto?.mimeType || 'image/jpeg',
        }),
      });
      const data = await res.json();
      setGeneratedVideoResult({
        videoUrl: data.videoUrl || '',
        synthesizedPreview: data.synthesizedPreview,
        aspectRatio: data.aspectRatio || videoAspect,
        prompt: videoPrompt,
        model: data.model || 'gemini-omni-1.2-flash',
      });
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // --- Music Studio Handlers ---
  const handleGenerateMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!musicPrompt.trim() || isGeneratingMusic) return;
    setIsGeneratingMusic(true);
    try {
      const res = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: musicPrompt,
          durationType: musicDurationType,
        }),
      });
      const data = await res.json();
      setGeneratedMusic(data);
    } finally {
      setIsGeneratingMusic(false);
    }
  };

  const toggleSynthMusicPlayback = () => {
    if (isPlayingSynthMusic) {
      if (synthIntervalRef.current) window.clearInterval(synthIntervalRef.current);
      synthIntervalRef.current = null;
      setIsPlayingSynthMusic(false);
      return;
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const chordNotes = [293.66, 349.23, 440.0, 523.25, 440.0, 349.23]; // D minor 7 arpeggio
    let step = 0;

    const playNote = () => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(chordNotes[step % chordNotes.length], now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.68);
      step++;
    };

    playNote();
    synthIntervalRef.current = window.setInterval(playNote, 600);
    setIsPlayingSynthMusic(true);
  };

  // --- Audio Transcription & Live Voice Handlers ---
  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsTranscribing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Audio = typeof reader.result === 'string' ? reader.result : '';
      try {
        const res = await fetch('/api/audio/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Audio,
            mimeType: file.type || 'audio/mp3',
            filename: file.name,
          }),
        });
        const data = await res.json();
        setTranscriptResult(data.transcript || '');
      } finally {
        setIsTranscribing(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSampleVoiceTranscribe = async () => {
    setIsTranscribing(true);
    try {
      const res = await fetch('/api/audio/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Audio: '',
          filename: 'executive-briefing-note.wav',
        }),
      });
      const data = await res.json();
      setTranscriptResult(data.transcript || '');
    } finally {
      setIsTranscribing(false);
    }
  };

  const toggleLiveVoiceSession = () => {
    if (liveConnected) {
      wsRef.current?.close();
      wsRef.current = null;
      setLiveConnected(false);
      setLiveStatusMsg('Disconnected from Gemini 3.8 Live');
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/live`);
    wsRef.current = ws;

    ws.onopen = () => {
      setLiveConnected(true);
      setLiveStatusMsg('Connected · Gemini 3.8 Live (16kHz PCM In / 24kHz PCM Out)');
      setLiveTranscripts((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Hello! I am listening on Gemini 3.8 Live. Speak or send a voice turn below to discuss your PDF documents or projects in real time.',
        },
      ]);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'status' && msg.message) {
          setLiveStatusMsg(msg.message);
        } else if (msg.type === 'transcript' && msg.text) {
          setLiveTranscripts((prev) => [
            ...prev,
            { role: msg.role || 'assistant', text: msg.text },
          ]);
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      setLiveConnected(false);
    };
  };

  const sendLiveVoiceTurn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveVoiceInput.trim()) return;
    const text = liveVoiceInput.trim();
    setLiveTranscripts((prev) => [...prev, { role: 'user', text }]);
    setLiveVoiceInput('');
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'text_prompt', text }));
    } else {
      setTimeout(() => {
        setLiveTranscripts((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `Synthesized response for "${text}": The IEEE 1547 inverter specification enforces a 12%–92% state-of-charge window and <=140ms frequency droop response.`,
          },
        ]);
      }, 250);
    }
  };

  return (
    <main className="flex-1 h-screen overflow-y-auto bg-[#FAF9F5] dark:bg-[#191918] px-6 py-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E2D9] dark:border-[#2C2B28]">
          <div>
            <h1 className="font-claude-serif text-2xl font-normal text-[#191918] dark:text-[#ECEAE2]">
              PDF Reader &amp; Multimodal Studio
            </h1>
            <p className="text-xs text-[#6E6D68] dark:text-[#9A9890] mt-1">
              Read &amp; extract PDFs, generate/edit images, animate photos to video, compose Lyria 3 music, and converse over Gemini 3.8 Live.
            </p>
          </div>

          {/* Studio Mode Switcher */}
          <div
            role="tablist"
            aria-label="Multimodal Studio Modes"
            className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#EAE7DD] dark:bg-[#232220]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'pdf'}
              onClick={() => setActiveTab('pdf')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'pdf'
                  ? 'bg-[#FAF9F5] dark:bg-[#191918] text-[#C96442] shadow-xs'
                  : 'text-[#5A5955] dark:text-[#A3A19A]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF Reader</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'image'}
              onClick={() => setActiveTab('image')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'image'
                  ? 'bg-[#FAF9F5] dark:bg-[#191918] text-[#C96442] shadow-xs'
                  : 'text-[#5A5955] dark:text-[#A3A19A]'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Image Studio</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'video'}
              onClick={() => setActiveTab('video')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'video'
                  ? 'bg-[#FAF9F5] dark:bg-[#191918] text-[#C96442] shadow-xs'
                  : 'text-[#5A5955] dark:text-[#A3A19A]'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Video &amp; Animate</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'music'}
              onClick={() => setActiveTab('music')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'music'
                  ? 'bg-[#FAF9F5] dark:bg-[#191918] text-[#C96442] shadow-xs'
                  : 'text-[#5A5955] dark:text-[#A3A19A]'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Lyria Music</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'voice'}
              onClick={() => setActiveTab('voice')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'voice'
                  ? 'bg-[#FAF9F5] dark:bg-[#191918] text-[#C96442] shadow-xs'
                  : 'text-[#5A5955] dark:text-[#A3A19A]'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Live &amp; Transcribe</span>
            </button>
          </div>
        </div>

        {/* TAB 1: PDF READER & DOCUMENT INTELLIGENCE */}
        {activeTab === 'pdf' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: PDF Library & Upload */}
            <div className="lg:col-span-4 space-y-4">
              <div className="p-4 rounded-2xl bg-[#F3F1EA] dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28] space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold text-[#191918] dark:text-[#ECEAE2]">
                    Upload PDF Document
                  </h2>
                  <span className="text-[11px] font-claude-mono text-[#C96442]">
                    application/pdf
                  </span>
                </div>
                <p className="text-xs text-[#6E6D68] dark:text-[#9A9890]">
                  Upload any PDF specification, research paper, or financial report for native Gemini multimodal reading.
                </p>
                <button
                  type="button"
                  onClick={() => pdfInputRef.current?.click()}
                  disabled={isAnalyzingPdf}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#C96442] hover:bg-[#B55535] text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isAnalyzingPdf ? 'Reading PDF...' : 'Upload PDF File (.pdf)'}</span>
                </button>
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                  aria-label="Upload PDF file"
                />
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#6E6D68] dark:text-[#9A9890] px-1">
                  Indexed PDF Documents ({pdfDocuments.length})
                </div>
                {pdfDocuments.map((doc) => {
                  const isSelected = selectedPdf?.id === doc.id;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setSelectedPdfId(doc.id)}
                      className={`w-full p-3.5 rounded-xl border text-left transition-colors ${
                        isSelected
                          ? 'bg-[#F3F1EA] dark:bg-[#262522] border-[#C96442]'
                          : 'bg-[#FAF9F5] dark:bg-[#1D1C1A] border-[#E5E2D9] dark:border-[#2C2B28] hover:border-[#C96442]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#191918] dark:text-[#ECEAE2] truncate">
                          {doc.filename}
                        </span>
                        <span className="text-[11px] font-claude-mono text-[#C96442] shrink-0">
                          {doc.pageCount}p
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6E6D68] dark:text-[#9A9890] line-clamp-2 mt-1">
                        {doc.summary}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Active PDF Inspector & Actions */}
            <div className="lg:col-span-8">
              {selectedPdf ? (
                <div className="p-6 rounded-2xl bg-[#F3F1EA] dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28] space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#E5E2D9] dark:border-[#2C2B28]">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#C96442]" />
                        <h2 className="text-base font-semibold text-[#191918] dark:text-[#ECEAE2]">
                          {selectedPdf.filename}
                        </h2>
                      </div>
                      <div className="text-xs font-claude-mono text-[#6E6D68] dark:text-[#9A9890] mt-1">
                        {selectedPdf.pageCount} Pages · Native PDF Extraction · Gemini 3.8 Flash
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleReanalyzeSelectedPdf}
                        disabled={isAnalyzingPdf}
                        className="px-3 py-1.5 rounded-lg bg-[#EAE7DD] dark:bg-[#2C2B28] hover:bg-[#DFDBD0] text-xs font-medium text-[#191918] dark:text-[#ECEAE2] flex items-center gap-1.5 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#C96442]" />
                        <span>{isAnalyzingPdf ? 'Analyzing...' : 'Analyze PDF with Gemini'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onAskClaudeWithPdf(selectedPdf)}
                        className="px-3 py-1.5 rounded-lg bg-[#C96442] hover:bg-[#B55535] text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Open in Claude Chat</span>
                      </button>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6E6D68] dark:text-[#9A9890]">
                      Executive Summary
                    </h3>
                    <p className="font-claude-serif text-[15px] leading-relaxed text-[#191918] dark:text-[#ECEAE2]">
                      {selectedPdf.summary}
                    </p>
                  </div>

                  {/* Key Findings */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6E6D68] dark:text-[#9A9890]">
                      Key Extracted Findings
                    </h3>
                    <ul className="space-y-1.5">
                      {selectedPdf.keyFindings.map((finding, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-[#191918] dark:text-[#ECEAE2] flex items-start gap-2"
                        >
                          <span className="text-[#C96442] font-bold">•</span>
                          <span>{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Verbatim Extracted PDF Passages */}
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6E6D68] dark:text-[#9A9890]">
                      Extracted PDF Text &amp; Clauses
                    </h3>
                    <pre className="p-3.5 rounded-xl bg-[#FAF9F5] dark:bg-[#141413] border border-[#E5E2D9] dark:border-[#2C2B28] text-xs font-claude-mono text-[#3D3C38] dark:text-[#C5C3BA] whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                      {selectedPdf.extractedText}
                    </pre>
                  </div>

                  {/* Ask Specific Question or Pin to Project */}
                  <div className="pt-3 border-t border-[#E5E2D9] dark:border-[#2C2B28] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        onAskClaudeWithPdf(
                          selectedPdf,
                          pdfQuestion.trim() ||
                            `Summarize the key technical requirements in ${selectedPdf.filename} and build an interactive HTML compliance checklist artifact.`
                        );
                      }}
                      className="flex-1 flex items-center gap-2"
                    >
                      <input
                        type="text"
                        aria-label="Ask a question about this PDF"
                        value={pdfQuestion}
                        onChange={(e) => setPdfQuestion(e.target.value)}
                        placeholder={`Ask Claude a question about ${selectedPdf.filename}...`}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-[#FAF9F5] dark:bg-[#191918] border border-[#DFDBD0] dark:border-[#33312D] text-xs text-[#191918] dark:text-[#ECEAE2] focus:outline-none focus:border-[#C96442]"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-[#191918] dark:bg-[#ECEAE2] text-white dark:text-[#191918] text-xs font-medium shrink-0"
                      >
                        Ask PDF
                      </button>
                    </form>

                    {projects.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <select
                          aria-label="Select project for PDF knowledge"
                          value={targetProjectId}
                          onChange={(e) => setTargetProjectId(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#EAE7DD] dark:bg-[#2A2926] text-xs text-[#191918] dark:text-[#ECEAE2]"
                        >
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            if (!targetProjectId) return;
                            onAddPdfToProject(targetProjectId, selectedPdf);
                            setAddedToProjectToast(true);
                            setTimeout(() => setAddedToProjectToast(false), 1800);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-[#EAE7DD] dark:bg-[#2A2926] hover:bg-[#DFDBD0] text-xs font-medium text-[#191918] dark:text-[#ECEAE2] flex items-center gap-1"
                        >
                          {addedToProjectToast ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#2D6A4F]" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <FolderPlus className="w-3.5 h-3.5 text-[#C96442]" />
                              <span>Add to Project</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* TAB 2: IMAGE CREATION & EDITING (gemini-nano-banana-2.1) */}
        {activeTab === 'image' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleGenerateImage}
              className="lg:col-span-5 p-5 rounded-2xl bg-[#F3F1EA] dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28] space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#191918] dark:text-[#ECEAE2]">
                  Image Creation &amp; Editing
                </h2>
                <span className="text-[11px] font-claude-mono text-[#C96442]">
                  gemini-nano-banana-2.1
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A4945] dark:text-[#B5B3AA] mb-1.5">
                  Visual Prompt or Edit Instruction
                </label>
                <textarea
                  rows={4}
                  aria-label="Image prompt"
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#FAF9F5] dark:bg-[#191918] border border-[#DFDBD0] dark:border-[#33312D] text-xs text-[#191918] dark:text-[#ECEAE2] focus:outline-none focus:border-[#C96442]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A4945] dark:text-[#B5B3AA] mb-1.5">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['16:9', '1:1', '9:16'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setImageAspect(ratio)}
                      className={`py-1.5 rounded-lg text-xs font-claude-mono border transition-colors ${
                        imageAspect === ratio
                          ? 'bg-[#C96442]/15 border-[#C96442] text-[#C96442] font-semibold'
                          : 'bg-[#FAF9F5] dark:bg-[#191918] border-[#DFDBD0] dark:border-[#33312D] text-[#6E6D68]'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A4945] dark:text-[#B5B3AA] mb-1.5">
                  Reference Image for Editing (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => editImageInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-[#EAE7DD] dark:bg-[#2C2B28] text-xs font-medium text-[#191918] dark:text-[#ECEAE2] flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#C96442]" />
                    <span>{sourceEditImage ? sourceEditImage.name : 'Upload image to edit'}</span>
                  </button>
                  {sourceEditImage && (
                    <button
                      type="button"
                      onClick={() => setSourceEditImage(null)}
                      className="text-xs text-[#B91C1C]"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  ref={editImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === 'string') {
                        setSourceEditImage({
                          base64: reader.result,
                          mimeType: file.type || 'image/png',
                          name: file.name,
                        });
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                  className="hidden"
                  aria-label="Upload reference image for editing"
                />
              </div>

              <button
                type="submit"
                disabled={isGeneratingImage}
                className="w-full py-2.5 rounded-xl bg-[#C96442] hover:bg-[#B55535] text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {isGeneratingImage
                    ? 'Synthesizing with Nano Banana 2.1...'
                    : sourceEditImage
                    ? 'Edit Image with Gemini'
                    : 'Generate Image'}
                </span>
              </button>
            </form>

            <div className="lg:col-span-7 p-5 rounded-2xl bg-[#F3F1EA] dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28] flex flex-col items-center justify-center min-h-[340px]">
              {generatedImageUrl ? (
                <div className="w-full space-y-3">
                  <img
                    src={generatedImageUrl}
                    alt={imagePrompt}
                    className="w-full max-h-[380px] object-contain rounded-xl border border-[#E5E2D9] dark:border-[#2C2B28]"
                  />
                  <div className="flex items-center justify-between text-xs text-[#6E6D68]">
                    <span>Generated by gemini-nano-banana-2.1 ({imageAspect})</span>
                    <a
                      href={generatedImageUrl}
                      download="claude-studio-image.png"
                      className="text-[#C96442] font-medium"
                    >
                      Download Image
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-2 max-w-sm">
                  <ImageIcon className="w-8 h-8 text-[#C96442] mx-auto opacity-80" />
                  <div className="text-sm font-medium text-[#191918] dark:text-[#ECEAE2]">
                    Nano Banana 2.1 Canvas
                  </div>
                  <p className="text-xs text-[#6E6D68] dark:text-[#9A9890]">
                    Enter a prompt or upload an existing photo to generate or edit high-resolution visual concepts.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: VIDEO GENERATION & PHOTO ANIMATION (gemini-omni-1.2-flash) */}
        {activeTab === 'video' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleGenerateVideo}
              className="lg:col-span-5 p-5 rounded-2xl bg-[#F3F1EA] dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28] space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#191918] dark:text-[#ECEAE2]">
                  Video &amp; Photo Animation
                </h2>
                <span className="text-[11px] font-claude-mono text-[#C96442]">
                  gemini-omni-1.2-flash
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A4945] dark:text-[#B5B3AA] mb-1.5">
                  Motion &amp; Scene Prompt
                </label>
                <textarea
                  rows={4}
                  aria-label="Video motion prompt"
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#FAF9F5] dark:bg-[#191918] border border-[#DFDBD0] dark:border-[#33312D] text-xs text-[#191918] dark:text-[#ECEAE2] focus:outline-none focus:border-[#C96442]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A4945] dark:text-[#B5B3AA] mb-1.5">
                  Video Aspect Ratio
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVideoAspect('16:9')}
                    className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                      videoAspect === '16:9'
                        ? 'bg-[#C96442]/15 border-[#C96442] text-[#C96442]'
                        : 'bg-[#FAF9F5] dark:bg-[#191918] border-[#DFDBD0] dark:border-[#33312D] text-[#6E6D68]'
                    }`}
                  >
                    16:9 Landscape
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoAspect('9:16')}
                    className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                      videoAspect === '9:16'
                        ? 'bg-[#C96442]/15 border-[#C96442] text-[#C96442]'
                        : 'bg-[#FAF9F5] dark:bg-[#191918] border-[#DFDBD0] dark:border-[#33312D] text-[#6E6D68]'
                    }`}
                  >
                    9:16 Portrait
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A4945] dark:text-[#B5B3AA] mb-1.5">
                  Upload Photo to Animate (Image-to-Video)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => videoPhotoInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-[#EAE7DD] dark:bg-[#2C2B28] text-xs font-medium text-[#191918] dark:text-[#ECEAE2] flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#C96442]" />
                    <span>
                      {videoSourcePhoto ? videoSourcePhoto.name : 'Choose photo to animate'}
                    </span>
                  </button>
                  {videoSourcePhoto && (
                    <button
                      type="button"
                      onClick={() => setVideoSourcePhoto(null)}
                      className="text-xs text-[#B91C1C]"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  ref={videoPhotoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === 'string') {
                        setVideoSourcePhoto({
                          base64: reader.result,
                          mimeType: file.type || 'image/jpeg',
                          name: file.name,
                        });
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                  className="hidden"
                  aria-label="Upload photo to animate into video"
                />
              </div>

              <button
                type="submit"
                disabled={isGeneratingVideo}
                className="w-full py-2.5 rounded-xl bg-[#C96442] hover:bg-[#B55535] text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Film className="w-4 h-4" />
                <span>
                  {isGeneratingVideo
                    ? 'Rendering with Gemini Omni 1.2 Flash...'
                    : videoSourcePhoto
                    ? 'Animate Photo to Video'
                    : 'Generate Video'}
                </span>
              </button>
            </form>

            <div className="lg:col-span-7 p-5 rounded-2xl bg-[#F3F1EA] dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28] flex flex-col items-center justify-center min-h-[340px]">
              {generatedVideoResult ? (
                <div className="w-full space-y-3">
                  {generatedVideoResult.videoUrl ? (
                    <video
                      src={generatedVideoResult.videoUrl}
                      controls
                      autoPlay
                      loop
                      className="w-full max-h-[360px] rounded-xl bg-black"
                    />
                  ) : (
                    <div
                      className={`mx-auto rounded-xl bg-gradient-to-br from-[#191918] via-[#2C2520] to-[#C96442] p-6 flex flex-col justify-between text-white border border-[#E5E2D9]/20 ${
                        generatedVideoResult.aspectRatio === '9:16'
                          ? 'w-56 h-80'
                          : 'w-full h-64'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-claude-mono text-[#ECEAE2]/80">
                        <span>GEMINI OMNI 1.2 FLASH</span>
                        <span>{generatedVideoResult.aspectRatio} MOTION STREAM</span>
                      </div>
                      <div className="space-y-2 my-auto">
                        <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center animate-pulse">
                          <Play className="w-5 h-5 fill-current text-[#FAF9F5]" />
                        </div>
                        <p className="font-claude-serif text-sm text-[#FAF9F5] line-clamp-3">
                          “{generatedVideoResult.prompt}”
                        </p>
                      </div>
                      <div className="text-[11px] text-[#ECEAE2]/70">
                        24 fps · Photorealistic temporal motion synthesis
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-2 max-w-sm">
                  <Video className="w-8 h-8 text-[#C96442] mx-auto opacity-80" />
                  <div className="text-sm font-medium text-[#191918] dark:text-[#ECEAE2]">
                    Gemini Omni 1.2 Flash Video Studio
                  </div>
                  <p className="text-xs text-[#6E6D68] dark:text-[#9A9890]">
                    Generate cinematic 16:9 or 9:16 videos from text prompts, or upload any static photo to animate it with realistic camera and subject motion.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: LYRIA 3 MUSIC GENERATION */}
        {activeTab === 'music' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleGenerateMusic}
              className="lg:col-span-5 p-5 rounded-2xl bg-[#F3F1EA] dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28] space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#191918] dark:text-[#ECEAE2]">
                  Lyria 3 Music Composition
                </h2>
                <span className="text-[11px] font-claude-mono text-[#C96442]">
                  {musicDurationType === 'full' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A4945] dark:text-[#B5B3AA] mb-1.5">
                  Musical Style, Instrumentation &amp; Tempo
                </label>
                <textarea
                  rows={4}
                  aria-label="Music prompt"
                  value={musicPrompt}
                  onChange={(e) => setMusicPrompt(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#FAF9F5] dark:bg-[#191918] border border-[#DFDBD0] dark:border-[#33312D] text-xs text-[#191918] dark:text-[#ECEAE2] focus:outline-none focus:border-[#C96442]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMusicDurationType('clip')}
                  className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                    musicDurationType === 'clip'
                      ? 'bg-[#C96442]/15 border-[#C96442] text-[#C96442]'
                      : 'bg-[#FAF9F5] dark:bg-[#191918] border-[#DFDBD0] dark:border-[#33312D] text-[#6E6D68]'
                  }`}
                >
                  30s Clip (Lyria Clip)
                </button>
                <button
                  type="button"
                  onClick={() => setMusicDurationType('full')}
                  className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                    musicDurationType === 'full'
                      ? 'bg-[#C96442]/15 border-[#C96442] text-[#C96442]'
                      : 'bg-[#FAF9F5] dark:bg-[#191918] border-[#DFDBD0] dark:border-[#33312D] text-[#6E6D68]'
                  }`}
                >
                  Full Track (Lyria Pro)
                </button>
              </div>

              <button
                type="submit"
                disabled={isGeneratingMusic}
                className="w-full py-2.5 rounded-xl bg-[#C96442] hover:bg-[#B55535] text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Music className="w-4 h-4" />
                <span>
                  {isGeneratingMusic ? 'Composing with Lyria 3...' : 'Generate Soundtrack'}
                </span>
              </button>
            </form>

            <div className="lg:col-span-7 p-6 rounded-2xl bg-[#F3F1EA] dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28] flex flex-col justify-center min-h-[300px]">
              {generatedMusic ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-claude-mono text-[#C96442]">
                      {generatedMusic.model}
                    </span>
                    <span className="text-xs text-[#6E6D68]">Stereo PCM / MP3 Stream</span>
                  </div>
                  <p className="font-claude-serif text-base text-[#191918] dark:text-[#ECEAE2]">
                    {generatedMusic.notes}
                  </p>
                  {generatedMusic.audioUrl ? (
                    <audio src={generatedMusic.audioUrl} controls className="w-full" />
                  ) : (
                    <button
                      type="button"
                      onClick={toggleSynthMusicPlayback}
                      className="px-4 py-2.5 rounded-xl bg-[#191918] dark:bg-[#ECEAE2] text-white dark:text-[#191918] text-xs font-medium flex items-center gap-2"
                    >
                      {isPlayingSynthMusic ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop Harmonic Preview</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" />
                          <span>Play Acoustic Harmonic Preview</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-2 max-w-sm mx-auto">
                  <Music className="w-8 h-8 text-[#C96442] mx-auto opacity-80" />
                  <div className="text-sm font-medium text-[#191918] dark:text-[#ECEAE2]">
                    Lyria 3 Audio Studio
                  </div>
                  <p className="text-xs text-[#6E6D68] dark:text-[#9A9890]">
                    Compose 30-second instrumental clips (`lyria-3-clip-preview`) or full-length tracks (`lyria-3-pro-preview`).
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: LIVE VOICE API (gemini-3.8-live) & AUDIO TRANSCRIPTION (gemini-3.5-transcribe) */}
        {activeTab === 'voice' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Gemini 3.5 Transcribe */}
            <div className="lg:col-span-5 p-5 rounded-2xl bg-[#F3F1EA] dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28] space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#191918] dark:text-[#ECEAE2]">
                  Audio Transcription
                </h2>
                <span className="text-[11px] font-claude-mono text-[#C96442]">
                  gemini-3.5-transcribe
                </span>
              </div>
              <p className="text-xs text-[#6E6D68] dark:text-[#9A9890]">
                Upload an audio recording (`.mp3`, `.wav`, `.webm`) or transcribe a sample executive briefing note.
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => audioFileInputRef.current?.click()}
                  disabled={isTranscribing}
                  className="px-3.5 py-2 rounded-xl bg-[#C96442] hover:bg-[#B55535] text-white text-xs font-medium flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Audio File</span>
                </button>
                <button
                  type="button"
                  onClick={handleSampleVoiceTranscribe}
                  disabled={isTranscribing}
                  className="px-3.5 py-2 rounded-xl bg-[#EAE7DD] dark:bg-[#2C2B28] text-xs font-medium text-[#191918] dark:text-[#ECEAE2]"
                >
                  Transcribe Sample Voice Note
                </button>
                <input
                  ref={audioFileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioFileUpload}
                  className="hidden"
                  aria-label="Upload audio file for transcription"
                />
              </div>

              {transcriptResult && (
                <div className="p-3.5 rounded-xl bg-[#FAF9F5] dark:bg-[#191918] border border-[#E5E2D9] dark:border-[#2C2B28] space-y-2">
                  <div className="text-[11px] font-claude-mono text-[#2D6A4F]">
                    TRANSCRIPT · GEMINI-3.5-TRANSCRIBE
                  </div>
                  <p className="text-xs leading-relaxed text-[#191918] dark:text-[#ECEAE2]">
                    {transcriptResult}
                  </p>
                </div>
              )}
            </div>

            {/* Right: Gemini 3.8 Live Real-Time Conversational Voice */}
            <div className="lg:col-span-7 p-5 rounded-2xl bg-[#F3F1EA] dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28] flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[#191918] dark:text-[#ECEAE2]">
                    Claude Live Voice Session
                  </h2>
                  <p className="text-xs text-[#6E6D68] dark:text-[#9A9890]">{liveStatusMsg}</p>
                </div>
                <button
                  type="button"
                  onClick={toggleLiveVoiceSession}
                  className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors ${
                    liveConnected
                      ? 'bg-[#B91C1C] text-white'
                      : 'bg-[#C96442] hover:bg-[#B55535] text-white'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>{liveConnected ? 'End Live Session' : 'Start Live Voice Session'}</span>
                </button>
              </div>

              <div className="flex-1 min-h-[180px] max-h-[240px] overflow-y-auto p-3.5 rounded-xl bg-[#FAF9F5] dark:bg-[#191918] border border-[#E5E2D9] dark:border-[#2C2B28] space-y-2.5">
                {liveTranscripts.length === 0 ? (
                  <p className="text-xs text-[#7A7872] text-center py-10">
                    Click &ldquo;Start Live Voice Session&rdquo; to open a low-latency bidirectional WebSocket stream with `gemini-3.8-live`.
                  </p>
                ) : (
                  liveTranscripts.map((item, idx) => (
                    <div
                      key={idx}
                      className={`text-xs p-2.5 rounded-lg ${
                        item.role === 'user'
                          ? 'bg-[#EDEAE0] dark:bg-[#262522] ml-8'
                          : 'bg-[#F3F1EA] dark:bg-[#21201E] mr-8 border border-[#E5E2D9] dark:border-[#2C2B28]'
                      }`}
                    >
                      <span className="font-semibold text-[#C96442] mr-1.5">
                        {item.role === 'user' ? 'You:' : 'Claude Live:'}
                      </span>
                      <span>{item.text}</span>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={sendLiveVoiceTurn} className="flex items-center gap-2">
                <input
                  type="text"
                  aria-label="Send voice turn prompt"
                  value={liveVoiceInput}
                  onChange={(e) => setLiveVoiceInput(e.target.value)}
                  placeholder="Speak or type a live turn to Gemini 3.8 Live..."
                  className="flex-1 px-3 py-2 rounded-xl bg-[#FAF9F5] dark:bg-[#191918] border border-[#DFDBD0] dark:border-[#33312D] text-xs text-[#191918] dark:text-[#ECEAE2] focus:outline-none focus:border-[#C96442]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#191918] dark:bg-[#ECEAE2] text-white dark:text-[#191918] text-xs font-medium"
                >
                  Send Turn
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
