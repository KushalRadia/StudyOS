import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import LanguagePicker from "./LanguagePicker";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          <div className="hidden md:flex items-center bg-surface-container rounded-full px-4 py-1.5 gap-2 border border-outline-variant focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search knowledge..."
              className="bg-transparent border-none focus:ring-0 text-body-sm font-body-sm p-0 w-48 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/panic"
              className="hidden md:flex items-center gap-1.5 bg-danger-light text-danger px-3 py-1.5 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-danger hover:text-white transition-colors"
            >
              <span className="text-sm">⏱️</span> Panic Mode
            </Link>
            
            <LanguagePicker />
            
            <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">
              notifications
            </button>
            <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">
              help
            </button>

            <div className="flex items-center gap-3 ml-2">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-on-surface leading-none">
                  {user?.displayName?.split(" ")[0]}
                </p>
                <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-widest mt-1">
                  Premium Scholar
                </p>
              </div>
              <div className="h-8 w-8 rounded-full overflow-hidden border border-outline-variant shadow-sm transition-transform hover:scale-105">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary text-white text-xs font-bold">
                    {user?.displayName?.charAt(0)}
                  </div>
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
            className="fixed inset-x-0 top-16 bg-surface border-b border-outline-variant z-40 p-4 lg:hidden shadow-xl"
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
                className="p-4 text-error rounded-lg font-bold flex items-center gap-2 hover:bg-error-container/10"
              >
                <span className="material-symbols-outlined">logout</span>
                <span>Logout</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
