import { Check, Trash2 } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { cn } from '../../../lib/utils';
import type { QuizEditorOption, QuizQuestionType } from './quizEditorTypes';

interface QuizAnswerOptionEditorProps {
    option: QuizEditorOption;
    index: number;
    questionType: QuizQuestionType;
    canRemove: boolean;
    onChange: (option: QuizEditorOption) => void;
    onRemove: () => void;
    onToggleCorrect: () => void;
}

export const QuizAnswerOptionEditor = ({
    option,
    index,
    questionType,
    canRemove,
    onChange,
    onRemove,
    onToggleCorrect,
}: QuizAnswerOptionEditorProps) => {
    const isShortText = questionType === 'short_text';

    return (
        <div className="flex items-center gap-2">
            {!isShortText && (
                <button
                    type="button"
                    onClick={onToggleCorrect}
                    aria-pressed={option.is_correct}
                    aria-label={`Отметить вариант ${index + 1} правильным`}
                    className={cn(
                        'grid h-10 w-10 shrink-0 place-items-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25',
                        option.is_correct
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted'
                    )}
                >
                    <Check className="h-4 w-4" />
                </button>
            )}
            <Input
                value={option.text}
                onChange={(event) => onChange({ ...option, text: event.target.value })}
                placeholder={isShortText ? `Принимаемый ответ ${index + 1}` : `Вариант ${index + 1}`}
                className="h-10 rounded-lg border-border bg-background text-sm"
            />
            <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={!canRemove}
                onClick={onRemove}
                aria-label={isShortText ? 'Удалить принимаемый ответ' : 'Удалить вариант ответа'}
                className="h-10 w-10 shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
};
