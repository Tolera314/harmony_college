'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageCircle, X, Send, Loader2, Bot, User,
  Sparkles, Trash2, ChevronDown,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ── Suggested prompts shown on first open ─────────────────────────────────────
const SUGGESTIONS = [
  'How do I register for courses?',
  'What are the tuition payment methods?',
  'How can I download my transcript?',
  'What is the academic calendar?',
];

// ── Format timestamp ──────────────────────────────────────────────────────────
function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full bg-[#E9C349]/60"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, isStreaming }: { msg: Message; isStreaming?: boolean }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mb-0.5 ${
        isUser ? 'bg-[#E9C349] text-[#0F0F10]' : 'bg-white/10 text-[#E9C349]'
      }`}>
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[78%] space-y-1 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed font-sans whitespace-pre-wrap ${
          isUser
            ? 'bg-[#E9C349] text-[#0F0F10] font-medium rounded-br-sm'
            : 'bg-white/8 border border-white/10 text-white/90 rounded-bl-sm'
        }`}>
          {msg.content}
          {/* Blinking cursor while streaming */}
          {isStreaming && (
            <motion.span
              className="inline-block w-[2px] h-[14px] bg-[#E9C349] ml-0.5 align-middle rounded-full"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.7, repeat: Infinity }}
            />
          )}
        </div>
        <span className="font-mono text-[10px] text-white/25 px-1">{formatTime(msg.timestamp)}</span>
      </div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AIAssistant() {
  const [open, setOpen]         = useState(false);
  const [input, setInput]       = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [unread, setUnread]     = useState(0);
  const [hidden, setHidden]     = useState(false); // hidden when messages tab is active

  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const abortRef    = useRef<AbortController | null>(null);

  // Hide when internal messaging is open (avoids overlap with chat input)
  useEffect(() => {
    const check = () => setHidden(document.body.hasAttribute('data-messaging-active'));
    const observer = new MutationObserver(check);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-messaging-active'] });
    check();
    return () => observer.disconnect();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  // Initial greeting
  useEffect(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm **Harmony AI**, your academic assistant. How can I help you today?\n\nYou can ask me about courses, grades, payments, transcripts, or anything related to Harmony College.",
      timestamp: new Date(),
    }]);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError('');
    setInput('');

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    // Placeholder AI message that we'll stream into
    const aiId = `a-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: aiId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }]);

    abortRef.current = new AbortController();

    try {
      const history = [...messages, userMsg]
        .filter((m) => m.id !== 'welcome' && m.id !== 'welcome-reset')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages: history }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Request failed');
      }

      if (!res.body) throw new Error('No response body');

      // Read stream token by token with a slight delay for natural typing feel
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();

      const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // Feed characters one at a time with a small delay
        for (const char of chunk) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId ? { ...m, content: m.content + char } : m
            )
          );
          await sleep(18); // ~55 chars/sec — comfortable reading speed
        }
      }

      if (!open) setUnread((n) => n + 1);

    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') {
        // Remove empty placeholder on abort
        setMessages((prev) => prev.filter((m) => m.id !== aiId));
        return;
      }
      // Show error inside the placeholder bubble
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId
            ? { ...m, content: '⚠ ' + ((err as Error).message ?? 'Something went wrong.') }
            : m
        )
      );
      setError('');
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [messages, loading, open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 'welcome-reset',
      role: 'assistant',
      content: "Chat cleared! I'm still here — how can I help you?",
      timestamp: new Date(),
    }]);
    setError('');
  };

  return (
    <>
      {/* ── Chat Panel ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && !hidden && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 right-4 sm:right-6 z-[9998] w-[calc(100vw-2rem)] sm:w-[400px] max-h-[600px] flex flex-col rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
            style={{ background: 'var(--bg-panel, #141617)' }}
            role="dialog"
            aria-label="Harmony AI Assistant"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-gradient-to-r from-[#E9C349]/10 to-transparent shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-[#E9C349]/30 shadow-md shrink-0">
                  <img src="/logo1.jpg" alt="Harmony College" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="font-serif text-sm font-bold text-white leading-none">Harmony AI</p>
                  <p className="font-mono text-[10px] text-[#E9C349] mt-0.5">Academic Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearChat}
                  title="Clear chat"
                  className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  title="Close"
                  className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-[200px] max-h-[400px]">
              {messages.map((msg, idx) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isStreaming={
                    loading &&
                    idx === messages.length - 1 &&
                    msg.role === 'assistant' &&
                    msg.content.length > 0
                  }
                />
              ))}

              {loading && messages[messages.length - 1]?.content === '' && (
                <div className="flex items-end gap-2">
                  <div className="w-7 h-7 rounded-full bg-white/10 text-[#E9C349] flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm">
                    <TypingDots />
                  </div>
                </div>
              )}

              {error && (
                <div className="px-3.5 py-2.5 bg-rose-950/40 border border-rose-800/40 rounded-2xl text-xs text-rose-300 font-sans">
                  ⚠ {error}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Suggestions — only when just the welcome message */}
            {messages.length <= 1 && (
              <div className="px-4 pb-2 flex flex-wrap gap-2 shrink-0">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-[#E9C349]/10 border border-white/10 hover:border-[#E9C349]/30 rounded-full font-sans text-[11px] text-white/60 hover:text-[#E9C349] transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-3 py-3 border-t border-white/10 bg-white/3 shrink-0">
              <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 focus-within:border-[#E9C349]/40 transition-colors">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Harmony AI anything…"
                  rows={1}
                  className="flex-1 bg-transparent font-sans text-sm text-white placeholder:text-white/30 outline-none resize-none max-h-32 leading-relaxed"
                  style={{ minHeight: '24px' }}
                  aria-label="Message input"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="w-8 h-8 rounded-xl bg-[#E9C349] hover:bg-[#d8b238] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-[#0F0F10] transition-all shrink-0 mb-0.5"
                  aria-label="Send message"
                >
                  {loading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Send className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
              <p className="font-mono text-[9px] text-white/20 text-center mt-1.5">
                Powered by Groq · Llama 3 · Press Enter to send
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Trigger Button ─────────────────────────────────────────── */}
      <motion.button
        onClick={() => setOpen((p) => !p)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className={`fixed bottom-5 right-4 sm:right-6 z-[9999] w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E9C349] focus-visible:ring-offset-2 transition-all duration-200${hidden ? ' pointer-events-none opacity-0 scale-75' : ''}`}
        style={{ background: 'linear-gradient(135deg, #E9C349 0%, #b8951d 100%)' }}
        aria-label={open ? 'Close AI Assistant' : 'Open AI Assistant'}
        aria-expanded={open}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close"
              initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-6 h-6 text-[#0F0F10]" />
            </motion.span>
          ) : (
            <motion.span key="open"
              initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageCircle className="w-6 h-6 text-[#0F0F10]" />
            </motion.span>
          )}
        </AnimatePresence>

        {/* Unread badge */}
        <AnimatePresence>
          {unread > 0 && !open && (
            <motion.span
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center font-mono text-[10px] font-bold text-white border-2 border-[#0F0F10]"
            >
              {unread}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Pulse ring when closed */}
        {!open && (
          <motion.span
            className="absolute inset-0 rounded-2xl border-2 border-[#E9C349]/50"
            animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </motion.button>
    </>
  );
}
