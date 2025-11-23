import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role, company, tasks } = body;

    if (!role) {
      return NextResponse.json(
        { error: "Role is required" },
        { status: 400 }
      );
    }

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json(
        { error: "At least one task is required" },
        { status: 400 }
      );
    }

    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { 
          error: "OpenAI API key is not configured",
          details: "Please set OPENAI_API_KEY in your .env.local file."
        },
        { status: 500 }
      );
    }

    const { getOpenAI } = await import("@/lib/openai");
    const openai = getOpenAI();

    const systemMessage = `You are a job analysis expert. Analyze the provided role and tasks to infer relevant skills that someone in this role would typically have. Generate skills that are directly implied by the tasks and responsibilities.`;

    const prompt = `
Given this job role and the tasks performed:

Role: "${role}"${company ? ` at ${company}` : ""}

Selected Tasks:
${tasks.map((task: string, idx: number) => `${idx + 1}. ${task}`).join('\n')}

Based on the role "${role}" and these specific tasks, infer 10-20 relevant skills that someone performing these tasks would typically have.

SKILL INFERENCE GUIDELINES:
- Infer skills that are directly implied by the tasks (e.g., if task mentions "wireframes" → infer "UI/UX Design", "Wireframing", "Figma" or "Adobe XD")
- Include technical skills, software tools, methodologies, and professional competencies
- Focus on skills that are demonstrated by performing these tasks
- Examples:
  * "Create wireframes and prototypes" → infer: "Wireframing", "Prototyping", "UI/UX Design", "Figma" or "Adobe XD", "User Experience Design"
  * "Conduct user research sessions" → infer: "User Research", "Usability Testing", "User Interviews", "Qualitative Research"
  * "Collaborate with cross-functional teams on design systems" → infer: "Design Systems", "Collaboration", "Cross-functional Communication", "UI Components"
  * "Financial modeling and valuation analyses" → infer: "Financial Modeling", "Valuation", "Excel", "Financial Analysis"
  * "Prepare pitch books and presentations" → infer: "Presentation Design", "Pitch Decks", "PowerPoint", "Client Communication"
- Do NOT include generic skills that could apply to any role
- Be specific and role-appropriate
- Extract 10-20 relevant inferred skills

Return ONLY a JSON object with this exact structure:
{
  "inferredSkills": ["skill1", "skill2", "skill3", ...]
}

DO NOT include any text outside the JSON object.
DO NOT include a "skills" array - only "inferredSkills".
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
    });

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
          throw new Error("Failed to parse skills data from AI response");
        }
      } else {
        throw new Error("AI response is not valid JSON");
      }
    }

    const inferredSkills = parsed.inferredSkills || [];

    if (!Array.isArray(inferredSkills)) {
      return NextResponse.json(
        { error: "Invalid response format" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      inferredSkills: inferredSkills.filter((skill: any) => typeof skill === 'string' && skill.trim().length > 0)
    });
  } catch (error) {
    console.error("Error inferring skills:", error);
    return NextResponse.json(
      { 
        error: "Failed to infer skills",
        details: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}

