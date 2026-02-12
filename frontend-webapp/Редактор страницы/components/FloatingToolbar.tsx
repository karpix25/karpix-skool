
import React from 'react';

interface FloatingToolbarProps {
  onCommand: (command: string) => void;
  activeCommands?: string[];
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ onCommand, activeCommands = [] }) => {
  const leftGroup = [
    { icon: 'format_bold', command: 'bold', label: 'B' },
    { icon: 'format_italic', command: 'italic', label: 'I' },
    { icon: 'format_list_bulleted', command: 'insertUnorderedList', label: '' },
    { icon: 'link', command: 'createLink', label: '' },
  ];

  const rightGroup = [
    { icon: 'image', command: 'insertImage', label: '' },
    { icon: 'code', command: 'formatBlock:pre', label: '' },
    { icon: 'text_fields', command: 'h2', label: 'Tt' },
  ];

  const renderButton = (tool: { icon: string; command: string; label: string }) => {
    const isActive = activeCommands.includes(tool.command);
    return (
      <button
        key={tool.command}
        onClick={() => onCommand(tool.command)}
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all active:scale-95 ${
          isActive ? 'text-blue-500' : 'text-white hover:bg-white/10'
        }`}
      >
        {tool.label ? (
          <span className="font-bold text-lg leading-none">{tool.label}</span>
        ) : (
          <span className="material-symbols-outlined text-[20px]">{tool.icon}</span>
        )}
      </button>
    );
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-[#0f172a] shadow-2xl rounded-[24px] px-4 py-2 flex items-center gap-2 border border-white/5">
        <div className="flex items-center gap-1">
          {leftGroup.map(renderButton)}
        </div>
        
        <div className="w-[1px] h-6 bg-white/10 mx-1" />

        <div className="flex items-center gap-1">
          {rightGroup.map(renderButton)}
        </div>
      </div>
    </div>
  );
};

export default FloatingToolbar;
