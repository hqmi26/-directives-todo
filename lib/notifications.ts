"use client";

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("Notifications not supported in this browser");
    return false;
  }
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Service Worker registration failed:", err);
    });
  }
}

export function scheduleLocalReminder(title: string, dueDate: string, reminderMinutes: number) {
  if (Notification.permission !== "granted") return;

  const due = new Date(dueDate).getTime();
  const reminderTime = due - reminderMinutes * 60 * 1000;
  const now = Date.now();

  if (reminderTime <= now) return; // Already past

  const delay = reminderTime - now;
  setTimeout(() => {
    new Notification("⚡ DIRECTIVE REMINDER", {
      body: `"${title}" is due in ${reminderMinutes} minutes`,
      icon: "/icons/icon-192.png",
      tag: `reminder-${title}`,
    });
  }, delay);
}
