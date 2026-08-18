'use client';

/**
 * SuccessConfetti
 * ───────────────
 * Pure-CSS confetti burst — no extra packages.
 * 40 particles, randomised colour / size / trajectory / delay.
 * Plays /public/sounds/applause.mp3 on mount (browser-permissioned).
 */

import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

const COLOURS = [
  '#E9C349', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#EF4444', '#ffffff',
];

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

interface Particle {
  id:     number;
  x:      number;   // vw start  0–100
  vx:     number;   // final vw offset
  vy:     number;   // final vh offset (always upward → fall)
  size:   number;
  colour: string;
  delay:  number;
  rotate: number;
  duration: number;
}

function makeParticles(n: number): Particle[] {
  return Array.from({ length: n }, (_, i) => ({
    id:       i,
    x:        rand(5, 95),
    vx:       rand(-20, 20),
    vy:       rand(-50, -90),
    size:     rand(6, 14),
    colour:   COLOURS[i % COLOURS.length],
    delay:    rand(0, 0.4),
    rotate:   rand(0, 720),
    duration: rand(1.4, 2.2),
  }));
}

const PARTICLES = makeParticles(50);

export function SuccessConfetti() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    try {
      const audio = new Audio('/sounds/applause.mp3');
      audio.volume = 0.55;
      audioRef.current = audio;
      // Play — may be silently rejected on browsers that require user gesture first
      audio.play().catch(() => {});
    } catch {
      // Sound unavailable — ignore
    }
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {PARTICLES.map(p => (
        <motion.div
          key={p.id}
          initial={{
            x:       `${p.x}vw`,
            y:       '100vh',
            opacity: 1,
            rotate:  0,
            scale:   1,
          }}
          animate={{
            x:       `calc(${p.x}vw + ${p.vx}vw)`,
            y:       `calc(100vh + ${p.vy}vh)`,
            opacity: [1, 1, 0],
            rotate:  p.rotate,
            scale:   [1, 1.2, 0.6],
          }}
          transition={{
            duration: p.duration,
            delay:    p.delay,
            ease:     'easeOut',
          }}
          style={{
            position:        'fixed',
            width:           p.size,
            height:          p.size * 0.5,
            backgroundColor: p.colour,
            borderRadius:    p.size < 10 ? '50%' : 2,
          }}
        />
      ))}
    </div>
  );
}
