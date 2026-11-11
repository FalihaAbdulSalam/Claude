import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAssistantOutput,
  estimateTokens,
  calculateProjectContextUsage,
  filterThreads,
  buildClaudeSystemInstruction,
  deriveThreadTitle,
} from './claudeLogic';
import { ChatThread, ProjectItem } from '../types/claude';

test('parseAssistantOutput extracts <thinking> and <artifact> blocks cleanly', () => {
  const sample = `<thinking>
Analyzing the user request for an interactive compound interest calculator.
We should build a self-contained HTML artifact.
</thinking>
Here is the interactive compound interest visualizer you requested.

<artifact title="Compound Growth Visualizer" type="html" language="html">
<!DOCTYPE html>
<html><body><h1>Compound Growth</h1></body></html>
</artifact>

Let me know if you would like to adjust the contribution cadence.`;

  const result = parseAssistantOutput(sample);
  assert.equal(
    result.thinking,
    'Analyzing the user request for an interactive compound interest calculator.\nWe should build a self-contained HTML artifact.'
  );
  assert.equal(result.extractedArtifacts.length, 1);
  assert.equal(result.extractedArtifacts[0].title, 'Compound Growth Visualizer');
  assert.equal(result.extractedArtifacts[0].type, 'html');
  assert.ok(result.extractedArtifacts[0].content.includes('<h1>Compound Growth</h1>'));
  assert.ok(result.cleanContent.includes('[Artifact: Compound Growth Visualizer]'));
  assert.ok(!result.cleanContent.includes('<thinking>'));
});

test('calculateProjectContextUsage computes token budget accurately against 200K window', () => {
  const project: ProjectItem = {
    id: 'p1',
    name: 'Core Architecture',
    description: 'System specs',
    customInstructions: 'Always use strict TypeScript interfaces.', // 40 chars -> 10 tokens
    knowledgeDocs: [
      {
        id: 'd1',
        title: 'API Spec',
        content: 'GET /v1/models',
        tokens: 1990,
        updatedAt: '2026-11-11T00:00:00Z',
      },
    ],
    updatedAt: '2026-11-11T00:00:00Z',
  };

  const usage = calculateProjectContextUsage(project);
  assert.equal(usage.usedTokens, 2000);
  assert.equal(usage.maxTokens, 200000);
  assert.equal(usage.percentage, 1);
});

test('filterThreads searches titles and message bodies and respects starred filter', () => {
  const threads: ChatThread[] = [
    {
      id: 't1',
      title: 'PostgreSQL Indexing Strategy',
      modelId: 'claude-3-7-sonnet',
      styleId: 'normal',
      extendedThinking: true,
      starred: true,
      createdAt: '2026-11-10T10:00:00Z',
      updatedAt: '2026-11-10T10:00:00Z',
      messages: [{ id: 'm1', role: 'user', content: 'Explain B-Tree vs GIN indexes', createdAt: '2026-11-10T10:00:00Z' }],
    },
    {
      id: 't2',
      title: 'Solar Microgrid Interactive Simulator',
      modelId: 'claude-3-7-sonnet',
      styleId: 'explanatory',
      extendedThinking: false,
      starred: false,
      createdAt: '2026-11-11T01:00:00Z',
      updatedAt: '2026-11-11T01:00:00Z',
      messages: [{ id: 'm2', role: 'user', content: 'Build an HTML battery dispatch simulator', createdAt: '2026-11-11T01:00:00Z' }],
    },
  ];

  const byQuery = filterThreads(threads, { query: 'gin' });
  assert.equal(byQuery.length, 1);
  assert.equal(byQuery[0].id, 't1');

  const starredOnly = filterThreads(threads, { onlyStarred: true });
  assert.equal(starredOnly.length, 1);
  assert.equal(starredOnly[0].id, 't1');
});

test('buildClaudeSystemInstruction incorporates style, thinking, and project knowledge', () => {
  const sys = buildClaudeSystemInstruction({
    modelId: 'claude-3-7-sonnet',
    styleId: 'concise',
    extendedThinking: true,
    project: {
      id: 'p1',
      name: 'Design Tokens',
      description: '',
      customInstructions: 'Prefer terracotta #C96442 accents.',
      knowledgeDocs: [{ id: 'k1', title: 'Palette.md', content: 'Background: #FAF9F5', tokens: 20, updatedAt: '' }],
      updatedAt: '',
    },
  });

  assert.ok(sys.includes('high-signal'));
  assert.ok(sys.includes('<thinking>...</thinking>'));
  assert.ok(sys.includes('Prefer terracotta #C96442 accents.'));
  assert.ok(sys.includes('[Document 1: Palette.md]'));
});

test('deriveThreadTitle truncates long prompts cleanly', () => {
  assert.equal(deriveThreadTitle('   '), 'Untitled conversation');
  assert.equal(deriveThreadTitle('Write a haiku about autumn'), 'Write a haiku about autumn');
  const long = 'Design a distributed consensus protocol in Rust with Raft leader election and log compaction';
  const title = deriveThreadTitle(long);
  assert.ok(title.endsWith('...'));
  assert.ok(title.length <= 48);
});
