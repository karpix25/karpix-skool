
import React from 'react';

const NexusView: React.FC = () => {
  return (
    <div className="p-5 space-y-8">
      {/* iOS style status bar filler */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-lexend">Nexus</h1>
          <p className="text-slate-500 text-sm">Global Maintenance & Feature Control</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <span className="material-icons-round text-primary text-xl">admin_panel_settings</span>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="material-icons-round text-primary text-sm">campaign</span>
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Global Broadcast</h2>
        </div>
        <div className="bg-card-dark border border-zinc-800 rounded-xl p-4 shadow-sm">
          <div className="bg-zinc-900/50 p-1 rounded-lg flex mb-4">
            <button className="flex-1 py-1.5 text-xs font-medium rounded-md bg-primary text-white shadow-sm transition-all">All Admins</button>
            <button className="flex-1 py-1.5 text-xs font-medium rounded-md text-slate-500 hover:text-slate-300">All Students</button>
          </div>
          <div className="relative mb-4">
            <textarea className="w-full bg-background-dark border border-zinc-800 rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-600 text-white" placeholder="Enter system-wide announcement message here..." rows={4}></textarea>
            <div className="absolute bottom-3 right-3 text-[9px] font-medium text-slate-600">0 / 280</div>
          </div>
          <button className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98]">
            <span className="material-icons-round text-sm">send</span>
            <span>Broadcast Message</span>
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-icons-round text-primary text-sm">toggle_on</span>
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Feature Management</h2>
          </div>
          <button className="text-[10px] font-bold text-primary uppercase tracking-tighter bg-primary/10 px-2 py-0.5 rounded">Live</button>
        </div>
        
        <div className="space-y-3">
          {[
            { title: 'Gamification', desc: 'Badges, points & leaderboards', icon: 'emoji_events', color: 'text-orange-500', bg: 'bg-orange-500/10', scope: 'Global', checked: true },
            { title: 'Community Feed', desc: 'Peer-to-peer interactions', icon: 'forum', color: 'text-emerald-500', bg: 'bg-emerald-500/10', scope: 'T-9921, T-4402', checked: false },
            { title: 'AI Tutor', desc: 'LLM powered student support', icon: 'psychology', color: 'text-primary', bg: 'bg-primary/10', scope: 'Global', checked: true },
          ].map((feat, idx) => (
            <div key={idx} className="bg-card-dark border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${feat.bg} flex items-center justify-center`}>
                    <span className={`material-icons-round ${feat.color}`}>{feat.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{feat.title}</h3>
                    <p className="text-[10px] text-slate-500">{feat.desc}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input className="sr-only peer" type="checkbox" defaultChecked={feat.checked} />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              <div className="px-4 pb-4 pt-0">
                <div className="flex items-center gap-2 bg-background-dark/40 rounded-lg p-2 border border-zinc-800/30">
                  <span className="text-[9px] font-medium text-slate-500 uppercase shrink-0">Tenant Scope</span>
                  <input className="bg-transparent border-none p-0 text-[10px] focus:ring-0 placeholder:text-slate-600 w-full text-primary font-medium" defaultValue={feat.scope} type="text"/>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-4">
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
        </div>
        <div>
          <p className="text-xs font-semibold text-primary">System Health: 100%</p>
          <p className="text-[10px] text-slate-500">All 42 active shards are performing optimally.</p>
        </div>
      </div>
    </div>
  );
};

export default NexusView;
