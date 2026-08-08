export type ActivityType = 'youtube_download' | 'video_edit' | 'image_edit' | 'ai_generate';

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  timestamp: number;
  metadata?: any;
}

const STORAGE_KEY = 'fahi_video_recent_activity';

export function getActivities(): Activity[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function logActivity(activity: Omit<Activity, 'id' | 'timestamp'>) {
  if (typeof window === 'undefined') return;
  try {
    const activities = getActivities();
    const newActivity: Activity = {
      ...activity,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };
    // keep only last 10
    const newActivities = [newActivity, ...activities].slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newActivities));
  } catch (e) {
    console.error("Failed to log activity", e);
  }
}

export function clearActivities() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
