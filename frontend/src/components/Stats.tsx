import React from 'react';
import { Users, GraduationCap, Microscope, BookOpen } from 'lucide-react';

export default function Stats() {
  const stats = [
    { label: 'Enrolled Students',   value: '500+', sub: 'From Sheger, Burayu & beyond',           icon: Users },
    { label: 'Expert Instructors',  value: '30+',  sub: 'Industry professionals & practitioners', icon: GraduationCap },
    { label: 'Programs Offered',    value: '10+',  sub: 'Creative, media & digital fields',       icon: BookOpen },
    { label: 'Graduate Placement',  value: '90%',  sub: 'Employed within 3 months',               icon: Microscope },
  ];

  return (
    <section
      className="py-20 border-y relative transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <div className="w-full px-6 sm:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-xl flex flex-col justify-between hover:border-[#E9C349]/30 transition-all group"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-card)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div
                  className="text-[#E9C349] p-2.5 rounded-lg w-fit mb-6 group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: 'var(--bg-glass)' }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-serif text-3xl sm:text-4xl font-black" style={{ color: 'var(--text-primary)' }}>
                    {stat.value}
                  </p>
                  <p className="font-sans text-xs font-bold uppercase tracking-wider mt-2" style={{ color: 'var(--text-secondary)' }}>
                    {stat.label}
                  </p>
                  <p className="font-sans text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    {stat.sub}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
