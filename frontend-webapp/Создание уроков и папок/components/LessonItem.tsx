
import React from 'react';
import { Lesson, LessonType } from '../types';

interface LessonItemProps {
  lesson: Lesson;
}

const LessonItem: React.FC<LessonItemProps> = ({ lesson }) => {
  const getBadgeStyles = (type: LessonType) => {
    switch (type) {
      case 'FREE':
        return 'bg-green-500/10 text-green-500';
      case 'LVL2':
        return 'bg-primary/20 text-primary';
      case 'DRIP':
        return 'bg-amber-500/10 text-amber-500';
      case 'LVL5':
        return 'bg-slate-500/10 text-slate-500';
      default:
        return 'hidden';
    }
  };

  const getBadgeText = (type: LessonType) => {
    if (type === 'STANDARD') return '';
    return type;
  };

  return (
    <div className={`p-3 rounded-lg flex items-center justify-between transition-all ${
      lesson.isGhost 
        ? 'bg-primary/5 dark:bg-primary/10 border-2 border-dashed border-primary/40' 
        : 'bg-white dark:bg-[#192233] border border-slate-100 dark:border-slate-800'
    }`}>
      <div className="flex items-center gap-3">
        <span className={`material-symbols-outlined text-lg ${lesson.isGhost ? 'text-primary' : 'text-slate-400'}`}>
          {lesson.icon}
        </span>
        <span className={`text-sm font-medium ${lesson.isGhost ? 'text-primary' : ''}`}>
          {lesson.title}
        </span>
      </div>
      {lesson.type !== 'STANDARD' && (
        <span className={`text-[9px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded ${getBadgeStyles(lesson.type)}`}>
          {getBadgeText(lesson.type)}
        </span>
      )}
    </div>
  );
};

export default LessonItem;
