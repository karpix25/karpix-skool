import React from 'react';

interface KpiCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    trend?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, trend }) => {
    return (
        <div className="bg-card p-4 rounded-lg border border-border shadow-sm flex flex-col justify-between transition-colors hover:border-primary/20">
            <div className="flex items-center justify-between mb-2">
                <div className="text-primary">{icon}</div>
                {trend && (
                    <span className="text-[10px] font-bold text-success bg-success/10 px-1.5 py-0.5 rounded-md border border-success/15">
                        {trend}
                    </span>
                )}
            </div>
            <div>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-[10px] text-muted-foreground font-semibold">
                    {label}
                </div>
            </div>
        </div>
    );
};
