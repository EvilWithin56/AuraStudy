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

  // Quotes
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
      
      // Trigger Sound
      if (notificationAudio.current) {
        notificationAudio.current.currentTime = 0;
        notificationAudio.current.play().catch(e => console.log("Audio play failed", e));
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
    setIsActive(false);
    setTimeLeft(getInitialTime(mode));
  };

  const handleModeSwitch = (newMode: TimerMode) => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(getInitialTime(newMode));
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

        @keyframes particle-rise {
          0% { transform: rotate(var(--angle)) translateY(0) scale(0); opacity: 0; }
          20% { opacity: 1; transform: rotate(var(--angle)) translateY(-20px) scale(1); }
          100% { transform: rotate(var(--angle)) translateY(calc(var(--dist) * -1)) scale(0.5); opacity: 0; }
        }
        .animate-particle-rise {
          animation: particle-rise 2s ease-out infinite;
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
          setIsActive={setIsActive}
          mode={mode}
          setMode={setMode}
          handleRefresh={handleRefresh}
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
  setIsActive: (val: boolean) => void;
  mode: TimerMode;
  setMode: (m: TimerMode) => void;
  handleRefresh: () => void;
  handleModeSwitch: (m: TimerMode) => void;
  getStatusText: () => string;
  mousePos: {x:number, y:number};
  scrollY: number;
  formatTimer: (seconds: number) => string;
}

const HeroSection: React.FC<HeroProps> = ({ 
  appMode, currentTime, quote, totalStudyTime, 
  timeLeft, isActive, setIsActive, mode, setMode, handleRefresh, handleModeSwitch, getStatusText, mousePos, scrollY, formatTimer 
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
              onClick={() => timeLeft > 0 ? setIsActive(!isActive) : handleRefresh()}
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

              {/* CELEBRATION PARTICLES */}
              {isFinished && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 -m-20 rounded-full border-2 border-amber-400/30 animate-ripple-expand" />
                  <div className="absolute inset-0 -m-20 rounded-full border border-amber-400/10 animate-ripple-expand" style={{ animationDelay: '0.3s' }} />
                  {/* Floating particles */}
                  {[...Array(12)].map((_, i) => (
                      <div 
                        key={i}
                        className="absolute top-1/2 left-1/2 w-2 h-2 bg-amber-300 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-particle-rise"
                        style={{
                           '--angle': `${i * 30}deg`,
                           '--dist': `${150 + Math.random() * 50}px`,
                           animationDelay: `${Math.random() * 0.5}s`
                        } as React.CSSProperties}
                      />
                  ))}
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
                <div className="absolute bottom-[-60px] left-0 right-0 text-center animate-bounce">
                    <span className="text-amber-400 font-bold uppercase tracking-widest text-sm md:text-lg">Session Complete</span>
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
             <FadeInSection delay={300} className="flex flex-col items-center gap-6">
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
                  <div className={`px-6 py-2 md:px-8 md:py-3 rounded-full border backdrop-blur-md mb-2 md:mb-4 ${timeLeft === 0 && mode !== TimerMode.STOPWATCH ? 'bg-amber-500/20 border-amber-500/50' : 'bg-white/5 border-white/10'}`}>
                     <span className={`font-bold tracking-[0.2em] uppercase text-[10px] md:text-xs ${timeLeft === 0 && mode !== TimerMode.STOPWATCH ? 'text-amber-400' : 'text-white/50'}`}>
                        {timeLeft === 0 && mode !== TimerMode.STOPWATCH ? 'Great Job!' : getStatusText()}
                     </span>
                  </div>
               )}
               
               <button
                  onClick={handleRefresh}
                  className={`p-3 md:p-4 rounded-full border transition-all duration-300 backdrop-blur-md group active:scale-90 ${timeLeft === 0 && mode !== TimerMode.STOPWATCH ? 'bg-amber-500/20 border-amber-500/50 text-amber-200 hover:bg-amber-500/30' : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/10'}`}
                  aria-label="Reset Timer"
               >
                  <RotateCcw size={18} className={`md:w-5 md:h-5 transition-transform duration-500 group-hover:rotate-180 ${timeLeft === 0 && mode !== TimerMode.STOPWATCH ? 'animate-spin-slow' : ''}`} />
               </button>
             </FadeInSection>
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
  <section className="min-h-[70vh] w-full flex items-center justify-center bg-black/40 backdrop-blur-md border-t border-white/5 relative z-20 overflow-hidden">
    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none transform translate-x-1/2 -translate-y-1/2" />
    <div className="max-w-5xl px-8 py-32 text-center relative z-10">
      <FadeInSection>
        <ShinyText 
          text="Flow State On Demand." 
          disabled={false} 
          speed={3} 
          className="text-4xl md:text-6xl lg:text-8xl font-bold tracking-tighter mb-8 md:mb-12" 
        />
      </FadeInSection>
      <FadeInSection delay={200}>
        <p className="text-lg md:text-2xl lg:text-3xl text-white/70 leading-relaxed font-medium max-w-3xl mx-auto">
          AuraStudy isn't just a clock; it's a <span className="text-white font-bold border-b border-white/20 pb-1">sensory environment</span> designed to trigger deep focus. 
          With spatial audio soundscapes, circadian lighting adaptation, and intelligent rhythm tracking.
        </p>
      </FadeInSection>
    </div>
  </section>
);

