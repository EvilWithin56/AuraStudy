import { TimerMode } from './types';

export const TIMER_SETTINGS = {
  [TimerMode.POMODORO]: 1 * 60,
  [TimerMode.SHORT_BREAK]: 5 * 60,
  [TimerMode.LONG_BREAK]: 15 * 60,
  [TimerMode.STOPWATCH]: 0,
};

export interface Theme {
  id: string;
  name: string;
  url: string;
  accent: string;
}

export const THEMES: Theme[] = [
  { id: 'forest', name: 'Emerald Forest', url: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2560&auto=format&fit=crop', accent: '#10b981' },
  { id: 'mountain', name: 'Alpine Peak', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2560&auto=format&fit=crop', accent: '#3b82f6' },
  { id: 'ocean', name: 'Deep Azure', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2560&auto=format&fit=crop', accent: '#06b6d4' },
  { id: 'space', name: 'Stellar Drift', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2560&auto=format&fit=crop', accent: '#8b5cf6' },
  { id: 'city', name: 'Neon Tokyo', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=2560&auto=format&fit=crop', accent: '#f43f5e' },
  { id: 'library', name: 'Old Library', url: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=2560&auto=format&fit=crop', accent: '#d97706' },
  { id: 'cyber', name: 'Cyberpunk District', url: 'https://images.unsplash.com/photo-1605142859862-978be7eba909?q=80&w=2560&auto=format&fit=crop', accent: '#ec4899' },
  { id: 'zen', name: 'Kyoto Zen Garden', url: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=2560&auto=format&fit=crop', accent: '#65a30d' },
  { id: 'attic', name: 'Cozy Attic', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=2560&auto=format&fit=crop', accent: '#fb923c' },
  { id: 'aurora', name: 'Arctic Lights', url: 'https://images.unsplash.com/photo-1531366930477-d9cd06fb03e6?q=80&w=2560&auto=format&fit=crop', accent: '#2dd4bf' }
];

export interface AmbientSound {
  id: string;
  name: string;
  url: string;
  icon: string;
  isMusic?: boolean;
}

export const AMBIENT_SOUNDS: AmbientSound[] = [
  {
    id: 'rain',
    name: 'Heavy Rain',
    url: 'https://assets.mixkit.co/active_storage/sfx/2418/2418-preview.mp3',
    icon: 'CloudRain'
  },
  {
    id: 'lofi',
    name: 'Lofi Chill',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    icon: 'Music',
    isMusic: true
  },
  {
    id: 'jazz',
    name: 'Midnight Jazz',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    icon: 'Music',
    isMusic: true
  },
  {
    id: 'classical',
    name: 'Piano Deep Focus',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    icon: 'Music',
    isMusic: true
  },
  {
    id: 'fire',
    name: 'Campfire',
    url: 'https://assets.mixkit.co/active_storage/sfx/2436/2436-preview.mp3',
    icon: 'Flame'
  },
  {
    id: 'forest',
    name: 'Wildwood',
    url: 'https://assets.mixkit.co/active_storage/sfx/2438/2438-preview.mp3',
    icon: 'Trees'
  },
  {
    id: 'waves',
    name: 'Ocean Waves',
    url: 'https://assets.mixkit.co/active_storage/sfx/1113/1113-preview.mp3',
    icon: 'Waves'
  }
];

export const BACKGROUND_IMAGE = THEMES[0].url;