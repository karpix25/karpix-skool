import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    X,
    Sparkles,
    RefreshCcw,
    ChevronRight
} from 'lucide-react';

export type LessonType = 'FREE' | 'LVL2' | 'DRIP' | 'LVL5' | 'STANDARD';

interface GeminiSuggestionModalProps {
    onClose: () => void;
    onAdd: (lesson: { title: string; type: LessonType; icon: string }) => void;
}

const GeminiSuggestionModal: React.FC<GeminiSuggestionModalProps> = ({ onClose, onAdd }) => {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestion, setSuggestion] = useState<{ title: string; type: LessonType; icon: string } | null>(null);

    const getSuggestion = async () => {
        if (!prompt.trim()) return;
        setLoading(true);

        try {
            const apiKey = (window as any).GOOGLE_API_KEY || "";
            if (!apiKey) {
                // Fallback for demo/safety if no key
                setTimeout(() => {
                    setSuggestion({
                        title: prompt,
                        type: 'STANDARD',
                        icon: 'description'
                    });
                    setLoading(false);
                }, 1000);
                return;
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const result = await model.generateContent(`I am building a course curriculum. Based on this topic: "${prompt}", suggest a lesson title, a type (FREE, DRIP, LVL2, LVL5, or STANDARD), and an icon (Material Symbol name like 'play_circle', 'description', 'quiz', 'payments'). Return valid JSON with keys: title, type, icon.`);
            const response = await result.response;
            const text = response.text();

            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(cleanText);

            setSuggestion({
                title: data.title,
                type: data.type as LessonType,
                icon: data.icon
            });
        } catch (error) {
            console.error("AI Error:", error);
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
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-[#101622] w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-500 border border-white/10 text-slate-100">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                <Sparkles size={18} />
                            </div>
                            <h2 className="text-xl font-black uppercase tracking-widest text-foreground">Smart Lesson</h2>
                        </div>
                        <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-full transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    <p className="text-xs text-muted-foreground mb-6 font-medium leading-relaxed opacity-60">
                        Describe what you want to teach, and let AI help structure it within your curriculum.
                    </p>

                    <div className="relative group">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., How to use bots for auto-moderation..."
                            className="w-full h-32 bg-[#161e2d] border border-white/5 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all resize-none placeholder:text-muted-foreground/30 text-slate-100"
                        />
                        <div className="absolute bottom-4 right-4 text-[10px] font-bold text-muted-foreground/30 group-focus-within:text-primary/40 transition-colors">
                            ENTER TO SUGGEST
                        </div>
                    </div>

                    {suggestion ? (
                        <div className="mt-8 p-5 bg-primary/5 border border-primary/20 rounded-2xl space-y-4 animate-in zoom-in-95 duration-300">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Generated Idea</span>
                                <span className="text-[10px] font-black bg-primary/10 text-primary px-2.5 py-1 rounded-lg border border-primary/20">{suggestion.type}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary shadow-inner">
                                    <span className="material-symbols-outlined">{suggestion.icon}</span>
                                </div>
                                <span className="font-bold text-base leading-tight">{suggestion.title}</span>
                            </div>
                            <button
                                onClick={() => onAdd(suggestion)}
                                className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[12px] shadow-xl shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                Add to Curriculum
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={getSuggestion}
                            disabled={loading || !prompt.trim()}
                            className="w-full mt-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-[0.2em] text-[12px] disabled:opacity-30 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                        >
                            {loading ? (
                                <RefreshCcw size={18} className="animate-spin" />
                            ) : (
                                <Sparkles size={18} />
                            )}
                            {loading ? 'Analyzing Content...' : 'Generate Suggestion'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GeminiSuggestionModal;