// 5. Features Section
const FeaturesSection: React.FC = () => (
  <section className="min-h-screen w-full bg-black/60 backdrop-blur-xl px-4 md:px-8 py-32 flex flex-col items-center relative z-20">
    <div className="max-w-6xl w-full">
      <FadeInSection className="mb-16 text-center">
        <h3 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Crafted for Focus</h3>
        <p className="text-white/50 text-base md:text-lg">Every detail designed to keep you in the zone.</p>
      </FadeInSection>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <FadeInSection>
            <FeatureCard 
              icon={<BrainCircuit size={32} className="text-purple-300" />}
              title="Neural Entrainment"
              desc="Binaural beats layered under nature sounds to align your brainwaves for peak cognitive performance."
              color="purple"
              large
            />
          </FadeInSection>
        </div>

        <FadeInSection delay={100}>
          <FeatureCard 
            icon={<Sparkles size={32} className="text-amber-300" />}
            title="AI Motivation"
            desc="Dynamic quotes and coaching tips tailored to your current patterns."
            color="amber"
          />
        </FadeInSection>

        <FadeInSection delay={200}>
          <FeatureCard 
            icon={<CloudRain size={32} className="text-blue-300" />}
            title="Dynamic Atmospheres"
            desc="From Kyoto Zen Gardens to Cyberpunk Cities—immersive visual themes."
            color="blue"
          />
        </FadeInSection>

        <div className="md:col-span-2">
          <FadeInSection delay={300}>
              <FeatureCard 
              icon={<Target size={32} className="text-emerald-300" />}
              title="Smart Analytics"
              desc="Track your flow cycles without the clutter. Just pure, actionable insights on your productivity."
              color="emerald"
              large
            />
          </FadeInSection>
        </div>
      </div>
      
      <FadeInSection delay={400} className="mt-20 md:mt-40 text-center pb-32 md:pb-48">
        <h3 className="text-3xl md:text-5xl font-bold mb-8">Ready to dive in?</h3>
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="px-8 py-4 md:px-12 md:py-5 bg-white text-black rounded-[32px] font-bold text-lg md:text-xl hover:bg-white/90 hover:scale-105 transition-all active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.3)]"
        >
          Start Focusing Now
        </button>
      </FadeInSection>
    </div>
  </section>
);

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, desc: string, color?: string, large?: boolean }> = ({ icon, title, desc, color = "white", large = false }) => (
  <div className={`glass-panel p-6 md:p-10 h-full transition-all duration-500 hover:scale-[1.02] group relative overflow-hidden flex flex-col ${large ? 'justify-end' : ''}`}>
    <div className={`absolute inset-0 bg-gradient-to-br from-${color}-500/0 to-${color}-500/0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 group-hover:from-${color}-500/20 group-hover:to-transparent`} />
    <div className={`mb-4 md:mb-6 p-3 md:p-4 rounded-[20px] bg-white/5 w-fit border border-white/5 group-hover:border-white/20 transition-all duration-500 group-hover:scale-110 group-hover:bg-${color}-500/20`}>
      {icon}
    </div>
    <h3 className="text-2xl md:text-3xl font-bold mb-2 md:mb-3 tracking-tight group-hover:translate-x-1 transition-transform">{title}</h3>
    <p className="text-white/60 leading-relaxed font-medium text-base md:text-lg group-hover:text-white/80 transition-colors">{desc}</p>
  </div>
);

