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
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Advisor Chat Error:', err);
      const errorMsg: AdvisorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'm having trouble connecting to the advising server right now. (${err.message}). You can also schedule an in-person appointment using the booking panel on the right.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    setAppointmentSuccess(true);
    setTimeout(() => setAppointmentSuccess(false), 4000);
  };

  const quickPrompts = [
    'What electives should I take for AI specialization?',
    'How do I register for CS490 Senior Capstone?',
    'Will my GPA qualify me for Summa Cum Laude honors?',
    'How do I submit verification for my Financial Aid scholarship?'
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-8 pb-8"
    >
      {/* Header Banner */}
      <Card hoverable={false} className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="gold">Harmony Academic Advising Hub</Badge>
          <span className="text-xs text-emerald-400 font-mono font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> AI Advisor Online
          </span>
        </div>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mt-1">
          Harmony Academic Advising & Support
        </h2>
        <p className="font-sans text-xs sm:text-sm text-white/60">
          Get instant advising guidance from Dr. Marcus Vance or schedule a 1-on-1 consultation.
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 7 Cols: Gemini AI Advisor Chat */}
        <div className="lg:col-span-7 bg-[#141617] rounded-3xl border border-white/10 flex flex-col h-[620px] shadow-xl overflow-hidden">
          {/* Chat Top Bar */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E9C349] text-[#0F0F10] flex items-center justify-center font-bold font-serif shadow-md">
                MV
              </div>
              <div>
                <h3 className="font-sans text-sm sm:text-base font-bold text-white">
                  Dr. Marcus Vance
                </h3>
                <p className="font-mono text-xs text-[#E9C349]">
                  Senior Academic Advisor & CS Faculty
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
                      ? 'bg-[#E9C349] text-[#0F0F10] font-medium rounded-br-none shadow-sm'
                      : 'bg-white/10 text-white rounded-bl-none border border-white/10'
                  }`}
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
              <div className="flex items-center gap-2 text-xs text-white/50 italic font-mono">
                <Loader2 className="w-4 h-4 animate-spin text-[#E9C349]" />
                Dr. Vance is analyzing your degree transcript...
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-4 py-2.5 bg-white/5 border-t border-white/5 flex gap-2 overflow-x-auto">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                className="px-3 py-1.5 bg-white/10 hover:bg-[#E9C349]/20 border border-white/10 rounded-full text-xs text-white/70 whitespace-nowrap transition-colors touch-target"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Input Box */}
          <div className="p-3 sm:p-4 border-t border-white/10 bg-[#141617] flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask Dr. Vance about courses, degree audit, or honors..."
              className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[#E9C349] text-white placeholder:text-white/40"
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
            <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#E9C349]" />
              Schedule 1-on-1 Consultation
            </h3>

            {appointmentSuccess ? (
              <div className="p-5 bg-emerald-950/30 border border-emerald-800 text-emerald-300 rounded-2xl space-y-1.5 text-xs">
                <p className="font-bold flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Appointment Confirmed!
                </p>
                <p>Scheduled with Dr. Marcus Vance on {appointmentDate} at {appointmentTime}. Confirmation sent to {profile.email}.</p>
              </div>
            ) : (
              <form onSubmit={handleBookAppointment} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block font-semibold text-white/80 mb-1">
                    Advising Topic
                  </label>
                  <select
                    value={appointmentTopic}
                    onChange={(e) => setAppointmentTopic(e.target.value)}
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#E9C349] text-white"
                  >
                    <option className="bg-[#141617]">Spring 2025 Graduation Audit & Capstone</option>
                    <option className="bg-[#141617]">AI / Machine Learning Specialization Electives</option>
                    <option className="bg-[#141617]">Financial Aid & Scholarship Renewal</option>
                    <option className="bg-[#141617]">General Academic Counseling</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-white/80 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      required
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#E9C349] text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-white/80 mb-1">
                      Time Slot
                    </label>
                    <select
                      value={appointmentTime}
                      onChange={(e) => setAppointmentTime(e.target.value)}
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#E9C349] text-white"
                    >
                      <option value="10:00" className="bg-[#141617]">10:00 AM</option>
                      <option value="11:30" className="bg-[#141617]">11:30 AM</option>
                      <option value="14:00" className="bg-[#141617]">02:00 PM</option>
                      <option value="15:30" className="bg-[#141617]">03:30 PM</option>
                    </select>
                  </div>
                </div>

                <Button variant="primary" type="submit" className="w-full">
                  Confirm Appointment Booking
                </Button>
              </form>
            )}
          </Card>

          {/* Registrar Contact Desk */}
          <Card hoverable={false} className="space-y-3 text-xs">
            <h4 className="font-serif text-base font-bold text-white">
              Harmony College Registrar Office
            </h4>
            <p className="text-white/60">
              Administration Hall, Suite 102 • Open Mon - Fri 08:30 AM - 05:00 PM
            </p>
            <div className="pt-2 border-t border-white/10 flex justify-between text-[#E9C349] font-mono font-bold">
              <span>Email: registrar@harmony.edu</span>
              <span>Phone: (555) 019-2834</span>
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};
