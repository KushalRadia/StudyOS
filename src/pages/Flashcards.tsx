import React, { useState, useEffect } from "react";
import {
  Layers,
  Plus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Play,
  CheckCircle,
  BrainCircuit,
  Trash2,
  AlertCircle,
  Brain,
} from "lucide-react";
import {
  useHistory,
  deleteHistoryEntry,
  createFlashcardSet,
  updateFlashcardRepetition,
} from "../hooks/useFirestore";
import { callGemini, parseGeminiJson } from "../services/geminiService";
import { cn } from "../lib/utils";
import LoadingSpinner from "../components/LoadingSpinner";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../hooks/useLanguage";
import VoiceInput from "../components/VoiceInput";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  title: string;
  nextReview: any;
  status: "new" | "learning" | "reviewing";
}

export default function Flashcards() {
  const { data: allCards, loading } = useHistory("flashcards", 1000);
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [studyList, setStudyList] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mode, setMode] = useState<"list" | "study" | "decay">("list");
  const { languageInstruction } = useLanguage();

  // Group cards by title (deck name)
  const decks = allCards.reduce((acc: any, card: any) => {
    if (!acc[card.title]) acc[card.title] = [];
    acc[card.title].push(card);
    return acc;
  }, {});

  // Ebbinghaus forgetting curve retention score (0–100) for a single card
  function computeRetention(card: any): number {
    if (!card.lastReviewed) return 0;
    const lastReviewed = card.lastReviewed.toDate
      ? card.lastReviewed.toDate()
      : new Date(card.lastReviewed);
    const intervalDays = card.interval || 1;
    const stabilityDays = intervalDays * 1.2;
    const elapsedDays =
      (Date.now() - lastReviewed.getTime()) / (1000 * 60 * 60 * 24);
    const retention = Math.exp(-elapsedDays / stabilityDays);
    return Math.round(retention * 100);
  }

  const startReview = (deckTitle: string) => {
    const cards = decks[deckTitle];
    const due = cards.filter((c: any) => {
      if (!c.nextReview) return true;
      const reviewDate = c.nextReview.toDate
        ? c.nextReview.toDate()
        : new Date(c.nextReview);
      return reviewDate <= new Date();
    });

    if (due.length === 0) {
      alert("No cards due for review in this deck! Great work.");
      return;
    }

    setStudyList(due.sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setIsFlipped(false);
    setMode("study");
  };

  const handleLevel = async (rating: number) => {
    const card = studyList[currentIndex];
    await updateFlashcardRepetition(card.id, rating);

    if (currentIndex < studyList.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else {
      setMode("list");
      alert("Review session complete!");
    }
  };

  const generateFlashcards = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    try {
      const prompt = `Generate 5 high-quality flashcards for the topic: "${topic}".
      Focus on key definitions, core concepts, and potential exam questions.
      
      Return a JSON object with this structure:
      {
        "cards": [
          { "front": "question or term", "back": "short, clear answer or definition" }
        ]
      }
      
      CRITICAL: The JSON keys ("cards", "front", "back") MUST remain exactly as specified in English. Do NOT translate the keys. Only translate the text values inside the JSON.`;

      const text = await callGemini(prompt, { 
        languageInstruction,
        config: { responseMimeType: "application/json" }
      });
      
      const parsed = parseGeminiJson(text);
      let cardsArray: any[] = [];
      if (parsed && typeof parsed === "object") {
        if (Array.isArray(parsed)) {
          cardsArray = parsed;
        } else if (Array.isArray(parsed.cards)) {
          cardsArray = parsed.cards;
        } else if (Array.isArray(parsed.flashcards)) {
          cardsArray = parsed.flashcards;
        } else {
          const possibleArray = Object.values(parsed).find((val) => Array.isArray(val));
          if (possibleArray) {
            cardsArray = possibleArray as any[];
          }
        }
      }

      if (!cardsArray || cardsArray.length === 0) {
        throw new Error("No flashcards found in the response.");
      }

      const formattedCards = cardsArray.map((card: any) => {
        if (!card || typeof card !== "object") return null;
        
        let front = "";
        let back = "";
        
        // Scan keys to find best match case-insensitively and language-adaptively
        const keys = Object.keys(card);
        
        // Find front key
        const frontKey = keys.find(k => {
          const lk = k.toLowerCase();
          return lk === "front" || lk === "question" || lk === "q" || lk === "term" || lk === "concept" || lk === "सामने" || lk === "प्रश्न";
        }) || keys[0];
        
        // Find back key (excluding the front key)
        const backKey = keys.find(k => {
          const lk = k.toLowerCase();
          return k !== frontKey && (lk === "back" || lk === "answer" || lk === "a" || lk === "definition" || lk === "explanation" || lk === "पीछे" || lk === "उत्तर");
        }) || keys[1];
        
        if (frontKey) front = String(card[frontKey] || "");
        if (backKey) back = String(card[backKey] || "");
        
        return {
          front: front.substring(0, 1000).trim(),
          back: back.substring(0, 2000).trim(),
        };
      }).filter(c => c && c.front && c.back);

      if (formattedCards.length === 0) {
        throw new Error("Failed to format any valid flashcards.");
      }

      await createFlashcardSet(topic.substring(0, 200), formattedCards);
      setTopic("");
    } catch (error) {
      console.error(error);
      alert("Failed to generate flashcards.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary-container/10 text-primary rounded-2xl flex items-center justify-center shadow-sm">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-on-background">
              Spaced Flashcards
            </h1>
            <p className="text-on-surface-variant">
              Optimize your memory with AI-powered spaced repetition.
            </p>
          </div>
        </div>
        {mode === "study" && (
          <button onClick={() => setMode("list")} className="btn-secondary">
            Exit Session
          </button>
        )}
      </header>

      {mode === "list" ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="card space-y-6 border-primary/20 bg-primary-container/5">
              <div className="space-y-4 text-center">
                <Brain className="w-12 h-12 text-primary mx-auto opacity-40 shrink-0" />
                <h3 className="text-xl font-bold text-on-surface">New Deck</h3>
                <p className="text-sm text-on-surface-variant">
                  Describe a topic and StudyOS will craft precision flashcards
                  for you.
                </p>
              </div>
              <div className="space-y-3 relative">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Quantum Physics basics..."
                  className="w-full p-4 pr-12 bg-surface-container border border-outline-variant rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <div className="absolute top-2 right-2">
                  <VoiceInput onTranscript={(text) => setTopic(prev => prev ? prev + " " + text : text)} />
                </div>
                <button
                  onClick={generateFlashcards}
                  disabled={generating || !topic.trim()}
                  className="w-full btn-primary disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Generating Cards...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>Generate Deck</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                Your Knowledge Decks
              </h3>
              <div className="flex items-center gap-2">
                <div className="text-xs font-medium text-on-surface-variant bg-surface-container px-3 py-1 rounded-full border border-outline-variant">
                  {Object.keys(decks).length} Active Decks
                </div>
                {Object.keys(decks).length > 0 && (
                  <button
                    onClick={() => setMode("decay")}
                    className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
                  >
                    <span className="material-symbols-outlined text-base">health_and_safety</span>
                    Knowledge Health
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="py-20 flex justify-center">
                <LoadingSpinner message="Syncing your brain's backup..." />
              </div>
            ) : Object.keys(decks).length === 0 ? (
              <div className="card py-16 text-center text-on-surface-variant border-dashed border-2 bg-surface-container-low">
                <Layers className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-medium">
                  No decks found. Start by generating one on the left.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.keys(decks).map((title) => {
                  const dueCount = decks[title].filter((c: any) => {
                    if (!c.nextReview) return true;
                    const reviewDate = c.nextReview.toDate
                      ? c.nextReview.toDate()
                      : new Date(c.nextReview);
                    return reviewDate <= new Date();
                  }).length;

                  return (
                    <motion.div
                      key={title}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="card group hover:border-primary/40 flex flex-col justify-between min-h-[220px]"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="badge badge-primary">
                            {decks[title].length} Cards
                          </span>
                          {dueCount > 0 && (
                            <span className="badge badge-error animate-pulse">
                              {dueCount} Due Now
                            </span>
                          )}
                        </div>
                        <h4 className="text-xl font-bold text-on-surface line-clamp-2 leading-tight">
                          {title}
                        </h4>
                      </div>

                      <div className="flex gap-2 mt-6">
                        <button
                          onClick={() => startReview(title)}
                          disabled={dueCount === 0}
                          className={cn(
                            "flex-1 py-3 rounded-md font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95",
                            dueCount > 0
                              ? "bg-primary text-on-primary hover:shadow-lg"
                              : "bg-surface-container text-on-surface-variant cursor-not-allowed opacity-60",
                          )}
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>Review</span>
                        </button>
                        <button
                          className="p-3 bg-surface-container border border-outline-variant text-on-surface-variant hover:text-error hover:bg-error-container/10 rounded-md transition-all active:scale-95"
                          onClick={() => {
                            if (
                              confirm(`Permanently delete deck "${title}"?`)
                            ) {
                              decks[title].forEach((c: any) =>
                                deleteHistoryEntry("flashcards", c.id),
                              );
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : mode === "decay" ? (
        (() => {
          // Compute per-deck retention
          const deckList = Object.keys(decks).map((title) => {
            const cards = decks[title];
            const retentions = cards.map(computeRetention);
            const avgRetention =
              cards.length > 0
                ? Math.round(
                    retentions.reduce((a: number, b: number) => a + b, 0) /
                      retentions.length
                  )
                : 0;
            const atRisk = retentions.filter((r: number) => r < 40).length;
            return { title, avgRetention, atRisk, cardCount: cards.length };
          });

          // Sort ascending — most urgent first
          const sorted = [...deckList].sort(
            (a, b) => a.avgRetention - b.avgRetention
          );

          const allRetentions = Object.values(decks)
            .flat()
            .map(computeRetention);
          const brainHealth =
            allRetentions.length > 0
              ? Math.round(
                  allRetentions.reduce((a: number, b: number) => a + b, 0) /
                    allRetentions.length
                )
              : 0;
          const totalAtRisk = allRetentions.filter((r) => r < 40).length;
          const lowestDeck = sorted[0]?.title ?? "—";

          const barColor = (score: number) =>
            score > 70
              ? "bg-secondary"
              : score >= 40
              ? "bg-tertiary"
              : "bg-error";

          const scoreText = (score: number) =>
            score > 70 ? "text-secondary" : score >= 40 ? "text-tertiary" : "text-error";

          return (
            <div className="space-y-8">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-on-background">
                  Knowledge Health
                </h2>
                <button
                  onClick={() => setMode("list")}
                  className="btn-secondary text-sm"
                >
                  ← Back to Decks
                </button>
              </div>

              {/* Summary bento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card text-center space-y-1 p-5">
                  <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Brain Health
                  </p>
                  <p
                    className={`font-headline-md text-headline-md font-black ${
                      scoreText(brainHealth)
                    }`}
                  >
                    {brainHealth}%
                  </p>
                </div>
                <div className="card text-center space-y-1 p-5">
                  <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    At Risk
                  </p>
                  <p className="font-headline-md text-headline-md font-black text-error">
                    {totalAtRisk} cards
                  </p>
                </div>
                <div className="card text-center space-y-1 p-5">
                  <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Next Forget
                  </p>
                  <p className="font-label-md text-label-md font-black text-on-surface truncate">
                    {lowestDeck}
                  </p>
                </div>
              </div>

              {/* Per-deck bars */}
              <div className="space-y-4">
                {sorted.map((deck) => (
                  <div key={deck.title} className="card p-5 space-y-3">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <span className="font-label-md text-label-md font-bold text-on-surface truncate max-w-xs">
                        {deck.title}
                      </span>
                      <button
                        onClick={() => {
                          startReview(deck.title);
                        }}
                        className="btn-primary text-xs py-1.5 px-3 shrink-0"
                      >
                        Review Now
                      </button>
                    </div>

                    {/* Retention bar */}
                    <div className="relative h-7 bg-surface-container rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full flex items-center justify-end pr-2 ${barColor(
                          deck.avgRetention
                        )}`}
                        style={{
                          width: `${Math.max(deck.avgRetention, 2)}%`,
                          transition: "width 1s ease-out",
                        }}
                      >
                        {deck.avgRetention >= 12 && (
                          <span className="text-white text-[10px] font-black">
                            {deck.avgRetention}%
                          </span>
                        )}
                      </div>
                      {deck.avgRetention < 12 && (
                        <span
                          className={`absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black ${
                            scoreText(deck.avgRetention)
                          }`}
                        >
                          {deck.avgRetention}%
                        </span>
                      )}
                    </div>

                    {deck.atRisk > 0 && (
                      <p className="font-label-sm text-label-sm text-error">
                        {deck.atRisk} card{deck.atRisk !== 1 ? "s" : ""} at risk
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()
      ) : (
        <div className="max-w-2xl mx-auto space-y-12 py-8">
          <div className="flex items-center justify-between px-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Current Progress
              </span>
              <span className="text-sm font-bold text-primary">
                Card {currentIndex + 1} of {studyList.length}
              </span>
            </div>
            <div className="w-32 h-2 bg-surface-container rounded-full overflow-hidden border border-outline-variant">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{
                  width: `${((currentIndex + 1) / studyList.length) * 100}%`,
                }}
              />
            </div>
          </div>

          <div
            className="perspective-1000 h-[400px] cursor-pointer group"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <motion.div
              className="relative w-full h-full preserve-3d"
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{
                duration: 0.6,
                type: "spring",
                stiffness: 100,
                damping: 15,
              }}
            >
              {/* Front */}
              <div className="absolute inset-0 backface-hidden card p-12 flex flex-col items-center justify-center text-center space-y-8 bg-surface-container-lowest border-2 border-primary/5 group-hover:border-primary/20">
                <div className="px-4 py-1 bg-primary/5 text-primary rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/10">
                  The Question
                </div>
                <p className="text-2xl font-bold text-on-surface leading-tight px-4">
                  {studyList[currentIndex].front}
                </p>
                <div className="mt-auto flex items-center gap-2 text-[10px] text-on-surface-variant font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">
                  <RefreshCw className="w-3 h-3" /> Click to reveal answer
                </div>
              </div>

              {/* Back */}
              <div
                className="absolute inset-0 backface-hidden card p-12 flex flex-col items-center justify-center text-center space-y-8 bg-surface border-2 border-secondary/20 shadow-inner"
                style={{ transform: "rotateY(180deg)" }}
              >
                <div className="px-4 py-1 bg-secondary/5 text-secondary rounded-full text-[10px] font-black uppercase tracking-widest border border-secondary/10">
                  The Answer
                </div>
                <p className="text-xl font-medium text-on-surface leading-relaxed">
                  {studyList[currentIndex].back}
                </p>
                <div className="mt-auto flex flex-col items-center gap-3">
                  <div className="w-12 h-0.5 bg-secondary/20 rounded-full" />
                  <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest">
                    Rate your memory
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          <AnimatePresence>
            {isFlipped && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-4 gap-4 px-4"
              >
                {[
                  {
                    l: "Forgot",
                    v: 0,
                    c: "hover:bg-error/10 hover:border-error border-transparent text-error",
                  },
                  {
                    l: "Hard",
                    v: 1,
                    c: "hover:bg-tertiary/10 hover:border-tertiary border-transparent text-tertiary",
                  },
                  {
                    l: "Good",
                    v: 2,
                    c: "hover:bg-primary/10 hover:border-primary border-transparent text-primary",
                  },
                  {
                    l: "Easy",
                    v: 3,
                    c: "hover:bg-secondary/10 hover:border-secondary border-transparent text-secondary",
                  },
                ].map((rating) => (
                  <button
                    key={rating.v}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLevel(rating.v);
                    }}
                    className={cn(
                      "group relative py-5 bg-surface-container-lowest border-2 rounded-2xl font-bold text-xs transition-all shadow-sm active:scale-95 flex flex-col items-center gap-1",
                      rating.c,
                    )}
                  >
                    <span className="opacity-70 group-hover:opacity-100">
                      {rating.l}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {!isFlipped && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center p-8 text-on-surface-variant space-x-2"
            >
              <AlertCircle className="w-4 h-4 opacity-40" />
              <p className="text-xs font-bold uppercase tracking-widest opacity-60">
                Flip the card to evaluate performance
              </p>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
