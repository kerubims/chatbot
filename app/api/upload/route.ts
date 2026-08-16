import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get file extension
    const originalName = file.name;
    const extension = originalName.split(".").pop() || "png";
    
    // Generate unique filename without any external library
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const filename = `${uniqueId}.${extension}`;

    // Define the upload path and ensure directory exists
    const uploadDir = join(process.cwd(), "public", "uploads", "avatars");
    await mkdir(uploadDir, { recursive: true });
    const filePath = join(uploadDir, filename);

    // Write file to public/uploads/avatars
    await writeFile(filePath, buffer);

    // Return the public URL
    const publicUrl = `/uploads/avatars/${filename}`;

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ success: false, error: "Failed to upload file" }, { status: 500 });
  }
}
