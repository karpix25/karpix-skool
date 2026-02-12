
import React from 'react';
import { Module } from '../types';
import LessonItem from './LessonItem';

interface ModuleItemProps {
  module: Module;
  isExpanded: boolean;
  onToggle: () => void;
  onAddLesson: () => void;
}

const ModuleItem: React.FC<ModuleItemProps> = ({ module, isExpanded, onToggle, onAddLesson }) => {
  return (
    <div className="space-y-1">
      <div 
        onClick={onToggle}
        className={`cursor-pointer transition-all duration-200 rounded-xl p-4 flex items-center justify-between border ${
          isExpanded 
            ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm z-10 relative' 
            : 'bg-slate-200 dark:bg-slate-800/50 border-transparent opacity-80'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className={`material-symbols-outlined ${isExpanded ? 'text-primary' : 'text-slate-500'}`} style={isExpanded ? {fontVariationSettings: "'FILL' 1"} : {}}>
            {isExpanded ? 'folder_open' : 'folder'}
          </span>
          <h3 className={`font-bold text-sm ${!isExpanded ? 'text-slate-600 dark:text-slate-400' : ''}`}>
            {module.title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {module.isActive && isExpanded ? (
            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">Active</span>
          ) : (
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-300 dark:bg-slate-700 px-2 py-0.5 rounded">
              {module.lessons.length} Lessons
            </span>
          )}
          <span className="material-symbols-outlined text-slate-400 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
            expand_more
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="ml-8 pt-1 space-y-1.5 border-l-2 border-slate-200 dark:border-slate-800 pl-4 animate-slide-up">
          {module.lessons.map((lesson) => (
            <LessonItem key={lesson.id} lesson={lesson} />
          ))}
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onAddLesson();
            }}
            className="w-full py-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-400 flex items-center justify-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            ADD LESSON
          </button>
        </div>
      )}
    </div>
  );
};

export default ModuleItem;
