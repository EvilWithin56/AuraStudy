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
      setIsActive(false);
      if (notificationAudio.current) notificationAudio.current.play().catch(() => {});
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, timeLeft, mode]);

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
        toggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        showTasks={showTasks}
        showSettings={showSettings}
      />

      <Modals 
        showMixer={showMixer}
        setShowMixer={setShowMixer}
        showTasks={showTasks}
        setShowTasks={setShowTasks}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        volumes={volumes}
        setVolumes={setVolumes}
        tasks={tasks}
        setTasks={setTasks}
        settings={settings}
        setSettings={setSettings}
        activeTheme={activeTheme}
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
const TopBar = ({ activeTheme, setActiveTheme }: { activeTheme: Theme, setActiveTheme: (t: Theme) => void }) => (
  <header className="fixed top-0 w-full p-4 md:p-8 z-50 flex justify-between items-start pointer-events-none">
    <div 
      className="flex items-center gap-3 md:gap-4 group cursor-pointer pointer-events-auto active:scale-95 transition-transform" 
      onClick={() => {
        const currentIndex = THEMES.findIndex(t => t.id === activeTheme.id);
        setActiveTheme(THEMES[(currentIndex + 1) % THEMES.length]);
      }}
    >
      <div className="w-12 h-12 md:w-14 md:h-14 rounded-[20px] md:rounded-[24px] bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all duration-300 shadow-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        {/* Dynamic Accent Color for Leaf */}
        <Leaf size={24} className="relative z-10 w-5 h-5 md:w-6 md:h-6" style={{ color: 'var(--theme-accent)' }} />
      </div>
      <div className="flex flex-col drop-shadow-md">
        <span className="font-bold text-lg md:text-xl tracking-tight leading-none text-white">aura<span className="font-light text-white/70">study</span></span>
        <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest opacity-50 mt-1 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white/50"></span>
          Theme {THEMES.findIndex(t => t.id === activeTheme.id) + 1}
        </span>
      </div>
    </div>
  </header>
);

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
}

