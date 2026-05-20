import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  FileText,
  RefreshCcw,
  CheckCircle,
  Save,
  FlaskConical,
  AlertTriangle,
} from "lucide-react";
import {
  callGemini,
  callGeminiWithFile,
  parseGeminiJson,
} from "../../services/geminiService";
import {
  saveToolUsage,
  addHistoryEntry,
  createFlashcardSet,
} from "../../hooks/useFirestore";
import { useLanguage } from "../../hooks/useLanguage";
import ShareCard from "../../components/ShareCard";
import VoiceInput from "../../components/VoiceInput";

interface Mistake {
  questionNumber: string;
  questionText: string;
  studentAnswer: string;
  correctAnswer: string;
  mistakeType:
    | "Conceptual"
    | "Formula"
    | "Calculation"
    | "Reading Error"
    | "Partial Understanding";
  whatWentWrong: string;
  rootGap: string;
  fix: string;
  severity: "minor" | "moderate" | "fundamental";
}

interface AutopsyResult {
  subject: string;
  totalQuestions: number;
  mistakes: Mistake[];
  dominantMistakeType: string;
  severityScore: number;
  overallSummary: string;
}

const LOADING_MESSAGES = [
  "Scanning your answers...",
  "Identifying root causes...",
  "Cross-referencing your error history...",
  "Building your recovery plan...",
];

const MISTAKE_COLORS: Record<string, string> = {
  Conceptual: "bg-primary",
  Formula: "bg-secondary",
  Calculation: "bg-tertiary",
  "Reading Error": "bg-error",
  "Partial Understanding": "bg-outline",
};

const SEVERITY_BADGE: Record<string, string> = {
  minor: "bg-secondary/10 text-secondary",
  moderate: "bg-tertiary/10 text-tertiary",
  fundamental: "bg-error/10 text-error",
};

