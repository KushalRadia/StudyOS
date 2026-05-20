import { Link, useLocation } from "react-router-dom";
// I removed the MUI imports because they are unsupported.
// We use material-symbols-outlined class instead.
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";

const sidebarTools = [
  { name: "Explainer", icon: "bolt", path: "/tools/explainer" },
  { name: "Unblock", icon: "edit_note", path: "/tools/writeunblock" },
  { name: "Tutor", icon: "psychology", path: "/tools/teachmeback" },
  { name: "Planner", icon: "event_repeat", path: "/tools/deadline" },
  { name: "Solver", icon: "quiz", path: "/tools/pyqsolver" },
  { name: "Digest", icon: "audio_file", path: "/tools/lecturedigest" },
  { name: "Diagnose", icon: "error_outline", path: "/tools/whyamiwrong" },
  { name: "Mapper", icon: "account_tree", path: "/tools/conceptlinker" },
  { name: "Collab Hub", icon: "groups", path: "/hub" },
  { name: "Exam Autopsy", icon: "biotech", path: "/tools/exam-autopsy" },
  { name: "Study DNA", icon: "genetics", path: "/study-dna" },
];

export default function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <aside className="hidden lg:flex flex-col h-[calc(100vh-64px)] w-64 fixed left-0 top-16 border-r border-outline-variant dark:border-outline bg-surface-container-lowest dark:bg-surface-container-low shadow-md overflow-y-auto z-40 transition-colors duration-300">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-primary-container p-2 rounded-xl text-on-primary-container shadow-sm">
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              school
            </span>
          </div>
          <div>
            <h2 className="font-headline-sm text-headline-sm font-black text-primary tracking-tight">
              StudyOS AI
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant font-medium">
              Productivity Suite
            </p>
          </div>
        </div>

        <nav className="space-y-1">
          {sidebarTools.map((tool) => (
            <Link
              key={tool.path}
              to={tool.path}
              className={cn(
                "rounded-lg mx-2 my-1 flex items-center gap-3 px-4 py-3 transition-all duration-200 group",
                location.pathname === tool.path
                  ? "bg-primary-container dark:bg-primary text-on-primary-container dark:text-on-primary translate-x-1 shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-surface-container hover:translate-x-1",
              )}
            >
              <span
                className={cn(
                  "material-symbols-outlined",
                  location.pathname === tool.path && "fill-1",
                )}
                style={{
                  fontVariationSettings:
                    location.pathname === tool.path ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {tool.icon}
              </span>
              <span className="font-label-md text-label-md font-semibold tracking-wide">
                {tool.name}
              </span>
            </Link>
          ))}
        </nav>

        <div className="mt-8 px-4">
          <button className="w-full bg-primary text-on-primary py-3 rounded-xl font-label-md text-label-md font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95">
            Upgrade to Pro
          </button>
        </div>
      </div>

      <div className="mt-auto p-6 border-t border-outline-variant bg-surface-container-lowest/50 backdrop-blur-sm">
        <Link
          to="/settings"
          className="text-on-surface-variant hover:bg-surface-container-high hover:text-primary rounded-lg flex items-center gap-3 px-4 py-3 transition-all font-label-md text-label-md font-medium"
        >
          <span className="material-symbols-outlined">settings</span>
          <span>Settings</span>
        </Link>
        <button
          onClick={() => logout()}
          className="w-full text-on-surface-variant hover:bg-error-container/10 hover:text-error rounded-lg flex items-center gap-3 px-4 py-3 transition-all font-label-md text-label-md font-medium"
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
