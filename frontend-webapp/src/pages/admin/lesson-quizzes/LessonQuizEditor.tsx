import { useEffect, useMemo, useState } from 'react';
import { FileQuestion, Loader2, Plus, Save, Sparkles } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '../../../components/ui/card';
import { InlineAlert } from '../../../components/ui/inline-alert';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { getApiErrorMessage } from '../../../services/apiError';
import { createEmptyQuizForm, createQuizFormFromApi, createQuizQuestion, toLessonQuizPayload } from './quizDefaults';
import { fetchLessonQuiz, generateLessonQuiz, saveLessonQuiz } from './quizEditorApi';
import { QuizQuestionEditor } from './QuizQuestionEditor';
import { validateQuizForm } from './quizValidation';
import type { QuizEditorForm, QuizEditorQuestion } from './quizEditorTypes';

interface LessonQuizEditorProps {
    lessonId?: string;
}

type SaveState = 'idle' | 'saved' | 'generated' | 'error';

const reorderQuestions = (
    questions: QuizEditorQuestion[],
    index: number,
    direction: -1 | 1
) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= questions.length) return questions;

    const nextQuestions = [...questions];
    const [question] = nextQuestions.splice(index, 1);
    nextQuestions.splice(targetIndex, 0, question);
    return nextQuestions.map((item, orderIndex) => ({ ...item, order_index: orderIndex }));
};

