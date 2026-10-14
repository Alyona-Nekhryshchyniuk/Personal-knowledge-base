const STORAGE_KEY = 'dismissed_notifications';

export function getDismissedNotifications(): Set<string> {
  if (typeof window === 'undefined') {
    return new Set();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set();
  }
}

export function addDismissedNotification(noteId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const dismissed = getDismissedNotifications();
    dismissed.add(noteId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(dismissed)));
  } catch {
    console.error('[Notifications] Failed to save dismissed notification');
  }
}

export function clearDismissedNotifications(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    console.error('[Notifications] Failed to clear dismissed notifications');
  }
}

export function isDismissed(noteId: string): boolean {
  return getDismissedNotifications().has(noteId);
}
