import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Play, Pause, RotateCcw, Music, Sliders, X, Plus, Trash2,
  Check, Leaf, BrainCircuit, Home, Layout, 
  Sparkles, Maximize2, Minimize2, Volume2, Settings2, 
  CloudRain, Flame, Trees, Waves, Target, Monitor, ArrowDown,
  Zap, Clock, Award, Loader2, Palette, ChevronDown, History, CalendarClock, Star
} from 'lucide-react';
import { TimerMode, Task, TimerSettings, StudySession } from './types';
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

const formatTotalTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

// --- Scroll Reveal Component ---
const FadeInSection: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (domRef.current) observer.unobserve(domRef.current);
          }
        });
      },
      { 
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
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
  const [showHistory, setShowHistory] = useState(false);
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
  
  // --- History State ---
  const [history, setHistory] = useState<StudySession[]>(() => {
    const saved = localStorage.getItem('aura_history');
    return saved ? JSON.parse(saved) : [];
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
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePos({ x, y });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Clock Tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Quotes & Audio Init
  useEffect(() => {
    fetchMotivationalQuote().then(setQuote);
    notificationAudio.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    notificationAudio.current.volume = 0.5;
  }, []);

  // Format Helper
  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Stop Alarm Helper
  const stopAlarm = useCallback(() => {
    if (notificationAudio.current) {
      notificationAudio.current.pause();
      notificationAudio.current.currentTime = 0;
    }
  }, []);

  // Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
        if (mode === TimerMode.POMODORO) {
          setTotalStudyTime(prev => {
            const newVal = prev + 1;
            localStorage.setItem('aura_total_study_time', newVal.toString());
            return newVal;
          });
        }
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      // Timer Finished Logic
      setIsActive(false);
      
      // Trigger Sound (Looping)
      if (notificationAudio.current) {
        notificationAudio.current.loop = true;
        notificationAudio.current.currentTime = 0;
        notificationAudio.current.play().catch(e => console.log("Audio play failed", e));
      }

      // Browser Notification
      if ("Notification" in window) {
        if (Notification.permission === "granted") {
           new Notification("AuraStudy: Timer Finished", { 
             body: "Great focus session! Take a moment to breathe.",
             requireInteraction: true 
           });
        }
      }
      
      // Save Session to History
      const sessionDuration = getInitialTime(mode);
      const newSession: StudySession = {
        duration: sessionDuration,
        timestamp: Date.now(),
        mode: mode
      };
      
      const updatedHistory = [newSession, ...history];
      setHistory(updatedHistory);
      localStorage.setItem('aura_history', JSON.stringify(updatedHistory));

    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, timeLeft, mode, getInitialTime, history]);

  // Update timer when settings change, but only if not active
  useEffect(() => {
    if (!isActive) {
      setTimeLeft(getInitialTime(mode));
    }
  }, [settings, mode, getInitialTime, isActive]);

  // Dynamic Title
  useEffect(() => {
    if (isActive) {
      document.title = `${formatTimer(timeLeft)} - AuraStudy`;
    } else {
      document.title = 'AuraStudy | Focus Sanctuary';
    }
  }, [timeLeft, isActive]);

  // Audio Mixer
  useEffect(() => {
    Object.keys(volumes).forEach(id => {
      const audio = audioRefs.current[id];
      if (audio) {
        audio.volume = volumes[id];
        if (volumes[id] > 0 && audio.paused) audio.play().catch(() => {});
        else if (volumes[id] === 0 && !audio.paused) audio.pause();
      }
    });
  }, [volumes]);

  useEffect(() => {
    localStorage.setItem('aura_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // --- Computed Theme Variables ---
  const accentRgb = useMemo(() => hexToRgb(activeTheme.accent), [activeTheme]);

  // --- Actions ---

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleRefresh = () => {
    stopAlarm();
    setIsActive(false);
    setTimeLeft(getInitialTime(mode));
  };

  const handleModeSwitch = (newMode: TimerMode) => {
    stopAlarm();
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(getInitialTime(newMode));
  };

  const toggleTimer = () => {
    if (!isActive && timeLeft > 0) {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
        setIsActive(true);
    } else if (isActive) {
        setIsActive(false);
    } else if (timeLeft === 0) {
        handleRefresh();
    }
  };

  const getStatusText = () => {
    if (isActive) {
      return mode === TimerMode.POMODORO ? 'Focusing...' : 'Recharging...';
    }
    return mode === TimerMode.POMODORO ? 'Ready to Focus' : 'Ready to Recharge';
  };

  const handleSaveSettings = (newSettings: TimerSettings) => {
    setSettings(newSettings);
    localStorage.setItem('aura_timer_settings', JSON.stringify(newSettings));
    setShowSettings(false);
  };

  return (
    <div 
      className="relative w-full min-h-dvh text-white bg-black font-sans selection:bg-white/20 overflow-hidden"
      ref={containerRef}
      style={{
        '--theme-accent': activeTheme.accent,
        '--theme-accent-rgb': accentRgb,
      } as React.CSSProperties}
    >
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          background: var(--theme-accent) !important;
        }
        input[type=range]::-moz-range-thumb {
          background: var(--theme-accent) !important;
        }
        @keyframes ring-pulse {
          0% { box-shadow: 0 0 0 0 rgba(var(--theme-accent-rgb), 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(var(--theme-accent-rgb), 0); }
          100% { box-shadow: 0 0 0 0 rgba(var(--theme-accent-rgb), 0); }
        }
        .animate-ring-pulse {
          animation: ring-pulse 3s infinite;
        }
        @keyframes shimmer-gold {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .animate-shimmer-gold {
          background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.4), transparent);
          background-size: 200% 100%;
          animation: shimmer-gold 2s infinite;
        }
        .dashed-circle {
          background-image: url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='9999' ry='9999' stroke='rgba(255,255,255,0.1)' stroke-width='2' stroke-dasharray='10%2c 10' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e"); 
        }

        /* Celebration Animations */
        @keyframes ripple-expand {
          0% { transform: scale(1); opacity: 0.8; border-width: 2px; }
          100% { transform: scale(3); opacity: 0; border-width: 0px; }
        }
        .animate-ripple-expand {
          animation: ripple-expand 2s ease-out infinite;
        }

        @keyframes bubble-rise {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          20% { opacity: 0.8; }
          100% { transform: translateY(-200px) scale(1.2); opacity: 0; }
        }
        .animate-bubble-rise {
          animation: bubble-rise ease-out infinite;
        }
      `}</style>

      <ParallaxBackground activeTheme={activeTheme} mousePos={mousePos} scrollY={scrollY} />
      
      <TopBar activeTheme={activeTheme} setActiveTheme={setActiveTheme} />

      <main className="relative z-10 w-full flex flex-col">
        <HeroSection 
          appMode={appMode}
          currentTime={currentTime}
          quote={quote}
          totalStudyTime={totalStudyTime}
          timeLeft={timeLeft}
          isActive={isActive}
          toggleTimer={toggleTimer}
          handleRefresh={handleRefresh}
          mode={mode}
          handleModeSwitch={handleModeSwitch}
          getStatusText={getStatusText}
          mousePos={mousePos}
          scrollY={scrollY}
          formatTimer={formatTimer}
        />
        
        <AboutSection />
        <FeaturesSection />
      </main>

      <FloatingControls 
        showMixer={showMixer} 
        setShowMixer={setShowMixer} 
        volumes={volumes} 
      />

      <Dock 
        activeView={appMode} 
        setView={setAppMode}
        toggleTasks={() => setShowTasks(!showTasks)}
        toggleSettings={() => setShowSettings(!showSettings)}
        toggleHistory={() => setShowHistory(!showHistory)}
        toggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        showTasks={showTasks}
        showSettings={showSettings}
        showHistory={showHistory}
      />

      <Modals 
        showMixer={showMixer}
        setShowMixer={setShowMixer}
        showTasks={showTasks}
        setShowTasks={setShowTasks}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        volumes={volumes}
        setVolumes={setVolumes}
        tasks={tasks}
        setTasks={setTasks}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        activeTheme={activeTheme}
        history={history}
        totalStudyTime={totalStudyTime}
      />

      {/* Hidden Audio Elements */}
      {AMBIENT_SOUNDS.map(sound => (
        <audio key={sound.id} ref={el => { audioRefs.current[sound.id] = el; }} src={sound.url} loop hidden preload="none" />
      ))}
    </div>
  );
};

// --- Sub-Components ---

// 1. Background Layer
const ParallaxBackground = ({ activeTheme, mousePos, scrollY }: { activeTheme: Theme, mousePos: {x:number, y:number}, scrollY: number }) => (
  <div 
    className="fixed inset-0 z-0 select-none pointer-events-none overflow-hidden"
    style={{ 
      transform: `translate(${mousePos.x * -15}px, ${mousePos.y * -15}px) translateY(-${scrollY * 0.15}px) scale(1.15)`,
      transition: 'transform 0.1s cubic-bezier(0.2, 0.8, 0.2, 1)',
      willChange: 'transform'
    }}
  >
    {THEMES.map((theme) => (
      <div 
        key={theme.id}
        className={`absolute inset-0 bg-cover bg-center animate-ken-burns transition-opacity duration-1000 ease-in-out ${
          activeTheme.id === theme.id ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          backgroundImage: `url(${theme.url})`, 
          filter: 'brightness(0.55) contrast(1.1)' 
        }}
      />
    ))}
    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90" />
  </div>
);

