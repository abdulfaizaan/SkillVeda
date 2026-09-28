'use client';

import React, { useState } from 'react';

type NodeData = {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  isCenter?: boolean;
  isMain?: boolean; // Main nodes get thick glowing borders
  details: string;
};

// Exact nodes based on the reference Image 2
const nodes: NodeData[] = [
  { id: 'ai', label: 'AI Engineer', x: 50, y: 50, color: '#3B82F6', isCenter: true, details: 'The core role integrating data, models, and deployment.' },
  
  // Main Glowing Nodes (Pill shapes)
  { id: 'python', label: 'Python', x: 50, y: 15, color: '#2dd4bf', isMain: true, details: 'Primary language for AI/ML ecosystems.' }, // Cyan
  { id: 'ml', label: 'Machine\nLearning', x: 25, y: 35, color: '#f59e0b', isMain: true, details: 'Algorithms that learn patterns from data.' }, // Amber
  { id: 'sql', label: 'SQL', x: 20, y: 65, color: '#2dd4bf', isMain: true, details: 'Essential for data querying and extraction.' }, // Cyan
  { id: 'llm', label: 'LLM / RAG', x: 80, y: 35, color: '#a855f7', isMain: true, details: 'Large Language Models and Retrieval-Augmented Generation.' }, // Purple
  { id: 'pytorch', label: 'PyTorch', x: 80, y: 65, color: '#ef4444', isMain: true, details: 'Deep learning framework favored by researchers.' }, // Red/Orange
  
  // Secondary Nodes (Dimmer borders)
  { id: 'ds', label: 'Data Science', x: 25, y: 15, color: '#94a3b8', isMain: false, details: 'Extracting knowledge and insights from noisy data.' },
  { id: 'dl', label: 'Deep Learning', x: 85, y: 15, color: '#94a3b8', isMain: false, details: 'Neural networks with multiple layers.' },
  { id: 'mlops', label: 'MLOps', x: 35, y: 85, color: '#94a3b8', isMain: false, details: 'Machine Learning Operations and deployment.' },
  { id: 'cloud', label: 'Cloud', x: 70, y: 85, color: '#94a3b8', isMain: false, details: 'AWS, GCP, Azure infrastructure.' },
];

export default function HeroGraph() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [activeNode, setActiveNode] = useState<string | null>('ai');

  // Helper to generate a curved path from center (50,50) to the target node
  const getCurve = (x: number, y: number) => {
    const dx = x - 50;
    const dy = y - 50;
    // Control point to give it a slight curve
    const cx = 50 + dx * 0.5 - dy * 0.2;
    const cy = 50 + dy * 0.5 + dx * 0.2;
    return `M 50 50 Q ${cx} ${cy} ${x} ${y}`;
  };

  return (
    <div className="relative w-full h-[600px] select-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
        {/* SVG Connecting Curves & Glowing Dots */}
        <svg className="absolute inset-0 w-full h-full z-0 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {nodes.filter(n => !n.isCenter).map(node => {
            const isHovered = hoveredNode === node.id || hoveredNode === 'ai';
            const isActive = activeNode === node.id || activeNode === 'ai';
            const isHighlighted = isHovered || isActive;
            
            return (
              <g key={`connection-${node.id}`}>
                {/* Curved Line */}
                <path 
                  d={getCurve(node.x, node.y)}
                  fill="none"
                  stroke={node.isMain ? node.color : '#475569'} 
                  strokeWidth={isHighlighted ? 0.4 : 0.2}
                  strokeDasharray={node.isMain ? "none" : "1 1"}
                  opacity={isHighlighted ? 0.9 : 0.4}
                  className="transition-all duration-300 ease-in-out"
                />
                {/* Glowing Dot at the node end */}
                <circle 
                  cx={node.x} 
                  cy={node.y} 
                  r={isHighlighted ? 1.5 : 1} 
                  fill={node.isMain ? node.color : '#475569'}
                  className="transition-all duration-300"
                  style={{ filter: isHighlighted && node.isMain ? `drop-shadow(0 0 4px ${node.color})` : 'none' }}
                />
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map(node => {
          const isHovered = hoveredNode === node.id;
          const isActive = activeNode === node.id;
          const isHighlighted = isHovered || isActive;
          
          if (node.isCenter) {
            return (
              <div 
                key={node.id}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => setActiveNode(node.id)}
                className={`absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[140px] h-[140px] rounded-full bg-[#050B14]/90 backdrop-blur-md flex flex-col items-center justify-center cursor-pointer transition-all duration-300 z-30 ${isHighlighted ? 'border-4 scale-105 shadow-[0_0_50px_rgba(59,130,246,0.8),inset_0_0_20px_rgba(59,130,246,0.5)]' : 'border-2 border-blue-500/80 shadow-[0_0_30px_rgba(59,130,246,0.5)]'}`}
                style={{ borderColor: node.color }}
              >
                <span className="font-bold text-xl text-white">AI</span>
                <span className="font-bold text-xl text-white">Engineer</span>
              </div>
            );
          }

          return (
            <div 
              key={node.id}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => setActiveNode(node.id)}
              className={`absolute flex items-center justify-center cursor-pointer transition-all duration-300 z-20 text-center backdrop-blur-md
                ${node.isMain 
                  ? `px-6 py-3 rounded-full border-2 font-bold text-[15px] bg-[#050B14]/80 ${isHighlighted ? 'scale-110 z-40' : ''}`
                  : `px-4 py-2 rounded-full border text-[13px] font-medium bg-[#050B14]/60 ${isHighlighted ? 'scale-110 border-white text-white z-40' : 'border-slate-700 text-slate-300'}`
                }
              `}
              style={{ 
                top: `${node.y}%`, 
                left: `${node.x}%`, 
                transform: 'translate(-50%, -50%)',
                borderColor: node.isMain ? node.color : undefined,
                color: node.isMain ? (isHighlighted ? '#fff' : node.color) : undefined,
                boxShadow: node.isMain ? (isHighlighted ? `0 0 25px ${node.color}80, inset 0 0 10px ${node.color}40` : `0 0 15px ${node.color}30`) : 'none',
                whiteSpace: 'pre-line'
              }}
            >
              {node.label}
              
              {/* Tooltip for outer nodes */}
              {(isActive) && (
                <div className="absolute top-[130%] left-1/2 -translate-x-1/2 w-48 bg-[#0f172a]/95 border border-white/20 p-3 rounded-xl shadow-2xl pointer-events-none text-left z-50 backdrop-blur-xl">
                  <p className="text-[13px] text-white/90 leading-relaxed font-normal">{node.details}</p>
                </div>
              )}
            </div>
          );
        })}
        
        {/* Center Node Tooltip (when active but no outer node is hovered, or if strictly active) */}
        {activeNode === 'ai' && (
          <div className="absolute top-[50%] left-[50%] translate-x-[90px] -translate-y-1/2 w-48 bg-[#0f172a]/95 border border-blue-500/30 p-3 rounded-xl shadow-[0_0_30px_rgba(59,130,246,0.2)] pointer-events-none z-40 hidden md:block backdrop-blur-xl">
            <p className="text-[13px] text-white/90 leading-relaxed">The core role integrating data, models, and deployment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
