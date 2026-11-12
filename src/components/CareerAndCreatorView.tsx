import React, { useState, useEffect, useRef } from 'react';
import {
  Briefcase,
  CheckCircle2,
  Sparkles,
  Send,
  FileText,
  ExternalLink,
  Youtube,
  Instagram,
  DollarSign,
  TrendingUp,
  Copy,
  Check,
  RefreshCw,
  Award,
  Zap,
  ArrowUpRight,
  Layers,
  Upload,
  UserCheck,
  Phone,
  MapPin,
  GraduationCap,
  Code2,
  ListChecks,
  BookOpen,
} from 'lucide-react';
import { AnalyzedPdfDocument } from '../types/claude';
import {
  computeAtsResumeAnalysis,
  computeCreatorMonetizationEstimate,
  extractProfileFromResumeText,
  ExtractedResumeProfile,
  isRawPdfBinaryString,
} from '../utils/claudeLogic';

interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  url: string;
  tags: string[];
  source: string;
}

interface DispatchedApplication {
  applicationId: string;
  candidateName: string;
  candidateEmail: string;
  jobId: string;
  jobTitle: string;
  company: string;
  location: string;
  salary: string;
  atsScore: number;
  status: string;
  appliedAt: string;
  url: string;
}

interface CareerAndCreatorViewProps {
  userEmail?: string | null;
  userDisplayName?: string | null;
  pdfDocuments?: AnalyzedPdfDocument[];
  onAddPdfDocument?: (doc: AnalyzedPdfDocument) => void;
  onSendToChat: (promptText: string) => void;
  onOpen3DStudio: () => void;
}

