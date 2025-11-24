// Client-side PDF parsing using pdfjs-dist (works in browser, not serverless)
// This file should only be imported in client components

export async function extractTextFromPDFClient(file: File): Promise<string> {
  try {
    // Dynamic import to only load in browser
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set up worker for browser environment
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    }
    
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Extract text items
      const textItems = textContent.items
        .map((item: any) => item.str || '')
        .filter((str: string) => str.trim().length > 0);
      
      // Join items with spaces, add newline between pages
      const pageText = textItems.join(' ');
      fullText += pageText + '\n\n';
    }
    
    // Clean up
    await pdf.destroy();
    
    // Post-process to clean up formatting
    let cleanedText = fullText
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/ +\n/g, '\n')
      .replace(/\n +/g, '\n')
      .trim();
    
    return cleanedText;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
  }
}

