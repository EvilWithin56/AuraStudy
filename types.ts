
export enum TimerMode {
  POMODORO = 'POMODORO',
  SHORT_BREAK = 'SHORT_BREAK',
  LONG_BREAK = 'LONG_BREAK',
  STOPWATCH = 'STOPWATCH'
}

export enum AppView {
  HOME = 'HOME',
  FOCUS = 'FOCUS',
  AMBIENT = 'AMBIENT',
  TASKS = 'TASKS'
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  isPriority: boolean;
}

export interface StudySession {
  duration: number; // in seconds
  timestamp: number;
  mode: TimerMode;
}

export interface TimerSettings {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
}

export interface Track {
  id: string;
  name: string;
  url: string;
  type: 'lofi' | 'nature' | 'white-noise';
}
