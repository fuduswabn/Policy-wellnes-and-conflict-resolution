// @ts-ignore - fetch is globally available in React Native
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export type DocumentResult = {
  fileName: string;
  fileType: string;
  fileSize: number;
  uri: string;
  content: string;
  extractedText: string;
};

/**
 * Pick and process any document (PDF, images, Word docs, etc.)
 * Automatically extracts text content using AI
 */
export async function pickAndProcessDocument(): Promise<DocumentResult | null> {
  try {
    // Pick document
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return null;
    }

    const file = result.assets[0];
    const { name, size, mimeType, uri } = file;

    // Safety check for FileSystem
    if (!FileSystem || !FileSystem.readAsStringAsync) {
      throw new Error('File system not available. Please try again.');
    }

    // Read file content as base64 - use string literal to avoid EncodingType being undefined
    const base64Content = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as any,
    });

    // Determine processing strategy based on file type
    let extractedText = '';

    if (mimeType?.includes('image') || name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
      // Image - use AI vision to extract text (OCR)
      extractedText = await extractTextFromImage(base64Content, mimeType || 'image/jpeg');
    } else if (mimeType?.includes('pdf') || name.endsWith('.pdf')) {
      // PDF - extract text using AI
      extractedText = await extractTextFromPDF(base64Content);
    } else if (mimeType?.includes('text') || name.match(/\.(txt|md|json|csv)$/i)) {
      // Plain text - read as UTF8 directly
      const textContent = await FileSystem.readAsStringAsync(uri, {
        encoding: 'utf8' as any,
      });
      extractedText = textContent;
    } else {
      // Other documents (Word, etc.) - use AI to extract
      extractedText = await extractTextFromDocument(base64Content, name, mimeType || 'application/octet-stream');
    }

    return {
      fileName: name,
      fileType: mimeType || 'application/octet-stream',
      fileSize: size || 0,
      uri,
      content: base64Content,
      extractedText: extractedText.trim(),
    };
  } catch (error) {
    console.error('Document processing error:', error);
    throw error;
  }
}

/**
 * Extract text from image using AI vision/OCR
 */
async function extractTextFromImage(base64Content: string, mimeType: string): Promise<string> {
  try {
    const response = await fetch('https://api.a0.dev/ai/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text content from this image. If this is a document, policy, or any text-based image, transcribe all text exactly as it appears. If there is no text, say "No text found in image."',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Content}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Image OCR failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.completion || '';
  } catch (error) {
    console.error('Image OCR error:', error);
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Extract text from PDF using AI
 */
async function extractTextFromPDF(base64Content: string): Promise<string> {
  try {
    const response = await fetch('https://api.a0.dev/ai/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: `I'm providing a PDF document in base64. Extract all text content from this PDF and return it in plain text format. Preserve the document structure and formatting as much as possible.

Base64 PDF (first 1000 chars): ${base64Content.substring(0, 1000)}

Please extract and return the full text content of this PDF document.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`PDF extraction failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.completion || '';
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF. The document might be too large or corrupted.');
  }
}

/**
 * Extract text from other document types (Word, etc.) using AI
 */
async function extractTextFromDocument(
  base64Content: string,
  fileName: string,
  mimeType: string
): Promise<string> {
  try {
    const response = await fetch('https://api.a0.dev/ai/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: `I'm providing a document file (${fileName}, type: ${mimeType}) in base64 format. Extract all text content from this document and return it in plain text format.

Base64 content (first 1000 chars): ${base64Content.substring(0, 1000)}

Please extract and return the full text content of this document.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Document extraction failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.completion || '';
  } catch (error) {
    console.error('Document extraction error:', error);
    throw new Error('Failed to extract text from document');
  }
}

/**
 * Validate if extracted text is meaningful
 */
export function validateExtractedText(text: string): { isValid: boolean; reason?: string } {
  if (!text || text.trim().length === 0) {
    return { isValid: false, reason: 'No text extracted' };
  }

  if (text.trim().length < 10) {
    return { isValid: false, reason: 'Text too short to be meaningful' };
  }

  if (text.toLowerCase().includes('no text found')) {
    return { isValid: false, reason: 'No text detected in document' };
  }

  return { isValid: true };
}