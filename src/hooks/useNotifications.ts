import { useState } from "react";

interface StudyDay {
  date: string;
  topic: string;
  task: string;
  hours: number;
  type: "study" | "revision" | "rest";
  completed?: boolean;
}

export function useNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );
  const [reminderSet, setReminderSet] = useState(false);

  const requestPermission = async (): Promise<boolean> => {
    if (typeof Notification === "undefined") return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === "granted";
  };

  // Schedule notifications using setTimeout for near-future and localStorage for future days
  const scheduleStudyReminders = async (plan: StudyDay[], examName: string): Promise<number> => {
    const granted = await requestPermission();
    if (!granted) return 0;

    let scheduled = 0;
    const now = new Date();

    // Store reminders in localStorage (actual cross-session push requires a service worker)
    // For this implementation, we schedule notifications for the current day immediately
    // and store upcoming ones to fire on next app visit
    const upcoming: { date: string; topic: string; task: string; examName: string }[] = [];

    for (const day of plan) {
      if (day.type === "rest") continue;

      const dayDate = new Date(day.date + "T08:00:00");

      if (dayDate < now) continue; // Skip past days

      const msDiff = dayDate.getTime() - now.getTime();

      // If within 24 hours, schedule with setTimeout
      if (msDiff < 24 * 60 * 60 * 1000 && msDiff > 0) {
        setTimeout(() => {
          new Notification(`📚 Study Time: ${examName}`, {
            body: `Today: ${day.topic} — ${day.task} (${day.hours} hours)`,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: `studyos-${day.date}`,
          });
        }, msDiff);
        scheduled++;
      }

      // Store all upcoming reminders in localStorage
      upcoming.push({
        date: day.date,
        topic: day.topic,
        task: day.task,
        examName
      });
    }

    // Save to localStorage for the reminder checker (run on every app load)
    localStorage.setItem("studyos_reminders", JSON.stringify(upcoming));
    setReminderSet(true);
    return scheduled;
  };

  return { permission, requestPermission, scheduleStudyReminders, reminderSet };
}
