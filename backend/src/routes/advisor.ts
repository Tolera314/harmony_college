import { Router, Request, Response } from 'express';

const router = Router();

// Simple rule-based advisor responses keyed by topic keywords
const advisorResponses: { keywords: string[]; response: string }[] = [
  {
    keywords: ['gpa', 'grade', 'cumulative', 'honors', 'summa'],
    response:
      "Based on your current GPA trajectory, you're on track for Summa Cum Laude honors at graduation. Keep maintaining your A average in your remaining courses and you'll comfortably exceed the 3.9 threshold.",
  },
  {
    keywords: ['capstone', 'cs490', 'senior', 'graduation project'],
    response:
      "To register for CS490 Senior Capstone, you need to have completed at least 90 credits with a GPA of 3.0 or higher. Visit the Course Registration tab and search for CS490. The registration window is currently open for Spring 2025.",
  },
  {
    keywords: ['elective', 'ai', 'machine learning', 'specialization'],
    response:
      "For an AI/Machine Learning specialization, I recommend: AI440 (Artificial Intelligence), DS501 (Advanced Data Science), and ML350 (Deep Learning Foundations). These three electives together fulfill the specialization track requirements.",
  },
  {
    keywords: ['financial', 'scholarship', 'aid', 'tuition'],
    response:
      "For Financial Aid and Scholarship renewal, submit your renewal application through the Financials tab before the semester deadline. You'll need your current GPA report and enrollment verification. Contact the Finance Office at finance@harmony.edu for specific scholarship conditions.",
  },
  {
    keywords: ['register', 'registration', 'course', 'enroll'],
    response:
      "You can register for courses through the Course Registration tab in your dashboard. The Fall 2024 registration window is currently open. Check your degree audit first to see which courses you still need to complete.",
  },
  {
    keywords: ['graduation', 'graduate', 'requirements', 'degree audit'],
    response:
      "According to your degree audit, you need 15 more credits to graduate. Completing your 3 in-progress courses this term plus CS490 Senior Capstone next semester puts you on track to graduate in May 2025 as planned.",
  },
];

function generateAdvisorResponse(message: string): string {
  const lower = message.toLowerCase();
  for (const entry of advisorResponses) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.response;
    }
  }
  return (
    "That's a great question. I'd recommend scheduling a 1-on-1 advising session so we can review your specific situation in detail. " +
    "You can use the appointment booking panel to find a time that works for you. In the meantime, the Degree Audit tab has a full overview of your progress toward graduation."
  );
}

// POST /api/advisor/chat
router.post('/chat', (req: Request, res: Response): void => {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'Message is required.' });
    return;
  }

  const response = generateAdvisorResponse(message.trim());
  res.status(200).json({ response });
});

export default router;
