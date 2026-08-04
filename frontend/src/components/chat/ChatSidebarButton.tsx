'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MessageCircle } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

interface ChatSidebarButtonProps {
  isActive?: boolean;
  onClick: () => void;
  variant?: 'compact' | 'expanded';
  accent?: string;
}

export function ChatSidebarButton({
  isActive = false,
  onClick,
  variant = 'expanded',
  accent = '#E9C349',
}: ChatSidebarButtonProps) {
  const { onNewMessage } = useSocket();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (isActive) setUnread(0);
  }, [isActive]);

  useEffect(() => {
    const off = onNewMessage(() => {
      if (!isActive) setUnread((n) => n + 1);
    });
    return off;
  }, [onNewMessage, isActive]);

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: variant === 'expanded' ? 4 : 0, scale: variant === 'compact' ? 1.05 : 1 }}
      whileTap={{ scale: 0.97 }}
      className={`relative w-full flex items-center gap-3.5 px-3.5 py-2.5 text-left rounded-xl font-sans text-sm font-medium transition-all touch-target`}
      style={
        isActive
          ? { color: accent, backgroundColor: `${accent}18` }
          : { color: 'rgba(255,255,255,0.6)' }
      }
      aria-label="Messages"
    >
      <MessageCircle className="w-5 h-5 shrink-0" />
      {variant === 'expanded' && (
        <span className="hidden xl:inline truncate flex-1">Messages</span>
      )}
      {unread > 0 && !isActive && (
        <span
          className="shrink-0 min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-mono text-[9px] font-bold text-[#0F0F10]"
          style={{ backgroundColor: accent }}
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </motion.button>
  );
}
