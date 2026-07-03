import { Loader2, Plus, UserPlus } from 'lucide-react';
import type { FormEvent } from 'react';

import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../../components/ui/select';
import type { AssignableTeamRole } from './types';
import { assignableTeamRoles, getTeamRoleDescription, getTeamRoleLabel } from './types';

interface TeamInviteFormProps {
    identifier: string;
    role: AssignableTeamRole;
    isSaving: boolean;
    canManage: boolean;
    onIdentifierChange: (value: string) => void;
    onRoleChange: (role: AssignableTeamRole) => void;
    onSubmit: () => void;
}

export const TeamInviteForm = ({
    identifier,
    role,
    isSaving,
    canManage,
    onIdentifierChange,
    onRoleChange,
    onSubmit,
}: TeamInviteFormProps) => {
    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSubmit();
    };

    return (
        <Card className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                        <UserPlus size={20} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold leading-tight">Добавить менеджера</h2>
                        <p className="mt-1 text-xs font-medium text-muted-foreground">Telegram ID или username</p>
                    </div>
                </div>

                <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]" onSubmit={handleSubmit}>
                    <Input
                        value={identifier}
                        onChange={(event) => onIdentifierChange(event.target.value)}
                        placeholder="@username или 123456789"
                        disabled={!canManage || isSaving}
                        className="h-11"
                    />
                    <Select
                        value={role}
                        disabled={!canManage || isSaving}
                        onValueChange={(value) => onRoleChange(value as AssignableTeamRole)}
                    >
                        <SelectTrigger className="h-11">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {assignableTeamRoles.map((item) => (
                                <SelectItem key={item} value={item}>
                                    <span className="font-medium">{getTeamRoleLabel(item)}</span>
                                    <span className="ml-2 text-xs text-muted-foreground">{getTeamRoleDescription(item)}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        type="submit"
                        disabled={!canManage || isSaving || !identifier.trim()}
                        className="h-11 rounded-lg px-4"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={16} />}
                        Добавить
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};
