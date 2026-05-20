import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

interface VoiceInputProps {
  onTranscript: (text: string) => void;  // callback when speech recognized
  placeholder?: string;                  // shown while recording
  className?: string;
}

export default function VoiceInput({ onTranscript, placeholder = "Listening...", className }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SpeechRecognition);
  }, []);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    // Map the app language stored in localStorage to the correct BCP-47 locale.
    const LANGUAGE_MAP: Record<string, string> = {
      en: "en-IN",
      hi: "hi-IN",
      gu: "gu-IN",
      mr: "mr-IN",
      ta: "ta-IN",
      te: "te-IN",
      kn: "kn-IN",
      bn: "bn-IN",
      pa: "pa-IN",
    };
    const storedLang = localStorage.getItem("studyos_language") || "en";
    recognition.lang = LANGUAGE_MAP[storedLang] ?? "en-IN";

    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setInterim(interimTranscript);
      if (finalTranscript) {
        onTranscript(finalTranscript);
        setInterim("");
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      setInterim("");
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterim("");
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterim("");
  };

  if (!supported) return null; // Don't render on unsupported browsers

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={isListening ? stopListening : startListening}
        className={cn(
          "p-2.5 rounded-xl transition-all",
          isListening
            ? "bg-danger text-white animate-pulse shadow-lg shadow-danger/30"
            : "bg-bg border border-border text-text-muted hover:text-primary hover:border-primary"
        )}
        title={isListening ? "Click to stop recording" : "Click to speak your topic"}
      >
        {isListening ? <Mic size={20} /> : <MicOff size={20} />}
      </button>
      
      {isListening && interim && (
        <span className="text-sm text-text-secondary animate-pulse">"{interim}"</span>
      )}
      {isListening && !interim && (
        <span className="text-sm text-text-muted animate-pulse">{placeholder}</span>
      )}
    </div>
  );
}
