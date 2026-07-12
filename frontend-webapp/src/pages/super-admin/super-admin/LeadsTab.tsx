import { useMemo, useState } from 'react';
import { Archive, CalendarClock, CheckCircle2, RefreshCw, Search, Send, UserRound, XCircle } from 'lucide-react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { InlineAlert } from '../../../components/ui/inline-alert';
import { Input } from '../../../components/ui/input';
import { cn } from '../../../lib/utils';
import type { SuperAdminLead } from './types';

interface LeadsTabProps {
    leads: SuperAdminLead[];
    isLoading: boolean;
    error: string | null;
    onRefresh: () => void;
    onUpdateStatus: (leadId: string, status: string) => void;
}

const statusLabels: Record<string, string> = {
    new: 'Новая',
    pending: 'Ожидает',
    in_progress: 'В работе',
    contacted: 'Связались',
    approved: 'Одобрена',
    rejected: 'Отклонена',
    archived: 'Архив',
    closed: 'Закрыта',
};

const statusStyles: Record<string, string> = {
    approved: 'border-success/20 bg-success/10 text-success',
    rejected: 'border-danger/20 bg-danger/10 text-danger',
    archived: 'border-muted bg-muted text-muted-foreground',
    closed: 'border-muted bg-muted text-muted-foreground',
    in_progress: 'border-primary/20 bg-primary/10 text-primary',
    contacted: 'border-primary/20 bg-primary/10 text-primary',
};

const getStatusLabel = (status: string) => statusLabels[status] || status;

const getStatusStyle = (status: string) => (
    statusStyles[status] || 'border-amber-500/20 bg-amber-500/10 text-amber-700'
);

const formatDate = (value: string | null) => {
    if (!value) return 'Дата не указана';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getLeadSearchText = (lead: SuperAdminLead) => (
    [
        lead.name,
        lead.telegram,
        lead.schoolName,
        lead.description,
        lead.status,
        lead.source,
    ].filter(Boolean).join(' ').toLowerCase()
);

export const LeadsTab = ({ leads, isLoading, error, onRefresh, onUpdateStatus }: LeadsTabProps) => {
    const [search, setSearch] = useState('');
    const normalizedSearch = search.trim().toLowerCase();
    const filteredLeads = useMemo(() => (
        normalizedSearch
            ? leads.filter((lead) => getLeadSearchText(lead).includes(normalizedSearch))
            : leads
    ), [leads, normalizedSearch]);

    const pendingCount = leads.filter((lead) => lead.status === 'new' || lead.status === 'pending').length;

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">Входящие заявки</p>
                        <h3 className="mt-1 text-2xl font-semibold leading-tight">Заявки</h3>
                        <p className="mt-1 text-xs text-muted-foreground">Лиды с формы и miniapp-заявки авторов</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline">{pendingCount} новых</Badge>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-11 w-11 rounded-lg"
                            onClick={onRefresh}
                            disabled={isLoading}
                            aria-label="Обновить заявки"
                            title="Обновить заявки"
                        >
                            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                        </Button>
                    </div>
                </div>

                <div className="relative group">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                        placeholder="Поиск по имени, Telegram или школе..."
                        className="h-11 pl-10 text-sm"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>
            </section>

            {error && (
                <InlineAlert
                    variant="error"
                    title="Заявки не загрузились"
                    description={error}
                />
            )}

            {isLoading && leads.length === 0 ? (
                <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-border/80 bg-card text-primary">
                    <RefreshCw className="animate-spin" size={28} />
                </div>
            ) : filteredLeads.length === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card px-5 py-10 text-center">
                    <Send className="mb-3 text-muted-foreground" size={32} />
                    <p className="text-sm font-semibold">Заявок не найдено</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {search ? 'Попробуйте изменить поиск.' : 'Когда появятся новые заявки, они будут здесь.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredLeads.map((lead) => (
                        <Card key={lead.id} className="overflow-hidden rounded-2xl border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                            <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-start">
                                <div className="flex min-w-0 flex-1 gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                                        <UserRound size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="break-words text-base font-semibold">
                                                {lead.schoolName || lead.name || 'Без названия школы'}
                                            </h4>
                                            <span className={cn('rounded-md border px-2 py-1 text-[11px] font-semibold', getStatusStyle(lead.status))}>
                                                {getStatusLabel(lead.status)}
                                            </span>
                                            <span className="rounded-md border border-border bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                                                {lead.kind === 'author_request' ? 'Автор' : 'Лид'}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {lead.name || 'Имя не указано'}
                                            {lead.telegram ? ` · ${lead.telegram}` : ''}
                                        </p>
                                        {lead.description && (
                                            <p className="mt-3 text-sm leading-6 text-muted-foreground">{lead.description}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid gap-2 rounded-xl border border-border/70 bg-muted/35 p-3 text-xs text-muted-foreground md:w-60">
                                    <div className="grid gap-1.5">
                                        <span className="flex items-center gap-2">
                                            <CalendarClock className="h-3.5 w-3.5 text-primary" />
                                            {formatDate(lead.createdAt)}
                                        </span>
                                        {lead.source && <span className="truncate">Источник: {lead.source}</span>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                                        {lead.kind === 'platform_lead' && lead.status === 'new' && (
                                            <Button
                                                variant="outline"
                                                className="h-9 rounded-lg text-[11px]"
                                                onClick={() => onUpdateStatus(lead.id, 'in_progress')}
                                            >
                                                <Send size={13} />
                                                В работу
                                            </Button>
                                        )}
                                        {lead.status !== 'approved' && (
                                            <Button
                                                variant="outline"
                                                className="h-9 rounded-lg text-[11px] text-success hover:text-success"
                                                onClick={() => onUpdateStatus(lead.id, 'approved')}
                                            >
                                                <CheckCircle2 size={13} />
                                                Одобрить
                                            </Button>
                                        )}
                                        {lead.status !== 'rejected' && (
                                            <Button
                                                variant="outline"
                                                className="h-9 rounded-lg text-[11px] text-danger hover:text-danger"
                                                onClick={() => onUpdateStatus(lead.id, 'rejected')}
                                            >
                                                <XCircle size={13} />
                                                Отклонить
                                            </Button>
                                        )}
                                        {lead.kind === 'platform_lead' && lead.status !== 'archived' && (
                                            <Button
                                                variant="ghost"
                                                className="h-9 rounded-lg text-[11px] text-muted-foreground"
                                                onClick={() => onUpdateStatus(lead.id, 'archived')}
                                            >
                                                <Archive size={13} />
                                                Архив
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
