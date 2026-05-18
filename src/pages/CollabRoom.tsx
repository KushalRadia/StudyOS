import React, { useState, useEffect, useRef, FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  collection,
  setDoc,
  deleteDoc,
  getDoc,
  arrayUnion,
} from "firebase/firestore";
import { db, auth } from "../hooks/useAuth";
import {
  Users,
  ArrowLeft,
  Plus,
  CheckCircle,
  Circle,
  Trash2,
  Share2,
  Clock,
  Send,
  Link as LinkIcon,
  ShieldCheck,
} from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import { motion, AnimatePresence } from "framer-motion";

interface PresenceUser {
  userId: string;
  displayName: string;
  photoURL?: string;
  lastSeen: any;
}

interface CollabSession {
  title: string;
  type: string;
  content: {
    tasks?: any[];
    nodes?: any[];
    links?: any[];
  };
  members: string[];
  createdBy: string;
}

export default function CollabRoom() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<CollabSession | null>(null);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState("");
  const [showShare, setShowShare] = useState(false);
  const navigate = useNavigate();
  const presenceInterval = useRef<any>(null);

  useEffect(() => {
    if (!sessionId || !auth.currentUser) return;

    // 1. Join the room (ensure UID is in members)
    const joinRoom = async () => {
      const docRef = doc(db, "collabSessions", sessionId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (!data.members.includes(auth.currentUser?.uid)) {
          await updateDoc(docRef, {
            members: arrayUnion(auth.currentUser?.uid),
          });
        }
      } else {
        navigate("/dashboard");
      }
    };
    joinRoom();

    // 2. Listen to document changes
    const unsubDoc = onSnapshot(
      doc(db, "collabSessions", sessionId),
      (snap) => {
        if (snap.exists()) {
          setSession(snap.data() as CollabSession);
          setLoading(false);
        } else {
          navigate("/dashboard");
        }
      },
    );

    // 3. Handle Presence
    const updatePresence = async () => {
      if (!auth.currentUser || !sessionId) return;
      const presenceRef = doc(
        db,
        `collabSessions/${sessionId}/presence`,
        auth.currentUser.uid,
      );
      await setDoc(presenceRef, {
        userId: auth.currentUser.uid,
        displayName:
          auth.currentUser.displayName ||
          auth.currentUser.email?.split("@")[0] ||
          "User",
        photoURL: auth.currentUser.photoURL || null,
        lastSeen: serverTimestamp(),
      });
    };

    updatePresence();
    presenceInterval.current = setInterval(updatePresence, 30000); // 30s heartbeat

    const unsubPresence = onSnapshot(
      collection(db, `collabSessions/${sessionId}/presence`),
      (snap) => {
        const now = Date.now();
        const activeUsers = snap.docs
          .map((d) => d.data() as PresenceUser)
          .filter((u) => {
            if (!u.lastSeen) return true;
            const lastSeenMs =
              u.lastSeen.toDate?.()?.getTime() || u.lastSeen.seconds * 1000;
            return now - lastSeenMs < 60000; // Only show users seen in last 1 minute
          });
        setPresence(activeUsers);
      },
    );

    // 4. Cleanup presence on unmount
    return () => {
      unsubDoc();
      unsubPresence();
      if (presenceInterval.current) clearInterval(presenceInterval.current);
      if (auth.currentUser && sessionId) {
        deleteDoc(
          doc(db, `collabSessions/${sessionId}/presence`, auth.currentUser.uid),
        ).catch(console.error);
      }
    };
  }, [sessionId, navigate]);

  const addTask = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!newTask.trim() || !session || !sessionId) return;

    const updatedTasks = [
      ...(session.content.tasks || []),
      {
        id: Date.now().toString(),
        text: newTask,
        completed: false,
        addedBy: auth.currentUser?.uid,
      },
    ];

    try {
      await updateDoc(doc(db, "collabSessions", sessionId), {
        "content.tasks": updatedTasks,
        updatedAt: serverTimestamp(),
      });
      setNewTask("");
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const toggleTask = async (taskId: string) => {
    if (!session || !sessionId) return;
    const updatedTasks = session.content.tasks?.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t,
    );

    await updateDoc(doc(db, "collabSessions", sessionId), {
      "content.tasks": updatedTasks,
      updatedAt: serverTimestamp(),
    });
  };

  const removeTask = async (taskId: string) => {
    if (!session || !sessionId) return;
    const updatedTasks = session.content.tasks?.filter((t) => t.id !== taskId);

    await updateDoc(doc(db, "collabSessions", sessionId), {
      "content.tasks": updatedTasks,
      updatedAt: serverTimestamp(),
    });
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Invite link copied to clipboard!");
    setShowShare(false);
  };

  if (loading || !session) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner message="Entering studio..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Collab Header */}
      <header className="bg-surface border-b border-outline-variant px-4 md:px-margin-desktop py-4 sticky top-0 z-40 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button
            onClick={() => navigate("/hub")}
            className="p-2 hover:bg-surface-container rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-on-surface-variant" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 text-on-background">
              {session.title}
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Live
              </span>
            </h1>
            <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest leading-none mt-1 opacity-60">
              {session.type?.replace("-", " ")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
          {/* Presence List */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3 mr-1">
              {presence.map((p) => (
                <div
                  key={p.userId}
                  title={p.displayName}
                  className="w-10 h-10 rounded-full border-4 border-surface shadow-sm ring-1 ring-outline-variant/30 bg-surface-container overflow-hidden"
                >
                  {p.photoURL ? (
                    <img
                      src={p.photoURL}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xs font-black">
                      {p.displayName.charAt(0)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <span className="text-[10px] font-black text-secondary uppercase tracking-widest bg-secondary/5 px-3 py-2 rounded-xl border border-secondary/10">
              {presence.length} Collaborating
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShare(true)}
              className="flex items-center gap-2 bg-primary/10 text-primary px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-primary/20 transition-all active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              Invite
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-margin-desktop space-y-8 h-full">
        {session.type === "study-plan" && (
          <div className="bg-surface-container-lowest rounded-[40px] border border-outline-variant shadow-sm overflow-hidden flex flex-col h-[calc(100vh-220px)] border-primary/5">
            <div className="p-8 md:p-10 border-b border-outline-variant/30 bg-surface-container/10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-on-background tracking-tight">
                    Real-time Task Graph
                  </h2>
                  <p className="text-on-surface-variant text-sm font-medium">
                    Coordinate your study group deliverables.
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-surface-container rounded-full text-[10px] font-bold text-on-surface-variant uppercase tracking-widest border border-outline-variant/30">
                  <ShieldCheck className="w-3 h-3 text-secondary" />
                  Group Authoritative
                </div>
              </div>
              <form onSubmit={addTask} className="relative">
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Allocate a new learning objective..."
                  className="w-full pl-14 pr-16 py-5 rounded-3xl bg-surface-container-lowest border-2 border-outline-variant/30 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold text-lg placeholder:opacity-30"
                />
                <Plus className="absolute left-5 top-1/2 -translate-y-1/2 text-primary w-6 h-6" />
                <button
                  type="submit"
                  disabled={!newTask.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-primary text-on-primary rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 disabled:grayscale transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-4 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {session.content.tasks?.map((task) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={task.id}
                    className={`group flex items-center gap-5 p-5 rounded-3xl border transition-all duration-300 ${task.completed ? "bg-surface-container-low border-transparent opacity-60" : "bg-surface-container-lowest border-outline-variant/30 shadow-sm hover:border-primary hover:shadow-md"}`}
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={`shrink-0 transition-all transform hover:scale-110 p-1 rounded-full ${task.completed ? "text-secondary bg-secondary/5" : "text-on-surface-variant/30 hover:text-primary"}`}
                    >
                      {task.completed ? (
                        <CheckCircle className="w-8 h-8" />
                      ) : (
                        <Circle className="w-8 h-8" />
                      )}
                    </button>
                    <span
                      className={`flex-1 text-lg font-bold transition-all ${task.completed ? "line-through text-on-surface-variant" : "text-on-surface"}`}
                    >
                      {task.text}
                    </span>
                    <button
                      onClick={() => removeTask(task.id)}
                      className="p-3 text-on-surface-variant opacity-0 group-hover:opacity-100 hover:text-error hover:bg-error-container/10 rounded-xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {(!session.content.tasks ||
                session.content.tasks.length === 0) && (
                <div className="text-center py-20 bg-surface-container/20 rounded-[40px] border-2 border-dashed border-outline-variant/30">
                  <div className="w-16 h-16 bg-surface-container-lowest rounded-3xl flex items-center justify-center mx-auto mb-4 border border-outline-variant/30 shadow-sm">
                    <Clock className="w-8 h-8 text-on-surface-variant opacity-30" />
                  </div>
                  <h3 className="text-xl font-bold text-on-background">
                    Broadcast a Task
                  </h3>
                  <p className="text-on-surface-variant mt-2 max-w-xs mx-auto">
                    Tasks added here will sync in real-time to everyone in the
                    room.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {session.type === "mind-map" && (
          <div className="h-[calc(100vh-220px)] bg-surface-container-lowest rounded-[40px] border border-outline-variant shadow-inner flex items-center justify-center relative overflow-hidden">
            <div className="grid-bg absolute inset-0 opacity-20 pointer-events-none" />
            <div className="text-center space-y-6 relative z-10 p-10">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-tertiary rounded-full blur-3xl opacity-10 animate-pulse" />
                <Share2 className="w-20 h-20 text-tertiary relative z-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-bold text-on-background tracking-tight">
                  Neural Mapping Engine
                </h3>
                <p className="text-on-surface-variant max-w-sm mx-auto font-medium">
                  This visual engine is in early access. Collaborative node
                  mapping with full real-time physics is coming next.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <span className="px-3 py-1 bg-tertiary/10 text-tertiary font-black text-[10px] uppercase tracking-widest rounded-full border border-tertiary/20">
                  Alpha v0.1
                </span>
                <span className="px-3 py-1 bg-surface-container text-on-surface-variant font-black text-[10px] uppercase tracking-widest rounded-full border border-outline-variant/30">
                  Waitlist Active
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Share Modal */}
      <AnimatePresence>
        {showShare && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShare(false)}
              className="absolute inset-0 bg-on-background/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-surface rounded-[40px] p-10 w-full max-w-md shadow-2xl space-y-8 border border-outline-variant/20"
            >
              <div className="space-y-2">
                <h3 className="text-3xl font-bold text-on-background tracking-tight">
                  Invite Scholars
                </h3>
                <p className="text-on-surface-variant font-medium">
                  Broadcast this encrypted link to your study group for instant
                  sync.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1 bg-surface-container border border-outline-variant rounded-2xl px-5 py-4 font-mono text-sm truncate select-all text-on-surface font-bold">
                    {window.location.href}
                  </div>
                  <button
                    onClick={copyInvite}
                    className="bg-primary text-on-primary p-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                  >
                    <LinkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowShare(false)}
                className="w-full btn-secondary py-4"
              >
                Close Portal
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .grid-bg {
          background-image: radial-gradient(var(--outline-variant) 1px, transparent 1px);
          background-size: 32px 32px;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--outline-variant);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--outline);
        }
      `}</style>
    </div>
  );
}
