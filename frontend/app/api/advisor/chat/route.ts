import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY environment variable is not configured.' },
        { status: 400 }
      );
    }

    const { message, history } = await req.json();
    if (!message) {
      return NextResponse.json({ error: 'Message prompt is required.' }, { status: 400 });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const systemInstruction = `You are Dr. Marcus Vance, Senior Academic Advisor at Harmony College.
You are assisting Alexander Sterling (Student ID: 2024-8832), a senior Computer Science major at Harmony College.
Alexander's Current Stats:
- Cumulative GPA: 3.92
- Completed Credits: 105 / 120
- Active Courses: CS402 (Software Engineering II - 68%), DS301 (Database Systems - 42%), AI440 (Artificial Intelligence - 81%)
- Degree Status: 85% core requirements completed. Needs 15 more elective/capstone credits for graduation in Spring 2025.

Provide encouraging, precise, professional academic advice. Keep responses well-formatted with markdown, clear bullet points, and helpful tone.`;

    const contents = [];
    if (Array.isArray(history)) {
      for (const item of history) {
        contents.push({
          role: item.role === 'user' ? 'user' : 'model',
          parts: [{ text: item.content }]
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    const replyText = response.text || 'I apologize, but I could not generate a response at this moment.';
    return NextResponse.json({ response: replyText });
  } catch (err: any) {
    console.error('Error in Gemini Advisor endpoint:', err);
    return NextResponse.json(
      { error: err.message || 'Server error communicating with AI Advisor.' },
      { status: 500 }
    );
  }
}
