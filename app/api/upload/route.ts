import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Max 10 MB per file
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, JPG, and PNG are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File is too large. Maximum size is 10 MB.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Build a unique, safe filename
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, uniqueName);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${uniqueName}`;

    return NextResponse.json({ success: true, fileUrl }, { status: 201 });
  } catch (error: any) {
    console.error('Upload API Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during file upload.' },
      { status: 500 }
    );
  }
}
