import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Play, Pause, RotateCcw, Music, Sliders, X, Plus, Trash2,
  Check, Leaf, BrainCircuit, Home, Layout, 
  Sparkles, Maximize2, Minimize2, Volume2, Settings2, 
  CloudRain, Flame, Trees, Waves, Target, Monitor, ArrowDown,
  Zap, Clock, Award, Loader2, Mountain, Droplets, Rocket, Building2, Book, Cpu, Flower2, Home as HomeIcon, Palette
} from 'lucide-react';
import { TimerMode, Task, TimerSettings } from './types';
import { AMBIENT_SOUNDS, THEMES, Theme, TIMER_SETTINGS } from './constants';
import { fetchMotivationalQuote, generateSubtasks } from './services/gemini';
import ShinyText from './components/ShinyText';

// --- Icon Mapping ---
const iconMap: Record<string, any> = {
  CloudRain, Flame, Trees, Waves, Music,
  Mountain, Droplets, Rocket, Building2, Book, Cpu, Flower2, HomeIcon, Palette, Leaf
};

const getIcon = (iconName: string) => {
  return iconMap[iconName] || Music;
};

const themeIconMap: Record<string, any> = {
  forest: Trees,
  mountain: Mountain,
  ocean: Waves,
  space: Rocket,
  city: Building2,
  library: Book,
  cyber: Cpu,
  zen: Flower2,
  attic: HomeIcon,
  aurora: Palette
};

