import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "SkillVeda | Student Portal",
  description: "AI-Powered Skill Intelligence for Bharat",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-text-main antialiased w-full">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-surface flex flex-col h-full shrink-0 relative z-20">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight text-white">SkillVeda</span>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <NavItem label="Home" active />
          <NavItem label="Skill Graph" />
          <NavItem label="Skill Gap" />
          <NavItem label="Roadmap" />
          <NavItem label="Jobs" />
          <NavItem label="Courses" />
          <div className="pt-4 pb-2">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider px-3">Tools</div>
          </div>
          <NavItem label="NLP Analyzer" />
          <NavItem label="Community" />
        </div>

        {/* Target Role Selector */}
        <div className="p-4 border-t border-border">
          <div className="text-xs text-text-muted mb-2 px-1">Target Role</div>
          <div className="bg-background border border-border rounded-lg p-3 flex justify-between items-center cursor-pointer hover:border-primary transition-colors">
            <span className="font-semibold text-sm">AI Engineer</span>
            <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">Change</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative">
        {/* Top Header */}
        <header className="h-16 border-b border-border bg-surface/50 backdrop-blur-md flex items-center justify-between px-8 absolute top-0 left-0 right-0 z-10">
          <div className="flex-1 max-w-lg relative">
            <svg className="w-4 h-4 absolute left-3 top-3 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search skills, roles, courses..." 
              className="w-full bg-background border border-border rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center">🔔</div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center font-bold text-primary">R</div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto pt-16 p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

// Helper component for nav items
function NavItem({ label, active = false }: { label: string, active?: boolean }) {
  return (
    <a href="#" className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      active 
        ? "bg-primary text-white" 
        : "text-text-muted hover:bg-surface-hover hover:text-white"
    }`}>
      {label}
    </a>
  );
}
