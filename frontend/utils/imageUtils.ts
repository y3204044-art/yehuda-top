import { PageLayout } from '../types';

export const cropImage = (base64: string, startX: number, endX: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      const sx = Math.floor(startX * img.width);
      const ex = Math.floor(endX * img.width);
      const width = ex - sx;

      canvas.width = width;
      canvas.height = img.height;

      ctx.drawImage(
        img,
        sx, 0, width, img.height,
        0, 0, width, img.height
      );

      resolve(canvas.toDataURL('image/jpeg', 1.0));
    };
    img.onerror = reject;
    img.src = base64;
  });
};

export const stripBase64Prefix = (dataUrl: string): string => {
  return dataUrl.split(',')[1];
};

export const detectColumnsProgrammatically = (base64: string): Promise<PageLayout> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No canvas context'));

      const width = img.width;
      const height = img.height;
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      const colSums = new Array(width).fill(0);

      // FIX: Scan almost the entire height (2% to 98%) to avoid cutting off top/bottom text
      const startY = Math.floor(height * 0.02);
      const endY = Math.floor(height * 0.98);

      for (let y = startY; y < endY; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const luminance = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
          if (luminance < 160) {
            colSums[x]++;
          }
        }
      }

      const noiseThreshold = (endY - startY) * 0.002;
      let firstTextX = 0;
      let lastTextX = width - 1;

      const searchMargin = Math.floor(width * 0.02);

      for (let x = searchMargin; x < width - searchMargin; x++) {
        if (colSums[x] > noiseThreshold) { firstTextX = x; break; }
      }
      for (let x = width - searchMargin - 1; x >= searchMargin; x--) {
        if (colSums[x] > noiseThreshold) { lastTextX = x; break; }
      }

      const midStart = Math.floor(firstTextX + (lastTextX - firstTextX) * 0.2);
      const midEnd = Math.floor(firstTextX + (lastTextX - firstTextX) * 0.8);

      const smoothedSums = new Array(width).fill(0);
      const windowSize = Math.floor(width * 0.005);
      for (let x = windowSize; x < width - windowSize; x++) {
        let sum = 0;
        for (let w = -windowSize; w <= windowSize; w++) {
          sum += colSums[x + w];
        }
        smoothedSums[x] = sum / (windowSize * 2 + 1);
      }

      let bestGutterCenter = Math.floor(width / 2);
      let currentValleyStart = -1;
      let maxValleyWidth = 0;
      let bestValleyCenter = Math.floor(width / 2);

      const valleyThreshold = noiseThreshold * 3;

      for (let x = midStart; x <= midEnd; x++) {
        if (smoothedSums[x] <= valleyThreshold) {
          if (currentValleyStart === -1) currentValleyStart = x;
        } else {
          if (currentValleyStart !== -1) {
            const valleyWidth = x - currentValleyStart;
            if (valleyWidth > maxValleyWidth) {
              maxValleyWidth = valleyWidth;
              bestValleyCenter = currentValleyStart + Math.floor(valleyWidth / 2);
            }
            currentValleyStart = -1;
          }
        }
      }
      
      if (currentValleyStart !== -1) {
         const valleyWidth = midEnd - currentValleyStart;
         if (valleyWidth > maxValleyWidth) {
            bestValleyCenter = currentValleyStart + Math.floor(valleyWidth / 2);
         }
      }

      bestGutterCenter = bestValleyCenter;

      let rightColStartX = bestGutterCenter;
      for (let x = bestGutterCenter; x < lastTextX; x++) {
         if (smoothedSums[x] > valleyThreshold) {
             rightColStartX = x;
             break;
         }
      }

      let leftColEndX = bestGutterCenter;
      for (let x = bestGutterCenter; x > firstTextX; x--) {
         if (smoothedSums[x] > valleyThreshold) {
             leftColEndX = x;
             break;
         }
      }

      // FIX: Increase padding to 2.5% to ensure edges of letters/punctuation are never cut off
      const padding = width * 0.025;

      const finalLeftStartX = Math.max(0, firstTextX - padding) / width;
      const finalLeftEndX = Math.min(width, leftColEndX + padding) / width;

      const finalRightStartX = Math.max(0, rightColStartX - padding) / width;
      const finalRightEndX = Math.min(width, lastTextX + padding) / width;

      resolve({
        rightColumn: { startX: finalRightStartX, endX: finalRightEndX },
        leftColumn: { startX: finalLeftStartX, endX: finalLeftEndX }
      });
    };
    img.onerror = reject;
    img.src = base64;
  });
};
