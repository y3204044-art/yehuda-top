import React, { useState } from 'react';
import { PageData } from '../types';
import { CheckCircle2, CircleDashed, Loader2, AlertTriangle, Gem } from 'lucide-react';

interface SidebarProps {
  pages: PageData[];
  activePageId: string | null;
  onSelectPage: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ pages, activePageId, onSelectPage }) => {
  const [imageError, setImageError] = useState(false);

  const getStatusIcon = (status: PageData['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-spectrum-green drop-shadow-[0_0_8px_rgba(0,230,118,0.8)]" />;
      case 'error': return <AlertTriangle className="w-5 h-5 text-spectrum-red drop-shadow-[0_0_8px_rgba(255,51,102,0.8)]" />;
      case 'pending': return <CircleDashed className="w-5 h-5 text-white/30" />;
      default: return <Loader2 className="w-5 h-5 text-spectrum-cyan animate-spin drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]" />;
    }
  };

  const getStatusText = (status: PageData['status']) => {
    switch (status) {
      case 'pending': return 'ממתין';
      case 'detecting': return 'מזהה מבנה';
      case 'extracting_right': return 'סורק טור ימין';
      case 'extracting_left': return 'סורק טור שמאל';
      case 'completed': return 'הושלם';
      case 'error': return 'שגיאה';
    }
  };

  return (
    <div className="w-80 glass-panel rounded-3xl flex flex-col h-full overflow-hidden">
      <div className="p-5 border-b border-white/10 flex items-center gap-4 bg-black/20">
        {/* Portrait Image with Fallback */}
        <div className="relative shrink-0 w-14 h-14 flex items-center justify-center">
          <div className="absolute inset-0 bg-spectrum-cyan rounded-full blur-md opacity-40 animate-pulse"></div>
          {!imageError ? (
            <img 
              src="https://commons.wikimedia.org/wiki/Special:FilePath/%D7%A8%27_%D7%A8%D7%90%D7%95%D7%91%D7%9F_%D7%9E%D7%A8%D7%92%D7%9C%D7%99%D7%95%D7%AA.jpg" 
              alt="Portrait" 
              className="w-14 h-14 rounded-full object-cover object-top border-2 border-spectrum-cyan relative z-10 shadow-[0_0_15px_rgba(0,229,255,0.6)]"
              onError={() => setImageError(true)}
            />
          ) : (
            <Gem className="w-8 h-8 text-white relative z-10 drop-shadow-[0_0_12px_rgba(0,229,255,0.9)]" />
          )}
        </div>
        
        <div className="flex flex-col justify-center">
          <h1 className="font-bold text-xl text-white tracking-wide leading-tight">אשכח מרגניתא</h1>
          <div className="text-[10px] font-bold mt-1 tracking-wider relative z-20 flex flex-col">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-spectrum-magenta via-spectrum-cyan to-spectrum-yellow drop-shadow-[0_0_2px_rgba(255,255,255,0.2)]">
              פותח ע"י י. א 
            </span>
            <a 
              href="mailto:Y3204044@GMAIL.COM" 
              className="text-spectrum-cyan hover:text-white hover:underline transition-colors drop-shadow-[0_0_2px_rgba(0,229,255,0.5)] cursor-pointer mt-0.5"
            >
              Y3204044@GMAIL.COM
            </a>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {pages.length === 0 ? (
          <div className="text-center mt-10 text-white/40">
            <div className="inline-block p-6 rounded-3xl border border-dashed border-white/20 bg-black/20">
              לא נטענו עמודים.<br/>העלה קובץ PDF או תמונה כדי להתחיל.
            </div>
          </div>
        ) : (
          pages.map((page) => {
            const isActive = activePageId === page.id;
            return (
              <button
                key={page.id}
                onClick={() => onSelectPage(page.id)}
                className={`w-full text-right flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 border ${
                  isActive 
                    ? 'bg-white/10 border-white/30 shadow-lg' 
                    : 'bg-transparent border-transparent hover:bg-white/5'
                }`}
              >
                <div className={`relative w-14 h-20 rounded-xl bg-black/60 overflow-hidden shrink-0 border transition-colors ${isActive ? 'border-spectrum-cyan' : 'border-white/10'}`}>
                  <img src={page.thumbnail} alt={`Page ${page.pageNumber}`} className="w-full h-full object-cover opacity-90" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <span className="absolute bottom-1.5 right-2 text-xs font-bold text-white">
                    {page.pageNumber}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold text-sm truncate transition-colors ${isActive ? 'text-white' : 'text-white/70'}`}>
                      עמוד {page.pageNumber}
                    </span>
                    {getStatusIcon(page.status)}
                  </div>
                  <span className={`text-xs font-medium transition-colors ${
                    page.status === 'error' ? 'text-spectrum-red' : 
                    page.status === 'completed' ? 'text-spectrum-green' : 
                    isActive ? 'text-spectrum-cyan' : 'text-white/40'
                  }`}>
                    {getStatusText(page.status)}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
