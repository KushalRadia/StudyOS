import { useState, useRef, ChangeEvent } from "react";
import {
  callGeminiWithFile,
  parseGeminiJson,
  fileToBase64,
} from "../../services/geminiService";
import { saveToolUsage, addHistoryEntry } from "../../hooks/useFirestore";
import LoadingSpinner from "../../components/LoadingSpinner";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../../hooks/useLanguage";
import ShareCard from "../../components/ShareCard";
import Markdown from "react-markdown";

interface DigestResult {
  detectedSubject: string;
  keyConcepts: { concept: string; explanation: string }[];
  structuredNotes: string;
  examWatch: string[];
  summary: string;
}

export default function LectureDigest() {
  const [mode, setMode] = useState<"record" | "upload">("record");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DigestResult | null>(null);
  const [title, setTitle] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);
  const { languageInstruction } = useLanguage();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/ogg;codecs=opus",
        "audio/mp4",
        "audio/webm",
        "",
      ];
      const supportedMime =
        mimeTypes.find((mt) => !mt || MediaRecorder.isTypeSupported(mt)) || "";

      const recorderOptions = supportedMime ? { mimeType: supportedMime } : {};
      const recorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const mimeType = supportedMime || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await processAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        alert(
          "Microphone permission denied. Please allow access in your browser settings.",
        );
      } else {
        alert(`Could not start recording: ${err.message}`);
      }
      console.error("Recording error:", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processAudio(file);
  };

  const processAudio = async (blob: Blob | File) => {
    setLoading(true);
    setResult(null);
    setSaved(false);

    try {
      const base64 = await fileToBase64(blob);
      const prompt = `You are a lecture note-taker. Analyze this lecture audio recording.

Lecture title (if given): "${title}"

Return ONLY this JSON:
{
  "detectedSubject": "subject if identifiable",
  "keyConcepts": [
    { "concept": "name", "explanation": "one clear sentence" }
  ],
  "structuredNotes": "well-formatted notes in markdown with headers and bullet points. Use ### for headers and - for bullets.",
  "examWatch": [
    "point the professor repeated or emphasized — likely exam material"
  ],
  "summary": "2-sentence summary of the whole lecture"
}

For examWatch: pick up on repetition, phrases like 'remember this', 'this is important', 
'this comes in exams', explicit emphasis, or concepts explained multiple times.
Return ONLY valid JSON. No extra text.`;

      const mimeType = blob.type || "audio/webm";
      const text = await callGeminiWithFile(prompt, base64, mimeType, { languageInstruction });
      const parsed = parseGeminiJson(text);
      setResult(parsed);
      await saveToolUsage("lecturedigest");
    } catch (error) {
      console.error(error);
      alert(
        "Failed to digest lecture. Please ensure audio is clear and under 10MB.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      await addHistoryEntry("lectureNotes", {
        title: title || result.detectedSubject,
        rawTranscript: "",
        structuredNotes: result.structuredNotes,
        examPoints: result.examWatch,
      });
      setSaved(true);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-lg pb-12 w-full">
      {/* Input Section */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-lg items-start mb-8">
        <div className={cn("bg-surface-container-lowest rounded-xl shadow-md p-lg border border-outline-variant transition-all duration-500", result ? "md:col-span-8" : "md:col-span-12")}>
          <div className="flex flex-col gap-md">
            <h1 className="font-headline-lg text-headline-lg text-on-surface">LectureDigest</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Transform complex lectures into structured knowledge instantly.</p>
            
            <div className="flex bg-surface-container rounded-lg p-1 w-fit mt-2 border border-outline-variant/30">
              <button
                onClick={() => setMode("record")}
                className={cn(
                  "px-6 py-2 rounded-md font-label-md text-label-md transition-all",
                  mode === "record" ? "bg-white shadow-sm text-primary font-bold" : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                Record Live
              </button>
              <button
                onClick={() => setMode("upload")}
                className={cn(
                  "px-6 py-2 rounded-md font-label-md text-label-md transition-all",
                  mode === "upload" ? "bg-white shadow-sm text-primary font-bold" : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                Upload Recording
              </button>
            </div>

            <div className="space-y-sm mt-4">
              <label className="font-label-md text-label-md text-on-surface-variant">Lecture Title (Optional)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Advanced Neurobiology: Synaptic Plasticity"
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-body-md text-body-md transition-all"
              />
            </div>

            {mode === "record" ? (
              <div className="h-32 bg-primary-fixed/20 rounded-xl flex items-center justify-center relative mt-4 overflow-hidden group border border-primary/20">
                {isRecording && (
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <div className="w-3 h-3 bg-error rounded-full animate-pulse"></div>
                    <span className="font-label-sm text-label-sm text-error font-bold uppercase tracking-wider">Recording Live</span>
                  </div>
                )}
                
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={loading}
                  className={cn(
                    "relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95",
                    isRecording ? "bg-error text-white hover:bg-error/90 animate-pulse" : "bg-primary text-on-primary hover:scale-105 disabled:opacity-50"
                  )}
                >
                  <span className="material-symbols-outlined text-[32px]">
                    {isRecording ? "stop" : "mic"}
                  </span>
                </button>
                
                {isRecording && (
                  <div className="absolute bottom-4 inset-x-0 flex items-end justify-center gap-1.5 h-12 opacity-50 px-8">
                    {[...Array(20)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: [`${20 + Math.random() * 40}%`, `${50 + Math.random() * 50}%`, `${20 + Math.random() * 40}%`] }}
                        transition={{ repeat: Infinity, duration: 0.5 + Math.random() * 0.5, delay: i * 0.05 }}
                        className="w-1.5 bg-primary rounded-full flex-1 max-w-[8px]"
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="h-32 border-2 border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center mt-4 bg-surface-container-low hover:bg-surface-container-high transition-colors cursor-pointer group"
              >
                <input
                  type="file"
                  accept="audio/*"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="material-symbols-outlined text-3xl text-primary mb-2 group-hover:scale-110 transition-transform">upload</span>
                <p className="font-label-md text-label-md text-on-surface font-semibold">Import Audio Stream</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant opacity-70">MP3, WAV, M4A up to 10MB</p>
              </div>
            )}
            
            {loading && (
              <div className="flex items-center justify-center py-4">
                 <LoadingSpinner message="Extracting semantic structures..." />
              </div>
            )}
          </div>
        </div>

        {/* Quick Summary Sidebar (Visible only when result exists) */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="md:col-span-4 h-full"
            >
              <div className="bg-surface-container-high rounded-xl p-lg h-full flex flex-col justify-between border border-outline-variant shadow-sm">
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-md">Quick Summary</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    {result.summary}
                  </p>
                </div>
                <div className="mt-8 space-y-3">
                   <button
                      onClick={() => setResult(null)}
                      className="w-full flex items-center justify-center gap-2 text-primary font-label-md text-label-md hover:bg-primary/10 py-2 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">refresh</span>
                      New Digest
                    </button>
                  <button
                    onClick={handleSave}
                    disabled={saved}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-3 rounded-lg font-label-md text-label-md transition-all shadow-sm border",
                      saved
                        ? "bg-secondary/10 text-secondary border-secondary/20 cursor-default"
                        : "bg-white text-on-surface border-outline-variant hover:bg-surface-container-lowest"
                    )}
                  >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {saved ? "check_circle" : "save"}
                    </span>
                    {saved ? "Saved to History" : "Save to History"}
                  </button>
                  <ShareCard 
                    title="Lecture Digest"
                    topic={title || result.detectedSubject}
                    content={[result.summary, ...result.keyConcepts.map(c => `${c.concept}: ${c.explanation}`)]}
                    toolLabel="Digest"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Results Grid (Bento Style) */}
      <AnimatePresence>
        {result && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-12 gap-lg"
          >
            {/* Key Concepts (Top Wide) */}
            <div className="md:col-span-12">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                Key Concepts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                {result.keyConcepts.map((item, i) => (
                  <div key={i} className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl hover:shadow-md transition-shadow group">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center mb-sm",
                      i % 3 === 0 ? "bg-secondary-container" : i % 3 === 1 ? "bg-tertiary-fixed" : "bg-primary-fixed"
                    )}>
                      <span className={cn(
                        "material-symbols-outlined text-[20px]",
                        i % 3 === 0 ? "text-on-secondary-container" : i % 3 === 1 ? "text-on-tertiary-fixed" : "text-on-primary-fixed"
                      )}>
                        {i % 3 === 0 ? "hub" : i % 3 === 1 ? "sensors" : "architecture"}
                      </span>
                    </div>
                    <h4 className="font-label-md text-label-md text-on-surface mb-xs group-hover:text-primary transition-colors">{item.concept}</h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-3">{item.explanation}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Structured Markdown Notes (Main) */}
            <div className="md:col-span-8 space-y-md">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg h-full">
                <div className="flex justify-between items-center mb-lg">
                  <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">description</span>
                    Structured Notes
                  </h2>
                </div>
                <article className="prose prose-slate max-w-none space-y-md prose-h3:text-primary prose-h3:font-headline-sm prose-p:font-body-md prose-p:text-on-surface-variant prose-li:font-body-md prose-li:text-on-surface-variant">
                  <Markdown>{result.structuredNotes}</Markdown>
                </article>
              </div>
            </div>

            {/* Exam Watch (Sidebar) */}
            <div className="md:col-span-4 space-y-lg">
              <div className="bg-inverse-surface text-inverse-on-surface rounded-xl p-lg shadow-xl relative overflow-hidden h-fit">
                {/* Background accent */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary-container/20 rounded-full blur-3xl"></div>
                <h2 className="font-headline-sm text-headline-sm mb-lg flex items-center gap-2 relative z-10">
                  <span className="material-symbols-outlined text-tertiary-fixed">visibility</span>
                  Exam Watch
                </h2>
                <ul className="space-y-md relative z-10">
                  {result.examWatch.map((point, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="material-symbols-outlined text-primary-fixed shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <div>
                        <p className="font-label-md text-label-md mb-1">High Probability</p>
                        <p className="font-body-sm text-body-sm opacity-80 leading-relaxed">{point}</p>
                      </div>
                    </li>
                  ))}
                  {result.examWatch.length === 0 && (
                    <li className="text-body-sm opacity-60 italic">No specific exam hints detected.</li>
                  )}
                </ul>
              </div>

              <div className="bg-surface-container-high rounded-xl overflow-hidden border border-outline-variant shadow-sm hidden md:block">
                <img alt="Study abstract" className="w-full h-40 object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAymRiqs663i49Y-Lrk0L9hMp5c18u2UsnNVyk9s0MQHPiv02M23hZuhrjsnaco0X8JQys_XSkwLBVYrim8S4T8RrDemf1Rn4VEdqVtYpTqXGDXsAmsHtfm42SZubsPTkMAkiTcSsHl5Hnov9zVWFDKekfnF8W97JhrRfhjC-uJHoBpNsPqP1nNMs3gvjlrxId7WkNkypZKanZdFZI8nXs9ni68-Czu9AsA4hjOd_DqbX9jU3hWAkhua47mgaJLRNl86GXLQO7fDyc" />
                <div className="p-md">
                  <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-xs">Related Visual</p>
                  <p className="font-body-sm text-body-sm text-on-surface">Conceptual mapping extracted.</p>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <style>{`
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
