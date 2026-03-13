/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Timer, 
  Trophy, 
  Star, 
  XCircle, 
  CheckCircle2, 
  RotateCcw, 
  Play, 
  ChevronRight, 
  Brain,
  Home,
  Award,
  Medal
} from 'lucide-react';
import { LEVELS, LevelConfig } from './constants';

interface Question {
  a: number;
  b: number;
  answer: number;
}

type GameState = 'menu' | 'playing' | 'level-complete' | 'game-over';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [completionCounts, setCompletionCounts] = useState<Record<number, number>>({});
  const [wrongCount, setWrongCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isShaking, setIsShaking] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load progress
  useEffect(() => {
    const saved = localStorage.getItem('multiplication-master-counts');
    if (saved) {
      try {
        setCompletionCounts(JSON.parse(saved));
      } catch (e) {
        setCompletionCounts({});
      }
    }
  }, []);

  const playSound = (type: 'correct' | 'wrong' | 'success') => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'correct') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'wrong') {
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.2);
    } else if (type === 'success') {
      const now = audioCtx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.connect(g);
        g.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        g.gain.setValueAtTime(0.1, now + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.3);
      });
    }
  };

  const triggerCelebration = () => {
    playSound('success');
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const generateLevelQuestions = useCallback((level: LevelConfig) => {
    const newQuestions: Question[] = [];
    const availableTables = level.tables;
    
    if (level.isSequential && availableTables.length === 1) {
      const table = availableTables[0];
      for (let i = 1; i <= 12; i++) {
        newQuestions.push({ a: i, b: table, answer: i * table });
      }
    } else {
      for (let i = 0; i < level.questionCount; i++) {
        const table = availableTables[Math.floor(Math.random() * availableTables.length)];
        const multiplier = Math.floor(Math.random() * 12) + 1;
        newQuestions.push({ a: multiplier, b: table, answer: multiplier * table });
      }
    }
    return newQuestions;
  }, []);

  const startLevel = (levelId: number) => {
    const level = LEVELS[levelId - 1];
    const initialQuestions = generateLevelQuestions(level);
    setQuestions(initialQuestions);
    setCurrentQuestionIndex(0);
    setCurrentLevel(levelId);
    setTimeLeft(level.timeLimit);
    setScore(0);
    setWrongCount(0);
    setStreak(0);
    setUserInput('');
    setGameState('playing');
    setFeedback(null);
  };

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setGameState('game-over');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, timeLeft]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing' || feedback) return;
      
      if (e.key >= '0' && e.key <= '9') {
        handleNumberClick(e.key);
      } else if (e.key === 'Enter') {
        handleSubmit();
      } else if (e.key === 'Backspace' || e.key === 'c' || e.key === 'C') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, feedback, userInput]);

  const handleNumberClick = (num: string) => {
    if (feedback) return;
    if (userInput.length < 3) {
      setUserInput((prev) => prev + num);
    }
  };

  const handleClear = () => {
    setUserInput('');
  };

  const handleSubmit = () => {
    if (!userInput || feedback) return;

    const currentQ = questions[currentQuestionIndex];
    const isCorrect = parseInt(userInput) === currentQ.answer;

    if (isCorrect) {
      setFeedback('correct');
      playSound('correct');
      setStreak((prev) => prev + 1);
      setScore((prev) => prev + 10 + (streak > 5 ? 5 : 0)); // Bonus for streak
      setTimeout(() => {
        if (currentQuestionIndex + 1 >= questions.length) {
          setGameState('level-complete');
          triggerCelebration();
          
          const newCounts = { ...completionCounts };
          newCounts[currentLevel] = (newCounts[currentLevel] || 0) + 1;
          setCompletionCounts(newCounts);
          localStorage.setItem('multiplication-master-counts', JSON.stringify(newCounts));
        } else {
          setCurrentQuestionIndex((prev) => prev + 1);
          setUserInput('');
          setFeedback(null);
        }
      }, 200);
    } else {
      setFeedback('wrong');
      playSound('wrong');
      setWrongCount((prev) => prev + 1);
      setStreak(0);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      
      setTimeout(() => {
        setQuestions((prev) => {
          const nextQuestions = [...prev];
          const remainingCount = nextQuestions.length - (currentQuestionIndex + 1);
          for (let i = 0; i < 2; i++) {
            const insertPos = currentQuestionIndex + 1 + Math.floor(Math.random() * (remainingCount + 1 + i));
            nextQuestions.splice(insertPos, 0, { ...currentQ });
          }
          return nextQuestions;
        });
        
        setUserInput('');
        setFeedback(null);
        setCurrentQuestionIndex((prev) => prev + 1);
      }, 800);
    }
  };

  const renderMenu = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#E4E3E0] p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="flex justify-center mb-4">
          <div className="bg-[#141414] p-4 rounded-2xl rotate-3">
            <Brain className="w-12 h-12 text-[#E4E3E0]" />
          </div>
        </div>
        <h1 className="text-5xl font-black text-[#141414] tracking-tighter uppercase mb-2">
          乘法表大冒险
        </h1>
        <p className="text-[#141414]/60 font-medium italic">Master the Tables: Level 1 - 50</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl w-full overflow-y-auto max-h-[65vh] p-6 bg-white/50 rounded-3xl border border-[#141414]/10">
        {LEVELS.map((level) => {
          const count = completionCounts[level.id] || 0;
          
          let bgColor = 'bg-white';
          let textColor = 'text-[#141414]';
          let icon = null;

          if (count === 1) {
            bgColor = 'bg-green-500';
            textColor = 'text-white';
            icon = <CheckCircle2 className="w-4 h-4" />;
          } else if (count === 2) {
            bgColor = 'bg-blue-500';
            textColor = 'text-white';
            icon = <Medal className="w-4 h-4" />;
          } else if (count >= 3) {
            bgColor = 'bg-yellow-500';
            textColor = 'text-[#141414]';
            icon = <Trophy className="w-4 h-4" />;
          }

          return (
            <motion.button
              key={level.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startLevel(level.id)}
              className={`
                flex flex-col items-start p-4 rounded-2xl border-2 border-[#141414] shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] transition-all
                ${bgColor} ${textColor}
              `}
            >
              <div className="flex justify-between w-full items-center mb-1">
                <span className="text-xs font-black uppercase opacity-60">Level {level.id}</span>
                {icon}
              </div>
              <div className="text-lg font-black tracking-tight leading-tight text-left">
                {level.description}
              </div>
              {count > 0 && (
                <div className="mt-2 text-[10px] font-bold uppercase opacity-70">
                  已通关 {count} 次
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="mt-12 flex items-center gap-4 text-[#141414]/60 text-sm font-bold uppercase tracking-widest">
        <Award className="w-5 h-5" />
        已通关: {Object.keys(completionCounts).length} / 50 关
      </div>
    </div>
  );

  const renderPlaying = () => {
    const currentQ = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex) / questions.length) * 100;

    return (
      <div className="flex flex-col min-h-screen bg-[#141414] text-[#E4E3E0] p-6 font-mono">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setGameState('menu')}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <Home className="w-6 h-6" />
            </button>
            <div className="bg-[#E4E3E0] text-[#141414] px-4 py-1 rounded-full font-black text-sm uppercase">
              Level {currentLevel}
            </div>
            <div className={`flex items-center gap-2 text-sm font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'opacity-70'}`}>
              <Timer className="w-4 h-4" />
              {timeLeft}s
            </div>
          </div>
          <div className="flex flex-col items-end">
            {streak > 1 && (
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-yellow-400 font-black text-xs uppercase mb-1"
              >
                {streak} Combo! 🔥
              </motion.div>
            )}
            <div className="text-xs opacity-50 uppercase mb-1">
              Progress: {currentQuestionIndex + 1} / {questions.length}
            </div>
            <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-[#E4E3E0]" 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 flex flex-col items-center justify-center mb-8">
          <motion.div 
            key={currentQuestionIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              x: isShaking ? [0, -10, 10, -10, 10, 0] : 0
            }}
            transition={{ 
              duration: isShaking ? 0.4 : 0.15,
              times: isShaking ? [0, 0.2, 0.4, 0.6, 0.8, 1] : undefined
            }}
            className="text-center"
          >
            <div className="text-8xl font-black tracking-tighter mb-4 flex items-center justify-center gap-4">
              <span>{currentQ?.a}</span>
              <span className="text-white/30">×</span>
              <span>{currentQ?.b}</span>
              <span className="text-white/30">=</span>
              <span className={`min-w-[120px] border-b-4 ${feedback === 'correct' ? 'text-green-400 border-green-400' : feedback === 'wrong' ? 'text-red-400 border-red-400' : 'border-white/20'}`}>
                {userInput || '?'}
              </span>
            </div>
            
            {feedback === 'wrong' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 font-bold text-xl uppercase tracking-widest"
              >
                错误！惩罚：该题多做2遍
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Number Pad */}
        <div className="max-w-md mx-auto w-full grid grid-cols-3 gap-4 mb-8">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].map((btn) => (
            <motion.button
              key={btn}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (btn === 'C') handleClear();
                else if (btn === 'OK') handleSubmit();
                else handleNumberClick(btn);
              }}
              className={`
                h-20 rounded-2xl text-3xl font-black flex items-center justify-center
                ${btn === 'OK' ? 'bg-[#E4E3E0] text-[#141414] col-span-1' : 
                  btn === 'C' ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 
                  'bg-white/5 border border-white/10 hover:bg-white/10'}
              `}
            >
              {btn}
            </motion.button>
          ))}
        </div>
      </div>
    );
  };

  const renderLevelComplete = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#E4E3E0] p-6 font-sans text-[#141414]">
      <motion.div 
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white p-12 rounded-[3rem] border-4 border-[#141414] shadow-[12px_12px_0px_0px_rgba(20,20,20,1)] text-center max-w-sm w-full"
      >
        <div className="flex justify-center mb-6">
          <Trophy className="w-20 h-20 text-yellow-500" />
        </div>
        <h2 className="text-4xl font-black uppercase tracking-tighter mb-2">闯关成功!</h2>
        <p className="text-lg font-bold opacity-60 mb-8 italic">Level {currentLevel} Completed</p>
        
        <div className="space-y-4 mb-10">
          <div className="flex justify-between font-bold border-b border-[#141414]/10 pb-2">
            <span>得分</span>
            <span>{score}</span>
          </div>
          <div className="flex justify-between font-bold border-b border-[#141414]/10 pb-2">
            <span>错误次数</span>
            <span className={wrongCount > 0 ? 'text-red-500' : 'text-green-500'}>{wrongCount}</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <button 
            onClick={() => startLevel(currentLevel + 1)}
            className="w-full py-4 bg-[#141414] text-[#E4E3E0] rounded-2xl font-black text-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            下一关 <ChevronRight className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setGameState('menu')}
            className="w-full py-4 border-2 border-[#141414] rounded-2xl font-black text-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          >
            返回主页 <Home className="w-6 h-6" />
          </button>
        </div>
      </motion.div>
    </div>
  );

  const renderGameOver = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-6 font-sans text-[#141414]">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white p-12 rounded-[3rem] border-4 border-red-500 shadow-[12px_12px_0px_0px_rgba(239,68,68,1)] text-center max-w-sm w-full"
      >
        <div className="flex justify-center mb-6">
          <XCircle className="w-20 h-20 text-red-500" />
        </div>
        <h2 className="text-4xl font-black uppercase tracking-tighter mb-2 text-red-500">时间到!</h2>
        <p className="text-lg font-bold opacity-60 mb-8 italic">Level {currentLevel} Failed</p>
        
        <p className="mb-10 font-medium text-gray-600">
          别灰心！乘法表需要多加练习才能熟练。再试一次吧！
        </p>

        <div className="flex flex-col gap-4">
          <button 
            onClick={() => startLevel(currentLevel)}
            className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            重试关卡 <RotateCcw className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setGameState('menu')}
            className="w-full py-4 border-2 border-red-500 text-red-500 rounded-2xl font-black text-xl flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
          >
            返回主页 <Home className="w-6 h-6" />
          </button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <main className="min-h-screen select-none touch-manipulation">
      {gameState === 'menu' && renderMenu()}
      {gameState === 'playing' && renderPlaying()}
      {gameState === 'level-complete' && renderLevelComplete()}
      {gameState === 'game-over' && renderGameOver()}
    </main>
  );
}
