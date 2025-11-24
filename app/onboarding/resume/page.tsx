"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileText, X } from "lucide-react";
import Link from "next/link";

export default function ResumeUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [hasExistingResume, setHasExistingResume] = useState(false);
  const [existingResumeFileName, setExistingResumeFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if a resume has already been uploaded
    const resumeUploaded = sessionStorage.getItem("resume_uploaded");
    if (resumeUploaded === "true") {
      setHasExistingResume(true);
      // Try to get resume file name from parsed data if available
      const resumeParsedData = sessionStorage.getItem("resume_parsed_data");
      if (resumeParsedData) {
        try {
          const parsed = JSON.parse(resumeParsedData);
          // If we stored the file name, use it; otherwise use a generic name
          setExistingResumeFileName(parsed.fileName || "Resume.pdf");
        } catch (e) {
          console.error("Error parsing resume data:", e);
          setExistingResumeFileName("Resume.pdf");
        }
      } else {
        setExistingResumeFileName("Resume.pdf");
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
        "application/msword", // .doc
      ];
      const allowedExtensions = [".pdf", ".doc", ".docx"];
      const fileName = selectedFile.name.toLowerCase();
      const isValidType = allowedTypes.includes(selectedFile.type) || 
                          allowedExtensions.some(ext => fileName.endsWith(ext));
      
      if (isValidType) {
        // Check for .doc files specifically
        if (fileName.endsWith(".doc") || selectedFile.type === "application/msword") {
          alert("Legacy .doc files are not currently supported. Please convert your file to .docx or PDF format.");
          return;
        }
        setFile(selectedFile);
      } else {
        alert("Please upload a PDF or Word document (.pdf, .docx)");
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      ];
      const allowedExtensions = [".pdf", ".docx"]; // .doc not fully supported
      const fileName = droppedFile.name.toLowerCase();
      const isValidType = allowedTypes.includes(droppedFile.type) || 
                          allowedExtensions.some(ext => fileName.endsWith(ext));
      
      if (isValidType) {
        // Check for .doc files specifically
        if (fileName.endsWith(".doc") || droppedFile.type === "application/msword") {
          alert("Legacy .doc files are not currently supported. Please convert your file to .docx or PDF format.");
          return;
        }
        setFile(droppedFile);
      } else {
        alert("Please upload a PDF or Word document (.pdf, .docx)");
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setIsParsing(true);

    try {
      // Upload and parse resume
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/parse-resume", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.details || errorData.error || "Failed to parse resume";
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Store parsed data in sessionStorage, including file name
      const resumeDataWithFileName = {
        ...result.data,
        fileName: file.name,
      };
      sessionStorage.setItem("resume_uploaded", "true");
      sessionStorage.setItem("resume_parsed_data", JSON.stringify(resumeDataWithFileName));
      
      // Update state to reflect resume was uploaded
      setHasExistingResume(true);
      setExistingResumeFileName(file.name);
      
      // If resume was parsed, go to review page
      if (result.data?.experience && result.data.experience.length > 0) {
        router.push("/onboarding/resume-review");
      } else {
        // No experience found, go to role input
        router.push("/onboarding/role");
      }
    } catch (error) {
      console.error("Error uploading resume:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Provide more helpful error messages
      let userMessage = errorMessage;
      if (errorMessage.includes("PDF parsing is currently not supported")) {
        userMessage = `PDF files are not currently supported.\n\nPlease convert your PDF to Word (.docx) format:\n1. Open your PDF in Microsoft Word, Google Docs, or Adobe Acrobat\n2. Save/Export as .docx format\n3. Upload the .docx file instead\n\nOr skip this step and enter your information manually.`;
      } else if (errorMessage.includes("OpenAI")) {
        userMessage = `OpenAI API error: ${errorMessage}\n\nPlease try again or skip this step to continue.`;
      }
      
      alert(`Failed to upload resume: ${userMessage}`);
    } finally {
      setIsUploading(false);
      setIsParsing(false);
    }
  };

  const handleSkip = () => {
    router.push("/onboarding/role");
  };

  return (
    <main className="min-h-screen bg-background-page flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center px-4 sm:px-6 pt-6 sm:pt-8">
          <CardTitle className="text-xl sm:text-2xl md:text-3xl mb-2 leading-tight">
            Let's start with your resume
          </CardTitle>
          <CardDescription className="text-sm sm:text-lg">
            Upload your resume to get personalized career matches. We'll extract your skills and experience automatically.
            <br />
            <span className="text-xs text-text-tertiary mt-1 block">
              💡 Tip: Word documents (.docx) work best. PDF support coming soon.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6 sm:pb-8">
          {/* Show existing resume indicator */}
          {hasExistingResume && !file && !isParsing && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm sm:text-base font-semibold text-green-900">
                      Resume already uploaded
                    </p>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 text-xs">
                      <FileText className="w-3 h-3 mr-1" />
                      {existingResumeFileName || "Resume"}
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-green-700">
                    You can upload a new resume to replace the existing one, or continue to the next step.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Clear existing resume and allow new upload
                  sessionStorage.removeItem("resume_uploaded");
                  sessionStorage.removeItem("resume_parsed_data");
                  setHasExistingResume(false);
                  setExistingResumeFileName(null);
                }}
                className="text-green-700 hover:text-green-900 hover:bg-green-100 h-8 w-8 p-0 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {!file && !isParsing && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-text-tertiary rounded-lg p-6 sm:p-12 text-center cursor-pointer active:border-primary transition-colors touch-manipulation"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="space-y-3 sm:space-y-4">
                <div className="text-3xl sm:text-4xl">📄</div>
                <div>
                  <p className="text-base sm:text-lg font-semibold text-text-primary">
                    Drag and drop your resume here
                  </p>
                  <p className="text-sm sm:text-base text-text-secondary mt-2">or tap to browse</p>
                </div>
                <p className="text-xs sm:text-sm text-text-tertiary">
                  Word documents (.docx) recommended • PDF support coming soon
                </p>
              </div>
            </div>
          )}

          {file && !isParsing && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-primary-light">
                <p className="font-semibold text-sm sm:text-base text-text-primary break-words">{file.name}</p>
                <p className="text-xs sm:text-sm text-text-secondary mt-1">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full py-3 sm:py-6 text-base sm:text-lg min-h-[44px] touch-manipulation"
                size="lg"
              >
                {isUploading ? "Uploading..." : "Upload & Parse Resume"}
              </Button>
            </div>
          )}

          {isParsing && (
            <div className="space-y-4 text-center py-6 sm:py-8">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-base sm:text-lg font-semibold">Generating insights...</p>
              <p className="text-xs sm:text-sm text-text-secondary px-4">
                We're analyzing your resume to extract your skills and experience.
              </p>
            </div>
          )}

          {!isParsing && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {hasExistingResume && !file ? (
                <Button
                  onClick={() => {
                    // Navigate to resume review page if resume was already uploaded
                    const resumeParsedData = sessionStorage.getItem("resume_parsed_data");
                    if (resumeParsedData) {
                      try {
                        const parsed = JSON.parse(resumeParsedData);
                        if (parsed.experience && parsed.experience.length > 0) {
                          router.push("/onboarding/resume-review");
                          return;
                        }
                      } catch (e) {
                        console.error("Error parsing resume data:", e);
                      }
                    }
                    router.push("/onboarding/interests");
                  }}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-6 text-base sm:text-lg min-h-[44px] touch-manipulation"
                  size="lg"
                >
                  Continue with existing resume →
                </Button>
              ) : (
                // Only show skip button if no resume has been uploaded
                <div className="text-center">
                  <Link
                    href="/onboarding/role"
                    onClick={handleSkip}
                    className="text-primary hover:underline active:underline text-sm sm:text-base min-h-[44px] inline-flex items-center touch-manipulation"
                  >
                    Skip for now
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