// 2. Top Bar
const TopBar = ({ activeTheme, setActiveTheme }: { activeTheme: Theme, setActiveTheme: (t: Theme) => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <header className="fixed top-0 w-full p-4 md:p-8 z-50 flex flex-col items-start pointer-events-none gap-4 transition-all duration-300">
      <div 
        className="flex items-center gap-3 md:gap-4 group cursor-pointer pointer-events-auto active:scale-95 transition-transform" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-[20px] md:rounded-[24px] bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all duration-300 shadow-xl overflow-hidden relative">
           <div className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity" style={{ backgroundImage: `url(${activeTheme.url})` }} />
           <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
           <Leaf size={24} className="relative z-10 w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-md" style={{ color: 'var(--theme-accent)' }} />
        </div>
        <div className="flex flex-col drop-shadow-md">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg md:text-xl tracking-tight leading-none text-white">aura<span className="font-light text-white/70">study</span></span>
            <ChevronDown size={14} className={`text-white/50 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
          <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest opacity-50 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white/50"></span>
            {activeTheme.name}
          </span>
        </div>
      </div>

      <div className={`
        pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden w-full max-w-[90vw] md:max-w-2xl origin-top
        ${isExpanded ? 'opacity-100 translate-y-0 max-h-40' : 'opacity-0 -translate-y-4 max-h-0'}
      `}>
         <div className="glass-panel p-2 flex gap-2 overflow-x-auto custom-scrollbar">
            {THEMES.map(theme => (
              <button
                key={theme.id}
                onClick={() => setActiveTheme(theme)}
                className={`
                  relative w-16 h-16 md:w-20 md:h-20 rounded-2xl flex-shrink-0 overflow-hidden border-2 transition-all duration-300 group
                  ${activeTheme.id === theme.id ? 'border-white scale-100' : 'border-transparent opacity-50 hover:opacity-100 hover:scale-105'}
                `}
                title={theme.name}
              >
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${theme.url})` }} />
                <div className={`absolute inset-0 bg-black/40 transition-colors ${activeTheme.id === theme.id ? 'bg-transparent' : 'group-hover:bg-black/20'}`} />
                {activeTheme.id === theme.id && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full shadow-lg" />
                  </div>
                )}
              </button>
            ))}
         </div>
      </div>
    </header>
  );
};

