
import React from 'react';

interface AddModuleButtonProps {
  onClick: () => void;
}

const AddModuleButton: React.FC<AddModuleButtonProps> = ({ onClick }) => {
  return (
    <button 
      onClick={onClick}
      className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800/20 hover:border-slate-400 dark:hover:border-slate-600 transition-all active:scale-[0.98]"
    >
      <span className="material-symbols-outlined">create_new_folder</span>
      ADD NEW MODULE
    </button>
  );
};

export default AddModuleButton;
