
import React from 'react';
import { Course, CourseStatus } from '../types';

interface CourseCardProps {
  course: Course;
  onStatusToggle: (id: string) => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, onStatusToggle }) => {
  const isDraft = course.status === CourseStatus.DRAFT;
  const isArchived = course.status === CourseStatus.ARCHIVED;
  const isPublished = course.status === CourseStatus.PUBLISHED;

  return (
    <div 
      className={`bg-white dark:bg-card-dark rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 transition-all duration-300 ${isArchived ? 'opacity-60 grayscale' : 'opacity-100'}`}
    >
      <div className="aspect-video w-full bg-slate-200 dark:bg-slate-700 relative overflow-hidden group">
        <img 
          className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${isDraft ? 'opacity-70' : 'opacity-100'}`} 
          src={course.imageUrl} 
          alt={course.title}
        />
        
        <div className="absolute top-4 right-4">
          <button className="bg-black/40 hover:bg-black/60 text-white p-2 rounded-full ios-blur transition-colors border border-white/10">
            <span className="material-symbols-outlined text-xl">more_vert</span>
          </button>
        </div>

        {isDraft && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="bg-black/60 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-md border border-white/20 shadow-2xl">
              Draft
            </span>
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-xl leading-tight tracking-tight text-slate-900 dark:text-white">
            {course.title}
          </h3>
          <span className="text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            {course.modules} Modules
          </span>
        </div>
        
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2 leading-relaxed">
          {course.description}
        </p>

        {/* Status Bar: Fixed alignment and visual clarity */}
        <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl px-4 py-3.5 flex items-center justify-between border border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">
              STATUS:
            </span>
            <span className={`text-[10px] font-black uppercase tracking-[0.15em] transition-colors duration-300 ${isPublished ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`}>
              {course.status}
            </span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer group">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={isPublished}
              onChange={() => onStatusToggle(course.id)}
            />
            {/* Toggle Track */}
            <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:bg-primary transition-all duration-300 ease-in-out"></div>
            {/* Toggle Handle */}
            <div className="absolute left-[3px] top-[3px] bg-white w-4.5 h-4.5 rounded-full transition-all duration-300 ease-in-out shadow-sm peer-checked:translate-x-5 peer-active:scale-90"></div>
          </label>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