const getThemeIcon = (themeId: string) => {
  return themeIconMap[themeId] || Leaf;
};

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
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
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
      const x = (e.clientX / window.innerWidth) - 0.5;
      const y = (e.clientY / window.innerHeight) - 0.5;
      setMousePos({ x: x * 20, y: y * 20 });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Clock Update
  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Fetch Quote on Mount
  useEffect(() => {
    fetchMotivationalQuote().then(setQuote);
  }, []);

  // Timer Logic
  useEffect(() => {
    if (!isActive) return;
    const tick = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsActive(false);
          notificationAudio.current?.play();
          if (mode === TimerMode.POMODORO) {
            setCompletedPomodoros((c) => c + 1);
            setTotalStudyTime((t) => {
              const newTotal = t + settings.pomodoro * 60;
              localStorage.setItem('aura_total_study_time', newTotal.toString());
              return newTotal;
            });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [isActive, mode, settings.pomodoro]);

  // Save tasks to localStorage
  useEffect(() => {
    localStorage.setItem('aura_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('aura_timer_settings', JSON.stringify(settings));
  }, [settings]);

  // --- Handlers ---
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

  const changeTheme = (theme: Theme) => {
    setActiveTheme(theme);
    // Stop all currently playing sounds
    Object.values(audioRefs.current).forEach(audio => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
    setVolumes({
      rain: 0, lofi: 0, fire: 0, forest: 0, jazz: 0, waves: 0, classical: 0
    });
  };

  const adjustVolume = (soundId: string, value: number) => {
    const audio = audioRefs.current[soundId];
    if (audio) {
      audio.volume = value / 100;
      if (value > 0 && audio.paused) audio.play();
      if (value === 0 && !audio.paused) audio.pause();
    }
    setVolumes((prev) => ({ ...prev, [soundId]: value }));
  };

  const addTask = (text: string) => {
    const newTask: Task = { id: Date.now().toString(), text, completed: false, isPriority: false };
    setTasks([...tasks, newTask]);
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handleAISubtasks = async (taskText: string) => {
    const subtasks = await generateSubtasks(taskText);
    if (subtasks.length > 0) {
      const newTasks = subtasks.map(text => ({
        id: Date.now().toString() + Math.random(),
        text,
        completed: false,
        isPriority: false
      }));
      setTasks([...tasks, ...newTasks]);
    }
  };

  // --- Computed Values ---
  const progress = useMemo(() => {
    const initial = getInitialTime(mode);
    return initial > 0 ? ((initial - timeLeft) / initial) * 100 : 0;
  }, [timeLeft, mode, getInitialTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Render ---
  return (
    <div className="min-h-screen overflow-x-hidden text-white font-sans" style={{
      backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${activeTheme.url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      transition: 'background 1s ease'
    }}>
      {/* Audio Elements */}
      {AMBIENT_SOUNDS.map(sound => (
        <audio key={sound.id} ref={el => { if (el) audioRefs.current[sound.id] = el; }} src={sound.url} loop />
      ))}
      <audio ref={notificationAudio} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" />

      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-8 max-w-4xl mx-auto"
          style={{
            transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)`,
            transition: 'transform 0.2s ease-out'
          }}>
          
          <FadeInSection>
            <h1 className="text-6xl md:text-8xl font-bold mb-4" style={{ color: activeTheme.accent }}>
              <ShinyText text="AuraStudy" />
            </h1>
          </FadeInSection>

          <FadeInSection delay={200}>
            <p className="text-xl md:text-2xl text-white/70 italic max-w-2xl mx-auto">
              "{quote}"
            </p>
          </FadeInSection>

          {/* Timer Display */}
          <FadeInSection delay={400}>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-5xl p-12 space-y-6">
              {/* Mode Selector */}
              <div className="flex gap-2 justify-center">
                {[
                  { mode: TimerMode.POMODORO, label: 'Focus' },
                  { mode: TimerMode.SHORT_BREAK, label: 'Short Break' },
                  { mode: TimerMode.LONG_BREAK, label: 'Long Break' }
                ].map(({ mode: m, label }) => (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    className={`px-6 py-2 rounded-full transition-all ${
                      mode === m
                        ? 'bg-white/20 text-white'
                        : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Timer */}
              <div className="text-8xl font-bold tracking-tight" style={{ color: activeTheme.accent }}>
                {formatTime(timeLeft)}
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-1000"
                  style={{
                    width: `${progress}%`,
                    background: activeTheme.accent
                  }}
                />
              </div>

              {/* Controls */}
              <div className="flex gap-4 justify-center items-center">
                <button
                  onClick={toggleTimer}
                  className="bg-white/10 hover:bg-white/20 p-6 rounded-full transition-all"
                >
                  {isActive ? <Pause size={32} /> : <Play size={32} />}
                </button>
                <button
                  onClick={resetTimer}
                  className="bg-white/10 hover:bg-white/20 p-6 rounded-full transition-all"
                >
                  <RotateCcw size={32} />
                </button>
              </div>

              {/* Stats */}
              <div className="flex gap-6 justify-center text-sm text-white/60">
                <div>Completed: {completedPomodoros}</div>
                <div>Total: {Math.floor(totalStudyTime / 60)}m</div>
              </div>
            </div>
          </FadeInSection>

          {/* Scroll Indicator */}
          <FadeInSection delay={600}>
            <div className="flex flex-col items-center gap-2 animate-bounce">
              <span className="text-white/50 text-sm">Explore Features</span>
              <ArrowDown className="text-white/50" size={24} />
            </div>
          </FadeInSection>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 py-20 space-y-20">
        {/* Themes Section */}
        <FadeInSection>
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4" style={{ color: activeTheme.accent }}>
              Ambient Themes
            </h2>
            <p className="text-white/60">Choose your perfect study atmosphere</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {THEMES.map((theme) => {
              const ThemeIcon = getThemeIcon(theme.id);
              return (
                <button
                  key={theme.id}
                  onClick={() => changeTheme(theme)}
                  className={`group relative overflow-hidden rounded-3xl p-6 transition-all ${
                    activeTheme.id === theme.id ? 'ring-4' : 'hover:scale-105'
                  }`}
                  style={{
                    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url(${theme.url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    ...(activeTheme.id === theme.id && { outline: `4px solid ${theme.accent}`, outlineOffset: '2px' })
                  }}
                >
                  <div className="flex flex-col items-center gap-3">
                    <ThemeIcon size={40} className="text-white" />
                    <span className="text-white font-medium">{theme.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </FadeInSection>

        {/* Sounds Section */}
        <FadeInSection>
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4" style={{ color: activeTheme.accent }}>
              Ambient Sounds
            </h2>
            <p className="text-white/60">Layer soundscapes for your perfect focus zone</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {AMBIENT_SOUNDS.map((sound) => {
              const SoundIcon = getIcon(sound.icon);
              return (
                <div
                  key={sound.id}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <SoundIcon size={24} />
                    <span className="font-medium flex-1">{sound.name}</span>
                    <Volume2 size={20} className="text-white/40" />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volumes[sound.id]}
                    onChange={(e) => adjustVolume(sound.id, parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              );
            })}
          </div>
        </FadeInSection>

        {/* Tasks Section */}
        <FadeInSection>
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4" style={{ color: activeTheme.accent }}>
              Focus Tasks
            </h2>
            <p className="text-white/60">Break down your goals with AI assistance</p>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-3xl mx-auto">
            {/* Add Task */}
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="What's your goal?"
                className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white placeholder-white/40 focus:outline-none focus:ring-2"
                style={{ outlineColor: activeTheme.accent }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    addTask(e.currentTarget.value.trim());
                    e.currentTarget.value = '';
                  }
                }}
              />
              <button
                className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl transition-all"
                onClick={() => {
                  const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                  if (input?.value.trim()) {
                    addTask(input.value.trim());
                    input.value = '';
                  }
                }}
              >
                <Plus size={24} />
              </button>
            </div>

            {/* Task List */}
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 hover:bg-white/10 transition-all"
                >
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      task.completed ? 'border-green-500 bg-green-500' : 'border-white/40'
                    }`}
                  >
                    {task.completed && <Check size={16} />}
                  </button>
                  <span className={`flex-1 ${task.completed ? 'line-through text-white/40' : ''}`}>
                    {task.text}
                  </span>
                  <button
                    onClick={() => handleAISubtasks(task.text)}
                    className="text-white/40 hover:text-white transition-all"
                    title="Break down with AI"
                  >
                    <Zap size={20} />
                  </button>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-white/40 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>

            {tasks.length === 0 && (
              <div className="text-center py-12 text-white/40">
                <Target size={48} className="mx-auto mb-4 opacity-40" />
                <p>Add your first task to get started</p>
              </div>
            )}
          </div>
        </FadeInSection>
      </div>
    </div>
  );
}

export default App;