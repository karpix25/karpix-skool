
import React, { useState, useEffect, useRef } from 'react';
import { FeedItem } from '../types';

const PulseView: React.FC = () => {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const terminalRef = useRef<HTMLDivElement>(null);

  const [feed, setFeed] = useState<FeedItem[]>([
    { id: '1', time: '14:21:44', type: 'SUCCESS', message: 'School Alpha: New lesson ', meta: '"Advanced DeFi"', message_end: ' added.' } as any,
    { id: '2', time: '14:20:12', type: 'MILESTONE', message: 'User ', meta: '@crypto_king', message_end: ' reached Level 10.' } as any,
    { id: '3', time: '14:19:55', type: 'SYSTEM', message: 'Server Node 04: Optimizing latency for Middle East region...' } as any,
    { id: '4', time: '14:18:02', type: 'ALERT', message: 'School Delta: 5 suspicious login attempts detected from IP 192.x.x.x' } as any,
    { id: '5', time: '14:16:30', type: 'SUCCESS', message: 'Payout of 4.5 ETH processed for Author: ', meta: '@learning_hub' } as any,
  ]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="p-5 space-y-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Pulse Dashboard</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-success pulsate"></span>
            <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-medium">System Live: {time}</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
          <span className="material-icons-round text-primary">analytics</span>
        </div>
      </header>

      {/* KPI Bento Grid */}
      <section className="grid grid-cols-2 gap-3">
        <div className="bg-card-dark p-4 rounded-xl border border-zinc-800 flex flex-col justify-between h-32">
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Active Learners (24h)</span>
            <div className="text-2xl font-bold mt-1">12,842</div>
          </div>
          <div className="h-8 flex items-end">
            <svg className="w-full h-full stroke-success fill-none stroke-[2px]" viewBox="0 0 100 20">
              <path d="M0 15 Q 10 5, 20 12 T 40 8 T 60 15 T 80 5 T 100 10" />
            </svg>
          </div>
        </div>

        <div className="bg-card-dark p-4 rounded-xl border border-zinc-800 flex flex-col justify-between h-32">
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Lessons Total</span>
            <div className="text-2xl font-bold mt-1">84.2k</div>
          </div>
          <div className="flex items-center gap-1 text-success text-[11px] font-bold">
            <span className="material-icons-round text-xs">trending_up</span>
            +12.4%
          </div>
        </div>

        <div className="bg-card-dark p-4 rounded-xl border border-zinc-800 flex flex-col justify-between h-32">
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Bot Uptime</span>
            <div className="text-2xl font-bold mt-1">99.9%</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[1, 1, 1, 1].map(i => <div key={i} className="w-1.5 h-4 bg-success rounded-full"></div>)}
              <div className="w-1.5 h-4 bg-zinc-700 rounded-full"></div>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Stable</span>
          </div>
        </div>

        <div className="bg-card-dark p-4 rounded-xl border border-zinc-800 flex flex-col justify-between h-32 relative overflow-hidden">
          <div className="absolute -top-1 -right-1">
            <div className="bg-danger text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg">24 NEW</div>
          </div>
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Author Req.</span>
            <div className="text-2xl font-bold mt-1">156</div>
          </div>
          <button className="w-full py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg transition-colors border border-primary/20">
            Review All
          </button>
        </div>
      </section>

      {/* Nexus Protocol */}
      <section className="bg-primary p-5 rounded-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-20">
          <span className="material-icons-round text-6xl">hub</span>
        </div>
        <div className="relative z-10">
          <h3 className="font-bold text-lg leading-tight mb-1">Nexus Protocol</h3>
          <p className="text-white/80 text-xs mb-4 max-w-[200px]">Cross-school collaboration and content sharing is currently at 84% capacity.</p>
          <div className="flex gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase opacity-60">Nodes</span>
              <span className="text-sm font-bold">1,240</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase opacity-60">Traffic</span>
              <span className="text-sm font-bold">4.2 TB/s</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Feed */}
      <section className="bg-terminal-bg rounded-xl border border-zinc-800 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="material-icons-round text-sm text-zinc-500">terminal</span>
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 font-mono">Live Activity Feed</h2>
          </div>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-primary/40"></div>
          </div>
        </div>
        <div ref={terminalRef} className="p-4 h-64 overflow-y-auto font-mono text-[10px] space-y-3 terminal-scrollbar relative">
          <div className="scanline absolute inset-0"></div>
          {feed.map((item) => (
            <div key={item.id} className="flex gap-3">
              <span className="text-zinc-600 shrink-0">{item.time}</span>
              <div className="flex-1">
                <span className={`font-bold mr-1 ${
                  item.type === 'SUCCESS' ? 'text-success' : 
                  item.type === 'MILESTONE' ? 'text-primary' : 
                  item.type === 'ALERT' ? 'text-danger' : 'text-zinc-500'
                }`}>[{item.type}]</span>
                <span className="text-zinc-300">{item.message}</span>
                {item.meta && <span className={`${item.type === 'MILESTONE' ? 'text-white font-bold' : 'text-primary underline'}`}>{item.meta}</span>}
                {(item as any).message_end && <span className="text-zinc-300">{(item as any).message_end}</span>}
              </div>
            </div>
          ))}
          <div className="flex gap-3 animate-pulse">
            <span className="text-zinc-600">{time.split(' ')[0]}</span>
            <div className="flex-1"><span className="text-primary font-bold">_</span></div>
          </div>
        </div>
      </section>

      {/* Heatmap */}
      <section className="bg-card-dark p-4 rounded-xl border border-zinc-800">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Global Heatmap</h3>
          <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-bold">View World</span>
        </div>
        <div className="relative h-32 rounded-lg bg-zinc-900 flex items-center justify-center overflow-hidden">
          <img alt="World Map" className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale" src="https://picsum.photos/seed/heatmap/800/400" />
          <div className="relative z-10 flex flex-col items-center">
            <span className="material-icons-round text-primary text-3xl">public</span>
            <span className="text-[10px] font-mono mt-2 text-zinc-400 tracking-tighter uppercase">Maps.Loaded.OK</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PulseView;