// 3. Hero Section
interface HeroProps {
  appMode: 'DASHBOARD' | 'FOCUS';
  currentTime: Date;
  quote: string;
  totalStudyTime: number;
  timeLeft: number;
  isActive: boolean;
  toggleTimer: () => void;
  handleRefresh: () => void;
  mode: TimerMode;
  handleModeSwitch: (m: TimerMode) => void;
  getStatusText: () => string;
  mousePos: {x:number, y:number};
  scrollY: number;
  formatTimer: (seconds: number) => string;
}

const HeroSection: React.FC<HeroProps> = ({ 
  appMode, currentTime, quote, totalStudyTime, 
  timeLeft, isActive, toggleTimer, handleRefresh, mode, handleModeSwitch, getStatusText, mousePos, scrollY, formatTimer 
}) => {
  
  const getGreeting = (hour: number) => {
    if (hour >= 5 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 18) return 'Afternoon';
    if (hour >= 18 && hour < 22) return 'Evening';
    return 'Night';
  };

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: false });
  const isFinished = timeLeft === 0 && !isActive && mode !== TimerMode.STOPWATCH; // Basic check, ideally we track 'finished' state explicitly

  return (
    <section className="relative h-dvh w-full flex flex-col items-center justify-center overflow-hidden perspective-1000">
      {/* Ambient Glow */}
      <div className="ambient-glow" />

      {/* --- LAYER 0: MASSIVE CLOCK/TIMER (Background) --- */}
      <div 
        className="absolute inset-0 flex items-center justify-center z-0 pointer-events-auto"
        style={{ 
          transform: `translate(${mousePos.x * 10}px, ${mousePos.y * 10}px)`,
        }}
      >
        <FadeInSection className="flex items-center justify-center w-full relative">
        {appMode === 'DASHBOARD' ? (
           <h1 
             className="font-bold leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white/80 to-white/5 select-none animate-scale-up hover:scale-[1.02] transition-transform duration-700"
             style={{ fontSize: 'clamp(5rem, 25vw, 22rem)' }}
           >
              {formatTime(currentTime)}
           </h1>
        ) : (
           <div 
              className="group cursor-pointer transition-all duration-500 relative flex items-center justify-center" 
              onClick={toggleTimer}
           >
              {/* Visual State Indicator Ring */}
              <div 
                className={`absolute inset-0 -m-10 md:-m-20 rounded-full border transition-all duration-1000 pointer-events-none 
                    ${isActive ? 'opacity-100 animate-ring-pulse' : 'opacity-20 scale-90'} 
                    ${isFinished ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_100px_rgba(251,191,36,0.4)] opacity-100 scale-105' : ''}
                `}
                style={{ 
                  borderColor: isFinished ? '#fbbf24' : (isActive ? 'var(--theme-accent)' : 'rgba(255,255,255,0.1)'),
                  borderWidth: '1px'
                }}
              />
              {/* Secondary decorative ring */}
               <div 
                className={`absolute inset-0 -m-8 md:-m-16 rounded-full dashed-circle transition-all duration-1000 pointer-events-none ${isActive ? 'rotate-180 scale-105 opacity-40' : 'opacity-10'} ${isFinished ? 'opacity-0' : ''}`}
              />

              {/* CELEBRATION PARTICLES (CHAMPAGNE BUBBLES) */}
              {isFinished && (
                <div className="absolute inset-0 pointer-events-none overflow-visible">
                  {/* Main shockwave */}
                  <div className="absolute inset-0 -m-20 rounded-full border-2 border-amber-400/30 animate-ripple-expand" />
                  <div className="absolute inset-0 -m-20 rounded-full border border-amber-400/10 animate-ripple-expand" style={{ animationDelay: '0.3s' }} />
                  
                  {/* Champagne Bubbles Container - Centered */}
                  <div className="absolute top-1/2 left-1/2 w-40 h-40 -translate-x-1/2 -translate-y-1/2">
                    {[...Array(20)].map((_, i) => (
                      <div 
                        key={i}
                        className="absolute bg-amber-300 rounded-full mix-blend-screen opacity-0 animate-bubble-rise shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                        style={{
                           left: `${Math.random() * 100}%`,
                           bottom: '10%', 
                           width: `${4 + Math.random() * 8}px`,
                           height: `${4 + Math.random() * 8}px`,
                           animationDuration: `${1.5 + Math.random() * 1.5}s`,
                           animationDelay: `${Math.random() * 1}s`
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <h1 
                className={`font-bold leading-none tracking-tighter text-white select-none tabular-nums transition-all duration-700 relative z-10 
                  ${isActive ? 'animate-breathe' : 'opacity-80'}
                  ${isFinished ? 'text-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.6)]' : ''}
                `}
                style={{ fontSize: 'clamp(5rem, 25vw, 22rem)' }}
              >
                  {formatTimer(timeLeft)}
              </h1>
              {/* Play Hint */}
              {!isActive && !isFinished && timeLeft > 0 && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                    <Play className="w-[15vw] h-[15vw] max-w-[120px] max-h-[120px] text-white drop-shadow-2xl" fill="white" />
                </div>
              )}
               {/* Finished Hint */}
               {isFinished && (
                <div className="absolute bottom-[-60px] left-0 right-0 text-center animate-bounce z-20">
                    <span className="text-amber-400 font-bold uppercase tracking-widest text-sm md:text-lg drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">Session Complete</span>
                </div>
              )}
           </div>
        )}
        </FadeInSection>
      </div>

      {/* --- LAYER 1: INTERFACE ELEMENTS (Foreground) --- */}
      <div className="relative z-10 w-full h-full max-w-7xl flex flex-col items-center justify-between pt-24 pb-32 md:pt-32 md:pb-40 pointer-events-none px-4">
        
        {/* TOP AREA */}
        <div className="pointer-events-auto">
          {appMode === 'DASHBOARD' ? (
             // Dashboard Greeting & Stats
             <FadeInSection delay={200} className="translate-y-12 md:translate-y-24 lg:translate-y-32 flex flex-col items-center gap-4">
                <div className="px-6 py-2 md:px-8 md:py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
                   <p className="text-[10px] md:text-xs lg:text-sm font-bold text-white tracking-[0.3em] uppercase">
                     Good {getGreeting(currentTime.getHours())}
                   </p>
                </div>
                {totalStudyTime > 0 && (
                  <div className="flex items-center gap-2 text-white/60 bg-black/20 px-4 py-1.5 rounded-full border border-white/5 backdrop-blur-md">
                    <Clock size={14} className="text-white/40" />
                    <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-white/80">{formatTotalTime(totalStudyTime)} Focused Today</span>
                  </div>
                )}
             </FadeInSection>
          ) : (
             // Focus Mode Selectors
             <FadeInSection delay={100}>
               <div className="flex items-center gap-1 md:gap-2 bg-black/40 backdrop-blur-2xl p-1.5 md:p-2 rounded-full border border-white/10 shadow-2xl">
                  {[TimerMode.POMODORO, TimerMode.SHORT_BREAK, TimerMode.LONG_BREAK].map(m => (
                    <button
                      key={m}
                      onClick={() => handleModeSwitch(m)}
                      className={`px-4 py-2 md:px-6 md:py-3 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${mode === m ? 'bg-white text-black shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                      style={mode === m ? { backgroundColor: 'var(--theme-accent)', color: '#000' } : {}}
                    >
                      {m.replace('_', ' ')}
                    </button>
                  ))}
               </div>
             </FadeInSection>
          )}
        </div>

        {/* BOTTOM AREA */}
        <div className="pointer-events-auto flex flex-col items-center gap-6 w-full px-4">
           {appMode === 'DASHBOARD' ? (
             // Dashboard Quote Card
             <FadeInSection delay={400} className="w-full flex justify-center">
             <div className="relative group mt-4 md:mt-12 w-full max-w-md md:max-w-2xl">
                {/* Floating Badge */}
                <div className="absolute -top-4 md:-top-5 left-1/2 -translate-x-1/2 z-20">
                    <div className="px-4 py-1.5 md:px-6 md:py-2 rounded-full bg-[#1a1a1a] border border-white/10 shadow-xl">
                      <span className="text-[8px] md:text-[10px] font-bold text-white/80 tracking-widest uppercase">
                        Daily Wisdom
                      </span>
                    </div>
                </div>
                
                {/* The Card */}
                <div className="glass-panel p-6 md:p-10 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50" />
                    <p className="relative z-10 text-base md:text-xl lg:text-2xl font-medium leading-relaxed text-white/90 text-glow">
                      "{quote}"
                    </p>
                </div>
             </div>
             </FadeInSection>
           ) : (
             // Focus Active Controls
             <div className="flex flex-col items-center gap-6 animate-scale-up">
               {isActive ? (
                  <div 
                    className="px-6 py-2 md:px-8 md:py-3 rounded-full backdrop-blur-md shadow-2xl animate-pulse mb-2 md:mb-4 border"
                    style={{ 
                      backgroundColor: 'rgba(var(--theme-accent-rgb), 0.2)',
                      borderColor: 'rgba(var(--theme-accent-rgb), 0.3)',
                      boxShadow: '0 0 30px rgba(var(--theme-accent-rgb), 0.2)'
                    }}
                  >
                     <span className="font-bold tracking-[0.2em] uppercase text-xs md:text-sm flex items-center gap-3" style={{ color: 'var(--theme-accent)' }}>
                        <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full animate-ping" style={{ backgroundColor: 'var(--theme-accent)' }} />
                        {getStatusText()}
                     </span>
                  </div>
               ) : (
                  !isFinished && (
                    <div className="px-6 py-2 md:px-8 md:py-3 rounded-full border backdrop-blur-md mb-2 md:mb-4 bg-white/5 border-white/10">
                      <span className="font-bold tracking-[0.2em] uppercase text-[10px] md:text-xs text-white/50">
                          {getStatusText()}
                      </span>
                    </div>
                  )
               )}
               
               {isFinished ? (
                 <button
                    onClick={handleRefresh}
                    className="px-8 py-4 rounded-full bg-amber-500 text-black font-bold text-lg shadow-[0_0_40px_rgba(251,191,36,0.6)] hover:scale-105 transition-all animate-pulse active:scale-95"
                    aria-label="Stop Alarm"
                 >
                    STOP ALARM
                 </button>
               ) : (
                 <button
                    onClick={handleRefresh}
                    className="p-3 md:p-4 rounded-full border transition-all duration-300 backdrop-blur-md group active:scale-90 bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/10"
                    aria-label="Reset Timer"
                 >
                    <RotateCcw size={18} className="md:w-5 md:h-5 transition-transform duration-500 group-hover:rotate-180" />
                 </button>
               )}
             </div>
           )}
        </div>
      </div>
      
      {/* Scroll Hint */}
      <div 
        className="absolute bottom-6 md:bottom-8 animate-bounce opacity-30 flex flex-col items-center gap-2 pointer-events-none mix-blend-overlay"
        style={{ opacity: Math.max(0, 1 - scrollY / 300) * 0.3 }}
      >
        <span className="text-[7px] md:text-[8px] uppercase tracking-[0.3em] font-bold">Scroll to Explore</span>
        <ArrowDown size={14} className="md:w-4 md:h-4" />
      </div>
    </section>
  );
};

// 4. About Section
const AboutSection: React.FC = () => (
  <section className="w-full py-24 md:py-32 px-6 flex flex-col items-center justify-center relative z-10 bg-black/50 backdrop-blur-sm">
    <FadeInSection>
      <div className="max-w-3xl text-center space-y-8">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/40">
          Focus. Flow. Flourish.
        </h2>
        <p className="text-lg md:text-xl text-white/60 leading-relaxed font-light">
          AuraStudy combines scientifically-proven productivity techniques with immersive, AI-generated atmospheres to help you achieve deep work states effortlessly.
        </p>
      </div>
    </FadeInSection>
  </section>
);

// 5. Features Section
const FeaturesSection: React.FC = () => (
  <section className="w-full py-24 px-6 relative z-10 bg-black/80">
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
       {/* Feature Cards using FadeInSection */}
       <FadeInSection delay={100} className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-lg">
          <BrainCircuit className="w-10 h-10 text-emerald-400 mb-6" />
          <h3 className="text-xl font-bold text-white mb-3">AI Guidance</h3>
          <p className="text-white/50">Intelligent task breakdowns and ritual suggestions powered by Gemini.</p>
       </FadeInSection>
       <FadeInSection delay={200} className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-lg">
          <Sparkles className="w-10 h-10 text-amber-400 mb-6" />
          <h3 className="text-xl font-bold text-white mb-3">Immersive Ambience</h3>
          <p className="text-white/50">Curated soundscapes and dynamic themes that adapt to your focus needs.</p>
       </FadeInSection>
       <FadeInSection delay={300} className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-lg">
          <History className="w-10 h-10 text-cyan-400 mb-6" />
          <h3 className="text-xl font-bold text-white mb-3">Session Tracking</h3>
          <p className="text-white/50">Visualize your productivity velocity and build a consistent habit.</p>
       </FadeInSection>
    </div>
  </section>
);

// 6. Floating Controls
const FloatingControls = ({ showMixer, setShowMixer, volumes }: any) => {
  // Calculate if any sound is active for visual indicator
  const isAudioActive = Object.values(volumes).some((v: any) => v > 0);

  return (
    <div className="fixed bottom-32 right-6 md:bottom-12 md:right-12 z-40 flex flex-col gap-4">
      <button
        onClick={() => setShowMixer(!showMixer)}
        className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center backdrop-blur-xl border shadow-2xl transition-all duration-300 group ${
          showMixer || isAudioActive ? 'bg-white text-black border-white' : 'bg-black/40 text-white border-white/10 hover:bg-white/10'
        }`}
      >
        <div className="relative">
           <Volume2 size={20} className={isAudioActive && !showMixer ? 'animate-pulse' : ''} />
           {isAudioActive && (
             <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 shadow-lg" />
           )}
        </div>
        {/* Label on hover */}
        <span className="absolute right-full mr-4 px-3 py-1 rounded-full bg-black/80 border border-white/10 text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Sound Mixer
        </span>
      </button>
    </div>
  );
};

// 7. Dock
const Dock = ({ activeView, setView, toggleTasks, toggleSettings, toggleHistory, toggleFullscreen, isFullscreen, showTasks, showSettings, showHistory }: any) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 md:gap-3 p-2 rounded-full bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl">
      <DockItem 
        icon={<Home size={20} />} 
        label="Dashboard" 
        isActive={activeView === 'DASHBOARD'} 
        onClick={() => setView('DASHBOARD')} 
      />
      <DockItem 
        icon={<Target size={20} />} 
        label="Focus Mode" 
        isActive={activeView === 'FOCUS'} 
        onClick={() => setView('FOCUS')} 
      />
      <div className="w-px h-8 bg-white/10 mx-1 md:mx-2" />
      <DockItem icon={<Check size={20} />} label="Tasks" isActive={showTasks} onClick={toggleTasks} />
      <DockItem icon={<Settings2 size={20} />} label="Settings" isActive={showSettings} onClick={toggleSettings} />
      <DockItem icon={<History size={20} />} label="History" isActive={showHistory} onClick={toggleHistory} />
      <div className="w-px h-8 bg-white/10 mx-1 md:mx-2" />
      <DockItem 
        icon={isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />} 
        label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"} 
        onClick={toggleFullscreen} 
      />
    </div>
  );
};

const DockItem = ({ icon, label, isActive, onClick }: any) => (
  <button
    onClick={onClick}
    className={`relative group p-3 rounded-full transition-all duration-300 ${
      isActive ? 'bg-white text-black shadow-lg scale-110' : 'text-white/60 hover:text-white hover:bg-white/10'
    }`}
  >
    {icon}
    {/* Tooltip */}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 rounded-lg bg-black/90 border border-white/10 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-white opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none whitespace-nowrap">
      {label}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/90" />
    </div>
  </button>
);

// 8. Modals Wrapper
const ModalWrapper = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[85vh]">
         <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
            <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
              <X size={20} />
            </button>
         </div>
         <div className="overflow-y-auto p-6 custom-scrollbar">
            {children}
         </div>
      </div>
    </div>
  );
};

const Modals = ({ showMixer, setShowMixer, showTasks, setShowTasks, showSettings, setShowSettings, showHistory, setShowHistory, volumes, setVolumes, tasks, setTasks, settings, onSaveSettings, activeTheme, history, totalStudyTime }: any) => {
  const [newTaskInput, setNewTaskInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleVolumeChange = (id: string, val: number) => {
    setVolumes((prev: any) => ({ ...prev, [id]: val }));
  };

  const addTask = () => {
    if (!newTaskInput.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(),
      text: newTaskInput,
      completed: false,
      isPriority: false
    };
    setTasks([newTask, ...tasks]);
    setNewTaskInput("");
  };

  const generateAI = async () => {
    if (!newTaskInput.trim()) return;
    setIsGenerating(true);
    try {
      const subtasks = await generateSubtasks(newTaskInput);
      const newTasks = subtasks.map((st, i) => ({
        id: `${Date.now()}-${i}`,
        text: st,
        completed: false,
        isPriority: false
      }));
      setTasks([...newTasks, ...tasks]);
      setNewTaskInput("");
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map((t: Task) => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter((t: Task) => t.id !== id));
  };

  // Settings State
  const [localSettings, setLocalSettings] = useState(settings);
  useEffect(() => { setLocalSettings(settings) }, [settings]);

  return (
    <>
      {/* MIXER MODAL */}
      <ModalWrapper isOpen={showMixer} onClose={() => setShowMixer(false)} title="Soundscape Mixer">
         <div className="space-y-6">
            {AMBIENT_SOUNDS.map(sound => (
              <div key={sound.id} className="flex items-center gap-4">
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${volumes[sound.id] > 0 ? 'bg-white text-black' : 'bg-white/5 text-white/40'}`}>
                    {/* Icons mapping could be improved but simple fallback for now */}
                    <Music size={18} />
                 </div>
                 <div className="flex-1">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-white">{sound.name}</span>
                      <span className="text-xs text-white/40">{Math.round(volumes[sound.id] * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01" 
                      value={volumes[sound.id]} 
                      onChange={(e) => handleVolumeChange(sound.id, parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer hover:bg-white/20 transition-all"
                    />
                 </div>
              </div>
            ))}
         </div>
      </ModalWrapper>

      {/* TASKS MODAL */}
      <ModalWrapper isOpen={showTasks} onClose={() => setShowTasks(false)} title="Deep Work Tasks">
         <TaskProgressGraph tasks={tasks} accentColor={activeTheme.accent} />
         
         <div className="flex gap-2 mb-6">
            <input 
              type="text" 
              value={newTaskInput}
              onChange={(e) => setNewTaskInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              placeholder="What's your goal?" 
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-all placeholder:text-white/20"
            />
            <button onClick={addTask} className="p-3 rounded-xl bg-white text-black hover:bg-gray-200 transition-colors">
              <Plus size={20} />
            </button>
         </div>
         
         <button 
           onClick={generateAI} 
           disabled={isGenerating || !newTaskInput.trim()}
           className="w-full mb-6 py-3 rounded-xl border border-white/10 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all"
         >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            AI Breakdown
         </button>

         <div className="space-y-2">
            {tasks.length === 0 ? (
               <div className="text-center py-8 text-white/20 text-sm">No active tasks.</div>
            ) : (
               tasks.map((task: Task) => (
                 <div key={task.id} className="group flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all">
                    <button 
                      onClick={() => toggleTask(task.id)}
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-white/20 hover:border-white/40'}`}
                    >
                      {task.completed && <Check size={12} className="text-black" />}
                    </button>
                    <span className={`flex-1 text-sm ${task.completed ? 'text-white/30 line-through' : 'text-white/80'}`}>{task.text}</span>
                    <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all p-1">
                      <Trash2 size={16} />
                    </button>
                 </div>
               ))
            )}
         </div>
      </ModalWrapper>

      {/* SETTINGS MODAL */}
       <ModalWrapper isOpen={showSettings} onClose={() => setShowSettings(false)} title="Timer Configuration">
         <div className="space-y-6">
            <div className="space-y-4">
               {[
                 { label: 'Pomodoro (min)', key: 'pomodoro', min: 1, max: 90 },
                 { label: 'Short Break (min)', key: 'shortBreak', min: 1, max: 30 },
                 { label: 'Long Break (min)', key: 'longBreak', min: 1, max: 60 }
               ].map(setting => (
                 <div key={setting.key} className="flex justify-between items-center">
                    <label className="text-sm text-white/60">{setting.label}</label>
                    <div className="flex items-center gap-4">
                       <span className="text-sm font-mono w-8 text-right">{(localSettings as any)[setting.key]}</span>
                       <input 
                         type="range" 
                         min={setting.min} 
                         max={setting.max} 
                         value={(localSettings as any)[setting.key]}
                         onChange={(e) => setLocalSettings({ ...localSettings, [setting.key]: parseInt(e.target.value) })}
                         className="w-32 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer hover:bg-white/20"
                       />
                    </div>
                 </div>
               ))}
            </div>
            <div className="pt-4 border-t border-white/5 flex justify-end">
               <button 
                 onClick={() => onSaveSettings(localSettings)}
                 className="px-6 py-2 rounded-full bg-white text-black font-bold text-sm hover:scale-105 active:scale-95 transition-all"
               >
                 Save Changes
               </button>
            </div>
         </div>
       </ModalWrapper>

       {/* HISTORY MODAL */}
       <ModalWrapper isOpen={showHistory} onClose={() => setShowHistory(false)} title="Session History">
          <div className="space-y-2">
             {history.length === 0 ? (
               <div className="text-center py-10 text-white/30">
                  <CalendarClock size={32} className="mx-auto mb-3 opacity-50" />
                  <p>No completed sessions yet.</p>
               </div>
             ) : (
               history.map((session: StudySession, i: number) => (
                 <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                          <Check size={14} />
                       </div>
                       <div>
                          <p className="text-sm font-medium text-white">{session.mode}</p>
                          <p className="text-xs text-white/40">{new Date(session.timestamp).toLocaleDateString()} • {new Date(session.timestamp).toLocaleTimeString()}</p>
                       </div>
                    </div>
                    <span className="font-mono text-sm text-white/60">
                      {Math.floor(session.duration / 60)}m
                    </span>
                 </div>
               ))
             )}
          </div>
       </ModalWrapper>
    </>
  )
}

export default App;