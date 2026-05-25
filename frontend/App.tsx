import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PageData } from './types';
import { loadPdfDocument, renderPageToImage } from './services/pdfService';
import { extractTextStream } from './services/geminiService';
import { cropImage, detectColumnsProgrammatically } from './utils/imageUtils';
import { exportToDocx } from './services/exportService';
import { Sidebar } from './components/Sidebar';
import { Workspace } from './components/Workspace';
import { Upload, Play, Pause, Download, Loader2, Image as ImageIcon } from 'lucide-react';

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
      // Handle Single Image Upload
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          const newPage: PageData = {
            id: `page-${Date.now()}-1`,
            pageNumber: 1,
            thumbnail: base64,
            status: 'pending',
            rightText: '',
            leftText: ''
          };
          
          if (pdfDocRef.current) {
            pdfDocRef.current.destroy();
            pdfDocRef.current = null;
          }
          
          setPages([newPage]);
          setActivePageId(newPage.id);
          setIsExtractingPdf(false);
        };
        reader.readAsDataURL(file);
        return;
      }

      // Handle PDF Upload
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
      }

      const pdf = await loadPdfDocument(file);
      pdfDocRef.current = pdf;
      const numPages = pdf.numPages;
      const newPages: PageData[] = [];

      for (let i = 1; i <= numPages; i++) {
        const thumb = await renderPageToImage(pdf, i, 0.5, 0.5);
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
      console.error("Extraction Error:", error);
      alert("שגיאה בטעינת הקובץ. ודא שהקובץ תקין.");
    } finally {
      setIsExtractingPdf(false);
      setPdfProgress({ current: 0, total: 0 });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadHighRes = async () => {
      if (activePageId) {
        setActiveHighResImage(null);
        const page = pagesRef.current.find(p => p.id === activePageId);
        if (page) {
          if (pdfDocRef.current) {
            try {
              const highRes = await renderPageToImage(pdfDocRef.current, page.pageNumber, 2.0, 0.8);
              if (isMounted) setActiveHighResImage(highRes);
            } catch (e) {
              console.error("Failed to load high res image for viewing", e);
            }
          } else {
            // It's a single image, thumbnail is already high res
            if (isMounted) setActiveHighResImage(page.thumbnail);
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
    processingRef.current = true;
    setActivePageId(page.id);

    try {
      updatePage(page.id, { status: 'detecting', error: undefined });
      
      let ocrImageBase64 = page.thumbnail;
      if (pdfDocRef.current) {
        ocrImageBase64 = await renderPageToImage(pdfDocRef.current, page.pageNumber, 3.0, 1.0);
      }

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
    <div className="h-screen w-screen flex flex-col overflow-hidden relative z-10">
      
      {/* Header */}
      <div className="p-4 pb-0 shrink-0 relative">
        <header className="glass-panel rounded-3xl flex items-center justify-between px-6 py-3 relative overflow-hidden">
          
          {/* Upload Progress Overlay */}
          {isExtractingPdf && (
            <div className="absolute bottom-0 left-0 h-1 bg-spectrum-cyan animate-pulse transition-all duration-300" style={{ width: `${(pdfProgress.current / Math.max(1, pdfProgress.total)) * 100}%` }}></div>
          )}

          <div className="flex items-center gap-4 relative z-10">
            <input 
              type="file" 
              accept="application/pdf, image/jpeg, image/png" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isExtractingPdf || isAutoProcessing}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-spectrum-cyan to-spectrum-blue hover:opacity-90 disabled:opacity-50 disabled:grayscale text-white rounded-full font-medium transition-all shadow-[0_0_20px_rgba(0,229,255,0.3)]"
            >
              {isExtractingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              {isExtractingPdf ? 'מעבד קובץ...' : 'העלה PDF / תמונה'}
            </button>

            {isExtractingPdf && pdfProgress.total > 0 && (
              <div className="flex items-center gap-2 px-4 py-1.5 bg-black/40 rounded-full border border-spectrum-cyan/30 text-sm text-spectrum-cyan">
                <span>קורא עמודים:</span>
                <span className="font-bold">{pdfProgress.current} / {pdfProgress.total}</span>
              </div>
            )}

            {pages.length > 0 && !isExtractingPdf && (
              <>
                <div className="w-px h-6 bg-white/20 mx-2" />
                <button
                  onClick={() => setIsAutoProcessing(!isAutoProcessing)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all text-white ${
                    isAutoProcessing 
                      ? 'bg-gradient-to-r from-spectrum-yellow to-orange-400 shadow-[0_0_20px_rgba(255,204,0,0.3)] text-gray-900' 
                      : 'bg-gradient-to-r from-spectrum-green to-emerald-400 shadow-[0_0_20px_rgba(0,230,118,0.3)]'
                  }`}
                >
                  {isAutoProcessing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  {isAutoProcessing ? 'השהה עיבוד' : 'התחל עיבוד אוטומטי'}
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-6 relative z-10">
            {totalCount > 0 && (
              <div className="text-sm text-gray-200 flex items-center gap-3 bg-black/40 px-5 py-2 rounded-full border border-white/10">
                <span className="font-medium">התקדמות:</span>
                <span className="font-bold text-white">{completedCount} / {totalCount}</span>
                <div className="w-32 h-2 bg-black/60 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-spectrum-green to-spectrum-cyan transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(0,230,118,0.8)]" 
                    style={{ width: `${(completedCount / totalCount) * 100}%` }}
                  />
                </div>
              </div>
            )}
            
            <button
              onClick={handleExport}
              disabled={completedCount === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-full font-medium transition-all border border-white/10"
            >
              <Download className="w-5 h-5" />
              ייצא ל-DOCX
            </button>
          </div>
        </header>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
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
