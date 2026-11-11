import React, { useState } from 'react';
import {
  X,
  Code2,
  Eye,
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
  Layers,
} from 'lucide-react';
import { ArtifactItem } from '../types/claude';

interface ArtifactDrawerProps {
  artifact: ArtifactItem | null;
  allThreadArtifacts: ArtifactItem[];
  onSelectArtifact: (artifact: ArtifactItem) => void;
  onClose: () => void;
}

export const ArtifactDrawer: React.FC<ArtifactDrawerProps> = ({
  artifact,
  allThreadArtifacts,
  onSelectArtifact,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!artifact) return null;

  const supportsPreview =
    artifact.type === 'html' || artifact.type === 'svg' || artifact.type === 'markdown';

  const effectiveTab = supportsPreview ? activeTab : 'code';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback copy
    }
  };

  const handleDownload = () => {
    const ext =
      artifact.type === 'html'
        ? 'html'
        : artifact.type === 'svg'
        ? 'svg'
        : artifact.type === 'markdown'
        ? 'md'
        : 'ts';
    const blob = new Blob([artifact.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const buildIframeSrcDoc = (): string => {
    if (artifact.type === 'html') {
      return artifact.content;
    }
    if (artifact.type === 'svg') {
      return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 24px; background: #FAF9F5; display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 48px); }
    svg { max-width: 100%; height: auto; border-radius: 12px; }
  </style>
</head>
<body>${artifact.content}</body>
</html>`;
    }
    return '';
  };

  return (
    <section
      aria-label="Artifact Inspector"
      className={`${
        isExpanded ? 'w-[62vw]' : 'w-[480px] xl:w-[540px]'
      } shrink-0 h-screen flex flex-col bg-[#F6F4EE] dark:bg-[#1D1C1A] border-l border-[#E5E2D9] dark:border-[#2C2B28] transition-all duration-150`}
    >
      {/* Top Artifact Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#E5E2D9] dark:border-[#2C2B28] bg-[#FAF9F5] dark:bg-[#191918]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#C96442]/12 text-[#C96442] flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#191918] dark:text-[#ECEAE2] truncate">
              {artifact.title}
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] text-[#6E6D68] dark:text-[#9A9890]">
              <span>
                {artifact.type === 'html'
                  ? 'Interactive HTML'
                  : artifact.type === 'svg'
                  ? 'Vector SVG'
                  : artifact.type === 'markdown'
                  ? 'Document'
                  : `Code (${artifact.language || 'ts'})`}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-claude-mono">v{artifact.version}</span>
            </div>
          </div>
        </div>

        {/* Segmented Preview / Code Switcher + Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {supportsPreview && (
            <div className="flex items-center p-0.5 rounded-lg bg-[#EAE7DD] dark:bg-[#282724]">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  effectiveTab === 'preview'
                    ? 'bg-white dark:bg-[#191918] text-[#191918] dark:text-[#ECEAE2] shadow-2xs'
                    : 'text-[#5A5955] dark:text-[#A3A19A] hover:text-[#191918] dark:hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  effectiveTab === 'code'
                    ? 'bg-white dark:bg-[#191918] text-[#191918] dark:text-[#ECEAE2] shadow-2xs'
                    : 'text-[#5A5955] dark:text-[#A3A19A] hover:text-[#191918] dark:hover:text-white'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Code</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            aria-label={isExpanded ? 'Restore artifact panel width' : 'Expand artifact panel width'}
            className="p-1.5 rounded-lg text-[#5A5955] dark:text-[#A3A19A] hover:bg-[#EAE7DD] dark:hover:bg-[#282724] transition-colors"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close artifact panel"
            className="p-1.5 rounded-lg text-[#5A5955] dark:text-[#A3A19A] hover:bg-[#EAE7DD] dark:hover:bg-[#282724] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Artifact Body */}
      <div className="flex-1 overflow-auto relative">
        {effectiveTab === 'preview' && (artifact.type === 'html' || artifact.type === 'svg') ? (
          <iframe
            title={`Preview of ${artifact.title}`}
            srcDoc={buildIframeSrcDoc()}
            sandbox="allow-scripts"
            className="w-full h-full border-0 bg-[#FAF9F5]"
          />
        ) : effectiveTab === 'preview' && artifact.type === 'markdown' ? (
          <div className="p-6 font-claude-serif text-[15px] leading-relaxed text-[#191918] dark:text-[#ECEAE2] whitespace-pre-wrap">
            {artifact.content}
          </div>
        ) : (
          <pre className="p-5 text-xs font-claude-mono leading-relaxed text-[#191918] dark:text-[#ECEAE2] overflow-x-auto select-all">
            <code>{artifact.content}</code>
          </pre>
        )}
      </div>

      {/* Bottom Artifact Footer Bar */}
      <div className="px-4 py-2.5 border-t border-[#E5E2D9] dark:border-[#2C2B28] bg-[#FAF9F5] dark:bg-[#191918] flex items-center justify-between gap-3">
        {/* Switch between multiple artifacts in the thread if available */}
        <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto">
          {allThreadArtifacts.length > 1 ? (
            allThreadArtifacts.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectArtifact(item)}
                className={`px-2 py-1 rounded text-xs font-claude-mono transition-colors whitespace-nowrap ${
                  item.id === artifact.id
                    ? 'bg-[#C96442] text-white'
                    : 'bg-[#EAE7DD] dark:bg-[#282724] text-[#5A5955] dark:text-[#A3A19A]'
                }`}
              >
                #{idx + 1} {item.title.slice(0, 18)}
              </button>
            ))
          ) : (
            <span className="text-xs text-[#6E6D68] dark:text-[#9A9890] font-claude-mono">
              {artifact.content.split('\n').length} lines · Sandboxed runtime
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#EAE7DD] dark:bg-[#282724] text-[#191918] dark:text-[#ECEAE2] hover:bg-[#DFDBD0] dark:hover:bg-[#32302C] transition-colors whitespace-nowrap"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#2D6A4F]" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy code</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#EAE7DD] dark:bg-[#282724] text-[#191918] dark:text-[#ECEAE2] hover:bg-[#DFDBD0] dark:hover:bg-[#32302C] transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>
    </section>
  );
};
