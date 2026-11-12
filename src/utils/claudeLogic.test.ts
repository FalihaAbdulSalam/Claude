import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAssistantOutput,
  calculateProjectContextUsage,
  filterThreads,
  buildClaudeSystemInstruction,
  deriveThreadTitle,
  mapClaudeToGeminiModel,
  estimatePdfMetrics,
  computeArenaOrbCollection,
  formatFreeApiAsKnowledgeDoc,
  compute3DCameraPose,
  buildStoryPromptBlueprint,
  formatAnthropicCurlCommand,
  computeAtsResumeAnalysis,
  computeCreatorMonetizationEstimate,
  extractProfileFromResumeText,
  extractReadableTextFromPdfSource,
  isRawPdfBinaryString,
} from './claudeLogic';
import { ChatThread, ProjectItem } from '../types/claude';

test('extractProfileFromResumeText collects candidate name, email, skills, role, and job query from both plain text and binary PDF streams', () => {
  const sampleResume = `Faliha Abdul Salam
falihaabdulsalam@gmail.com | +1 (415) 555-0199 | San Francisco | github.com/faliha-ai
Senior Full-Stack AI Engineer with 6+ years of experience.
Skills: TypeScript, React, Node.js, Python, PostgreSQL, Docker, REST APIs, CI/CD.
Experience:
- Built scalable AI agent workflows and automated resume pipelines reducing latency by 45%.
- Architected Cloud SQL PostgreSQL microservices and React 19 dashboards.
Education:
B.S. in Computer Science, Stanford University`;

  const extracted = extractProfileFromResumeText({
    rawText: sampleResume,
    filename: 'Faliha_Abdul_Salam_Resume_2026.pdf',
  });

  assert.equal(extracted.candidateName, 'Faliha Abdul Salam');
  assert.equal(extracted.candidateEmail, 'falihaabdulsalam@gmail.com');
  assert.ok(extracted.detectedRole.includes('Senior Full-Stack AI Engineer'));
  assert.equal(extracted.yearsOfExperience, '6+ Years');
  assert.ok(extracted.extractedSkills.includes('TypeScript'));
  assert.ok(extracted.extractedSkills.includes('PostgreSQL'));
  assert.ok(extracted.educationSummary.includes('Computer Science'));
  assert.ok(extracted.experienceHighlights.length >= 2);
  assert.ok(extracted.recommendedJobQuery.length > 5);

  // Also test raw binary PDF stream syntax (%PDF-1.7 ... (...) Tj)
  const rawBinaryPdf = `%PDF-1.7
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
4 0 obj << /Length 320 >> stream
BT
/F1 16 Tf 72 750 Td (Aisha Rahman) Tj
/F1 11 Tf 0 -18 Td (aisha.rahman@techmail.io | +1 650-444-8899 | Seattle) Tj
0 -18 Td (Machine Learning Engineer with 7+ years experience) Tj
0 -18 Td (Technical Skills: Python, PyTorch, TensorFlow, SQL, Docker, AWS, Kubernetes) Tj
0 -18 Td (- Developed computer vision and LLM inference pipelines improving throughput by 60%.) Tj
0 -18 Td (M.S. in Computer Science, University of Washington) Tj
ET
endstream endobj
%%EOF`;

  assert.equal(isRawPdfBinaryString(rawBinaryPdf), true);
  const decodedText = extractReadableTextFromPdfSource(rawBinaryPdf);
  assert.ok(!decodedText.includes('%PDF-1.7'));
  assert.ok(decodedText.includes('Aisha Rahman'));

  const pdfExtracted = extractProfileFromResumeText({
    rawText: rawBinaryPdf,
    filename: 'Aisha_Rahman_ML_Resume.pdf',
  });
  assert.equal(pdfExtracted.candidateName, 'Aisha Rahman');
  assert.equal(pdfExtracted.candidateEmail, 'aisha.rahman@techmail.io');
  assert.ok(pdfExtracted.detectedRole.includes('Machine Learning Engineer'));
  assert.ok(pdfExtracted.extractedSkills.includes('PyTorch'));
  assert.ok(pdfExtracted.educationSummary.includes('University of Washington'));
});

test('computeAtsResumeAnalysis and computeCreatorMonetizationEstimate calculate accurate ATS scores and revenue projections', () => {
  const ats = computeAtsResumeAnalysis({
    candidateName: 'Faliha Abdul Salam',
    candidateEmail: 'falihaabdulsalam@gmail.com',
    targetRole: 'Senior AI Full-Stack Engineer',
    rawResume: 'Built web apps with React and TypeScript and integrated REST APIs.',
    jobDescription: 'Looking for TypeScript, React, Node.js, Python, SQL, and Cloud Architecture.',
  });
  assert.ok(ats.afterScore >= 95);
  assert.ok(ats.afterScore > ats.beforeScore);
  assert.ok(ats.correctedResumeMarkdown.includes('PROFESSIONAL SUMMARY'));
  assert.ok(ats.coverLetterMarkdown.includes('Senior AI Full-Stack Engineer'));

  const rev = computeCreatorMonetizationEstimate({
    niche: 'AI Storytelling & Tech Tutorials',
    monthlyYoutubeViews: 100000,
    monthlyInstagramViews: 150000,
    rpmUsd: 14,
  });
  assert.ok(rev.youtubeAdsenseMonthlyUsd >= 1400);
  assert.ok(rev.instagramSponsorshipMonthlyUsd >= 1200);
  assert.equal(
    rev.totalMonthlyUsd,
    rev.youtubeAdsenseMonthlyUsd + rev.instagramSponsorshipMonthlyUsd + rev.affiliateFunnelMonthlyUsd
  );
  assert.equal(rev.totalAnnualUsd, rev.totalMonthlyUsd * 12);
});

