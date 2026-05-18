import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth, db } from "../hooks/useAuth";
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";

interface ToolDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
}

const tools: ToolDef[] = [
  { id: "explainer", title: "Explainer", description: "Simplify complex topics instantly.", icon: "bolt", path: "/tools/explainer" },
  { id: "writeunblock", title: "Unblock", description: "Stuck on a problem? Get a hint.", icon: "edit_note", path: "/tools/writeunblock" },
  { id: "teachmeback", title: "Tutor", description: "Personalized AI learning assistant.", icon: "psychology", path: "/tools/teachmeback" },
  { id: "deadline", title: "Planner", description: "Optimize your study schedule.", icon: "event_repeat", path: "/tools/deadline" },
  { id: "pyqsolver", title: "Solver", description: "Step-by-step math & logic solutions.", icon: "quiz", path: "/tools/pyqsolver" },
  { id: "lecturedigest", title: "Digest", description: "Summarize long lectures & PDF's.", icon: "audio_file", path: "/tools/lecturedigest" },
  { id: "whyamiwrong", title: "Diagnose", description: "Identify gaps in your knowledge.", icon: "error_outline", path: "/tools/whyamiwrong" },
  { id: "conceptlinker", title: "Mapper", description: "Visualize connections between ideas.", icon: "account_tree", path: "/tools/conceptlinker" },
  { id: "snapsolve", title: "Snap & Solve", description: "Photo any question and get an instant AI solution.", icon: "photo_camera", path: "/tools/snapsolve" },
  { id: "hub", title: "Collab Hub", description: "Study live with peers and expert AI.", icon: "groups", path: "/hub" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [toolUsage, setToolUsage] = useState<Record<string, number>>({});
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setToolUsage(userDoc.data().toolUsage || {});
        }

        const historyQuery = query(
          collection(db, "history"),
          where("uid", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(5),
        );
        const historySnap = await getDocs(historyQuery);
        const activities = historySnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate() || new Date(),
        }));
        setRecentActivity(activities);

        let currentStreak = 0;
        let checkDate = new Date();
        checkDate.setHours(0,0,0,0);
        
        const uniqueDates = new Set(activities.map(a => {
          const d = new Date(a.createdAt);
          d.setHours(0,0,0,0);
          return d.getTime();
        }));
        
        while (uniqueDates.has(checkDate.getTime())) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }
        setStreak(currentStreak);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };
    fetchData();
  }, [user]);

  return (
    <div className="space-y-lg">
      {/* Welcome Section */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-md bg-surface-container-lowest p-xl rounded-2xl shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-1px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-lg">
          <div className="relative">
            {user?.photoURL ? (
              <img
                alt="User profile photo"
                className="h-20 w-20 rounded-full border-4 border-primary-fixed shadow-sm object-cover"
                src={user.photoURL}
              />
            ) : (
              <div className="h-20 w-20 rounded-full border-4 border-primary-fixed shadow-sm bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                {user?.displayName?.charAt(0) || "U"}
              </div>
            )}
            <div className="absolute bottom-0 right-0 h-6 w-6 bg-secondary rounded-full border-2 border-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[12px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
            </div>
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-background">Welcome back, {user?.displayName?.split(" ")[0] || "Julian"}!</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">{recentActivity.length > 0 ? "You have recent activity. Keep the momentum going!" : "Start using your study tools to build momentum."}</p>
          </div>
        </div>
        <div className="flex items-center gap-md">
          <div className="text-right hidden md:block">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Current Streak</p>
            <p className="font-headline-sm text-headline-sm text-primary">{streak > 0 ? `${streak} Day${streak !== 1 ? 's' : ''} 🔥` : "Start Streak 🎯"}</p>
          </div>
          <button className="bg-primary-container text-on-primary-container px-lg py-sm rounded-lg font-label-md text-label-md hover:scale-95 transition-all">
            Study Dashboard
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-gutter items-start">
        {/* Central Grid (8 Tool Cards) */}
        <div className="xl:col-span-3">
          
          <Link to="/panic" className="block w-full bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-6 mb-8 text-white shadow-lg hover:shadow-red-500/25 hover:-translate-y-1 transition-all group overflow-hidden relative">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl animate-pulse">⏱️</span>
                  <h3 className="text-2xl font-black tracking-tight">Panic Mode</h3>
                </div>
                <p className="text-white/80 font-medium">Exam in a few hours? Let's make every minute count.</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-red-600 transition-colors">
                <span className="material-symbols-outlined font-bold">arrow_forward</span>
              </div>
            </div>
          </Link>

          <div className="flex items-center justify-between mb-md px-2">
            <h3 className="font-headline-sm text-headline-sm text-on-background">Study Tools</h3>
            <Link to="/history" className="text-primary font-label-md text-label-md hover:underline">View All</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md">
            {tools.map((tool) => (
              <Link to={tool.path} key={tool.id} className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant hover:border-primary hover:shadow-md transition-all cursor-pointer group block">
                <div className="bg-primary-container/10 w-12 h-12 rounded-lg flex items-center justify-center mb-sm group-hover:bg-primary-container transition-colors">
                  <span className="material-symbols-outlined text-primary group-hover:text-on-primary-container">{tool.icon}</span>
                </div>
                <h4 className="font-label-md text-label-md text-on-surface mb-xs">{tool.title}</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-md line-clamp-1">{tool.description}</p>
                <div className="flex items-center justify-between pt-sm border-t border-outline-variant/30">
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-tighter bg-secondary-container/20 px-2 py-0.5 rounded">Used {toolUsage[tool.id] || 0}x</span>
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Sidebar (Recent Activity) */}
        <aside className="space-y-lg">
          <div className="bg-surface-container-lowest p-lg rounded-2xl border border-outline-variant shadow-sm h-full">
            <div className="flex items-center gap-2 mb-xl">
              <span className="material-symbols-outlined text-primary">history</span>
              <h3 className="font-headline-sm text-headline-sm text-on-background">Recent Activity</h3>
            </div>
            <div className="space-y-lg relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-outline-variant">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, i) => (
                  <div key={activity.id} className="relative pl-8">
                    <div className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center border-4 border-surface-container-lowest ${i === 0 ? "bg-primary" : "bg-outline"}`}>
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                    <p className="font-label-md text-label-md text-on-surface">
                      {activity.toolName || activity.action || "Study Session"}
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))
              ) : (
                <div className="relative pl-8">
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-outline flex items-center justify-center border-4 border-surface-container-lowest">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
                  <p className="font-label-md text-label-md text-on-surface">No recent activity</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Just now</p>
                </div>
              )}
            </div>
            <Link to="/history" className="block text-center w-full mt-xl py-3 border border-outline-variant rounded-xl font-label-md text-label-md text-on-surface-variant hover:bg-surface-container transition-colors">
              View Full History
            </Link>
          </div>

          {/* Contextual Promo/Tip */}
          <div className="bg-tertiary-container text-on-tertiary-container p-lg rounded-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="font-headline-sm text-headline-sm mb-xs">Pro Tip</h4>
              <p className="font-body-sm text-body-sm opacity-90">Connect your Google Calendar to sync your exam dates automatically with the Planner.</p>
              <button className="mt-md bg-white text-tertiary px-4 py-2 rounded-lg font-label-md text-label-md">Connect Now</button>
            </div>
            <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-9xl opacity-10 rotate-12" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
