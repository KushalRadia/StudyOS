import { useState } from "react";
import { callGemini, parseGeminiJson } from "../../services/geminiService";
import { saveToolUsage, addHistoryEntry } from "../../hooks/useFirestore";
import LoadingSpinner from "../../components/LoadingSpinner";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../../hooks/useLanguage";
import VoiceInput from "../../components/VoiceInput";
import ShareCard from "../../components/ShareCard";

interface ExplainerResult {
  mustKnow: string[];
  goodToKnow: string[];
  skip: string[];
  oneSentenceSummary: string;
}

export default function FiveMinuteExplainer() {
  const [topic, setTopic] = useState("");
  const [minutes, setMinutes] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExplainerResult | null>(null);
  const [saved, setSaved] = useState(false);
  const { languageInstruction } = useLanguage();

  const handleExplain = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setResult(null);
    setSaved(false);

    const prompt = `You are a smart exam tutor. A student has exactly ${minutes} minutes before their exam.
Topic: "${topic}"

Return a JSON object with exactly this structure:
{
  "mustKnow": ["point 1", "point 2", "point 3"],
  "goodToKnow": ["point 1", "point 2"],
  "skip": ["point 1", "point 2"],
  "oneSentenceSummary": "..."
}

mustKnow: 3-4 absolute essentials that will definitely be tested.
goodToKnow: 2-3 supporting points if time allows.
skip: 2 things that are interesting but not worth studying now.
oneSentenceSummary: one sentence the student can memorise as an anchor.
Keep every point under 15 words. Be ruthless about what matters.
Return ONLY the JSON. No markdown, no backticks.`;

    try {
      const text = await callGemini(prompt, { languageInstruction });
      const parsed = parseGeminiJson(text);
      setResult(parsed);
      await saveToolUsage("explainer");
    } catch (error) {
      console.error(error);
      alert("Failed to generate explanation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      await addHistoryEntry("explainerHistory", {
        topic,
        minutes,
        result: JSON.stringify(result),
      });
      setSaved(true);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex-1">
      {/* Hero Header */}
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-container/10 text-primary font-label-sm mb-4">
          <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
          AI-POWERED INSIGHTS
        </div>
        <h2 className="font-headline-xl text-headline-xl text-on-surface mb-4">5-Minute Explainer</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Master any complex topic in minutes. Our AI distills information into what matters, what's useful, and what you can safely ignore.</p>
      </div>

      {/* Input Section (Bento Inspired) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mb-12">
        {/* Topic Input */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant">
          <label className="block font-label-md text-label-md text-on-surface-variant mb-3 uppercase tracking-wider">Concept or Topic</label>
          <div className="relative">
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full h-40 bg-surface-container-low border border-outline-variant rounded-xl p-4 pr-12 font-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none resize-none"
              placeholder="Paste your study notes, a complex term, or a Wikipedia snippet here..."
            ></textarea>
            <div className="absolute top-2 right-2">
              <VoiceInput onTranscript={(text) => setTopic(prev => prev ? prev + " " + text : text)} />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">history_edu</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Include key technical terms</span>
            </div>
            <button disabled title="Coming soon" className="flex items-center gap-2 text-primary font-label-md hover:underline opacity-50 cursor-not-allowed">
              <span className="material-symbols-outlined">upload_file</span>
              Upload PDF
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant flex flex-col justify-between">
          <div>
            <label className="block font-label-md text-label-md text-on-surface-variant mb-6 uppercase tracking-wider">Time Selector</label>
            <div className="grid grid-cols-1 gap-3">
              {[
                { time: 2, icon: "timer_3", label: "The 'Gist'" },
                { time: 5, icon: "timer_10", label: "Deep Dive" },
                { time: 10, icon: "hourglass_empty", label: "Mastery" },
              ].map((t) => (
                <button
                  key={t.time}
                  onClick={() => setMinutes(t.time)}
                  className={cn(
                    "w-full py-4 rounded-xl border-2 transition-all group flex items-center justify-between px-6",
                    minutes === t.time
                      ? "border-primary bg-primary-container/10"
                      : "border-outline-variant hover:border-primary hover:bg-primary-container/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("material-symbols-outlined", minutes === t.time ? "text-primary" : "text-on-surface-variant group-hover:text-primary")}>{t.icon}</span>
                    <span className={cn("font-headline-sm text-headline-sm", minutes === t.time && "text-primary")}>{t.time} Min</span>
                  </div>
                  <span className={cn("text-body-sm", minutes === t.time ? "text-primary" : "text-on-surface-variant")}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleExplain}
            disabled={loading || !topic.trim()}
            className="mt-8 w-full bg-primary text-on-primary font-label-md py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin">autorenew</span>
            ) : (
              <span className="material-symbols-outlined">psychology</span>
            )}
            {loading ? "Distilling..." : "Explain It"}
          </button>
        </div>
      </div>

      {loading && (
        <div className="py-12">
          <LoadingSpinner message="Ruthlessly filtering noise from signal..." />
        </div>
      )}

      {/* Results Section */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 max-w-6xl mx-auto"
          >
            {/* One-Sentence Summary */}
            <div className="glass-card p-8 rounded-3xl border-2 border-primary/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-[80px]">format_quote</span>
              </div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-on-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_fix_high</span>
                </div>
                <div>
                  <p className="font-label-sm text-label-sm text-primary uppercase font-bold tracking-widest mb-1">Executive Summary</p>
                  <h3 className="font-headline-md text-headline-md italic leading-tight text-on-surface">"{result.oneSentenceSummary}"</h3>
                </div>
              </div>
            </div>

            {/* The Breakdown (3 Color-Coded Sections) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Must Know - Red */}
              <div className="bg-surface-container-lowest rounded-2xl border-t-8 border-error shadow-sm flex flex-col overflow-hidden">
                <div className="p-6 pb-2">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-error font-black font-headline-sm">MUST KNOW</span>
                    <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                  </div>
                  <ul className="space-y-4">
                    {result.mustKnow.map((item, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="text-error font-bold">•</span>
                        <p className="font-body-md text-body-md">{item}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-auto p-4 bg-error-container/20">
                  <p className="text-on-error-container font-label-sm">Essential for any exam or technical discussion.</p>
                </div>
              </div>

              {/* Good to Know - Yellow */}
              <div className="bg-surface-container-lowest rounded-2xl border-t-8 border-tertiary shadow-sm flex flex-col overflow-hidden">
                <div className="p-6 pb-2">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-tertiary font-black font-headline-sm">GOOD TO KNOW</span>
                    <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                  </div>
                  <ul className="space-y-4">
                    {result.goodToKnow.map((item, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="text-tertiary font-bold">•</span>
                        <p className="font-body-md text-body-md">{item}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-auto p-4 bg-tertiary-container/10">
                  <p className="text-on-tertiary-fixed-variant font-label-sm">Adds depth and historical context to your knowledge.</p>
                </div>
              </div>

              {/* Skip - Green */}
              <div className="bg-surface-container-lowest rounded-2xl border-t-8 border-secondary shadow-sm flex flex-col overflow-hidden">
                <div className="p-6 pb-2">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-secondary font-black font-headline-sm">SKIP</span>
                    <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>visibility_off</span>
                  </div>
                  <ul className="space-y-4">
                    {result.skip.map((item, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="text-secondary font-bold">•</span>
                        <p className="font-body-md text-body-md">{item}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-auto p-4 bg-secondary-container/10">
                  <p className="text-on-secondary-fixed-variant font-label-sm">Avoid these to save time during initial study phases.</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12 pb-12">
              <button
                onClick={handleSave}
                disabled={saved}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-primary-container text-on-primary-container rounded-full font-label-md hover:scale-[1.05] transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined">{saved ? "check_circle" : "save"}</span>
                {saved ? "Saved" : "Save to history"}
              </button>
              <ShareCard 
                title="5-Minute Explainer"
                topic={topic}
                content={[result.oneSentenceSummary, ...result.mustKnow]}
                toolLabel="Must Know"
              />
              <button onClick={() => {
                const textToShare = result?.oneSentenceSummary || "Check out this explanation!";
                if (navigator.share) {
                  navigator.share({ title: 'StudyOS Explanation', text: textToShare }).catch(console.error);
                } else {
                  navigator.clipboard.writeText(textToShare);
                  alert("Copied to clipboard!");
                }
              }} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 border border-outline text-on-surface-variant rounded-full font-label-md hover:bg-surface-container transition-all">
                <span className="material-symbols-outlined">share</span>
                Share explanation
              </button>
              <button onClick={() => window.print()} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 border border-outline text-on-surface-variant rounded-full font-label-md hover:bg-surface-container transition-all">
                <span className="material-symbols-outlined">print</span>
                Print PDF
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
