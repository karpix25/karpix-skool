import React from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell } from 'recharts';

interface ChartDataPoint {
    time: string;
    value: number;
}

interface ActivityChartProps {
    data: ChartDataPoint[];
}

export const ActivityChart: React.FC<ActivityChartProps> = ({ data }) => {
    return (
        <section className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-border">
                <h3 className="font-semibold text-sm">Активность роста</h3>
                <span className="text-[10px] text-muted-foreground font-medium">За 24 часа</span>
            </div>
            <div className="p-4 pt-6 h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <XAxis
                            dataKey="time"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)', fontWeight: 500 }}
                            interval={2}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-foreground text-background px-2 py-1 rounded-md text-[10px] font-bold shadow-lg">
                                            {payload[0].value} Пользователей
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                            {data.map((_, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={index === data.length - 1 ? 'var(--color-primary)' : 'color-mix(in oklch, var(--color-primary) 28%, transparent)'}
                                    className="transition-all duration-300 hover:opacity-100"
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
};
