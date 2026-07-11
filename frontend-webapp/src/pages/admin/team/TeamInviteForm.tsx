import { Loader2, Plus, UserPlus } from 'lucide-react';
import type { FormEvent } from 'react';

import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';

interface TeamInviteFormProps {
    identifier: string;
    isSaving: boolean;
    canManage: boolean;
    onIdentifierChange: (value: string) => void;
    onSubmit: () => void;
}

export const TeamInviteForm = ({
    identifier,
    isSaving,
    canManage,
    onIdentifierChange,
    onSubmit,
}: TeamInviteFormProps) => {
    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSubmit();
    };

    return (
        <Card className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <CardContent className="grid gap-4 p-4 md:grid-cols-[minmax(12rem,18rem)_minmax(0,1fr)] md:items-center">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
                        <UserPlus size={18} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold leading-tight">Добавить админа</h2>
                        <p className="mt-1 text-xs font-medium text-muted-foreground">Telegram ID или username</p>
                    </div>
                </div>

                <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={handleSubmit}>
                    <Input
                        value={identifier}
                        onChange={(event) => onIdentifierChange(event.target.value)}
                        placeholder="@username или 123456789"
                        disabled={!canManage || isSaving}
                        className="h-11 px-4 text-sm"
                    />
                    <Button
                        type="submit"
                        disabled={!canManage || isSaving || !identifier.trim()}
                        className="h-11 rounded-md px-5"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={16} />}
                        Добавить
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};
