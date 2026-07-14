import React, { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';
import {
    CheckCircle2,
    Save,
    Loader2,
    Trophy
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { cn } from '../../lib/utils';
import { updateTenant } from '../../services/tenants';
import type { AdminTenant } from '../../types/admin';
import { TelegramIntegrationCard } from './settings/TelegramIntegrationCard';
import { WelcomeVideoSettingsCard } from './settings/WelcomeVideoSettingsCard';
import { SchoolBrandingCard } from './settings/SchoolBrandingCard';
import { SchoolProfileCard } from './settings/SchoolProfileCard';
import { OwnerSubscriptionCard } from './subscription/OwnerSubscriptionCard';

export const Settings: React.FC = () => {
    const [tenant, setTenant] = useState<AdminTenant | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Level Names State
    const [levelNames, setLevelNames] = useState<Record<string, string>>({});
    const [isSavingLevels, setIsSavingLevels] = useState(false);
    const [isSavedLevels, setIsSavedLevels] = useState(false);

    const applyTenantState = useCallback((school: AdminTenant) => {
        setTenant(school);
        setLevelNames(school.level_names || {});
    }, []);

    const handleTelegramTenantChange = useCallback((school: AdminTenant) => {
        setTenant((current) => current ? { ...current, ...school } : school);
    }, []);

    const handleSettingsTenantChange = useCallback((school: AdminTenant) => {
        setTenant((current) => current ? { ...current, ...school } : school);
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/tenants');
            if (res.data && res.data.length > 0) {
                applyTenantState(res.data[0]);
            }
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        } finally {
            setIsLoading(false);
        }
    }, [applyTenantState]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSaveLevelNames = async () => {
        if (!tenant) return;
        setIsSavingLevels(true);
        try {
            const updatedTenant = await updateTenant(tenant.id, { level_names: levelNames });
            setTenant({ ...tenant, ...updatedTenant, level_names: levelNames });
            setIsSavedLevels(true);
            setTimeout(() => setIsSavedLevels(false), 3000);
        } catch (err) {
            console.error('Failed to save level names:', err);
        } finally {
            setIsSavingLevels(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[80vh]">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    if (!tenant) return (
        <div className="p-10 text-center">
            <p className="text-muted-foreground">Школа не найдена.</p>
        </div>
    );

    return (
        <div className="p-5 sm:p-6 md:p-10 space-y-8 max-w-4xl mx-auto pb-32 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Настройки</h1>
                <p className="text-muted-foreground text-sm mt-1">Конфигурация школы и интеграций</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                <OwnerSubscriptionCard tenantId={tenant.id} supportUrl={tenant.support_url} />

                <SchoolProfileCard tenant={tenant} onTenantChange={handleSettingsTenantChange} />

                <SchoolBrandingCard tenant={tenant} onTenantChange={handleSettingsTenantChange} />

                {/* Level Names Settings */}
                <Card className="border border-border shadow-sm bg-card overflow-hidden rounded-lg">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600">
                                <Trophy size={20} />
                            </div>
                            <CardTitle className="text-lg">Названия уровней</CardTitle>
                        </div>
                        <CardDescription className="text-xs text-muted-foreground">
                            Настройте уникальные названия для каждого уровня в вашей школе.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {Array.from({ length: 9 }, (_, i) => i + 1).map((level) => {
                                    const defaultName = level <= 2 ? "Новичок" : level <= 4 ? "Ученик" : level <= 6 ? "Подмастерье" : level <= 8 ? "Эксперт" : "Грандмастер";
                                    return (
                                        <div key={level} className="space-y-1">
                                            <label className="text-[10px] font-bold text-muted-foreground px-1">
                                                Уровень {level}
                                            </label>
                                            <Input
                                                placeholder={defaultName}
                                                value={levelNames[String(level)] || ''}
                                                onChange={(e) => setLevelNames({ ...levelNames, [String(level)]: e.target.value })}
                                                className="bg-muted/30 border border-border rounded-lg h-11 focus-visible:ring-primary/20"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="pt-6 flex justify-center">
                            <Button
                                onClick={handleSaveLevelNames}
                                disabled={isSavingLevels}
                                className={cn(
                                    "rounded-lg h-12 px-10 font-bold text-sm transition-all shadow-sm active:scale-[0.99]",
                                    isSavedLevels
                                        ? "bg-success hover:bg-success/90 text-white"
                                        : "bg-primary hover:bg-primary/90 text-primary-foreground"
                                )}
                            >
                                {isSavingLevels ? (
                                    <Loader2 className="animate-spin mr-2" size={20} />
                                ) : isSavedLevels ? (
                                    <CheckCircle2 size={20} className="mr-2 animate-in zoom-in duration-300" />
                                ) : (
                                    <Save size={20} className="mr-2" />
                                )}
                                {isSavedLevels ? "Сохранено" : "Сохранить"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <WelcomeVideoSettingsCard tenant={tenant} onTenantChange={handleSettingsTenantChange} />

                <TelegramIntegrationCard tenant={tenant} onTenantChange={handleTelegramTenantChange} />

                {/* Advanced - Danger Zone */}
                <div className="pt-8 opacity-70 transition-opacity hover:opacity-100">
                    <p className="text-[10px] font-black text-destructive px-4 mb-4">Опасная зона</p>
                    <Card className="border border-dashed border-destructive/25 bg-card rounded-lg">
                        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h4 className="font-bold text-sm text-foreground">Сбросить настройки школы</h4>
                                <p className="text-[10px] text-muted-foreground mt-1">Это действие удалит текущие привязки к Telegram. Будьте осторожны.</p>
                            </div>
                            <Button variant="destructive" className="h-11 rounded-lg px-6 text-[10px] font-bold opacity-50 cursor-not-allowed">
                                Сбросить
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div >
    );
};
