import { useState, useRef, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { cn } from "../lib/utils";

export default function LanguagePicker() {
  const [open, setOpen] = useState(false);
  const { language, setLanguage, currentLanguage, SUPPORTED_LANGUAGES } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 p-2 text-text-secondary hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
        title="Change language"
      >
        <Globe size={20} />
        <span className="text-xl leading-none">{currentLanguage.flag}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-outline-variant shadow-lg rounded-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <div className="p-3 border-b border-outline-variant/50">
            <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Response Language</h3>
          </div>
          <div className="p-2 max-h-80 overflow-y-auto">
            {SUPPORTED_LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => { setLanguage(lang.code); setOpen(false); }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-bg",
                  language === lang.code ? "bg-primary/5 text-primary" : "text-text-primary"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{lang.flag}</span>
                  <span>{lang.name}</span>
                </div>
                {language === lang.code && <Check size={16} />}
              </button>
            ))}
          </div>
          {language !== "en" && (
            <div className="bg-primary/5 p-3 text-xs text-primary font-medium border-t border-primary/10">
              ✓ All AI responses will be in {currentLanguage.name.split(" ")[0]}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