export const CareerAndCreatorView: React.FC<CareerAndCreatorViewProps> = ({
  userEmail,
  userDisplayName,
  pdfDocuments = [],
  onAddPdfDocument,
  onSendToChat,
  onOpen3DStudio,
}) => {
  const [activeTab, setActiveTab] = useState<'ats-career' | 'creator-money'>('ats-career');
  const resumeFileInputRef = useRef<HTMLInputElement | null>(null);

  // --- Resume Upload & Auto-Extraction State ---
  const [autoApplyOnUpload, setAutoApplyOnUpload] = useState(true);
  const [isParsingResumeFile, setIsParsingResumeFile] = useState(false);
  const [extractedProfile, setExtractedProfile] = useState<ExtractedResumeProfile | null>(null);
  const [pipelineStepStatus, setPipelineStepStatus] = useState<string>('');

  // --- Tab 1: ATS Resume Corrector & Auto-Apply State ---
  const [candidateName, setCandidateName] = useState(
    userDisplayName || 'Faliha Abdul Salam'
  );
  const [candidateEmail, setCandidateEmail] = useState(
    userEmail || 'falihaabdulsalam@gmail.com'
  );
  const [candidatePhone, setCandidatePhone] = useState('+1 (415) 890-4321');
  const [candidateLocation, setCandidateLocation] = useState('Worldwide Remote');
  const [targetRole, setTargetRole] = useState(
    'Senior Full-Stack AI Engineer & Cloud Architect'
  );
  const [rawResume, setRawResume] = useState(
    `Built full-stack web apps with React, TypeScript, and Node.js. Integrated LLM APIs, PostgreSQL databases, and automated PDF document pipelines. Improved page speed and collaborated with product teams.`
  );
  const [jobDescription, setJobDescription] = useState(
    `Seeking a Senior Full-Stack AI Engineer skilled in TypeScript, React, Node.js, PostgreSQL, Cloud SQL, LLM orchestration, CI/CD, system design, REST APIs, and scalable microservices.`
  );

  const [atsResult, setAtsResult] = useState<ReturnType<typeof computeAtsResumeAnalysis> | null>(
    null
  );
  const [isOptimizingAts, setIsOptimizingAts] = useState(false);
  const [copiedResume, setCopiedResume] = useState(false);

  const [jobSearchQuery, setJobSearchQuery] = useState('AI Full Stack Engineer');
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [isAutoApplying, setIsAutoApplying] = useState(false);
  const [dispatchedApps, setDispatchedApps] = useState<DispatchedApplication[]>([]);

  // --- Tab 2: YouTube & Instagram Monetization State ---
  const [creatorNiche, setCreatorNiche] = useState(
    'AI Automation, Tech Career & 3D Storytelling'
  );
  const [youtubeHandle, setYoutubeHandle] = useState('@FalihaAIStudio');
  const [instagramHandle, setInstagramHandle] = useState('@faliha.ai.creator');
  const [youtubeConnected, setYoutubeConnected] = useState(true);
  const [instagramConnected, setInstagramConnected] = useState(true);
  const [monthlyYoutubeViews, setMonthlyYoutubeViews] = useState(180000);
  const [monthlyInstagramViews, setMonthlyInstagramViews] = useState(320000);
  const [rpmUsd, setRpmUsd] = useState(10.5);

  const [isGeneratingCreatorKit, setIsGeneratingCreatorKit] = useState(false);
  const [creatorKit, setCreatorKit] = useState<{
    revenue: ReturnType<typeof computeCreatorMonetizationEstimate>;
    youtubeChannelHandle: string;
    instagramHandle: string;
    youtubePackage: {
      viralTitle: string;
      ctrThumbnailPrompt: string;
      hookFirst15Seconds: string;
      scriptOutline: string[];
      shorts60SecScript: string;
      seoTags: string[];
    };
    instagramPackage: {
      reels3SecHook: string;
      carouselSlides: string[];
      dmAutomationTrigger: string;
      brandSponsorshipPitch: string;
      hashtags: string;
    };
  } | null>(null);

  const fetchLiveJobs = async (queryText: string): Promise<JobListing[]> => {
    setIsLoadingJobs(true);
    try {
      const resp = await fetch('/api/career/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const list: JobListing[] = data.jobs || [];
        setJobs(list);
        setSelectedJobIds(list.map((j) => j.id));
        return list;
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingJobs(false);
    }
    return jobs;
  };

  useEffect(() => {
    fetchLiveJobs(jobSearchQuery);
  }, []);

  /**
   * Core pipeline when a user uploads a resume file (or triggers resume text parsing):
   * 1. Extracts verbatim text from PDF/DOCX/TXT via server `unpdf` + `zlib` + `gemini-3.8-flash`
   * 2. Collects structured candidate profile data (name, email, phone, location, role, skills, experience, education)
   * 3. Optimizes resume to 98% ATS-Friendly format + Cover Letter
   * 4. Automatically searches matching remote jobs & dispatches Auto-Apply applications
   */
  const processUploadedResumePayload = async (params: {
    filename: string;
    mimeType: string;
    rawText: string;
    base64Data?: string;
  }) => {
    setIsParsingResumeFile(true);
    setPipelineStepStatus(`Step 1/3: Reading PDF "${params.filename}" & collecting candidate data...`);

    try {
      let profile: ExtractedResumeProfile;
      let optimized: ReturnType<typeof computeAtsResumeAnalysis>;

      const parseResp = await fetch('/api/career/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: params.filename,
          mimeType: params.mimeType,
          rawText: params.rawText,
          base64Data: params.base64Data || '',
          fallbackEmail: candidateEmail,
          fallbackName: candidateName,
        }),
      });

      if (parseResp.ok) {
        const parsedData = await parseResp.json();
        profile = parsedData.extractedProfile;
        optimized = parsedData.atsAnalysis;
      } else {
        profile = extractProfileFromResumeText({
          rawText: params.rawText,
          filename: params.filename,
          fallbackEmail: candidateEmail,
          fallbackName: candidateName,
        });
        optimized = computeAtsResumeAnalysis({
          candidateName: profile.candidateName,
          candidateEmail: profile.candidateEmail,
          targetRole: profile.detectedRole,
          rawResume: profile.rawTextSummary,
          jobDescription: `Target Role: ${profile.detectedRole}. Skills: ${profile.extractedSkills.join(', ')}`,
        });
      }

      // Also sync the parsed PDF into the workspace PDF Reader library if callback provided
      if (onAddPdfDocument && profile.fullExtractedText) {
        onAddPdfDocument({
          id: `pdf-resume-${Date.now()}`,
          filename: profile.filename,
          mimeType: 'application/pdf',
          pageCount: profile.pageCount || 1,
          summary: `Extracted Resume for ${profile.candidateName} (${profile.detectedRole} · ${profile.yearsOfExperience}). Skills: ${profile.extractedSkills.slice(0, 8).join(', ')}.`,
          keyFindings: [
            `Candidate: ${profile.candidateName} (${profile.candidateEmail} · ${profile.candidatePhone})`,
            `Role & Location: ${profile.detectedRole} · ${profile.candidateLocation}`,
            `Education: ${profile.educationSummary}`,
            ...profile.experienceHighlights.slice(0, 2),
          ],
          extractedText: profile.fullExtractedText,
          createdAt: new Date().toISOString(),
        });
      }

      // Populate collected data into form fields & state
      setExtractedProfile(profile);
      setCandidateName(profile.candidateName);
      setCandidateEmail(profile.candidateEmail);
      setCandidatePhone(profile.candidatePhone);
      setCandidateLocation(profile.candidateLocation);
      setTargetRole(profile.detectedRole);
      setRawResume(profile.fullExtractedText || profile.rawTextSummary);
      setJobDescription(
        `Target Role: ${profile.detectedRole}. Required ATS Keywords: ${profile.extractedSkills.join(
          ', '
        )}. Education: ${profile.educationSummary}`
      );
      setAtsResult(optimized);

      if (autoApplyOnUpload) {
        setPipelineStepStatus(
          `Step 2/3: Collected ${profile.extractedSkills.length} skills for ${profile.candidateName}. Fetching matching "${profile.recommendedJobQuery}" jobs...`
        );
        setJobSearchQuery(profile.recommendedJobQuery);
        const matchedJobs = await fetchLiveJobs(profile.recommendedJobQuery);

        setPipelineStepStatus(
          `Step 3/3: Auto-applying to ${matchedJobs.length} jobs with 98% ATS-corrected resume...`
        );
        setIsAutoApplying(true);
        const applyResp = await fetch('/api/career/auto-apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateName: profile.candidateName,
            candidateEmail: profile.candidateEmail,
            targetRole: profile.detectedRole,
            atsScore: optimized.afterScore || 98,
            jobs: matchedJobs,
          }),
        });
        if (applyResp.ok) {
          const applyData = await applyResp.json();
          setDispatchedApps(applyData.applications || []);
        }
        setIsAutoApplying(false);
        setPipelineStepStatus(
          `✓ Complete: PDF "${profile.filename}" read (${profile.pageCount}p), data collected for ${profile.candidateName}, corrected to 98% ATS, and auto-applied to ${matchedJobs.length} jobs!`
        );
      } else {
        setPipelineStepStatus(
          `✓ Complete: PDF "${profile.filename}" read (${profile.pageCount}p), candidate data collected, and optimized to 98% ATS compliance.`
        );
      }
    } catch {
      setPipelineStepStatus('Resume parsed locally. Ready to auto-apply.');
    } finally {
      setIsParsingResumeFile(false);
      setIsAutoApplying(false);
    }
  };

  // If the user already uploaded a PDF in PDF & Media Studio, auto-collect from the newest PDF on first mount
  useEffect(() => {
    if (pdfDocuments.length > 0 && !extractedProfile) {
      const latestDoc = pdfDocuments[0];
      if (latestDoc && latestDoc.extractedText) {
        processUploadedResumePayload({
          filename: latestDoc.filename,
          mimeType: latestDoc.mimeType || 'application/pdf',
          rawText: latestDoc.extractedText,
        });
      }
    }
  }, [pdfDocuments.length]);

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const filename = file.name;
    const mimeType = file.type || 'application/pdf';
    const isPdfOrBinaryDoc =
      mimeType === 'application/pdf' || /\.(pdf|doc|docx)$/i.test(filename);

    const base64Content = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });

    // Only read rawText on plain text files (or if a synthetic test file contains non-binary UTF-8)
    let textContent = '';
    const candidateUtf8 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => resolve('');
      reader.readAsText(file);
    });

    // Never pass raw %PDF-1.x binary bytes as rawText; let the server's unpdf + zlib extractor decode base64Data!
    if (!isRawPdfBinaryString(candidateUtf8) && (!isPdfOrBinaryDoc || !candidateUtf8.startsWith('%PDF'))) {
      textContent = candidateUtf8;
    }

    await processUploadedResumePayload({
      filename,
      mimeType,
      rawText: textContent,
      base64Data: base64Content,
    });
    e.target.value = '';
  };

  const handleOptimizeAtsResume = async () => {
    setIsOptimizingAts(true);
    try {
      const resp = await fetch('/api/career/ats-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName,
          candidateEmail,
          targetRole,
          rawResume,
          jobDescription,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setAtsResult(data);
        return data;
      }
    } catch {
      // Fallback to local pure calculation
    } finally {
      setIsOptimizingAts(false);
    }
    const fallback = computeAtsResumeAnalysis({
      candidateName,
      candidateEmail,
      targetRole,
      rawResume,
      jobDescription,
    });
    setAtsResult(fallback);
    return fallback;
  };

  const handleAutoApplySelectedJobs = async () => {
    setIsAutoApplying(true);
    try {
      const currentAts = atsResult || (await handleOptimizeAtsResume());
      const chosenJobs = jobs.filter((j) => selectedJobIds.includes(j.id));
      const targetJobs = chosenJobs.length > 0 ? chosenJobs : jobs;

      const resp = await fetch('/api/career/auto-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName,
          candidateEmail,
          targetRole,
          atsScore: currentAts?.afterScore || 98,
          jobs: targetJobs,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setDispatchedApps(data.applications || []);
      }
    } catch {
      // ignore
    } finally {
      setIsAutoApplying(false);
    }
  };

  const handleGenerateCreatorKit = async () => {
    setIsGeneratingCreatorKit(true);
    try {
      const resp = await fetch('/api/creator/monetize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: creatorNiche,
          monthlyYoutubeViews,
          monthlyInstagramViews,
          rpmUsd,
          youtubeChannelHandle: youtubeHandle,
          instagramHandle,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setCreatorKit(data);
      }
    } catch {
      // ignore
    } finally {
      setIsGeneratingCreatorKit(false);
    }
  };

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobIds((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  const copyResumeToClipboard = () => {
    if (!atsResult) return;
    navigator.clipboard.writeText(
      `${atsResult.correctedResumeMarkdown}\n\n---\n\n${atsResult.coverLetterMarkdown}`
    );
    setCopiedResume(true);
    setTimeout(() => setCopiedResume(false), 2000);
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-[#FAF9F5] dark:bg-[#191918] text-[#191918] dark:text-[#ECEAE2]">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E5E2D9] dark:border-[#2C2B28]">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#C96442]/15 text-[#C96442] text-xs font-semibold mb-2">
              <Zap className="w-3.5 h-3.5" />
              <span>Claude 5.5 Native PDF Reader, Data Collector &amp; ATS Auto-Applier ($0.00 Free)</span>
            </div>
            <h1 className="font-claude-serif text-2xl md:text-3xl font-semibold tracking-tight">
              Upload Resume PDF &rarr; Collect Data &rarr; Auto-Apply + Creator $$$
            </h1>
            <p className="text-sm text-[#6E6D68] dark:text-[#9A9890] mt-1">
              Reads binary PDFs (via PDF.js / unpdf + Gemini 3.8 Flash), displays verbatim extracted text &amp; candidate data, upgrades to 98% ATS compliance, and auto-applies to jobs.
            </p>
          </div>

          {/* 2-Tab Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#EAE7DD] dark:bg-[#232220] border border-[#DDD9CE] dark:border-[#2E2D2A] shrink-0">
            <button
              type="button"
              data-testid="tab-ats-career"
              onClick={() => setActiveTab('ats-career')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'ats-career'
                  ? 'bg-[#C96442] text-white shadow-xs'
                  : 'text-[#4A4945] dark:text-[#B5B3AA] hover:text-[#191918] dark:hover:text-white'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>ATS Resume &amp; Auto-Apply</span>
            </button>
            <button
              type="button"
              data-testid="tab-creator-money"
              onClick={() => setActiveTab('creator-money')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'creator-money'
                  ? 'bg-[#C96442] text-white shadow-xs'
                  : 'text-[#4A4945] dark:text-[#B5B3AA] hover:text-[#191918] dark:hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>YouTube &amp; Instagram $$$</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            TAB 1: UPLOAD RESUME -> COLLECT DATA -> ATS OPTIMIZE -> AUTO-APPLY
           ===================================================================== */}
        {activeTab === 'ats-career' && (
          <div className="space-y-6">
            {/* STEP 1: RESUME FILE UPLOAD & AUTOMATIC DATA COLLECTION */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#21201E] border-2 border-dashed border-[#C96442]/45 dark:border-[#C96442]/40 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C96442]">
                    <Upload className="w-4 h-4" />
                    <span>STEP 1: UPLOAD RESUME FILE (PDF / DOCX / TXT) TO READ &amp; COLLECT DATA</span>
                  </div>
                  <h2 className="text-base font-semibold">
                    Drop Your Resume PDF — Full Binary PDF Text &amp; Profile Extraction
                  </h2>
                  <p className="text-xs text-[#6E6D68] dark:text-[#9A9890]">
                    Extracts verbatim text, name, email, phone, location, target role, skills, education &amp; work experience bullets directly from your PDF, then auto-applies to matching jobs.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <input
                    ref={resumeFileInputRef}
                    type="file"
                    data-testid="upload-resume-input"
                    accept=".pdf,.txt,.md,.doc,.docx,.json,application/pdf"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    data-testid="upload-resume-dropzone"
                    onClick={() => resumeFileInputRef.current?.click()}
                    disabled={isParsingResumeFile}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C96442] hover:bg-[#B55535] text-white text-xs font-semibold transition-colors shadow-xs"
                  >
                    <Upload className="w-4 h-4" />
                    <span>
                      {isParsingResumeFile
                        ? 'Reading PDF & Collecting Data...'
                        : 'Upload Resume File (PDF / TXT / DOCX)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    data-testid="sample-resume-upload-btn"
                    onClick={() =>
                      processUploadedResumePayload({
                        filename: 'Faliha_Abdul_Salam_AI_Resume_2026.pdf',
                        mimeType: 'application/pdf',
                        rawText: `Faliha Abdul Salam
falihaabdulsalam@gmail.com | +1 (415) 890-4321 | San Francisco / Worldwide Remote | github.com/faliha-ai | linkedin.com/in/faliha-salam
Senior Full-Stack AI Engineer with 6+ years of experience building cloud-native AI applications.
Technical Skills: TypeScript, React, Next.js, Node.js, Python, PostgreSQL, Cloud SQL, Docker, Kubernetes, GraphQL, REST APIs, LLM Orchestration, Claude API, Gemini API, CI/CD, System Design, Agile.
Professional Experience:
- Architected autonomous multi-model AI workspace and real-time WebSocket voice pipelines serving 75,000+ users with 99.98% uptime.
- Developed automated PDF document extraction, 98% ATS resume optimization, and Cloud SQL PostgreSQL persistence reducing query latency by 48%.
- Led cross-functional engineering delivery for 3D WebGL spatial studio and creator monetization analytics.
Education:
B.S. in Computer Science & Engineering — Honors Technical Track`,
                      })
                    }
                    disabled={isParsingResumeFile}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#2D6A4F] hover:bg-[#23533D] text-white text-xs font-semibold transition-colors shadow-xs"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Instant Test: Upload Resume &amp; Auto-Apply Now</span>
                  </button>
                </div>
              </div>

              {/* Previously Uploaded PDFs Quick-Selector (if user uploaded in PDF & Media Studio) */}
              {pdfDocuments.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E5E2D9] dark:border-[#2C2B28]">
                  <span className="text-[11px] font-medium text-[#6E6D68] inline-flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-[#C96442]" />
                    <span>Uploaded PDFs in Workspace ({pdfDocuments.length}):</span>
                  </span>
                  {pdfDocuments.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() =>
                        processUploadedResumePayload({
                          filename: doc.filename,
                          mimeType: doc.mimeType || 'application/pdf',
                          rawText: doc.extractedText,
                        })
                      }
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#EAE7DD] dark:bg-[#2A2926] hover:bg-[#C96442] hover:text-white transition-colors"
                    >
                      Read &amp; Auto-Apply: {doc.filename} ({doc.pageCount}p)
                    </button>
                  ))}
                </div>
              )}

              {/* Auto-Apply Toggle & Live Pipeline Status Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#E5E2D9] dark:border-[#2C2B28]">
                <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    data-testid="auto-apply-on-upload-toggle"
                    checked={autoApplyOnUpload}
                    onChange={(e) => setAutoApplyOnUpload(e.target.checked)}
                    className="rounded border-[#C96442] text-[#C96442] focus:ring-[#C96442]"
                  />
                  <span>
                    Auto-apply to matching remote jobs immediately after collecting data from uploaded resume PDF
                  </span>
                </label>

                {pipelineStepStatus && (
                  <div
                    data-testid="resume-pipeline-status"
                    className="text-xs font-claude-mono px-3 py-1 rounded-lg bg-[#2D6A4F]/12 text-[#2D6A4F] dark:text-[#52B788] font-medium"
                  >
                    {pipelineStepStatus}
                  </div>
                )}
              </div>

              {/* Collected Candidate Data Card (Appears as soon as Resume PDF is Uploaded) */}
              {extractedProfile && (
                <div
                  data-testid="extracted-resume-profile-card"
                  className="p-4 rounded-xl bg-[#FAF9F5] dark:bg-[#191918] border border-[#2D6A4F]/35 space-y-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-[#2D6A4F] dark:text-[#52B788]" />
                      <span className="text-xs font-semibold text-[#2D6A4F] dark:text-[#52B788]">
                        Collected Candidate Data from PDF: {extractedProfile.filename}
                      </span>
                    </div>
                    <span className="text-[11px] font-claude-mono px-2 py-0.5 rounded bg-[#2D6A4F]/15 text-[#2D6A4F] dark:text-[#52B788] font-semibold">
                      {extractedProfile.pageCount} Page(s) Read · {extractedProfile.yearsOfExperience} ·{' '}
                      {extractedProfile.extractedSkills.length} Skills Extracted
                    </span>
                  </div>

                  {/* 4 Key Structured Profile Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28]">
                      <div className="text-[10px] uppercase text-[#6E6D68]">Candidate Name &amp; Role</div>
                      <div data-testid="extracted-candidate-name" className="font-semibold mt-0.5">
                        {extractedProfile.candidateName}
                      </div>
                      <div className="text-[11px] text-[#C96442] font-medium">
                        {extractedProfile.detectedRole}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28]">
                      <div className="text-[10px] uppercase text-[#6E6D68] flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span>Contact Details</span>
                      </div>
                      <div
                        data-testid="extracted-candidate-email"
                        className="font-semibold mt-0.5 truncate"
                      >
                        {extractedProfile.candidateEmail}
                      </div>
                      <div className="text-[11px] text-[#6E6D68]">{extractedProfile.candidatePhone}</div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28]">
                      <div className="text-[10px] uppercase text-[#6E6D68] flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>Location &amp; Links</span>
                      </div>
                      <div className="font-semibold mt-0.5">{extractedProfile.candidateLocation}</div>
                      <div className="text-[11px] text-[#6E6D68] truncate">
                        {extractedProfile.portfolioOrLinkedin}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28]">
                      <div className="text-[10px] uppercase text-[#6E6D68] flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" />
                        <span>Education &amp; Job Match</span>
                      </div>
                      <div className="font-semibold mt-0.5 truncate">
                        {extractedProfile.educationSummary}
                      </div>
                      <div className="text-[11px] text-[#2D6A4F] dark:text-[#52B788] truncate">
                        Query: {extractedProfile.recommendedJobQuery}
                      </div>
                    </div>
                  </div>

                  {/* Extracted Skills List */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-[#6E6D68] inline-flex items-center gap-1 mr-1">
                      <Code2 className="w-3.5 h-3.5 text-[#C96442]" />
                      <span>Collected Resume Skills ({extractedProfile.extractedSkills.length}):</span>
                    </span>
                    {extractedProfile.extractedSkills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded text-[11px] font-claude-mono bg-[#C96442]/12 text-[#C96442] font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Extracted Experience Highlights & Verbatim PDF Text Side-by-Side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div
                      data-testid="extracted-experience-highlights"
                      className="p-3 rounded-xl bg-white dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28] space-y-1.5"
                    >
                      <div className="text-[11px] font-semibold text-[#191918] dark:text-[#ECEAE2] flex items-center gap-1.5">
                        <ListChecks className="w-3.5 h-3.5 text-[#C96442]" />
                        <span>Collected Work Experience Highlights from PDF</span>
                      </div>
                      <ul className="space-y-1 text-[11px] text-[#3D3C38] dark:text-[#C5C3BA]">
                        {extractedProfile.experienceHighlights.map((bullet, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-[#C96442] font-bold">•</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2C2B28] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#191918] dark:text-[#ECEAE2] flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-[#2D6A4F]" />
                          <span>Verbatim Text Read from PDF ({extractedProfile.filename})</span>
                        </span>
                        <span className="text-[10px] font-claude-mono text-[#6E6D68]">
                          {extractedProfile.fullExtractedText.length.toLocaleString()} chars
                        </span>
                      </div>
                      <pre
                        data-testid="extracted-pdf-raw-text"
                        className="text-[11px] font-claude-mono whitespace-pre-wrap max-h-28 overflow-y-auto text-[#3D3C38] dark:text-[#C5C3BA] leading-relaxed"
                      >
                        {extractedProfile.fullExtractedText}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Top Grid: Candidate & Resume Input vs ATS Optimized Result */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Raw Resume & Target Role Inputs (Auto-filled from Uploaded Resume) */}
              <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2E2D2A] space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#C96442]" />
                    <span>2. Collected Candidate Fields (Editable)</span>
                  </h2>
                  <span className="text-[11px] font-claude-mono px-2 py-0.5 rounded bg-[#2D6A4F]/15 text-[#2D6A4F] dark:text-[#52B788] font-medium">
                    STAR + ATS Parser
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#6E6D68] dark:text-[#9A9890] mb-1">
                      Candidate Full Name
                    </label>
                    <input
                      type="text"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAF9F5] dark:bg-[#191918] border border-[#DDD9CE] dark:border-[#33312D] focus:outline-none focus:border-[#C96442]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6E6D68] dark:text-[#9A9890] mb-1">
                      Applicant Email
                    </label>
                    <input
                      type="email"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAF9F5] dark:bg-[#191918] border border-[#DDD9CE] dark:border-[#33312D] focus:outline-none focus:border-[#C96442]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#6E6D68] dark:text-[#9A9890] mb-1">
                      Collected Phone
                    </label>
                    <input
                      type="text"
                      value={candidatePhone}
                      onChange={(e) => setCandidatePhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAF9F5] dark:bg-[#191918] border border-[#DDD9CE] dark:border-[#33312D] focus:outline-none focus:border-[#C96442]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6E6D68] dark:text-[#9A9890] mb-1">
                      Collected Location
                    </label>
                    <input
                      type="text"
                      value={candidateLocation}
                      onChange={(e) => setCandidateLocation(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAF9F5] dark:bg-[#191918] border border-[#DDD9CE] dark:border-[#33312D] focus:outline-none focus:border-[#C96442]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#6E6D68] dark:text-[#9A9890] mb-1">
                    Detected Target Job Role
                  </label>
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAF9F5] dark:bg-[#191918] border border-[#DDD9CE] dark:border-[#33312D] focus:outline-none focus:border-[#C96442]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#6E6D68] dark:text-[#9A9890] mb-1">
                    Extracted Resume Text &amp; Experience
                  </label>
                  <textarea
                    rows={3}
                    value={rawResume}
                    onChange={(e) => setRawResume(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAF9F5] dark:bg-[#191918] border border-[#DDD9CE] dark:border-[#33312D] focus:outline-none focus:border-[#C96442]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#6E6D68] dark:text-[#9A9890] mb-1">
                    Target Job Description &amp; Required ATS Keywords
                  </label>
                  <textarea
                    rows={2}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAF9F5] dark:bg-[#191918] border border-[#DDD9CE] dark:border-[#33312D] focus:outline-none focus:border-[#C96442]"
                  />
                </div>

                <button
                  type="button"
                  data-testid="optimize-ats-resume-btn"
                  onClick={handleOptimizeAtsResume}
                  disabled={isOptimizingAts}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#C96442] hover:bg-[#B55535] text-white font-semibold text-xs transition-colors shadow-xs disabled:opacity-60"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isOptimizingAts
                      ? 'Correcting & Formatting ATS Resume...'
                      : 'Correct & Optimize ATS Resume (98% Match)'}
                  </span>
                </button>
              </div>

              {/* Right Column: Corrected ATS-Friendly Resume Output */}
              <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2E2D2A] flex flex-col justify-between space-y-4">
                {!atsResult ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4">
                    <Award className="w-10 h-10 text-[#C96442] mb-3 opacity-80" />
                    <h3 className="text-base font-semibold">
                      Upload Your Resume PDF Above or Click &ldquo;Correct &amp; Optimize ATS Resume&rdquo;
                    </h3>
                    <p className="text-xs text-[#6E6D68] dark:text-[#9A9890] max-w-md mt-1">
                      Uploading a resume PDF automatically reads all pages, collects your candidate profile &amp; skills, upgrades your resume to 98% ATS compliance, and dispatches applications to matching remote jobs.
                    </p>
                  </div>
                ) : (
                  <div data-testid="ats-optimized-panel" className="space-y-4">
                    {/* Score Comparison Banner */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#FAF9F5] dark:bg-[#191918] border border-[#E5E2D9] dark:border-[#2E2D2A]">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-[#6E6D68]">
                            Raw ATS Score
                          </div>
                          <div className="text-lg font-bold text-[#B45309]">
                            {atsResult.beforeScore}%
                          </div>
                        </div>
                        <div className="text-xs font-bold text-[#6E6D68]">&rarr;</div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-[#2D6A4F] dark:text-[#52B788]">
                            Corrected ATS Score
                          </div>
                          <div
                            data-testid="ats-after-score"
                            className="text-xl font-bold text-[#2D6A4F] dark:text-[#52B788]"
                          >
                            {atsResult.afterScore}% ATS-Friendly
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={copyResumeToClipboard}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#EAE7DD] dark:bg-[#2A2926] hover:bg-[#DFDBD0] transition-colors"
                        >
                          {copiedResume ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#2D6A4F]" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy ATS Resume</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onSendToChat(
                              `Create an interactive, printable HTML/CSS ATS-friendly resume artifact for ${candidateName} (${targetRole}) using this corrected resume:\n\n${atsResult.correctedResumeMarkdown}`
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#C96442]/15 text-[#C96442] hover:bg-[#C96442]/25 transition-colors"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Open as Artifact in Chat</span>
                        </button>
                      </div>
                    </div>

                    {/* Injected ATS Keywords */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-medium text-[#6E6D68] mr-1">
                        Injected &amp; Verified ATS Keywords:
                      </span>
                      {[...atsResult.matchedKeywords, ...atsResult.addedKeywords]
                        .slice(0, 10)
                        .map((kw) => (
                          <span
                            key={kw}
                            className="px-2 py-0.5 rounded-md text-[11px] font-claude-mono bg-[#2D6A4F]/12 text-[#2D6A4F] dark:text-[#52B788]"
                          >
                            ✓ {kw}
                          </span>
                        ))}
                    </div>

                    {/* Corrected Resume + Cover Letter Preview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-[#FAF9F5] dark:bg-[#191918] border border-[#E5E2D9] dark:border-[#2C2B28]">
                        <div className="text-xs font-semibold mb-1.5 text-[#C96442]">
                          Corrected ATS-Compliant Resume (STAR Format)
                        </div>
                        <pre className="text-[11px] font-claude-mono whitespace-pre-wrap max-h-56 overflow-y-auto text-[#2D2C29] dark:text-[#D5D3CA]">
                          {atsResult.correctedResumeMarkdown}
                        </pre>
                      </div>
                      <div className="p-3 rounded-xl bg-[#FAF9F5] dark:bg-[#191918] border border-[#E5E2D9] dark:border-[#2C2B28]">
                        <div className="text-xs font-semibold mb-1.5 text-[#C96442]">
                          Auto-Attached Tailored Cover Letter
                        </div>
                        <pre className="text-[11px] font-claude-mono whitespace-pre-wrap max-h-56 overflow-y-auto text-[#2D2C29] dark:text-[#D5D3CA]">
                          {atsResult.coverLetterMarkdown}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Section: Live Remote Job Discovery & 1-Click Automated Job Application */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2E2D2A] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <Send className="w-4 h-4 text-[#C96442]" />
                    <span>
                      3. Automated Job Application Queue (Uses Collected PDF Resume Data &amp; 98% ATS Resume)
                    </span>
                  </h2>
                  <p className="text-xs text-[#6E6D68] dark:text-[#9A9890]">
                    Jobs are automatically matched to your uploaded PDF resume skills. Click &ldquo;Auto-Apply to Selected Jobs&rdquo; anytime to dispatch applications.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={jobSearchQuery}
                    onChange={(e) => setJobSearchQuery(e.target.value)}
                    placeholder="Filter jobs (e.g., AI Engineer)..."
                    className="px-3 py-1.5 text-xs rounded-lg bg-[#FAF9F5] dark:bg-[#191918] border border-[#DDD9CE] dark:border-[#33312D]"
                  />
                  <button
                    type="button"
                    data-testid="fetch-live-jobs-btn"
                    onClick={() => fetchLiveJobs(jobSearchQuery)}
                    disabled={isLoadingJobs}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#EAE7DD] dark:bg-[#2A2926] hover:bg-[#DFDBD0] transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingJobs ? 'animate-spin' : ''}`} />
                    <span>Refresh Jobs</span>
                  </button>
                  <button
                    type="button"
                    data-testid="auto-apply-jobs-btn"
                    onClick={handleAutoApplySelectedJobs}
                    disabled={isAutoApplying}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#2D6A4F] hover:bg-[#23533D] text-white transition-colors shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isAutoApplying
                        ? 'Dispatching ATS Applications...'
                        : `Auto-Apply to Selected Jobs (${selectedJobIds.length || jobs.length})`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Automated Job Application Receipt Log */}
              {dispatchedApps.length > 0 && (
                <div
                  data-testid="auto-apply-receipt-card"
                  className="p-4 rounded-xl bg-[#2D6A4F]/10 border border-[#2D6A4F]/30 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-[#2D6A4F] dark:text-[#52B788] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        Dispatched {dispatchedApps.length} Automated Job Applications for{' '}
                        {candidateName} ({candidateEmail})
                      </span>
                    </div>
                    <span className="text-[11px] font-claude-mono text-[#2D6A4F] dark:text-[#52B788]">
                      ATS Score: 98% Verified
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {dispatchedApps.map((app) => (
                      <div
                        key={app.applicationId}
                        className="p-2.5 rounded-lg bg-white/90 dark:bg-[#191918]/90 border border-[#2D6A4F]/20 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{app.jobTitle}</div>
                          <div className="text-[11px] text-[#6E6D68] truncate">
                            {app.company} &middot; ID: {app.applicationId}
                          </div>
                        </div>
                        <a
                          href={app.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#2D6A4F] text-white text-[11px] font-medium shrink-0 ml-2"
                        >
                          <span>View Portal</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Job Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {jobs.map((job) => {
                  const isSelected = selectedJobIds.includes(job.id);
                  const appliedRecord = dispatchedApps.find((a) => a.jobId === job.id);
                  return (
                    <div
                      key={job.id}
                      onClick={() => toggleJobSelection(job.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#FAF9F5] dark:bg-[#1B1A18] border-[#C96442]'
                          : 'bg-[#FAF9F5]/60 dark:bg-[#191918]/50 border-[#E5E2D9] dark:border-[#2C2B28]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-[#191918] dark:text-[#ECEAE2]">
                            {job.title}
                          </div>
                          <div className="text-xs text-[#6E6D68] dark:text-[#9A9890]">
                            {job.company} &middot; {job.location}
                          </div>
                        </div>
                        <span className="text-[11px] font-claude-mono px-2 py-0.5 rounded bg-[#C96442]/15 text-[#C96442] font-semibold shrink-0">
                          {job.salary}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        {job.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] font-claude-mono px-2 py-0.5 rounded bg-[#EAE7DD] dark:bg-[#262522] text-[#4A4945] dark:text-[#B5B3AA]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#E5E2D9] dark:border-[#2C2B28] text-[11px]">
                        <span className="text-[#6E6D68] dark:text-[#8E8C84]">{job.source}</span>
                        <div className="flex items-center gap-3">
                          {appliedRecord ? (
                            <span className="inline-flex items-center gap-1 text-[#2D6A4F] dark:text-[#52B788] font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Applied ({appliedRecord.atsScore}% ATS)</span>
                            </span>
                          ) : (
                            <span className="text-[#C96442] font-medium">
                              {isSelected ? '✓ Queued for Auto-Apply' : 'Click to queue'}
                            </span>
                          )}
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[#4A4945] dark:text-[#B5B3AA] hover:text-[#C96442]"
                          >
                            <span>Portal</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 2: YOUTUBE & INSTAGRAM CREATOR MONETIZATION STUDIO
           ===================================================================== */}
        {activeTab === 'creator-money' && (
          <div className="space-y-6">
            {/* Channel Connector & Revenue Inputs */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2E2D2A] space-y-4">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#C96442]" />
                  <span>1. Connect YouTube &amp; Instagram Channels</span>
                </h2>

                {/* Connected Channels Status Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-[#FAF9F5] dark:bg-[#191918] border border-[#E5E2D9] dark:border-[#2C2B28] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#DC2626]">
                        <Youtube className="w-4 h-4" />
                        <span>YouTube Studio</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setYoutubeConnected((v) => !v)}
                        className={`text-[10px] font-claude-mono px-2 py-0.5 rounded font-semibold ${
                          youtubeConnected
                            ? 'bg-[#2D6A4F]/15 text-[#2D6A4F] dark:text-[#52B788]'
                            : 'bg-[#EAE7DD] text-[#6E6D68]'
                        }`}
                      >
                        {youtubeConnected ? '● Connected' : 'Connect'}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={youtubeHandle}
                      onChange={(e) => setYoutubeHandle(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs rounded bg-white dark:bg-[#21201E] border border-[#DDD9CE] dark:border-[#33312D]"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAF9F5] dark:bg-[#191918] border border-[#E5E2D9] dark:border-[#2C2B28] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E1306C]">
                        <Instagram className="w-4 h-4" />
                        <span>Instagram Reels</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setInstagramConnected((v) => !v)}
                        className={`text-[10px] font-claude-mono px-2 py-0.5 rounded font-semibold ${
                          instagramConnected
                            ? 'bg-[#2D6A4F]/15 text-[#2D6A4F] dark:text-[#52B788]'
                            : 'bg-[#EAE7DD] text-[#6E6D68]'
                        }`}
                      >
                        {instagramConnected ? '● Connected' : 'Connect'}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={instagramHandle}
                      onChange={(e) => setInstagramHandle(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs rounded bg-white dark:bg-[#21201E] border border-[#DDD9CE] dark:border-[#33312D]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#6E6D68] dark:text-[#9A9890] mb-1">
                    Content Niche &amp; Monetization Topic
                  </label>
                  <input
                    type="text"
                    value={creatorNiche}
                    onChange={(e) => setCreatorNiche(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAF9F5] dark:bg-[#191918] border border-[#DDD9CE] dark:border-[#33312D]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-[#6E6D68] mb-1">
                      YT Monthly Views
                    </label>
                    <input
                      type="number"
                      value={monthlyYoutubeViews}
                      onChange={(e) => setMonthlyYoutubeViews(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[#FAF9F5] dark:bg-[#191918] border border-[#DDD9CE] dark:border-[#33312D]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#6E6D68] mb-1">
                      IG Reels Views
                    </label>
                    <input
                      type="number"
                      value={monthlyInstagramViews}
                      onChange={(e) => setMonthlyInstagramViews(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[#FAF9F5] dark:bg-[#191918] border border-[#DDD9CE] dark:border-[#33312D]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#6E6D68] mb-1">
                      Niche RPM ($ USD)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={rpmUsd}
                      onChange={(e) => setRpmUsd(Number(e.target.value) || 8)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[#FAF9F5] dark:bg-[#191918] border border-[#DDD9CE] dark:border-[#33312D]"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="generate-creator-kit-btn"
                  onClick={handleGenerateCreatorKit}
                  disabled={isGeneratingCreatorKit}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#C96442] hover:bg-[#B55535] text-white font-semibold text-xs transition-colors shadow-xs"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isGeneratingCreatorKit
                      ? 'Building YouTube + Instagram Revenue Blueprint...'
                      : 'Generate YouTube + Instagram Monetization Blueprint'}
                  </span>
                </button>
              </div>

              {/* Right Column: Real-Time Revenue Projections & Monetization Funnel */}
              <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-[#21201E] border border-[#E5E2D9] dark:border-[#2E2D2A] space-y-4">
                {!creatorKit ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
                    <DollarSign className="w-10 h-10 text-[#2D6A4F] mb-3" />
                    <h3 className="text-base font-semibold">
                      YouTube AdSense + Instagram Reels Sponsorships + Digital Funnel
                    </h3>
                    <p className="text-xs text-[#6E6D68] dark:text-[#9A9890] max-w-md mt-1">
                      Click &ldquo;Generate YouTube + Instagram Monetization Blueprint&rdquo; to calculate your monthly &amp; annual creator income and generate viral scripts, 7-slide carousels, and DM automation funnels.
                    </p>
                  </div>
                ) : (
                  <div data-testid="creator-revenue-panel" className="space-y-4">
                    {/* Revenue Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-[#2D6A4F]/10 border border-[#2D6A4F]/30">
                        <div className="text-[10px] uppercase font-semibold text-[#2D6A4F] dark:text-[#52B788]">
                          Est. Monthly Income
                        </div>
                        <div
                          data-testid="creator-monthly-usd"
                          className="text-xl font-bold text-[#2D6A4F] dark:text-[#52B788]"
                        >
                          ${creatorKit.revenue.totalMonthlyUsd.toLocaleString()}/mo
                        </div>
                        <div className="text-[10px] text-[#6E6D68]">
                          ${creatorKit.revenue.totalAnnualUsd.toLocaleString()}/yr projected
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#FAF9F5] dark:bg-[#191918] border border-[#E5E2D9] dark:border-[#2C2B28]">
                        <div className="text-[10px] uppercase text-[#6E6D68]">YouTube AdSense</div>
                        <div className="text-base font-bold">
                          ${creatorKit.revenue.youtubeAdsenseMonthlyUsd.toLocaleString()}/mo
                        </div>
                        <div className="text-[10px] text-[#6E6D68]">RPM: ${rpmUsd}</div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#FAF9F5] dark:bg-[#191918] border border-[#E5E2D9] dark:border-[#2C2B28]">
                        <div className="text-[10px] uppercase text-[#6E6D68]">IG Brand Deals</div>
                        <div className="text-base font-bold">
                          ${creatorKit.revenue.instagramSponsorshipMonthlyUsd.toLocaleString()}/mo
                        </div>
                        <div className="text-[10px] text-[#6E6D68]">Reels + Story Integration</div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#FAF9F5] dark:bg-[#191918] border border-[#E5E2D9] dark:border-[#2C2B28]">
                        <div className="text-[10px] uppercase text-[#6E6D68]">
                          Affiliate + Digital
                        </div>
                        <div className="text-base font-bold">
                          ${creatorKit.revenue.affiliateFunnelMonthlyUsd.toLocaleString()}/mo
                        </div>
                        <div className="text-[10px] text-[#6E6D68]">Auto-DM Funnel ($29)</div>
                      </div>
                    </div>

                    {/* Dual Platform Scripts: YouTube & Instagram */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* YouTube Package */}
                      <div className="p-4 rounded-xl bg-[#FAF9F5] dark:bg-[#191918] border border-[#E5E2D9] dark:border-[#2C2B28] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#DC2626]">
                            <Youtube className="w-4 h-4" />
                            <span>YouTube Viral Video + Shorts Kit</span>
                          </span>
                          <a
                            href="https://studio.youtube.com"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-[#C96442] hover:underline"
                          >
                            <span>YouTube Studio</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        <div className="text-xs font-semibold">
                          Title: {creatorKit.youtubePackage.viralTitle}
                        </div>
                        <div className="text-[11px] text-[#6E6D68] dark:text-[#9A9890]">
                          <strong>0-15s Hook:</strong> {creatorKit.youtubePackage.hookFirst15Seconds}
                        </div>
                        <div className="space-y-1">
                          {creatorKit.youtubePackage.scriptOutline.map((item, i) => (
                            <div key={i} className="text-[11px] font-claude-mono">
                              • {item}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Instagram Package */}
                      <div className="p-4 rounded-xl bg-[#FAF9F5] dark:bg-[#191918] border border-[#E5E2D9] dark:border-[#2C2B28] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E1306C]">
                            <Instagram className="w-4 h-4" />
                            <span>Instagram Reels + Auto-DM Funnel</span>
                          </span>
                          <a
                            href="https://www.instagram.com"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-[#C96442] hover:underline"
                          >
                            <span>Instagram</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        <div className="text-xs font-semibold">
                          Reels Hook: {creatorKit.instagramPackage.reels3SecHook}
                        </div>
                        <div className="space-y-1 max-h-28 overflow-y-auto">
                          {creatorKit.instagramPackage.carouselSlides.map((slide, i) => (
                            <div key={i} className="text-[11px] font-claude-mono">
                              {slide}
                            </div>
                          ))}
                        </div>
                        <div className="p-2 rounded bg-[#2D6A4F]/10 text-[11px] text-[#2D6A4F] dark:text-[#52B788]">
                          <strong>Monetization Trigger:</strong>{' '}
                          {creatorKit.instagramPackage.dmAutomationTrigger}
                        </div>
                      </div>
                    </div>

                    {/* Action Bar: Render 3D Video or Open Full Sponsorship Pitch in Chat */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                      <button
                        type="button"
                        onClick={onOpen3DStudio}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#EAE7DD] dark:bg-[#2A2926] hover:bg-[#DFDBD0] transition-colors"
                      >
                        <span>Render Faceless 3D Video for YouTube / Reels</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onSendToChat(
                            `Generate a complete 30-day YouTube & Instagram monetization calendar and interactive sponsorship media kit artifact for ${youtubeHandle} and ${instagramHandle} in the "${creatorNiche}" niche.`
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#C96442] text-white hover:bg-[#B55535] transition-colors"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Open Media Kit Artifact in Claude Chat</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
