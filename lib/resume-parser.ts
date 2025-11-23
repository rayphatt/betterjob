export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import to ensure pdfjs-dist only loads at runtime in server environment
    // This prevents webpack from trying to bundle it during build
    const pdfjsModule = await import('pdfjs-dist/legacy/build/pdf.js');
    const pdfjs = pdfjsModule.default || pdfjsModule;
    
    // Disable worker for server-side Node.js environment
    // This prevents "Cannot find module './pdf.worker.mjs'" errors
    if (pdfjs.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc = '';
    }
    
    // Ensure buffer is a proper Uint8Array for pdfjs-dist
    let pdfData: Uint8Array;
    if (Buffer.isBuffer(buffer)) {
      pdfData = new Uint8Array(buffer);
    } else {
      // If it's already a Uint8Array or can be converted
      pdfData = buffer as Uint8Array;
    }
    
    // Load the PDF document from buffer
    const loadingTask = pdfjs.getDocument({
      data: pdfData,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      verbosity: 0, // Suppress warnings
    });
    
      const pdf = await loadingTask.promise;
    let fullText = '';
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // First, try to use the simpler text extraction method from pdfjs
      // This gives us a baseline of all text
      try {
        const textItems = textContent.items.map((item: any) => item.str || '').filter(Boolean);
        const simpleText = textItems.join(' ');
        
        // Log in development to see what we're getting
        if (process.env.NODE_ENV === 'development' && pageNum === 1) {
          console.log(`Simple extraction on page ${pageNum}: ${textItems.length} text items, ${simpleText.length} chars`);
        }
      } catch (e) {
        // Continue with structured extraction if simple method fails
        console.warn('Simple text extraction failed, using structured method');
      }
      
      // Improved text extraction that preserves structure
      // Group text items by their Y position (to identify lines)
      const items = textContent.items as Array<{
        str?: string;
        transform?: number[];
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        dir?: string;
      }>;
      
      if (items.length === 0) {
        continue;
      }
      
      // Group items by approximate Y position (same line)
      // Use a more generous tolerance to capture text that's slightly misaligned
      // This helps catch bullet points that might be slightly off
      const lineTolerance = 5; // Increased from 3 to catch more text
      const lines: Array<Array<{ str: string; x: number; y: number; width?: number }>> = [];
      
      // Also keep track of all text items for verification
      const allTextItems: string[] = [];
      
      items.forEach((item) => {
        const str = item.str || '';
        if (!str.trim()) return;
        
        // Collect all text items for verification
        allTextItems.push(str.trim());
        
        // Extract position from transform matrix
        let x = 0;
        let y = 0;
        let width = item.width || 0;
        
        if (item.transform && item.transform.length >= 6) {
          // Transform matrix: [a, b, c, d, tx, ty]
          // tx (index 4) and ty (index 5) are the translation values (position)
          x = item.transform[4] || 0;
          y = item.transform[5] || 0;
        } else if (item.x !== undefined && item.y !== undefined) {
          x = item.x;
          y = item.y;
        }
        
        // Find the line this item belongs to
        // Try multiple lines if within tolerance - choose the closest
        let lineIndex = -1;
        let minDistance = Infinity;
        
        for (let i = 0; i < lines.length; i++) {
          // Check if Y position is close to any existing line
          const lineY = lines[i][0].y;
          const distance = Math.abs(y - lineY);
          if (distance <= lineTolerance && distance < minDistance) {
            lineIndex = i;
            minDistance = distance;
          }
        }
        
        // Add to existing line or create new line
        if (lineIndex >= 0) {
          lines[lineIndex].push({ str, x, y, width });
        } else {
          lines.push([{ str, x, y, width }]);
        }
      });
      
      // Sort lines by Y position (top to bottom) and items within lines by X position (left to right)
      lines.forEach(line => {
        line.sort((a, b) => a.x - b.x);
      });
      lines.sort((a, b) => b[0].y - a[0].y); // Sort top to bottom (higher Y = top)
      
      // Build page text, preserving line breaks
      // Use a more conservative approach: also collect raw text as backup
      const pageLines: string[] = [];
      const rawTextItems: string[] = [];
      
      lines.forEach((line) => {
        // Join items in the line with appropriate spacing
        let lineText = '';
        let lastXEnd = -Infinity;
        
        line.forEach((item, itemIndex) => {
          const str = item.str || '';
          if (!str.trim()) return;
          
          // Collect raw text items for fallback
          rawTextItems.push(str.trim());
          
          // Determine spacing based on X position
          const gap = item.x - lastXEnd;
          const trimmedStr = str.trim();
          
          // Check if this looks like a bullet point or list item
          const isBullet = trimmedStr.match(/^[•\-\*·‣◦▸▹▪▫]\s*/);
          const isNumbered = trimmedStr.match(/^\d+[\.\)]\s*/);
          
          if (itemIndex === 0 || isBullet || isNumbered || gap > 30) {
            // Start of line or significant gap - add as new segment
            if (itemIndex > 0 && gap > 50) {
              lineText += '\n';
            } else if (itemIndex > 0) {
              lineText += ' ';
            }
            lineText += str;
          } else if (gap > 5) {
            // Small gap - add space
            lineText += ' ' + str;
          } else {
            // No gap or small gap - join directly
            lineText += str;
          }
          
          lastXEnd = item.x + (item.width || str.length * 6); // Approximate width if not provided
        });
        
        if (lineText.trim()) {
          pageLines.push(lineText.trim());
        }
      });
      
      // Fallback: if line-based extraction seems incomplete, also include raw text
      // This ensures we capture ALL text even if line grouping misses some items
      let pageText = pageLines.join('\n');
      
      // Verify we captured all text items - log any potential missing items
      const capturedText = pageText.toLowerCase();
      const missingItems: string[] = [];
      
      allTextItems.forEach(item => {
        const itemLower = item.toLowerCase();
        // If a text item isn't found in the captured text, it might have been lost
        // Check for partial matches too (in case it was split or merged)
        if (item.length > 2) {
          const found = capturedText.includes(itemLower) || 
                       item.split(/\s+/).some(word => word.length > 3 && capturedText.includes(word.toLowerCase()));
          if (!found) {
            missingItems.push(item);
          }
        }
      });
      
      // Log missing items in development for debugging
      if (missingItems.length > 0 && process.env.NODE_ENV === 'development') {
        console.warn(`Page ${pageNum}: Potentially ${missingItems.length} missing text items out of ${allTextItems.length}`);
        if (missingItems.length <= 5) {
          console.warn('Missing items:', missingItems);
        }
      }
      
      // Add page text to full text
      fullText += pageText + '\n\n';
    }
    
    // Clean up
    await pdf.destroy();
    
    // Post-process to clean up common formatting issues
    let cleanedText = fullText
      // Remove excessive newlines (more than 2 consecutive)
      .replace(/\n{3,}/g, '\n\n')
      // Fix spacing around bullet points
      .replace(/\n([•\-\*·‣◦▸▹▪▫])\s*/g, '\n$1 ')
      // Fix numbered lists  
      .replace(/\n(\d+[\.\)])\s+/g, '\n$1 ')
      // Clean up multiple spaces (but keep single spaces)
      .replace(/[ \t]{2,}/g, ' ')
      // Remove spaces before newlines
      .replace(/ +\n/g, '\n')
      // Remove spaces after newlines
      .replace(/\n +/g, '\n')
      .trim();
    
    return cleanedText;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Provide helpful error message for common issues
    if (errorMessage.includes('worker') || 
        errorMessage.includes('pdf.worker') || 
        errorMessage.includes('Cannot find module') ||
        errorMessage.includes('ENOENT') ||
        errorMessage.includes('no such file')) {
      throw new Error(`PDF parsing error. Please ensure:\n\n1. The file is a valid PDF\n2. Try converting to Word (.docx) format\n3. Or skip and enter information manually`);
    }
    
    throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
  }
}

