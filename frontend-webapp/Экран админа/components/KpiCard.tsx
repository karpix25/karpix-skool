
import React from 'react';

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, trend }) => {
  return (
    <div className="bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="text-primary">{icon}</div>
        {trend && (
          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
          {label}
        </div>
      </div>
    </div>
  );
};
