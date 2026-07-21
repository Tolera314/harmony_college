import React from 'react';
import { Users, GraduationCap, Microscope, BookOpen } from 'lucide-react';

export default function Stats() {
  const stats = [
    {
      label: 'Enrolled Students',
      value: '500+',
      sub: 'From Sheger, Burayu & beyond',
      icon: Users,
    },
    {
      label: 'Expert Instructors',
      value: '30+',
      sub: 'Industry professionals & practitioners',
      icon: GraduationCap,
    },
    {
      label: 'Programs Offered',
      value: '10+',
      sub: 'Creative, media & digital fields',
      icon: BookOpen,
    },
    {
      label: 'Graduate Placement',
      value: '90%',
      sub: 'Employed within 3 months',
      icon: Microscope,
    },
  ];

  return (
    <section className="py-20 bg-[#0E0E0E] border-y border-white/5 relative">
      <div className="w-full px-6 sm:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-xl bg-[#1A1A1C]/30 border border-white/5 flex flex-col justify-between hover:border-[#E9C349]/30 transition-all group"
              >
                <div className="text-[#E9C349] p-2.5 rounded-lg bg-white/5 w-fit mb-6 group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-serif text-3xl sm:text-4xl font-black text-white">{stat.value}</p>
                  <p className="font-sans text-xs font-bold uppercase tracking-wider text-gray-300 mt-2">{stat.label}</p>
                  <p className="font-sans text-[11px] text-gray-500 mt-1">{stat.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
