
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Play, Pause, RotateCcw, Music, BarChart3, Maximize2, Minimize2,
  Leaf, Clock, Coffee, Sparkles, Wand2, 
  CloudRain, Flame, Trees, X, ChevronUp, Home, Zap, Palette, Plus, Check, Trash2,
  BrainCircuit, History, ArrowDown, Activity, Settings2, Wind, ShieldCheck,
  LayoutGrid, ListChecks, TrendingUp, Monitor, EyeOff, Waves, Volume2, Bell,
  GripVertical, ChevronUp as UpIcon, ChevronDown as DownIcon, Sliders,
  Target, Sparkle, Plus as PlusIcon, Minus as MinusIcon
} from 'lucide-react';
import { TimerMode, AppView, Task, StudySession, TimerSettings } from './types';
import { AMBIENT_SOUNDS, THEMES } from './constants';
import { fetchMotivationalQuote, generateFocusRitual, suggestSmartAura, suggestTasks } from './services/gemini';

const DEFAULT_SETTINGS: TimerSettings = {
  pomodoro: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4
};

const App: React.FC = () => {
  // --- Core State ---
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [mode, setMode] = useState<TimerMode>(TimerMode.POMODORO);
  const [isActive, setIsActive] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // --- Settings & Timers ---
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

  // --- Aesthetics ---
  const [activeTheme, setActiveTheme] = useState(THEMES[0]);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // --- AI States ---
  const [quote, setQuote] = useState("");
  const [isQuoteFading, setIsQuoteFading] = useState(false);
  const [ritualInput, setRitualInput] = useState("");
  const [ritualResult, setRitualResult] = useState("");
  const [isRitualLoading, setIsRitualLoading] = useState(false);
  const [smartAuraReasoning, setSmartAuraReasoning] = useState("");
  const [isTaskSyncing, setIsTaskSyncing] = useState(false);
  
  // --- Data Persistence ---
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('aura_tasks');
    return saved ? JSON.parse(saved) : [
      { id: '1', text: 'Define your deep work intention', completed: false, isPriority: true },
      { id: '2', text: 'Ready your environment', completed: false, isPriority: false }
    ];
  });
  const [sessions, setSessions] = useState<StudySession[]>(() => {
    const saved = localStorage.getItem('aura_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [newTaskText, setNewTaskText] = useState("");

  // --- Audio Mixer ---
  const [volumes, setVolumes] = useState<Record<string, number>>({
    rain: 0, lofi: 0.1, fire: 0, forest: 0, jazz: 0, waves: 0, classical: 0
  });
  const [showMixer, setShowMixer] = useState(false);

  // --- Statistics ---
  const [totalStudied, setTotalStudied] = useState(() => {
    const saved = localStorage.getItem('aura_total_studied');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const notificationAudio = useRef<HTMLAudioElement | null>(null);

  // --- FIXED: Pause logic doesn't reset time ---
  // Only update timeLeft when mode or settings change, but NOT when isActive toggles
  useEffect(() => {
    setTimeLeft(getInitialTime(mode));
  }, [mode, settings, getInitialTime]);

  useEffect(() => {
    localStorage.setItem('aura_tasks', JSON.stringify(tasks));
    localStorage.setItem('aura_sessions', JSON.stringify(sessions));
    localStorage.setItem('aura_total_studied', totalStudied.toString());
    localStorage.setItem('aura_timer_settings', JSON.stringify(settings));
  }, [tasks, sessions, totalStudied, settings]);

  // --- Sensors ---
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      });
    };
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Audio Engine ---
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

  // --- Timer Tick ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive) {
      interval = setInterval(() => {
        if (mode === TimerMode.STOPWATCH) {
          setTimeLeft(prev => prev + 1);
          setTotalStudied(prev => prev + 1);
        } else {
          if (timeLeft > 0) {
            setTimeLeft(prev => prev - 1);
            if (mode === TimerMode.POMODORO) setTotalStudied(prev => prev + 1);
          } else {
            setIsActive(false);
            setIsFinished(true);
            const duration = getInitialTime(mode);
            setSessions(prev => [{ duration, timestamp: Date.now(), mode }, ...prev].slice(0, 50));
            if (notificationAudio.current) notificationAudio.current.play().catch(() => {});
            setTimeout(() => setIsFinished(false), 5000);
          }
        }
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, timeLeft, mode, getInitialTime]);

  // --- AI Logic ---
  const refreshQuote = useCallback(async () => {
    setIsQuoteFading(true);
    setTimeout(async () => {
      const newQuote = await fetchMotivationalQuote();
      setQuote(newQuote);
      setIsQuoteFading(false);
    }, 800);
  }, []);

  useEffect(() => {
    refreshQuote();
    notificationAudio.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    notificationAudio.current.volume = 0.4;
  }, [refreshQuote]);

  // --- Task Operations ---
  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const addTask = (text = newTaskText) => {
    if (!text.trim()) return;
    setTasks(prev => [{ id: Math.random().toString(36), text, completed: false, isPriority: prev.length === 0 }, ...prev]);
    setNewTaskText("");
  };

  const moveTask = (index: number, direction: 'up' | 'down') => {
    setTasks(prev => {
      const next = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target >= 0 && target < next.length) {
        [next[index], next[target]] = [next[target], next[index]];
      }
      return next;
    });
  };

  const syncAITasks = async () => {
    if (!ritualInput.trim()) return;
    setIsTaskSyncing(true);
    try {
      const suggestions = await suggestTasks(ritualInput);
      if (suggestions.length > 0) {
        const newTasks = suggestions.map(s => ({
          id: Math.random().toString(36),
          text: s,
          completed: false,
          isPriority: false
        }));
        setTasks(prev => [...newTasks, ...prev]);
        document.getElementById('tasks')?.scrollIntoView({ behavior: 'smooth' });
      }
    } finally {
      setIsTaskSyncing(false);
    }
  };

  const handleAIManifest = async () => {
    if (!ritualInput.trim()) return;
    setIsRitualLoading(true);
    try {
      const [ritual, aura] = await Promise.all([
        generateFocusRitual(ritualInput),
        suggestSmartAura(ritualInput)
      ]);
      setRitualResult(ritual);
      setSmartAuraReasoning(aura.reasoning);
      const suggestedTheme = THEMES.find(t => t.id === aura.themeId) || THEMES[0];
      setActiveTheme(suggestedTheme);
      setVolumes(prev => ({ ...prev, [aura.soundId]: 0.6 }));
    } finally {
      setIsRitualLoading(false);
    }
  };

  // --- Computed Views ---
  const activeTask = useMemo(() => tasks.find(t => !t.completed), [tasks]);
  
  const progress = useMemo(() => {
    if (mode === TimerMode.STOPWATCH) return 100;
    const total = getInitialTime(mode);
    return total === 0 ? 0 : ((total - timeLeft) / total) * 100;
  }, [timeLeft, mode, getInitialTime]);

  // Minute Rotation Ring Progress
  const secondsLeftInMinute = timeLeft % 60;
  const minuteProgress = (60 - secondsLeftInMinute) / 60;
  const isOddMinute = Math.floor(timeLeft / 60) % 2 !== 0;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m < 10 && h > 0 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const greeting = useMemo(() => {
    const hours = currentTime.getHours();
    if (hours < 12) return 'Morning Resonance';
    if (hours < 18) return 'Afternoon Flow';
    return 'Evening Stillness';
  }, [currentTime]);

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

  const updateSetting = (key: keyof TimerSettings, val: number) => {
    setSettings(prev => ({ ...prev, [key]: Math.max(1, val) }));
  };

  return (
    <div className={`relative min-h-screen w-full bg-[#030303] text-white transition-all duration-1000 ${zenMode ? 'cursor-none overflow-hidden' : ''}`}>
      
      {/* 1. LAYER: CURSOR GLOW (DESKTOP ONLY) */}
      <div 
        className="fixed w-[500px] h-[500px] pointer-events-none z-50 rounded-full blur-[140px] opacity-20 transition-all duration-500 ease-out translate-x-[-50%] translate-y-[-50%] hidden md:block"
        style={{ left: cursorPos.x, top: cursorPos.y, background: `radial-gradient(circle, ${activeTheme.accent} 0%, transparent 70%)` }}
      />

      {/* 2. LAYER: CINEMATIC BACKGROUND */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none transition-all duration-[5000ms] ease-out"
        style={{
          backgroundImage: `url(${activeTheme.url})`,
          backgroundPosition: 'center', backgroundSize: 'cover',
          transform: `scale(${1.1 + scrollY * 0.0001}) translate3d(${mousePos.x * -0.2}px, ${mousePos.y * -0.2}px, 0)`,
          filter: `brightness(${0.35 - scrollY * 0.0003}) blur(${scrollY * 0.01}px) saturate(1.2)`
        }}
      />
      <div className="fixed inset-0 z-[1] bg-black/45 backdrop-blur-[1px] pointer-events-none" />
      <div className="fixed inset-0 z-[2] bg-gradient-to-b from-black/80 via-transparent to-[#030303] pointer-events-none" />

      {/* 3. SETTINGS MODAL (REALISTIC / SAMSUNG ALARM STYLE) */}
      {showSettings && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4 sm:p-8 animate-in fade-in duration-500 overflow-y-auto">
          <div className="relative w-full max-w-lg p-10 sm:p-14 bg-white/[0.04] border border-white/10 rounded-[3rem] sm:rounded-[4rem] shadow-4xl space-y-10 my-auto">
            <button onClick={() => setShowSettings(false)} className="absolute top-10 right-10 p-4 text-white/20 hover:text-white transition-all"><X size={32} /></button>
            
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter uppercase text-white/90">Sanctuary Lab</h2>
              <p className="text-white/20 text-[10px] font-black tracking-[0.4em] uppercase">Configure your resonance</p>
            </div>
            
            <div className="space-y-12 py-4">
              {[
                { label: 'Deep Work Period', key: 'pomodoro', unit: 'min' },
                { label: 'Short Stillness', key: 'shortBreak', unit: 'min' },
                { label: 'Long Stillness', key: 'longBreak', unit: 'min' },
                { label: 'Cycles to Stillness', key: 'longBreakInterval', unit: 'cycles' }
              ].map(s => (
                <div key={s.key} className="flex items-center justify-between p-6 bg-white/[0.03] rounded-3xl border border-white/5 group hover:bg-white/[0.06] transition-all">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">{s.label}</label>
                    <p className="text-3xl font-black text-white">{settings[s.key as keyof TimerSettings]} <span className="text-xs text-white/20 uppercase font-bold">{s.unit}</span></p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => updateSetting(s.key as keyof TimerSettings, settings[s.key as keyof TimerSettings] - 1)}
                      className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all shadow-xl"
                    >
                      <MinusIcon size={24} />
                    </button>
                    <button 
                      onClick={() => updateSetting(s.key as keyof TimerSettings, settings[s.key as keyof TimerSettings] + 1)}
                      className="w-14 h-14 bg-white text-black border border-white/10 rounded-2xl flex items-center justify-center hover:scale-105 active:scale-90 transition-all shadow-xl"
                    >
                      <PlusIcon size={24} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setShowSettings(false)} className="w-full py-6 bg-white text-black rounded-3xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-2xl">Sync Sanctuary</button>
          </div>
        </div>
      )}

      {/* 4. HEADER */}
      {!zenMode && (
        <header className={`fixed top-0 left-0 right-0 p-4 sm:p-8 sm:px-12 z-[100] flex justify-between items-center transition-all duration-1000 ${scrollY > 50 ? 'bg-black/40 backdrop-blur-3xl py-3 sm:py-6' : ''}`}>
          <div className="flex items-center gap-3 sm:gap-4 group cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            <div className="p-2 sm:p-3 bg-white/10 backdrop-blur-3xl rounded-xl sm:rounded-2xl border border-white/10 group-hover:scale-110 transition-all shadow-xl">
              <Leaf size={20} className="sm:w-6 sm:h-6" style={{ color: activeTheme.accent }} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tighter">aura<span className="font-extralight text-white/30 italic">study</span></h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => setShowSettings(true)} className="p-2 sm:p-3 bg-white/5 hover:bg-white/15 rounded-full border border-white/5 transition-all text-white/30 hover:text-white group"><Sliders size={18} className="group-hover:rotate-180 transition-transform duration-700" /></button>
            <button onClick={() => setZenMode(true)} className="p-2 sm:p-3 bg-white/5 hover:bg-white/15 rounded-full border border-white/5 transition-all text-white/30 hover:text-white group"><EyeOff size={18} className="group-hover:scale-110 transition-transform" /></button>
            <button onClick={() => setShowThemePicker(!showThemePicker)} className="group flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-black/40 hover:bg-black/60 backdrop-blur-3xl rounded-full border border-white/10 transition-all shadow-xl">
              <Palette size={16} className="text-white/30 group-hover:text-white" />
              <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-white/30 group-hover:text-white hidden sm:inline">{activeTheme.name}</span>
            </button>
          </div>
        </header>
      )}

      {/* 5. MAIN CONTENT */}
      <main className={`relative z-10 w-full transition-opacity duration-[1500ms] ${zenMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        
        {/* TIMER SECTION */}
        <section id="sanctuary" className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 pt-20">
          <div className="flex flex-col items-center space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-[1500ms] w-full max-w-4xl">
            <div className="flex flex-col items-center space-y-4">
              <span className="text-[10px] font-black tracking-[1.5em] text-white/20 uppercase animate-pulse text-center">{greeting}</span>
              <div className="max-w-md sm:max-w-2xl px-6 sm:px-14 py-6 sm:py-9 bg-black/50 backdrop-blur-[100px] rounded-[2rem] sm:rounded-[4rem] border border-white/5 shadow-4xl text-center italic font-light text-lg sm:text-2xl text-white/80 leading-relaxed">
                "{quote || 'The quiet mind is the strongest.'}"
              </div>
            </div>

            <div className="relative flex flex-col items-center group w-full">
               
               {/* RESONANCE CYCLE RINGS */}
               <div className="absolute inset-[-60px] sm:inset-[-220px] pointer-events-none transition-all duration-[3000ms]">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    {/* Overall Session Progress Background */}
                    <circle cx="50" cy="50" r="48" fill="none" stroke="white" strokeWidth="0.05" strokeDasharray="1 3" opacity="0.1" />
                    
                    {/* Main Pomodoro Progress Ring */}
                    <circle 
                      cx="50" cy="50" r="48" 
                      fill="none" 
                      stroke={activeTheme.accent} 
                      strokeWidth="1.5" 
                      strokeDasharray="301.59" 
                      strokeDashoffset={301.59 - (progress * 3.0159)} 
                      className="transition-all duration-1000 ease-linear" 
                      style={{ filter: `drop-shadow(0 0 8px ${activeTheme.accent})` }} 
                      opacity="0.3"
                    />

                    {/* DUALITY MINUTE RING (Rotation) */}
                    <circle 
                      cx="50" cy="50" r="44" 
                      fill="none" 
                      stroke={isOddMinute ? "#ffffff" : activeTheme.accent} 
                      strokeWidth="3" 
                      strokeDasharray="276.46" 
                      strokeDashoffset={276.46 - (minuteProgress * 276.46)} 
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-linear" 
                      style={{ 
                        filter: `drop-shadow(0 0 15px ${isOddMinute ? '#ffffff44' : activeTheme.accent + '66'})`,
                        opacity: isOddMinute ? 0.8 : 0.4
                      }}
                    />
                  </svg>
               </div>

               <h1 className="text-[6rem] sm:text-[12rem] md:text-[20rem] lg:text-[26rem] font-bold leading-none tracking-tighter select-none drop-shadow-[0_20px_60px_rgba(0,0,0,1)] text-center">{formatTime(timeLeft)}</h1>
               
               <div className="flex items-center gap-8 sm:gap-16 md:gap-20 mt-8 sm:mt-16">
                  {/* Explicit Reset Button */}
                  <button onClick={() => { setIsActive(false); setTimeLeft(getInitialTime(mode)); }} className="p-4 sm:p-8 text-white/10 hover:text-white rounded-full transition-all hover:rotate-[-180deg] active:scale-90"><RotateCcw size={32} className="sm:w-10 sm:h-10" /></button>
                  
                  {/* Pause/Play Button (Fixed behavior) */}
                  <button onClick={() => setIsActive(!isActive)} className="w-24 h-24 sm:w-48 sm:h-48 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-4xl">
                    {isActive ? <Pause size={40} className="sm:w-20 sm:h-20" fill="black" /> : <Play size={40} className="sm:w-20 sm:h-20 translate-x-1 sm:translate-x-3" fill="black" />}
                  </button>
                  
                  <button onClick={() => setShowMixer(!showMixer)} className={`p-4 sm:p-8 rounded-full transition-all active:scale-90 ${showMixer ? 'bg-white text-black shadow-2xl' : 'text-white/10 hover:text-white'}`}><Music size={32} className="sm:w-10 sm:h-10" /></button>
               </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 p-2 sm:p-4 bg-white/5 backdrop-blur-[80px] rounded-2xl sm:rounded-[3.5rem] border border-white/5 shadow-3xl">
                {[
                  { id: TimerMode.POMODORO, label: 'Focus' },
                  { id: TimerMode.SHORT_BREAK, label: 'Rest' },
                  { id: TimerMode.LONG_BREAK, label: 'Still' }
                ].map(m => (
                  <button key={m.id} onClick={() => { setMode(m.id); setIsActive(false); }} className={`px-6 sm:px-12 py-3 sm:py-5 rounded-full text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] transition-all ${mode === m.id ? 'bg-white text-black shadow-2xl scale-105' : 'text-white/20 hover:text-white'}`}>{m.label}</button>
                ))}
            </div>
          </div>
        </section>

        {/* BOARD SECTION */}
        <section id="tasks" className="min-h-screen flex flex-col items-center justify-center py-20 sm:py-40 px-4 sm:px-8 max-w-5xl mx-auto w-full">
          <div className="w-full flex flex-col space-y-12 sm:space-y-20">
            <div className="text-center space-y-6">
              <div className="p-6 sm:p-8 bg-white/[0.03] rounded-3xl sm:rounded-[3rem] border border-white/10 inline-flex items-center justify-center shadow-3xl"><ListChecks size={40} className="sm:w-16 sm:h-16" style={{ color: activeTheme.accent }} /></div>
              <h2 className="text-5xl sm:text-8xl font-bold tracking-tighter">Living Board.</h2>
            </div>

            <div className="bg-black/60 backdrop-blur-[120px] border border-white/5 rounded-[2.5rem] sm:rounded-[5rem] p-6 sm:p-16 shadow-4xl space-y-8 sm:space-y-12">
              <div className="relative flex items-center group">
                <input type="text" value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addTask()} placeholder="Append a sub-goal..." className="w-full bg-white/[0.03] border border-white/10 rounded-[2rem] sm:rounded-[3.5rem] p-6 sm:p-10 pl-10 sm:pl-16 text-xl sm:text-3xl font-light outline-none focus:border-white/30 transition-all placeholder:text-white/5" />
                <button onClick={() => addTask()} className="absolute right-3 sm:right-6 p-4 sm:p-7 bg-white text-black rounded-[1.5rem] sm:rounded-[2.8rem] hover:scale-105 active:scale-95 transition-all shadow-2xl"><Plus size={24} className="sm:w-9 sm:h-9" /></button>
              </div>

              <div className="space-y-4 sm:space-y-6 max-h-[600px] overflow-y-auto pr-2 sm:pr-8 custom-scrollbar">
                {tasks.map((task, idx) => (
                  <div key={task.id} className={`group flex items-center justify-between p-6 sm:p-10 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-[2rem] sm:rounded-[4rem] transition-all duration-700 ${task.completed ? 'opacity-25 scale-[0.98]' : 'hover:scale-[1.01] hover:shadow-4xl'}`}>
                    <div className="flex items-center gap-4 sm:gap-10 overflow-hidden flex-1">
                      <button onClick={() => toggleTask(task.id)} className={`w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-[2rem] border-2 transition-all flex items-center justify-center flex-shrink-0 ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-white/10 group-hover:border-white/50'}`}>
                        {task.completed && <Check size={20} className="sm:w-8 sm:h-8" strokeWidth={3} />}
                      </button>
                      <span className={`text-lg sm:text-3xl font-light tracking-tight truncate ${task.completed ? 'line-through opacity-50' : ''}`}>{task.text}</span>
                    </div>
                    <button onClick={() => setTasks(tasks.filter(t => t.id !== task.id))} className="p-3 sm:p-5 text-white/5 hover:text-red-500 sm:opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"><Trash2 size={20} className="sm:w-7 sm:h-7" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* MANIFEST SECTION */}
        <section id="manifest" className="min-h-screen flex flex-col items-center justify-center py-20 sm:py-40 px-4 sm:px-8 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 sm:gap-40 items-center w-full">
            <div className="flex flex-col space-y-12 sm:space-y-16">
               <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-left-12 duration-1000">
                  <div className="flex items-center gap-3 sm:gap-4 text-emerald-400"><BrainCircuit size={32} className="sm:w-12 sm:h-12" style={{ color: activeTheme.accent }} /><span className="text-[10px] sm:text-[14px] font-black uppercase tracking-[0.5em] sm:tracking-[0.8em]">Aura Procedure</span></div>
                  <h2 className="text-5xl sm:text-9xl font-bold tracking-tighter leading-none">Declare your <br className="hidden sm:block" />Sanctuary.</h2>
                  <p className="text-white/30 text-xl sm:text-3xl font-light leading-relaxed max-w-xl">Describe your study intention. AI will tune the environment and extract a focused path.</p>
               </div>
               <div className="relative group max-w-2xl w-full">
                  <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/0 via-white/10 to-emerald-500/0 rounded-[2rem] sm:rounded-[3.5rem] opacity-0 group-hover:opacity-100 transition-opacity blur-3xl" />
                  <input value={ritualInput} onChange={(e) => setRitualInput(e.target.value)} placeholder="Type your high-level goal..." className="relative w-full bg-black/70 border border-white/10 rounded-2xl sm:rounded-[3.5rem] p-8 sm:p-12 text-xl sm:text-3xl font-light outline-none focus:border-white/40 transition-all placeholder:text-white/5 shadow-4xl" />
                  <button onClick={handleAIManifest} disabled={isRitualLoading} className="absolute right-4 top-1/2 -translate-y-1/2 p-5 sm:p-7 bg-white text-black rounded-xl sm:rounded-[2.5rem] hover:scale-110 active:scale-95 transition-all shadow-4xl disabled:opacity-50">
                    {isRitualLoading ? <Sparkles size={24} className="sm:w-9 sm:h-9 animate-spin" /> : <Wand2 size={24} className="sm:w-9 sm:h-9" />}
                  </button>
               </div>
               {ritualResult && (
                 <div className="p-8 sm:p-16 bg-white/[0.03] border border-white/5 rounded-3xl sm:rounded-[5rem] shadow-4xl animate-in slide-in-from-top-12 duration-1000">
                    <p className="text-white/90 text-2xl sm:text-4xl font-light italic leading-relaxed">"{ritualResult}"</p>
                 </div>
               )}
            </div>
            <div className="relative flex justify-center group perspective-1000 hidden lg:flex">
               <div className="relative w-full aspect-[3/4] max-w-md bg-white/5 rounded-[7rem] border border-white/10 overflow-hidden shadow-[0_150px_300px_rgba(0,0,0,1)] transition-all duration-[3000ms] group-hover:rotate-0 rotate-6 group-hover:scale-110">
                  <img src={activeTheme.url} className="w-full h-full object-cover opacity-60 mix-blend-overlay scale-125 transition-transform duration-[8000ms]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 p-20 flex flex-col justify-end">
                     <p className="text-emerald-400/40 text-[14px] font-black uppercase tracking-[1em] mb-8">REALM PULSE</p>
                     <h4 className="text-white text-7xl font-bold tracking-tighter">{activeTheme.name}</h4>
                  </div>
               </div>
            </div>
          </div>
        </section>

        {/* CHRONICLE SECTION */}
        <section id="stats" className="min-h-screen flex flex-col items-center justify-center py-20 sm:py-40 px-4 sm:px-8 max-w-6xl mx-auto w-full">
           <div className="text-center space-y-8 sm:space-y-12 mb-20 sm:mb-32 animate-in fade-in duration-1000">
              <TrendingUp size={60} className="sm:w-20 sm:h-20 mx-auto" style={{ color: activeTheme.accent }} />
              <h2 className="text-6xl sm:text-9xl font-bold tracking-tighter">The Chronicle.</h2>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-20 w-full">
              <div className="p-8 sm:p-16 bg-black/70 backdrop-blur-[140px] border border-white/5 rounded-3xl sm:rounded-[6rem] shadow-4xl flex flex-col">
                 <h5 className="text-[10px] sm:text-[12px] font-black uppercase tracking-[0.6em] text-white/10 mb-10 sm:mb-16 flex items-center gap-4"><History size={16}/> Session Archive</h5>
                 <div className="space-y-6 sm:space-y-8 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                    {sessions.length > 0 ? sessions.map((s, i) => (
                      <div key={i} className="flex justify-between items-center p-6 sm:p-10 bg-white/[0.02] border border-white/5 rounded-[2rem] sm:rounded-[3rem] hover:bg-white/[0.05] transition-all group/item overflow-hidden">
                        <div className="flex items-center gap-5 sm:gap-8 overflow-hidden">
                           <div className={`p-4 sm:p-5 rounded-2xl shadow-xl transition-transform group-hover/item:scale-110 flex-shrink-0 ${s.mode === TimerMode.POMODORO ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                              {s.mode === TimerMode.POMODORO ? <Target size={24} className="sm:w-8 sm:h-8" /> : <Coffee size={24} className="sm:w-8 sm:h-8" />}
                           </div>
                           <div className="overflow-hidden">
                              <p className="text-lg sm:text-2xl font-bold uppercase tracking-tight truncate">{s.mode === TimerMode.POMODORO ? 'Deep Procedure' : 'Still Rest'}</p>
                              <p className="text-[8px] sm:text-[10px] uppercase font-black tracking-widest text-white/10 mt-1 sm:mt-2 truncate">{new Date(s.timestamp).toLocaleDateString()} • {new Date(s.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                           </div>
                        </div>
                        <p className="text-2xl sm:text-4xl font-black text-white/80 ml-4">+{Math.floor(s.duration / 60)}<span className="text-[10px] sm:text-sm ml-1 opacity-20 uppercase font-black">m</span></p>
                      </div>
                    )) : <div className="text-center py-20 sm:py-32 opacity-10 italic text-xl">Archive is empty. Start a session.</div>}
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:gap-16">
                {[
                  { label: 'Portal Time', val: Math.floor(totalStudied / 60), unit: 'm', icon: <Clock size={20} /> },
                  { label: 'Procedure Peak', val: sessions.filter(s => s.mode === TimerMode.POMODORO).length, unit: '', icon: <Activity size={20} /> },
                  { label: 'Resolved Goals', val: tasks.filter(t => t.completed).length, unit: '', icon: <ListChecks size={20} /> },
                  { label: 'Sync Depth', val: '99', unit: '%', icon: <Wind size={20} /> }
                ].map((s, i) => (
                  <div key={i} className="p-8 sm:p-14 bg-white/[0.02] border border-white/5 rounded-3xl sm:rounded-[5rem] hover:bg-white/[0.05] hover:scale-105 transition-all group shadow-2xl">
                    <div className="text-white/10 group-hover:text-white transition-all mb-6 sm:mb-10" style={{ color: activeTheme.accent + '80' }}>{s.icon}</div>
                    <p className="text-[8px] sm:text-[11px] font-black uppercase tracking-[0.4em] text-white/10 mb-4 sm:mb-8">{s.label}</p>
                    <p className="text-4xl sm:text-7xl font-black text-white tracking-tighter truncate">{s.val}<span className="text-sm sm:text-[18px] text-white/20 ml-1 sm:ml-3 font-normal uppercase">{s.unit}</span></p>
                  </div>
                ))}
              </div>
           </div>
        </section>

        <footer className="py-24 sm:py-64 flex flex-col items-center space-y-12 opacity-10 border-t border-white/5">
           <div className="w-16 sm:w-32 h-px bg-white/20" />
           <p className="text-[10px] sm:text-[14px] uppercase font-black tracking-[1.5em] sm:tracking-[3em] text-center">Silence Transcends Noise</p>
        </footer>
      </main>

      {/* 7. COMMAND PILL (COMPACT AT BOTTOM CENTER) */}
      <nav className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] p-1.5 sm:p-2.5 bg-black/80 backdrop-blur-[120px] border border-white/10 rounded-full shadow-[0_20px_100px_rgba(0,0,0,1)] flex items-center gap-1 transition-all duration-1000 ${zenMode ? 'opacity-0 translate-y-24' : 'opacity-100'}`}>
        {[
          { id: AppView.HOME, label: 'Portal', icon: <Home size={18} />, anchor: 'sanctuary' },
          { id: AppView.TASKS, label: 'Board', icon: <ListChecks size={18} />, anchor: 'tasks' },
          { id: AppView.FOCUS, label: 'Manifest', icon: <Sparkles size={18} />, anchor: 'manifest' },
          { id: AppView.AMBIENT, label: 'Legacy', icon: <TrendingUp size={18} />, anchor: 'stats' }
        ].map((item) => (
          <button 
            key={item.id} 
            onClick={() => { setCurrentView(item.id); document.getElementById(item.anchor)?.scrollIntoView({ behavior: 'smooth' }); }}
            className={`flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-full transition-all duration-700 font-bold text-[9px] sm:text-[10px] uppercase tracking-[0.2em] ${currentView === item.id ? 'bg-white text-black shadow-4xl scale-105' : 'text-white/30 hover:text-white hover:bg-white/5'}`}>
            <span className="flex-shrink-0">{item.icon}</span>
            <span className="hidden md:inline">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* MIXER */}
      {showMixer && (
        <div className="fixed inset-x-4 sm:inset-x-auto bottom-24 sm:bottom-40 sm:left-12 sm:w-[450px] bg-black/98 backdrop-blur-[140px] border border-white/10 rounded-3xl sm:rounded-[5rem] p-8 sm:p-16 shadow-[0_120px_250px_rgba(0,0,0,1)] z-[120] animate-in slide-in-from-left-20 duration-1000">
          <header className="flex justify-between items-center mb-10 sm:mb-16">
            <div className="flex items-center gap-4 sm:gap-6"><Volume2 size={24} className="sm:w-7 sm:h-7" style={{ color: activeTheme.accent }} /><h3 className="text-white/40 font-black text-[10px] sm:text-[12px] uppercase tracking-[0.5em] sm:tracking-[1em]">Acoustic Lab</h3></div>
            <button onClick={() => setShowMixer(false)} className="text-white/20 hover:text-white transition-all hover:rotate-90"><X size={28} /></button>
          </header>
          <div className="space-y-12 sm:space-y-16 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar">
            {AMBIENT_SOUNDS.map(sound => (
              <div key={sound.id} className="group">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-4 sm:gap-8 text-white/30 group-hover:text-white transition-all duration-700">
                    <div className={`p-4 rounded-xl sm:rounded-[2rem] transition-all duration-700 ${volumes[sound.id] > 0 ? 'bg-white/10 text-white shadow-3xl' : 'bg-white/5'}`} style={volumes[sound.id] > 0 ? { color: activeTheme.accent } : {}}>{getIcon(sound.icon)}</div>
                    <div className="overflow-hidden"><span className="text-base sm:text-[17px] font-bold uppercase tracking-[0.1em] block truncate">{sound.name}</span><span className="text-[8px] sm:text-[10px] text-white/10 font-black uppercase tracking-widest truncate">{sound.isMusic ? 'Focused Resonance' : 'Nature Loop'}</span></div>
                  </div>
                  <span className="text-[12px] font-mono opacity-20">{Math.round(volumes[sound.id] * 100)}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.01" value={volumes[sound.id]} onChange={(e) => setVolumes({...volumes, [sound.id]: parseFloat(e.target.value)})} className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-white" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* THEME PICKER */}
      {showThemePicker && (
        <div className="fixed inset-x-4 sm:inset-x-auto top-20 sm:top-40 sm:right-12 sm:w-[420px] bg-black/98 backdrop-blur-[140px] border border-white/10 rounded-3xl sm:rounded-[5rem] p-8 sm:p-16 shadow-[0_120px_250px_rgba(0,0,0,1)] z-[120] animate-in slide-in-from-top-20 duration-1000">
          <header className="flex justify-between items-center mb-10 sm:mb-14"><h3 className="text-white/40 font-black text-[10px] sm:text-[12px] uppercase tracking-[0.5em] sm:tracking-[1em]">Visual Realms</h3><button onClick={() => setShowThemePicker(false)} className="text-white/20 hover:text-white transition-all hover:rotate-90"><X size={28} /></button></header>
          <div className="grid grid-cols-2 gap-4 sm:gap-8 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
            {THEMES.map(theme => (
              <button key={theme.id} onClick={() => { setActiveTheme(theme); setShowThemePicker(false); }} className={`group relative h-32 sm:h-48 rounded-[1.5rem] sm:rounded-[3.5rem] overflow-hidden border-2 transition-all duration-[1500ms] ${activeTheme.id === theme.id ? 'border-white scale-105 shadow-4xl' : 'border-transparent opacity-30 hover:opacity-100'}`}>
                <img src={theme.url} className="h-full w-full object-cover group-hover:scale-150 transition-transform duration-[8000ms]" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 p-2"><p className="text-[11px] font-black uppercase tracking-[0.4em]">{theme.name}</p></div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TEXTURE */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.12] contrast-150 mix-blend-overlay z-[200] hidden sm:block" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      {/* AUDIO NODES */}
      {AMBIENT_SOUNDS.map(sound => (
        <audio key={sound.id} ref={el => { audioRefs.current[sound.id] = el; }} src={sound.url} loop hidden preload="none" />
      ))}
    </div>
  );
};

export default App;
