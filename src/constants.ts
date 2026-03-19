import { LucideIcon, Star, Trophy, Timer, XCircle, CheckCircle2, RotateCcw, Play, ChevronRight, Brain } from 'lucide-react';

export interface LevelConfig {
  id: number;
  title: string;
  description: string; // New field to show level content
  tables: number[]; 
  questionCount: number;
  timeLimit: number; 
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  isSequential?: boolean;
}

export const LEVELS: LevelConfig[] = Array.from({ length: 50 }, (_, i) => {
  const id = i + 1;
  let tables: number[] = [];
  let questionCount = 12;
  let timeLimit = 60;
  let difficulty: LevelConfig['difficulty'] = 'easy';
  let isSequential = false;
  let description = '';

  if (id <= 24) {
    // Levels 1-24: 2 levels per table (1-12)
    const tableNum = Math.ceil(id / 2);
    tables = [tableNum];
    isSequential = id % 2 !== 0;
    description = `${tableNum} 的乘法表 (${isSequential ? '顺序' : '随机'})`;
    timeLimit = isSequential ? 75 : 60;
  } else if (id <= 28) {
    // 25-28: Small Mix (1-3)
    tables = [1, 2, 3];
    questionCount = 15;
    timeLimit = 65;
    difficulty = 'medium';
    description = '混合练习 (1-3)';
  } else if (id <= 32) {
    // 29-32: Small Mix (4-6)
    tables = [4, 5, 6];
    questionCount = 15;
    timeLimit = 65;
    difficulty = 'medium';
    description = '混合练习 (4-6)';
  } else if (id <= 36) {
    // 33-36: Small Mix (7-9)
    tables = [7, 8, 9];
    questionCount = 15;
    timeLimit = 65;
    difficulty = 'medium';
    description = '混合练习 (7-9)';
  } else if (id <= 40) {
    // 37-40: Small Mix (10-12)
    tables = [10, 11, 12];
    questionCount = 15;
    timeLimit = 65;
    difficulty = 'medium';
    description = '混合练习 (10-12)';
  } else if (id <= 45) {
    // 41-45: Full Mix (1-12)
    tables = Array.from({ length: 12 }, (_, i) => i + 1);
    questionCount = 20;
    timeLimit = 75;
    difficulty = 'hard';
    description = '全表大乱斗 (1-12)';
  } else {
    // 46-50: Speed Challenge
    tables = Array.from({ length: 12 }, (_, i) => i + 1);
    // Progressively increase question count: 46:25, 47:28, 48:32, 49:35, 50:40
    const counts = [25, 28, 32, 35, 40];
    // Increase time limits (original * 1.25): 46:115s, 47:125s, 48:150s, 49:175s, 50:225s
    const times = [115, 125, 150, 175, 225];
    questionCount = counts[id - 46];
    timeLimit = times[id - 46];
    difficulty = 'expert';
    description = '极速挑战 (大师级)';
  }

  return {
    id,
    title: `第 ${id} 关`,
    description,
    tables,
    questionCount,
    timeLimit,
    difficulty,
    isSequential,
  };
});
