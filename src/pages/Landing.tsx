import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Loader2, Brain, Zap, PenTool, MessagesSquare, Calendar, FileText,
  Mic, XOctagon, Share2, Users, Layers, ArrowRight, ChevronDown,
  Star, CheckCircle, TrendingUp, Clock, Award, Target, BookOpen, Flame
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// --- Sub-components ---
interface FloatingCardProps {
  icon: React.ElementType;
  label: string;
  description: string;
  accentColor: string;
  bgColor: string;
  style: React.CSSProperties;
  delay: number;
}

function FloatingCard({ icon: Icon, label, description, accentColor, bgColor, style, delay }: FloatingCardProps) {
  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: "white",
        borderRadius: "16px",
        padding: "12px 18px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.15)",
        animation: `float 5s ease-in-out ${delay}s infinite`,
        zIndex: 1,
        ...style,
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: bgColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} color={accentColor} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#1a1a2e", lineHeight: 1.2 }}>{label}</p>
        <p style={{ margin: 0, fontSize: 10, color: "#888", marginTop: 2 }}>{description}</p>
      </div>
    </div>
  );
}

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        let current = 0;
        const increment = target / 60;
        const timer = setInterval(() => {
          current = Math.min(current + increment, target);
          setCount(Math.floor(current));
          if (current >= target) clearInterval(timer);
        }, 16);
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// --- Data constants ---
const TOOLS = [
  { name: "Explainer", icon: Zap, accentColor: "#ef4444", bgColor: "rgba(239,68,68,0.1)", description: "Simplify complex topics instantly." },
  { name: "Unblock", icon: PenTool, accentColor: "#3b82f6", bgColor: "rgba(59,130,246,0.1)", description: "Stuck on a problem? Get a hint." },
  { name: "Tutor", icon: MessagesSquare, accentColor: "#22c55e", bgColor: "rgba(34,197,94,0.1)", description: "Personalized AI learning assistant." },
  { name: "Planner", icon: Calendar, accentColor: "#a855f7", bgColor: "rgba(168,85,247,0.1)", description: "Optimize your study schedule." },
  { name: "Solver", icon: FileText, accentColor: "#f97316", bgColor: "rgba(249,115,22,0.1)", description: "Step-by-step math & logic solutions." },
  { name: "Digest", icon: Mic, accentColor: "#06b6d4", bgColor: "rgba(6,182,212,0.1)", description: "Summarize long lectures & PDF's." },
  { name: "Diagnose", icon: XOctagon, accentColor: "#f43f5e", bgColor: "rgba(244,63,94,0.1)", description: "Identify gaps in your knowledge." },
  { name: "Mapper", icon: Share2, accentColor: "#6366f1", bgColor: "rgba(99,102,241,0.1)", description: "Visualize connections between ideas." },
  { name: "Snap & Solve", icon: Layers, accentColor: "#f59e0b", bgColor: "rgba(245,158,11,0.1)", description: "Photo any question and get instant AI solution." },
  { name: "Collab Hub", icon: Users, accentColor: "#8b5cf6", bgColor: "rgba(139,92,246,0.1)", description: "Study live with peers and expert AI." },
  { name: "Exam Autopsy", icon: BookOpen, accentColor: "#ec4899", bgColor: "rgba(236,72,153,0.1)", description: "Full cognitive post-mortem of your mistakes." },
  { name: "Study DNA", icon: Target, accentColor: "#14b8a6", bgColor: "rgba(20,184,166,0.1)", description: "Discover your unique learning archetype." }
];

