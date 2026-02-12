
import React from 'react';
import { Course } from '../types';

const ContentView: React.FC = () => {
  const courses: Course[] = [
    { id: '1', title: 'Advanced Quantum Mechanics', author: 'MIT Tech Academy', status: 'Published', isVerified: false, isBanned: false, isShadowBanned: false },
    { id: '2', title: 'UX Research Fundamentals', author: 'Design Systems Global', status: 'Draft', isVerified: true, isBanned: false, isShadowBanned: false },
    { id: '3', title: 'Blockchain Architecture', author: 'Crypto University', status: 'Published', isVerified: false, isBanned: true, isShadowBanned: false },
    { id: '4', title: 'Ethics in AI', author: 'Global Tech Lab', status: 'Draft', isVerified: false, isBanned: false, isShadowBanned: true },
  ];

  return (
    <div className="p-5 space-y-6">
      <header className="sticky top-0 z-40 bg-background-dark/80 ios-blur py-4 -mx-5 px-5">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Super-Admin</p>
            <h1 className="text-3xl font-extrabold tracking-tight font-lexend">Content Control</h1>
          </div>
          <button className="p-2 rounded-full bg-primary/10 text-primary">
            <span className="material-icons-round">tune</span>
          </button>
        </div>
        <div className="relative group">
          <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
          <input className="w-full bg-card-dark border-none rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary shadow-sm transition-all" placeholder="Search courses or schools..." type="text"/>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card-dark p-4 rounded-xl border border-zinc-800">
          <p className="text-xs font-medium text-slate-400">Total Courses</p>
          <p className="text-xl font-bold mt-1">1,284</p>
        </div>
        <div className="bg-card-dark p-4 rounded-xl border border-zinc-800">
          <p className="text-xs font-medium text-slate-400">Flagged Items</p>
          <p className="text-xl font-bold mt-1 text-danger">12</p>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="material-icons-round text-primary text-sm">auto_awesome</span>
            Course Spotlight
          </h2>
          <span className="text-xs text-slate-400 font-medium">All Ecosystems</span>
        </div>
        <div className="space-y-3">
          {courses.map(course => (
            <div key={course.id} className={`bg-card-dark rounded-xl border border-zinc-800 overflow-hidden shadow-sm ${course.isShadowBanned ? 'opacity-80' : ''}`}>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base leading-tight">{course.title}</h3>
                      {course.isVerified && <span className="material-icons-round text-primary text-sm">stars</span>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="material-icons-round text-xs text-slate-400">school</span>
                      <span className="text-xs font-medium text-slate-500">{course.author}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                    course.status === 'Published' ? 'bg-success/10 text-success' : 'bg-zinc-700 text-zinc-400'
                  }`}>
                    {course.status}
                  </span>
                </div>
              </div>
              <div className="flex border-t border-zinc-800 bg-zinc-900/30">
                <button className={`flex-1 py-3 flex items-center justify-center gap-2 font-bold uppercase tracking-wide text-[10px] transition-colors ${
                  course.isVerified ? 'text-amber-500 bg-amber-500/5' : 'text-primary hover:bg-primary/5'
                }`}>
                  <span className="material-icons-round text-lg">stars</span>
                  {course.isVerified ? 'Unverify' : 'Verify'}
                </button>
                <div className="w-[1px] bg-zinc-800"></div>
                <button className={`flex-1 py-3 flex items-center justify-center gap-2 font-bold uppercase tracking-wide text-[10px] transition-colors ${
                  course.isBanned ? 'bg-danger/10 text-danger' : 'text-slate-500 hover:text-danger hover:bg-danger/5'
                }`}>
                  <span className="material-icons-round text-lg">ghost</span>
                  {course.isBanned ? 'Banned' : 'Shadow Ban'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-8">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="material-icons-round text-primary text-sm">business</span>
          Recent School Alerts
        </h2>
        <div className="bg-card-dark rounded-xl border border-zinc-800 p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="material-icons-round text-primary">warning</span>
              </div>
              <div>
                <p className="text-sm font-bold">Unverified School Active</p>
                <p className="text-xs text-slate-500 italic">"Global Tech Lab" has 15 new enrollments</p>
              </div>
            </div>
            <button className="text-primary text-[10px] font-bold uppercase hover:underline">Review</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContentView;
