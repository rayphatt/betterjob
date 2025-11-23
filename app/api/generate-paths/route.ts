import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentRole, skills, tasks, interests } = body;
    
    // Generate cache key
    const { generateCacheKey, getCachedCareerPaths, setCachedCareerPaths } = await import("@/lib/firestore");
    const cacheKey = generateCacheKey({
      currentRole: currentRole || "",
      skills: skills || [],
      tasks: tasks || [],
      interests: interests || [],
    });
    
    // Check cache first
    const cachedPaths = await getCachedCareerPaths(cacheKey);
    if (cachedPaths && cachedPaths.length > 0) {
      console.log(`[Generate Paths] Returning ${cachedPaths.length} cached paths`);
      return NextResponse.json(
        { success: true, careerPaths: cachedPaths, cached: true },
        {
          headers: {
            'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400', // 7 days
          },
        }
      );
    }
    
    // Dynamic import to avoid build-time issues
    const { getOpenAI } = await import("@/lib/openai");
    const openai = getOpenAI();

    if (!currentRole) {
      return NextResponse.json(
        { error: "Current role is required" },
        { status: 400 }
      );
    }

    const interestsList = interests && interests.length > 0 ? interests.join(", ") : "Not specified";
    const skillsList = skills && skills.length > 0 ? skills.join(", ") : "Not specified";
    const tasksList = tasks && tasks.length > 0 ? tasks.join(", ") : "Not specified";
    
    const prompt = `
You are a career exploration expert. Your goal is to help someone discover career opportunities that combine their existing professional skills with their genuine personal interests.

Professional Background:
- Current role: ${currentRole}
- Skills: ${skillsList}
- Tasks/Responsibilities: ${tasksList}

Personal Interests (CRITICAL - prioritize these heavily):
- Interests: ${interestsList}

IMPORTANT INSTRUCTIONS:
1. **Emphasize interests over similarity**: Don't just recommend similar roles. Instead, find creative ways to combine their skills with their interests.
2. **Industry/Company Context**: When possible, suggest roles WITHIN industries related to their interests (e.g., "Product Manager at a music tech company" if they're interested in music, or "Marketing Manager at an events company" if they're interested in events).
3. **Bridge the gap**: Show how their existing skills can be applied in new contexts that align with what they're genuinely interested in.
4. **Be creative**: Think outside the box - a Product Manager interested in music could work at Spotify, a Software Engineer interested in fitness could work at Peloton, etc.
5. **CRITICAL - NO FOUNDER ROLES**: Never recommend "Founder", "Co-Founder", "Entrepreneur", "Startup Founder", or any similar roles. We can only show real job postings, and founder positions are not available as job listings. Only recommend roles that have actual job postings available.

Generate EXACTLY 15 potential career paths as a JSON array. You MUST return exactly 15 paths, no more, no less. Organize them as:
- EXACTLY 5 "related" roles: Roles that directly combine their skills with their interests (e.g., same role type but in an industry related to their interests)
- EXACTLY 5 "stretch" roles: Roles that require some new skills but strongly align with their interests
- EXACTLY 5 "unexpected" roles: Creative, non-obvious combinations that bridge their skills and interests in unique ways

CRITICAL: You must return exactly 15 career paths. Count them carefully before returning the JSON.

For each role, include:
- The role title (be specific - include industry context when relevant, e.g., "Product Manager (Music Tech)" or "Marketing Manager (Events Industry)")
- A compelling reasoning that explains BOTH how their skills apply AND how it connects to their interests
- A brief overview (2-3 sentences) describing what the role entails, typical day-to-day responsibilities, and why it's a good fit
- Average salary range (provide realistic market rates)
- Typical degree required (e.g., "Bachelor's in Business, Finance, or related field" or "Bachelor's degree preferred, but experience may substitute")
- Sweet spots: An array of 3-5 skills/tasks from their current experience that directly overlap with this role. For each sweet spot, include:
  - The skill/task name (e.g., "Lead Qualification", "Data Analysis", "Project Management")
  - A detailed explanation (2-3 sentences) of how this skill translates to the new role
- Time to transition estimate
- Difficulty level
- An appropriate emoji icon

Return ONLY valid JSON with this exact structure:
[
  {
    "role": "Product Manager (Music Technology)",
    "category": "related",
    "matchScore": 88,
    "reasoning": "Your product management skills translate directly to music tech companies like Spotify or SoundCloud. You'd be managing products that align with your passion for music, combining your technical expertise with your genuine interest.",
    "overview": "As a Product Manager in music technology, you'll lead the development of digital music products and features. Your day-to-day involves working with engineering teams to build new features, analyzing user data to understand listening habits, and collaborating with music labels and artists. This role combines your product expertise with your passion for music, allowing you to shape how millions of people discover and enjoy music.",
    "averageSalary": "$120K-$180K",
    "typicalDegree": "Bachelor's degree in Business, Computer Science, or related field. MBA preferred but not required.",
    "sweetSpots": [
      {
        "skill": "Product Strategy",
        "explanation": "Your experience developing product roadmaps and strategic planning directly translates to managing music tech products. You'll use the same analytical thinking to prioritize features that enhance user experience in music discovery and streaming."
      },
      {
        "skill": "Data Analysis",
        "explanation": "Your ability to analyze user data and metrics is crucial for understanding listening patterns and user behavior in music platforms. This skill helps you make data-driven decisions about which features to build next."
      }
    ],
    "salaryRange": "$120K-$180K",
    "timeToTransition": "3-6 months",
    "difficulty": "easy",
    "icon": "🎵"
  },
  {
    "role": "Events Marketing Manager",
    "category": "stretch",
    "matchScore": 82,
    "reasoning": "While you'd need to learn marketing fundamentals, your project management and communication skills from product management are highly transferable. You'd be working in the events industry, which matches your interest in events and production.",
    "salaryRange": "$85K-$130K",
    "timeToTransition": "6-12 months",
    "difficulty": "moderate",
    "icon": "🎪"
  },
  ...
]

Categories should be: "related", "stretch", or "unexpected"
Difficulty should be: "easy", "moderate", or "challenging"
Match scores should be between 70-100
Make sure the reasoning explicitly mentions BOTH their skills/experience AND their interests
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use gpt-4o-mini for cost-effectiveness
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    // Parse the response - GPT-4 may return JSON as string
    const content = response.choices[0].message.content || "[]";
    let parsed;
    
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // If parsing fails, try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse response");
      }
    }
    
    // Handle both object and array responses
    let careerPaths = Array.isArray(parsed) 
      ? parsed 
      : parsed.careerPaths || parsed.paths || [];

    console.log(`[Generate Paths] Received ${careerPaths.length} paths from AI`);

    // Filter out any founder/entrepreneur roles
    const founderKeywords = ['founder', 'co-founder', 'entrepreneur', 'startup founder', 'ceo', 'chief executive'];
    const beforeFilter = careerPaths.length;
    careerPaths = careerPaths.filter((path: any) => {
      const roleLower = (path.role || '').toLowerCase();
      return !founderKeywords.some(keyword => roleLower.includes(keyword));
    });
    
    console.log(`[Generate Paths] ${beforeFilter} paths before filter, ${careerPaths.length} after filtering out founder roles`);

    // If we don't have enough paths, log a warning but still return what we have
    if (careerPaths.length < 15) {
      console.warn(`[Generate Paths] WARNING: Only received ${careerPaths.length} paths, expected 15. This may be due to AI response limitations.`);
    }

    // Cache the results
    await setCachedCareerPaths(cacheKey, careerPaths);

    return NextResponse.json(
      { success: true, careerPaths, cached: false },
      {
        headers: {
          'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400', // 7 days
        },
      }
    );
  } catch (error) {
    console.error("Error generating career paths:", error);
    return NextResponse.json(
      { error: "Failed to generate career paths" },
      { status: 500 }
    );
  }
}