const TESTIMONIALS = [
  {
    name: "Priya S.", role: "JEE Aspirant", initials: "PS", color: "#a855f7",
    text: "DeadlineReverse literally saved my Physics prep. 3 weeks left and it built me a day-by-day plan instantly. I actually followed it.",
    stars: 5
  },
  {
    name: "Arjun M.", role: "UPSC Candidate", initials: "AM", color: "#3b82f6",
    text: "TeachMeBack found gaps in Indian Polity I had no idea existed. After 3 sessions, my score in mock tests jumped 15 marks.",
    stars: 5
  },
  {
    name: "Tanvi R.", role: "CA Foundation", initials: "TR", color: "#22c55e",
    text: "LectureDigest turned my 2-hour accounting lecture into structured notes in under a minute. This alone makes it worth using.",
    stars: 5
  },
  {
    name: "Rahul K.", role: "GATE Aspirant", initials: "RK", color: "#ef4444",
    text: "WhyAmIWrong told me I keep confusing Bode plots with Nyquist diagrams. One diagnosis fixed a 3-month pattern of wrong answers.",
    stars: 5
  }
];

const COMPARE_ROWS = [
  { feature: "WhyAmIWrong (mistake root-cause engine)", studyos: true, others: false },
  { feature: "TeachMeBack (Socratic gap detection)", studyos: true, others: false },
  { feature: "DeadlineReverse (exam-date reverse planning)", studyos: true, others: false },
  { feature: "PYQSolver (past-year paper solving)", studyos: true, others: false },
  { feature: "LectureDigest (audio-to-structured notes)", studyos: true, others: false },
  { feature: "ConceptLinker (knowledge graph mapping)", studyos: true, others: false },
  { feature: "Spaced recall flashcards", studyos: true, others: true },
  { feature: "Live peer + AI study collaboration", studyos: true, others: false }
];

const MARQUEE_ITEMS = [
  { icon: Brain, text: "12 AI Tools" },
  { icon: Flame, text: "2,400+ Students" },
  { icon: TrendingUp, text: "87% Score Improvement" },
  { icon: Clock, text: "Save 3 Hours Daily" },
  { icon: Award, text: "Built with Gemini 2.0" },
  { icon: Target, text: "Exam-Focused Prep" },
  { icon: CheckCircle, text: "Zero Fluff Learning" },
  { icon: BookOpen, text: "Every Subject Covered" }
];

