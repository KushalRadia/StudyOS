import { useState } from "react";
import { callGemini, parseGeminiJson } from "../../services/geminiService";
import { saveToolUsage, addHistoryEntry } from "../../hooks/useFirestore";
import LoadingSpinner from "../../components/LoadingSpinner";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../../hooks/useLanguage";
import VoiceInput from "../../components/VoiceInput";
import ShareCard from "../../components/ShareCard";

interface DiagnosisResult {
  mistakeType:
    | "Conceptual"
    | "Formula"
    | "Calculation"
    | "Reading Error"
    | "Partial Understanding";
  whatWentWrong: string;
  gapIdentified: string;
  howToFix: string;
  practiceQuestion: string;
  severity: "minor" | "moderate" | "fundamental";
}

export default function WhyAmIWrong() {
  const [data, setData] = useState({
    question: "",
    userAnswer: "",
    correctAnswer: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { languageInstruction } = useLanguage();

  const handleDiagnose = async () => {
    if (!data.question || !data.userAnswer || !data.correctAnswer) return;
    setLoading(true);
    setSaved(false);
    setError(null);

    const prompt = `You are a diagnostic tutor. A student got a question wrong. Find the exact cause.

Question: "${data.question}"
Student's answer: "${data.userAnswer}"
Correct answer: "${data.correctAnswer}"

Diagnose the mistake precisely. Return ONLY this JSON:
{
  "mistakeType": "Conceptual | Formula | Calculation | Reading Error | Partial Understanding",
  "whatWentWrong": "specific explanation of the error in 2 sentences",
  "gapIdentified": "the exact underlying concept or fact the student is missing",
  "howToFix": "specific thing to memorise, re-read, or practice",
  "practiceQuestion": "a similar question for the student to try now",
  "severity": "minor | moderate | fundamental"
}

Be precise and honest. Don't soften the diagnosis. The student needs to know exactly what's wrong.
Return ONLY valid JSON.`;

    try {
      const text = await callGemini(prompt, { languageInstruction });
      const parsed = parseGeminiJson(text);
      setResult(parsed);
      await saveToolUsage("whyamiwrong");
    } catch (error: any) {
      console.error(error);
      setError(
        "Failed to diagnose the error. Please check your inputs and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      await addHistoryEntry("errorLog", {
        ...data,
        diagnosis: JSON.stringify(result),
      });
      setSaved(true);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full pb-20">
      <header className="mb-12">
        <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">Diagnose My Mistake</h1>
        <p className="text-on-surface-variant text-body-lg max-w-2xl">Stop guessing why you're wrong. Paste your question and answers below to get a deep-dive analysis of your conceptual gaps.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Section */}
        <div className={cn("col-span-12 flex flex-col gap-6 transition-all duration-500", result ? "lg:col-span-5" : "lg:col-span-8 lg:col-start-3")}>
          <div className="bg-surface-container-lowest p-md rounded-xl shadow-sm border border-outline-variant focus-within:border-primary/50 transition-colors relative">
            <label className="block font-label-md text-label-md text-primary mb-3">Original Question</label>
            <textarea
              value={data.question}
              onChange={(e) => setData({ ...data, question: e.target.value })}
              className="w-full h-32 bg-background border border-outline rounded-lg p-md pr-12 focus:ring-2 focus:ring-primary focus:border-primary transition-all text-body-sm resize-none"
              placeholder="e.g. Solve for x: 2(x + 5) = 14..."
              spellCheck="false"
            />
            <div className="absolute top-12 right-6">
              <VoiceInput onTranscript={(text) => setData(prev => ({ ...prev, question: prev.question ? prev.question + " " + text : text }))} />
            </div>
          </div>

          <div className="bg-surface-container-lowest p-md rounded-xl shadow-sm border border-outline-variant focus-within:border-error/50 transition-colors relative">
            <label className="block font-label-md text-label-md text-error mb-3">Your Answer</label>
            <textarea
              value={data.userAnswer}
              onChange={(e) => setData({ ...data, userAnswer: e.target.value })}
              className="w-full h-32 bg-background border border-outline rounded-lg p-md pr-12 focus:ring-2 focus:ring-error focus:border-error transition-all text-body-sm resize-none"
              placeholder="Paste what you submitted..."
              spellCheck="false"
            />
            <div className="absolute top-12 right-6">
              <VoiceInput onTranscript={(text) => setData(prev => ({ ...prev, userAnswer: prev.userAnswer ? prev.userAnswer + " " + text : text }))} />
            </div>
          </div>

          <div className="bg-surface-container-lowest p-md rounded-xl shadow-sm border border-outline-variant focus-within:border-secondary/50 transition-colors relative">
            <label className="block font-label-md text-label-md text-secondary mb-3">Correct Answer</label>
            <textarea
              value={data.correctAnswer}
              onChange={(e) => setData({ ...data, correctAnswer: e.target.value })}
              className="w-full h-32 bg-background border border-outline rounded-lg p-md pr-12 focus:ring-2 focus:ring-secondary focus:border-secondary transition-all text-body-sm resize-none"
              placeholder="What was the intended result?"
              spellCheck="false"
            />
            <div className="absolute top-12 right-6">
              <VoiceInput onTranscript={(text) => setData(prev => ({ ...prev, correctAnswer: prev.correctAnswer ? prev.correctAnswer + " " + text : text }))} />
            </div>
          </div>

          <button
            onClick={handleDiagnose}
            disabled={loading || !data.question || !data.userAnswer || !data.correctAnswer}
            className="w-full py-4 bg-primary text-on-primary rounded-xl font-headline-sm text-headline-sm shadow-xl shadow-primary/30 flex items-center justify-center gap-3 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:hover:brightness-100 disabled:active:scale-100"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin">sync</span>
            ) : (
              <span className="material-symbols-outlined">psychology</span>
            )}
            {loading ? "Analyzing Mistake..." : "Diagnose My Mistake"}
          </button>
          
          {error && (
            <p className="font-label-sm text-error text-center mt-2">{error}</p>
          )}
        </div>

        {/* Results Section */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="col-span-12 lg:col-span-7 flex flex-col gap-6"
            >
              {/* Diagnosis Result Card */}
              <div className="bg-surface-container-lowest rounded-xl shadow-md border border-outline-variant overflow-hidden h-fit">
                <div className="bg-surface-container-high p-md flex justify-between items-center border-b border-outline-variant">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
                    <h3 className="font-headline-sm text-headline-sm">Analysis Report</h3>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 uppercase tracking-wider",
                    result.severity === "fundamental" ? "bg-error text-on-error" : result.severity === "moderate" ? "bg-tertiary-container text-on-tertiary-container" : "bg-secondary-container text-on-secondary-container"
                  )}>
                    <span className="material-symbols-outlined text-[16px]">warning</span>
                    {result.mistakeType} Gap
                  </span>
                </div>

                <div className="p-lg space-y-8">
                  {/* What Went Wrong */}
                  <section>
                    <h4 className="font-label-md text-label-md text-on-surface-variant mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-error text-[20px]">cancel</span>
                      WHAT WENT WRONG
                    </h4>
                    <p className="text-body-md text-on-surface leading-relaxed">
                      {result.whatWentWrong}
                    </p>
                  </section>

                  {/* Fixing Advice */}
                  <section className="bg-primary-container/10 p-md rounded-lg border-l-4 border-primary">
                    <h4 className="font-label-md text-label-md text-primary mb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px]">lightbulb</span>
                      FIXING ADVICE
                    </h4>
                    <p className="text-body-sm text-on-surface-variant">
                      <span className="font-bold text-on-surface block mb-1">Concept to review: {result.gapIdentified}</span>
                      {result.howToFix}
                    </p>
                  </section>

                  {/* Practice Question */}
                  <section className="border border-outline-variant rounded-xl p-md bg-surface">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-label-md text-label-md text-secondary uppercase tracking-widest flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">model_training</span>
                        Reinforcement Practice
                      </h4>
                    </div>
                    <div className="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant mb-4">
                      <p className="text-body-md font-medium text-on-surface">{result.practiceQuestion}</p>
                    </div>
                  </section>

                  {/* Footer Actions */}
                  <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-outline-variant">
                    <button
                      onClick={handleSave}
                      disabled={saved}
                      className={cn(
                        "w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-label-md text-label-md transition-all ml-auto",
                        saved ? "bg-secondary/10 text-secondary border border-secondary/20 cursor-default" : "bg-on-background text-white hover:bg-primary shadow-md"
                      )}
                    >
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0" }}>
                        {saved ? "check_circle" : "bookmark"}
                      </span>
                      {saved ? "Saved to Error Log" : "Save to Error Log"}
                    </button>
                    <ShareCard 
                      title="Mistake Diagnosis"
                      topic={result.mistakeType}
                      content={[result.whatWentWrong, result.howToFix]}
                      accentColor="#ef4444"
                      toolLabel="Diagnosis"
                    />
                  </div>
                </div>
              </div>

              {/* Mini Bento: Quick Stats & Image */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-container-highest p-md rounded-xl flex items-center gap-4 border border-outline-variant">
                  <div className="w-10 h-10 bg-secondary-container rounded-full flex items-center justify-center text-on-secondary-container shrink-0">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant uppercase font-bold">Severity</p>
                    <p className="font-headline-sm text-headline-sm text-on-surface capitalize">{result.severity}</p>
                  </div>
                </div>
                
                <div className="bg-surface-container-highest p-md rounded-xl flex items-center gap-4 border border-outline-variant">
                  <div className="w-10 h-10 bg-tertiary-container rounded-full flex items-center justify-center text-on-tertiary-container shrink-0">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>list_alt</span>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant uppercase font-bold">Category</p>
                    <p className="font-headline-sm text-sm font-bold text-on-surface truncate">{result.mistakeType}</p>
                  </div>
                </div>

                {/* Image Section */}
                <div className="col-span-2 h-48 w-full rounded-xl overflow-hidden relative group hidden md:block">
                  <img alt="Study environment" className="w-full h-full object-cover grayscale-[20%] group-hover:scale-105 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5pK8rMtDxO9ea6tAvoJjJOhFw0gmd7nPKwFnmGLe8WKJPjbqGsKWRclOOjHpeO506INv0uwggPySp8Igq1ZlRp4TK-MjAkji-O9ZEre9tHmRzaNIQQnn234TJI7OfZvH6zhNw3D-g8b_Z2Zu5AtFE6P6YAuEaO2Z__v4fTuB31TKdPegRbK8EuBZnB-KHd7sKbRvz3m7eDAkzgXvKCNkgB5L6vBUYYJitT_0nyN32oBEu5F7vfbqlqFnABYoXWh2ECNO_TGZ2-P0" />
                  <div className="absolute inset-0 bg-gradient-to-t from-on-background/80 via-on-background/40 to-transparent flex flex-col justify-end p-md">
                    <span className="text-white font-headline-sm text-headline-sm">Master Your Mistakes</span>
                    <p className="text-surface-container-high text-body-sm">Every error is a blueprint for your next breakthrough.</p>
                  </div>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
