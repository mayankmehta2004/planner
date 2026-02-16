import { ExecutionData, WallpaperMood, Alignment } from './types';

export const INITIAL_DATA: ExecutionData = {
  settings: {
    mode: 'setup',
    wallpaper: 'nature',
    alignment: 'bottom-left',
    startDate: new Date().toISOString().split('T')[0]
  },
  goals: [],
  schedule: {},
  backlog: []
};

export const WALLPAPER_STYLES: Record<WallpaperMood, string> = {
  pastel: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  gradient: 'linear-gradient(45deg, #ff9a9e 0%, #fad0c4 99%, #fad0c4 100%)',
  nature: 'url("https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2070&auto=format&fit=crop")',
  dark: 'linear-gradient(to bottom, #232526, #414345)',
  custom: '' // Handled dynamically
};

export const ALIGNMENT_CLASSES: Record<Alignment, string> = {
  'top-left': 'top-8 left-8',
  'top-center': 'top-8 left-1/2 -translate-x-1/2',
  'top-right': 'top-8 right-8',
  'center-center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  'bottom-left': 'bottom-8 left-8',
  'bottom-center': 'bottom-8 left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-8 right-8'
};

export const STORAGE_KEY = 'executionData';