// 6. Floating Controls
const FloatingControls = ({ showMixer, setShowMixer, volumes }: { showMixer: boolean, setShowMixer: (v:boolean)=>void, volumes: Record<string,number> }) => {
  const isAudioPlaying = Object.values(volumes).some(v => v > 0);
  return (
    <div className="fixed bottom-4 left-4 md:bottom-10 md:left-10 z-50 flex items-end gap-3 md:gap-5 pointer-events-auto">
      <button 
        onClick={() => setShowMixer(!showMixer)}
        className={`relative w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center glass-panel transition-all duration-300 active:scale-90 group overflow-hidden ${showMixer ? 'bg-white text-black border-transparent' : 'hover:bg-white/10'}`}
      >
        <Music size={20} className={`md:w-7 md:h-7 transition-all duration-300 ${showMixer ? 'scale-110' : 'opacity-80'}`} />
      </button>
      {isAudioPlaying && (
        <div className="flex items-end gap-1 h-8 md:h-10 pb-2 md:pb-4 opacity-90 drop-shadow-lg">
          <div className="visualizer-bar h-full shadow-lg"></div>
          <div className="visualizer-bar h-full shadow-lg"></div>
          <div className="visualizer-bar h-full shadow-lg"></div>
          <div className="visualizer-bar h-full shadow-lg"></div>
        </div>
      )}
    </div>
  );
};

