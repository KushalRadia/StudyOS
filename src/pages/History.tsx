import React, { useState } from "react";
import {
  Zap,
  PenTool,
  MessagesSquare,
  Calendar,
  FileText,
  Mic,
  XOctagon,
  Share2,
  Trash2,
  ChevronRight,
  Clock,
  Search,
  Layers,
  History as HistoryIcon,
} from "lucide-react";
import { useHistory, deleteHistoryEntry } from "../hooks/useFirestore";
import { cn } from "../lib/utils";
import LoadingSpinner from "../components/LoadingSpinner";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface HistoryTab {
  id: string;
  label: string;
  icon: React.ElementType;
  collection: string;
}

const HISTORY_TABS: HistoryTab[] = [
  {
    id: "explainer",
    label: "Explainers",
    icon: Zap,
    collection: "explainerHistory",
  },
  {
    id: "writer",
    label: "Writing",
    icon: PenTool,
    collection: "writeUnblockHistory",
  },
  {
    id: "teach",
    label: "Mastery",
    icon: MessagesSquare,
    collection: "teachSessions",
  },
  {
    id: "deadline",
    label: "Study Plans",
    icon: Calendar,
    collection: "studyPlansHistory",
  },
  { id: "pyq", label: "Exam Papers", icon: FileText, collection: "pyqResults" },
  { id: "lectures", label: "Lectures", icon: Mic, collection: "lectureNotes" },
  { id: "errors", label: "Error Log", icon: XOctagon, collection: "errorLog" },
  { id: "nodes", label: "Concepts", icon: Share2, collection: "conceptMaps" },
  { id: "cards", label: "Flashcards", icon: Layers, collection: "flashcards" },
];

export default function History() {
  const [activeTab, setActiveTab] = useState(HISTORY_TABS[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const { data, loading } = useHistory(activeTab.collection, 50);

  const filteredData = data.filter((item) => {
    const searchStr = JSON.stringify(item).toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this entry?")) {
      await deleteHistoryEntry(activeTab.collection, id);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Recently";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-sm">
            <HistoryIcon className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-on-background">
              Activity Stream
            </h1>
            <p className="text-on-surface-variant font-medium">
              Your personal bank of AI-powered insights & study tools.
            </p>
          </div>
        </div>

        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant opacity-40 group-focus-within:text-primary group-focus-within:opacity-100 transition-all" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Query your history..."
            className="w-full pl-11 pr-4 py-4 bg-surface-container border border-outline-variant rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm"
          />
        </div>
      </header>

      <nav className="flex items-center gap-2 overflow-x-auto pb-6 -mx-4 px-4 scrollbar-hide border-b border-outline-variant/30">
        {HISTORY_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex items-center gap-2.5 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border-2",
              activeTab.id === tab.id
                ? "bg-primary border-primary text-on-primary shadow-xl shadow-primary/20"
                : "bg-surface-container-low border-outline-variant text-on-surface-variant hover:border-primary/40",
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="py-20">
          <LoadingSpinner
            message={`Reconstructing ${activeTab.label.toLowerCase()}...`}
          />
        </div>
      ) : filteredData.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-low py-24 text-center space-y-6 rounded-[40px] border-2 border-dashed border-outline-variant max-w-2xl mx-auto"
        >
          <div className="w-20 h-20 bg-surface-container-lowest flex items-center justify-center rounded-3xl mx-auto text-on-surface-variant/20 border border-outline-variant shadow-sm transform -rotate-6">
            <activeTab.icon className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-on-background">
              No records found
            </h3>
            <p className="text-on-surface-variant max-w-sm mx-auto font-medium">
              {searchTerm
                ? `The query "${searchTerm}" returned zero results in your ${activeTab.label.toLowerCase()} records.`
                : `You haven't initialized any ${activeTab.label.toLowerCase()} sessions yet.`}
            </p>
          </div>
          {!searchTerm && (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 btn-secondary font-bold"
            >
              Start New Session
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredData.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={item.id}
                className="group bg-surface-container-lowest p-6 rounded-[32px] border border-outline-variant hover:border-primary hover:shadow-2xl transition-all duration-300 h-fit flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-xl text-[10px] font-black text-on-surface-variant uppercase tracking-widest leading-none border border-outline-variant/30">
                      <Clock className="w-3 h-3 text-secondary" />
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, item.id)}
                      className="p-2 text-on-surface-variant/40 hover:text-error hover:bg-error-container/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-bold text-on-background text-xl leading-tight line-clamp-2">
                      {item.topic ||
                        item.title ||
                        item.question ||
                        item.examName ||
                        item.fileName ||
                        "Untitled Session"}
                    </h3>
                    <div className="text-sm text-on-surface-variant line-clamp-3 leading-relaxed font-medium opacity-80">
                      {item.explanation ||
                        item.summary ||
                        item.thoughts ||
                        item.rawTranscript ||
                        "Visual study resource generated."}
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-outline-variant/30 flex items-center justify-between">
                  <span className="px-3 py-1 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/10 rounded-full">
                    {activeTab.label}
                  </span>
                  <button className="text-primary font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 group/btn">
                    <span>Explore Insights</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
