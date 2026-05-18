import { useState, useEffect } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase/config";

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "hi", name: "हिंदी (Hindi)", flag: "🇮🇳" },
  { code: "gu", name: "ગુજરાતી (Gujarati)", flag: "🇮🇳" },
  { code: "mr", name: "मराठी (Marathi)", flag: "🇮🇳" },
  { code: "ta", name: "தமிழ் (Tamil)", flag: "🇮🇳" },
  { code: "te", name: "తెలుగు (Telugu)", flag: "🇮🇳" },
  { code: "bn", name: "বাংলা (Bengali)", flag: "🇮🇳" },
  { code: "kn", name: "ಕನ್ನಡ (Kannada)", flag: "🇮🇳" },
  { code: "pa", name: "ਪੰਜਾਬੀ (Punjabi)", flag: "🇮🇳" },
  { code: "ml", name: "മലയാളം (Malayalam)", flag: "🇮🇳" },
];

export function getLanguageInstruction(code: string): string {
  if (code === "en") return "";
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  if (!lang) return "";
  return `\n\nIMPORTANT: Respond entirely in ${lang.name.split(" ")[0]} (${lang.name}). All explanations, labels, bullet points, and content must be in ${lang.name.split(" ")[0]}. Only keep technical terms, formulas, and proper nouns in their original form.`;
}

export function useLanguage() {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem("studyos_language") || "en";
  });

  const setLanguage = async (code: string) => {
    setLanguageState(code);
    localStorage.setItem("studyos_language", code);
    // Also save to Firestore
    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          preferredLanguage: code
        });
      } catch (e) {
        console.error("Failed to save language preference:", e);
      }
    }
  };

  // Load from Firestore on mount
  useEffect(() => {
    if (!auth.currentUser) return;
    const loadLang = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser!.uid));
        if (userDoc.exists() && userDoc.data().preferredLanguage) {
          const saved = userDoc.data().preferredLanguage;
          setLanguageState(saved);
          localStorage.setItem("studyos_language", saved);
        }
      } catch (e) {
        console.error("Failed to load language preference:", e);
      }
    };
    loadLang();
  }, [auth.currentUser?.uid]);

  const languageInstruction = getLanguageInstruction(language);
  const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  return { language, setLanguage, languageInstruction, currentLanguage, SUPPORTED_LANGUAGES };
}
