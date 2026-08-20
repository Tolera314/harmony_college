import React, { useState, useRef, useEffect } from 'react';
import { AdvisorMessage, StudentProfile } from '../types';
import {
  Bot,
  Send,
  Calendar,
  CheckCircle2,
  Sparkles,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { dateToEthiopianTime } from '@/src/lib/utils';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';

interface SupportViewProps {
  profile: StudentProfile;
}

export const SupportView: React.FC<SupportViewProps> = ({ profile }) => {
  const [messages, setMessages] = useState<AdvisorMessage[]>([
    {
      id: 'm1',
      role: 'assistant',
      content: `Welcome Alexander! I'm Dr. Marcus Vance, Senior Academic Advisor at Harmony College.\n\nI can assist you with your Computer Science degree progress, elective choices for AI specialization, Spring 2025 capstone project registration, and graduation requirements. How can I help you today?`,
      timestamp: 'Just now'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Appointment Form State
  const [appointmentDate, setAppointmentDate] = useState('2024-07-25');
  const [appointmentTime, setAppointmentTime] = useState('14:00');
  const [appointmentTopic, setAppointmentTopic] = useState('Spring 2025 Graduation Audit & Capstone');
  const [appointmentSuccess, setAppointmentSuccess] = useState(false);
  const [appointmentError, setAppointmentError]   = useState('');
  const [appointmentLoading, setAppointmentLoading] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = textToSend || inputText;
    if (!prompt.trim() || isLoading) return;

    const userMsg: AdvisorMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: dateToEthiopianTime(new Date())
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/advisor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate advisor response.');
      }

      const botMsg: AdvisorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: dateToEthiopianTime(new Date())
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Advisor Chat Error:', err);
      const errorMsg: AdvisorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'm having trouble connecting to the advising server right now. (${err.message}). You can also schedule an in-person appointment using the booking panel on the right.`,
        timestamp: dateToEthiopianTime(new Date())
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppointmentLoading(true); setAppointmentError('');
    try {
      await (await import('@/src/lib/studentApi')).studentDashApi.bookAppointment({
        topic: appointmentTopic,
        requestedDate: new Date(appointmentDate).toISOString(),
        requestedTime: appointmentTime,
      });
      setAppointmentSuccess(true);
      setTimeout(() => setAppointmentSuccess(false), 5000);
    } catch (err: unknown) {
      setAppointmentError(err instanceof Error ? err.message : 'Booking failed. Please try again.');
    } finally { setAppointmentLoading(false); }
  };

  const quickPrompts = [
    'What electives should I take for AI specialization?',
    'How do I register for CS490 Senior Capstone?',
    'Will my GPA qualify me for Summa Cum Laude honors?',
    'How do I submit verification for my Financial Aid scholarship?'
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-8 pb-8"
    >
      {/* Header Banner */}
      <Card hoverable={false} className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="gold">Harmony Academic Advising Hub</Badge>
          <span className="text-xs font-mono font-semibold flex items-center gap-1" style={{ color: "var(--status-success)" }}>
            <Sparkles className="w-3.5 h-3.5" /> AI Advisor Online
          </span>
        </div>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>
          Harmony Academic Advising & Support
        </h2>
        <p className="font-sans text-xs sm:text-sm" style={{ color: "var(--text-secondary)" }}>  Get instant advising guidance from Dr. Marcus Vance or schedule a 1-on-1 consultation.
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 7 Cols: Gemini AI Advisor Chat */}
        <div className="lg:col-span-7 rounded-3xl border flex flex-col h-[620px] shadow-xl overflow-hidden" style={{ backgroundColor: "var(--bg-card-solid)", borderColor: "var(--border-default)" }}>
          {/* Chat Top Bar */}
          <div className="p-4 sm:p-5 border-b flex items-center justify-between" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--hover-overlay)" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E9C349] text-[#0F0F10] flex items-center justify-center font-bold font-serif shadow-md">
                MV
              </div>
              <div>
                <h3 className="font-sans text-sm sm:text-base font-bold" style={{ color: "var(--text-primary)" }}>  Dr. Marcus Vance
                </h3>
                <p className="font-mono text-xs" style={{ color: "var(--brand-gold)" }}>  Senior Academic Advisor & CS Faculty
                </p>
              </div>
            </div>
            <Badge variant="emerald">Gemini 3.6 Active</Badge>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 font-sans text-xs sm:text-sm">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-[#E9C349] text-[#0F0F10] flex items-center justify-center shrink-0 mt-1 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] p-4 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#E9C349] text-(--text-inverse) font-medium rounded-br-none shadow-sm'
                      : 'rounded-bl-none border'
                  }`}
                  style={m.role !== 'user' ? {
                    backgroundColor: 'var(--hover-overlay)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)',
                  } : undefined}
                >
                  <p>{m.content}</p>
                  <span className="block text-[10px] font-mono opacity-60 mt-1.5 text-right">
                    {m.timestamp}
                  </span>
                </div>

                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shrink-0 mt-1 font-bold text-xs shadow-xs">
                    AS
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs italic font-mono" style={{ color: "var(--text-muted)" }}>
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--brand-gold)" }} />
                Dr. Vance is analyzing your degree transcript...
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-4 py-2.5 border-t flex gap-2 overflow-x-auto" style={{ backgroundColor: "var(--hover-overlay)", borderColor: "var(--border-subtle)" }}>
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                className="px-3 py-1.5 border rounded-full text-xs whitespace-nowrap transition-colors touch-target" style={{ backgroundColor: "var(--hover-overlay)", borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Input Box */}
          <div className="p-3 sm:p-4 border-t flex gap-2" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-card-solid)" }}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask Dr. Vance about courses, degree audit, or honors..."
              className="flex-1 ds-input px-4 py-2.5 rounded-xl text-xs sm:text-sm focus:outline-none"
            />
            <Button
              variant="primary"
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputText.trim()}
              icon={<Send className="w-4 h-4" />}
            >
              Send
            </Button>
          </div>
        </div>

        {/* Right 5 Cols: Appointment Booking & Registrar Desk */}
        <div className="lg:col-span-5 space-y-6">
          {/* Appointment Booking Panel */}
          <Card hoverable={false} className="space-y-5">
            <h3 className="font-serif text-xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Calendar className="w-5 h-5" style={{ color: "var(--brand-gold)" }} />  Schedule 1-on-1 Consultation
            </h3>

            {appointmentSuccess ? (
              <div className="p-5 ds-badge-success border rounded-2xl space-y-1.5 text-xs">
                <p className="font-bold flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-5 h-5" style={{ color: "var(--status-success)" }} />
                  Appointment Confirmed!
                </p>
                <p>
                  Scheduled for {new Date(appointmentDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {appointmentTime}.
                  Confirmation sent to {profile.email}.
                </p>
              </div>
            ) : (
              <form onSubmit={handleBookAppointment} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>  Advising Topic
                  </label>
                  <select
                    value={appointmentTopic}
                    onChange={(e) => setAppointmentTopic(e.target.value)}
                    className="ds-input w-full p-3 rounded-xl focus:outline-none"
                  >
                    <option style={{ backgroundColor: "var(--bg-card-solid)" }}>Spring 2025 Graduation Audit & Capstone</option>
                    <option style={{ backgroundColor: "var(--bg-card-solid)" }}>AI / Machine Learning Specialization Electives</option>
                    <option style={{ backgroundColor: "var(--bg-card-solid)" }}>Financial Aid & Scholarship Renewal</option>
                    <option style={{ backgroundColor: "var(--bg-card-solid)" }}>General Academic Counseling</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>  Date
                    </label>
                    <input
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      required
                      className="ds-input w-full p-3 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>  Time Slot
                    </label>
                    <select
                      value={appointmentTime}
                      onChange={(e) => setAppointmentTime(e.target.value)}
                      className="ds-input w-full p-3 rounded-xl focus:outline-none"
                    >
                      <option value="10:00" style={{ backgroundColor: "var(--bg-card-solid)" }}>10:00 AM</option>
                      <option value="11:30" style={{ backgroundColor: "var(--bg-card-solid)" }}>11:30 AM</option>
                      <option value="14:00" style={{ backgroundColor: "var(--bg-card-solid)" }}>02:00 PM</option>
                      <option value="15:30" style={{ backgroundColor: "var(--bg-card-solid)" }}>03:30 PM</option>
                    </select>
                  </div>
                </div>

                <Button variant="primary" type="submit" disabled={appointmentLoading} className="w-full">
                  {appointmentLoading ? 'Booking…' : 'Confirm Appointment Booking'}
                </Button>
                {appointmentError && (
                  <p className="text-xs text-center font-mono" style={{ color: 'var(--status-danger)' }}>{appointmentError}</p>
                )}
              </form>
            )}
          </Card>

          {/* Registrar Contact Desk */}
          <Card hoverable={false} className="space-y-3 text-xs">
            <h4 className="font-serif text-base font-bold" style={{ color: "var(--text-primary)" }}>  Harmony College Registrar Office
            </h4>
            <p className="" style={{ color: "var(--text-secondary)" }}>  Administration Hall, Suite 102 • Open Mon - Fri 08:30 AM - 05:00 PM
            </p>
            <div className="pt-2 border-t flex justify-between font-mono font-bold" style={{ borderColor: "var(--border-default)", color: "var(--brand-gold)" }}>
              <span>Email: registrar@harmony.edu</span>
              <span>Phone: (555) 019-2834</span>
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};
