import { useState } from 'react';
import { Check, Copy, Loader2, Plus } from 'lucide-react';

import { Button } from '../../../../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../../../components/ui/dialog';
import { InlineAlert } from '../../../../components/ui/inline-alert';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { copyTextToClipboard } from '../../../../lib/shareLinks';
import { TENANTS_CHANGED_EVENT } from './events';
import { useSchoolInvite } from './useSchoolInvite';

interface SchoolInviteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const SchoolInviteDialog = ({ open, onOpenChange }: SchoolInviteDialogProps) => {
    const [name, setName] = useState('');
    const [nameTouched, setNameTouched] = useState(false);
    const [copyState, setCopyState] = useState<'idle' | 'copied' | 'manual'>('idle');
    const { result, isCreating, error, createInvite, reset } = useSchoolInvite();
    const nameError = nameTouched && name.trim().length < 2
        ? 'Введите название школы — минимум 2 символа.'
        : null;

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setName('');
            setNameTouched(false);
            setCopyState('idle');
            reset();
        }
        onOpenChange(nextOpen);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setNameTouched(true);
        if (name.trim().length < 2) return;

        const invite = await createInvite(name.trim());
        if (invite) window.dispatchEvent(new CustomEvent(TENANTS_CHANGED_EVENT));
    };

    const handleCopy = async () => {
        if (!result) return;
        setCopyState(await copyTextToClipboard(result.setup_command));
    };

    const expiresAt = result
        ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })
            .format(new Date(result.setup_token_expires_at))
        : null;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                {!result ? (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <DialogHeader>
                            <DialogTitle>Новая школа</DialogTitle>
                            <DialogDescription>
                                Создайте пустую школу, затем лично передайте команду будущему владельцу.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-2">
                            <Label htmlFor="school-name">Название школы</Label>
                            <Input
                                id="school-name"
                                autoFocus
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                onBlur={() => setNameTouched(true)}
                                aria-invalid={Boolean(nameError)}
                                aria-describedby="school-name-help"
                                placeholder="Например, Школа ремонта"
                                disabled={isCreating}
                            />
                            <p id="school-name-help" className="min-h-5 text-xs text-muted-foreground">
                                {nameError || 'Владелец подключится позже через одноразовую команду.'}
                            </p>
                        </div>

                        {error && <InlineAlert variant="error" title="Школа не создана" description={error} />}

                        <DialogFooter className="gap-2 sm:space-x-0">
                            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isCreating}>
                                Отмена
                            </Button>
                            <Button type="submit" disabled={isCreating || Boolean(nameError)} className="whitespace-nowrap">
                                {isCreating ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
                                {isCreating ? 'Создаём…' : 'Создать школу'}
                            </Button>
                        </DialogFooter>
                    </form>
                ) : (
                    <div className="space-y-5">
                        <DialogHeader>
                            <DialogTitle>Школа «{result.name}» создана</DialogTitle>
                            <DialogDescription>
                                Команда отображается только сейчас. После закрытия окна восстановить её нельзя.
                            </DialogDescription>
                        </DialogHeader>

                        <InlineAlert
                            variant="error"
                            title="Секрет одноразовый"
                            description={`Передайте команду владельцу по защищённому каналу. Срок действия: до ${expiresAt}.`}
                        />

                        <div className="rounded-xl border border-border bg-muted/45 p-3">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">Команда для владельца</p>
                            <code className="block overflow-x-auto whitespace-pre rounded-lg bg-background px-3 py-3 font-mono text-sm">
                                {result.setup_command}
                            </code>
                        </div>

                        {copyState === 'manual' && (
                            <InlineAlert
                                title="Скопируйте команду вручную"
                                description="Буфер обмена недоступен в этом браузере. Команда выделяется обычным способом."
                            />
                        )}

                        <DialogFooter className="gap-2 sm:space-x-0">
                            <Button type="button" variant="outline" onClick={handleCopy} className="whitespace-nowrap">
                                {copyState === 'copied' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                                {copyState === 'copied' ? 'Скопировано' : 'Скопировать'}
                            </Button>
                            <Button type="button" onClick={() => handleOpenChange(false)}>Готово</Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