export const LessonQuizEditor = ({ lessonId }: LessonQuizEditorProps) => {
    const [form, setForm] = useState<QuizEditorForm>(() => createEmptyQuizForm());
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [showValidation, setShowValidation] = useState(false);

    const isPersistedLesson = Boolean(lessonId && lessonId !== 'new');
    const validation = useMemo(() => validateQuizForm(form), [form]);
    const visibleErrors = showValidation ? validation.errors : [];
    const hasExistingQuestions = form.questions.length > 0;

    useEffect(() => {
        let isActive = true;

        if (!isPersistedLesson || !lessonId) {
            setForm(createEmptyQuizForm());
            setIsLoading(false);
            return () => {
                isActive = false;
            };
        }

        setIsLoading(true);
        setErrorMessage(null);
        fetchLessonQuiz(lessonId)
            .then((quiz) => {
                if (!isActive) return;
                setForm(createQuizFormFromApi(quiz));
                setShowValidation(false);
                setSaveState('idle');
            })
            .catch((error) => {
                if (!isActive) return;
                setErrorMessage(getApiErrorMessage(error, 'Не удалось загрузить тест урока'));
            })
            .finally(() => {
                if (isActive) setIsLoading(false);
            });

        return () => {
            isActive = false;
        };
    }, [isPersistedLesson, lessonId]);

    if (!isPersistedLesson) {
        return (
            <Card className="rounded-lg border-border bg-card shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <FileQuestion className="h-5 w-5 text-primary" />
                        Тест
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Сначала сохраните урок, потом можно добавить проверку знаний.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const updateQuestion = (question: QuizEditorQuestion) => {
        setForm((current) => ({
            ...current,
            questions: current.questions.map((item) => item.clientId === question.clientId ? question : item),
        }));
        setSaveState('idle');
    };

    const addQuestion = () => {
        setForm((current) => ({
            ...current,
            questions: [...current.questions, createQuizQuestion(current.questions.length)],
        }));
        setSaveState('idle');
    };

    const removeQuestion = (question: QuizEditorQuestion) => {
        setForm((current) => ({
            ...current,
            questions: current.questions
                .filter((item) => item.clientId !== question.clientId)
                .map((item, index) => ({ ...item, order_index: index })),
        }));
        setSaveState('idle');
    };

    const moveQuestion = (index: number, direction: -1 | 1) => {
        setForm((current) => ({
            ...current,
            questions: reorderQuestions(current.questions, index, direction),
        }));
        setSaveState('idle');
    };

    const saveQuiz = async () => {
        setShowValidation(true);
        setSaveState('idle');
        setErrorMessage(null);

        if (!validation.isValid || !lessonId) return;

        setIsSaving(true);
        try {
            const savedQuiz = await saveLessonQuiz(lessonId, toLessonQuizPayload(form));
            setForm(createQuizFormFromApi(savedQuiz));
            setShowValidation(false);
            setSaveState('saved');
        } catch (error) {
            setSaveState('error');
            setErrorMessage(getApiErrorMessage(error, 'Не удалось сохранить тест урока'));
        } finally {
            setIsSaving(false);
        }
    };

    const generateQuiz = async () => {
        if (!lessonId) return;

        const replaceExisting = hasExistingQuestions;
        if (replaceExisting) {
            const shouldReplace = window.confirm('В уроке уже есть тест. Заменить его AI-версией?');
            if (!shouldReplace) return;
        }

        setIsGenerating(true);
        setSaveState('idle');
        setErrorMessage(null);
        try {
            const generatedQuiz = await generateLessonQuiz(lessonId, replaceExisting);
            setForm(createQuizFormFromApi(generatedQuiz));
            setShowValidation(false);
            setSaveState('generated');
        } catch (error) {
            setSaveState('error');
            setErrorMessage(getApiErrorMessage(error, 'Не удалось сгенерировать тест урока'));
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Card className="rounded-lg border-border bg-card shadow-sm">
            <CardHeader className="pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                            <FileQuestion className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <CardTitle className="text-lg">Тест</CardTitle>
                            <CardDescription className="text-xs">
                                Ручная проверка знаний после урока.
                            </CardDescription>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-lg text-xs font-bold sm:w-auto"
                        disabled={isLoading || isSaving || isGenerating}
                        onClick={generateQuiz}
                    >
                        {isGenerating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        AI
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-5">
                {isLoading ? (
                    <div className="flex min-h-32 items-center justify-center gap-3 text-sm font-semibold text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin text-primary/50" />
                        Загружаем тест
                    </div>
                ) : (
                    <>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="flex items-start justify-between gap-4 rounded-lg border border-border/70 bg-muted/20 p-4 sm:col-span-3">
                                <div className="min-w-0 space-y-1">
                                    <Label htmlFor="lesson-quiz-enabled" className="text-sm font-semibold">
                                        Показывать тест ученикам
                                    </Label>
                                    <p className="text-xs leading-5 text-muted-foreground">
                                        Тест сохраняется отдельно от текста урока и появляется только после включения.
                                    </p>
                                </div>
                                <Switch
                                    id="lesson-quiz-enabled"
                                    checked={form.is_enabled}
                                    onCheckedChange={(checked) => setForm((current) => ({ ...current, is_enabled: checked }))}
                                    aria-label="Показывать тест ученикам"
                                />
                            </div>

                            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 p-4">
                                <Label htmlFor="lesson-quiz-required" className="text-sm font-semibold">
                                    Обязательный
                                </Label>
                                <Switch
                                    id="lesson-quiz-required"
                                    checked={form.is_required}
                                    onCheckedChange={(checked) => setForm((current) => ({ ...current, is_required: checked }))}
                                    aria-label="Сделать тест обязательным"
                                />
                            </div>

                            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 p-4">
                                <Label htmlFor="lesson-quiz-retries" className="text-sm font-semibold">
                                    Повторные попытки
                                </Label>
                                <Switch
                                    id="lesson-quiz-retries"
                                    checked={form.allow_retries}
                                    onCheckedChange={(checked) => setForm((current) => ({ ...current, allow_retries: checked }))}
                                    aria-label="Разрешить повторные попытки"
                                />
                            </div>

                            <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-4">
                                <Label htmlFor="lesson-quiz-passing-score" className="text-sm font-semibold">
                                    Проходной %
                                </Label>
                                <Input
                                    id="lesson-quiz-passing-score"
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={form.passing_score_percent}
                                    onChange={(event) => {
                                        const value = Number(event.target.value);
                                        setForm((current) => ({
                                            ...current,
                                            passing_score_percent: Number.isFinite(value) ? value : 80,
                                        }));
                                    }}
                                    className="h-10 rounded-lg border-border bg-background"
                                />
                            </div>
                        </div>

                        {visibleErrors.length > 0 && (
                            <InlineAlert
                                variant="error"
                                title="Проверьте тест"
                                description={visibleErrors.join(' ')}
                            />
                        )}

                        {errorMessage && (
                            <InlineAlert
                                variant={saveState === 'error' ? 'error' : 'info'}
                                title={errorMessage}
                                onDismiss={() => setErrorMessage(null)}
                            />
                        )}

                        {saveState === 'saved' && (
                            <InlineAlert
                                variant="success"
                                title="Тест сохранен"
                                description="Изменения попадут ученикам по правилам публикации урока."
                                onDismiss={() => setSaveState('idle')}
                            />
                        )}

                        {saveState === 'generated' && (
                            <InlineAlert
                                variant="success"
                                title="Тест сгенерирован"
                                description="Проверьте вопросы перед публикацией урока."
                                onDismiss={() => setSaveState('idle')}
                            />
                        )}

                        <div className="space-y-3">
                            {form.questions.map((question, index) => (
                                <QuizQuestionEditor
                                    key={question.clientId}
                                    question={question}
                                    index={index}
                                    isFirst={index === 0}
                                    isLast={index === form.questions.length - 1}
                                    onChange={updateQuestion}
                                    onRemove={() => removeQuestion(question)}
                                    onMove={(direction) => moveQuestion(index, direction)}
                                />
                            ))}
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <Button type="button" variant="outline" disabled={isGenerating} onClick={addQuestion} className="h-11 rounded-lg text-xs font-semibold">
                                <Plus className="mr-2 h-4 w-4" />
                                Добавить вопрос
                            </Button>
                            <Button type="button" disabled={isSaving || isGenerating} onClick={saveQuiz} className="h-11 rounded-lg px-6 text-xs font-bold">
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Сохранить тест
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
};
