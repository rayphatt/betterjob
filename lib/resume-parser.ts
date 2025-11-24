export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Use pdf-parse which works well in serverless environments
    // Dynamic import to avoid bundling issues
    const pdfParse = await import('pdf-parse');
    
    // pdf-parse expects a Buffer, which we already have
    const data = await pdfParse.default(buffer);
    
    // Extract text from all pages (pdf-parse extracts all pages automatically)
    let fullText = data.text || '';
    
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
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log full error details for debugging
    console.error("PDF extraction error details:", {
      message: errorMessage,
      stack: errorStack,
      error: error,
      name: error instanceof Error ? error.name : undefined,
    });
    
    // Provide helpful error message for common issues
    if (errorMessage.includes('worker') || 
        errorMessage.includes('pdf.worker') || 
        errorMessage.includes('Cannot find module') ||
        errorMessage.includes('ENOENT') ||
        errorMessage.includes('no such file') ||
        errorMessage.includes('pdfjs-dist') ||
        errorMessage.includes('Dynamic require') ||
        errorMessage.includes('require is not a function')) {
      throw new Error(`PDF parsing error. Please ensure:\n\n1. The file is a valid PDF\n2. Try converting to Word (.docx) format\n3. Or skip and enter information manually\n\nTechnical details: ${errorMessage}`);
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

