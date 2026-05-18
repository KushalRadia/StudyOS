import { useEffect } from "react";

export function useReminderChecker() {
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const stored = localStorage.getItem("studyos_reminders");
    if (!stored) return;

    const reminders: { date: string; topic: string; task: string; examName: string }[] = JSON.parse(stored);
    const today = new Date().toISOString().split("T")[0];

    const todayReminder = reminders.find(r => r.date === today);
    if (todayReminder) {
      // Only show once per day — check if already shown
      const shown = localStorage.getItem(`studyos_shown_${today}`);
      if (!shown) {
        setTimeout(() => {
          new Notification(`📚 Study Time: ${todayReminder.examName}`, {
            body: `Today: ${todayReminder.topic} — ${todayReminder.task}`,
            icon: "/favicon.ico",
            tag: `studyos-${today}`,
          });
          localStorage.setItem(`studyos_shown_${today}`, "1");
        }, 2000); // Slight delay to not fire immediately on load
      }
    }
  }, []);
}
