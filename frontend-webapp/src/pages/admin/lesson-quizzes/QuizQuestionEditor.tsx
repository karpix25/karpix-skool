import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { createQuizOption } from './quizDefaults';
import { QuizAnswerOptionEditor } from './QuizAnswerOptionEditor';
import type { QuizEditorOption, QuizEditorQuestion, QuizQuestionType } from './quizEditorTypes';

const questionTypeLabels: Record<QuizQuestionType, string> = {
    single_choice: 'Один ответ',
    multiple_choice: 'Несколько ответов',
    short_text: 'Короткий текст',
};

interface QuizQuestionEditorProps {
    question: QuizEditorQuestion;
    index: number;
    isFirst: boolean;
    isLast: boolean;
    onChange: (question: QuizEditorQuestion) => void;
    onRemove: () => void;
    onMove: (direction: -1 | 1) => void;
}

const normalizeOptionsForType = (
    options: QuizEditorOption[],
    questionType: QuizQuestionType
): QuizEditorOption[] => {
    if (questionType === 'short_text') {
        const acceptedAnswers = options.length ? options : [createQuizOption(0, '', true)];
        return acceptedAnswers.map((option, index) => ({
            ...option,
            is_correct: true,
            order_index: index,
        }));
    }

    const nextOptions = options.length ? [...options] : [createQuizOption(0), createQuizOption(1)];
    while (nextOptions.length < 2) {
        nextOptions.push(createQuizOption(nextOptions.length));
    }

    const firstCorrectIndex = nextOptions.findIndex((option) => option.is_correct);

    return nextOptions.map((option, index) => ({
        ...option,
        is_correct: questionType === 'single_choice'
            ? index === (firstCorrectIndex >= 0 ? firstCorrectIndex : 0)
            : option.is_correct,
        order_index: index,
    }));
};

export const QuizQuestionEditor = ({
    question,
    index,
    isFirst,
    isLast,
    onChange,
    onRemove,
    onMove,
}: QuizQuestionEditorProps) => {
    const isShortText = question.question_type === 'short_text';
    const optionLabel = isShortText ? 'Принимаемые ответы' : 'Варианты ответа';

    const updateQuestionType = (questionType: QuizQuestionType) => {
        onChange({
            ...question,
            question_type: questionType,
            options: normalizeOptionsForType(question.options, questionType),
        });
    };

    const updateOption = (option: QuizEditorOption) => {
        onChange({
            ...question,
            options: question.options.map((item) => item.clientId === option.clientId ? option : item),
        });
    };

    const toggleCorrect = (option: QuizEditorOption) => {
        onChange({
            ...question,
            options: question.options.map((item) => ({
                ...item,
                is_correct: question.question_type === 'single_choice'
                    ? item.clientId === option.clientId
                    : item.clientId === option.clientId ? !item.is_correct : item.is_correct,
            })),
        });
    };

    const addOption = () => {
        onChange({
            ...question,
            options: [...question.options, createQuizOption(question.options.length, '', isShortText)],
        });
    };

    const removeOption = (option: QuizEditorOption) => {
        onChange({
            ...question,
            options: question.options
                .filter((item) => item.clientId !== option.clientId)
                .map((item, optionIndex) => ({ ...item, order_index: optionIndex })),
        });
    };

    return (
        <section className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                        Вопрос {index + 1}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                        {questionTypeLabels[question.question_type]}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" disabled={isFirst} onClick={() => onMove(-1)} aria-label="Поднять вопрос" className="h-9 w-9 rounded-lg">
                        <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" disabled={isLast} onClick={() => onMove(1)} aria-label="Опустить вопрос" className="h-9 w-9 rounded-lg">
                        <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="Удалить вопрос" className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                    <div className="space-y-2">
                        <Label className="px-1 text-xs font-medium text-muted-foreground">Текст вопроса</Label>
                        <Textarea
                            value={question.text}
                            onChange={(event) => onChange({ ...question, text: event.target.value })}
                            placeholder="Что должен понять ученик после урока?"
                            className="min-h-24 rounded-lg border-border bg-background text-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="px-1 text-xs font-medium text-muted-foreground">Тип</Label>
                        <Select value={question.question_type} onValueChange={(value) => updateQuestionType(value as QuizQuestionType)}>
                            <SelectTrigger className="bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(questionTypeLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="px-1 text-xs font-medium text-muted-foreground">{optionLabel}</Label>
                    <div className="space-y-2">
                        {question.options.map((option, optionIndex) => (
                            <QuizAnswerOptionEditor
                                key={option.clientId}
                                option={option}
                                index={optionIndex}
                                questionType={question.question_type}
                                canRemove={question.options.length > 1}
                                onChange={updateOption}
                                onRemove={() => removeOption(option)}
                                onToggleCorrect={() => toggleCorrect(option)}
                            />
                        ))}
                    </div>
                    <Button type="button" variant="outline" onClick={addOption} className="h-10 rounded-lg text-xs font-semibold">
                        <Plus className="mr-2 h-4 w-4" />
                        {isShortText ? 'Добавить ответ' : 'Добавить вариант'}
                    </Button>
                </div>

                <div className="space-y-2">
                    <Label className="px-1 text-xs font-medium text-muted-foreground">Пояснение после ответа</Label>
                    <Textarea
                        value={question.explanation || ''}
                        onChange={(event) => onChange({ ...question, explanation: event.target.value })}
                        placeholder="Почему этот ответ правильный"
                        className="min-h-20 rounded-lg border-border bg-background text-sm"
                    />
                </div>
            </div>
        </section>
    );
};