export async function extractTextFromWord(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import for mammoth (ES module)
    // Note: mammoth only supports .docx files, not .doc files
    const mammoth = await import("mammoth");
    
    // Convert .docx to text
    // mammoth expects a Buffer or ArrayBuffer
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error("Error extracting text from Word document:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if it's a .doc file (not supported by mammoth)
    if (errorMessage.includes("docx") || errorMessage.includes("Invalid file")) {
      throw new Error(`Word document parsing failed. Please ensure the file is a valid .docx file. Legacy .doc files are not currently supported.`);
    }
    
    throw new Error(`Failed to extract text from Word document: ${errorMessage}`);
  }
}

export async function extractTextFromFile(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
  try {
    // Determine file type and extract text accordingly
    const lowerFileName = fileName.toLowerCase();
    
    if (mimeType === "application/pdf" || lowerFileName.endsWith(".pdf")) {
      console.log("Extracting text from PDF file");
      return await extractTextFromPDF(buffer);
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      lowerFileName.endsWith(".docx")
    ) {
      console.log("Extracting text from Word document (.docx):", fileName);
      return await extractTextFromWord(buffer);
    } else if (
      mimeType === "application/msword" ||
      lowerFileName.endsWith(".doc")
    ) {
      // .doc files are not fully supported yet (mammoth only handles .docx)
      throw new Error(`Legacy .doc files are not currently supported. Please convert your file to .docx or PDF format.`);
    } else {
      throw new Error(`Unsupported file type: ${mimeType || fileName}. Please upload a PDF or Word document (.pdf, .docx)`);
    }
  } catch (error) {
    console.error("Error in extractTextFromFile:", error);
    throw error;
  }
}

