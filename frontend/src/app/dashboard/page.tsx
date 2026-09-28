export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          Good evening, Rahul <span className="text-2xl">👋</span>
        </h1>
        <p className="text-text-muted mt-1">Here's your skill intelligence overview.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Alignment Score */}
        <div className="glow-card bg-surface border border-border rounded-xl p-5 flex items-center gap-4">
          <div className="relative w-16 h-16 flex items-center justify-center rounded-full border-4 border-surface-hover">
            <svg className="absolute top-0 left-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" fill="transparent" stroke="var(--color-accent)" strokeWidth="8" strokeDasharray="289" strokeDashoffset="92" className="drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"></circle>
            </svg>
            <span className="text-lg font-bold">68%</span>
          </div>
          <div>
            <div className="text-sm font-semibold">Role Alignment</div>
            <div className="text-xs text-text-muted">AI Engineer</div>
          </div>
        </div>

        {/* Skill Gaps */}
        <div className="glow-card bg-surface border border-border rounded-xl p-5 flex flex-col justify-center items-center">
          <div className="text-3xl font-bold text-red-400">4</div>
          <div className="text-sm text-text-muted mt-1">Skill Gaps</div>
          <div className="text-[10px] text-red-400 mt-1 uppercase tracking-wider font-bold">High Priority</div>
        </div>

        {/* Courses */}
        <div className="glow-card bg-surface border border-border rounded-xl p-5 flex flex-col justify-center items-center">
          <div className="text-3xl font-bold text-primary">6</div>
          <div className="text-sm text-text-muted mt-1">Recommended</div>
          <div className="text-[10px] text-text-muted mt-1 uppercase tracking-wider">Courses</div>
        </div>

        {/* Jobs */}
        <div className="glow-card bg-surface border border-border rounded-xl p-5 flex flex-col justify-center items-center">
          <div className="text-3xl font-bold text-white">12</div>
          <div className="text-sm text-text-muted mt-1">Relevant</div>
          <div className="text-[10px] text-text-muted mt-1 uppercase tracking-wider">Job Openings</div>
        </div>
      </div>

      {/* Main Grid: Graph + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Skill Graph Placeholder (Col Span 2) */}
        <div className="lg:col-span-2 glow-card bg-surface border border-border rounded-xl p-6 min-h-[400px] flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-center mb-4 z-10">
            <h2 className="text-lg font-bold">Your Skill Graph</h2>
            <button className="text-xs text-text-muted hover:text-white transition-colors">View in 3D ↗</button>
          </div>
          
          <div className="flex gap-4 text-[10px] uppercase tracking-wider font-semibold text-text-muted z-10">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary"></span> Your Skill</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent"></span> Moderate</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Weak</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-border"></span> Not Learned</span>
          </div>

          {/* Fake Graph Visual */}
          <div className="absolute inset-0 flex items-center justify-center opacity-80 pointer-events-none mt-10">
             {/* Central Node */}
             <div className="absolute w-24 h-24 rounded-full bg-blue-600/20 border border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.5)] flex flex-col items-center justify-center z-20">
                <span className="font-bold text-white">AI</span>
                <span className="font-bold text-white">Engineer</span>
             </div>
             {/* Edge 1 */}
             <div className="absolute w-32 h-[1px] bg-gradient-to-r from-blue-500/50 to-primary/50 transform -rotate-45 -translate-x-12 -translate-y-12"></div>
             {/* Node 1 */}
             <div className="absolute w-16 h-16 rounded-full bg-primary/10 border border-primary text-primary flex items-center justify-center text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)] transform -translate-x-32 -translate-y-24">Python</div>
             
             {/* Edge 2 */}
             <div className="absolute w-24 h-[1px] bg-gradient-to-l from-blue-500/50 to-red-500/50 transform rotate-12 translate-x-16 -translate-y-4"></div>
             {/* Node 2 */}
             <div className="absolute w-14 h-14 rounded-full bg-red-500/10 border border-red-500 text-red-400 flex items-center justify-center text-xs shadow-[0_0_15px_rgba(239,68,68,0.3)] transform translate-x-28 -translate-y-8">PyTorch</div>

             {/* Edge 3 */}
             <div className="absolute w-28 h-[1px] bg-gradient-to-r from-accent/50 to-blue-500/50 transform -rotate-12 -translate-x-16 translate-y-20"></div>
             {/* Node 3 */}
             <div className="absolute w-20 h-20 rounded-full bg-accent/10 border border-accent text-accent flex text-center items-center justify-center text-xs shadow-[0_0_15px_rgba(245,158,11,0.3)] transform -translate-x-36 translate-y-24">Machine<br/>Learning</div>
          </div>
        </div>

        {/* Right Column: Actions & Streak */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="glow-card bg-surface border border-border rounded-xl p-6">
            <h2 className="text-sm font-bold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-3 bg-background border border-border rounded-lg hover:border-blue-500 group transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">🎯</div>
                  <span className="text-sm font-medium">View Skill Gap</span>
                </div>
                <span className="text-text-muted">›</span>
              </button>
              
              <button className="w-full flex items-center justify-between p-3 bg-background border border-border rounded-lg hover:border-accent group transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-accent/20 text-accent flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors">🗺️</div>
                  <span className="text-sm font-medium">Generate Roadmap</span>
                </div>
                <span className="text-text-muted">›</span>
              </button>
            </div>
          </div>

          {/* Learning Streak */}
          <div className="glow-card bg-surface border border-border rounded-xl p-6">
            <h2 className="text-sm font-bold mb-4">Learning Streak</h2>
            <div className="flex justify-between items-end mb-4">
              <div className="text-3xl font-bold text-primary">12 <span className="text-sm font-normal text-text-muted">days</span></div>
              <div className="text-xs text-accent font-semibold flex items-center gap-1">Keep going! 🔥</div>
            </div>
            {/* Week visualization */}
            <div className="flex justify-between px-2">
              {['M','T','W','T','F','S','S'].map((day, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <span className="text-[10px] text-text-muted">{day}</span>
                  <div className={`w-3 h-3 rounded-full ${i < 5 ? 'bg-primary shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-border'}`}></div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