const HeroSection: React.FC<HeroProps> = ({ 
  appMode, currentTime, quote, totalStudyTime, 
  timeLeft, isActive, setIsActive, mode, setMode, handleRefresh, handleModeSwitch, getStatusText, mousePos, scrollY 
}) => {
  
  const getGreeting = (hour: number) => {
    if (hour >= 5 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 18) return 'Afternoon';
    if (hour >= 18 && hour < 22) return 'Evening';
    return 'Night';
  };

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: false });
  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

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
        <FadeInSection className="flex items-center justify-center w-full">
        {appMode === 'DASHBOARD' ? (
           <h1 
             className="font-bold leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white/80 to-white/5 select-none animate-scale-up hover:scale-[1.02] transition-transform duration-700"
             style={{ fontSize: 'clamp(5rem, 25vw, 22rem)' }}
           >
              {formatTime(currentTime)}
           </h1>
        ) : (
           <div 
              className="group cursor-pointer transition-all duration-500" 
              onClick={() => setIsActive(!isActive)}
           >
              <h1 
                className={`font-bold leading-none tracking-tighter text-white select-none tabular-nums transition-all duration-700 ${isActive ? 'animate-breathe' : 'opacity-80'}`}
                style={{ fontSize: 'clamp(5rem, 25vw, 22rem)' }}
              >
                  {formatTimer(timeLeft)}
              </h1>
              {/* Play Hint */}
              {!isActive && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Play className="w-[15vw] h-[15vw] max-w-[120px] max-h-[120px] text-white drop-shadow-2xl" fill="white" />
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
             // Dashboard Greeting
             <FadeInSection delay={200} className="translate-y-12 md:translate-y-24 lg:translate-y-32">
                <div className="px-6 py-2 md:px-8 md:py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
                   <p className="text-[10px] md:text-xs lg:text-sm font-bold text-white tracking-[0.3em] uppercase">
                     Good {getGreeting(currentTime.getHours())}
                   </p>
                </div>
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
                  <div className="px-6 py-2 md:px-8 md:py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-2 md:mb-4">
                     <span className="text-white/50 font-bold tracking-[0.2em] uppercase text-[10px] md:text-xs">
                        {getStatusText()}
                     </span>
                  </div>
               )}
               
               <button
                  onClick={handleRefresh}
                  className="p-3 md:p-4 rounded-full bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all duration-300 backdrop-blur-md group active:scale-90"
                  aria-label="Reset Timer"
               >
                  <RotateCcw size={18} className="md:w-5 md:h-5 transition-transform duration-500 group-hover:rotate-180" />
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
  toggleFullscreen: () => void;
  isFullscreen: boolean;
  showTasks: boolean;
  showSettings: boolean;
}> = ({ activeView, setView, toggleTasks, toggleSettings, toggleFullscreen, isFullscreen, showTasks, showSettings }) => {
  return (
    <div className="fixed bottom-4 md:bottom-10 left-0 right-0 z-50 flex justify-center pointer-events-auto">
      <div 
        className="glass-panel px-4 py-3 md:px-6 md:py-4 rounded-[32px] md:rounded-[40px] flex items-center gap-2 md:gap-4 transition-all duration-300 border border-white/10 shadow-2xl backdrop-blur-2xl bg-black/20 scale-[0.85] md:scale-100 origin-bottom"
      >
        <DockButton onClick={() => { setView('DASHBOARD'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} isActive={activeView === 'DASHBOARD'} icon={<Home size={26} />} label="Home" />
        <DockButton onClick={() => { setView('FOCUS'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} isActive={activeView === 'FOCUS'} icon={<Monitor size={26} />} label="Focus" />
        <div className="w-[1px] h-8 md:h-10 bg-white/10 mx-1 md:mx-2 self-center" />
        <DockButton onClick={toggleTasks} isActive={showTasks} icon={<Layout size={26} />} label="Tasks" />
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
  showMixer, setShowMixer, showTasks, setShowTasks, showSettings, setShowSettings,
  volumes, setVolumes, tasks, setTasks, settings, setSettings, activeTheme
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
    setTasks((prev: any) => [{ id: Math.random().toString(36), text: newTaskText, completed: false, isPriority: false }, ...prev]);
    setNewTaskText("");
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
                <div key={task.id} className="group flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white/5 rounded-[20px] md:rounded-[24px] border border-white/5 hover:border-white/20 transition-all duration-300 hover:bg-white/10 active:scale-[0.99] cursor-pointer" onClick={() => setTasks((prev:any) => prev.map((t:any) => t.id === task.id ? { ...t, completed: !t.completed } : t))}>
                  <div 
                    className={`w-6 h-6 md:w-7 md:h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${task.completed ? 'shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'border-white/30 text-transparent hover:border-white'}`}
                    style={task.completed ? { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)', boxShadow: '0 0 15px rgba(var(--theme-accent-rgb), 0.4)' } : {}}
                  >
                    <Check size={14} strokeWidth={4} className="text-black md:w-4 md:h-4" />
                  </div>
                  <span className={`flex-1 text-xs md:text-sm font-semibold transition-all ${task.completed ? 'text-white/30 line-through' : 'text-white/90'}`}>{task.text}</span>
                  <button onClick={(e) => { e.stopPropagation(); setTasks((prev:any) => prev.filter((t:any) => t.id !== task.id)); }} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all p-2 bg-white/5 rounded-full hover:bg-white/10"><Trash2 size={14} className="md:w-4 md:h-4"/></button>
                </div>
             ))}
          </div>
        </div>
      )}

      {showSettings && (
         <div className="fixed bottom-24 md:bottom-40 right-1/2 translate-x-1/2 z-50 w-[90vw] max-w-sm md:w-[400px] glass-panel p-6 md:p-8 animate-blur-fade origin-bottom shadow-2xl">
            <h3 className="font-bold text-xl md:text-2xl tracking-tight text-white mb-6 md:mb-8 flex items-center gap-3">
              <Settings2 size={24} className="text-white/50"/>
              Timer Config
            </h3>
            <div className="space-y-6 md:space-y-10">
               <div className="group">
                  <div className="flex justify-between text-xs md:text-sm font-bold uppercase tracking-wider text-white/60 mb-3 md:mb-4 group-hover:text-white transition-colors">
                     <span>Focus Block</span>
                     <span className="bg-white/10 px-2 py-1 rounded text-white">{settings.pomodoro} min</span>
                  </div>
                  <input type="range" min="5" max="90" value={settings.pomodoro} onChange={(e) => setSettings({...settings, pomodoro: parseInt(e.target.value)})} className="w-full" />
               </div>
               <div className="group">
                  <div className="flex justify-between text-xs md:text-sm font-bold uppercase tracking-wider text-white/60 mb-3 md:mb-4 group-hover:text-white transition-colors">
                     <span>Short Break</span>
                     <span className="bg-white/10 px-2 py-1 rounded text-white">{settings.shortBreak} min</span>
                  </div>
                  <input type="range" min="1" max="15" value={settings.shortBreak} onChange={(e) => setSettings({...settings, shortBreak: parseInt(e.target.value)})} className="w-full" />
               </div>
               <div className="group">
                  <div className="flex justify-between text-xs md:text-sm font-bold uppercase tracking-wider text-white/60 mb-3 md:mb-4 group-hover:text-white transition-colors">
                     <span>Long Break</span>
                     <span className="bg-white/10 px-2 py-1 rounded text-white">{settings.longBreak} min</span>
                  </div>
                  <input type="range" min="10" max="45" value={settings.longBreak} onChange={(e) => setSettings({...settings, longBreak: parseInt(e.target.value)})} className="w-full" />
               </div>
            </div>
         </div>
      )}
    </>
  );
};

export default App;