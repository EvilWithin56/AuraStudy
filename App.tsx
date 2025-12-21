import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { TimerMode, TimerSettings } from './types';
import { THEMES, TIMER_SETTINGS } from './constants';
import ShinyText from './components/ShinyText';

// --- Constants & Config ---
const DEFAULT_SETTINGS: TimerSettings = {
  pomodoro: TIMER_SETTINGS[TimerMode.POMODORO] / 60,
  shortBreak: TIMER_SETTINGS[TimerMode.SHORT_BREAK] / 60,
  longBreak: TIMER_SETTINGS[TimerMode.LONG_BREAK] / 60,
  longBreakInterval: 4
};

// --- Main App Component ---
const App: React.FC = () => {
  // --- Timer State ---
  const [mode, setMode] = useState<TimerMode>(TimerMode.POMODORO);
  const [isActive, setIsActive] = useState(false);
  const [settings] = useState<TimerSettings>(DEFAULT_SETTINGS);
  const [activeTheme] = useState(THEMES[0]);

  const getInitialTime = useCallback((targetMode: TimerMode) => {
    switch (targetMode) {
      case TimerMode.POMODORO: return settings.pomodoro * 60;
      case TimerMode.SHORT_BREAK: return settings.shortBreak * 60;
      case TimerMode.LONG_BREAK: return settings.longBreak * 60;
      default: return 0;
    }
  }, [settings]);

  const [timeLeft, setTimeLeft] = useState(getInitialTime(TimerMode.POMODORO));

  // --- Timer Logic ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(getInitialTime(mode));
  };

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(getInitialTime(newMode));
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center animate-ken-burns"
        style={{ backgroundImage: `url(${activeTheme.url})` }}
      />
      <div className="fixed inset-0 bg-black/60" />
      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="glass-panel p-8 md:p-12 max-w-lg w-full text-center">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 animate-breathe">
              AuraStudy
            </h1>
            <ShinyText text="Focus Sanctuary" className="text-sm" />
          </div>

          {/* Mode Selector */}
          <div className="flex justify-center gap-2 mb-8">
            {[
              { mode: TimerMode.POMODORO, label: 'Focus' },
              { mode: TimerMode.SHORT_BREAK, label: 'Short Break' },
              { mode: TimerMode.LONG_BREAK, label: 'Long Break' }
            ].map(({ mode: m, label }) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                  mode === m 
                    ? 'bg-white text-black' 
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Timer Display */}
          <div className="mb-8">
            <div 
              className="text-7xl md:text-8xl font-bold tracking-tight text-glow"
              style={{ color: activeTheme.accent }}
            >
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4">
            <button
              onClick={toggleTimer}
              className="p-4 rounded-full bg-white text-black hover:bg-gray-200 transition-all hover:scale-105 active:scale-95"
            >
              {isActive ? <Pause size={24} /> : <Play size={24} />}
            </button>
            <button
              onClick={resetTimer}
              className="p-4 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all hover:scale-105 active:scale-95"
            >
              <RotateCcw size={24} />
            </button>
          </div>

          {/* Status */}
          <div className="mt-8 flex items-center justify-center gap-2 text-white/40 text-sm">
            <Clock size={14} />
            <span>{isActive ? 'Session in progress...' : 'Ready to focus'}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-white/30 text-xs">
          <p>✅ Build system configured</p>
          <p>✅ Vercel deployment ready</p>
        </div>
      </div>
    </div>
  );
};

export default App;