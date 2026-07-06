import React from 'react';
import { PageData } from '../types';
import { TextRenderer } from './TextRenderer';
import { ScanLine, AlertTriangle, Loader2, Terminal, Crosshair } from 'lucide-react';

interface WorkspaceProps {
  page: PageData | null;
  highResImage: string | null;
}

export const Workspace: React.FC<WorkspaceProps> = ({ page, highResImage }) => {
  if (!page) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neon-dark/80 relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgwLCAyNDMsIDI1NSwgMC4xKSIvPjwvc3ZnPg==')] opacity-50"></div>
        <div className="text-center flex flex-col items-center gap-6 relative z-10">
          <div className="relative">
            <Crosshair className="w-24 h-24 text-neon-cyan/20 animate-[spin_10s_linear_infinite]" />
            <ScanLine className="w-12 h-12 text-neon-cyan absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50" />
          </div>
          <div className="font-tech tracking-[0.3em] text-neon-cyan/50 text-lg">
            SYSTEM STANDBY<br/>AWAITING TARGET ACQUISITION
          </div>
        </div>
      </div>
    );
  }

  const renderScanningOverlay = () => {
    if (!page.layout) return null;
    
    let activeColumn = null;
    let colorClass = '';
    
    if (page.status === 'extracting_right') {
      activeColumn = page.layout.rightColumn;
      colorClass = 'neon-cyan';
    }
    if (page.status === 'extracting_left') {
      activeColumn = page.layout.leftColumn;
      colorClass = 'neon-magenta';
    }

    if (!activeColumn) return null;

    const leftPercent = activeColumn.startX * 100;
    const widthPercent = (activeColumn.endX - activeColumn.startX) * 100;

    return (
      <div 
        className="absolute top-0 bottom-0 z-20 pointer-events-none"
        style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
      >
        {/* Highlight Area */}
        <div className={`