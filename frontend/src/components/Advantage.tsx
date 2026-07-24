import React, { useState } from 'react';
import Image from 'next/image';
import { Users, Handshake, FlaskConical, Award, ChevronDown, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BenefitDetails {
  title: string; subtitle: string; icon: React.ComponentType<any>; details: string[]; metric: string;
}

export default function Advantage() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const benefits: BenefitDetails[] = [
    {
      title: 'Expert Instructors', subtitle: 'Learn directly from working professionals with real industry experience.',
      icon: Users, metric: '1:15 Student Ratio',
      details: [
        'All instructors are active practitioners in their respective creative fields',
        'Direct mentorship from photographers, music producers, and designers',
        'Regular guest sessions with local media professionals and artists',
        'Practical feedback on every assignment, project, and portfolio piece',
      ],
    },
    {
      title: 'Industry Connections', subtitle: 'Internship and placement links with local media, agencies, and studios.',
      icon: Handshake, metric: '30+ Industry Partners',
      details: [
        'Connections with local photography studios, media houses, and agencies',
        'Regular collaboration with EBS TV, Fana Broadcasting, and Walta Media',
        'On-site work experience placements available for top-performing students',
        'Annual creative showcase attended by local employers and clients',
      ],
    },
    {
      title: 'Professional Studios', subtitle: 'Access to fully equipped studios for photography, music, film, and design.',
      icon: FlaskConical, metric: '6 Dedicated Studios',
      details: [
        'Professional photo and video studio with lighting rigs and camera equipment',
        'Cubase-equipped music production lab with vocal booth and studio monitors',
        'Graphic design workstations with Adobe Creative Suite',
        'Black-box theatre and film production workshop for performing arts students',
      ],
    },
    {
      title: 'Career-Ready Graduates', subtitle: "Programs built for immediate employment in Ethiopia's growing creative economy.",
      icon: Award, metric: '90% Placement Rate',
      details: [
        '90% of graduates find employment or clients within 3 months of completion',
        'Portfolio development embedded throughout every program',
        'Freelance business skills and client management taught in final terms',
        'Alumni network across Addis Ababa, Sheger, and Burayu creative industries',
      ],
    },
  ];

  return (
    <section
      className="py-24 relative overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      <div className="w-full px-6 sm:px-12 max-w-7xl mx-auto grid lg:grid-cols-12 gap-16 items-center">

        {/* Left: Image with floating card */}
        <div className="lg:col-span-5 relative">
          <div
            className="absolute -inset-4 rounded-2xl translate-x-6 translate-y-6 z-0"
            style={{ border: '1px solid rgba(233,195,73,0.20)' }}
          />
          <div className="relative z-10 w-full aspect-[4/5] overflow-hidden rounded-xl shadow-2xl">
            <Image
              fill priority
              className="object-cover brightness-[0.7] contrast-[1.05] hover:scale-105 transition-transform duration-700"
              alt="Harmony College students working in a creative studio"
              src="/advantage.png"
              sizes="(max-width: 1024px) 100vw, 42vw"
            />
            <div
              className="absolute bottom-6 right-6 left-6 sm:left-auto sm:max-w-xs rounded-xl backdrop-blur-md p-6 z-20 shadow-2xl"
              style={{ backgroundColor: 'var(--overlay-dark-bg)', border: '1px solid var(--border-default)' }}
            >
              <p className="font-serif text-3xl font-bold text-[#E9C349]">#1</p>
              <p className="font-sans text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Top Creative College in Sheger & Burayu Region, 2025.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Copy & expandable benefits */}
        <div className="lg:col-span-7 space-y-10">
          <div>
            <span className="text-[#E9C349] font-sans text-[10px] font-bold uppercase tracking-[0.25em] mb-4 block">
              The Harmony Advantage
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-extrabold leading-tight" style={{ color: 'var(--text-primary)' }}>
              Practical Skills, Real Results
            </h2>
          </div>

          <div className="space-y-4">
            {benefits.map((benefit, idx) => {
              const IconComponent = benefit.icon;
              const isExpanded = expandedIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl transition-all duration-300"
                  style={{
                    border: `1px solid ${isExpanded ? 'rgba(233,195,73,0.30)' : 'var(--border-card)'}`,
                    backgroundColor: isExpanded ? 'var(--bg-glass)' : 'var(--bg-card)',
                    padding: isExpanded ? '1.5rem' : '1.25rem',
                    cursor: !isExpanded ? 'pointer' : undefined,
                  }}
                  onClick={() => !isExpanded && setExpandedIndex(idx)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4 items-start">
                      <div
                        className="p-2.5 rounded-lg text-[#E9C349]"
                        style={{ backgroundColor: isExpanded ? 'rgba(233,195,73,0.10)' : 'var(--bg-glass)' }}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-serif text-base sm:text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                          {benefit.title}
                          <span className="font-mono text-[10px] uppercase font-medium tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            {benefit.metric}
                          </span>
                        </h4>
                        {!isExpanded && (
                          <p className="font-sans text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            {benefit.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                    {isExpanded ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedIndex(null); }}
                        className="p-1 rounded-full transition-colors hover:bg-white/10"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <ChevronDown className="w-4 h-4 transform rotate-180 transition-transform" />
                      </button>
                    ) : (
                      <ChevronDown className="w-4 h-4 mt-1.5" style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden mt-4 pt-4 space-y-4"
                        style={{ borderTop: '1px solid var(--border-subtle)' }}
                      >
                        <p className="font-sans text-sm" style={{ color: 'var(--text-secondary)' }}>{benefit.subtitle}</p>
                        <ul className="space-y-2.5">
                          {benefit.details.map((detail, dIdx) => (
                            <li key={dIdx} className="flex gap-2 items-start text-xs font-sans" style={{ color: 'var(--text-secondary)' }}>
                              <CheckCircle2 className="w-4 h-4 text-[#E9C349] mt-0.5 flex-shrink-0" />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
