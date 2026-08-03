import { NextResponse } from "next/server";
import { aiManager } from "@/core/ai/AIManager";

export async function GET() {
  try {
    const response = await aiManager.execute(
      "simple-test",
      {
        message: "Reply with exactly SUCCESS"
      }
    );

    return NextResponse.json({
      success: true,
      response
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
      stack: err
    });
  }
}