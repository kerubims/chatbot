import { NextResponse } from "next/server";
import translate from "translate";

translate.engine = "google"; // We can explicitly use the google engine

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const translatedText = await translate(text, { to: "id", from: "en" });

    return NextResponse.json({ translatedText });
  } catch (error: any) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: "Failed to translate text" },
      { status: 500 }
    );
  }
}
