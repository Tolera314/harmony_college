/**
 * POST /api/ai/chat
 * Streams Groq completions to the frontend.
 * GROQ_API_KEY lives only in backend/.env — never exposed to the browser.
 * Requires authentication (student, staff, or admin).
 */
import { Router, Request, Response } from 'express';
import Groq from 'groq-sdk';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

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

router.post('/chat', async (req: Request, res: Response): Promise<void> => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: 'Groq API key not configured. Add GROQ_API_KEY to backend/.env' });
    return;
  }

  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'messages array is required' });
    return;
  }

  try {
    const groq   = new Groq({ apiKey });
    const stream = await groq.chat.completions.create({
      model:       'llama-3.1-8b-instant',
      temperature: 0.7,
      max_tokens:  512,
      stream:      true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.slice(-20),
      ],
    });

    // Stream tokens as plain text (same format the frontend already consumes)
    res.setHeader('Content-Type',   'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.flushHeaders();

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content ?? '';
      if (token) res.write(token);
    }

    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Harmony AI]', message);
    // If headers already sent (mid-stream), just end
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    } else {
      res.end();
    }
  }
});

export default router;
