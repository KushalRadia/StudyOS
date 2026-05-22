import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock, Download, RefreshCcw, Save, CheckCircle } from "lucide-react";
import { callGemini, parseGeminiJson } from "../services/geminiService";
import { saveToolUsage, addHistoryEntry } from "../hooks/useFirestore";
import { useLanguage } from "../hooks/useLanguage";
import VoiceInput from "../components/VoiceInput";

interface PanicResult {
  sessionPlan: { time: string; activity: string; type: "study" | "break" | "review" }[];
  likelyQuestions: { question: string; probability: "High" | "Medium"; topic: string }[];
  cheatSheet: { topic: string; facts: string[] }[];
}

export default function PanicMode() {
  const [examName, setExamName] = useState("");
  const [hours, setHours] = useState(2);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Activating panic mode...");
  const [result, setPanicResult] = useState<PanicResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const { languageInstruction } = useLanguage();

  const loadingMessages = [
    "Scanning exam patterns...",
    "Building emergency schedule...",
    "Identifying must-know topics...",
    "Generating cheat sheet..."
  ];

  useEffect(() => {
    let t: NodeJS.Timeout;
    if (loading) {
      let i = 0;
      t = setInterval(() => {
        i = (i + 1) % loadingMessages.length;
        setLoadingMsg(loadingMessages[i]);
      }, 1500);
    }
    return () => clearInterval(t);
  }, [loading]);

  const activatePanicMode = async () => {
    if (!examName) return;
    setLoading(true);
    setError(null);
    setPanicResult(null);
    setSaved(false);

    try {
      const prompt = `A student has ${hours} hours before their ${examName} exam. Emergency study mode.

Generate a complete emergency study package. Return ONLY this JSON:
{
  "sessionPlan": [
    { "time": "0:00–0:45", "activity": "description of what to study", "type": "study" },
    { "time": "0:45–0:55", "activity": "Short break — walk around", "type": "break" }
  ],
  "likelyQuestions": [
    { "question": "full question text", "probability": "High", "topic": "topic name" }
  ],
  "cheatSheet": [
    { "topic": "topic name", "facts": ["key fact 1", "key fact 2", "key fact 3"] }
  ]
}

Rules:
- sessionPlan: Fill the entire ${hours} hours with 40-50 min study blocks and 10 min breaks. Be specific about what to study in each block.
- likelyQuestions: Give exactly 10 questions. These should be the highest-probability questions for this specific exam, covering different topics. Mark 5 as "High" and 5 as "Medium".
- cheatSheet: Cover every major topic of ${examName}. Max 3 facts per topic, under 12 words each. These are the ONLY facts they need.
Return ONLY valid JSON. No markdown. No backticks.`;

      const text = await callGemini(prompt, { languageInstruction });
      const parsed = parseGeminiJson(text);
      setPanicResult(parsed);
    } catch (err: any) {
      setError("Failed to activate panic mode. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const saveSession = async () => {
    if (!result || saved) return;
    await saveToolUsage("panic");
    await addHistoryEntry("panicSessions", { examName, hours, result: JSON.stringify(result) });
    setSaved(true);
  };

  const copyCheatSheet = () => {
    if (!result) return;
    const text = result.cheatSheet.map(cs => `${cs.topic}:\n` + cs.facts.map(f => `- ${f}`).join("\n")).join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0d0d14] text-white p-6 md:p-12 relative overflow-x-hidden font-sans">
      <Link to="/dashboard" className="absolute top-6 left-6 text-white/40 hover:text-white transition-colors text-sm font-bold flex items-center gap-2 z-50">
        ← Back to Dashboard
      </Link>

      <div className="absolute top-6 right-6 w-4 h-4 bg-red-500 rounded-full animate-ping z-50"></div>
      <div className="absolute top-6 right-6 w-4 h-4 bg-red-500 rounded-full z-50"></div>

      {!result && !loading && (
        <div className="max-w-[480px] mx-auto mt-20 md:mt-32 text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="text-[clamp(48px,8vw,96px)] font-black text-[#ef4444] tracking-tighter leading-none mb-4 flex flex-col items-center gap-4">
            <span className="text-6xl md:text-8xl">⏱️</span>
            PANIC MODE
          </div>
          <p className="text-white/40 text-lg mb-12">Exam in a few hours? Let's make every minute count.</p>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-10 text-left shadow-2xl backdrop-blur-sm relative z-10">
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm">
                {error}
              </div>
            )}
            
            <label className="block text-white/60 font-bold mb-3 uppercase tracking-wider text-sm">What's your exam?</label>
            <div className="flex gap-2 mb-8">
              <input 
                type="text" 
                value={examName}
                onChange={e => setExamName(e.target.value)}
                placeholder="e.g. JEE Physics, CA Accounts Paper 2..."
                className="w-full p-4 rounded-xl bg-white text-black font-bold outline-none focus:ring-4 focus:ring-red-500/30 transition-all placeholder:text-gray-400 placeholder:font-normal"
              />
              <VoiceInput onTranscript={(t) => setExamName(prev => prev ? prev + " " + t : t)} className="bg-white/10 p-1 rounded-xl" />
            </div>

            <label className="block text-white/60 font-bold mb-3 uppercase tracking-wider text-sm">How many hours do you have?</label>
            <div className="flex gap-3 mb-10 flex-wrap">
              {[1, 2, 3].map(h => (
                <button 
                  key={h}
                  onClick={() => setHours(h)}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${hours === h ? 'bg-red-500 text-white border-transparent' : 'bg-transparent border border-white/20 text-white hover:bg-white/10'}`}
                >
                  {h} {h === 1 ? 'hour' : 'hours'}
                </button>
              ))}
              <input 
                type="number" 
                value={hours}
                onChange={e => setHours(Number(e.target.value))}
                className="w-24 bg-transparent border border-white/20 text-white rounded-xl text-center font-bold outline-none focus:border-red-500"
                min="1" max="24"
              />
            </div>

            <button 
              onClick={activatePanicMode}
              disabled={!examName}
              className="w-full py-5 rounded-2xl text-xl font-black text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
              onMouseEnter={e => { if(examName) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(239,68,68,0.5)'; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              🚨 Activate Panic Mode
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="min-h-[80vh] flex flex-col items-center justify-center animate-in fade-in">
          <div className="text-8xl animate-pulse mb-8">🚨</div>
          <h2 className="text-3xl md:text-5xl font-black text-red-500 tracking-tight text-center">{loadingMsg}</h2>
          <div className="w-64 h-2 bg-white/10 rounded-full mt-8 overflow-hidden">
            <div className="h-full bg-red-500 animate-[bounce_1.5s_infinite]"></div>
          </div>
        </div>
      )}

      {result && (
        <div className="max-w-[1400px] mx-auto mt-16 animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <h2 className="text-3xl md:text-4xl font-black text-white">
              {examName} <span className="text-white/40 font-normal ml-2">in {hours} hours</span>
            </h2>
            <div className="flex gap-4">
              <button onClick={saveSession} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors ${saved ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                {saved ? <><CheckCircle size={18} /> Saved</> : <><Save size={18} /> Save to History</>}
              </button>
              <button onClick={() => setPanicResult(null)} className="px-6 py-3 rounded-xl font-bold bg-white/5 border border-white/10 text-white hover:bg-white/10 flex items-center gap-2">
                <RefreshCcw size={18} /> Start Over
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Panel 1 - Timed Plan */}
            <div className="bg-[#1a0f14] border border-red-500/20 rounded-3xl p-6 md:p-8">
              <h3 className="text-red-500 font-black text-xl mb-6 flex items-center gap-2 uppercase tracking-wide">
                <Clock size={24} /> Your next {hours} hours
              </h3>
              <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-[19px] before:w-[2px] before:bg-red-500/20">
                {result.sessionPlan.map((block, i) => (
                  <div key={i} className="relative pl-12">
                    <div className={`absolute left-[13px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-[#1a0f14] ${block.type === 'study' ? 'bg-red-500' : block.type === 'break' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                    <div className="text-xs font-bold text-white/40 mb-1">{block.time}</div>
                    <div className={`font-bold ${block.type === 'break' ? 'text-green-400' : 'text-white'}`}>{block.activity}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 2 - Likely Questions */}
            <div className="bg-[#1a150f] border border-orange-500/20 rounded-3xl p-6 md:p-8">
              <h3 className="text-orange-500 font-black text-xl mb-6 flex items-center gap-2 uppercase tracking-wide">
                🎯 Most likely to appear
              </h3>
              <div className="space-y-4">
                {result.likelyQuestions.map((q, i) => (
                  <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2 gap-4">
                      <span className="text-xs font-bold text-orange-500/60 uppercase">{q.topic}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${q.probability === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        {q.probability}
                      </span>
                    </div>
                    <div className="font-bold text-white/90 leading-snug">{q.question}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 3 - Cheat Sheet */}
            <div className="bg-[#0f1a14] border border-green-500/20 rounded-3xl p-6 md:p-8 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-green-500 font-black text-xl flex items-center gap-2 uppercase tracking-wide">
                  📋 Minimum Viable Knowledge
                </h3>
              </div>
              <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {result.cheatSheet.map((section, i) => (
                  <div key={i}>
                    <div className="text-sm font-bold text-green-400 mb-2 uppercase border-b border-green-500/20 pb-1">{section.topic}</div>
                    <ul className="space-y-2">
                      {section.facts.map((fact, j) => (
                        <li key={j} className="flex gap-2 text-white/80 text-sm">
                          <span className="text-green-500 shrink-0 mt-0.5">•</span> 
                          <span>{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <button 
                onClick={copyCheatSheet}
                className="mt-6 w-full py-4 rounded-xl font-bold bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 flex items-center justify-center gap-2 transition-colors"
              >
                {copied ? <><CheckCircle size={18} /> Copied!</> : <><Download size={18} /> Copy Cheat Sheet</>}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
