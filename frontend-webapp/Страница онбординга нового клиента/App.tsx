
import React, { useState } from 'react';
import { SchoolData, AIResponse, AppState } from './types';
import { generateSchoolRoadmap } from './services/geminiService';
import BenefitCard from './components/BenefitCard';

const App: React.FC = () => {
  const [view, setView] = useState<AppState>(AppState.FORM);
  const [schoolData, setSchoolData] = useState<SchoolData>({ name: '', teachingGoal: '' });
  const [aiResult, setAiResult] = useState<AIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolData.name || !schoolData.teachingGoal) return;

    setIsLoading(true);
    setView(AppState.LOADING);
    setError(null);

    try {
      const result = await generateSchoolRoadmap(schoolData);
      setAiResult(result);
      setView(AppState.RESULT);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while launching your school. Please try again.");
      setView(AppState.FORM);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setView(AppState.FORM);
    setSchoolData({ name: '', teachingGoal: '' });
    setAiResult(null);
  };

  if (view === AppState.LOADING) {
    return (
      <div className="min-h-screen bg-skool-navy flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 border-4 border-skool-blue/20 border-t-skool-blue rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-bold mb-2">Analyzing Your Vision</h2>
        <p className="text-slate-400 max-w-xs animate-pulse">
          Generating a personalized roadmap for <span className="text-white font-medium">{schoolData.name}</span>...
        </p>
      </div>
    );
  }

  if (view === AppState.RESULT && aiResult) {
    return (
      <div className="min-h-screen bg-skool-navy p-6 md:p-12 flex flex-col items-center max-w-2xl mx-auto">
        <header className="w-full flex justify-between items-center mb-10">
          <button onClick={handleReset} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 active:scale-95 transition-transform">
            <span className="material-icons text-white/70">arrow_back</span>
          </button>
          <div className="text-[10px] font-bold tracking-widest uppercase text-skool-blue bg-skool-blue/10 px-3 py-1.5 rounded-full">
            Success Roadmap
          </div>
        </header>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-4">You're ready to launch!</h1>
          <p className="text-slate-400 leading-relaxed italic">"{aiResult.successMessage}"</p>
        </div>

        <div className="space-y-6 w-full mb-12">
          {aiResult.curriculum.map((step, idx) => (
            <div key={idx} className="benefit-card p-6 rounded-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl font-bold">0{idx + 1}</div>
               <h3 className="text-lg font-bold text-skool-blue mb-2">{step.title}</h3>
               <p className="text-sm text-slate-300 mb-4">{step.description}</p>
               <ul className="space-y-2">
                 {step.tasks.map((task, tIdx) => (
                   <li key={tIdx} className="flex items-start gap-3 text-xs text-slate-400">
                     <span className="material-icons text-[16px] text-emerald-500 mt-0.5">check_circle</span>
                     {task}
                   </li>
                 ))}
               </ul>
            </div>
          ))}
        </div>

        <button 
          onClick={handleReset}
          className="w-full bg-skool-blue hover:bg-skool-blue/90 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-skool-blue/20 flex items-center justify-center gap-2"
        >
          Create Another School
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto w-full">
      <header className="p-4 flex justify-end items-center z-10 sticky top-0 bg-skool-navy/80 backdrop-blur-sm">
        <div className="text-[10px] font-bold tracking-widest uppercase text-skool-blue bg-skool-blue/10 px-3 py-1.5 rounded-full">
          Author Access
        </div>
      </header>

      <main className="flex-1 px-6 pb-12 flex flex-col z-10">
        <div className="relative w-full aspect-square max-h-[240px] mb-8 flex items-center justify-center">
          <div className="w-full h-full bg-white/5 rounded-3xl flex items-center justify-center overflow-hidden border border-white/5 relative">
            <img 
              alt="3D Rocket Launching" 
              className="w-40 h-40 object-contain drop-shadow-2xl" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhlBWjn58cn_jKxb97B05v7A3tH_kL4wGk907R61U7nyqpHD7UCn6KokUNwyaw0lUN4Sliij1as7fEDOGvjdDhC-SBrTSDx5dBMvHgjn_2n_6-itTFUmwh5i0IqCVGlDq4r2XMn2hJ02UfbTjY54YCsgBRhaaHmeA7oeS3JBrkXmqANAIWzihZWagFPIfyOcoJ7CYigS7N2w_0mCyt6NK7aFDgiaaNPZOs1aJjd2ZDs9IPSHKvuNd4OzoXeOpzzCSjnouNSQ2kxwi-"
            />
          </div>
        </div>

        <div className="space-y-3 mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Launch Your School
          </h1>
          <p className="text-slate-400 leading-relaxed text-sm">
            Turn your expertise into a thriving community. Everything you need to build, engage, and scale.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 mb-10">
          <BenefitCard 
            icon="school" 
            iconColor="bg-skool-blue/10 text-skool-blue" 
            title="Создание курсов" 
            subtitle="Structured learning paths" 
          />
          <BenefitCard 
            icon="forum" 
            iconColor="bg-emerald-500/10 text-emerald-500" 
            title="Вовлечение студентов" 
            subtitle="Active community discussions" 
          />
          <BenefitCard 
            icon="military_tech" 
            iconColor="bg-amber-500/10 text-amber-500" 
            title="Геймификация" 
            subtitle="Leaderboards and rewards" 
          />
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-slate-400 ml-1" htmlFor="school-name">School Name</label>
            <input 
              required
              value={schoolData.name}
              onChange={(e) => setSchoolData(prev => ({ ...prev, name: e.target.value }))}
              className="ios-input w-full rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 transition-all border-white/10" 
              id="school-name" 
              placeholder="e.g., Trading Academy" 
              type="text"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-slate-400 ml-1" htmlFor="teaching-desc">What will you teach?</label>
            <textarea 
              required
              value={schoolData.teachingGoal}
              onChange={(e) => setSchoolData(prev => ({ ...prev, teachingGoal: e.target.value }))}
              className="ios-input w-full rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 transition-all resize-none border-white/10" 
              id="teaching-desc" 
              placeholder="Describe your courses..." 
              rows={3}
            ></textarea>
          </div>
          <div className="pt-2">
            <button 
              disabled={isLoading}
              className="w-full bg-skool-blue hover:bg-skool-blue/90 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-skool-blue/20 flex items-center justify-center gap-2" 
              type="submit"
            >
              <span>{isLoading ? 'Processing...' : 'Submit Application'}</span>
              {!isLoading && <span className="material-icons text-sm">arrow_forward</span>}
            </button>
            <p className="text-center text-[10px] text-slate-500 mt-4 uppercase tracking-[0.1em] font-bold">
              Professional Onboarding
            </p>
          </div>
        </form>
      </main>

      <div className="pb-4 mt-auto">
        <div className="w-32 h-1 bg-white/10 rounded-full mx-auto"></div>
      </div>
    </div>
  );
};

export default App;
