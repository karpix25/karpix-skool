import React, { useState } from 'react';
import {
    X,
    Sparkles,
    RefreshCcw,
    ChevronRight
} from 'lucide-react';

import api from '../../../api/client';

export type LessonType = 'FREE' | 'LVL2' | 'DRIP' | 'LVL5' | 'STANDARD';

interface GeminiSuggestionModalProps {
    onClose: () => void;
    onAdd: (lesson: { title: string; type: LessonType; icon: string }) => void;
}

interface LessonSuggestion {
    title?: string;
    type?: LessonType;
    icon?: string;
}

interface BackendAIResponse {
    text?: string;
}

const fallbackSuggestion = (prompt: string) => ({
    title: prompt,
    type: 'STANDARD' as LessonType,
    icon: 'description',
});

const parseLessonSuggestion = (text: string, prompt: string) => {
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanText) as LessonSuggestion;
    return {
        title: data.title || prompt,
        type: data.type || 'STANDARD',
        icon: data.icon || 'description',
    };
};

const GeminiSuggestionModal: React.FC<GeminiSuggestionModalProps> = ({ onClose, onAdd }) => {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestion, setSuggestion] = useState<{ title: string; type: LessonType; icon: string } | null>(null);

    const getSuggestion = async () => {
        if (!prompt.trim()) return;
        setLoading(true);

        try {
            const result = await api.post<BackendAIResponse>('/ai/generate-suggestion', {
                prompt: `Topic: "${prompt}". Return valid JSON with keys: title, type, icon.`,
                system_instruction: 'Suggest one course lesson. type must be FREE, DRIP, LVL2, LVL5, or STANDARD. icon must be a Material Symbol name. Return JSON only.',
            });
            setSuggestion(parseLessonSuggestion(result.data.text || '', prompt));
        } catch (error) {
            console.error("AI Error:", error);
            setSuggestion(fallbackSuggestion(prompt));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-foreground/35 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-card w-full max-w-md rounded-2xl overflow-hidden shadow-md animate-in slide-in-from-bottom-10 duration-500 border border-border text-foreground">
                <div className="p-6 sm:p-8">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                <Sparkles size={18} />
                            </div>
                            <h2 className="text-xl font-semibold text-foreground">Smart Lesson</h2>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Закрыть окно подсказки"
                            className="min-h-11 min-w-11 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
                        >
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
                            className="w-full h-32 bg-muted/20 border border-border rounded-lg p-4 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all resize-none placeholder:text-muted-foreground/50 text-foreground"
                        />
                        <div className="absolute bottom-4 right-4 text-[10px] font-bold text-muted-foreground/30 group-focus-within:text-primary/40 transition-colors">
                            ENTER TO SUGGEST
                        </div>
                    </div>

                    {suggestion ? (
                        <div className="mt-8 p-5 bg-primary/5 border border-primary/20 rounded-lg space-y-4 animate-in zoom-in-95 duration-300">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-primary">Generated Idea</span>
                                <span className="text-[10px] font-black bg-primary/10 text-primary px-2.5 py-1 rounded-md border border-primary/20">{suggestion.type}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined">{suggestion.icon}</span>
                                </div>
                                <span className="font-bold text-base leading-tight">{suggestion.title}</span>
                            </div>
                            <button
                                onClick={() => onAdd(suggestion)}
                                className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-bold text-[12px] shadow-sm hover:bg-primary/90 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                            >
                                Add to Curriculum
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={getSuggestion}
                            disabled={loading || !prompt.trim()}
                            className="w-full mt-8 py-3 bg-primary text-primary-foreground rounded-lg font-bold text-[12px] disabled:opacity-30 transition-all flex items-center justify-center gap-3 active:scale-[0.99]"
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
