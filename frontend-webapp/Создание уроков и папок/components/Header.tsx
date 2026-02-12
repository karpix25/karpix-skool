
import React from 'react';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 ios-blur border-b border-slate-200 dark:border-slate-800 px-4 pt-6 pb-4">
      <div className="flex items-center gap-3">
        <button className="p-1 -ml-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors">
          <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight truncate">{title}</h1>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Course Curriculum</p>
        </div>
        <button className="bg-primary/10 text-primary p-2 rounded-full hover:bg-primary/20 transition-all active:scale-95">
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
