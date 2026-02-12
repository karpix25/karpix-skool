
import React from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { ChartDataPoint } from '../types';

const data: ChartDataPoint[] = [
  { time: '12 AM', value: 30 },
  { time: '2 AM', value: 45 },
  { time: '4 AM', value: 40 },
  { time: '6 AM', value: 65 },
  { time: '8 AM', value: 55 },
  { time: '10 AM', value: 80 },
  { time: '12 PM', value: 95 },
  { time: '2 PM', value: 85 },
  { time: '4 PM', value: 70 },
  { time: '6 PM', value: 45 },
  { time: '8 PM', value: 50 },
  { time: 'NOW', value: 35 },
];

export const ActivityChart: React.FC = () => {
  return (
    <section className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <h3 className="font-semibold text-sm">Growth Activity</h3>
        <span className="text-[10px] text-slate-400 uppercase font-medium">Last 24 Hours</span>
      </div>
      <div className="p-4 pt-6 h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis 
              dataKey="time" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
              interval={2}
            />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-900 text-white px-2 py-1 rounded text-[10px] font-bold shadow-lg">
                      {payload[0].value} Users
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="value" radius={[2, 2, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.time === '12 PM' ? '#135bec' : '#135bec44'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
