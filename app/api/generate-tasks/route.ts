import { NextRequest, NextResponse } from "next/server";
import { generateTasksForRole } from "@/lib/task-generator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role, company, count } = body;

    // Log incoming request for debugging
    console.log(`[Generate Tasks API] Received request:`, { role, company, count });

    if (!role || typeof role !== 'string' || role.trim() === '') {
      console.error(`[Generate Tasks API] Invalid role:`, role);
      return NextResponse.json(
        { error: "Role is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Ensure role is trimmed
    const trimmedRole = role.trim();
    const trimmedCompany = company?.trim();

    // Default to 4 tasks if count not specified (for backward compatibility)
    const taskCount = count || 4;
    
    console.log(`[Generate Tasks API] Calling generateTasksForRole with role: "${trimmedRole}", company: "${trimmedCompany}", count: ${taskCount}`);
    
    const tasks = await generateTasksForRole(trimmedRole, trimmedCompany, taskCount);
    
    console.log(`[Generate Tasks API] Generated ${tasks.length} tasks for role "${trimmedRole}"`);

    // Ensure we return exactly the requested number of tasks (slice if more, pad if less)
    const limitedTasks = tasks.slice(0, taskCount);

    return NextResponse.json({ success: true, tasks: limitedTasks });
  } catch (error) {
    console.error("Error generating tasks:", error);
    return NextResponse.json(
      { error: "Failed to generate tasks" },
      { status: 500 }
    );
  }
}

