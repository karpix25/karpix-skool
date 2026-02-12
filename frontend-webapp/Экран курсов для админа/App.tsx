
import React, { useState, useMemo } from 'react';
import { INITIAL_COURSES } from './constants';
import { Course, CourseStatus, FilterType } from './types';
import CourseCard from './components/CourseCard';
import { BottomNav } from './components/BottomNav';
import { generateCourseSuggestion } from './services/geminiService';

const App: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [activeTab, setActiveTab] = useState('courses');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const filters: FilterType[] = ['All', CourseStatus.PUBLISHED, CourseStatus.DRAFT, CourseStatus.ARCHIVED];

  const handleStatusToggle = (id: string) => {
    setCourses(prev => prev.map(course => {
      if (course.id === id) {
        return {
          ...course,
          status: course.status === CourseStatus.PUBLISHED ? CourseStatus.DRAFT : CourseStatus.PUBLISHED
        };
      }
      return course;
    }));
  };

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            course.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'All' || course.status === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [courses, searchQuery, activeFilter]);

  const handleAddCourse = async () => {
    setIsAiLoading(true);
    const suggestion = await generateCourseSuggestion(searchQuery || "Modern Tech Skills");
    
    if (suggestion) {
      const newCourse: Course = {
        id: Date.now().toString(),
        title: suggestion.title,
        description: suggestion.description,
        modules: suggestion.suggestedModules,
        status: CourseStatus.DRAFT,
        imageUrl: `https://picsum.photos/seed/${Math.random()}/800/450`
      };
      setCourses(prev => [newCourse, ...prev]);
    } else {
      const fallback: Course = {
        id: Date.now().toString(),
        title: "New Curriculum Item",
        description: "Freshly added course content awaiting detailed curriculum.",
        modules: 0,
        status: CourseStatus.DRAFT,
        imageUrl: `https://picsum.photos/seed/${Math.random()}/800/450`
      };
      setCourses(prev => [fallback, ...prev]);
    }
    setIsAiLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background-light/80 dark:bg-background-dark/80 ios-blur border-b border-slate-200 dark:border-slate-800 px-5 pt-7 pb-5">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
          <button 
            onClick={handleAddCourse}
            disabled={isAiLoading}
            className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-lg leading-none">
              {isAiLoading ? 'sync' : 'add'}
            </span>
            {isAiLoading ? 'Thinking...' : 'Add Course'}
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl transition-colors group-focus-within:text-primary">
            search
          </span>
          <input 
            type="text"
            className="w-full bg-slate-200/50 dark:bg-slate-800/50 border-none rounded-2xl py-3.5 pl-11 pr-5 text-[15px] focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all font-medium"
            placeholder="Search your curriculum..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      {/* Filters Bar */}
      <div className="px-5 py-4 flex gap-2.5 overflow-x-auto no-scrollbar scroll-smooth">
        {filters.map((filter) => (
          <button 
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activeFilter === filter 
                ? 'bg-primary text-white shadow-md shadow-primary/20' 
                : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {filter === 'All' ? 'All Courses' : filter}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <main className="flex-1 px-5 pb-32 space-y-5">
        {activeTab === 'courses' ? (
          filteredCourses.length > 0 ? (
            filteredCourses.map(course => (
              <CourseCard 
                key={course.id} 
                course={course} 
                onStatusToggle={handleStatusToggle} 
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-full mb-4">
                <span className="material-symbols-outlined text-4xl text-slate-400">inventory_2</span>
              </div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">No courses found</h3>
              <p className="text-sm text-slate-500 max-w-[200px] mt-1">Try adjusting your search or filters to find what you're looking for.</p>
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-64 text-slate-400 font-medium">
            This section is under development.
          </div>
        )}
      </main>

      {/* Footer Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default App;
