import { NextResponse } from "next/server";
import { aiGenerate } from "@/ai/ai-wrapper";

export async function GET() {
  try {
    const result = await aiGenerate(
      "Tu es MiDi AI. Présente-toi en une phrase claire."
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[AI TEST API ERROR]", error);
    return NextResponse.json({
        success: false,
        error: error.message || "An unknown error occurred."
    }, { status: 500 });
  }
}
