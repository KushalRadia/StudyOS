import React, { useState, useEffect, FormEvent, MouseEvent } from "react";
import {
  Users,
  Plus,
  ArrowRight,
  Trash2,
  Calendar,
  Share2,
  Search,
  Filter,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "../hooks/useAuth";
import LoadingSpinner from "../components/LoadingSpinner";
import { motion, AnimatePresence } from "framer-motion";

export default function CollaborationHub() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"study-plan" | "mind-map">(
    "study-plan",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "collabSessions"),
      where("members", "array-contains", auth.currentUser.uid),
      orderBy("updatedAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSessions(docs);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching collab sessions:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !auth.currentUser) return;

    try {
      const docRef = await addDoc(collection(db, "collabSessions"), {
        title: newTitle,
        type: newType,
        content:
          newType === "study-plan"
            ? { tasks: [] }
            : { topics: [], connections: [] },
        createdBy: auth.currentUser.uid,
        members: [auth.currentUser.uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setShowCreate(false);
      setNewTitle("");
      navigate(`/collab/${docRef.id}`);
    } catch (error) {
      console.error("Error creating session:", error);
    }
  };

  const handleDelete = async (e: MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this session?")) {
      await deleteDoc(doc(db, "collabSessions", id));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner message="Syncing collaboration hub..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-secondary-container/10 text-secondary rounded-2xl flex items-center justify-center shadow-sm">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-on-background">
              Collab Hub
            </h1>
            <p className="text-on-surface-variant font-medium">
              Coordinate with peers in real-time rooms.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          <span>New Studio Room</span>
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant opacity-40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter current rooms..."
            className="w-full pl-11 pr-4 py-3 bg-surface-container border border-outline-variant rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-sm"
          />
        </div>
        <button className="px-4 py-3 bg-surface-container-high border border-outline-variant rounded-xl text-on-surface-variant font-bold text-sm flex items-center gap-2 hover:bg-surface-container transition-colors">
          <Filter className="w-4 h-4" />
          By Type
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredSessions.map((session) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={session.id}
              onClick={() => navigate(`/collab/${session.id}`)}
              className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant hover:border-primary hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col justify-between min-h-[220px]"
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${session.type === "study-plan" ? "bg-primary/5 text-primary" : "bg-tertiary/5 text-tertiary"}`}
                  >
                    {session.type === "study-plan" ? (
                      <Calendar className="w-6 h-6" />
                    ) : (
                      <Share2 className="w-6 h-6" />
                    )}
                  </div>
                  {session.createdBy === auth.currentUser?.uid && (
                    <button
                      onClick={(e) => handleDelete(e, session.id)}
                      className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <h3 className="text-xl font-bold text-on-surface group-hover:text-primary transition-colors truncate mb-1">
                  {session.title}
                </h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">
                  {session.type === "study-plan"
                    ? "Collaborative Roadmap"
                    : "Connected Mind Map"}
                </span>
              </div>

              <div className="flex justify-between items-center mt-8 pt-6 border-t border-outline-variant/30">
                <div className="flex -space-x-3">
                  {session.members.slice(0, 4).map((m: string, i: number) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-surface-container-lowest bg-surface-container flex items-center justify-center text-[10px] font-bold text-on-surface-variant shadow-sm overflow-hidden"
                    >
                      <div className="w-full h-full flex items-center justify-center bg-outline-variant/20">
                        {m.substring(0, 1).toUpperCase()}
                      </div>
                    </div>
                  ))}
                  {session.members.length > 4 && (
                    <div className="w-8 h-8 rounded-full border-2 border-surface-container-lowest bg-primary-container/10 text-primary flex items-center justify-center text-[10px] font-black shadow-sm">
                      +{session.members.length - 4}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <span>Enter Room</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {sessions.length === 0 && (
          <div className="col-span-full py-24 text-center bg-surface-container-low rounded-3xl border-2 border-dashed border-outline-variant/50">
            <Users className="w-16 h-16 text-on-surface-variant opacity-20 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-on-surface">
              No active studios
            </h3>
            <p className="text-on-surface-variant mt-2 max-w-sm mx-auto">
              Collaboration is where mastery happens. Create a room to start
              working with your peers.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-8 btn-secondary font-bold"
            >
              Start New Room
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreate(false)}
              className="absolute inset-0 bg-on-background/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-surface rounded-[40px] p-10 w-full max-w-xl shadow-2xl space-y-8 border border-outline-variant/20"
            >
              <div className="space-y-2">
                <h3 className="text-3xl font-bold text-on-background tracking-tight">
                  Open Studio Room
                </h3>
                <p className="text-on-surface-variant font-medium">
                  Invite your peers to collaborate on a visual resource.
                </p>
              </div>

              <form onSubmit={handleCreate} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">
                    Studio Name
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Advanced Bio Group..."
                    className="w-full px-6 py-4 rounded-2xl bg-surface-container border border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-lg"
                    autoFocus
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">
                    Collaboration Mode
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setNewType("study-plan")}
                      className={`p-6 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center gap-3 ${newType === "study-plan" ? "border-primary bg-primary/5 ring-4 ring-primary/5" : "border-outline-variant hover:border-primary/40 opacity-60"}`}
                    >
                      <div
                        className={`p-4 rounded-2xl ${newType === "study-plan" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}
                      >
                        <Calendar className="w-8 h-8" />
                      </div>
                      <div className="text-center">
                        <span className="block font-bold text-on-surface">
                          Study Plan
                        </span>
                        <span className="text-[10px] uppercase font-black tracking-widest opacity-40">
                          Roadmaps
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewType("mind-map")}
                      className={`p-6 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center gap-3 ${newType === "mind-map" ? "border-tertiary bg-tertiary/5 ring-4 ring-tertiary/5" : "border-outline-variant hover:border-tertiary/40 opacity-60"}`}
                    >
                      <div
                        className={`p-4 rounded-2xl ${newType === "mind-map" ? "bg-tertiary text-on-tertiary" : "bg-surface-container text-on-surface-variant"}`}
                      >
                        <Share2 className="w-8 h-8" />
                      </div>
                      <div className="text-center">
                        <span className="block font-bold text-on-surface">
                          Mind Map
                        </span>
                        <span className="text-[10px] uppercase font-black tracking-widest opacity-40">
                          Connections
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="flex-1 px-8 py-4 rounded-2xl font-bold bg-surface-container hover:bg-outline-variant/30 text-on-surface-variant transition-colors"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={!newTitle.trim()}
                    className="flex-[2] btn-primary py-4"
                  >
                    Launch Studio
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