// 7. Dock
const Dock: React.FC<{ 
  activeView: string;
  setView: (v: 'DASHBOARD' | 'FOCUS') => void;
  toggleTasks: () => void;
  toggleSettings: () => void;
  toggleHistory: () => void;
  toggleFullscreen: () => void;
  isFullscreen: boolean;
  showTasks: boolean;
  showSettings: boolean;
  showHistory: boolean;
}> = ({ activeView, setView, toggleTasks, toggleSettings, toggleHistory, toggleFullscreen, isFullscreen, showTasks, showSettings, showHistory }) => {
  return (
    <div className="fixed bottom-4 md:bottom-10 left-0 right-0 z-50 flex justify-center pointer-events-auto">
      <div 
        className="glass-panel px-4 py-3 md:px-6 md:py-4 rounded-[32px] md:rounded-[40px] flex items-center gap-2 md:gap-4 transition-all duration-300 border border-white/10 shadow-2xl backdrop-blur-2xl bg-black/20 scale-[0.85] md:scale-100 origin-bottom"
      >
        <DockButton onClick={() => { setView('DASHBOARD'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} isActive={activeView === 'DASHBOARD'} icon={<Home size={26} />} label="Home" />
        <DockButton onClick={() => { setView('FOCUS'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} isActive={activeView === 'FOCUS'} icon={<Monitor size={26} />} label="Focus" />
        <div className="w-[1px] h-8 md:h-10 bg-white/10 mx-1 md:mx-2 self-center" />
        <DockButton onClick={toggleTasks} isActive={showTasks} icon={<Layout size={26} />} label="Tasks" />
        <DockButton onClick={toggleHistory} isActive={showHistory} icon={<History size={26} />} label="History" />
        <DockButton onClick={toggleSettings} isActive={showSettings} icon={<Settings2 size={26} />} label="Settings" />
        <DockButton onClick={toggleFullscreen} isActive={isFullscreen} icon={isFullscreen ? <Minimize2 size={26} /> : <Maximize2 size={26} />} label="Screen" />
      </div>
    </div>
  );
};

const DockButton: React.FC<{ onClick: () => void; isActive: boolean; icon: React.ReactNode; label: string }> = ({ onClick, isActive, icon, label }) => (
  <div className="flex flex-col items-center gap-1 group">
    <button 
      onClick={onClick}
      className={`w-12 h-12 md:w-16 md:h-16 rounded-[18px] md:rounded-[22px] flex items-center justify-center transition-all duration-300 active:scale-90 relative overflow-hidden ${isActive ? 'shadow-lg scale-105' : 'bg-transparent text-white/50 hover:bg-white/10 hover:text-white'}`}
      style={isActive ? { backgroundColor: 'var(--theme-accent)', color: '#000' } : {}}
    >
      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-[22px]" />
      <div className="relative z-10">
        {React.cloneElement(icon as React.ReactElement<any>, { size: 24, className: "md:w-7 md:h-7 w-5 h-5" })}
      </div>
    </button>
  </div>
);

// 8. Modals Container
const Modals = ({
  showMixer, setShowMixer, showTasks, setShowTasks, showSettings, setShowSettings, showHistory, setShowHistory,
  volumes, setVolumes, tasks, setTasks, settings, onSaveSettings, activeTheme, history, totalStudyTime
}: any) => {

  const [newTaskText, setNewTaskText] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'CloudRain': return <CloudRain size={20} />;
      case 'Flame': return <Flame size={20} />;
      case 'Trees': return <Trees size={20} />;
      case 'Waves': return <Waves size={20} />;
      case 'Music': return <Music size={20} />;
      default: return <Volume2 size={20} />;
    }
  };

  const addTask = () => {
    if (!newTaskText.trim()) return;
    setTasks((prev: any) => [{ id: Math.random().toString(36), text: newTaskText, completed: false, isPriority: false, isAnimating: true }, ...prev]);
    setNewTaskText("");
  };

  const togglePriority = (id: string) => {
    setTasks((prev: any) => prev.map((t: any) => t.id === id ? { ...t, isPriority: !t.isPriority } : t));
  };

  const handleDelete = (id: string) => {
    // Mark as deleting to trigger exit animation
    setTasks((prev: any[]) => prev.map((t: any) => t.id === id ? { ...t, isDeleting: true } : t));
    
    // Actually remove after animation finishes
    setTimeout(() => {
      setTasks((prev: any[]) => prev.filter((t: any) => t.id !== id));
    }, 400);
  };

  const handleAiBreakdown = async () => {
    if (!newTaskText.trim()) return;
    setIsThinking(true);
    try {
      const subtasks = await generateSubtasks(newTaskText);
      const newTasksObj = subtasks.map(text => ({
        id: Math.random().toString(36),
        text,
        completed: false,
        isPriority: false,
        isAnimating: true
      }));
      setTasks((prev: any) => [...newTasksObj, ...prev]);
      setNewTaskText("");
    } catch (e) {
      addTask();
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <>
      {showMixer && (
        <div className="fixed bottom-24 md:bottom-36 left-4 md:left-10 z-50 w-[90vw] max-w-sm md:w-96 glass-panel p-6 md:p-8 animate-blur-fade origin-bottom-left shadow-2xl">
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <h3 className="font-bold text-xl md:text-2xl tracking-tight text-white flex items-center gap-3">
              <Music size={24} className="text-white/50"/>
              Soundscape
            </h3>
            <button onClick={() => setVolumes({ rain: 0, lofi: 0, fire: 0, forest: 0, jazz: 0, waves: 0, classical: 0 })} className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/50 hover:text-white transition-colors bg-white/5 px-3 py-1.5 md:px-4 md:py-2 rounded-full hover:bg-white/10">Silence</button>
          </div>
          <div className="space-y-4 md:space-y-6 max-h-[40vh] md:max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            {AMBIENT_SOUNDS.map(sound => (
              <div key={sound.id} className="group">
                <div className="flex items-center gap-3 md:gap-4 mb-2 md:mb-3">
                  <div 
                    className={`p-2.5 md:p-3 rounded-xl md:rounded-2xl transition-colors shadow-lg ${volumes[sound.id] > 0 ? '' : 'bg-white/5 text-white/50 group-hover:bg-white/10 group-hover:text-white'}`}
                    style={volumes[sound.id] > 0 ? { backgroundColor: 'var(--theme-accent)', color: '#000' } : {}}
                  >
                    {getIcon(sound.icon)}
                  </div>
                  <span className="text-sm font-semibold tracking-wide text-white/90 flex-1">{sound.name}</span>
                  <span className="text-xs font-bold font-mono text-white/40 w-8 text-right">{(volumes[sound.id] * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.05"
                  value={volumes[sound.id]}
                  onChange={(e) => setVolumes({...volumes, [sound.id]: parseFloat(e.target.value)})}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {showTasks && (
        <div className="fixed bottom-24 md:bottom-40 right-1/2 translate-x-1/2 z-50 w-[90vw] max-w-md md:w-[460px] glass-panel p-6 md:p-8 animate-blur-fade origin-bottom shadow-2xl border-white/20">
          <div className="flex justify-between items-center mb-6 md:mb-8">
             <h3 className="font-bold text-xl md:text-2xl tracking-tight text-white flex items-center gap-3">
               <Target size={24} className="text-white/50"/>
               Goals
             </h3>
             <span className="text-[10px] md:text-xs font-bold bg-white/10 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-white/60 border border-white/5">{tasks.filter((t:any) => t.completed).length} / {tasks.length}</span>
          </div>

          <TaskProgressGraph tasks={tasks} accentColor={activeTheme.accent} />
          
          <div className="flex gap-2 md:gap-3 mb-6 md:mb-8">
            <input 
              value={newTaskText} 
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (newTaskText.trim().length > 10 ? handleAiBreakdown() : addTask())}
              disabled={isThinking}
              placeholder="Add a goal or AI breakdown..." 
              className="flex-1 bg-black/30 border border-white/10 rounded-[20px] md:rounded-[24px] px-4 py-3 md:px-6 md:py-4 text-xs md:text-sm font-semibold text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:bg-black/50 transition-all disabled:opacity-50"
            />
            <button 
              onClick={handleAiBreakdown}
              disabled={!newTaskText.trim() || isThinking}
              className="px-4 md:px-5 bg-gradient-to-r from-amber-200/20 to-purple-200/20 text-amber-200 border border-white/10 rounded-[20px] md:rounded-[24px] font-bold hover:bg-white/10 hover:border-amber-200/50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[3rem]"
              title="Break down with AI"
            >
              {isThinking ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles size={20} />}
            </button>
            <button 
              onClick={addTask} 
              disabled={isThinking}
              className="px-4 md:px-5 bg-white text-black rounded-[20px] md:rounded-[24px] font-bold hover:bg-white/90 transition-colors active:scale-95 disabled:opacity-50"
            >
              <Plus size={20} className="md:w-6 md:h-6"/>
            </button>
          </div>

          <div className="space-y-2 md:space-y-3 max-h-[35vh] md:max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
             {tasks.length === 0 && <p className="text-center text-white/30 text-xs md:text-sm py-8 md:py-12 font-medium bg-white/5 rounded-[24px] border border-white/5">No goals set. Start by adding one above.</p>}
             {tasks.map((task: any) => (
                <div 
                    key={task.id} 
                    className={`group flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-[20px] md:rounded-[24px] border hover:border-white/20 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.98] cursor-pointer
                        ${task.isDeleting ? 'opacity-0 -translate-x-full scale-90 overflow-hidden !h-0 !p-0 !m-0 border-0' : 'opacity-100 translate-x-0'}
                        ${task.isAnimating ? 'animate-scale-up' : ''}
                        ${task.isPriority ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}
                    `} 
                    style={task.isDeleting ? { transitionProperty: 'all', transitionDuration: '0.4s' } : {}}
                    onClick={() => setTasks((prev:any) => prev.map((t:any) => t.id === task.id ? { ...t, completed: !t.completed } : t))}
                >
                  <div 
                    className={`w-6 h-6 md:w-7 md:h-7 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${task.completed ? 'scale-110 shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'border-white/30 text-transparent hover:border-white'}`}
                    style={task.completed ? { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)', boxShadow: '0 0 15px rgba(var(--theme-accent-rgb), 0.4)' } : {}}
                  >
                    <Check size={14} strokeWidth={4} className={`text-black md:w-4 md:h-4 transition-transform duration-300 ${task.completed ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} />
                  </div>
                  <span className={`flex-1 text-xs md:text-sm font-semibold transition-all duration-500 ${task.completed ? 'text-white/30 line-through decoration-white/30' : 'text-white/90'}`}>{task.text}</span>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); togglePriority(task.id); }} 
                    className={`p-2 rounded-full transition-all duration-300 hover:bg-white/10 ${task.isPriority ? 'text-amber-400 scale-110' : 'text-white/20 hover:text-amber-200'}`}
                    title="Toggle Priority"
                  >
                    <Star size={16} fill={task.isPriority ? "currentColor" : "none"} className="md:w-5 md:h-5" />
                  </button>

                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }} 
                    className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 hover:bg-red-500/10 hover:scale-110 transition-all duration-300 p-2 rounded-full"
                  >
                    <Trash2 size={14} className="md:w-4 md:h-4"/>
                  </button>
                </div>
             ))}
          </div>
        </div>
      )}

      <HistoryModal 
        show={showHistory}
        onClose={() => setShowHistory(false)}
        history={history}
        totalStudyTime={totalStudyTime}
        activeTheme={activeTheme}
      />

      <SettingsModal 
        show={showSettings} 
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={onSaveSettings}
        activeTheme={activeTheme}
      />
    </>
  );
};

const HistoryModal = ({ show, onClose, history, totalStudyTime, activeTheme }: any) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 pointer-events-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="glass-panel w-full max-w-lg p-6 md:p-8 relative z-10 animate-scale-up shadow-2xl border-white/20">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-bold text-2xl tracking-tight text-white flex items-center gap-3">
            <CalendarClock size={24} className="text-white/50" />
            Session History
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <X size={20} className="text-white/50" />
          </button>
        </div>

        {/* Stats Header */}
        <div className="grid grid-cols-2 gap-4 mb-8">
           <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white mb-1">{history.length}</span>
              <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Total Sessions</span>
           </div>
           <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white mb-1">{formatTotalTime(totalStudyTime)}</span>
              <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Total Focus</span>
           </div>
        </div>

        <div className="space-y-3 max-h-[40vh] md:max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
           {history.length === 0 && (
             <div className="text-center py-12 text-white/30 flex flex-col items-center gap-3">
                <History size={32} className="opacity-50" />
                <p className="text-sm">No sessions completed yet.</p>
             </div>
           )}
           {history.map((session: StudySession, idx: number) => (
             <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10"
                    style={{ color: session.mode === TimerMode.POMODORO ? activeTheme.accent : 'white' }}
                  >
                     {session.mode === TimerMode.POMODORO ? <Zap size={18} /> : <Check size={18} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-white">{session.mode === TimerMode.POMODORO ? 'Deep Focus' : 'Break'}</span>
                    <span className="text-xs text-white/40">{new Date(session.timestamp).toLocaleDateString()} • {new Date(session.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>
                <span className="font-mono font-bold text-white/80">{Math.floor(session.duration / 60)} min</span>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

const SettingsModal = ({ show, onClose, settings, onSave, activeTheme }: any) => {
  const [localSettings, setLocalSettings] = useState(settings);

  // Reset local state when modal opens
  useEffect(() => {
    if (show) setLocalSettings(settings);
  }, [show, settings]);

  if (!show) return null;

  const handleChange = (key: keyof TimerSettings, value: number) => {
    setLocalSettings((prev: TimerSettings) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 pointer-events-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="glass-panel w-full max-w-md p-6 md:p-8 relative z-10 animate-scale-up shadow-2xl border-white/20">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-bold text-2xl tracking-tight text-white flex items-center gap-3">
            <Settings2 size={24} className="text-white/50" />
            Configuration
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <X size={20} className="text-white/50" />
          </button>
        </div>

        <div className="space-y-8">
          {/* Pomodoro */}
          <div className="group">
            <div className="flex justify-between items-end mb-3">
              <label className="text-sm font-bold text-white/60 group-hover:text-white transition-colors">Focus Duration</label>
              <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-white">{localSettings.pomodoro} min</span>
            </div>
            <input 
              type="range" min="1" max="90" step="1"
              value={localSettings.pomodoro} 
              onChange={(e) => handleChange('pomodoro', parseInt(e.target.value))} 
              className="w-full"
            />
          </div>

          {/* Short Break */}
          <div className="group">
            <div className="flex justify-between items-end mb-3">
              <label className="text-sm font-bold text-white/60 group-hover:text-white transition-colors">Short Break</label>
              <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-white">{localSettings.shortBreak} min</span>
            </div>
            <input 
              type="range" min="2" max="15" step="1"
              value={localSettings.shortBreak} 
              onChange={(e) => handleChange('shortBreak', parseInt(e.target.value))} 
              className="w-full"
            />
          </div>

          {/* Long Break */}
          <div className="group">
            <div className="flex justify-between items-end mb-3">
              <label className="text-sm font-bold text-white/60 group-hover:text-white transition-colors">Long Break</label>
              <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-white">{localSettings.longBreak} min</span>
            </div>
            <input 
              type="range" min="10" max="45" step="5"
              value={localSettings.longBreak} 
              onChange={(e) => handleChange('longBreak', parseInt(e.target.value))} 
              className="w-full"
            />
          </div>

          {/* Long Break Interval */}
          <div className="group">
             <div className="flex justify-between items-end mb-3">
              <label className="text-sm font-bold text-white/60 group-hover:text-white transition-colors">Long Break Interval</label>
              <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-white">{localSettings.longBreakInterval} sessions</span>
            </div>
            <input 
              type="range" min="2" max="8" step="1"
              value={localSettings.longBreakInterval} 
              onChange={(e) => handleChange('longBreakInterval', parseInt(e.target.value))} 
              className="w-full"
            />
             <p className="text-[10px] text-white/30 mt-2">Number of focus sessions before a long break.</p>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4">
          <button 
            onClick={onClose}
            className="py-3.5 rounded-2xl font-bold text-sm bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(localSettings)}
            className="py-3.5 rounded-2xl font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all text-black"
            style={{ backgroundColor: activeTheme.accent }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;