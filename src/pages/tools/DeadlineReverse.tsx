import { useState, useEffect } from "react";
import { callGemini, parseGeminiJson } from "../../services/geminiService";
import { saveToolUsage, addHistoryEntry } from "../../hooks/useFirestore";
import { db } from "../../hooks/useAuth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import LoadingSpinner from "../../components/LoadingSpinner";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../../hooks/useLanguage";
import { useNotifications } from "../../hooks/useNotifications";
import ShareCard from "../../components/ShareCard";

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface StudyDay {
  date: string;
  day: string;
  topic: string;
  task: string;
  hours: number;
  type: "study" | "revision" | "rest";
  completed?: boolean;
}

interface PlanResult {
  totalDays: number;
  warning: string | null;
  plan: StudyDay[];
}

export default function DeadlineReverse() {
  const [examName, setExamName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [hours, setHours] = useState(4);
  const [topics, setTopics] = useState<
    { name: string; complexity: "Easy" | "Medium" | "Hard" }[]
  >([]);
  const [newTopicName, setNewTopicName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const { languageInstruction } = useLanguage();
  const { scheduleStudyReminders, reminderSet } = useNotifications();
  const [scheduledCount, setScheduledCount] = useState(0);

  // Calendar Sync State
  const [calendarSyncing, setCalendarSyncing] = useState(false);
  const [calendarSynced, setCalendarSynced] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  // Load GAPI script dynamically
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.gapi.load("client", async () => {
        try {
          await window.gapi.client.init({
            discoveryDocs: [
              "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
            ],
          });
        } catch (e) {
          console.error("GAPI init failed", e);
        }
      });
    };
    document.head.appendChild(script);

    const tokenScript = document.createElement("script");
    tokenScript.src = "https://accounts.google.com/gsi/client";
    tokenScript.async = true;
    tokenScript.defer = true;
    document.head.appendChild(tokenScript);

    return () => {
      try {
        document.head.removeChild(script);
        document.head.removeChild(tokenScript);
      } catch (e) {}
    };
  }, []);

  const addTopic = () => {
    if (!newTopicName.trim()) return;
    setTopics([...topics, { name: newTopicName, complexity: "Medium" }]);
    setNewTopicName("");
  };

  const removeTopic = (index: number) => {
    setTopics(topics.filter((_, i) => i !== index));
  };

  const updateComplexity = (
    index: number,
    complexity: "Easy" | "Medium" | "Hard",
  ) => {
    const next = [...topics];
    next[index].complexity = complexity;
    setTopics(next);
  };

  const buildPlan = async () => {
    if (!examName || !deadline || topics.length === 0) return;
    setLoading(true);

    const topicsList = topics
      .map((t) => `- ${t.name} (${t.complexity})`)
      .join("\n");
    const today = new Date().toISOString().split("T")[0];

    const prompt = `You are a study planner. Build a realistic day-by-day study plan.

    Exam: "${examName}"
    Deadline: "${deadline}" (today is ${today})
    Daily study hours: ${hours}
    Topics and complexity:
    ${topicsList}

    Rules:
    - Allocate more days to Hard topics, fewer to Easy
    - Include 1 revision day before the deadline
    - Include short 15-min review of previous day at start of each session
    - Last day before exam: light revision only, no new content
    - If total time is very tight, flag which topics to deprioritize

    Return ONLY this JSON:
    {
      "totalDays": number,
      "warning": "null or a short warning if time is very tight",
      "plan": [
        {
          "date": "YYYY-MM-DD",
          "day": "Monday",
          "topic": "topic name",
          "task": "specific task description under 20 words",
          "hours": number,
          "type": "study | revision | rest"
        }
      ]
    }
    Return ONLY valid JSON. No markdown.`;

    try {
      const text = await callGemini(prompt, { languageInstruction });
      const parsed = parseGeminiJson(text);
      setResult(parsed);
      await saveToolUsage("deadline");
      const id = await addHistoryEntry("studyPlansHistory", {
        examName,
        examDate: deadline,
        topics,
        hoursPerDay: hours,
        plan: parsed.plan,
      });
      setPlanId(id || null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = async (index: number) => {
    if (!result) return;
    const nextPlan = [...result.plan];
    nextPlan[index] = {
      ...nextPlan[index],
      completed: !nextPlan[index].completed,
    };
    setResult({ ...result, plan: nextPlan });

    if (planId) {
      try {
        await updateDoc(doc(db, "studyPlansHistory", planId), {
          plan: nextPlan,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.error("Failed to persist progress:", e);
      }
    }
  };

  const syncToCalendar = async () => {
    if (!result) return;
    setCalendarSyncing(true);
    setCalendarError(null);

    try {
      const accessToken = await new Promise<string>((resolve, reject) => {
        try {
          const clientConfig = JSON.parse(
            localStorage.getItem("__FIREBASE_CONFIG__") || "{}",
          );
          const client_id =
            clientConfig.clientId ||
            (window as any).__FIREBASE_CONFIG__?.clientId;

          if (!client_id) {
            throw new Error("Google Client ID not found in configuration.");
          }

          const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id,
            scope: "https://www.googleapis.com/auth/calendar.events",
            callback: (response: any) => {
              if (response.error) reject(new Error(response.error));
              else resolve(response.access_token);
            },
          });
          tokenClient.requestAccessToken({ prompt: "consent" });
        } catch (e) {
          reject(e);
        }
      });

      for (const day of result.plan) {
        if (day.type === "rest") continue;

        const startDate = day.date + "T09:00:00";
        const endTime = new Date(`${day.date}T09:00:00`);
        endTime.setHours(endTime.getHours() + (day.hours || 1));
        const endDate = endTime.toISOString().split(".")[0];

        const event = {
          summary: `📚 ${examName}: ${day.topic}`,
          description: `Task: ${day.task}\\n\\nType: ${day.type}\\nGenerated by StudyOS DeadlineReverse`,
          start: {
            dateTime: startDate,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
            dateTime: endDate,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          colorId: day.type === "revision" ? "11" : "1",
        };

        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(event),
          },
        );
      }

      setCalendarSynced(true);
      setCalendarSyncing(false);
    } catch (error: any) {
      console.error("Calendar sync failed:", error);
      setCalendarError(
        error.message?.includes("popup")
          ? "Pop-up blocked. Please allow pop-ups for this site."
          : "Calendar sync failed. Make sure you're signed in with Google and try again.",
      );
      setCalendarSyncing(false);
    }
  };

  const handleSetReminders = async () => {
    if (!result) return;
    const count = await scheduleStudyReminders(result.plan, examName);
    setScheduledCount(count);
  };

  const progress = result
    ? Math.round(
        (result.plan.filter((d) => d.completed).length / result.plan.length) * 100,
      )
    : 0;
  const completedTasks = result ? result.plan.filter((d) => d.completed).length : 0;
  const totalTasks = result ? result.plan.length : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-lg pb-12 w-full">
      {/* Global Progress Bar */}
      {result && (
        <div className="mb-lg bg-surface-container-lowest p-md rounded-xl shadow-sm border border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-secondary-container text-on-secondary-container p-2 rounded-lg">
              <span className="material-symbols-outlined text-[24px]">analytics</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm">Current Plan Progress</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Overall completion for {examName}</p>
            </div>
          </div>
          <div className="flex-1 md:max-w-md">
            <div className="flex justify-between items-center mb-1">
              <span className="font-label-md text-label-md text-primary">{progress}% Complete</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">{completedTasks}/{totalTasks} tasks done</span>
            </div>
            <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* Input Controls Section (Asymmetric Left) */}
        <section className="lg:col-span-4 space-y-lg">
          <div className="bg-surface-container-lowest p-lg rounded-xl shadow-sm border border-outline-variant">
            <h3 className="font-headline-sm text-headline-sm mb-md flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">auto_awesome</span>
              Plan Generator
            </h3>
            <div className="space-y-md">
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Exam Name</label>
                <input
                  className="w-full bg-surface-container-low border border-outline rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  type="text"
                  placeholder="e.g. Midterm Economics"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Exam Date</label>
                <div className="relative">
                  <input
                    className="w-full bg-surface-container-low border border-outline rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                  <span className="absolute right-3 top-3 material-symbols-outlined text-on-surface-variant pointer-events-none">calendar_today</span>
                </div>
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Hours per Day</label>
                <div className="flex items-center gap-4 bg-surface-container-low p-2 rounded-lg border border-outline">
                  <button onClick={() => setHours(Math.max(1, hours - 1))} className="bg-surface-container-highest w-8 h-8 rounded-md flex items-center justify-center hover:bg-outline-variant transition-colors">
                    <span className="material-symbols-outlined text-sm">remove</span>
                  </button>
                  <span className="flex-1 text-center font-label-md text-label-md">{hours} Hours</span>
                  <button onClick={() => setHours(Math.min(16, hours + 1))} className="bg-primary text-on-primary w-8 h-8 rounded-md flex items-center justify-center hover:opacity-90 transition-all">
                    <span className="material-symbols-outlined text-sm">add</span>
                  </button>
                </div>
              </div>
              <hr className="border-outline-variant" />
              <div>
                <div className="flex justify-between items-center mb-md">
                  <label className="font-label-md text-label-md text-on-surface-variant">Topic List</label>
                </div>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTopic()}
                    placeholder="Add topic..."
                    className="flex-1 bg-surface-container-low px-3 py-2 border border-outline rounded-lg font-body-sm text-body-sm outline-none focus:border-primary"
                  />
                  <button onClick={addTopic} className="w-10 h-10 bg-primary text-on-primary rounded-lg flex items-center justify-center hover:scale-105 transition-transform shrink-0">
                    <span className="material-symbols-outlined">add</span>
                  </button>
                </div>
                <div className="space-y-sm max-h-[300px] overflow-y-auto">
                  <AnimatePresence>
                    {topics.map((topic, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-surface-container-low p-3 rounded-lg flex flex-col gap-2 relative group border border-outline-variant/50">
                        <div className="flex justify-between items-center">
                          <span className="text-body-sm font-medium">{topic.name}</span>
                          <button onClick={() => removeTopic(i)} className="text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => updateComplexity(i, "Easy")} className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors", topic.complexity === "Easy" ? "bg-secondary-container text-on-secondary-container" : "border border-outline text-on-surface-variant hover:bg-surface-container-high")}>Easy</button>
                          <button onClick={() => updateComplexity(i, "Medium")} className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors", topic.complexity === "Medium" ? "bg-tertiary-container text-on-tertiary-container" : "border border-outline text-on-surface-variant hover:bg-surface-container-high")}>Med</button>
                          <button onClick={() => updateComplexity(i, "Hard")} className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors", topic.complexity === "Hard" ? "bg-error-container text-on-error-container" : "border border-outline text-on-surface-variant hover:bg-surface-container-high")}>Hard</button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
            <button
              onClick={buildPlan}
              disabled={loading || !examName || !deadline || topics.length === 0}
              className="w-full bg-primary text-on-primary py-4 rounded-xl font-headline-sm text-headline-sm flex items-center justify-center gap-2 mt-lg shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? <span className="material-symbols-outlined animate-spin">autorenew</span> : <span className="material-symbols-outlined">magic_button</span>}
              {loading ? "Building..." : "Build My Plan"}
            </button>
          </div>

          <div className="relative overflow-hidden rounded-xl h-48 group hidden lg:block">
            <img alt="Focus studying" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCAxBhY330lqItQoPfRHelNydnm9fOU6NpOkZdvjezQx6_blDjBUZnA_W0t9tiHaVjI978apEkAObdkAkKLHyfcwaWFZtbUiO6OrVy2ZJSHpRvXmLBPumohSGZdPSBh1xf6NitgHAZX_qEmBd2SrsKjG6as75ddoXIn9D9U94c1wyWdt5myaRnB9paM7sLmyGiOBzRSNLA2-_DMFLqu7s9fe1FZwI6sAAfmMnFQQRVVDPRiJRyZqXoQL_b_SKHtlk7dLxPvQ_Q2fKs" />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex flex-col justify-end p-md">
              <h4 className="text-white font-headline-sm text-headline-sm">Stay Consistent</h4>
              <p className="text-white/80 font-body-sm text-body-sm">Visualizing the finish line makes the journey easier.</p>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <section className="lg:col-span-8 space-y-lg flex flex-col">
          {!result && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant border-dashed p-12 text-center h-full min-h-[400px]">
              <span className="material-symbols-outlined text-[64px] text-primary/30 mb-4">event_note</span>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Ready to Reverse Engineer</h3>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">Enter your exam details and topics on the left to generate an optimized, day-by-day study protocol.</p>
            </div>
          )}
          
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-12 h-full min-h-[400px]">
               <LoadingSpinner message="Evaluating complexity vectors and temporal constraints..." />
            </div>
          )}

          {result && !loading && (
            <div className="bg-surface-container-lowest p-lg rounded-xl shadow-sm border border-outline-variant h-full">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-lg">
                <div>
                  <h3 className="font-headline-lg text-headline-lg">Study Roadmap</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">Reverse-engineered from {deadline}</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={handleSetReminders}
                    className="px-4 py-2 bg-secondary text-on-secondary shadow-sm rounded-md font-label-md text-label-md flex items-center gap-2 hover:opacity-90"
                  >
                    <span className="material-symbols-outlined text-[18px]">{reminderSet ? "notifications_active" : "notifications"}</span>
                    {reminderSet ? `Reminders Set (${scheduledCount})` : "Set Daily Reminders"}
                  </button>
                  <ShareCard 
                    title="Study Plan"
                    topic={examName}
                    content={result.plan.slice(0, 6).map(d => `${d.date}: ${d.topic}`)}
                    accentColor="#a855f7"
                    toolLabel="Study Plan"
                  />
                  <button
                    onClick={syncToCalendar}
                    disabled={calendarSyncing || calendarSynced}
                    className="px-4 py-2 bg-primary text-on-primary shadow-sm rounded-md font-label-md text-label-md flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
                  >
                    {calendarSynced ? (
                      <><span className="material-symbols-outlined text-[18px]">verified</span> Synced</>
                    ) : calendarSyncing ? (
                      <><span className="material-symbols-outlined text-[18px] animate-spin">sync</span> Syncing...</>
                    ) : (
                      <><span className="material-symbols-outlined text-[18px]">calendar_add_on</span> Sync Calendar</>
                    )}
                  </button>
                </div>
              </div>
              
              {result.warning && (
                <div className="bg-error-container/10 border border-error/20 p-md rounded-xl flex items-start gap-md text-error shadow-sm mb-lg">
                  <span className="material-symbols-outlined mt-0.5">warning</span>
                  <p className="font-body-sm text-body-sm font-bold leading-relaxed">{result.warning}</p>
                </div>
              )}
              {calendarError && (
                <div className="bg-error-container/10 border border-error/20 p-md rounded-xl flex items-start gap-md text-error shadow-sm mb-lg">
                  <span className="material-symbols-outlined mt-0.5">error</span>
                  <p className="font-body-sm text-body-sm font-bold leading-relaxed">{calendarError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-md h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {result.plan.map((day, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
                    className={cn(
                      "flex flex-col sm:flex-row gap-4 p-4 rounded-xl border transition-all",
                      day.completed ? "bg-surface-container-low border-outline-variant/30 opacity-70" : "bg-surface-container-lowest border-outline-variant hover:border-primary/40",
                      day.type === "revision" && !day.completed && "border-primary/30 shadow-sm"
                    )}
                  >
                    <div className="flex sm:flex-col items-center sm:items-start justify-between sm:w-24 shrink-0 gap-2">
                      <div className="text-center sm:text-left">
                        <div className="text-[10px] font-black uppercase text-on-surface-variant">{day.day}</div>
                        <div className={cn("text-lg font-black", day.completed ? "text-on-surface-variant" : "text-primary")}>
                          {new Date(day.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleDay(i)}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors",
                          day.completed ? "bg-secondary border-secondary text-on-secondary" : "border-outline-variant hover:border-primary/50 text-transparent"
                        )}
                      >
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      </button>
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={cn("font-headline-sm text-headline-sm", day.completed && "line-through opacity-70")}>{day.topic}</h4>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                          day.type === "study" ? "bg-primary-container text-on-primary-container" : day.type === "revision" ? "bg-tertiary-container text-on-tertiary-container" : "bg-surface-container-high text-on-surface-variant"
                        )}>
                          {day.type}
                        </span>
                      </div>
                      <p className={cn("font-body-sm text-body-sm", day.completed ? "text-on-surface-variant" : "text-on-surface")}>
                        {day.task}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-on-surface-variant">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        {day.hours} Hours
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--outline-variant, #c7c4d8);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
