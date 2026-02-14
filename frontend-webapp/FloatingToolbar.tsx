
import React, { useState } from 'react';

interface FloatingToolbarProps {
  onCommand: (command: string) => void;
  activeCommands?: string[];
}

type ToolbarTab = 'style' | 'insert' | 'media';

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ onCommand, activeCommands = [] }) => {
  const [activeTab, setActiveTab] = useState<ToolbarTab>('style');

  const tabs: { id: ToolbarTab; icon: string; label: string }[] = [
    { id: 'style', icon: 'format_size', label: 'Style' },
    { id: 'insert', icon: 'view_quilt', label: 'Blocks' },
    { id: 'media', icon: 'add_circle', label: 'Media' },
  ];

  const allGroups = [
    {
      id: 'style',
      tools: [
        { label: 'H1', command: 'h1', icon: '', tooltip: 'Heading 1' },
        { label: 'H2', command: 'h2', icon: '', tooltip: 'Heading 2' },
        { label: 'H3', command: 'h3', icon: '', tooltip: 'Heading 3' },
        { label: 'B', command: 'bold', icon: '', tooltip: 'Bold (Ctrl+B)' },
        { label: 'I', command: 'italic', icon: '', tooltip: 'Italic (Ctrl+I)' },
        { label: '', command: 'strikeThrough', icon: 'strikethrough_s', tooltip: 'Strikethrough' },
        { label: '', command: 'code', icon: 'code', tooltip: 'Inline Code' },
      ]
    },
    {
      id: 'insert',
      tools: [
        { label: '', command: 'insertUnorderedList', icon: 'format_list_bulleted', tooltip: 'Bullet List' },
        { label: '', command: 'insertOrderedList', icon: 'format_list_numbered', tooltip: 'Numbered List' },
        { label: '', command: 'blockquote', icon: 'format_quote', tooltip: 'Quote' },
        { label: '', command: 'formatBlock:pre', icon: 'terminal', tooltip: 'Code Block' },
        { label: '', command: 'insertHorizontalRule', icon: 'horizontal_rule', tooltip: 'Divider' },
      ]
    },
    {
      id: 'media',
      tools: [
        { label: '', command: 'insertImage', icon: 'image', tooltip: 'Image' },
        { label: '', command: 'createLink', icon: 'link', tooltip: 'Link (Ctrl+K)' },
        { label: '', command: 'insertVideo', icon: 'smart_display', tooltip: 'Video' },
      ]
    }
  ];

  const renderButton = (tool: { label: string; command: string; icon: string; tooltip?: string }) => {
    const isActive = activeCommands.includes(tool.command);
    return (
      <button
        key={tool.command}
        onClick={() => onCommand(tool.command)}
        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-90 shrink-0 group relative ${
          isActive 
            ? 'text-blue-500 bg-blue-500/15' 
            : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
        }`}
        title={tool.tooltip}
      >
        {tool.label ? (
          <span className="font-bold text-xs tracking-tighter">{tool.label}</span>
        ) : (
          <span className="material-symbols-outlined text-[20px]">{tool.icon}</span>
        )}
        
        {/* Simple CSS Tooltip for Desktop */}
        <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[60]">
          {tool.tooltip}
        </span>
      </button>
    );
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 w-full sm:w-auto">
      {/* Mobile: Tabbed View */}
      <div className="sm:hidden bg-white/80 dark:bg-[#0f172a]/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[24px] border border-slate-200 dark:border-white/10 p-1.5 flex items-center overflow-hidden">
        <div className="flex bg-slate-100 dark:bg-white/5 rounded-[18px] p-1 mr-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-300 shrink-0 ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            </button>
          ))}
        </div>
        <div className="w-[1px] h-6 bg-slate-200 dark:bg-white/10 mr-2" />
        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
          {allGroups.find(g => g.id === activeTab)?.tools.map(renderButton)}
        </div>
      </div>

      {/* Desktop: Full Row View */}
      <div className="hidden sm:flex bg-white/80 dark:bg-[#0f172a]/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[24px] border border-slate-200 dark:border-white/10 p-1.5 items-center gap-1">
        {allGroups.map((group, gIdx) => (
          <React.Fragment key={group.id}>
            <div className="flex items-center gap-1 px-1">
              {group.tools.map(renderButton)}
            </div>
            {gIdx < allGroups.length - 1 && (
              <div className="w-[1px] h-6 bg-slate-200 dark:bg-white/10 mx-1" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default FloatingToolbar;
