import { getOpenAI } from "./openai";

export async function generateTasksForRole(
  role: string,
  company?: string,
  count: number = 4
): Promise<string[]> {
  try {
    // Log for debugging - remove in production if desired
    if (process.env.NODE_ENV === "development") {
      console.log(`[Task Generator] Generating ${count} tasks for role: "${role}"${company ? ` at ${company}` : ""}`);
    }
    
    const openai = getOpenAI();
    
    const taskList = Array.from({ length: count }, (_, i) => `  "Task ${i + 1} description"`).join(",\n");
    
    // Validate role input
    if (!role || typeof role !== 'string' || role.trim() === '') {
      console.error(`[Task Generator] Invalid role parameter:`, role);
      throw new Error('Role must be a non-empty string');
    }

    const cleanRole = role.trim();
    const cleanCompany = company?.trim();

    const systemMessage = `You are a job analysis expert. You MUST generate tasks that are EXACTLY and DIRECTLY relevant to the specific job role provided. If the role is "UX Engineer", generate ONLY UX engineering tasks. If the role is "Software Engineer", generate ONLY software engineering tasks. Do NOT generate tasks from unrelated roles. Be extremely precise and role-specific.`;

    // Build role-specific guidance based on common role keywords
    let roleGuidance = "";
    const roleLower = cleanRole.toLowerCase();
    
    if (roleLower.includes("ux") || roleLower.includes("user experience")) {
      roleGuidance = `SPECIFIC GUIDANCE FOR UX ENGINEER:
- Tasks must be about user experience, user interface design, user research, prototyping, wireframing
- Examples: "Create wireframes and prototypes", "Conduct user research and usability testing", "Build interactive prototypes using design tools", "Collaborate with designers and developers on design systems", "Implement responsive UI components"
- DO NOT generate tasks about finance, trading, investment banking, or any other unrelated field`;
    } else if (roleLower.includes("software") && roleLower.includes("engineer")) {
      roleGuidance = `SPECIFIC GUIDANCE FOR SOFTWARE ENGINEER:
- Tasks must be about software development, coding, programming, software architecture
- Examples: "Write and maintain code in programming languages", "Debug and troubleshoot software issues", "Participate in code reviews", "Design and implement software features"`
    } else if (roleLower.includes("investment banking") || roleLower.includes("analyst")) {
      roleGuidance = `SPECIFIC GUIDANCE FOR INVESTMENT BANKING ANALYST:
- Tasks must be about finance, investment banking, financial modeling, M&A
- Examples: "Conduct financial modeling and valuation analyses", "Prepare pitch books and client presentations", "Assist in due diligence processes"`;
    } else if (roleLower.includes("marketing")) {
      roleGuidance = `SPECIFIC GUIDANCE FOR MARKETING MANAGER:
- Tasks must be about marketing, campaigns, analytics, content creation
- Examples: "Develop marketing campaigns and strategies", "Analyze marketing metrics and ROI", "Create content for various marketing channels"`;
    }

    const prompt = `
You are generating tasks for this EXACT job role: "${cleanRole}"${cleanCompany ? ` at ${cleanCompany}` : ""}

CRITICAL REQUIREMENTS:
1. The tasks MUST be directly and specifically related to the role "${cleanRole}"
2. Do NOT generate tasks from other roles or industries
3. Do NOT generate generic tasks that could apply to any role
4. The tasks must be typical responsibilities for someone with the job title "${cleanRole}"
${roleGuidance ? `\n${roleGuidance}\n` : ''}

EXAMPLES OF CORRECT MATCHING:
- Role: "UX Engineer" → Tasks: "Create wireframes and prototypes for user interfaces", "Conduct usability testing sessions with users", "Collaborate with designers and developers on design systems", "Build interactive prototypes using Figma, Sketch, or similar tools", "Implement responsive UI components using HTML, CSS, and JavaScript", "Analyze user feedback and iterate on designs"
- Role: "Investment Banking Analyst" → Tasks: "Conduct financial modeling and valuation analyses for potential deals", "Prepare pitch books and client presentations summarizing deal structures", "Assist in due diligence processes by analyzing financial statements", "Monitor market trends and competitor activity"
- Role: "Software Engineer" → Tasks: "Write and maintain code in programming languages like Python, JavaScript, or Java", "Debug and troubleshoot software issues", "Participate in code reviews with team members", "Design and implement software features"
- Role: "Marketing Manager" → Tasks: "Develop marketing campaigns and strategies to reach target audiences", "Analyze marketing metrics and ROI to measure campaign effectiveness", "Create content for various marketing channels including social media"

Generate exactly ${count} specific, concrete, and actionable tasks that someone with the job title "${cleanRole}" would typically perform in their day-to-day work.

IMPORTANT: If the role is "${cleanRole}", then EVERY task must be directly related to "${cleanRole}". Do NOT include any tasks that are not relevant to this specific role.

Return ONLY a JSON array of exactly ${count} task strings:
[
${taskList}
]

DO NOT include any text outside the JSON array.
DO NOT include more or fewer than ${count} tasks.
DO NOT generate tasks from unrelated roles - they MUST match "${cleanRole}".
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      temperature: 0.3, // Lower temperature for more consistent, role-specific results
    });

    const content = response.choices[0].message.content || "[]";
    let tasks: string[] = [];
    
    try {
      tasks = JSON.parse(content);
    } catch (e) {
      // Try to extract array from markdown code blocks
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        tasks = JSON.parse(jsonMatch[0]);
      }
    }

    if (!Array.isArray(tasks)) {
      tasks = [];
    }

    // Log generated tasks for debugging
    if (process.env.NODE_ENV === "development") {
      console.log(`[Task Generator] Generated ${tasks.length} tasks for role "${role}":`, tasks);
    }

    return tasks;
  } catch (error) {
    console.error("Error generating tasks:", error);
    return [];
  }
}

