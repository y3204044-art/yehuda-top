import React, { useState } from 'react';
import { PageData } from '../types';
import { TextRenderer } from './TextRenderer';
import { ScanLine, AlertTriangle, Loader2, Sparkles, ZoomIn, ZoomOut } from 'lucide-react';

interface WorkspaceProps {
  page: PageData | null;
  highResImage: string | null;
}

export const Workspace: React.FC<WorkspaceProps> = ({ page, highResImage }) => {
  const [isZoomed, setIsZoomed] = useState(false);

  if (!page) {
    return (
      <div className="flex-1 glass-panel rounded-3xl flex items-center justify-center relative overflow-hidden">
        <div className="text-center flex flex-col items-center gap-8 relative z-10">
          <div className="flex gap-6 mb-2">
            {/* Deep vivid colors for the cute rolling balls */}
            <div className="w-10 h-10 rounded-full bg-[#0D47A1] shadow-[0_0_25px_rgba(13,71,161,0.8)] animate-roll-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-10 h-10 rounded-full bg-[#FFD600] shadow-[0_0_25px_rgba(255,214,0,0.8)] animate-roll-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-10 h-10 rounded-full bg-[#00C853] shadow-[0_0_25px_rgba(0,200,83,0.8)] animate-roll-bounce" style={{ animationDelay: '300ms' }}></div>
            <div className="w-10 h-10 rounded-full bg-[#D50000] shadow-[0_0_25px_rgba(213,0,0,0.8)] animate-roll-bounce" style={{ animationDelay: '450ms' }}></div>
            <div className="w-10 h-10 rounded-full bg-[#AA00FF] shadow-[0_0_25px_rgba(170,0,255,0.8)] animate-roll-bounce" style={{ animationDelay: '600ms' }}></div>
          </div>
          <div className="text-white/80 text-2xl font-light tracking-wide">
            המערכת מוכנה. ממתין לקובץ...
          </div>
        </div>
      </div>
    );
  }

  const renderScanningOverlay = () => {
    if (!page.layout) return null;
    
    let activeColumn = null;
    let colorTheme = '';
    
    if (page.status === 'extracting_right') {
      activeColumn = page.layout.rightColumn;
      colorTheme = 'cyan';
    }
    if (page.status === 'extracting_left') {
      activeColumn = page.layout.leftColumn;
      colorTheme = 'magenta';
    }

    if (!activeColumn) return null;

    const leftPercent = activeColumn.startX * 100;
    const widthPercent = (activeColumn.endX - activeColumn.startX) * 100;

    const bgGradient = colorTheme === 'cyan' ? 'from-spectrum-cyan/40 to-transparent' : 'from-spectrum-magenta/40 to-transparent';
    const lineColor = colorTheme === 'cyan' ? 'bg-spectrum-cyan shadow-[0_0_30px_#00E5FF]' : 'bg-spectrum-magenta shadow-[0_0_30px_#D500F9]';
    const borderColor = colorTheme === 'cyan' ? 'border-spectrum-cyan/50' : 'border-spectrum-magenta/50';

    return (
      <div 
        className={`absolute top-0 bottom-0 z-20 pointer-events-none border-x ${borderColor} bg-black/20 mix-blend-screen`}
        style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
      >
        <div className="absolute w-full h-full overflow-hidden">
           <div className={`absolute w-full h-40 bg-gradient-to-b ${bgGradient} animate-scan-vertical`}></div>
           <div className={`absolute w-full h-1 ${lineColor} animate-scan-vertical`}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex gap-4 h-full overflow-hidden">
      {/* Image Panel (Right Side) */}
      <div className="w-1/2 h-full glass-panel rounded-3xl p-6 flex flex-col relative overflow-hidden">
        <div className="flex justify-between items-center mb-4 relative z-10">
          <h2 className="text-xl font-medium text-white flex items-center gap-3">
            <ScanLine className="w-5 h-5 text-spectrum-cyan" />
            מקור (עמוד {page.pageNumber})
          </h2>
          <button 
            onClick={() => setIsZoomed(!isZoomed)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-colors text-sm font-medium border shadow-lg ${
              isZoomed 
                ? 'bg-spectrum-cyan/20 text-spectrum-cyan border-spectrum-cyan/50' 
                : 'bg-white/10 hover:bg-white/20 text-white/90 border-white/10'
            }`}
            title={isZoomed ? "הקטן תצוגה" : "הגדל תצוגה"}
          >
            {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
            {isZoomed ? 'הקטן' : 'הגדל'}
          </button>
        </div>
        
        {/* Image Container - Scrolls if zoomed */}
        <div className={`flex-1 relative rounded-2xl overflow-auto custom-scrollbar bg-black/40 border border-white/10 p-4 z-10 flex ${isZoomed ? 'items-start justify-start' : 'items-center justify-center'}`}>
          <div className={`relative inline-block rounded-lg overflow-hidden shadow-2xl shrink-0 ${isZoomed ? 'w-[200%] max-w-none' : 'max-w-full max-h-full'}`}>
            {!highResImage && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-20">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-10 h-10 text-spectrum-cyan animate-spin" />
                  <span className="text-white font-medium">מעבד תמונה...</span>
                </div>
              </div>
            )}
            <img 
              src={highResImage || page.thumbnail} 
              alt="Original" 
              className={`block transition-opacity duration-700 ${!highResImage ? 'opacity-40 blur-sm' : 'opacity-100'} ${isZoomed ? 'w-full h-auto' : 'max-w-full max-h-full w-auto h-auto'}`}
            />
            {renderScanningOverlay()}
            
            {/* Layout Debug Overlay */}
            {page.layout && page.status !== 'extracting_right' && page.status !== 'extracting_left' && (
              <>
                <div className="absolute top-0 bottom-0 border-x border-spectrum-cyan/40 bg-spectrum-cyan/10 pointer-events-none mix-blend-screen" style={{ left: `${page.layout.rightColumn.startX * 100}%`, width: `${(page.layout.rightColumn.endX - page.layout.rightColumn.startX) * 100}%` }} />
                <div className="absolute top-0 bottom-0 border-x border-spectrum-magenta/40 bg-spectrum-magenta/10 pointer-events-none mix-blend-screen" style={{ left: `${page.layout.leftColumn.startX * 100}%`, width: `${(page.layout.leftColumn.endX - page.layout.leftColumn.startX) * 100}%` }} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Text Panel (Left Side) */}
      <div className="w-1/2 h-full glass-panel rounded-3xl p-6 flex flex-col relative overflow-hidden">
        <h2 className="text-xl font-medium mb-4 text-white flex items-center gap-3 relative z-10">
          <Sparkles className="w-5 h-5 text-spectrum-yellow" />
          טקסט מפוענח
        </h2>
        
        {page.error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/40 rounded-2xl flex items-start gap-3 text-red-200 relative z-10">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="font-medium">{page.error}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto bg-black/40 rounded-2xl border border-white/10 p-8 custom-scrollbar relative z-10">
          <div className="max-w-2xl mx-auto space-y-12">
            {/* Right Column Text */}
            <div className={`transition-all duration-700 ${!page.rightText && page.status !== 'extracting_right' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
              <div className="text-sm text-spectrum-cyan mb-4 font-bold flex items-center gap-3 border-b border-white/10 pb-3">
                <span className="w-3 h-3 rounded-full bg-spectrum-cyan shadow-[0_0_12px_#00E5FF]" />
                טור ימין
              </div>
              <div className="text-white/90">
                <TextRenderer text={page.rightText} />
                {page.status === 'extracting_right' && (
                  <span className="inline-block w-2.5 h-6 bg-spectrum-cyan animate-pulse ml-2 align-middle rounded-full shadow-[0_0_12px_#00E5FF]" />
                )}
              </div>
            </div>

            {/* Left Column Text */}
            <div className={`transition-all duration-700 ${!page.leftText && page.status !== 'extracting_left' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
              <div className="text-sm text-spectrum-magenta mb-4 font-bold flex items-center gap-3 border-b border-white/10 pb-3 mt-8">
                <span className="w-3 h-3 rounded-full bg-spectrum-magenta shadow-[0_0_12px_#D500F9]" />
                טור שמאל
              </div>
              <div className="text-white/90">
                <TextRenderer text={page.leftText} />
                {page.status === 'extracting_left' && (
                  <span className="inline-block w-2.5 h-6 bg-spectrum-magenta animate-pulse ml-2 align-middle rounded-full shadow-[0_0_12px_#D500F9]" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
