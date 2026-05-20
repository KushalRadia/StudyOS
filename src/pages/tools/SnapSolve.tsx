import React, { useState, useRef, useEffect } from "react";
import { Camera, Image as ImageIcon, CheckCircle, RefreshCcw, XOctagon } from "lucide-react";
import { callGeminiWithFile, parseGeminiJson } from "../../services/geminiService";
import { saveToolUsage, addHistoryEntry } from "../../hooks/useFirestore";
import { useLanguage } from "../../hooks/useLanguage";
import LoadingSpinner from "../../components/LoadingSpinner";
import VoiceInput from "../../components/VoiceInput";

interface SnapResult {
  question: string;
  correctAnswer: string;
  keySteps: string[];
  subject: string;
  mistakeAnalysis: {
    whatWentWrong: string;
    gapIdentified: string;
    howToFix: string;
  } | null;
  similarQuestion: string;
}

export default function SnapSolve() {
  const [tab, setTab] = useState<"camera" | "upload">("camera");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SnapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [streamRef, setStreamRef] = useState<MediaStream | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { languageInstruction } = useLanguage();

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStreamRef(stream);
      setCameraActive(true);
    } catch (err) {
      setError("Camera access denied. Please use the Upload tab instead.");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(dataUrl);
    streamRef?.getTracks().forEach(t => t.stop());
    setCameraActive(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
      if (file.size > MAX_SIZE_BYTES) {
        setError("File too large. Please upload an image under 10MB.");
        // Reset the input so the same file can be re-selected after resizing
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setCapturedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    return () => { streamRef?.getTracks().forEach(t => t.stop()); };
  }, [streamRef]);

  const solveQuestion = async () => {
    if (!capturedImage) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const base64 = capturedImage.split(",")[1];
      const mimeType = capturedImage.split(";")[0].split(":")[1] || "image/jpeg";
      
      const prompt = userAnswer.trim()
        ? `A student photographed this question and gave the wrong answer: "${userAnswer}".

Analyze the image. Return ONLY this JSON:
{
  "question": "the question as read from the image",
  "correctAnswer": "the complete correct answer with all steps shown",
  "keySteps": ["step 1", "step 2", "step 3"],
  "subject": "detected subject/topic",
  "mistakeAnalysis": {
    "whatWentWrong": "specific explanation of why the student's answer is wrong",
    "gapIdentified": "the exact concept the student is missing",
    "howToFix": "specific action to fix the gap"
  },
  "similarQuestion": "a similar practice question"
}`
        : `A student photographed this question. Solve it completely.

Analyze the image. Return ONLY this JSON:
{
  "question": "the question as read from the image",
  "correctAnswer": "the complete correct answer with all steps shown",
  "keySteps": ["step 1", "step 2", "step 3"],
  "subject": "detected subject/topic",
  "mistakeAnalysis": null,
  "similarQuestion": "a similar practice question"
}`;

      const text = await callGeminiWithFile(prompt, base64, mimeType, { languageInstruction });
      const parsed = parseGeminiJson(text) as SnapResult;
      setResult(parsed);
      await saveToolUsage("snapsolve");
      await addHistoryEntry("snapSolveHistory", {
        subject: parsed.subject,
        question: parsed.question,
        result: JSON.stringify(parsed)
      });
    } catch (err: any) {
      setError("Failed to analyze the image. Please ensure the question is clearly visible.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setResult(null);
    setUserAnswer("");
    setError(null);
    if (tab === "camera") {
      startCamera();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center">
          <Camera className="w-8 h-8 text-teal-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Snap & Solve</h1>
          <p className="text-text-secondary mt-1">Point. Capture. Understand.</p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-sm text-danger flex items-center gap-2">
          <XOctagon size={16} /> {error}
        </div>
      )}

      {/* Input Section */}
      {!result && !loading && (
        <div className="card space-y-6">
          
          <div className="flex p-1 bg-surface-container rounded-lg">
            <button 
              onClick={() => { setTab("camera"); if(!capturedImage) startCamera(); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${tab === "camera" ? "bg-white text-primary shadow-sm" : "text-text-secondary hover:bg-white/50"}`}
            >
              📷 Camera
            </button>
            <button 
              onClick={() => { setTab("upload"); streamRef?.getTracks().forEach(t => t.stop()); setCameraActive(false); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${tab === "upload" ? "bg-white text-primary shadow-sm" : "text-text-secondary hover:bg-white/50"}`}
            >
              🖼️ Upload Image
            </button>
          </div>

          <div className="bg-bg rounded-xl overflow-hidden relative" style={{ minHeight: '300px' }}>
            {capturedImage ? (
              <div className="relative">
                <img src={capturedImage} alt="Captured" className="w-full h-auto max-h-[60vh] object-contain bg-black/5" />
                <button onClick={reset} className="absolute top-4 right-4 bg-white/90 text-text-primary px-4 py-2 rounded-lg font-bold text-sm shadow-md flex items-center gap-2 hover:bg-white transition-colors">
                  <RefreshCcw size={16} /> Retake
                </button>
              </div>
            ) : tab === "camera" ? (
              <div className="w-full h-[50vh] min-h-[300px] bg-black relative flex flex-col items-center justify-center">
                <video ref={videoRef} playsInline className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                {!cameraActive ? (
                  <button onClick={startCamera} className="absolute z-10 btn-primary flex items-center gap-2">
                    <Camera size={20} /> Start Camera
                  </button>
                ) : (
                  <button onClick={capturePhoto} className="absolute bottom-6 z-10 bg-white text-black px-6 py-3 rounded-full font-bold text-lg shadow-xl flex items-center gap-2 hover:scale-105 transition-transform">
                    <Camera size={24} /> Capture Photo
                  </button>
                )}
              </div>
            ) : (
              <label className="w-full h-[300px] border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-white/50 hover:border-primary transition-all group">
                <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <ImageIcon size={32} className="text-text-secondary group-hover:text-primary transition-colors" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-text-primary text-lg">Upload an image</p>
                  <p className="text-sm text-text-muted mt-1">PNG, JPG up to 10MB</p>
                </div>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            )}
          </div>

          {capturedImage && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div>
                <label className="block text-sm font-bold text-text-primary mb-2">Your answer (optional — for mistake diagnosis)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={userAnswer} 
                    onChange={e => setUserAnswer(e.target.value)}
                    placeholder="What did you think the answer was? Leave blank for a clean solve."
                    className="flex-1 p-3 bg-bg border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                  <VoiceInput onTranscript={(text) => setUserAnswer(prev => prev ? prev + " " + text : text)} />
                </div>
              </div>
              <button onClick={solveQuestion} disabled={loading} className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2">
                <CheckCircle size={20} /> Solve This Question
              </button>
            </div>
          )}
        </div>
      )}

      {loading && <LoadingSpinner message="Analyzing image and solving..." />}

      {/* Result Section */}
      {result && (
        <div className="space-y-6">
          <div className="bg-surface-container p-6 rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-2 text-text-secondary font-bold text-sm">
              <Camera size={16} /> Question Detected from Image
            </div>
            <p className="text-text-primary font-medium">{result.question}</p>
          </div>

          <div className="card space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                  <CheckCircle className="text-success" size={24} /> Complete Solution
                </h3>
                <span className="badge badge-purple mt-2 inline-block">{result.subject}</span>
              </div>
            </div>
            
            <div className="whitespace-pre-wrap text-text-secondary leading-relaxed bg-bg p-6 rounded-xl border border-border font-medium">
              {result.correctAnswer}
            </div>
            
            <div>
              <h4 className="font-bold text-text-primary mb-4 text-lg">Step-by-Step Breakdown</h4>
              <ul className="space-y-3">
                {result.keySteps.map((step, idx) => (
                  <li key={idx} className="flex gap-3 text-text-secondary">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {result.mistakeAnalysis && (
            <div className="card border-danger-light bg-rose-50/30">
              <h3 className="text-xl font-bold text-danger mb-6 flex items-center gap-2">
                <XOctagon size={24} /> Mistake Diagnosis
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-rose-100 shadow-sm">
                  <div className="text-danger font-bold text-sm uppercase tracking-wider mb-2">What went wrong</div>
                  <p className="text-text-secondary">{result.mistakeAnalysis.whatWentWrong}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-orange-100 shadow-sm">
                  <div className="text-warning font-bold text-sm uppercase tracking-wider mb-2">Knowledge Gap</div>
                  <p className="text-text-secondary">{result.mistakeAnalysis.gapIdentified}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm">
                  <div className="text-success font-bold text-sm uppercase tracking-wider mb-2">How to fix it</div>
                  <p className="text-text-secondary">{result.mistakeAnalysis.howToFix}</p>
                </div>
              </div>
            </div>
          )}

          <div className="card border-primary">
            <h4 className="font-bold text-primary mb-3 text-lg flex items-center gap-2">
              <CheckCircle size={20} /> Try a Similar Question
            </h4>
            <p className="text-text-secondary italic bg-primary/5 p-4 rounded-lg">
              {result.similarQuestion}
            </p>
          </div>

          <button onClick={reset} className="btn-secondary w-full py-4 text-lg flex items-center justify-center gap-2">
            <RefreshCcw size={20} /> Try Another Question
          </button>
        </div>
      )}

    </div>
  );
}
