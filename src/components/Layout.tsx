import React from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useLocation } from "react-router-dom";
import { cn } from "../lib/utils";

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isLanding = location.pathname === "/";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        {!isLanding && <Sidebar />}
        <main
          className={cn(
            "flex-1 transition-all duration-300",
            !isLanding && "lg:ml-64 p-margin-mobile md:p-margin-desktop",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
