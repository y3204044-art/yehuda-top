// We use the globally loaded pdfjsLib from index.html to avoid ESM worker crashes
export const loadPdfDocument = async (file: File): Promise<any> => {
  const pdfjsLib = (window as any).pdfjsLib;
  if (!pdfjsLib) {
    throw new Error("PDF.js library is not loaded.");
  }
  
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  
  // CRITICAL FIX: Use URL.createObjectURL instead of file.arrayBuffer()
  // This prevents the browser from crashing when loading very large PDF files (100MB+)
  // because it streams the file instead of loading it entirely into RAM at once.
  const fileUrl = URL.createObjectURL(file);
  const loadingTask = pdfjsLib.getDocument(fileUrl);
  
  return await loadingTask.promise;
};

export const renderPageToImage = async (
  pdf: any,
  pageNumber: number,
  scale: number,
  quality: number = 0.85
): Promise<string> => {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) throw new Error('Canvas context not available');

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;

  return canvas.toDataURL('image/jpeg', quality);
};
