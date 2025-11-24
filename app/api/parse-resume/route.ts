import { NextRequest, NextResponse } from "next/server";
import { extractTextFromFile } from "@/lib/resume-parser";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const extractedText = formData.get("extractedText") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    const isPDF = fileName.endsWith(".pdf") || file.type === "application/pdf";
    const isDocx = fileName.endsWith(".docx") || 
                   file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    
    // Reject .doc files
    if (fileName.endsWith(".doc") || file.type === "application/msword") {
      return NextResponse.json(
        { error: "Legacy .doc files are not currently supported. Please convert your file to .docx format." },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (!isPDF && !isDocx) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a PDF or Word document (.pdf, .docx)." },
        { status: 400 }
      );
    }
    
    // For PDFs, require extracted text from client-side parsing
    if (isPDF && !extractedText) {
      return NextResponse.json(
        { 
          error: "PDF text extraction failed. Please try again or convert to .docx format.",
        },
        { status: 400 }
      );
    }
    
    let resumeText: string;
    
    // Use extracted text if provided (from client-side PDF parsing), otherwise extract from file
    if (extractedText) {
      resumeText = extractedText;
      console.log(`Using client-extracted text from PDF: ${resumeText.length} characters`);
    } else {
      // Extract text from .docx file
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log(`Processing ${file.type} file: ${file.name}, size: ${buffer.length} bytes`);
      
      try {
        resumeText = await extractTextFromFile(buffer, file.type, file.name);
      } catch (extractError) {
        console.error("Error extracting text from file:", extractError);
        const errorMessage = extractError instanceof Error ? extractError.message : "Unknown extraction error";
        return NextResponse.json(
          { 
            error: "Failed to extract text from resume file",
            details: errorMessage,
          },
          { status: 500 }
        );
      }
    }
    
    // Log extracted text length for debugging (more detailed in development)
    if (process.env.NODE_ENV === "development") {
      console.log(`Extracted ${resumeText.length} characters from resume`);
      console.log("First 1000 characters:", resumeText.substring(0, 1000));
      console.log("Last 500 characters:", resumeText.substring(Math.max(0, resumeText.length - 500)));
    }

    // Parse resume with OpenAI
    const prompt = `
Extract ALL structured information from this resume. IMPORTANT: Include EVERY bullet point, ALL responsibilities, and COMPLETE descriptions - do not summarize or truncate any content.

${resumeText}

Return ONLY valid JSON with this exact structure:
{
  "skills": ["skill1", "skill2", ...],
  "inferredSkills": ["inferred skill1", "inferred skill2", ...],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Jan 2020 - Present",
      "description": "Include ALL bullet points and responsibilities for this role, preserving each bullet point as a separate line or separated clearly. Do not summarize - include the complete text for each responsibility/achievement.",
      "type": "work"
    }
  ],
  "education": ["Degree - University - Year"],
  "yearsExperience": 5
}

SKILL EXTRACTION:
- "skills": List all skills that are explicitly mentioned in the resume (e.g., in a "Skills" section, technical skills list, etc.)
- "inferredSkills": Infer and extract skills that are implied by job descriptions, responsibilities, achievements, and tools/technologies mentioned but not explicitly listed as skills. Examples:
  * If someone mentions "analyzed financial statements" → infer: "Financial Analysis", "Financial Modeling"
  * If someone mentions "SQL queries" or "used Excel" → infer: "SQL", "Microsoft Excel"
  * If someone mentions "managed a team of 4" → infer: "Team Leadership", "People Management"
  * If someone mentions "created pitch decks" → infer: "Presentation Design", "PowerPoint"
  * Focus on technical skills, software tools, methodologies, and professional competencies
  * Do NOT duplicate skills that are already in the "skills" array
  * Extract 10-20 relevant inferred skills based on the full resume content

CRITICAL REQUIREMENTS:
- Include EVERY bullet point from the experience section
- Include COMPLETE descriptions - do not truncate or summarize
- Preserve all details from each job role
- For the description field, include all responsibilities and achievements, preserving bullet points if present
- Separate multiple bullet points with newlines or semicolons, but preserve ALL content

EXPERIENCE TYPE CLASSIFICATION:
For each experience entry, classify the "type" field as one of:
- "work": Professional, paid work experience (full-time, part-time, contract, freelance, internships). This is actual employment.
- "leadership": Student clubs, organizations, leadership roles (Captain, Founder, President, Vice President, etc.). Also includes student-run funds/clubs.
- "volunteer": Unpaid volunteer work for causes, nonprofits, community service.
- "education": Academic roles like Research Assistant, Teaching Assistant, or other educational positions at universities.
- "other": Anything that doesn't clearly fit the above categories.

IMPORTANT: Focus on extracting ACTUAL WORK EXPERIENCE (type: "work"). Student club leadership, volunteer roles, and academic positions should be classified appropriately but are secondary.

Examples:
- "Investment Banking Analyst at Goldman Sachs" → type: "work"
- "Captain, Founder of College Golf Team" → type: "leadership"  
- "Advisor at Student-Run Investment Fund" → type: "leadership"
- "Software Engineering Intern at Google" → type: "work"
- "Research Assistant at MIT" → type: "education"
- "Volunteer at Local Food Bank" → type: "volunteer"

DO NOT include any text outside the JSON object.
`;

    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { 
          error: "OpenAI API key is not configured",
          details: "Please set OPENAI_API_KEY in your .env.local file. See SETUP.md for instructions."
        },
        { status: 500 }
      );
    }

    const { getOpenAI } = await import("@/lib/openai");
    let openai;
    try {
      openai = getOpenAI();
    } catch (openaiError) {
      console.error("Error initializing OpenAI:", openaiError);
      return NextResponse.json(
        { 
          error: "Failed to initialize OpenAI client",
          details: openaiError instanceof Error ? openaiError.message : "Unknown error",
        },
        { status: 500 }
      );
    }
    
    let response;
    try {
      response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Use gpt-4o-mini which is cost-effective and reliable
        messages: [
          { 
            role: "system", 
            content: "You are a resume parser. Always return valid JSON only, no other text. Do not include markdown code blocks or any text outside the JSON object. CRITICAL: Extract ALL content from the resume - include EVERY bullet point, EVERY responsibility, and EVERY achievement. Do NOT summarize, truncate, or shorten any text. Preserve the COMPLETE, FULL text of all bullet points and descriptions. If there are 5 bullet points, include all 5. If there are 10 bullet points, include all 10. Include EVERYTHING." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0,
        max_tokens: 4000, // Increase max tokens to ensure we capture all content
      });
    } catch (openaiApiError: any) {
      console.error("OpenAI API error:", openaiApiError);
      const errorMessage = openaiApiError?.message || "Unknown OpenAI API error";
      const statusCode = openaiApiError?.status || 500;
      
      return NextResponse.json(
        { 
          error: "OpenAI API request failed",
          details: errorMessage,
        },
        { status: statusCode >= 400 && statusCode < 600 ? statusCode : 500 }
      );
    }

    // Parse the response - handle both JSON objects and markdown-wrapped JSON
    const content = response.choices[0].message.content || "{}";
    let parsed;
    
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // If parsing fails, try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.error("Failed to parse JSON from response:", e2);
          throw new Error("Failed to parse resume data from AI response");
        }
      } else {
        throw new Error("AI response is not valid JSON");
      }
    }

    // Automatically generate tasks for WORK EXPERIENCE roles only
    // Filter to only work experience for task generation and matching purposes
    if (parsed.experience && Array.isArray(parsed.experience) && parsed.experience.length > 0) {
      // Separate work experience from other types
      const workExperience = parsed.experience.filter((exp: any) => exp.type === "work" || !exp.type);
      const otherExperience = parsed.experience.filter((exp: any) => exp.type && exp.type !== "work");
      
      console.log(`Found ${workExperience.length} work experience role(s) and ${otherExperience.length} other experience role(s)`);
      
      // Only generate tasks for work experience roles
      if (workExperience.length > 0) {
        // Import generate-tasks function directly instead of making HTTP call
        const { generateTasksForRole } = await import("@/lib/task-generator");
        
        // Generate tasks for each work experience role in parallel
        const tasksPromises = workExperience.map(async (exp: any) => {
          try {
            const tasks = await generateTasksForRole(exp.title, exp.company);
            // Return all 4 tasks for each role (3 will be selected by default in the UI)
            return {
              ...exp,
              generatedTasks: tasks.slice(0, 4) || [],
            };
          } catch (error) {
            console.error(`Error generating tasks for ${exp.title}:`, error);
            return {
              ...exp,
              generatedTasks: [],
            };
          }
        });

        // Wait for all tasks to be generated
        const workExperienceWithTasks = await Promise.all(tasksPromises);
        
        // Recombine: work experience with tasks first, then other experience without tasks
        parsed.experience = [
          ...workExperienceWithTasks,
          ...otherExperience.map((exp: any) => ({ ...exp, generatedTasks: [] }))
        ];
        
        console.log(`Tasks generated for ${workExperienceWithTasks.length} work experience role(s)`);
      } else {
        console.log("No work experience found - no tasks generated");
        // Still store all experience, just without tasks for non-work roles
        parsed.experience = parsed.experience.map((exp: any) => ({ ...exp, generatedTasks: [] }));
      }
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error("Error parsing resume:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log full error details for debugging
    console.error("Full error details:", {
      message: errorMessage,
      stack: errorStack,
      error: error,
      name: error instanceof Error ? error.name : undefined,
    });
    
    // Provide more specific error messages based on error type
    let userFriendlyMessage = "Failed to parse resume";
    if (errorMessage.includes("API key") || errorMessage.includes("OPENAI")) {
      userFriendlyMessage = "OpenAI API key is not configured";
    } else if (errorMessage.includes("rate limit") || errorMessage.includes("quota")) {
      userFriendlyMessage = "OpenAI API rate limit exceeded. Please try again later.";
    } else if (errorMessage.includes("pdf") || errorMessage.includes("PDF")) {
      userFriendlyMessage = "Error processing PDF file. Please ensure it's a valid PDF.";
    } else if (errorMessage.includes("docx") || errorMessage.includes("Word")) {
      userFriendlyMessage = "Error processing Word document. Please ensure it's a valid .docx file.";
    }
    
    return NextResponse.json(
      { 
        error: userFriendlyMessage,
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

