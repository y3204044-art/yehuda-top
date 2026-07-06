import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PageData } from './types';
import { loadPdfDocument, renderPageToImage } from './services/pdfService';
import { extractTextStream } from './services/geminiService';
import { cropImage, detectColumnsProgrammatically } from './utils/imageUtils';
import { exportToDocx } from './services/exportService';
import { Sidebar } from './components/Sidebar';
import { Workspace } from './components/Workspace';
import { Upload, Play, Pause, Download, Loader2, Cpu } from 'lucide-react';

const App: React.FC = () => {
  const [pages, setPages] = useState<PageData[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [activeHighResImage, setActiveHighResImage] = useState<string | null>(null);
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
  
  const processingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfDocRef = useRef<any>(null);
  const pagesRef = useRef<PageData[]>([]);

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtractingPdf(true);
    try {
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
      }

      const pdf = await loadPdfDocument(file);
      pdfDocRef.current = pdf;
      const numPages = pdf.numPages;
      const newPages: PageData[] = [];

      for (let i = 1; i <= numPages; i++) {
        const thumb = await renderPageToImage(pdf, i, 0.4);
        newPages.push({
          id: `page-${Date.now()}-${i}`,
          pageNumber: i,
          thumbnail: thumb,
          status: 'pending',
          rightText: '',
          leftText: ''
        });
        setPdfProgress({ current: i, total: numPages });
        
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      setPages(newPages);
      if (newPages.length > 0) {
        setActivePageId(newPages[0].id);
      }
    } catch (error) {
      console.error("PDF Extraction Error:", error);
      alert("שגיאה בטעינת קובץ ה-PDF. ודא שהקובץ תקין.");
    } finally {
      setIsExtractingPdf(false);
      setPdfProgress({ current: 0, total: 0 });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadHighRes = async () => {
      if (activePageId && pdfDocRef.current) {
        setActiveHighResImage(null);
        const page = pagesRef.current.find(p => p.id === activePageId);
        if (page) {
          try {
            const highRes = await renderPageToImage(pdfDocRef.current, page.pageNumber, 1.5);
            if (isMounted) setActiveHighResImage(highRes);
          } catch (e) {
            console.error("Failed to load high res image for viewing", e);
          }
        }
      }
    };
    loadHighRes();
    return () => { isMounted = false; };
  }, [activePageId]);

  const updatePage = useCallback((id: string, updates: Partial<PageData>) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const processPage = useCallback(async (page: PageData) => {
    if (!pdfDocRef.current) return;
    
    processingRef.current = true;
    setActivePageId(page.id);

    try {
      updatePage(page.id, { status: 'detecting', error: undefined });
      const ocrImageBase64 = await renderPageToImage(pdfDocRef.current, page.pageNumber, 2.5);

      const layout = await detectColumnsProgrammatically(ocrImageBase64);
      updatePage(page.id, { layout });

      updatePage(page.id, { status: 'extracting_right' });
      const rightImgBase64 = await cropImage(ocrImageBase64, layout.rightColumn.startX, layout.rightColumn.endX);
      
      await extractTextStream(rightImgBase64, (chunk) => {
        setPages(prev => prev.map(p => p.id === page.id ? { ...p, rightText: p.rightText + chunk } : p));
      });

      updatePage(page.id, { status: 'extracting_left' });
      const leftImgBase64 = await cropImage(ocrImageBase64, layout.leftColumn.startX, layout.leftColumn.endX);
      
      await extractTextStream(leftImgBase64, (chunk) => {
        setPages(prev => prev.map(p => p.id === page.id ? { ...p, leftText: p.leftText + chunk } : p));
      });

      updatePage(page.id, { status: 'completed' });

    } catch (error: any) {
      console.error(`Error processing page ${page.id}:`, error);
      updatePage(page.id, { status: 'error', error: error.message || 'Unknown error occurred' });
      setIsAutoProcessing(false);
    } finally {
      processingRef.current = false;
    }
  }, [updatePage]);

  useEffect(() => {
    if (!isAutoProcessing || processingRef.current) return;

    const nextPending = pages.find(p => p.status === 'pending');
    if (nextPending) {
      processPage(nextPending);
    } else {
      setIsAutoProcessing(false);
    }
  }, [pages, isAutoProcessing, processPage]);

  const handleExport = async () => {
    try {
      await exportToDocx(pages);
    } catch (error) {
      console.error("Export Error:", error);
      alert("שגיאה בייצוא הקובץ.");
    }
  };

  const activePage = pages.find(p => p.id === activePageId) || null;
  const completedCount = pages.filter(p => p.status === 'completed').length;
  const totalCount = pages.length;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden relative">
      
      {/* Top Navigation Bar - Cyberpunk Style */}
      <header className="h-16 glass-panel border-b border-neon-cyan/20 flex items-center justify-between px-6 shrink-0 z-20 relative">
        {/* Top glowing line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-50"></div>

        <div className="flex items-center gap-4">
          <input 
            type="file" 
            accept="application/pdf" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          
          {/* Upload Button */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isExtractingPdf || isAutoProcessing}
            className="group relative flex items-center gap-2 px-5 py-2 bg-neon-dark border border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-neon-cyan/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            {isExtractingPdf ? <Loader2 className="w-4 h-4 animate-spin relative z-10" /> : <Upload className="w-4 h-4 relative z-10" />}
            <span className="font-tech font-semibold tracking-wider relative z-10">
              {isExtractingPdf ? `UPLOADING [${pdfProgress.current}/${pdfProgress.total}]` : 'INITIATE UPLOAD'}
            </span>
          </button>

          {pages.length > 0 && (
            <>
              <div className="w-px h-6 bg-neon-cyan/20 mx-2 skew-x-12" />
              
              {/* Process Button */}
              <button
                onClick={() => setIsAutoProcessing(!isAutoProcessing)}
                className={`group relative flex items-center gap-2 px-5 py-2 border transition-all duration-300 overflow-hidden ${
                  isAutoProcessing 
                    ? 'bg-neon-magenta/10 border-neon-magenta text-neon-magenta shadow-[0_0_15px_rgba(255,0,255,0.3)]' 
                    : 'bg-neon-green/10 border-neon-green/50 text-neon-green hover:bg-neon-green/20 hover:border-neon-green hover:shadow-[0_0_15px_rgba(57,255,20,0.3)]'
                }`}
              >
                {isAutoProcessing ? <Pause className="w-4 h-4 relative z-10" /> : <Play className="w-4 h-4 relative z-10" />}
                <span className="font-tech font-semibold tracking-wider relative z-10">
                  {isAutoProcessing ? 'HALT SEQUENCE' : 'AUTO-PROCESS'}
                </span>
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-6">
          {totalCount > 0 && (
            <div className="flex items-center gap-3 font-tech">
              <span className="text-neon-cyan/70 text-sm tracking-widest uppercase">SYS.PROGRESS</span>
              <span className="text-neon-cyan font-bold text-lg text-glow-cyan">{completedCount}/{totalCount}</span>
              <div className="w-32 h-1.5 bg-neon-dark border border-neon-cyan/30 overflow-hidden relative">
                <div 
                  className="absolute top-0 left-0 h-full bg-neon-cyan shadow-[0_0_10px_#00f3ff] transition-all duration-500" 
                  style={{ width: `${(completedCount / totalCount) * 100}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={completedCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-transparent border border-white/20 text-white/70 hover:text-white hover:border-white/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 font-tech tracking-wider"
          >
            <Download className="w-4 h-4" />
            EXPORT.DOCX
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        <Sidebar 
          pages={pages} 
          activePageId={activePageId} 
          onSelectPage={setActivePageId} 
        />
        <Workspace page={activePage} highResImage={activeHighResImage} />
      </div>
    </div>
  );
};

export default App;
