export type Alignment = 
  | 'top-left' 
  | 'top-center' 
  | 'top-right' 
  | 'center-center'
  | 'bottom-left' 
  | 'bottom-center' 
  | 'bottom-right';

export type WallpaperMood = 
  | 'pastel' 
  | 'gradient' 
  | 'nature' 
  | 'dark'
  | 'custom';

export type AppMode = 'setup' | 'execution';

export interface Settings {
  mode: AppMode;
  wallpaper: WallpaperMood;
  customWallpaper?: string;
  alignment: Alignment;
  customQuote?: string | null; // Null implies random mode
  startDate?: string; // YYYY-MM-DD
}

export interface RoadmapDay {
  day: number;
  title: string;
  scope: string[];
}

export interface Goal {
  id: string;
  title: string;
  duration_days: number;
  roadmap: RoadmapDay[];
  startDate?: string;
}

export interface ScheduledTask {
  task: string;
  scope: string[];
  goalId: string;
  done: boolean;
}

export interface BacklogTask {
  task: string;
  originalDate: string; // YYYY-MM-DD
  goalId: string;
}

export interface Schedule {
  [date: string]: ScheduledTask[];
}

export interface ExecutionData {
  settings: Settings;
  goals: Goal[];
  schedule: Schedule;
  backlog: BacklogTask[];
}