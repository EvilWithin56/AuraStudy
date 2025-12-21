import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Play, Pause, RotateCcw, Music, Sliders, X, Plus, Trash2,
  Check, Leaf, BrainCircuit, Home, Layout, 
  Sparkles, Maximize2, Minimize2, Volume2, Settings2, 
  CloudRain, Flame, Trees, Waves, Target, Monitor, ArrowDown,
  Zap, Clock, Award, Loader2
} from 'lucide-react';
import { TimerMode, Task, TimerSettings } from './types';
import { AMBIENT_SOUNDS, THEMES, Theme, TIMER_SETTINGS } from './constants';
import { fetchMotivationalQuote, generateSubtasks } from './services/gemini';
import ShinyText from './components/ShinyText';

// --- Constants & Config ---
const DEFAULT_SETTINGS: TimerSettings = {
  pomodoro: TIMER_SETTINGS[TimerMode.POMODORO] / 60,
  shortBreak: TIMER_SETTINGS[TimerMode.SHORT_BREAK] / 60,
  longBreak: TIMER_SETTINGS[TimerMode.LONG_BREAK] / 60,
  longBreakInterval: 4
};

// --- Helpers ---
const hexToRgb = (hex: string) => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
};

// --- Scroll Reveal Component ---
const FadeInSection: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Trigger when element enters viewport
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Stop observing once visible so it doesn't hide again when scrolling up
            if (domRef.current) observer.unobserve(domRef.current);
          }
        });
      },
      { 
        threshold: 0.1, // Trigger when 10% visible
        rootMargin: '0px 0px -50px 0px' // Offset to trigger slightly before bottom
      }
    );

    const currentElement = domRef.current;
    if (currentElement) observer.observe(currentElement);

    return () => {
      if (currentElement) observer.unobserve(currentElement);
    };
  }, []);

  return (
    <div
      ref={domRef}
      className={`${className} transition-all duration-1000 ease-out transform ${
        isVisible 
          ? 'opacity-100 translate-y-0 filter-none' 
          : 'opacity-0 translate-y-20 blur-sm'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// --- Progress Visualization Component ---
const TaskProgressGraph = ({ tasks, accentColor }: { tasks: Task[], accentColor: string }) => {
  const total = tasks.length;
  const completedCount = tasks.filter(t => t.completed).length;
  const percent = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  return (
    <div className="w-full mb-6 md:mb-8 animate-blur-fade">
      <div className="flex justify-between items-end mb-2 px-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Session Velocity</span>
        <span className="text-xs font-bold text-white font-mono" style={{ textShadow: `0 0 15px ${accentColor}` }}>
          {total === 0 ? 'READY' : `${completedCount}/${total} • ${percent}%`}
        </span>
      </div>
      
      <div className="flex w-full h-1.5 gap-1.5 md:gap-2">
        {total === 0 ? (
           <div className="w-full h-full rounded-full bg-white/5 border border-white/5" />
        ) : (
          Array.from({ length: total }).map((_, i) => {
            const active = i < completedCount;
            return (
              <div 
                key={i}
                className={`h-full flex-1 rounded-full transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) ${active ? 'opacity-100' : 'opacity-20 bg-white'}`}
                style={{
                  backgroundColor: active ? accentColor : undefined,
                  boxShadow: active ? `0 0 12px ${accentColor}, 0 0 4px ${accentColor}` : 'none',
                  transform: active ? 'scaleY(1.5)' : 'scaleY(1)'
                }}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

// --- Main App Component ---
const App: React.FC = () => {
  // --- View State ---
  const [appMode, setAppMode] = useState<'DASHBOARD' | 'FOCUS'>('DASHBOARD');
  const [showMixer, setShowMixer] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // --- Physics & Parallax State ---
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Timer Engine ---
  const [mode, setMode] = useState<TimerMode>(TimerMode.POMODORO);
  const [isActive, setIsActive] = useState(false);
  const [settings, setSettings] = useState<TimerSettings>(() => {
    const saved = localStorage.getItem('aura_timer_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const getInitialTime = useCallback((targetMode: TimerMode) => {
    switch (targetMode) {
      case TimerMode.POMODORO: return settings.pomodoro * 60;
      case TimerMode.SHORT_BREAK: return settings.shortBreak * 60;
      case TimerMode.LONG_BREAK: return settings.longBreak * 60;
      default: return 0;
    }
  }, [settings]);

  const [timeLeft, setTimeLeft] = useState(getInitialTime(TimerMode.POMODORO));
  const [totalStudyTime, setTotalStudyTime] = useState(() => {
    return parseInt(localStorage.getItem('aura_total_study_time') || '0');
  });

  // --- Aesthetic State ---
  const [currentTime, setCurrentTime] = useState(new Date());
  const [quote, setQuote] = useState("Life begins at the end of your comfort zone.");
  const [activeTheme, setActiveTheme] = useState(THEMES[0]);
  const [volumes, setVolumes] = useState<Record<string, number>>({
    rain: 0, lofi: 0, fire: 0, forest: 0, jazz: 0, waves: 0, classical: 0
  });
  
  // --- Tasks State ---
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('aura_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  // --- Refs ---
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const notificationAudio = useRef<HTMLAudioElement | null>(null);

  // --- Effects ---

  // Scroll Listener
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Parallax Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth