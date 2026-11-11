import React, { useState } from 'react';
import { Layers, Eye, Code2, Search, ArrowUpRight } from 'lucide-react';
import { ArtifactItem, ArtifactType } from '../types/claude';

interface ArtifactsLibraryViewProps {
  artifacts: ArtifactItem[];
  onInspectArtifact: (artifact: ArtifactItem) => void;
}

export const ArtifactsLibraryView: React.FC<ArtifactsLibraryViewProps> = ({
  artifacts,
  onInspectArtifact,
}) => {
  const [filterType, setFilterType] = useState<'all' | ArtifactType>('all');
  const [query, setQuery] = useState('');

  const filtered = artifacts.filter((a) => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        (a.language || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 h-screen overflow-y-auto px-6 lg:px-12 py-8 bg-[#FAF9F5] dark:bg-[#191918]">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E2D9] dark:border-[#2C2B28]">
          <div>
            <h1 className="font-claude-serif text-2xl font-semibold text-[#191918] dark:text-[#ECEAE2]">
              Artifacts Library
            </h1>
            <p className="text-sm text-[#5A5955] dark:text-[#A3A19A] mt-1">
              Interactive simulations, vector architecture diagrams, and self-contained modules generated across your conversations.
            </p>
          </div>

          {/* Segmented Type Filter */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#EAE7DD] dark:bg-[#232220] self-start">
            {(['all', 'html', 'svg', 'code'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  filterType === t
                    ? 'bg-white dark:bg-[#191918] text-[#191918] dark:text-[#ECEAE2] shadow-2xs'
                    : 'text-[#5A5955] dark:text-[#A3A19A] hover:text-[#191918] dark:hover:text-white'
                }`}
              >
                {t === 'all'
                  ? 'All'
                  : t === 'html'
                  ? 'Interactive HTML'
                  : t === 'svg'
                  ? 'SVG Diagrams'
                  : 'Code'}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="mt-6 relative max-w-md">
          <Search className="w-4 h-4 text-[#7A7872] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            aria-label="Filter artifacts by title or content"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter artifacts by title or keyword..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-[#F3F1EA] dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28] text-[#191918] dark:text-[#ECEAE2] focus:outline-none focus:border-[#C96442]"
          />
        </div>

        {/* Grid of Artifacts */}
        {filtered.length === 0 ? (
          <div className="mt-12 p-10 text-center rounded-xl bg-[#F3F1EA] dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28]">
            <p className="text-sm text-[#5A5955] dark:text-[#A3A19A]">
              No matching artifacts found. Ask Claude to build an interactive HTML tool or SVG diagram in any chat!
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map((art) => (
              <div
                key={art.id}
                onClick={() => onInspectArtifact(art)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onInspectArtifact(art);
                }}
                className="p-5 rounded-xl bg-[#F3F1EA] dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28] hover:border-[#C96442] transition-colors cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#C96442]/12 text-[#C96442] flex items-center justify-center shrink-0">
                        {art.type === 'html' || art.type === 'svg' ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <Code2 className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-[#191918] dark:text-[#ECEAE2]">
                          {art.title}
                        </h2>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#6E6D68] dark:text-[#9A9890]">
                          <span>
                            {art.type === 'html'
                              ? 'Interactive HTML'
                              : art.type === 'svg'
                              ? 'Vector Diagram'
                              : `Code (${art.language || 'ts'})`}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-claude-mono">v{art.version}</span>
                        </div>
                      </div>
                    </div>

                    <ArrowUpRight className="w-4 h-4 text-[#7A7872]" />
                  </div>

                  <pre className="p-3 rounded-lg bg-[#FAF9F5] dark:bg-[#191918] border border-[#E5E2D9] dark:border-[#2C2B28] text-[11px] font-claude-mono text-[#5A5955] dark:text-[#A3A19A] overflow-hidden max-h-28">
                    <code>{art.content.slice(0, 260)}</code>
                  </pre>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E5E2D9] dark:border-[#2C2B28] flex items-center justify-between text-xs text-[#6E6D68] dark:text-[#9A9890]">
                  <span className="font-claude-mono">
                    {art.content.split('\n').length} lines
                  </span>
                  <span className="text-[#C96442] font-medium flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Launch in split view</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
