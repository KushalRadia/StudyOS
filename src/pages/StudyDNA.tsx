import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { AlertTriangle, RefreshCcw, Dna } from "lucide-react";
import { callGemini, parseGeminiJson } from "../services/geminiService";
import { useAuth, db } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import ShareCard from "../components/ShareCard";
import LoadingSpinner from "../components/LoadingSpinner";

interface StudyDNAProfile {
  archetype: string;
  archetypeTagline: string;
  peakStudyHour: string;
  peakStudyDay: string;
  topStrengths: string[];
  blindSpots: string[];
  favoriteTools: string[];
  studyStyle: string;
  adviceForThem: string;
  consistencyScore: number;
  explorationScore: number;
  focusScore: number;
  dnaColor: string;
}

function ScoreBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold uppercase tracking-wider opacity-70">
          {label}
        </span>
        <span className="text-xs font-black">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function StudyDNA() {
  const { user } = useAuth();
  const { languageInstruction } = useLanguage();
  const [dna, setDna] = useState<StudyDNAProfile | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  // On mount — check if DNA already exists in Firestore
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const data = userDoc.data();
        if (data?.studyDNA) {
          setDna(data.studyDNA as StudyDNAProfile);
          if (data.studyDNAGeneratedAt?.toDate) {
            setGeneratedAt(data.studyDNAGeneratedAt.toDate());
          }
        }
      } catch {
        // no-op
      } finally {
        setPageLoading(false);
      }
    };
    check();
  }, [user]);

  const generateDNA = async () => {
    if (!user) return;
    setGenerating(true);
    setError(null);

    try {
      // 1. Tool usage from user doc
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const toolUsage = userDoc.data()?.toolUsage || {};

      // 2. Last 50 history entries
      const historySnap = await getDocs(
        query(
          collection(db, "history"),
          where("uid", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(50)
        )
      );
      const historyEntries = historySnap.docs.map((d) => ({
        ...d.data(),
        createdAt: d.data().createdAt?.toDate
          ? d.data().createdAt.toDate()
          : null,
      }));

      // 3. Error log
      const errorSnap = await getDocs(
        query(
          collection(db, "errorLog"),
          where("uid", "==", user.uid),
          limit(30)
        )
      );
      const errors = errorSnap.docs.map((d) => d.data());

      const prompt = `You are a learning scientist generating a student's Study DNA profile from their StudyOS usage data.

Tool usage counts: ${JSON.stringify(toolUsage)}
Recent activity (last 50 sessions, with tool type and timestamps): ${JSON.stringify(
        historyEntries.map((e: any) => ({
          tool: e.toolCollection,
          hour: e.createdAt ? new Date(e.createdAt).getHours() : null,
          dayOfWeek: e.createdAt ? new Date(e.createdAt).getDay() : null,
        }))
      )}
Error patterns (mistake types from error log): ${JSON.stringify(
        errors.map((e: any) => e.mistakeType || "unknown")
      )}

Analyse all of this and return ONLY this JSON:
{
  "archetype": "one of: The Visual Builder | The Night Owl Scholar | The Driller | The Connector | The Last-Minute Sprinter | The Methodical Planner | The Curious Explorer",
  "archetypeTagline": "one punchy sentence (max 10 words) that captures their style",
  "peakStudyHour": "e.g. 10pm–12am",
  "peakStudyDay": "e.g. Sunday",
  "topStrengths": ["strength 1 (max 5 words)", "strength 2", "strength 3"],
  "blindSpots": ["blind spot 1 (max 5 words)", "blind spot 2"],
  "favoriteTools": ["tool1", "tool2", "tool3"],
  "studyStyle": "2-sentence description of how they actually learn",
  "adviceForThem": "one specific, personalised study tip based on their data (2 sentences)",
  "consistencyScore": 72,
  "explorationScore": 85,
  "focusScore": 60,
  "dnaColor": "#7c3aed"
}`;

      const text = await callGemini(prompt, { languageInstruction });
      const parsed = parseGeminiJson(text) as StudyDNAProfile;

      // Persist to Firestore
      await setDoc(
        doc(db, "users", user.uid),
        { studyDNA: parsed, studyDNAGeneratedAt: serverTimestamp() },
        { merge: true }
      );

      setDna(parsed);
      setGeneratedAt(new Date());
    } catch (err: any) {
      setError(
        "Failed to generate your Study DNA. Make sure you have at least a few study sessions logged."
      );
    } finally {
      setGenerating(false);
    }
  };

  const daysSince = generatedAt
    ? Math.floor(
        (Date.now() - generatedAt.getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  if (pageLoading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner message="Loading your Study DNA..." />
      </div>
    );
  }

  // Generation screen
  if (!dna && !generating) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 py-16 text-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
            <span className="text-5xl">🧬</span>
          </div>
          <div className="space-y-3">
            <h1 className="font-headline-lg text-headline-lg font-bold text-on-background tracking-tight">
              Discover Your Study DNA
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-lg mx-auto leading-relaxed">
              We'll analyse your full StudyOS history — tools used, mistakes
              made, subjects explored, and study patterns — to reveal how your
              brain actually learns.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-error/10 border border-error/20 text-error rounded-xl px-4 py-3 text-sm font-medium w-full max-w-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={generateDNA}
            className="btn-primary w-full max-w-sm justify-center py-4 text-base"
          >
            <span className="text-xl">🧬</span>
            Generate My DNA
          </button>
          <p className="font-body-sm text-body-sm text-on-surface-variant opacity-60">
            Requires at least 5 study sessions to generate accurately.
          </p>
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner message="Analysing your learning patterns..." />
      </div>
    );
  }

  if (!dna) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page header */}
      <header className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-2xl">🧬</span>
        </div>
        <div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-background tracking-tight">
            Study DNA
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Your unique learning archetype, decoded.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT — Identity card */}
        <div className="lg:col-span-5 space-y-6">
          {/* Identity Card */}
          <div
            className="relative rounded-3xl overflow-hidden text-white shadow-2xl"
            style={{ backgroundColor: "#1a1a2e", minHeight: "420px" }}
          >
            {/* Accent stripe at top */}
            <div
              className="h-1.5 w-full"
              style={{ backgroundColor: dna.dnaColor }}
            />

            {/* Glow effect */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 30% 20%, ${dna.dnaColor}, transparent 60%)`,
              }}
            />

            <div className="relative z-10 p-8 space-y-6">
              {/* Label + user name */}
              <div className="space-y-1">
                <p
                  className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50"
                  style={{ color: dna.dnaColor }}
                >
                  Study DNA
                </p>
                <p className="text-sm font-medium opacity-70">
                  {user?.displayName}
                </p>
              </div>

              {/* Archetype */}
              <div className="space-y-2">
                <h2
                  className="font-headline-lg text-headline-lg font-black leading-tight"
                  style={{ color: dna.dnaColor }}
                >
                  {dna.archetype}
                </h2>
                <p className="text-sm italic opacity-70">
                  {dna.archetypeTagline}
                </p>
              </div>

              {/* Score bars */}
              <div className="space-y-3 pt-2">
                <ScoreBar
                  label="Consistency"
                  value={dna.consistencyScore}
                  color={dna.dnaColor}
                />
                <ScoreBar
                  label="Exploration"
                  value={dna.explorationScore}
                  color={dna.dnaColor}
                />
                <ScoreBar
                  label="Focus"
                  value={dna.focusScore}
                  color={dna.dnaColor}
                />
              </div>

              {/* Peak study time */}
              <div className="flex items-center gap-2 text-sm font-medium opacity-80">
                <span>⚡</span>
                <span>
                  {dna.peakStudyDay} {dna.peakStudyHour}
                </span>
              </div>

              {/* Favourite tools */}
              <div className="flex flex-wrap gap-2">
                {dna.favoriteTools.map((tool) => (
                  <span
                    key={tool}
                    className="px-2.5 py-1 rounded-full text-xs font-bold border"
                    style={{
                      borderColor: dna.dnaColor + "60",
                      color: dna.dnaColor,
                      backgroundColor: dna.dnaColor + "15",
                    }}
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Share card */}
          <ShareCard
            title="My Study DNA"
            topic={dna.archetype}
            content={[
              dna.archetypeTagline,
              `Peak: ${dna.peakStudyDay} ${dna.peakStudyHour}`,
              ...dna.topStrengths,
            ]}
            accentColor={dna.dnaColor}
            toolLabel="Study DNA"
          />

          {/* Re-analyse */}
          <div className="text-center space-y-2">
            <button
              onClick={() => {
                setDna(null);
                setError(null);
              }}
              className="btn-secondary w-full justify-center"
            >
              <RefreshCcw className="w-4 h-4" /> Re-analyse
            </button>
            {daysSince !== null && (
              <p className="font-body-sm text-body-sm text-on-surface-variant opacity-60">
                Last analysed:{" "}
                {daysSince === 0 ? "today" : `${daysSince} day${daysSince !== 1 ? "s" : ""} ago`}
              </p>
            )}
          </div>
        </div>

        {/* RIGHT — Deep analysis */}
        <div className="lg:col-span-7 space-y-6">
          {/* How You Learn */}
          <div className="card space-y-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                auto_stories
              </span>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-background">
                How You Learn
              </h3>
            </div>
            <p className="font-body-md text-body-md text-on-surface leading-relaxed border-l-4 border-primary pl-4 italic">
              {dna.studyStyle}
            </p>
          </div>

          {/* Superpowers */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">
                bolt
              </span>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-background">
                Your Superpowers
              </h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {dna.topStrengths.map((s) => (
                <span
                  key={s}
                  className="px-4 py-2 rounded-xl font-label-md text-label-md font-bold bg-secondary-container text-on-secondary-container"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Watch Out For */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-error">
                warning
              </span>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-background">
                Watch Out For
              </h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {dna.blindSpots.map((b) => (
                <span
                  key={b}
                  className="px-4 py-2 rounded-xl font-label-md text-label-md font-bold bg-error-container text-on-error-container flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Personalised Advice */}
          <div className="card space-y-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                lightbulb
              </span>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-background">
                Personalised Advice
              </h3>
            </div>
            <div className="bg-primary-container/10 border-l-4 border-primary rounded-r-xl px-4 py-4">
              <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                {dna.adviceForThem}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
