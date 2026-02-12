
import React from 'react';

interface HeaderProps {
  title: string;
  onPublish: () => void;
  onPreview: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, onPublish, onPreview }) => {
  return (
    <header className="sticky top-0 z-50 flex-none bg-white/70 dark:bg-black/70 backdrop-blur-md border-b border-slate-200/40 dark:border-slate-800/40 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 overflow-hidden flex-1 mr-4">
        <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
          <span className="material-symbols-outlined text-xl">chevron_left</span>
        </button>
        <div className="flex flex-col overflow-hidden">
          <span className="text-[9px] uppercase tracking-[0.15em] font-bold text-slate-400">Editor</span>
          <h1 className="text-xs font-medium leading-tight opacity-60 break-words">
            {title || "Untitled Lesson"}
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button 
          onClick={onPreview}
          className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          Preview
        </button>
        <button 
          onClick={onPublish}
          className="px-5 py-1.5 text-sm font-semibold bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-full active:scale-95 hover:shadow-lg transition-all"
        >
          Publish
        </button>
      </div>
    </header>
  );
};

export default Header;
