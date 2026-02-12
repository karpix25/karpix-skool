
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Header from './components/Header';
import FloatingToolbar from './components/FloatingToolbar';
import { LessonContent } from './types';

const App: React.FC = () => {
  const [content, setContent] = useState<LessonContent>({
    title: "Introduction to Growth Loops",
    body: `
      <p>Growth loops are self-reinforcing cycles where the output of one cycle becomes the input for the next. Unlike traditional funnels which have a clear beginning and end, loops are designed to generate sustainable, compounding growth.</p>
      <p>In this lesson, we will cover:</p>
      <ul class="list-disc ml-4 space-y-2">
        <li>The difference between Funnels and Loops</li>
        <li>Acquisition vs. Retention Loops</li>
        <li>Case studies of high-growth communities</li>
      </ul>
      <p>The core philosophy behind loops is that they don't just "leak" users at the bottom. Instead, every new user acquired should theoretically help acquire more users.</p>
    `
  });

  const [activeCommands, setActiveCommands] = useState<string[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const isInitialRender = useRef(true);

  // Auto-resize title but limit to 2 lines
  useEffect(() => {
    if (titleRef.current) {
      const el = titleRef.current;
      el.style.height = 'auto';
      
      // Calculate max height for 2 lines based on computed line height
      const style = window.getComputedStyle(el);
      const lineHeight = parseFloat(style.lineHeight);
      const maxHeight = lineHeight * 2;
      
      // Apply height capped at 2 lines
      const newHeight = Math.min(el.scrollHeight, maxHeight);
      el.style.height = `${newHeight}px`;
    }
  }, [content.title]);

  useEffect(() => {
    if (isInitialRender.current && bodyRef.current) {
      bodyRef.current.innerHTML = content.body;
      isInitialRender.current = false;
    }
  }, []);

  const updateActiveStates = useCallback(() => {
    const states = [];
    if (document.queryCommandState('bold')) states.push('bold');
    if (document.queryCommandState('italic')) states.push('italic');
    setActiveCommands(states);
  }, []);

  const handleBodyChange = useCallback(() => {
    if (bodyRef.current) {
      const newHtml = bodyRef.current.innerHTML;
      setContent(prev => ({ ...prev, body: newHtml }));
      updateActiveStates();
    }
  }, [updateActiveStates]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    // Count existing newlines to prevent more than one (max 2 visual segments via Enter)
    const newlineCount = (value.match(/\n/g) || []).length;
    
    if (newlineCount < 2) {
      setContent(prev => ({ ...prev, title: value }));
    }
  };

  const handleCommand = (command: string) => {
    if (command === 'createLink') {
      const url = prompt("Enter the URL:");
      if (url) document.execCommand(command, false, url);
    } else if (command === 'insertImage') {
      const url = prompt("Enter image URL:");
      if (url) document.execCommand(command, false, url);
    } else if (command === 'h2') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const parent = selection.anchorNode?.parentElement;
        if (parent?.tagName === 'H2') {
          document.execCommand('formatBlock', false, 'p');
        } else {
          document.execCommand('formatBlock', false, 'h2');
        }
      }
    } else if (command.startsWith('formatBlock:')) {
      const tag = command.split(':')[1];
      document.execCommand('formatBlock', false, tag);
    } else {
      document.execCommand(command, false, undefined);
    }
    
    bodyRef.current?.focus();
    handleBodyChange();
  };

  const handlePublish = () => {
    alert(`Publishing "${content.title}"...`);
  };

  const handlePreview = () => {
    alert("Preview mode activated.");
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-accent/20">
      <Header 
        title={content.title} 
        onPublish={handlePublish} 
        onPreview={handlePreview} 
      />

      <main className="flex-1 overflow-y-auto hide-scrollbar" onClick={() => updateActiveStates()}>
        <div className="max-w-[700px] mx-auto px-6 pt-16 pb-40">
          <article className="min-h-[70vh] flex flex-col">
            <div className="mb-12">
              <textarea
                ref={titleRef}
                className="w-full text-5xl font-extrabold border-none focus:ring-0 p-0 bg-transparent placeholder:text-slate-200 dark:placeholder:text-slate-800 tracking-tight leading-[1.2] resize-none overflow-hidden block"
                placeholder="Untitled Lesson"
                rows={1}
                value={content.title}
                onChange={handleTitleChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const newlineCount = (content.title.match(/\n/g) || []).length;
                    if (newlineCount >= 1) {
                      e.preventDefault();
                    }
                  }
                }}
              />
            </div>

            <div
              ref={bodyRef}
              className="flex-1 text-lg leading-relaxed text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-0 prose prose-slate dark:prose-invert max-w-none min-h-[400px]"
              contentEditable
              suppressContentEditableWarning={true}
              onInput={handleBodyChange}
              onKeyUp={updateActiveStates}
              onMouseUp={updateActiveStates}
              spellCheck={false}
            />

            <div className="mt-16 flex items-center justify-end pt-8">
              <div className="flex items-center gap-2 text-slate-300 dark:text-slate-700 select-none">
                <span className="material-symbols-outlined text-[16px]">cloud_done</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold">Saved</span>
              </div>
            </div>
          </article>
        </div>
      </main>

      <FloatingToolbar onCommand={handleCommand} activeCommands={activeCommands} />
    </div>
  );
};

export default App;
