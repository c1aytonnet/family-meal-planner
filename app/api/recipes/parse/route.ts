import { NextResponse } from "next/server";
import { parseRecipeDraft } from "@/lib/ai/recipe-parser";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      rawText?: string;
      sourceUrl?: string;
    };

    const recipe = await parseRecipeDraft({
      rawText: body.rawText,
      sourceUrl: body.sourceUrl,
    });

    return NextResponse.json({ recipe });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Recipe parsing failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
