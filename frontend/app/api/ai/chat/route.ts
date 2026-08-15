import { NextRequest } from 'next/server';
import Groq from 'groq-sdk';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are the Harmony College AI Assistant, helping students with admissions, enrollment, payments, and general college questions.

RULES:
- Keep answers short: 2-4 sentences, or a brief numbered list for steps
- Use simple, everyday words — avoid academic/administrative jargon
- Assume the student may not be a fluent English speaker
- Be warm and encouraging, like a helpful upperclassman
- If unsure, say so honestly and point them to the right office — never guess

EXAMPLE GOOD RESPONSE:
Student: "How do I register for classes?"
You: "Log into your student portal, go to 'Course Registration,' and pick your classes before the deadline. Some classes need you to finish other courses first — I can check which ones apply to you if you'd like."

Harmony College is a creative arts and professional university in Sheger, Burayu, Ethiopia. You help students, staff, and faculty with admissions, courses, grades, payments, transcripts, and campus life.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!process.env.GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Groq API key not configured. Add GROQ_API_KEY to .env.local' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create streaming completion
    const stream = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.slice(-20),
      ],
      temperature: 0.7,
      max_tokens: 512,
      stream: true,
    });

    // Return a ReadableStream that pipes Groq chunks as SSE
    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content ?? '';
            if (token) {
              // Send each token as a plain text chunk
              controller.enqueue(encoder.encode(token));
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff',
      },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Harmony AI] Error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
