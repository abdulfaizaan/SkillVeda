'use client';

import React, { useState } from 'react';

type NodeData = {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  category: string;
  icon?: string;
  isCenter?: boolean;
};

const mapNodes: NodeData[] = [
  { id: 'python', label: 'Python', x: 50, y: 50, color: '#10B981', category: 'Data Science', isCenter: true },
  { id: 'ml', label: 'Machine Learning', x: 25, y: 35, color: '#F59E0B', category: 'AI/ML' },
  { id: 'dl', label: 'Deep Learning', x: 80, y: 25, color: '#8B5CF6', category: 'AI/ML' },
  { id: 'fastapi', label: 'FastAPI', x: 85, y: 50, color: '#0EA5E9', category: 'Web Development', icon: '🔌' },
  { id: 'django', label: 'Django', x: 80, y: 75, color: '#10B981', category: 'Web Development', icon: '🌍' },
  { id: 'backend', label: 'Backend Developer', x: 70, y: 95, color: '#EF4444', category: 'Web Development', icon: '👤' },
  { id: 'webdev', label: 'Web Development', x: 25, y: 75, color: '#3B82F6', category: 'Web Development' },
  { id: 'ds', label: 'Data Science', x: 50, y: 15, color: '#6366f1', category: 'Data Science' },
];

const categories = ['All', 'AI/ML', 'Data Science', 'Web Development', 'Cybersecurity', 'Cloud'];

export default function InteractiveMap() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const filteredNodes = mapNodes.filter(node => {
    const matchesSearch = node.label.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || node.category === activeCategory;
    // Always show center node for context, unless search explicitly excludes it (actually better to always show it)
    return (matchesSearch && matchesCategory) || node.isCenter;
  });

  const visibleNodeIds = new Set(filteredNodes.map(n => n.id));

  return (
    <div className="flex flex-col lg:flex-row items-center gap-16 w-full">
      
      {/* Left: Search & Categories */}
      <div className="w-full lg:w-5/12 flex flex-col">
        <div className="inline-flex items-center mb-6 text-[11px] font-bold text-text-muted tracking-[0.2em] uppercase border border-white/5 bg-white/5 px-3 py-1 rounded self-start">
          Your Skill Graph
        </div>
        
        <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white tracking-tight leading-[1.1]">
          An interactive map of<br />skills, roles, courses and<br />opportunities.
        </h2>
        
        <p className="text-[17px] text-text-muted mb-10 max-w-md leading-relaxed">
          Explore how skills are connected, see what's in demand, and discover new possibilities.
        </p>
        
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="w-full bg-[#0a0f1c] border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors text-[15px]"
            placeholder="Search for a skill, role or domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2.5">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full border text-[13px] font-medium transition-colors ${
                activeCategory === cat 
                ? 'border-primary bg-primary/10 text-primary' 
                : 'border-white/10 bg-transparent text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
          <button className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-[13px] font-medium text-white hover:bg-white/10 transition-colors">
            + More
          </button>
        </div>
      </div>

      {/* Right: The Graph */}
      <div className="w-full lg:w-7/12 relative h-[500px]">
        <svg className="absolute inset-0 w-full h-full z-0 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {mapNodes.filter(n => !n.isCenter).map(node => {
            const isVisible = visibleNodeIds.has(node.id) && visibleNodeIds.has('python');
            const isHovered = hoveredNode === node.id || hoveredNode === 'python';
            if (!isVisible) return null;
            
            return (
              <line 
                key={`line-${node.id}`}
                x1="50" y1="50" 
                x2={node.x} y2={node.y} 
                stroke={node.color} 
                strokeWidth={isHovered ? 0.3 : 0.15}
                strokeDasharray="1 1"
                opacity={isHovered ? 0.8 : 0.3}
                className="transition-all duration-300"
              />
            );
          })}
        </svg>

        {mapNodes.map(node => {
          if (!visibleNodeIds.has(node.id)) return null;
          
          const isHovered = hoveredNode === node.id;
          
          if (node.isCenter) {
            return (
              <div 
                key={node.id}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                className={`absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[110px] h-[110px] rounded-full bg-[#050914] flex items-center justify-center cursor-pointer transition-all duration-300 z-20 ${isHovered ? 'border-2 scale-105 shadow-[0_0_30px_rgba(16,185,129,0.4)]' : 'border border-primary shadow-[0_0_20px_rgba(16,185,129,0.2)]'}`}
                style={{ borderColor: node.color }}
              >
                <span className="font-bold text-white text-lg">Python</span>
              </div>
            );
          }

          return (
            <div 
              key={node.id}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              className={`absolute px-5 py-2.5 rounded-full bg-[#050914] cursor-pointer transition-all duration-300 z-10 flex items-center justify-center text-[13px] font-medium border ${isHovered ? 'scale-110 z-30' : ''}`}
              style={{ 
                top: `${node.y}%`, 
                left: `${node.x}%`, 
                transform: 'translate(-50%, -50%)',
                borderColor: isHovered ? node.color : `${node.color}40`,
                color: isHovered ? '#fff' : node.color,
                backgroundColor: isHovered ? `${node.color}15` : '#050914',
                boxShadow: isHovered ? `0 0 15px ${node.color}40` : 'none'
              }}
            >
              {node.icon && <span className="mr-2">{node.icon}</span>}
              {node.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
