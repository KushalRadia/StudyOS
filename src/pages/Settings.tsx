import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { useNotifications } from "../hooks/useNotifications";
import {
  User,
  Settings as SettingsIcon,
  Globe,
  Bell,
  Calendar,
  Sparkles,
  Sun,
  Moon,
  ShieldCheck,
  CreditCard,
  Check,
  Loader2,
  AlertCircle,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Settings() {
  const { user, profile, updateProfile, theme, toggleTheme } = useAuth();
  const { language, setLanguage, SUPPORTED_LANGUAGES } = useLanguage();
  const { permission, requestPermission } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();

  // Local states
  const [activeTab, setActiveTab] = useState<"profile" | "preferences" | "integrations" | "billing">("profile");
  const [displayName, setDisplayName] = useState(profile?.name || user?.displayName || "");
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || user?.photoURL || "");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"plans" | "card" | "processing" | "success">("plans");
  const [calendarSyncing, setCalendarSyncing] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const upgradeParam = searchParams.get("upgrade");

    if (tabParam === "billing" || tabParam === "profile" || tabParam === "preferences" || tabParam === "integrations") {
      setActiveTab(tabParam);
    }

    if (upgradeParam === "true") {
      setShowUpgradeModal(true);
      setCheckoutStep("plans");
      // Clean query params so it doesn't open on fresh reload
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("upgrade");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const tabs = [
    { id: "profile", label: "Profile Settings", icon: User },
    { id: "preferences", label: "App Preferences", icon: Globe },
    { id: "integrations", label: "Integrations", icon: Calendar },
    { id: "billing", label: "Upgrade & Subscription", icon: Sparkles },
  ] as const;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await updateProfile({
        name: displayName,
        photoURL: photoURL,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = () => {
    if (permission === "granted") {
      new Notification("📚 StudyOS Reminder Test", {
        body: "Your StudyOS notifications are working perfectly!",
        icon: "/favicon.ico",
      });
    } else {
      requestPermission().then(granted => {
        if (granted) {
          new Notification("📚 StudyOS Reminder Test", {
            body: "Your StudyOS notifications are working perfectly!",
            icon: "/favicon.ico",
          });
        }
      });
    }
  };

  const handleCalendarToggle = async () => {
    if (profile?.googleCalendarSynced) {
      if (confirm("Disconnect Google Calendar sync? This will stop automatic study plan synchronization.")) {
        await updateProfile({ googleCalendarSynced: false });
      }
    } else {
      setCalendarSyncing(true);
      // Simulate Google Auth
      setTimeout(async () => {
        await updateProfile({ googleCalendarSynced: true });
        setCalendarSyncing(false);
        new Notification("📅 Google Calendar Connected", {
          body: "Your StudyOS study plans will now sync automatically.",
        });
      }, 2000);
    }
  };

  const handleUpgrade = async () => {
    setCheckoutStep("processing");
    setTimeout(async () => {
      await updateProfile({ isPro: true });
      setCheckoutStep("success");
    }, 2500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <header className="flex items-center gap-4">
        <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-sm">
          <SettingsIcon className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-on-background">Settings</h1>
          <p className="text-on-surface-variant font-medium">
            Manage your profile, preferences, calendar integrations, and subscription status.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
        {/* Navigation Sidebar */}
        <nav className="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0 scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                  activeTab === tab.id
                    ? "bg-primary border-primary text-on-primary shadow-lg shadow-primary/20"
                    : "bg-surface-container-low border-outline-variant text-on-surface-variant hover:border-primary/40 hover:bg-surface-container"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Settings Form Content */}
        <div className="md:col-span-3 bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant shadow-sm min-h-[500px]">
          <AnimatePresence mode="wait">
            {activeTab === "profile" && (
              <motion.form
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleSaveProfile}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-2xl font-bold text-on-background mb-1">Profile Details</h3>
                  <p className="text-sm text-on-surface-variant">Update your display information seen across the study app.</p>
                </div>

                <div className="flex items-center gap-6 p-6 bg-surface-container rounded-2xl border border-outline-variant/30">
                  <div className="h-16 w-16 rounded-full overflow-hidden border border-outline-variant shadow-inner bg-primary text-white flex items-center justify-center font-bold text-2xl">
                    {photoURL ? (
                      <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      displayName.charAt(0) || "U"
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-on-background text-lg leading-none">{profile?.name || user?.displayName}</p>
                    <p className="text-xs text-on-surface-variant font-medium">{user?.email}</p>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-widest text-primary mt-2">
                      {profile?.isPro ? (
                        <>
                          <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span>Pro Scholar</span>
                        </>
                      ) : (
                        <span>Basic Scholar</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-on-surface-variant">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      placeholder="Your Name"
                      className="px-4 py-3 bg-surface-container border border-outline-variant rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-sm font-bold"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-on-surface-variant">Avatar Image URL</label>
                    <input
                      type="url"
                      value={photoURL}
                      onChange={(e) => setPhotoURL(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      className="px-4 py-3 bg-surface-container border border-outline-variant rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>

                  {saveSuccess && (
                    <span className="text-sm font-bold text-secondary flex items-center gap-1.5 animate-pulse">
                      <Check className="w-4 h-4" />
                      Changes saved!
                    </span>
                  )}
                </div>
              </motion.form>
            )}

            {activeTab === "preferences" && (
              <motion.div
                key="preferences"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-2xl font-bold text-on-background mb-1">App Preferences</h3>
                  <p className="text-sm text-on-surface-variant">Configure localization, layouts, and display options.</p>
                </div>

                <div className="space-y-6">
                  {/* Theme Toggle */}
                  <div className="flex items-center justify-between p-6 bg-surface-container rounded-2xl border border-outline-variant/30">
                    <div className="space-y-1">
                      <p className="font-bold text-on-surface text-base">App Theme</p>
                      <p className="text-xs text-on-surface-variant">Switch between Light mode and Dark mode.</p>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest font-bold text-xs uppercase tracking-wider hover:bg-surface transition-colors"
                    >
                      {theme === "dark" ? (
                        <>
                          <Sun className="w-4 h-4 text-amber-500" />
                          <span>Light Mode</span>
                        </>
                      ) : (
                        <>
                          <Moon className="w-4 h-4 text-indigo-500" />
                          <span>Dark Mode</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Response Language */}
                  <div className="flex flex-col gap-3 p-6 bg-surface-container rounded-2xl border border-outline-variant/30">
                    <div className="space-y-1">
                      <p className="font-bold text-on-surface text-base">AI Response Language</p>
                      <p className="text-xs text-on-surface-variant">Select the language Gemini will use for study resources.</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => setLanguage(lang.code)}
                          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all border ${
                            language === lang.code
                              ? "bg-primary/10 border-primary text-primary"
                              : "bg-surface-container-lowest border-outline-variant/50 text-on-surface-variant hover:border-primary/30"
                          }`}
                        >
                          <span className="text-lg">{lang.flag}</span>
                          <span>{lang.name.split(" ")[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reminders & Notifications */}
                  <div className="flex items-center justify-between p-6 bg-surface-container rounded-2xl border border-outline-variant/30">
                    <div className="space-y-1">
                      <p className="font-bold text-on-surface text-base">Study Reminders</p>
                      <p className="text-xs text-on-surface-variant">Get notified for daily study plan slots.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleTestNotification}
                        className="px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest font-bold text-xs uppercase tracking-wider hover:bg-surface transition-colors"
                      >
                        Send Test Push
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "integrations" && (
              <motion.div
                key="integrations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-2xl font-bold text-on-background mb-1">Integrations</h3>
                  <p className="text-sm text-on-surface-variant">Sync StudyOS with external apps to automate your planning.</p>
                </div>

                <div className="p-6 bg-surface-container rounded-2xl border border-outline-variant/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-on-surface text-lg">Google Calendar Sync</p>
                        <p className="text-xs text-on-surface-variant">Automatically add study session tasks directly into your calendar slots.</p>
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={handleCalendarToggle}
                        disabled={calendarSyncing}
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border ${
                          profile?.googleCalendarSynced
                            ? "bg-secondary-container/20 border-secondary text-secondary hover:bg-secondary-container/40"
                            : "bg-primary border-primary text-on-primary hover:scale-95 shadow-sm"
                        }`}
                      >
                        {calendarSyncing ? (
                          <div className="flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Connecting...</span>
                          </div>
                        ) : profile?.googleCalendarSynced ? (
                          "Connected ✓"
                        ) : (
                          "Connect Calendar"
                        )}
                      </button>
                    </div>
                  </div>
                  {profile?.googleCalendarSynced && (
                    <div className="text-xs text-secondary font-medium bg-secondary-container/10 p-3 rounded-xl border border-secondary/15 flex items-center gap-2 animate-in fade-in">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>Authorized successfully! Any newly created deadline study plans will sync instantly.</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "billing" && (
              <motion.div
                key="billing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-2xl font-bold text-on-background mb-1">Upgrade & Subscriptions</h3>
                  <p className="text-sm text-on-surface-variant">Unlock maximum learning velocity with StudyOS Pro Scholar.</p>
                </div>

                <div className="bg-gradient-to-r from-violet-600 via-primary to-indigo-600 p-8 rounded-[32px] text-white space-y-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-white">
                      <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                      <span>{profile?.isPro ? "PRO MEMBERSHIP ACTIVE" : "TIER: BASIC SCHOLAR"}</span>
                    </div>
                    <h4 className="text-3xl font-black tracking-tight">StudyOS Pro Suite</h4>
                    <p className="text-white/80 text-sm max-w-lg leading-relaxed">
                      Upgrade to unlock unlimited multi-language explainers, instant Snap & Solve math engines, real-time peer collab sessions, and infinite concept link maps.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <ul className="space-y-2 text-sm font-semibold">
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Unlimited AI Tools (No Limits)</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Full Google Calendar Sync Integration</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Real-time peer sessions</li>
                    </ul>
                    <ul className="space-y-2 text-sm font-semibold">
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> 10+ Regional Indian Languages</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Advanced Concept Maps (Unlimited Nodes)</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Custom learning archetypes</li>
                    </ul>
                  </div>

                  <div className="pt-4 flex items-center gap-4">
                    {profile?.isPro ? (
                      <div className="bg-white/10 backdrop-blur border border-white/25 px-6 py-3.5 rounded-2xl flex items-center gap-2 font-bold text-sm">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        Pro membership active! Thank you for supporting StudyOS.
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setCheckoutStep("plans");
                          setShowUpgradeModal(true);
                        }}
                        className="bg-white text-primary px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-surface-container-lowest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10"
                      >
                        Upgrade to Pro ($9.99/mo)
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Upgrade Checkout Simulator Modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-outline-variant max-w-lg w-full rounded-[40px] shadow-2xl p-8 relative overflow-hidden"
            >
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-6 right-6 p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                ✕
              </button>

              {checkoutStep === "plans" && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                      <Sparkles className="w-6 h-6 text-amber-500 fill-amber-500" />
                    </div>
                    <h3 className="text-2xl font-black text-on-background">Upgrade Checkout Simulator</h3>
                    <p className="text-sm text-on-surface-variant">Simulate payment transaction for testing Pro Scholar features.</p>
                  </div>

                  <div className="p-5 border-2 border-primary bg-primary/5 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-on-surface">StudyOS Pro Scholar</p>
                      <p className="text-xs text-on-surface-variant">Monthly subscription plan</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-primary">$9.99/mo</p>
                      <p className="text-[10px] text-on-surface-variant">Cancel anytime</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => setCheckoutStep("card")}
                      className="w-full btn-primary"
                    >
                      <span>Proceed to Payment</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowUpgradeModal(false)}
                      className="w-full py-3.5 border border-outline-variant hover:bg-surface-container rounded-xl font-bold text-xs uppercase tracking-wider text-on-surface-variant transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {checkoutStep === "card" && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-on-background">Enter Simulated Card</h3>
                    <p className="text-xs text-on-surface-variant">Press complete to run mock payment gateway.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 border border-outline-variant bg-surface-container rounded-2xl flex items-center gap-3">
                      <CreditCard className="w-6 h-6 text-on-surface-variant opacity-60" />
                      <input
                        type="text"
                        disabled
                        value="••••  ••••  ••••  4242"
                        className="bg-transparent border-none text-sm font-bold outline-none text-on-surface select-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border border-outline-variant bg-surface-container rounded-2xl">
                        <label className="block text-[10px] uppercase font-black tracking-widest text-on-surface-variant mb-1">Expiry</label>
                        <span className="text-sm font-bold">12/29</span>
                      </div>
                      <div className="p-4 border border-outline-variant bg-surface-container rounded-2xl">
                        <label className="block text-[10px] uppercase font-black tracking-widest text-on-surface-variant mb-1">CVC</label>
                        <span className="text-sm font-bold">***</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-primary font-medium leading-relaxed">
                      This is a simulated sandbox checkout. No real currency will be billed, and your account will instantly become Pro Scholar.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={handleUpgrade}
                      className="w-full btn-primary"
                    >
                      <span>Simulate Authorize</span>
                    </button>
                    <button
                      onClick={() => setCheckoutStep("plans")}
                      className="w-full py-3.5 border border-outline-variant hover:bg-surface-container rounded-xl font-bold text-xs uppercase tracking-wider text-on-surface-variant transition-colors"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}

              {checkoutStep === "processing" && (
                <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center animate-pulse">
                  <Loader2 className="w-14 h-14 text-primary animate-spin" />
                  <div className="space-y-2">
                    <p className="text-lg font-black text-on-background">Processing Transaction...</p>
                    <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed">
                      Securing auth token and updating Firestore user membership records...
                    </p>
                  </div>
                </div>
              )}

              {checkoutStep === "success" && (
                <div className="py-6 flex flex-col items-center justify-center space-y-6 text-center">
                  <div className="w-16 h-16 bg-emerald-500/15 border-2 border-emerald-500 rounded-full flex items-center justify-center text-emerald-500 animate-bounce">
                    <Check className="w-8 h-8 font-black" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-2xl font-black text-on-background">Payment Authorized! 🎉</h4>
                    <p className="text-sm text-on-surface-variant max-w-sm leading-relaxed">
                      Welcome to **StudyOS Pro Scholar**. Your premium badge is active. You can now use all study components without limit!
                    </p>
                  </div>
                  <button
                    onClick={() => setShowUpgradeModal(false)}
                    className="btn-primary w-full max-w-xs"
                  >
                    Enter Pro Suite
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