export default function ExamAutopsy() {
  const [tab, setTab] = useState<"image" | "text">("image");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [typedAnswers, setTypedAnswers] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [result, setResult] = useState<AutopsyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedCards, setSavedCards] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { languageInstruction } = useLanguage();

  // Cycle loading messages every 1.5s
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => {
      setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 1500);
    return () => clearInterval(id);
  }, [loading]);

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) loadImage(file);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImage(file);
  };

  const loadImage = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    setError(null);
  };

  const canRun =
    tab === "image" ? !!imageFile : typedAnswers.trim().length > 0;

  const runAutopsy = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    setLoadingMsgIdx(0);
    setSaved(false);
    setSavedCards(new Set());

    try {
      let text: string;

      if (tab === "image" && imageFile && imagePreview) {
        const base64 = imagePreview.split(",")[1];
        const mimeType = imageFile.type as "image/jpeg" | "image/png";
        const prompt = `You are an expert academic diagnostician performing a full exam post-mortem.

Analyse this answer sheet image. For each question you can identify:
1. What the student wrote
2. What the correct answer appears to be (from marking or context)

${subject ? `Subject: ${subject}` : ""}

Return ONLY this JSON (no extra text):
{
  "subject": "inferred subject if not provided",
  "totalQuestions": number,
  "mistakes": [
    {
      "questionNumber": "Q1",
      "questionText": "brief question summary (max 15 words)",
      "studentAnswer": "what student wrote",
      "correctAnswer": "what was correct",
      "mistakeType": "Conceptual | Formula | Calculation | Reading Error | Partial Understanding",
      "whatWentWrong": "precise 1-sentence diagnosis",
      "rootGap": "the exact concept or fact the student is missing",
      "fix": "specific actionable fix in 1-2 sentences",
      "severity": "minor | moderate | fundamental"
    }
  ],
  "dominantMistakeType": "most common mistake type",
  "severityScore": 0,
  "overallSummary": "2-sentence honest assessment of the student's performance"
}`;
        text = await callGeminiWithFile(prompt, base64, mimeType, {
          languageInstruction,
        });
      } else {
        const prompt = `You are an expert academic diagnostician performing a full exam post-mortem.

The student has provided their answers in this format (one per line):
${typedAnswers}

${subject ? `Subject: ${subject}` : ""}

Parse each line. Identify all mistakes. Return ONLY this JSON:
{
  "subject": "inferred subject if not provided",
  "totalQuestions": number,
  "mistakes": [
    {
      "questionNumber": "Q1",
      "questionText": "brief question summary (max 15 words)",
      "studentAnswer": "what student wrote",
      "correctAnswer": "what was correct",
      "mistakeType": "Conceptual | Formula | Calculation | Reading Error | Partial Understanding",
      "whatWentWrong": "precise 1-sentence diagnosis",
      "rootGap": "the exact concept or fact the student is missing",
      "fix": "specific actionable fix in 1-2 sentences",
      "severity": "minor | moderate | fundamental"
    }
  ],
  "dominantMistakeType": "most common mistake type",
  "severityScore": 0,
  "overallSummary": "2-sentence honest assessment of the student's performance"
}`;
        text = await callGemini(prompt, { languageInstruction });
      }

      const parsed = parseGeminiJson(text) as AutopsyResult;
      setResult(parsed);
    } catch (err: any) {
      setError(
        "Failed to analyse the exam. Please check your input and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const addMistakeToFlashcards = async (mistake: Mistake, idx: number) => {
    try {
      await createFlashcardSet(subject || result?.subject || "Exam Review", [
        {
          front: mistake.questionText,
          back: `${mistake.correctAnswer}\n\nFix: ${mistake.fix}`,
        },
      ]);
      setSavedCards((prev) => new Set(prev).add(idx));
    } catch {
      // silent
    }
  };

  const saveAutopsy = async () => {
    if (!result) return;
    await addHistoryEntry("examAutopsies", {
      subject: subject || result.subject,
      totalQuestions: result.totalQuestions,
      mistakesCount: result.mistakes.length,
      dominantMistakeType: result.dominantMistakeType,
      severityScore: result.severityScore,
      overallSummary: result.overallSummary,
    });
    await saveToolUsage("examautopsy");
    setSaved(true);
  };

  // Compute mistake type breakdown percentages
  const mistakeBreakdown = result
    ? Object.entries(
        result.mistakes.reduce((acc: Record<string, number>, m) => {
          acc[m.mistakeType] = (acc[m.mistakeType] || 0) + 1;
          return acc;
        }, {})
      ).map(([type, count]) => ({
        type,
        pct: Math.round((count / result.mistakes.length) * 100),
      }))
    : [];

  const severityColor =
    result && result.severityScore < 40
      ? "text-secondary"
      : result && result.severityScore <= 70
      ? "text-tertiary"
      : "text-error";

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <header className="flex items-start gap-4">
        <div className="w-14 h-14 bg-error/10 rounded-2xl flex items-center justify-center shrink-0">
          <FlaskConical className="w-7 h-7 text-error" />
        </div>
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-background font-bold tracking-tight">
            Exam Autopsy
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Turn your worst result into your sharpest study session.
          </p>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 bg-error/10 border border-error/20 text-error rounded-xl px-4 py-3 font-body-sm text-body-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Input section — hidden once results arrive */}
      {!result && !loading && (
        <div className="card space-y-6">
          {/* Tab switcher */}
          <div className="flex p-1 bg-surface-container rounded-xl">
            <button
              onClick={() => setTab("image")}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                tab === "image"
                  ? "bg-surface-container-lowest text-primary shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <Upload className="w-4 h-4" />
              📷 Upload Answer Sheet
            </button>
            <button
              onClick={() => setTab("text")}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                tab === "text"
                  ? "bg-surface-container-lowest text-primary shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <FileText className="w-4 h-4" />
              ✏️ Type Answers
            </button>
          </div>

          {/* Image upload */}
          {tab === "image" && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleImageDrop}
              onClick={() => !imagePreview && fileInputRef.current?.click()}
              className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
                imagePreview
                  ? "border-primary/30"
                  : "border-outline-variant hover:border-primary/40 hover:bg-surface-container-high/30"
              }`}
              style={{ minHeight: "240px" }}
            >
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Answer sheet preview"
                    className="w-full h-auto max-h-80 object-contain bg-black/5 rounded-xl"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-3 right-3 bg-surface-container-lowest/90 text-on-surface px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow hover:bg-surface-container transition-colors"
                  >
                    <RefreshCcw className="w-3 h-3" /> Change
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center">
                    <Upload className="w-8 h-8 text-on-surface-variant opacity-40" />
                  </div>
                  <div>
                    <p className="font-label-md text-label-md font-bold text-on-surface">
                      Drag & drop or click to upload
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                      JPG, PNG up to 10MB
                    </p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Text input */}
          {tab === "text" && (
            <div className="space-y-2">
              <label className="font-label-sm text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
                Your Answers
              </label>
              <div className="relative">
                <textarea
                  value={typedAnswers}
                  onChange={(e) => setTypedAnswers(e.target.value)}
                  rows={8}
                  placeholder={`Paste your answers one per line:\nQ1: [your answer] | Correct: [correct answer]\nQ2: [your answer] | Correct: [correct answer]\nQ3: [your answer] | Correct: [correct answer]`}
                  className="w-full p-4 bg-surface-container border border-outline-variant rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-body-sm text-body-sm resize-none"
                />
                <div className="absolute bottom-3 right-3">
                  <VoiceInput
                    onTranscript={(t) =>
                      setTypedAnswers((prev) => (prev ? prev + "\n" + t : t))
                    }
                    placeholder="Speaking..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Subject field */}
          <div className="space-y-2">
            <label className="font-label-sm text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
              Exam Subject{" "}
              <span className="font-normal normal-case">(optional)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Physics Chapter 4"
                className="flex-1 p-3 bg-surface-container border border-outline-variant rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-body-sm text-body-sm"
              />
              <VoiceInput
                onTranscript={(t) => setSubject(t)}
                placeholder="Listening..."
              />
            </div>
          </div>

          {/* Run button */}
          <button
            onClick={runAutopsy}
            disabled={!canRun}
            className="w-full btn-primary py-4 text-base disabled:opacity-40 disabled:cursor-not-allowed justify-center"
          >
            <FlaskConical className="w-5 h-5" />
            Run Autopsy
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="card space-y-6">
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center animate-pulse">
              <FlaskConical className="w-8 h-8 text-error" />
            </div>
            <p className="font-headline-sm text-headline-sm text-on-surface font-bold animate-pulse transition-all duration-500">
              {LOADING_MESSAGES[loadingMsgIdx]}
            </p>
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 bg-surface-container animate-pulse rounded-xl"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-8">
          {/* Redo button */}
          <div className="flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md font-bold text-on-background">
              Autopsy Results
            </h2>
            <button
              onClick={() => {
                setResult(null);
                setSaved(false);
                setSavedCards(new Set());
              }}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" /> Run Again
            </button>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT — Summary */}
            <div className="lg:col-span-4 space-y-6">
              {/* 2×2 Bento stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="card text-center space-y-1 p-4">
                  <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Total Qs
                  </p>
                  <p className="font-headline-md text-headline-md font-black text-on-surface">
                    {result.totalQuestions}
                  </p>
                </div>
                <div className="card text-center space-y-1 p-4">
                  <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Mistakes
                  </p>
                  <p className="font-headline-md text-headline-md font-black text-error">
                    {result.mistakes.length}
                  </p>
                </div>
                <div className="card text-center space-y-1 p-4 col-span-2 sm:col-span-1">
                  <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Dominant Type
                  </p>
                  <p className="font-label-md text-label-md font-black text-primary">
                    {result.dominantMistakeType}
                  </p>
                </div>
                <div className="card text-center space-y-1 p-4 col-span-2 sm:col-span-1">
                  <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Severity
                  </p>
                  <p
                    className={`font-headline-md text-headline-md font-black ${severityColor}`}
                  >
                    {result.severityScore}
                  </p>
                </div>
              </div>

              {/* Bar chart — mistake type breakdown */}
              {result.mistakes.length > 0 && (
                <div className="card space-y-4 p-4">
                  <p className="font-label-sm text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
                    Error Breakdown
                  </p>
                  <div className="space-y-3">
                    {mistakeBreakdown.map(({ type, pct }) => (
                      <div key={type} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-label-sm text-label-sm text-on-surface-variant">
                            {type}
                          </span>
                          <span className="font-label-sm text-label-sm font-bold text-on-surface">
                            {pct}%
                          </span>
                        </div>
                        <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              MISTAKE_COLORS[type] || "bg-outline"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overall summary */}
              <div className="card p-4 border-l-4 border-primary bg-primary/5 space-y-2">
                <p className="font-label-sm text-label-sm font-bold text-primary uppercase tracking-wider">
                  Overall Assessment
                </p>
                <p className="font-body-sm text-body-sm text-on-surface leading-relaxed">
                  {result.overallSummary}
                </p>
              </div>
            </div>

            {/* RIGHT — Per-mistake list */}
            <div className="lg:col-span-8 space-y-4">
              <p className="font-label-sm text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
                Mistake Breakdown
              </p>
              {result.mistakes.length === 0 ? (
                <div className="card py-12 text-center">
                  <CheckCircle className="w-12 h-12 text-secondary mx-auto mb-3 opacity-60" />
                  <p className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    No mistakes found!
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    Excellent performance on this exam.
                  </p>
                </div>
              ) : (
                result.mistakes.map((mistake, idx) => (
                  <div key={idx} className="card space-y-3">
                    {/* Question header */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="badge badge-primary font-bold">
                          {mistake.questionNumber}
                        </span>
                        <span
                          className={`badge font-bold ${
                            SEVERITY_BADGE[mistake.severity]
                          }`}
                        >
                          {mistake.severity}
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                          {mistake.mistakeType}
                        </span>
                      </div>
                    </div>

                    {/* Question text */}
                    <p className="font-body-sm text-body-sm text-on-surface font-medium line-clamp-2">
                      {mistake.questionText}
                    </p>

                    {/* What went wrong pill */}
                    <div className="flex items-start gap-2 bg-error/5 border border-error/10 rounded-xl px-3 py-2">
                      <AlertTriangle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                      <p className="font-body-sm text-body-sm text-error">
                        {mistake.whatWentWrong}
                      </p>
                    </div>

                    {/* Root gap */}
                    <div>
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                        Root Gap:{" "}
                      </span>
                      <span className="font-label-md text-label-md font-bold text-on-surface">
                        {mistake.rootGap}
                      </span>
                    </div>

                    {/* Fix callout */}
                    <div className="border-l-4 border-primary bg-primary/5 rounded-r-xl px-4 py-3">
                      <p className="font-label-sm text-label-sm font-bold text-primary uppercase tracking-wider mb-1">
                        How to fix it
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface">
                        {mistake.fix}
                      </p>
                    </div>

                    {/* Add to flashcards */}
                    <div className="flex justify-end pt-1">
                      {savedCards.has(idx) ? (
                        <span className="flex items-center gap-1.5 text-secondary font-label-sm text-label-sm font-bold">
                          <CheckCircle className="w-4 h-4" /> Added to
                          Flashcards
                        </span>
                      ) : (
                        <button
                          onClick={() => addMistakeToFlashcards(mistake, idx)}
                          className="btn-secondary text-xs py-2 px-3"
                        >
                          + Add Fix to Flashcards
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bottom action bar */}
          <div className="sticky bottom-4 z-10 bg-surface-container-lowest/90 backdrop-blur-md border border-outline-variant rounded-2xl p-4 flex flex-col sm:flex-row gap-3 shadow-xl">
            <button
              onClick={saveAutopsy}
              disabled={saved}
              className="flex-1 btn-primary justify-center disabled:opacity-60"
            >
              {saved ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Autopsy Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Autopsy
                </>
              )}
            </button>
            <div className="flex-1">
              <ShareCard
                title="Exam Autopsy"
                topic={subject || result.subject}
                content={[
                  `Dominant: ${result.dominantMistakeType}`,
                  `Severity: ${result.severityScore}/100`,
                  result.overallSummary,
                ]}
                accentColor="#ef4444"
                toolLabel="Autopsy"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
