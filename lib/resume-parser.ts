export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // PDF parsing in serverless environments is problematic due to dependencies
  // on browser APIs and worker files. For now, we'll provide a helpful error
  // message directing users to convert to .docx format, which works perfectly.
  
  throw new Error(
    `PDF parsing is currently not supported in our serverless environment.\n\n` +
    `Please convert your PDF to Word (.docx) format:\n` +
    `1. Open your PDF in Microsoft Word, Google Docs, or Adobe Acrobat\n` +
    `2. Save/Export as .docx format\n` +
    `3. Upload the .docx file instead\n\n` +
    `Alternatively, you can skip the resume upload and enter your information manually.`
  );
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

