import React from 'react';
import { PageData } from '../types';
import { CheckCircle2, CircleDashed, Loader2, AlertTriangle, Cpu } from 'lucide-react';

interface SidebarProps {
  pages: PageData[];
  activePageId: string | null;
  onSelectPage: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ pages, activePageId, onSelectPage }) => {
  const getStatusIcon = (status: PageData['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-neon-green drop-shadow-[0_0_5px_rgba(57,255,20,0.8)]" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" />;
      case 'pending': return <CircleDashed className="w-4 h-4 text-neon-cyan/40" />;
      default: return <Loader2 className="w-4 h-4 text-neon-magenta animate-spin drop-shadow-[0_0_5px_rgba(255,0,255,0.8)]" />;
    }
  };

  const getStatusText = (status: PageData['status']) => {
    switch (status) {
      case 'pending': return 'AWAITING';
      case 'detecting': return 'MAPPING';
      case 'extracting_right': return 'SCAN: R-COL';
      case 'extracting_left': return 'SCAN: L-COL';
      case 'completed': return 'VERIFIED';
      case 'error': return 'SYS.ERROR';
    }
  };

  return (
    <div className="w-80 glass-panel border-r border-neon-cyan/20 flex flex-col h-full relative z-20">
      {/* Header */}
      <div className="p-5 border-b border-neon-cyan/20 flex items-center gap-4 bg-neon-cyan/5">
        <div className="relative">
          <div className="absolute inset-0 bg-neon-cyan blur-md opacity-40"></div>
          <Cpu className="w-8 h-8 text-neon-cyan relative z-10" />
        </div>
        <div>
          <h1 className="font-tech font-bold text-2xl text-white tracking-widest text-glow-cyan leading-none">NEXUS<span className="text-neon-cyan">OCR</span></h1>
          <p className="text-[10px] font-tech text-neon-cyan/70 tracking-[0.2em] uppercase mt-1">v2080.4 // Online</p>
        </div>
      </div>
      
      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {pages.length === 0 ? (
          <div className="text-center mt-10 font-tech">
            <div className="inline-block p-3 border border-neon-cyan/30 bg-neon-cyan/5 text-neon-cyan/70 tracking-widest text-sm">
              NO DATA STREAM DETECTED<br/>AWAITING INPUT
            </div>
          </div>
        ) : (
          pages.map((page) => {
            const isActive = activePageId === page.id;
            return (
              <button
                key={page.id}
                onClick={() => onSelectPage(page.id)}
                className={`w-full text-right flex items-center gap-3 p-2 transition-all duration-200 relative group ${
                  isActive 
                    ? 'bg-neon-cyan/10 border-l-2 border-neon-cyan' 
                    : 'bg-transparent border-l-2 border-transparent hover:bg-white/5 hover:border-white/20'
                }`}
              >
                {/* Active Glow Background */}
                {isActive && <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/20 to-transparent pointer-events-none"></div>}

                {/* Thumbnail */}
                <div className={`relative w-12 h-16 bg-neon-dark overflow-hidden shrink-0 border ${isActive ? 'border-neon-cyan shadow-[0_0_10px_rgba(0,243,255,0.3)]' : 'border-white/10'}`}>
                  <img src={page.thumbnail} alt={`Page ${page.pageNumber}`} className="w-full h-full object-cover opacity-70 mix-blend-luminosity" />
                  <div className="absolute inset-0 bg-neon-cyan/10 mix-blend-overlay"></div>
                  <span className="absolute bottom-0.5 right-1 text-[9px] font-tech font-bold text-white bg-black/50 px-1">
                    {page.pageNumber.toString().padStart(3, '0')}
                  </span>
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0 relative z-10">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-tech font-semibold text-sm tracking-wider truncate ${isActive ? 'text-neon-cyan text-glow-cyan' : 'text-slate-300'}`}>
                      PAGE_{page.pageNumber.toString().padStart(3, '0')}
                    </span>
                    {getStatusIcon(page.status)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-tech tracking-widest uppercase ${
                      page.status === 'error' ? 'text-red-400' : 
                      page.status === 'completed' ? 'text-neon-green' : 
                      isActive ? 'text-neon-cyan/80' : 'text-slate-500'
                    }`}>
                      {getStatusText(page.status)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
