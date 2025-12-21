import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Play, Pause, RotateCcw, Music, Sliders, X, Plus, Trash2,
  Check, Leaf, BrainCircuit, Home, Layout, 
  Sparkles, Maximize2, Minimize2, Volume2, Settings2, 
  CloudRain, Flame, Trees, Waves, Target, Monitor, ArrowDown,
  Zap, Clock, Award
} from 'lucide-react';
import { TimerMode, AppView, Task, TimerSettings } from './types';
import { AMBIENT_SOUNDS, THEMES } from './constants';
import { fetchMotivationalQuote } from './services/gemini';

// --- Constants & Config ---
const DEFAULT_SETTINGS: TimerSettings = {
  pomodoro: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4
};

// --- Animations Helper ---
const Reveal: React.FC<{ children: React.ReactNode; delay?: number, className?: string }> = ({ children, delay = 0, className = "" }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`${className} ${isVisible ? 'reveal-visible' : 'reveal-hidden'}`}>
      {children}
    </div>
  );
};

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
  const [newTaskText, setNewTaskText] = useState("");

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
    if (!isActive) {
        setTimeLeft(getInitialTime(mode));
    }
  }, [mode, settings, getInitialTime]);

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

  // --- Helpers ---
  const isAudioPlaying = useMemo(() => Object.values(volumes).some(v => v > 0), [volumes]);

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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: false });
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m focused`;
    return `${m}m focused`;
  };

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
    setTasks(prev => [{ id: Math.random().toString(36), text: newTaskText, completed: false, isPriority: false }, ...prev]);
    setNewTaskText("");
  };

  return (
    <div 
      className="relative w-full min-h-screen text-white bg-black font-sans selection:bg-white/20"
      ref={containerRef}
    >
      
      {/* 1. FIXED PARALLAX BACKGROUND LAYER */}
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
        {/* Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90" />
      </div>

      {/* 2. TOP BAR (Fixed) */}
      <div className="fixed top-0 w-full p-8 z-50 flex justify-between items-start pointer-events-none">
        <div 
          className="flex items-center gap-4 group cursor-pointer pointer-events-auto active:scale-95 transition-transform" 
          onClick={() => setActiveTheme(THEMES[(THEMES.indexOf(activeTheme) + 1) % THEMES.length])}
        >
          <div className="w-14 h-14 rounded-[24px] bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all duration-300 shadow-xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Leaf size={24} className="text-emerald-300 relative z-10" />
          </div>
          <div className="flex flex-col drop-shadow-md">
            <span className="font-bold text-xl tracking-tight leading-none text-white">aura<span className="font-light text-white/70">study</span></span>
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-50 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white/50"></span>
              Theme {THEMES.indexOf(activeTheme) + 1}
            </span>
          </div>
        </div>
      </div>

      {/* 3. SCROLLABLE CONTENT */}
      <main className="relative z-10 w-full flex flex-col">
        
        {/* HERO SECTION */}
        <section className="h-screen w-full flex flex-col items-center justify-center relative perspective-1000">
          <div 
            className="pointer-events-auto text-center w-full max-w-7xl px-8 flex flex-col items-center relative"
            style={{ 
              transform: `translate(${mousePos.x * 12}px, ${mousePos.y * 12}px)`,
              transition: 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)'
            }}
          >
            {/* Ambient Glow Behind Clock */}
            <div className="ambient-glow" />

            {appMode === 'DASHBOARD' ? (
              <div className="flex flex-col items-center animate-blur-fade gap-4">
                <div className="mb-2 px-6 py-2 rounded-full bg-white/5 border border-white/5 backdrop-blur-md">
                   <p className="text-sm md:text-base font-bold text-white/80 tracking-widest uppercase">
                     Good {currentTime.getHours() < 12 ? 'Morning' : currentTime.getHours() < 18 ? 'Afternoon' : 'Evening'}
                   </p>
                </div>
                
                <h1 className="text-[18vw] md:text-[13rem] font-bold leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/60 drop-shadow-2xl select-none animate-text-shimmer pb-4">
                  {formatTime(currentTime)}
                </h1>
                
                <div className="mt-8 flex flex-col items-center gap-8">
                   <p className="max-w-3xl text-center text-white/90 font-medium text-xl md:text-2xl leading-relaxed tracking-wide text-glow">
                     "{quote}"
                   </p>
                   
                   <div className="flex gap-4">
                     <span className="glass-panel px-8 py-4 text-sm font-bold tracking-widest uppercase text-white/90 shadow-lg flex items-center gap-3 transition-transform hover:scale-105">
                       <Clock size={16} className="text-blue-300" />
                       {formatDuration(totalStudyTime)} focused
                     </span>
                   </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center animate-blur-fade w-full">
                {/* Focus Controls */}
                <div className="flex items-center gap-2 mb-16 bg-black/20 backdrop-blur-3xl p-2 rounded-[32px] border border-white/10 shadow-2xl">
                   {[TimerMode.POMODORO, TimerMode.SHORT_BREAK, TimerMode.LONG_BREAK].map(m => (
                     <button
                       key={m}
                       onClick={() => { setMode(m); setIsActive(false); }}
                       className={`px-10 py-4 rounded-[24px] text-xs font-bold uppercase tracking-widest transition-all duration-300 active:scale-95 ${mode === m ? 'bg-white text-black shadow-lg scale-100' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                     >
                       {m.replace('_', ' ')}
                     </button>
                   ))}
                </div>

                {/* Focus Timer */}
                <div 
                  className={`relative mb-8 group cursor-pointer transition-all duration-500 active:scale-95 ${isActive ? 'animate-breathe' : ''}`} 
                  onClick={() => setIsActive(!isActive)}
                >
                  <h1 className="text-[18vw] md:text-[15rem] font-bold leading-none tracking-tighter text-white drop-shadow-2xl select-none tabular-nums animate-text-shimmer">
                     {formatTimer(timeLeft)}
                  </h1>
                  
                  <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${isActive ? 'opacity-0 scale-75' : 'opacity-0 group-hover:opacity-100 scale-100'}`}>
                     <div className="w-32 h-32 rounded-[40px] bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20 shadow-2xl">
                        <Play size={48} fill="white" className="ml-2 drop-shadow-lg" />
                     </div>
                  </div>

                  <div className={`absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 transition-all duration-700 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                     <span className="px-6 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm font-bold uppercase tracking-widest text-emerald-300 flex items-center gap-3 backdrop-blur-md">
                       <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                       Focus Active
                     </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Scroll Hint */}
          <div 
            className="absolute bottom-16 animate-bounce opacity-50 flex flex-col items-center gap-2"
            style={{ opacity: Math.max(0, 1 - scrollY / 300) }}
          >
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Discover</span>
            <ArrowDown size={20} />
          </div>
        </section>

        {/* SECTION 2: ABOUT AURA - REVEAL EFFECT */}
        <section className="min-h-[70vh] w-full flex items-center justify-center bg-black/40 backdrop-blur-md border-t border-white/5 relative z-20 overflow-hidden">
           {/* Decorative Background Blob */}
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none transform translate-x-1/2 -translate-y-1/2" />
           
          <div className="max-w-5xl px-8 py-32 text-center relative z-10">
            <Reveal>
              <h2 className="text-5xl md:text-8xl font-bold tracking-tighter mb-12 text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/40">
                Flow State<br/>On Demand.
              </h2>
            </Reveal>
            <Reveal delay={200}>
              <p className="text-xl md:text-3xl text-white/70 leading-relaxed font-medium max-w-3xl mx-auto">
                AuraStudy isn't just a clock; it's a <span className="text-white font-bold border-b border-white/20 pb-1">sensory environment</span> designed to trigger deep focus. 
                With spatial audio soundscapes, circadian lighting adaptation, and intelligent rhythm tracking.
              </p>
            </Reveal>
          </div>
        </section>

        {/* SECTION 3: FEATURES GRID (BENTO STYLE) */}
        <section className="min-h-screen w-full bg-black/60 backdrop-blur-xl px-8 py-32 flex flex-col items-center relative z-20">
          <div className="max-w-6xl w-full">
            <Reveal className="mb-16 text-center">
              <h3 className="text-4xl font-bold tracking-tight mb-4">Crafted for Focus</h3>
              <p className="text-white/50 text-lg">Every detail designed to keep you in the zone.</p>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1: Large Span */}
              <div className="md:col-span-2">
                <Reveal>
                  <FeatureCard 
                    icon={<BrainCircuit size={32} className="text-purple-300" />}
                    title="Neural Entrainment"
                    desc="Binaural beats layered under nature sounds to align your brainwaves for peak cognitive performance."
                    color="purple"
                    large
                  />
                </Reveal>
              </div>

              {/* Feature 2 */}
              <Reveal delay={100}>
                <FeatureCard 
                  icon={<Sparkles size={32} className="text-amber-300" />}
                  title="AI Motivation"
                  desc="Dynamic quotes and coaching tips tailored to your current patterns."
                  color="amber"
                />
              </Reveal>

              {/* Feature 3 */}
              <Reveal delay={200}>
                <FeatureCard 
                  icon={<CloudRain size={32} className="text-blue-300" />}
                  title="Dynamic Atmospheres"
                  desc="From Kyoto Zen Gardens to Cyberpunk Cities—immersive visual themes."
                  color="blue"
                />
              </Reveal>

              {/* Feature 4: Large Span */}
              <div className="md:col-span-2">
                <Reveal delay={300}>
                   <FeatureCard 
                    icon={<Target size={32} className="text-emerald-300" />}
                    title="Smart Analytics"
                    desc="Track your flow cycles without the clutter. Just pure, actionable insights on your productivity."
                    color="emerald"
                    large
                  />
                </Reveal>
              </div>
            </div>
            
            <Reveal delay={400} className="mt-40 text-center pb-48">
              <h3 className="text-5xl font-bold mb-8">Ready to dive in?</h3>
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="px-12 py-5 bg-white text-black rounded-[32px] font-bold text-xl hover:bg-white/90 hover:scale-105 transition-all active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.3)]"
              >
                Start Focusing Now
              </button>
            </Reveal>
          </div>
        </section>

      </main>

      {/* 4. FIXED BOTTOM CONTROLS (Always visible) */}
      
      {/* Audio Visualizer - Floating Pill */}
      <div className="fixed bottom-10 left-10 z-50 flex items-end gap-5 pointer-events-auto">
        <button 
          onClick={() => setShowMixer(!showMixer)}
          className={`relative w-20 h-20 rounded-full flex items-center justify-center glass-panel transition-all duration-300 active:scale-90 group overflow-hidden ${showMixer ? 'bg-white text-black border-transparent' : 'hover:bg-white/10'}`}
        >
          <Music size={28} className={`transition-all duration-300 ${showMixer ? 'scale-110' : 'opacity-80'}`} />
        </button>
        {isAudioPlaying && (
          <div className="flex items-end gap-1.5 h-10 pb-4 opacity-90 drop-shadow-lg">
            <div className="visualizer-bar h-full shadow-lg"></div>
            <div className="visualizer-bar h-full shadow-lg"></div>
            <div className="visualizer-bar h-full shadow-lg"></div>
            <div className="visualizer-bar h-full shadow-lg"></div>
          </div>
        )}
      </div>

      {/* Dock */}
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

      {/* 5. MODALS (Fixed Position) */}

      {/* Sound Mixer */}
      {showMixer && (
        <div className="fixed bottom-36 left-10 z-50 w-96 glass-panel p-8 animate-blur-fade origin-bottom-left shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-bold text-2xl tracking-tight text-white flex items-center gap-3">
              <Music size={24} className="text-white/50"/>
              Soundscape
            </h3>
            <button onClick={() => setVolumes({ rain: 0, lofi: 0, fire: 0, forest: 0, jazz: 0, waves: 0, classical: 0 })} className="text-xs font-bold uppercase tracking-wider text-white/50 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-full hover:bg-white/10">Silence</button>
          </div>
          <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            {AMBIENT_SOUNDS.map(sound => (
              <div key={sound.id} className="group">
                <div className="flex items-center gap-4 mb-3">
                  <div className={`p-3 rounded-2xl transition-colors shadow-lg ${volumes[sound.id] > 0 ? 'bg-white text-black' : 'bg-white/5 text-white/50 group-hover:bg-white/10 group-hover:text-white'}`}>
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

      {/* Tasks Panel */}
      {showTasks && (
        <div className="fixed bottom-40 right-1/2 translate-x-1/2 z-50 w-[460px] glass-panel p-8 animate-blur-fade origin-bottom shadow-2xl border-white/20">
          <div className="flex justify-between items-center mb-8">
             <h3 className="font-bold text-2xl tracking-tight text-white flex items-center gap-3">
               <Target size={24} className="text-white/50"/>
               Goals
             </h3>
             <span className="text-xs font-bold bg-white/10 px-4 py-2 rounded-full text-white/60 border border-white/5">{tasks.filter(t => t.completed).length} / {tasks.length}</span>
          </div>
          
          <div className="flex gap-3 mb-8">
            <input 
              value={newTaskText} 
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              placeholder="Add a new milestone..." 
              className="flex-1 bg-black/30 border border-white/10 rounded-[24px] px-6 py-4 text-sm font-semibold text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:bg-black/50 transition-all"
            />
            <button onClick={addTask} className="px-5 bg-white text-black rounded-[24px] font-bold hover:bg-white/90 transition-colors active:scale-95"><Plus size={24}/></button>
          </div>

          <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
             {tasks.length === 0 && <p className="text-center text-white/30 text-sm py-12 font-medium bg-white/5 rounded-[24px] border border-white/5">No goals set. Start by adding one above.</p>}
             {tasks.map(task => (
                <div key={task.id} className="group flex items-center gap-4 p-4 bg-white/5 rounded-[24px] border border-white/5 hover:border-white/20 transition-all duration-300 hover:bg-white/10 active:scale-[0.99] cursor-pointer" onClick={() => setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))}>
                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${task.completed ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'border-white/30 text-transparent hover:border-white'}`}>
                    <Check size={16} strokeWidth={4} className="text-black" />
                  </div>
                  <span className={`flex-1 text-sm font-semibold transition-all ${task.completed ? 'text-white/30 line-through' : 'text-white/90'}`}>{task.text}</span>
                  <button onClick={(e) => { e.stopPropagation(); setTasks(prev => prev.filter(t => t.id !== task.id)); }} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all p-2 bg-white/5 rounded-full hover:bg-white/10"><Trash2 size={16}/></button>
                </div>
             ))}
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
         <div className="fixed bottom-40 right-1/2 translate-x-1/2 z-50 w-[400px] glass-panel p-8 animate-blur-fade origin-bottom shadow-2xl">
            <h3 className="font-bold text-2xl tracking-tight text-white mb-8 flex items-center gap-3">
              <Settings2 size={24} className="text-white/50"/>
              Timer Config
            </h3>
            <div className="space-y-10">
               <div className="group">
                  <div className="flex justify-between text-sm font-bold uppercase tracking-wider text-white/60 mb-4 group-hover:text-white transition-colors">
                     <span>Focus Block</span>
                     <span className="bg-white/10 px-2 py-1 rounded text-white">{settings.pomodoro} min</span>
                  </div>
                  <input type="range" min="5" max="90" value={settings.pomodoro} onChange={(e) => setSettings({...settings, pomodoro: parseInt(e.target.value)})} className="w-full" />
               </div>
               <div className="group">
                  <div className="flex justify-between text-sm font-bold uppercase tracking-wider text-white/60 mb-4 group-hover:text-white transition-colors">
                     <span>Short Break</span>
                     <span className="bg-white/10 px-2 py-1 rounded text-white">{settings.shortBreak} min</span>
                  </div>
                  <input type="range" min="1" max="15" value={settings.shortBreak} onChange={(e) => setSettings({...settings, shortBreak: parseInt(e.target.value)})} className="w-full" />
               </div>
               <div className="group">
                  <div className="flex justify-between text-sm font-bold uppercase tracking-wider text-white/60 mb-4 group-hover:text-white transition-colors">
                     <span>Long Break</span>
                     <span className="bg-white/10 px-2 py-1 rounded text-white">{settings.longBreak} min</span>
                  </div>
                  <input type="range" min="10" max="45" value={settings.longBreak} onChange={(e) => setSettings({...settings, longBreak: parseInt(e.target.value)})} className="w-full" />
               </div>
            </div>
         </div>
      )}

      {/* Hidden Audio Elements */}
      {AMBIENT_SOUNDS.map(sound => (
        <audio key={sound.id} ref={el => { audioRefs.current[sound.id] = el; }} src={sound.url} loop hidden preload="none" />
      ))}
      
    </div>
  );
};

// --- Sub-components ---

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, desc: string, color?: string, large?: boolean }> = ({ icon, title, desc, color = "white", large = false }) => (
  <div className={`glass-panel p-10 h-full transition-all duration-500 hover:scale-[1.02] group relative overflow-hidden flex flex-col ${large ? 'justify-end' : ''}`}>
    
    {/* Background Gradient on Hover */}
    <div className={`absolute inset-0 bg-gradient-to-br from-${color}-500/0 to-${color}-500/0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 group-hover:from-${color}-500/20 group-hover:to-transparent`} />
    
    <div className={`mb-6 p-4 rounded-[20px] bg-white/5 w-fit border border-white/5 group-hover:border-white/20 transition-all duration-500 group-hover:scale-110 group-hover:bg-${color}-500/20`}>
      {icon}
    </div>
    <h3 className="text-3xl font-bold mb-3 tracking-tight group-hover:translate-x-1 transition-transform">{title}</h3>
    <p className="text-white/60 leading-relaxed font-medium text-lg group-hover:text-white/80 transition-colors">{desc}</p>
  </div>
);

interface DockProps {
  activeView: string;
  setView: (v: 'DASHBOARD' | 'FOCUS') => void;
  toggleTasks: () => void;
  toggleSettings: () => void;
  toggleFullscreen: () => void;
  isFullscreen: boolean;
  showTasks: boolean;
  showSettings: boolean;
}

const Dock: React.FC<DockProps> = ({ activeView, setView, toggleTasks, toggleSettings, toggleFullscreen, isFullscreen, showTasks, showSettings }) => {
  return (
    <div className="fixed bottom-10 left-0 right-0 z-50 flex justify-center pointer-events-auto">
      <div 
        className="glass-panel px-6 py-4 rounded-[40px] flex items-center gap-4 transition-all duration-300 border border-white/10 shadow-2xl backdrop-blur-2xl bg-black/20"
      >
        <DockButton onClick={() => { setView('DASHBOARD'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} isActive={activeView === 'DASHBOARD'} icon={<Home size={26} />} label="Home" />
        <DockButton onClick={() => { setView('FOCUS'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} isActive={activeView === 'FOCUS'} icon={<Monitor size={26} />} label="Focus" />
        
        <div className="w-[1px] h-10 bg-white/10 mx-2 self-center" />
        
        <DockButton onClick={toggleTasks} isActive={showTasks} icon={<Layout size={26} />} label="Tasks" />
        <DockButton onClick={toggleSettings} isActive={showSettings} icon={<Settings2 size={26} />} label="Settings" />
        <DockButton onClick={toggleFullscreen} isActive={isFullscreen} icon={isFullscreen ? <Minimize2 size={26} /> : <Maximize2 size={26} />} label="Screen" />
      </div>
    </div>
  );
};

const DockButton: React.FC<{ 
  onClick: () => void; 
  isActive: boolean; 
  icon: React.ReactNode; 
  label: string; 
}> = ({ onClick, isActive, icon, label }) => {
  return (
    <div className="flex flex-col items-center gap-1 group">
      <button 
        onClick={onClick}
        className={`w-16 h-16 rounded-[22px] flex items-center justify-center transition-all duration-300 active:scale-90 relative overflow-hidden ${isActive ? 'bg-white text-black shadow-lg scale-105' : 'bg-transparent text-white/50 hover:bg-white/10 hover:text-white'}`}
      >
        {/* Hover Highlight */}
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-[22px]" />
        
        <div className="relative z-10">
          {React.cloneElement(icon as React.ReactElement<any>, { size: 26 })}
        </div>
      </button>
    </div>
  );
};

export default App;