import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth, db } from "../hooks/useAuth";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import LanguagePicker from "./LanguagePicker";
import ReactMarkdown from "react-markdown";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, profile, logout, theme, toggleTheme } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadSearchHistory = async () => {
    if (!user || user.uid === "dev-user-123" || historyItems.length > 0 || loadingSearch) return;
    setLoadingSearch(true);
    try {
      const q = query(
        collection(db, "history"),
        where("uid", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(80)
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistoryItems(items);
    } catch (e) {
      console.error("Failed to load search history:", e);
    } finally {
      setLoadingSearch(false);
    }
  };

  const filteredSearchItems = searchQuery.trim() === ""
    ? []
    : historyItems.filter(item => {
        const textToSearch = [
          item.topic,
          item.title,
          item.question,
          item.examName,
          item.fileName,
          item.explanation,
          item.summary,
          item.thoughts,
          item.rawTranscript
        ].filter(Boolean).join(" ").toLowerCase();
        return textToSearch.includes(searchQuery.toLowerCase());
      });

  const getToolDisplayName = (collectionName: string) => {
    switch (collectionName) {
      case "explainerHistory": return "Explainer";
      case "writeUnblockHistory": return "Unblock";
      case "teachSessions": return "Tutor";
      case "studyPlansHistory": return "Planner";
      case "pyqResults": return "Solver";
      case "lectureNotes": return "Digest";
      case "whyAmIWrong": return "Diagnose";
      case "conceptMaps": return "Mapper";
      case "examAutopsy": return "Exam Autopsy";
      default: return "Study Session";
    }
  };

  const getToolIcon = (collectionName: string) => {
    switch (collectionName) {
      case "explainerHistory": return "bolt";
      case "writeUnblockHistory": return "edit_note";
      case "teachSessions": return "psychology";
      case "studyPlansHistory": return "event_repeat";
      case "pyqResults": return "quiz";
      case "lectureNotes": return "audio_file";
      case "whyAmIWrong": return "error_outline";
      case "conceptMaps": return "account_tree";
      case "examAutopsy": return "biotech";
      default: return "school";
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (location.pathname === "/") return null;

  const navLinks = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Tools", path: "/dashboard#tools" },
    { name: "History", path: "/history" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 bg-surface border-b border-outline-variant shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-8">
          <Link
            to="/dashboard"
            className="font-headline-md text-headline-md font-bold text-primary tracking-tight"
          >
            StudyOS
          </Link>
          <nav className="hidden md:flex gap-6 items-center">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "font-label-md text-label-md transition-colors duration-200 pb-1 font-semibold",
                  location.pathname === link.path
                    ? "text-primary border-b-2 border-primary"
                    : "text-on-surface-variant hover:text-primary",
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden md:block" ref={searchRef}>
            <div className="flex items-center bg-surface-container rounded-full px-4 py-1.5 gap-2 border border-outline-variant focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all w-64 focus-within:w-80">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onFocus={() => {
                  setIsFocused(true);
                  loadSearchHistory();
                }}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search study history..."
                className="bg-transparent border-none focus:ring-0 text-body-sm font-body-sm p-0 w-full outline-none text-on-surface placeholder:text-on-surface-variant/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            <AnimatePresence>
              {isFocused && (searchQuery.trim() !== "" || loadingSearch) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 top-full mt-2 w-96 bg-surface border border-outline-variant shadow-xl rounded-2xl overflow-hidden z-50 animate-in fade-in"
                >
                  <div className="p-3 border-b border-outline-variant/50 bg-surface-container-low flex justify-between items-center">
                    <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-bold">
                      History Search
                    </h3>
                    {loadingSearch && (
                      <span className="text-[10px] text-primary font-bold animate-pulse">
                        Loading...
                      </span>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                    {loadingSearch ? (
                      <div className="py-8 text-center text-xs text-on-surface-variant font-medium">
                        Indexing study cache...
                      </div>
                    ) : filteredSearchItems.length === 0 ? (
                      <div className="py-8 text-center text-xs text-on-surface-variant font-medium">
                        {searchQuery ? "No matches in your archives" : "Type to filter study history..."}
                      </div>
                    ) : (
                      filteredSearchItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedItem(item);
                            setIsFocused(false);
                          }}
                          className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-surface-container transition-all text-left group"
                        >
                          <div className="bg-primary/10 text-primary p-2 rounded-lg group-hover:bg-primary group-hover:text-on-primary transition-colors shrink-0">
                            <span className="material-symbols-outlined text-[18px]">
                              {getToolIcon(item.toolCollection)}
                            </span>
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[9px] font-black uppercase tracking-wider text-secondary">
                                {getToolDisplayName(item.toolCollection)}
                              </span>
                              <span className="text-[9px] text-on-surface-variant opacity-60">
                                {item.createdAt ? new Date(item.createdAt.toDate ? item.createdAt.toDate() : item.createdAt).toLocaleDateString() : "Recent"}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-on-surface truncate">
                              {item.topic || item.title || item.question || item.examName || item.fileName || "Untitled Resource"}
                            </h4>
                            <p className="text-[11px] text-on-surface-variant line-clamp-1 opacity-70">
                              {item.explanation || item.summary || item.thoughts || item.rawTranscript || "Study resource generated."}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/panic"
              className="hidden md:flex items-center gap-1.5 bg-danger-light text-danger px-3 py-1.5 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-danger hover:text-white transition-colors"
            >
              <span className="text-sm">⏱️</span> Panic Mode
            </Link>
            
            <LanguagePicker />

            <button
              onClick={toggleTheme}
              className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? (
                <span className="material-symbols-outlined text-[20px] text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>light_mode</span>
              ) : (
                <span className="material-symbols-outlined text-[20px] text-indigo-500" style={{ fontVariationSettings: "'FILL' 1" }}>dark_mode</span>
              )}
            </button>
            
            <div className="flex items-center gap-3 ml-2">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-on-surface leading-none">
                  {profile?.name?.split(" ")[0] || user?.displayName?.split(" ")[0]}
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest mt-1">
                  {profile?.isPro ? (
                    <span className="text-amber-500 flex items-center gap-0.5">
                      ★ Pro Scholar
                    </span>
                  ) : (
                    <span className="text-on-surface-variant opacity-70">
                      Basic Scholar
                    </span>
                  )}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full overflow-hidden border border-outline-variant shadow-sm transition-transform hover:scale-105 bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
                {profile?.photoURL || user?.photoURL ? (
                  <img
                    src={profile?.photoURL || user?.photoURL || ""}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (profile?.name || user?.displayName || "U").charAt(0)
                )}
              </div>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-on-surface-variant hover:bg-surface-container rounded-md"
            >
              <span className="material-symbols-outlined">
                {mobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-16 bg-surface border-b border-outline-variant z-40 p-4 lg:hidden shadow-xl animate-in slide-in-from-top-16"
          >
            <div className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-4 rounded-lg font-bold flex items-center justify-between ${
                    location.pathname === link.path
                      ? "bg-primary-container/10 text-primary"
                      : "hover:bg-surface-container"
                  }`}
                >
                  <span>{link.name}</span>
                  <span className="material-symbols-outlined">
                    chevron_right
                  </span>
                </Link>
              ))}
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="p-4 rounded-lg font-bold flex items-center justify-between hover:bg-surface-container"
              >
                <span>Settings</span>
                <span className="material-symbols-outlined">
                  chevron_right
                </span>
              </Link>
              <Link
                to="/panic"
                onClick={() => setMobileMenuOpen(false)}
                className="p-4 rounded-lg font-bold flex items-center justify-between text-danger hover:bg-danger-light"
              >
                <div className="flex items-center gap-2">
                  <span>⏱️</span>
                  <span>Panic Mode</span>
                </div>
                <span className="material-symbols-outlined">
                  chevron_right
                </span>
              </Link>
              <hr className="my-2 border-outline-variant" />
              <button
                onClick={handleLogout}
                className="p-4 text-error rounded-lg font-bold flex items-center gap-2 hover:bg-error-container/10 w-full text-left"
              >
                <span className="material-symbols-outlined">logout</span>
                <span>Logout</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-outline-variant max-w-2xl w-full rounded-[32px] shadow-2xl p-6 flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary p-2.5 rounded-xl">
                    <span className="material-symbols-outlined text-[24px]">
                      {getToolIcon(selectedItem.toolCollection)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-secondary leading-none">
                      {getToolDisplayName(selectedItem.toolCollection)}
                    </span>
                    <h3 className="text-lg font-bold text-on-surface leading-tight mt-0.5">
                      {selectedItem.topic || selectedItem.title || selectedItem.question || selectedItem.examName || selectedItem.fileName || "Study Session Insights"}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1.5 hover:bg-surface-container rounded-lg text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-6 space-y-4 pr-1 text-on-surface leading-relaxed text-sm">
                <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/30 text-xs text-on-surface-variant font-medium flex items-center justify-between">
                  <span>Created: {selectedItem.createdAt ? new Date(selectedItem.createdAt.toDate ? selectedItem.createdAt.toDate() : selectedItem.createdAt).toLocaleString() : "Recent"}</span>
                  {selectedItem.minutes && <span>Duration: {selectedItem.minutes} mins</span>}
                </div>

                <div className="prose max-w-none text-on-surface dark:prose-invert">
                  <ReactMarkdown>
                    {selectedItem.explanation || selectedItem.summary || selectedItem.result || selectedItem.thoughts || selectedItem.rawTranscript || "Visual Study Map resources were generated during this session."}
                  </ReactMarkdown>
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant/50 flex items-center justify-between shrink-0">
                <button
                  onClick={async () => {
                    const text = selectedItem.explanation || selectedItem.summary || selectedItem.result || selectedItem.thoughts || selectedItem.rawTranscript || "";
                    await navigator.clipboard.writeText(text);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 border border-outline-variant rounded-xl hover:bg-surface-container text-xs font-bold transition-all text-on-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copied ? "check" : "content_copy"}
                  </span>
                  <span>{copied ? "Copied!" : "Copy Insights"}</span>
                </button>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="btn-primary py-2 px-6 text-xs"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
