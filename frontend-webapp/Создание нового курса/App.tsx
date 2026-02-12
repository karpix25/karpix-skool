import React, { useState, useRef } from 'react';
import { UnlockType, CourseData } from './types';

const App: React.FC = () => {
  const [courseData, setCourseData] = useState<CourseData>({
    title: '',
    description: '',
    thumbnail: null,
    unlockType: UnlockType.OPEN,
    unlockValue: '1',
    isPublished: false,
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setCourseData(prev => ({ ...prev, [id]: value }));
  };

  const handleThumbnailClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCourseData(prev => ({ ...prev, thumbnail: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const togglePublished = () => {
    setCourseData(prev => ({ ...prev, isPublished: !prev.isPublished }));
  };

  const handleCreate = () => {
    if (!courseData.title) {
      alert("Please provide a title.");
      return;
    }
    console.log("Creating course:", courseData);
    alert("Course Created Successfully!");
  };

  return (
    <div className="min-h-screen max-w-md mx-auto border-x border-border flex flex-col relative bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 ios-blur border-b border-border px-4 py-4 flex items-center justify-between">
        <button className="text-sm font-medium text-muted hover:text-white transition-colors">Cancel</button>
        <h1 className="text-base font-semibold tracking-tight">Add New Course</h1>
        <button 
          onClick={handleCreate}
          className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Create
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-5 py-6 space-y-8 pb-36 overflow-y-auto hide-scrollbar">
        {/* Thumbnail Upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Course Thumbnail</label>
          <div 
            onClick={handleThumbnailClick}
            className={`group relative aspect-video w-full rounded-xl border-2 border-dashed border-border bg-card/40 flex flex-col items-center justify-center gap-3 transition-all hover:bg-card/60 hover:border-primary/50 cursor-pointer overflow-hidden ${courseData.thumbnail ? 'border-none' : ''}`}
          >
            {courseData.thumbnail ? (
              <img src={courseData.thumbnail} className="w-full h-full object-cover" alt="Course Thumbnail" />
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-muted group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-300">Upload Image</p>
                  <p className="text-xs text-muted mt-1">16:9 recommended (Max 5MB)</p>
                </div>
              </>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
          </div>
        </div>

        {/* Title Input */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium leading-none" htmlFor="title">Title</label>
            <span className="text-[10px] tabular-nums text-muted">{courseData.title.length} / 50</span>
          </div>
          <input 
            className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm transition-all placeholder:text-muted disabled:opacity-50"
            id="title"
            value={courseData.title}
            onChange={handleInputChange}
            maxLength={50}
            placeholder="e.g. Master Technical Analysis"
            type="text"
          />
        </div>

        {/* Description Textarea */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium leading-none" htmlFor="description">Description</label>
            <span className="text-[10px] tabular-nums text-muted">{courseData.description.length} / 500</span>
          </div>
          <textarea 
            className="flex min-h-[100px] w-full rounded-md border border-border bg-card px-3 py-2 text-sm transition-all placeholder:text-muted resize-none"
            id="description"
            value={courseData.description}
            onChange={handleInputChange}
            maxLength={500}
            placeholder="Briefly describe what students will learn..."
            rows={4}
          />
        </div>

        {/* Unlock Type Grid */}
        <div className="space-y-3">
          <label className="text-sm font-medium leading-none">Unlock Type</label>
          <div className="grid grid-cols-4 items-center justify-center rounded-lg bg-card p-1 text-muted border border-border">
            {Object.values(UnlockType).map((type) => (
              <button
                key={type}
                onClick={() => setCourseData(prev => ({ ...prev, unlockType: type }))}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  courseData.unlockType === type 
                    ? 'bg-background text-white shadow-sm' 
                    : 'hover:text-white'
                }`}
                type="button"
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Unlock Value Select */}
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none" htmlFor="unlockValue">Unlock Value</label>
          <div className="relative group">
            <select 
              className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm transition-all appearance-none cursor-pointer"
              id="unlockValue"
              value={courseData.unlockValue}
              onChange={handleInputChange}
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
              <span className="material-symbols-outlined text-lg">unfold_more</span>
            </div>
          </div>
          <p className="text-[11px] text-muted">Requirement based on the selected unlock type.</p>
        </div>

        {/* Publishing Status Toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-card/40 p-4">
          <div className="space-y-0.5">
            <label className="text-sm font-medium leading-none" htmlFor="publish-status">Publishing Status</label>
            <p className="text-xs text-muted">Visible to students once published</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              className="sr-only peer"
              id="publish-status"
              type="checkbox"
              checked={courseData.isPublished}
              onChange={togglePublished}
            />
            <div className="w-11 h-6 bg-accent peer-focus:outline-none rounded-full peer peer-checked:bg-primary transition-colors border border-border"></div>
            <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${courseData.isPublished ? 'translate-x-[20px]' : ''}`}></div>
            <span className="sr-only">Toggle Status</span>
          </label>
        </div>
      </main>

      {/* Footer CTA */}
      <footer className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-background/95 ios-blur border-t border-border px-4 pt-4 pb-8 z-50">
        <button 
          onClick={handleCreate}
          className="w-full inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50 bg-primary text-white hover:bg-primary/90 h-11 px-4 py-2 shadow-lg active:scale-[0.98]"
        >
          Create Course
        </button>
        <div className="mt-4 flex justify-center">
          <div className="w-32 h-1.5 bg-accent rounded-full"></div>
        </div>
      </footer>
    </div>
  );
};

export default App;
