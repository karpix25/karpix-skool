
import React, { useState, useCallback } from 'react';
import { Module, Lesson, NavigationTab } from './types';
import Header from './components/Header';
import ModuleItem from './components/ModuleItem';
import AddModuleButton from './components/AddModuleButton';
import BottomNav from './components/BottomNav';
import GeminiSuggestionModal from './components/GeminiSuggestionModal';

const INITIAL_MODULES: Module[] = [
  {
    id: 'm1',
    title: 'Introduction & Basics',
    lessons: [
      { id: 'l1', title: 'Welcome to the Course', type: 'FREE', icon: 'play_circle' },
      { id: 'l2', title: 'Course Roadmap', type: 'STANDARD', icon: 'description' },
    ]
  },
  {
    id: 'm2',
    title: 'Advanced Community Growth',
    isActive: true,
    lessons: [
      { id: 'l3', title: 'Setting up your Channel', type: 'FREE', icon: 'play_circle' },
      { id: 'l4', title: 'The Secret Hook Strategy', type: 'LVL2', icon: 'description', isGhost: true },
      { id: 'l5', title: 'Growth Metrics Quiz', type: 'DRIP', icon: 'quiz' },
      { id: 'l6', title: 'Final Conclusion', type: 'LVL5', icon: 'play_circle' },
    ]
  },
  {
    id: 'm3',
    title: 'Monetization Engine',
    lessons: [
      { id: 'l7', title: 'Ads & Sponsorships', type: 'STANDARD', icon: 'payments' },
    ]
  }
];

const App: React.FC = () => {
  const [modules, setModules] = useState<Module[]>(INITIAL_MODULES);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>('m2');
  const [activeTab, setActiveTab] = useState<NavigationTab>(NavigationTab.COURSES);
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [targetModuleId, setTargetModuleId] = useState<string | null>(null);

  const toggleModule = (id: string) => {
    setExpandedModuleId(prev => (prev === id ? null : id));
  };

  const handleAddLessonRequest = (moduleId: string) => {
    setTargetModuleId(moduleId);
    setIsSuggestionModalOpen(true);
  };

  const handleAddModule = () => {
    const newModule: Module = {
      id: `m${Date.now()}`,
      title: 'New Module',
      lessons: []
    };
    setModules(prev => [...prev, newModule]);
    setExpandedModuleId(newModule.id);
  };

  const onLessonAdded = (moduleId: string, lesson: Partial<Lesson>) => {
    setModules(prev => prev.map(m => {
      if (m.id === moduleId) {
        return {
          ...m,
          lessons: [...m.lessons, {
            id: `l${Date.now()}`,
            title: lesson.title || 'Untitled Lesson',
            type: lesson.type || 'STANDARD',
            icon: lesson.icon || 'description'
          }]
        };
      }
      return m;
    }));
    setIsSuggestionModalOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen pb-32">
      <Header title="Telegram Mastery 101" />

      <main className="flex-1 px-4 py-4 space-y-3">
        {modules.map((module) => (
          <ModuleItem
            key={module.id}
            module={module}
            isExpanded={expandedModuleId === module.id}
            onToggle={() => toggleModule(module.id)}
            onAddLesson={() => handleAddLessonRequest(module.id)}
          />
        ))}

        <AddModuleButton onClick={handleAddModule} />
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {isSuggestionModalOpen && targetModuleId && (
        <GeminiSuggestionModal
          onClose={() => setIsSuggestionModalOpen(false)}
          onAdd={(lesson) => onLessonAdded(targetModuleId, lesson)}
        />
      )}
    </div>
  );
};

export default App;
