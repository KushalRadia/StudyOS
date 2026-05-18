import { useState, useEffect, useRef } from "react";
import { callGeminiChat, parseGeminiJson } from "../../services/geminiService";
import { saveToolUsage, addHistoryEntry } from "../../hooks/useFirestore";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../../hooks/useLanguage";
import VoiceInput from "../../components/VoiceInput";
import ShareCard from "../../components/ShareCard";

interface Message {
  role: "user" | "model";
  parts: [{ text: string }];
}

interface MasteryReport {
  masteryScore: number;
  strong: string[];
  gaps: string[];
  nextSteps: string[];
}

export default function TeachMeBack() {
  const [topic, setTopic] = useState("");
  const [sessionActive, setSessionActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [round, setRound] = useState(1);
  const [history, setHistory] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [report, setReport] = useState<MasteryReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { languageInstruction } = useLanguage();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const startSession = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setSessionActive(true);
    setRound(1);
    setError(null);
    setReport(null);

    const systemPrompt = `You are a Socratic tutor. The student is trying to master: "${topic}".

Your ONLY job is to find gaps in their understanding.
Rules:
1. After each student explanation, ask EXACTLY ONE question — the most revealing question that exposes a gap or assumption they haven't addressed.
2. Never explain the concept yourself. Never say "good job" generically.
3. Keep your question under 20 words.
4. After round 5, output a JSON mastery report:
{
  "masteryScore": 0-100,
  "strong": ["what they understood well"],
  "gaps": ["specific gaps identified"],
  "nextSteps": ["1-2 things to study next"]
}
5. For rounds 1-4, respond ONLY with your single question. Nothing else.
${languageInstruction}`;

    const initialHistory: Message[] = [
      { role: "user", parts: [{ text: systemPrompt }] },
      {
        role: "model",
        parts: [
          {
            text: `I'm ready. I'll be testing your knowledge on ${topic}. Go ahead and explain what you know so far.`,
          },
        ],
      },
    ];

    setHistory(initialHistory);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", parts: [{ text: input }] };
    const updatedHistory = [...history, userMessage];
    setHistory(updatedHistory);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const responseText = await callGeminiChat(updatedHistory, input);

      if (round < 5) {
        setHistory([
          ...updatedHistory,
          { role: "model", parts: [{ text: responseText }] },
        ]);
        setRound((prev) => prev + 1);
      } else {
        const parsedReport = parseGeminiJson(responseText);
        setReport(parsedReport);
        setSessionActive(false);
        await saveToolUsage("teachmeback");
        await addHistoryEntry("teachSessions", {
          topic,
          messages: updatedHistory,
          masteryScore: parsedReport.masteryScore,
        });
      }
    } catch (error: any) {
      console.error(error);
      setError("The AI tutor is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full">
      <style>{`
        .chat-container::-webkit-scrollbar {
          width: 6px;
        }
        .chat-container::-webkit-scrollbar-thumb {
          background-color: var(--outline-variant, #c7c4d8);
          border-radius: 10px;
        }
      `}</style>
      
      {/* Status Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">TeachMeBack Socratic Tutor</h1>
          <p className="text-on-surface-variant font-body-md text-body-md">Master concepts by teaching them to our AI. One round at a time.</p>
        </div>
        {(sessionActive || report) && (
          <div className="w-full md:w-64">
            <div className="flex justify-between items-center mb-2">
              <span className="font-label-md text-label-md text-primary">Round {Math.min(round, 5)} of 5</span>
              <span className="font-label-md text-label-md text-on-surface-variant">{Math.round(((Math.min(round, 5) - 1) / 5) * 100)}% Complete</span>
            </div>
            <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden border border-outline-variant/30">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(Math.min(round, 5) / 5) * 100}%` }}
                className="h-full bg-primary rounded-full"
              />
            </div>
          </div>
        )}
      </div>

      {!sessionActive && !report && (
        <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant shadow-sm mb-8 max-w-2xl mx-auto">
          <label className="font-label-md text-label-md text-on-surface-variant mb-3 block uppercase tracking-wider">What do you want to teach?</label>
          <div className="relative mb-6">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. The Doppler Effect, Quantum Entanglement..."
              className="w-full pl-4 pr-14 py-4 bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-body-md focus:ring-2 focus:ring-primary focus:outline-none transition-all"
              onKeyDown={(e) => e.key === "Enter" && startSession()}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <VoiceInput onTranscript={(text) => setTopic(prev => prev ? prev + " " + text : text)} />
            </div>
          </div>
          <button
            onClick={startSession}
            disabled={!topic.trim()}
            className="w-full py-4 bg-primary text-on-primary rounded-lg font-headline-sm text-headline-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-md disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
            Start Session
          </button>
        </div>
      )}

      {(sessionActive || report) && (
        <>
          {/* Input Section (Mastery Prompt) */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant mb-8">
            <label className="font-label-md text-label-md text-on-surface-variant mb-3 block uppercase tracking-wider">CURRENT FOCUS</label>
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-primary">psychology</span>
                <input
                  className="w-full pl-12 pr-4 py-4 bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-body-md outline-none"
                  readOnly
                  type="text"
                  value={topic}
                />
              </div>
              <button
                onClick={() => {
                  setSessionActive(false);
                  setReport(null);
                  setTopic("");
                }}
                className="bg-surface-container-high text-on-surface-variant px-6 py-4 rounded-lg font-label-md text-label-md hover:bg-surface-container-highest transition-colors whitespace-nowrap"
              >
                Change Concept
              </button>
            </div>
          </div>

          {sessionActive && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
              {/* Chat History (Main Column) */}
              <div className="md:col-span-8 flex flex-col h-[500px] bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
                <div className="p-4 border-b border-outline-variant bg-surface-container-lowest flex items-center justify-between">
                  <span className="font-label-md text-label-md text-on-surface">Conversation Log</span>
                  <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Active Round</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6 chat-container">
                  {history.slice(1).map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("flex gap-4 max-w-[90%]", msg.role === "user" ? "ml-auto flex-row-reverse" : "")}
                    >
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", msg.role === "user" ? "bg-secondary" : "bg-primary")}>
                        <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: msg.role === "model" ? "'FILL' 1" : undefined }}>
                          {msg.role === "user" ? "person" : "smart_toy"}
                        </span>
                      </div>
                      <div className={cn("rounded-2xl p-4 shadow-sm", msg.role === "user" ? "bg-primary-container text-white" : "bg-surface-container-low text-on-surface")}>
                        <p className="font-body-md text-body-md">{msg.parts[0].text}</p>
                      </div>
                    </motion.div>
                  ))}
                  
                  {loading && (
                    <div className="flex gap-4 max-w-[90%]">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                      </div>
                      <div className="bg-surface-container-low rounded-2xl p-4 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-4 bg-surface-container-lowest border-t border-outline-variant">
                  {error && (
                    <div className="mb-4 p-3 bg-error-container/10 border border-error/10 rounded-lg text-sm text-error font-bold text-center">
                      {error}
                    </div>
                  )}
                  <form
                    className="relative"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                  >
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                      className="w-full p-4 pr-24 bg-surface-container-low border border-outline-variant rounded-xl font-body-md text-body-md focus:ring-2 focus:ring-primary focus:outline-none resize-none h-24"
                      placeholder="Type your explanation here..."
                    ></textarea>
                    <div className="absolute right-14 bottom-3">
                      <VoiceInput 
                        onTranscript={(text) => setInput(prev => prev ? prev + " " + text : text)}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!input.trim() || loading}
                      className="absolute right-3 bottom-3 p-3 bg-primary text-on-primary rounded-lg shadow-md hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                    >
                      <span className="material-symbols-outlined">send</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Sidebar Stats */}
              <div className="md:col-span-4 flex flex-col gap-6">
                <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant hidden lg:block">
                  <h3 className="font-label-md text-label-md text-on-surface-variant mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-tertiary">monitoring</span> LIVE ANALYSIS
                  </h3>
                  <div className="space-y-4 opacity-50">
                    <div className="flex items-center justify-between">
                      <span className="font-body-sm text-body-sm">Accuracy</span>
                      <div className="w-24 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                        <div className="h-full bg-secondary w-[85%]"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-body-sm text-body-sm">Clarity</span>
                      <div className="w-24 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-[70%]"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-body-sm text-body-sm">Vocabulary</span>
                      <div className="w-24 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                        <div className="h-full bg-tertiary-container w-[40%]"></div>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-4 text-center">Analysis will be available at the end of the session</p>
                </div>

                <div className="bg-primary-container/10 p-1 rounded-xl border border-primary-container/20 overflow-hidden relative group hidden lg:block">
                  <img
                    alt="Visualization"
                    className="w-full h-48 object-cover rounded-lg opacity-80 group-hover:opacity-100 transition-opacity"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuATzX4kW5N-XzToac8dPiHlxbavKpOZJuzAwg5bK6gyajKdvJCQQy3p1lm13QS1prMKHxIZEBhpGuAS_F-VbTUK57o-dE6yALSLp0V9EZzj9SjzJUkRzZZvuCD5-OnHRyataEOec1egh7kB7hCjHbsZXfrnTbve1EdtE3ECkdB8Tpmpu-Vs3Ac2EkUIfuT-j4tRlYlWV7bvQg_F5rqHlAF3RuQOn24Cjei5dIACQqPXFplALigiDOivqYNtfEWmeImZ2Jr0m-1_m8Y"
                  />
                  <div className="p-4">
                    <p className="font-label-sm text-label-sm text-primary mb-1">VISUAL ANALOGY</p>
                    <p className="font-body-sm text-body-sm text-on-surface line-clamp-1">Wavefront compression visualization</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {report && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-inverse-surface text-inverse-on-surface rounded-2xl p-8 shadow-xl relative overflow-hidden mt-8"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <span className="material-symbols-outlined text-[120px]">emoji_events</span>
              </div>
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                <div className="flex flex-col items-center md:items-start">
                  <span className="font-label-md text-label-md text-primary-fixed mb-2 uppercase tracking-widest">Predicted Mastery</span>
                  <div className="text-6xl font-black mb-1">{report.masteryScore}<span className="text-2xl text-primary-fixed">/100</span></div>
                  <p className="font-body-sm text-body-sm text-outline-variant">Based on {round - 1} Rounds</p>
                </div>
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-2 text-secondary-fixed">
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span className="font-label-md text-label-md">Strong Points</span>
                    </div>
                    <ul className="text-body-sm font-body-sm space-y-1 list-disc list-inside opacity-80">
                      {report.strong.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-2 text-error-container">
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                      <span className="font-label-md text-label-md">Gap Breakdown</span>
                    </div>
                    <ul className="text-body-sm font-body-sm space-y-1 list-disc list-inside opacity-80">
                      {report.gaps.map((g, i) => <li key={i}>{g}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="relative z-10 mt-8 bg-white/5 p-4 rounded-xl backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3 text-primary-fixed">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>explore</span>
                  <span className="font-label-md text-label-md uppercase tracking-wider">Mastery Path Protocol</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {report.nextSteps.map((step, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-primary-fixed opacity-70">•</span>
                      <p className="font-body-sm text-body-sm text-inverse-on-surface opacity-90">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <ShareCard 
                  title="TeachMeBack Results"
                  topic={topic}
                  content={[...report.strong, ...report.gaps]}
                  accentColor="#22c55e"
                  toolLabel={`Mastery: ${report.masteryScore}%`}
                />
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
