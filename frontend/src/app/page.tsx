import Link from 'next/link';
import HeroGraph from '@/components/HeroGraph';
import InteractiveMap from '@/components/InteractiveMap';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-text-main font-sans overflow-x-hidden selection:bg-primary/30">
      
      {/* ---------------- 1. NAVBAR ---------------- */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-[80px] flex items-center justify-between px-6 lg:px-12 border-b border-white/5 bg-[#050914]/90 backdrop-blur-md">
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="text-primary flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
               <path d="M12 22C12 22 12 16 7 11C2 6 2 2 2 2C2 2 6 2 11 7C16 12 12 22 12 22ZM12 22C12 22 12 16 17 11C22 6 22 2 22 2C22 2 18 2 13 7C8 12 12 22 12 22ZM12 22C12 22 12 18 12 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-bold text-2xl tracking-wide text-white">SkillVeda</span>
        </div>
        
        <div className="hidden lg:flex items-center gap-10 text-[15px] font-medium text-text-muted">
          <a href="#" className="hover:text-white transition-colors">For Students</a>
          <a href="#" className="hover:text-white transition-colors">For Employers</a>
          <a href="#" className="hover:text-white transition-colors">For Universities</a>
          <a href="#" className="hover:text-white transition-colors">About</a>
        </div>
        
        <div className="flex items-center gap-6">
          <a href="#" className="hidden sm:block text-[15px] font-medium text-white hover:text-primary transition-colors">Sign In</a>
          <Link href="/dashboard" className="bg-primary hover:bg-primary-hover text-[#022c22] font-bold px-6 py-2.5 rounded-full text-[15px] transition-all">
            Get Started →
          </Link>
        </div>
      </nav>

      {/* ---------------- HERO ---------------- */}
      <main className="relative min-h-screen flex flex-col pt-[120px] lg:pt-[160px] pb-10 bg-[#050914] overflow-hidden">
        
        {/* Background Image Layer */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* Fallback gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#050914] via-[#050914]/80 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050914] via-transparent to-transparent z-10" />
          {/* Note to user: Add your image as public/hero-bg.jpg */}
          <div className="absolute inset-0 bg-[url('/hero-bg.jpg')] bg-cover bg-center opacity-70 mix-blend-screen" />
        </div>

        {/* Main Content (Text + Graph) */}
        <div className="flex-1 w-full max-w-[1400px] mx-auto px-6 lg:px-12 flex flex-col lg:flex-row items-center gap-12 lg:gap-8 relative z-20">
          
          <div className="w-full lg:w-5/12 flex flex-col">
            <div className="inline-flex items-center gap-3 mb-8 text-[11px] font-bold text-primary tracking-[0.2em] uppercase border border-primary/20 bg-[#050914]/50 backdrop-blur-md px-4 py-1.5 rounded-full self-start shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              AI-POWERED <span className="text-white/20">•</span> SKILL INTELLIGENCE <span className="text-white/20">•</span> FOR A BRIGHTER BHARAT
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-[5rem] leading-[1.05] font-bold mb-8 tracking-tight text-white drop-shadow-xl">
              Your skills<br/>
              are a story.<br/>
              <span className="text-primary drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">SkillVeda</span> shows<br/>
              you where <span className="text-accent drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]">they lead.</span>
            </h1>
            
            <p className="text-[17px] text-white/80 mb-12 max-w-[420px] leading-relaxed drop-shadow-md">
              Understand your current skills, discover what the market demands, and build a personalized path toward the career you want.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-5">
              <Link href="/dashboard" className="bg-[#a7f3d0] hover:bg-primary hover:scale-105 text-[#064e3b] font-bold px-8 py-3.5 rounded-full text-center transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                Analyze My Skills →
              </Link>
              <button className="px-8 py-3.5 rounded-full font-bold text-white border border-white/20 bg-[#050914]/50 backdrop-blur-md hover:border-white/40 hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Watch Demo
              </button>
            </div>
          </div>

          <div className="w-full lg:w-7/12 relative">
            <HeroGraph />
          </div>
        </div>

        {/* Stats Row at the very bottom of Hero */}
        <div className="w-full max-w-[1400px] mx-auto px-6 lg:px-12 mt-12 relative z-20">
          <div className="flex flex-wrap gap-8 sm:gap-16 pt-8 border-t border-white/10">
            <div className="relative pl-6 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-[30px] before:bg-amber-500">
              <div className="text-2xl font-bold text-white mb-1">1M+</div>
              <div className="text-[13px] text-text-muted font-medium">Students</div>
            </div>
            
            <div className="relative pl-6 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-[30px] before:bg-primary">
              <div className="text-2xl font-bold text-white mb-1">10K+</div>
              <div className="text-[13px] text-text-muted font-medium">Employers</div>
            </div>
            
            <div className="relative pl-6 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-[30px] before:bg-primary">
              <div className="text-2xl font-bold text-white mb-1">2.7K+</div>
              <div className="text-[13px] text-text-muted font-medium">Institutions</div>
            </div>
            
            <div className="relative pl-6 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-[30px] before:bg-blue-500">
              <div className="text-2xl font-bold text-white mb-1">50+</div>
              <div className="text-[13px] text-text-muted font-medium">Skill Domains</div>
            </div>
          </div>
        </div>

      </main>

      {/* ---------------- 2. THE PROBLEM ---------------- */}
      <section className="py-24 lg:py-32 px-6 lg:px-12 max-w-[1400px] mx-auto border-t border-white/5">
        <div className="mb-20">
          <div className="text-[11px] font-bold text-text-muted tracking-[0.2em] uppercase mb-4">THE PROBLEM</div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white tracking-tight leading-[1.1]">
            Different questions.<br/>One common challenge.
          </h2>
          <p className="text-[17px] text-text-muted max-w-2xl leading-relaxed">
            There's a wealth of information out there, but it's hard to know what really matters.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-10 hover:border-primary/30 transition-colors">
            <h3 className="text-3xl font-bold text-primary mb-8">Students</h3>
            <ul className="space-y-5 text-[15px] text-text-muted">
              <li className="flex gap-4"><span className="text-primary font-bold">⟳</span> What skills do I have?</li>
              <li className="flex gap-4"><span className="text-primary font-bold">→</span> What am I missing?</li>
              <li className="flex gap-4"><span className="text-primary font-bold">✦</span> Where can I go next?</li>
            </ul>
          </div>
          
          <div className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-10 hover:border-blue-500/30 transition-colors">
            <h3 className="text-3xl font-bold text-blue-400 mb-8">Employers</h3>
            <ul className="space-y-5 text-[15px] text-text-muted">
              <li className="flex gap-4"><span className="text-blue-400 font-bold">◎</span> Which skills do we actually need?</li>
              <li className="flex gap-4"><span className="text-blue-400 font-bold">⚡</span> How do we find the right talent faster?</li>
            </ul>
          </div>
          
          <div className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-10 hover:border-purple-500/30 transition-colors">
            <h3 className="text-3xl font-bold text-purple-400 mb-8">Universities</h3>
            <ul className="space-y-5 text-[15px] text-text-muted">
              <li className="flex gap-4"><span className="text-purple-400 font-bold">⟳</span> What should we teach next?</li>
              <li className="flex gap-4"><span className="text-purple-400 font-bold">✦</span> How do we align with industry demand?</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------- 3. HOW SKILLVEDA WORKS ---------------- */}
      <section className="py-24 lg:py-32 px-6 lg:px-12 max-w-[1400px] mx-auto border-t border-white/5">
        <div className="mb-24">
          <div className="text-[11px] font-bold text-primary tracking-[0.2em] uppercase mb-4">HOW SKILLVEDA WORKS</div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white tracking-tight leading-[1.1]">
            From your resume to a real career path.
          </h2>
          <p className="text-[17px] text-text-muted max-w-2xl leading-relaxed">
            Powered by our own SkillVeda NLP engine, we understand your skills, map them to a dynamic skill graph, and help you discover what's next.
          </p>
        </div>

        <div className="relative">
          {/* Horizontal connecting line */}
          <div className="hidden md:block absolute top-[44px] left-[5%] right-[5%] h-[1px] bg-white/10 z-0"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-4 relative z-10">
            {[
              { num: '1', title: 'Upload', desc: 'Resume, job description or syllabus', icon: '📄' },
              { num: '2', title: 'Understand', desc: 'Extract and normalize skills using NLP', icon: '🧠' },
              { num: '3', title: 'Map', desc: 'Connect skills, roles and industry demand', icon: '🕸️' },
              { num: '4', title: 'Compare', desc: 'Find skill gaps and opportunities', icon: '📊' },
              { num: '5', title: 'Build', desc: 'Get a personalized learning roadmap', icon: '🧭' },
            ].map((step) => (
              <div key={step.num} className="flex flex-col items-center text-center">
                <div className="w-[88px] h-[88px] rounded-full bg-[#050914] border border-white/10 flex items-center justify-center text-2xl mb-8 shadow-xl relative group hover:border-primary transition-colors cursor-default">
                  {step.icon}
                  <div className="absolute -bottom-3 -right-1 w-6 h-6 rounded-full bg-[#050914] border border-white/10 flex items-center justify-center text-[10px] font-bold text-text-muted group-hover:text-primary group-hover:border-primary transition-colors">
                    {step.num}
                  </div>
                </div>
                <h4 className="font-bold text-lg mb-3 text-white">{step.title}</h4>
                <p className="text-[14px] text-text-muted px-2">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- 4. YOUR SKILL GRAPH ---------------- */}
      <section className="py-24 lg:py-32 px-6 lg:px-12 max-w-[1400px] mx-auto border-t border-white/5">
        <InteractiveMap />
      </section>

      {/* ---------------- 5. SKILL GAP / CAREER ROADMAP ---------------- */}
      <section className="py-24 lg:py-32 px-6 lg:px-12 max-w-[1400px] mx-auto border-t border-white/5">
        <div className="mb-20">
          <div className="text-[11px] font-bold text-text-muted tracking-[0.2em] uppercase mb-4">FROM SKILL GAP TO CAREER ROADMAP</div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white tracking-tight leading-[1.1]">
            Know where you stand.<br/>Know what to do next.
          </h2>
          <p className="text-[17px] text-text-muted max-w-2xl leading-relaxed">
            See your current skill level, compare it with industry requirements, and get a step-by-step roadmap.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Box 1: Your Skills */}
          <div className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-8 flex flex-col">
            <h3 className="font-bold mb-8 text-[15px] text-white">YOUR SKILLS</h3>
            <div className="space-y-6 flex-1">
              {[
                { name: 'Python', pct: '90%', width: 'w-[90%]', color: 'bg-primary' },
                { name: 'SQL', pct: '80%', width: 'w-[80%]', color: 'bg-cyan-500' },
                { name: 'Machine Learning', pct: '40%', width: 'w-[40%]', color: 'bg-accent' },
                { name: 'PyTorch', pct: '20%', width: 'w-[20%]', color: 'bg-red-500' },
                { name: 'LLM / RAG', pct: '10%', width: 'w-[10%]', color: 'bg-purple-500' },
              ].map(skill => (
                <div key={skill.name}>
                  <div className="flex justify-between text-[13px] font-medium mb-2">
                    <span className="text-white">{skill.name}</span>
                    <span className="text-text-muted">{skill.pct}</span>
                  </div>
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div className={`${skill.color} h-full rounded-full ${skill.width}`}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Box 2: Target Role */}
          <div className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-8 flex flex-col items-center text-center">
            <div className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-2 w-full text-left">TARGET ROLE</div>
            <h3 className="font-bold text-2xl mb-12 w-full text-left text-white">AI Engineer</h3>
            
            <div className="relative w-48 h-48 flex items-center justify-center mb-auto">
              <svg className="w-full h-full -rotate-90 absolute inset-0" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                <circle cx="50" cy="50" r="46" fill="none" stroke="#10B981" strokeWidth="4" strokeDasharray="289" strokeDashoffset="80" strokeLinecap="round" />
              </svg>
              <div className="flex flex-col items-center">
                <span className="text-5xl font-bold text-white tracking-tighter">72%</span>
                <span className="text-[11px] text-text-muted uppercase tracking-widest mt-2">Skill Alignment</span>
              </div>
            </div>
          </div>

          {/* Box 3: Roadmap */}
          <div className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-8 flex flex-col">
            <div className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-8">PERSONALIZED ROADMAP</div>
            
            <div className="space-y-6 flex-1 relative">
              <div className="absolute left-[3.5px] top-2 bottom-2 w-px bg-white/10 z-0"></div>
              
              {[
                { name: 'Python', stat: 'Completed', color: 'text-primary' },
                { name: 'Machine Learning', stat: '4–6 weeks', color: 'text-text-muted' },
                { name: 'PyTorch', stat: '4 weeks', color: 'text-text-muted' },
                { name: 'LLM / RAG', stat: '4–6 weeks', color: 'text-text-muted' },
              ].map((item, idx) => (
                <div key={item.name} className="flex items-start gap-4 relative z-10">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${item.stat === 'Completed' ? 'bg-primary' : 'bg-white/20'}`}></div>
                  <div className="flex-1">
                    <div className="text-[15px] font-medium text-white mb-0.5">{item.name}</div>
                    <div className={`text-[13px] ${item.color}`}>— {item.stat}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ---------------- 6. FINAL CTA ---------------- */}
      <section className="bg-[#0a0908] border-t border-white/5 py-32 px-6 lg:px-12">
        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-start justify-between gap-16">
          <div className="max-w-xl">
            <div className="text-[11px] font-bold text-text-muted tracking-[0.2em] uppercase mb-6">
              YOUR NEXT CHAPTER STARTS HERE
            </div>
            <h2 className="text-5xl md:text-6xl font-bold mb-6 text-white tracking-tight leading-[1.05]">
              Stop guessing what to<br/>learn next.
            </h2>
            <p className="text-[18px] text-[#a39a8c] mb-12">
              See your skills. Find your gaps. Build your path.
            </p>
            <Link href="/dashboard" className="bg-primary hover:bg-primary-hover text-[#022c22] font-bold px-8 py-4 rounded-full transition-all inline-flex items-center gap-2 text-[15px]">
              Discover My Skill Graph →
            </Link>
          </div>
          
          <div className="text-left lg:text-right pt-4 lg:pt-0">
            <h2 className="text-4xl md:text-6xl italic font-serif text-[#a39a8c] mb-2 font-light">Skills</h2>
            <h2 className="text-4xl md:text-6xl italic font-serif text-white mb-2 font-light">for a brighter</h2>
            <h2 className="text-4xl md:text-6xl italic font-serif text-white flex items-center justify-start lg:justify-end gap-4 font-light">
              Bharat. 
              <span className="text-primary not-italic inline-block -translate-y-1">✦</span>
            </h2>
          </div>
        </div>
      </section>
      
    </div>
  );
}
