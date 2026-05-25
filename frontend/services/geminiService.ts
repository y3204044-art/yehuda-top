import { GoogleGenAI } from '@google/genai';
import { stripBase64Prefix } from '../utils/imageUtils';

// Initialize the SDK. It relies on process.env.API_KEY being available in the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || 'dummy', vertexai: true });

const OCR_SYSTEM_INSTRUCTION = "תפקידך: מערכת מקצועית לתמלול עמודות טקסט מתוך ספרים סרוקים בשפה העברית. התמונה שקיבלת היא חיתוך של טור אחד (עמודה אחת) מתוך עמוד ספר. קרא ותמלל את כל הטקסט המופיע בתמונה, מימין לשמאל, מלמעלה למטה. איסור חמור על ירידות שורה חזותיות: אל תעתיק את ירידות השורה כפי שהן מופיעות בתמונה. צור שורה חדשה (\\n\\n) אך ורק כאשר מתחילה פסקה חדשה לחלוטין. אפס המצאות: אל תנחש מילים. תמלל בדיוק כפי שמופיע. אם מילה לא קריאה כתוב [[UNREADABLE]]. החזר אך ורק את הטקסט המפוענח.";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const extractTextStream = async (
  imageBase64: string,
  onChunk: (text: string) => void,
  maxRetries = 3
): Promise<void> => {
  const base64Data = stripBase64Prefix(imageBase64);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg',
            }
          },
          {
            text: 'Extract the text from this column according to the system instructions.'
          }
        ],
        config: {
          systemInstruction: OCR_SYSTEM_INSTRUCTION,
          temperature: 0.1, // Low temperature for more deterministic OCR
        }
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          onChunk(chunk.text);
        }
      }
      
      return; // Success, exit retry loop
    } catch (error: any) {
      console.error(`Gemini API Error (Attempt ${attempt + 1}/${maxRetries}):`, error);
      
      if (attempt === maxRetries - 1) {
        // If it's a 404 (likely due to missing proxy in sandbox), provide a mock response for demonstration
        if (error.message?.includes('404') || error.message?.includes('Failed to fetch')) {
          onChunk("שגיאת תקשורת עם השרת (Proxy לא נמצא בסביבת הפיתוח).\n\nזוהי תגובת דמה להדגמת הממשק.");
          return;
        }
        throw new Error(`שגיאה בפענוח הטקסט לאחר ${maxRetries} ניסיונות: ${error.message}`);
      }
      
      // Exponential backoff: 1s, 2s, 4s...
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
};
