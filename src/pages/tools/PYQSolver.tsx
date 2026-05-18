import { useState, useRef, ChangeEvent } from "react";
import {
  callGeminiWithFile,
  parseGeminiJson,
  fileToBase64,
} from "../../services/geminiService";
import { saveToolUsage, addHistoryEntry } from "../../hooks/useFirestore";
import LoadingSpinner from "../../components/LoadingSpinner";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface QuestionResult {
  number: string;
  question: string;
  marks: number | null;
  topic: string;
  modelAnswer: string;
  keyTerms: string[];
  likelyToRepeat: boolean;
  repeatReason: string | null;
}

interface AnalysisResult {
  subject: string;
  examYear: string | null;
  totalQuestions: number;
  questions: QuestionResult[];
}

export default function PYQSolver() {
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("All");
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setSaved(false);
    }
  };

  const analyzePaper = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setSaved(false);

    try {
      const base64 = await fileToBase64(file);
      const prompt = `You are an expert exam analyst. Analyze this question paper PDF.

Extract every question and generate a complete model answer for each.

Return ONLY this JSON:
{
  "subject": "detected subject name",
  "examYear": "detected year if visible, else null",
  "totalQuestions": number,
  "questions": [
    {
      "number": "Q1a",
      "question": "full question text",
      "marks": number or null,
      "topic": "topic category",
      "modelAnswer": "complete model answer with steps/reasoning shown",
      "keyTerms": ["term1", "term2"],
      "likelyToRepeat": true or false,
      "repeatReason": "brief reason if likely to repeat, else null"
    }
  ]
}

For likelyToRepeat: mark true if the question tests a fundamental concept, has appeared in similar form before, or covers high-weightage syllabus areas.
Show all working for numerical problems.
Return ONLY valid JSON. No markdown. No backticks.`;

      const text = await callGeminiWithFile(prompt, base64, "application/pdf");
      const parsed = parseGeminiJson(text);
      setResult(parsed);
      await saveToolUsage("pyqsolver");
    } catch (error) {
      console.error(error);
      alert(
        "Failed to analyze PDF. Please ensure it's a clear question paper.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result || !file) return;
    try {
      await addHistoryEntry("pyqResults", {
        fileName: file.name,
        subject: result.subject,
        questionsCount: result.totalQuestions,
        results: JSON.stringify(result),
      });
      setSaved(true);
    } catch (error) {
      console.error(error);
    }
  };

  const topics = result
    ? ["All", ...new Set(result.questions.map((q) => q.topic))]
    : [];
  const filteredQuestions = result
    ? filter === "All"
      ? result.questions
      : result.questions.filter((q) => q.topic === filter)
    : [];

  return (
    <div className="max-w-6xl mx-auto w-full pb-20">
      {/* Hero/Input Section */}
      {!result && !loading && (
        <section className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
          <div className="md:col-span-7 flex flex-col justify-center">
            <h1 className="font-headline-xl text-headline-xl text-on-surface mb-2">PYQSolver</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-8 max-w-lg">
              Upload your previous year question papers and let StudyOS AI provide detailed model answers, key concepts, and exam probability scores.
            </p>

            <div className="space-y-6 bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant">
              <div className="space-y-2">
                <label className="font-label-md text-label-md text-on-surface-variant">Subject Name (Optional)</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-12 px-4 rounded-lg bg-surface-container-low border border-outline focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                  placeholder="e.g. Advanced Thermodynamics"
                />
              </div>

              <div className="space-y-2">
                <label className="font-label-md text-label-md text-on-surface-variant">Upload PDF Paper</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add("border-primary", "bg-primary/5");
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                    const droppedFile = e.dataTransfer.files[0];
                    if (droppedFile && droppedFile.type === "application/pdf") {
                      setFile(droppedFile);
                      setSaved(false);
                    } else {
                      alert("Please drop a PDF file.");
                    }
                  }}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer group",
                    file ? "border-primary bg-primary/5" : "border-outline-variant bg-surface-container-low hover:bg-surface-container-high"
                  )}
                >
                  <input
                    type="file"
                    accept=".pdf"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <span className="material-symbols-outlined text-4xl text-primary mb-2 group-hover:scale-110 transition-transform">
                    {file ? "check_circle" : "upload_file"}
                  </span>
                  <p className="font-label-md text-label-md text-on-surface font-semibold text-center">
                    {file ? file.name : "Drop your PDF here or browse"}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Maximum size 10MB</p>
                </div>
              </div>

              <button
                onClick={analyzePaper}
                disabled={loading || !file}
                className="w-full bg-primary text-on-primary h-14 rounded-xl font-headline-sm text-headline-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:hover:scale-100"
              >
                <span className="material-symbols-outlined">analytics</span>
                Analyse Paper
              </button>
            </div>
          </div>

          <div className="md:col-span-5 hidden md:block">
            <div className="relative h-full w-full rounded-3xl overflow-hidden shadow-2xl min-h-[400px]">
              <img alt="Focus studying" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA1aSR-J2NeuXqXlV6a9E97KXeV9fC4iBEwFihlIGjNYdS1uSGh71_fUrWxi7chf8SZIVtKoAkl-qRrdyVI876gO7HuXyv9RDzIL4yD8N0AxvPqvo_7OTQ_j0aLbMUO4Av0E-ErF0PK3U4PPsRau7PdrLi8MgGauFng6itarRWdtB3_2-f0sw1fcyhGLyB50WYPd9S66tEYo0f2j_p01xsKjlrDYIklB8-YyOYCWrx7wKFm2EVvbA1yD9uKIAjrXSzIy1ititX8uT4" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6 p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                <p className="text-white font-label-md text-label-md italic">"StudyOS reduced my revision time by 40% using the PYQSolver feature."</p>
                <p className="text-white/80 font-label-sm text-label-sm mt-2">— Sarah K., Engineering Student</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {loading && (
        <div className="py-20 flex flex-col items-center justify-center min-h-[60vh]">
          <LoadingSpinner message="Scanning neural patterns and synthesizing model responses..." />
        </div>
      )}

      {/* Results Section */}
      {result && !loading && (
        <section className="mt-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2">
                {result.subject}
                <button
                  onClick={() => setResult(null)}
                  className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors bg-surface-container-low p-2 rounded-lg"
                  title="Analyze new paper"
                >
                  refresh
                </button>
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {result.totalQuestions} Questions extracted {result.examYear ? `from ${result.examYear}` : "from paper"}
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saved}
              className={cn(
                "flex items-center gap-2 px-6 py-3 font-label-md text-label-md rounded-xl transition-all border",
                saved
                  ? "bg-secondary-container/30 text-secondary border-secondary/20 cursor-default"
                  : "bg-surface-container-highest text-primary hover:bg-primary-fixed border-primary/20 hover:shadow-sm"
              )}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                {saved ? "check_circle" : "save"}
              </span>
              {saved ? "Analysis Saved" : "Save Analysis"}
            </button>
          </div>

          {/* Topic Chips */}
          <div className="flex items-center gap-3 mb-8 overflow-x-auto scrollbar-hide pb-2 custom-scrollbar">
            <span className="font-label-md text-label-md text-on-surface-variant shrink-0">Filter by Topic:</span>
            {topics.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={cn(
                  "px-5 py-2 rounded-full font-label-sm text-label-sm whitespace-nowrap transition-all border",
                  filter === t
                    ? "bg-primary text-on-primary border-primary shadow-sm"
                    : "bg-surface-container-high text-on-surface-variant border-transparent hover:bg-primary-fixed"
                )}
              >
                {t === "All" ? "All Questions" : t}
              </button>
            ))}
          </div>

          {/* Accordion List */}
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {filteredQuestions.map((q, i) => (
                <motion.div
                  key={q.number}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm overflow-hidden group"
                >
                  <button
                    onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                    className="w-full flex items-center justify-between p-6 text-left hover:bg-surface-container-low transition-all focus:outline-none"
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <div className={cn(
                        "mt-1 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-colors",
                        expandedIndex === i ? "bg-primary text-on-primary" : "bg-primary/10 text-primary group-hover:bg-primary/20"
                      )}>
                        {q.number}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-headline-sm text-headline-sm text-on-surface line-clamp-2 md:line-clamp-none pr-4">{q.question}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          {q.likelyToRepeat && (
                            <span className="px-3 py-1 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">priority_high</span>
                              Likely to Repeat
                            </span>
                          )}
                          <span className="text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">category</span>
                            {q.topic}
                          </span>
                          {q.marks && (
                            <span className="text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">grade</span>
                              {q.marks} Marks
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={cn(
                      "material-symbols-outlined text-on-surface-variant transition-transform duration-300 shrink-0",
                      expandedIndex === i ? "rotate-180" : ""
                    )}>
                      expand_more
                    </span>
                  </button>
                  
                  <AnimatePresence>
                    {expandedIndex === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 pt-2 border-t border-outline-variant/30 bg-surface-container-low/30">
                          <div className="space-y-6">
                            <div>
                              <h4 className="font-label-md text-label-md text-primary mb-2 uppercase tracking-wider flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                                Model Answer
                              </h4>
                              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed whitespace-pre-wrap bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/50 shadow-inner">
                                {q.modelAnswer}
                              </p>
                            </div>
                            
                            {q.keyTerms.length > 0 && (
                              <div className="flex flex-wrap gap-2 items-center">
                                <h4 className="font-label-md text-label-md text-on-surface w-full mb-1 flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[18px]">vpn_key</span>
                                  Key Terms
                                </h4>
                                {q.keyTerms.map((term, idx) => (
                                  <span key={idx} className="px-3 py-1 bg-surface-container-high rounded-lg text-on-surface-variant font-label-sm text-label-sm border border-outline-variant">
                                    {term}
                                  </span>
                                ))}
                              </div>
                            )}

                            {q.likelyToRepeat && q.repeatReason && (
                              <div className="p-4 bg-error-container/10 border border-error/20 rounded-xl">
                                <h4 className="font-label-md text-label-md text-error mb-1 flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[18px]">insights</span>
                                  Recurrence Logic
                                </h4>
                                <p className="font-body-sm text-body-sm text-on-surface-variant">{q.repeatReason}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--outline-variant);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
