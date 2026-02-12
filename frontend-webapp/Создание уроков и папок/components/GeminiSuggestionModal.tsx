
import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Lesson, LessonType } from '../types';

interface GeminiSuggestionModalProps {
  onClose: () => void;
  onAdd: (lesson: Partial<Lesson>) => void;
}

const GeminiSuggestionModal: React.FC<GeminiSuggestionModalProps> = ({ onClose, onAdd }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<Partial<Lesson> | null>(null);

  const getSuggestion = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `I am building a course curriculum. Based on this topic: "${prompt}", suggest a lesson title, a type (FREE, DRIP, LVL2, LVL5, or STANDARD), and an icon (Material Symbol name like 'play_circle', 'description', 'quiz', 'payments').`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              type: { type: Type.STRING },
              icon: { type: Type.STRING }
            },
            required: ["title", "type", "icon"]
          }
        }
      });

      const data = JSON.parse(response.text);
      setSuggestion({
        title: data.title,
        type: data.type as LessonType,
        icon: data.icon
      });
    } catch (error) {
      console.error("AI Error:", error);
      // Fallback
      setSuggestion({
        title: prompt,
        type: 'STANDARD',
        icon: 'description'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Smart Lesson Add</h2>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          
          <p className="text-sm text-slate-500 mb-4 italic">
            Describe what you want to teach, and let AI help structure it.
          </p>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., How to use bots for auto-moderation..."
            className="w-full h-24 bg-slate-100 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary"
          />

          {suggestion ? (
            <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
              <p className="text-[10px] uppercase font-bold text-primary tracking-widest">Suggested Lesson</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">{suggestion.icon}</span>
                  <span className="font-semibold text-sm">{suggestion.title}</span>
                </div>
                <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">{suggestion.type}</span>
              </div>
              <button 
                onClick={() => onAdd(suggestion)}
                className="w-full mt-2 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
              >
                Add to Curriculum
              </button>
            </div>
          ) : (
            <button
              onClick={getSuggestion}
              disabled={loading || !prompt.trim()}
              className="w-full mt-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">refresh</span>
              ) : (
                <span className="material-symbols-outlined">auto_awesome</span>
              )}
              {loading ? 'Analyzing...' : 'Generate Idea'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeminiSuggestionModal;