test('buildStoryPromptBlueprint and formatAnthropicCurlCommand produce clean structured outputs', () => {
  const blueprint = buildStoryPromptBlueprint({
    genre: 'Mythic Fable',
    theme: 'The Clockwork Astronomer',
    tone: 'Lyrical',
  });
  assert.ok(blueprint.title.includes('Mythic Fable'));
  assert.ok(blueprint.fullStoryPrompt.includes('The Clockwork Astronomer'));
  assert.ok(blueprint.threeDVideoPrompt.includes('60fps'));

  const curlCmd = formatAnthropicCurlCommand();
  assert.ok(curlCmd.includes('https://api.anthropic.com/v1/organizations/api_keys'));
  assert.ok(curlCmd.includes("anthropic-version: 2026-10-21"));
  assert.ok(curlCmd.includes('Authorization: Bearer $ANTHROPIC_API_KEY'));
});

test('compute3DCameraPose calculates deterministic 3D camera paths and stereo eye separation', () => {
  const orbitPose = compute3DCameraPose({ rig: 'orbit', elapsedSec: 2.0, speedMultiplier: 1.0 });
  assert.equal(orbitPose.stereoSeparation, 0);
  assert.ok(orbitPose.posY > 5);

  const stereoPose = compute3DCameraPose({ rig: 'stereo', elapsedSec: 1.5 });
  assert.ok(stereoPose.stereoSeparation > 0.2);

  const cranePose = compute3DCameraPose({ rig: 'crane', elapsedSec: 3.0 });
  assert.ok(cranePose.posY >= 2.2);
});

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
      modelId: 'claude-sonnet-5-5',
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
      modelId: 'claude-fable-5-2',
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
    modelId: 'claude-sonnet-5-5',
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

  assert.ok(sys.includes('Claude Sonnet 5.5'));
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

test('mapClaudeToGeminiModel maps Claude 5 series and all 17 universal free AI models', () => {
  assert.equal(mapClaudeToGeminiModel('claude-opus-5-5'), 'gemini-4-carbon');
  assert.equal(mapClaudeToGeminiModel('claude-mythos-5-2'), 'gemini-4-carbon');
  assert.equal(mapClaudeToGeminiModel('qwen-2-5-coder'), 'gemini-4-carbon');
  assert.equal(mapClaudeToGeminiModel('claude-sonnet-5-5'), 'gemini-4-argon');
  assert.equal(mapClaudeToGeminiModel('claude-fable-5-2'), 'gemini-4-argon');
  assert.equal(mapClaudeToGeminiModel('deepseek-r1'), 'gemini-4-argon');
  assert.equal(mapClaudeToGeminiModel('openai-o3-mini'), 'gemini-4-argon');
  assert.equal(mapClaudeToGeminiModel('gpt-4o-omni'), 'gemini-3.8-flash');
  assert.equal(mapClaudeToGeminiModel('llama-3-3-70b'), 'gemini-3.8-flash');
  assert.equal(mapClaudeToGeminiModel('claude-haiku-5-5'), 'gemini-3.1-flash-lite');
  assert.equal(
    mapClaudeToGeminiModel('claude-opus-5-5', { useGoogleSearch: true }),
    'gemini-3.8-flash'
  );
  assert.equal(
    mapClaudeToGeminiModel('deepseek-r1', { useGoogleMaps: true }),
    'gemini-3.8-flash'
  );

  const fableSys = buildClaudeSystemInstruction({
    modelId: 'claude-fable-5-2',
    styleId: 'normal',
    extendedThinking: true,
  });
  assert.ok(fableSys.includes('Claude Fable 5.2'));
  assert.ok(fableSys.includes('<thinking>...</thinking>'));
});

test('estimatePdfMetrics and computeArenaOrbCollection work deterministically', () => {
  const pdfStats = estimatePdfMetrics(72000, 'Sample PDF text '.repeat(200));
  assert.ok(pdfStats.estimatedPages >= 1);
  assert.ok(pdfStats.estimatedTokens >= 800);

  const hit = computeArenaOrbCollection({
    playerX: 1.0,
    playerZ: 1.0,
    orbX: 1.5,
    orbZ: 1.2,
    pickupRadius: 1.2,
    currentScore: 300,
    comboMultiplier: 2,
  });
  assert.equal(hit.collected, true);
  assert.equal(hit.nextCombo, 3);
  assert.equal(hit.nextScore, 600);

  const formattedDoc = formatFreeApiAsKnowledgeDoc({
    apiName: 'OpenLibrary',
    query: 'Aesop Fables',
    items: [
      {
        title: "Aesop's Fables",
        subtitle: 'Aesop · 620 BCE',
        summary: 'Classic collection of moral tales and fables.',
        url: 'https://openlibrary.org/works/OL1W',
      },
    ],
  });
  assert.equal(formattedDoc.title, 'OpenLibrary-Aesop-Fables.md');
  assert.ok(formattedDoc.content.includes("Aesop's Fables"));
  assert.ok(formattedDoc.tokens > 10);
});


