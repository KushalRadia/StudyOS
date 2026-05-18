import { useState } from "react";
import { callGemini, parseGeminiJson } from "../../services/geminiService";
import { saveToolUsage, addHistoryEntry } from "../../hooks/useFirestore";
import LoadingSpinner from "../../components/LoadingSpinner";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../../hooks/useLanguage";
import VoiceInput from "../../components/VoiceInput";

interface UnblockResult {
  firstSentence: string;
  angles: { angle: string; hint: string }[];
  surprise: { example: string; why: string };
}

export default function WriteUnblock() {
  const [question, setQuestion] = useState("");
  const [thoughts, setThoughts] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UnblockResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { languageInstruction } = useLanguage();

  const handleUnblock = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setResult(null);
    setSaved(false);
    setError(null);

    const prompt = `You are a writing coach helping a student who is stuck.

Assignment question: "${question}"
Student's rough thoughts: "${thoughts}"

Return JSON:
{
  "firstSentence": "a compelling opening sentence they can use directly",
  "angles": [
    { "angle": "angle title", "hint": "one sentence explaining this direction" },
    { "angle": "...", "hint": "..." },
    { "angle": "...", "hint": "..." }
  ],
  "surprise": {
    "example": "a concrete example or case study they probably haven't thought of",
    "why": "one sentence on why this strengthens their argument"
  }
}

The first sentence should be strong, direct, and not cliché.
The surprise example should be genuinely unexpected and relevant.
Return ONLY valid JSON. No markdown, no explanation.`;

    try {
      const text = await callGemini(prompt, { languageInstruction });
      const parsed = parseGeminiJson(text);
      setResult(parsed);
      await saveToolUsage("writeunblock");
    } catch (error: any) {
      console.error(error);
      setError(
        "Failed to generate ideas. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      await addHistoryEntry("writeUnblockHistory", {
        question,
        thoughts,
        result: JSON.stringify(result),
      });
      setSaved(true);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex-1">
      <header className="max-w-5xl mx-auto mb-10">
        <h1 className="font-headline-xl text-headline-xl text-on-background mb-2">Unblock Tool</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Turn writer's block into momentum. Paste your assignment and scattered thoughts, and we'll bridge the gap.</p>
      </header>
      <section className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Inputs Side */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant">
            <div className="mb-6 relative">
              <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Paste assignment question</label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full h-32 p-md pr-12 rounded-lg border border-outline bg-surface-container-low focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-sm text-body-sm resize-none"
                placeholder="e.g., Analyze the impact of social media on teenage mental health..."
              ></textarea>
              <div className="absolute top-10 right-2">
                <VoiceInput onTranscript={(text) => setQuestion(prev => prev ? prev + " " + text : text)} />
              </div>
            </div>
            <div className="mb-8">
              <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Messy thoughts</label>
              <textarea
                value={thoughts}
                onChange={(e) => setThoughts(e.target.value)}
                className="w-full h-48 p-md rounded-lg border border-outline bg-surface-container-low focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-sm text-body-sm resize-none"
                placeholder="e.g., I want to talk about dopamine hits, but also isolation. Maybe something about FOMO. I'm not sure how to start..."
              ></textarea>
            </div>
            <button
              onClick={handleUnblock}
              disabled={loading || !question.trim()}
              className="w-full py-4 bg-primary text-on-primary rounded-lg font-headline-sm text-headline-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-md disabled:opacity-50"
            >
              {loading ? <span className="material-symbols-outlined animate-spin">autorenew</span> : <span className="material-symbols-outlined">bolt</span>}
              {loading ? "Igniting..." : "Unblock Me"}
            </button>
            {error && (
              <div className="mt-4 p-md bg-error-container/10 border border-error/10 rounded-xl text-sm text-error font-bold text-center">
                {error}
              </div>
            )}
          </div>
          {/* Image Illustration */}
          <div className="rounded-xl overflow-hidden h-48 relative group shadow-sm border border-outline-variant hidden lg:block">
            <img
              alt="Workspace"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmoXhhkEISLZ58Tl6CItFTtAxjQwJ4LBKBLZKc5s5bcVwQm-1eqd7-94PN_IwD3yaXUyGzY4LUpo05k6OZIj9Iup1L_Bt3KgVTmPTEST4vNz1UTBeuKkPdy0kLrNJJu-dAR_ot9iPBOzJwI11J2gluqzlRCaQc5DNuY3FKXgWchQqW6sH3LjAe0BIV8uLmQCf7IL-lfN792ss-OgnMU_QofqVKlMpvrLoFvwPMcgdnhwvv3g_jil_z0Ba8hPd8QAi-scbA_l5GFww"
            />
            <div className="absolute inset-0 bg-primary/10 group-hover:bg-primary/5 transition-colors"></div>
          </div>
        </div>
        
        {/* Results Side */}
        <div className="lg:col-span-7 space-y-6">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center py-20"
              >
                <LoadingSpinner message="Extrapolating thesis anchors..." />
              </motion.div>
            ) : !result ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center p-xl text-center space-y-md bg-surface-container-low rounded-2xl border-2 border-dashed border-outline-variant/50 min-h-[400px]"
              >
                <div className="w-16 h-16 bg-surface-container-lowest rounded-xl flex items-center justify-center border border-outline-variant shadow-sm rotate-3">
                  <span className="material-symbols-outlined text-[32px] text-on-surface-variant opacity-40">
                    lightbulb
                  </span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-background font-bold">
                    Thesis Awaits
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-xs mx-auto font-medium opacity-60 italic">
                    Submit your prompt to generate high-conversion opening
                    hooks.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                className="grid grid-cols-1 gap-6"
              >
                {/* Result Card 1 */}
                <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-l-4 border-primary">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-primary">auto_awesome</span>
                    <h3 className="font-label-md text-label-md text-primary uppercase tracking-wider">Opening Sentence</h3>
                  </div>
                  <p className="font-body-lg text-body-lg text-on-surface italic leading-relaxed">
                    "{result.firstSentence}"
                  </p>
                </div>
                {/* Result Card 2 */}
                <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-l-4 border-secondary">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-secondary">explore</span>
                    <h3 className="font-label-md text-label-md text-secondary uppercase tracking-wider">3 Angles to Explore</h3>
                  </div>
                  <ul className="space-y-4">
                    {result.angles.map((angle, idx) => (
                      <li key={idx} className="flex gap-4">
                        <span className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs shrink-0">{idx + 1}</span>
                        <p className="font-body-md text-body-md text-on-surface-variant">
                          <strong className="text-on-surface">{angle.angle}</strong>: {angle.hint}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Result Card 3 */}
                <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-l-4 border-tertiary">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-tertiary">lightbulb</span>
                    <h3 className="font-label-md text-label-md text-tertiary uppercase tracking-wider">Surprise Example</h3>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    {result.surprise.example} {result.surprise.why}
                  </p>
                </div>
                {/* Footnote & Save */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4 px-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-outline">history_edu</span>
                    <span className="font-body-sm text-body-sm text-outline italic">"The rest is yours to write."</span>
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saved}
                    className="px-xl py-3 bg-surface-container-high text-primary rounded-full font-label-md text-label-md flex items-center gap-2 hover:bg-primary hover:text-on-primary transition-all border border-primary/20 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined">{saved ? "check_circle" : "save"}</span>
                    {saved ? "Saved to History" : "Save to History"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