// --- Main component ---
export default function Landing() {
  const navigate = useNavigate();
  const { login, loginDev, user } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  // Mouse parallax effect
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      setMousePos({
        x: ((e.clientX - rect.left) / rect.width - 0.5) * 40,
        y: ((e.clientY - rect.top) / rect.height - 0.5) * 40,
      });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  // Testimonial auto-advance
  useEffect(() => {
    const t = setInterval(() => setActiveTestimonial(p => (p + 1) % TESTIMONIALS.length), 4000);
    return () => clearInterval(t);
  }, []);

  const handleLogin = async () => {
    if (user) { navigate("/dashboard"); return; }
    setLoggingIn(true);
    setLoginError(null);
    try {
      await login();
      navigate("/dashboard");
    } catch (error: any) {
      if (error.code === "auth/popup-closed-by-user") setLoginError(null);
      else if (error.code === "auth/popup-blocked") setLoginError("Pop-up blocked. Please allow pop-ups and try again.");
      else if (error.code === "auth/unauthorized-domain") setLoginError("Error: Localhost is not authorized in Firebase. Add it to Authentication > Settings > Authorized Domains.");
      else if (error.code === "auth/invalid-api-key") setLoginError("Firebase API key is invalid. Please check your .env configuration or firebase-applet-config.json.");
      else setLoginError(error.message || "Sign-in failed. Please try again.");
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "white", overflowX: "hidden", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&family=DM+Serif+Display:ital@1&display=swap');

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
        }
        @keyframes shimmer {
          0% { background-position: 0% center; }
          100% { background-position: 300% center; }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes grain {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-2%, -3%); }
          50% { transform: translate(3%, 1%); }
          75% { transform: translate(-1%, 4%); }
        }
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }

        .text-shimmer {
          background: linear-gradient(90deg, #ffffff 0%, #a78bfa 30%, #38bdf8 65%, #ffffff 100%);
          background-size: 300% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 5s linear infinite;
        }
        .marquee-inner {
          display: flex;
          gap: 48px;
          white-space: nowrap;
          animation: marquee 35s linear infinite;
          align-items: center;
          flex-shrink: 0;
        }
        .marquee-inner:hover { animation-play-state: paused; }
        .tool-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 24px;
          cursor: pointer;
          transition: all 0.35s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .tool-card:hover {
          transform: translateY(-6px) scale(1.02);
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.14);
          box-shadow: 0 24px 48px rgba(0,0,0,0.4);
        }
        .tool-card .tool-cta { opacity: 0; transition: opacity 0.2s; }
        .tool-card:hover .tool-cta { opacity: 1; }
        .btn-primary-landing {
          background: linear-gradient(135deg, #4d41df, #7c3aed);
          color: white;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .btn-primary-landing:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 60px rgba(77,65,223,0.5);
        }
        .btn-primary-landing:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        .glass-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 24px;
        }
        .glass-card-hover {
          transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .glass-card-hover:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.12);
          transform: translateY(-4px);
        }
        .glow-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }
        .grain-overlay {
          position: absolute;
          inset: -50%;
          width: 200%;
          height: 200%;
          opacity: 0.04;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          animation: grain 0.4s steps(1) infinite;
        }
        .nav-fixed {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          background: rgba(10,10,15,0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 16px 24px;
        }
      `}</style>
      
      {/* 1. Navbar */}
      <nav className="nav-fixed" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #4d41df, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={24} color="white" />
          </div>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontStyle: 'italic', fontSize: 24, fontWeight: 'normal', color: 'white' }}>StudyOS</span>
        </div>
        <div className="hidden md:flex" style={{ gap: '32px' }}>
          <a href="#tools" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='white'} onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.4)'}>Tools</a>
          <a href="#how-it-works" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='white'} onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.4)'}>How it works</a>
          <a href="#compare" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='white'} onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.4)'}>Compare</a>
        </div>
        <div>
          <button onClick={handleLogin} disabled={loggingIn} className="btn-primary-landing" style={{ padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600 }}>
            {loggingIn ? "Connecting..." : "Get Started Free"}
          </button>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section ref={heroRef} style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingTop: '80px', paddingBottom: '40px' }}>
        <div className="grain-overlay"></div>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px', zIndex: 0 }}></div>
        
        {/* Glow orbs */}
        <div className="glow-orb" style={{ width: '600px', height: '600px', background: 'rgba(109,40,217,0.3)', filter: 'blur(100px)', top: '50%', left: '50%', transform: `translate(calc(-50% + ${mousePos.x}px), calc(-50% + ${mousePos.y}px))`, zIndex: 0 }}></div>
        <div className="glow-orb" style={{ width: '500px', height: '500px', background: 'rgba(56,189,248,0.15)', filter: 'blur(100px)', top: '30%', left: '20%', zIndex: 0 }}></div>
        <div className="glow-orb" style={{ width: '450px', height: '450px', background: 'rgba(74,222,128,0.1)', filter: 'blur(100px)', bottom: '20%', right: '20%', zIndex: 0 }}></div>

        {/* Floating cards */}
        <div className="hidden lg:block">
          <FloatingCard icon={Zap} label="5-Min Explainer" description="Essentials in minutes" accentColor="#ef4444" bgColor="rgba(239,68,68,0.1)" style={{ left: '5%', top: '20%' }} delay={0} />
          <FloatingCard icon={MessagesSquare} label="TeachMeBack" description="Teach to master" accentColor="#22c55e" bgColor="rgba(34,197,94,0.1)" style={{ left: '3%', top: '65%' }} delay={1} />
          <FloatingCard icon={FileText} label="PYQSolver" description="Past papers decoded" accentColor="#f97316" bgColor="rgba(249,115,22,0.1)" style={{ right: '4%', top: '18%' }} delay={1.8} />
          <FloatingCard icon={XOctagon} label="WhyAmIWrong" description="Find your exact gap" accentColor="#f43f5e" bgColor="rgba(244,63,94,0.1)" style={{ right: '3%', top: '62%' }} delay={0.6} />
        </div>

        {/* Hero Content */}
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: '1000px', padding: '0 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1], delay: 0 }} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '99px', padding: '8px 16px', marginBottom: '32px' }}>
            <div style={{ position: 'relative', width: '8px', height: '8px' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#4ade80' }} className="animate-ping"></div>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#4ade80' }}></div>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>12 AI Tools · Powered by Gemini</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1], delay: 0.1 }} style={{ fontSize: 'clamp(56px, 8vw, 110px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.03em', margin: '0 0 24px 0' }}>
            Stop studying<br />
            <span style={{ fontFamily: "'DM Serif Display', serif", fontStyle: 'italic', fontWeight: 'normal' }} className="text-shimmer">harder. </span>
            Study <span style={{ fontFamily: "'DM Serif Display', serif", fontStyle: 'italic', fontWeight: 'normal', color: 'white' }}>smarter.</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1], delay: 0.2 }} style={{ fontSize: '18px', color: 'rgba(255,255,255,0.45)', maxWidth: '520px', margin: '0 auto 40px auto', lineHeight: 1.6 }}>
            The only study platform built around how your brain actually learns — with 12 AI tools that diagnose your gaps, build your plan, and make exam mastery inevitable.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1], delay: 0.3 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <button onClick={handleLogin} disabled={loggingIn} className="btn-primary-landing" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '18px 40px', borderRadius: '16px', fontSize: '18px', fontWeight: 700 }}>
              {loggingIn ? <Loader2 className="animate-spin" /> : <Brain size={20} />}
              {loggingIn ? "Connecting..." : "Start Mastering — It's Free"}
              {!loggingIn && <ArrowRight size={20} />}
            </button>
            {import.meta.env.DEV && (
              <button id="dev-bypass-login" onClick={() => {
                loginDev();
                navigate("/dashboard");
              }} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', color: 'white', fontSize: '13px', fontWeight: 600 }}>
                Dev Bypass Login
              </button>
            )}
            <a href="#tools" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontSize: '15px', fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='white'} onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.35)'}>
              See all 12 tools ↓
            </a>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1], delay: 0.4 }} style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '64px' }}>
            <div style={{ display: 'flex' }}>
              {[{c: "#a855f7", i: "PS"}, {c: "#3b82f6", i: "AM"}, {c: "#22c55e", i: "TR"}, {c: "#ef4444", i: "RK"}, {c: "#f59e0b", i: "VN"}].map((av, idx) => (
                <div key={idx} style={{ width: '32px', height: '32px', borderRadius: '50%', background: av.c, border: '2px solid #0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'white', marginLeft: idx === 0 ? 0 : '-8px', zIndex: 5 - idx }}>
                  {av.i}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '2px' }}>
                {[1,2,3,4,5].map(i => <Star key={i} size={12} color="#f59e0b" fill="#f59e0b" />)}
              </div>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>2,400+ students already mastering</span>
            </div>
          </motion.div>

        </div>
        
        <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', opacity: 0.2, animation: 'float 2s ease-in-out infinite' }}>
          <ChevronDown size={32} />
        </div>
      </section>

      {/* 3. Marquee */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', padding: '20px 0', overflow: 'hidden' }}>
        <div style={{ display: 'flex' }}>
          {[...Array(2)].map((_, i) => (
            <div key={i} className="marquee-inner">
              {MARQUEE_ITEMS.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <item.icon size={18} color="rgba(168,85,247,0.6)" />
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.text}</span>
                  {idx < MARQUEE_ITEMS.length - 1 && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', marginLeft: '48px' }}></div>}
                  {idx === MARQUEE_ITEMS.length - 1 && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', marginLeft: '48px' }}></div>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* 4. Stats Counter Grid */}
      <section style={{ padding: '80px 16px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {[
            { target: 2400, suffix: "+", color: "#a855f7", label: "Active Students" },
            { target: 12, suffix: "", color: "#38bdf8", label: "Specialized AI Tools" },
            { target: 87, suffix: "%", color: "#4ade80", label: "Score Improvement" },
            { target: 3, suffix: "h", color: "#f59e0b", label: "Saved Per Day" }
          ].map((stat, idx) => (
            <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '24px', padding: '40px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '52px', fontWeight: 900, letterSpacing: '-0.03em', color: stat.color, lineHeight: 1 }}>
                <AnimatedCounter target={stat.target} suffix={stat.suffix} />
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginTop: '8px', fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Tools Grid */}
      <section id="tools" style={{ padding: '80px 16px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(168,85,247,0.1)', color: '#a855f7', padding: '6px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '24px' }}>
              <Zap size={14} /> The Arsenal
            </div>
            <h2 style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 16px 0', lineHeight: 1.1 }}>
              12 tools. <span style={{ fontFamily: "'DM Serif Display', serif", fontStyle: 'italic', fontWeight: 'normal', color: '#a78bfa' }}>One mission.</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '18px', maxWidth: '500px', margin: '0 auto' }}>Every tool is purpose-built around a specific moment in your study journey.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
            {TOOLS.map((tool, idx) => (
              <div key={idx} className="tool-card group">
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: tool.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <tool.icon size={24} color={tool.accentColor} />
                </div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginTop: '14px', marginBottom: '4px' }}>{tool.name}</h3>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.5, margin: 0 }}>{tool.description}</p>
                <div className="tool-cta" style={{ color: tool.accentColor, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '14px' }}>Open tool →</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. How It Works */}
      <section id="how-it-works" style={{ padding: '80px 16px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 16px 0', lineHeight: 1.1 }}>
              How it <span style={{ fontFamily: "'DM Serif Display', serif", fontStyle: 'italic', fontWeight: 'normal', color: '#38bdf8' }}>actually</span> works
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '18px', maxWidth: '500px', margin: '0 auto' }}>Not another note-taking app. A complete system that makes mastery inevitable.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {[
              { num: "01", title: "Diagnose", color: "#a855f7", text: "Find exactly where your knowledge breaks — not just what you don't know, but the precise reason why.", tools: ["WhyAmIWrong", "TeachMeBack"] },
              { num: "02", title: "Build", color: "#38bdf8", text: "Create a personalized study system around your actual exam date, available time, and specific weak spots.", tools: ["DeadlineReverse", "PYQSolver"] },
              { num: "03", title: "Master", color: "#4ade80", text: "Lock in deep knowledge through spaced recall, Socratic sessions, and concept visualization.", tools: ["Flashcards", "ConceptLinker"] }
            ].map((step, idx) => (
              <div key={idx} className="glass-card glass-card-hover" style={{ position: 'relative', padding: '32px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '80px', fontWeight: 900, color: step.color, opacity: 0.05, position: 'absolute', top: '10px', right: '10px', lineHeight: 0.8 }}>{step.num}</div>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `${step.color}20`, color: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px', marginBottom: '24px' }}>{step.num}</div>
                <h3 style={{ fontSize: '28px', fontWeight: 900, color: 'white', margin: '0 0 12px 0' }}>{step.title}</h3>
                <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: '0 0 32px 0', flex: 1 }}>{step.text}</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {step.tools.map(t => (
                    <span key={t} style={{ background: `${step.color}15`, color: step.color, padding: '4px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. TeachMeBack Feature Spotlight */}
      <section style={{ padding: '80px 16px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '64px', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(74,222,128,0.1)', color: '#4ade80', padding: '6px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '24px' }}>
              <MessagesSquare size={14} /> TeachMeBack
            </div>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 24px 0', lineHeight: 1.1 }}>
              If you can't <span style={{ fontFamily: "'DM Serif Display', serif", fontStyle: 'italic', fontWeight: 'normal', color: '#4ade80' }}>explain it,</span> you don't know it.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '16px', lineHeight: 1.6, margin: '0 0 32px 0' }}>
              Our Socratic AI tutor asks you to explain a concept in your own words — then asks the single most revealing question that exposes your blindspot. After 5 rounds, you receive a mastery score and a precise gap analysis.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {["Forces active retrieval, not passive reading", "Identifies gaps you didn't know existed", "Generates a 0–100 mastery score", "Never explains for you — only challenges"].map((point, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.6)', fontSize: '15px' }}>
                  <CheckCircle size={18} color="#4ade80" /> {point}
                </li>
              ))}
            </ul>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Brain size={16} color="#0a0a0f" />
                </div>
                <span style={{ fontWeight: 700, color: 'white', fontSize: '14px' }}>Socratic Tutor</span>
              </div>
              <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 600 }}>Round 2 of 5</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {[1,2,3,4,5].map(i => <div key={i} style={{ height: '4px', flex: 1, borderRadius: '2px', background: i <= 2 ? '#4ade80' : 'rgba(255,255,255,0.1)' }}></div>)}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px', lineHeight: 1.5 }}>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '16px', borderTopLeftRadius: 0, padding: '16px', color: 'rgba(255,255,255,0.8)' }}>
                You said Newton's 3rd law is about equal and opposite reactions.<br/><br/>
                <span className="text-emerald-400 font-medium">But when a truck hits a bicycle — which experiences the greater force?</span>
              </div>
              <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '16px', borderTopRightRadius: 0, padding: '16px', color: 'white', marginLeft: '32px' }}>
                The truck exerts more force... because it's heavier?
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '16px', borderTopLeftRadius: 0, padding: '16px', color: 'rgba(255,255,255,0.8)' }}>
                Interesting. That's Newton's 2nd law, not 3rd.<br/><br/>
                If both forces are truly equal by Newton's 3rd — <span style={{ color: '#f59e0b', fontWeight: 600 }}>why</span> does the bicycle accelerate so much more?
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
              {["Again", "Hard", "Got it ✓", "Easy"].map(btn => (
                <button key={btn} style={{ flex: 1, padding: '10px 0', borderRadius: '10px', fontSize: '12px', fontWeight: 600, border: btn === "Got it ✓" ? '1px solid rgba(74,222,128,0.5)' : '1px solid transparent', background: btn === "Got it ✓" ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.04)', color: btn === "Got it ✓" ? '#4ade80' : 'rgba(255,255,255,0.2)', cursor: 'default' }}>
                  {btn}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. Feature Comparison Table */}
      <section id="compare" style={{ padding: '80px 16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 16px 0', lineHeight: 1.1 }}>
              Not just another <span style={{ fontFamily: "'DM Serif Display', serif", fontStyle: 'italic', fontWeight: 'normal', color: '#f43f5e' }}>study app</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '16px' }}>See exactly what makes StudyOS different.</p>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', alignItems: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Feature</div>
              <div style={{ textAlign: 'center', color: 'white', fontSize: '16px', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                StudyOS <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#a855f7' }}></div>
              </div>
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '16px', fontWeight: 500 }}>Others</div>
            </div>
            
            {COMPARE_ROWS.map((row, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', alignItems: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '15px' }}>{row.feature}</div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {row.studyos ? <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle size={14} color="white" /></div> : <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><XOctagon size={14} color="white" /></div>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {row.others ? <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle size={14} color="rgba(255,255,255,0.3)" /></div> : <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><XOctagon size={14} color="#ef4444" /></div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Testimonials */}
      <section style={{ padding: '80px 16px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 16px 0', lineHeight: 1.1 }}>
              Real students. <span style={{ fontFamily: "'DM Serif Display', serif", fontStyle: 'italic', fontWeight: 'normal', color: '#f59e0b' }}>Real results.</span>
            </h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {TESTIMONIALS.map((t, idx) => (
              <div key={idx} style={{ background: activeTestimonial === idx ? 'rgba(168,85,247,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${activeTestimonial === idx ? 'rgba(168,85,247,0.35)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '24px', padding: '32px', transition: 'all 0.5s ease' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[...Array(t.stars)].map((_, i) => <Star key={i} size={16} fill="#f59e0b" color="#f59e0b" />)}
                </div>
                <p style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.65)', fontSize: '15px', lineHeight: 1.7, margin: '24px 0' }}>"{t.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'white' }}>{t.initials}</div>
                  <div>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>{t.name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Final CTA */}
      <section style={{ padding: '120px 16px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: '800px', height: '400px', background: 'rgba(109,40,217,0.25)', filter: 'blur(120px)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 0 }}></div>
        <div style={{ position: 'absolute', width: '400px', height: '400px', background: 'rgba(56,189,248,0.15)', filter: 'blur(100px)', top: '50%', left: '20%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 0 }}></div>
        <div style={{ position: 'absolute', width: '400px', height: '400px', background: 'rgba(74,222,128,0.15)', filter: 'blur(100px)', top: '50%', right: '0%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 0 }}></div>
        
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '800px', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', color: '#a855f7', padding: '8px 16px', borderRadius: '99px', fontSize: '13px', fontWeight: 600, marginBottom: '32px' }}>
            <div style={{ position: 'relative', width: '6px', height: '6px' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#a855f7' }} className="animate-ping"></div>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#a855f7' }}></div>
            </div>
            Your exam isn't waiting
          </div>
          
          <h2 style={{ fontSize: 'clamp(48px, 8vw, 96px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em', margin: '0 0 24px 0' }}>
            The best time to start<br/>
            <span style={{ fontFamily: "'DM Serif Display', serif", fontStyle: 'italic', fontWeight: 'normal' }} className="text-shimmer">was yesterday.</span>
          </h2>
          
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.45)', margin: '0 0 48px 0', maxWidth: '480px' }}>
            The second best time is right now. Join 2,400+ students who already changed how they study.
          </p>
          
          <button onClick={handleLogin} disabled={loggingIn} className="btn-primary-landing" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '22px 56px', borderRadius: '20px', fontSize: '20px', fontWeight: 700, marginBottom: '32px' }}>
            {loggingIn ? <Loader2 className="animate-spin" /> : <Brain size={24} />}
            {loggingIn ? "Connecting..." : "Start Free — No Credit Card"}
            {!loggingIn && <ArrowRight size={24} />}
          </button>
          
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {["Free forever plan", "Google Sign-in", "No setup needed"].map(feature => (
              <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.3)', fontSize: '14px', fontWeight: 500 }}>
                <CheckCircle size={14} color="rgba(74,222,128,0.6)" /> {feature}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #4d41df, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={16} color="white" />
          </div>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontStyle: 'italic', fontSize: 18, color: 'white' }}>StudyOS</span>
        </div>
        <div style={{ display: 'flex', gap: '24px', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>
          <span>© {new Date().getFullYear()} StudyOS Team</span>
          <span>Built with Gemini AI + Firebase</span>
        </div>
      </footer>

      {/* Login Error Toast */}
      {loginError && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(239,68,68,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(239,68,68,0.3)', padding: '12px 24px', borderRadius: '12px', color: '#fca5a5', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <XOctagon size={18} color="#ef4444" />
          {loginError}
          <button onClick={() => setLoginError(null)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: 0, marginLeft: '8px' }}>✕</button>
        </div>
      )}
    </div>
  );
}
