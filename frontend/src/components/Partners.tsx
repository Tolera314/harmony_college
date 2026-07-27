import React from 'react';

export default function Partners() {
  const brands = ['EBS TV', 'Fana Broadcasting', 'Walta Media', 'Ethiopian Music', 'Addis Media'];

  return (
    <section
      className="py-12 border-y relative overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <div className="absolute inset-y-0 left-0 w-24 z-10"
        style={{ background: 'linear-gradient(to right, var(--bg-surface), transparent)' }} />
      <div className="absolute inset-y-0 right-0 w-24 z-10"
        style={{ background: 'linear-gradient(to left, var(--bg-surface), transparent)' }} />

      <div className="w-full px-6 sm:px-12 max-w-7xl mx-auto">
        <p className="text-center font-sans text-[10px] font-bold uppercase tracking-[0.25em] mb-8"
          style={{ color: 'var(--text-muted)' }}>
          Where Our Graduates Work
        </p>

        <div className="flex flex-wrap justify-center items-center gap-x-16 gap-y-8 sm:gap-x-24">
          {brands.map((brand) => (
            <span
              key={brand}
              className="font-serif text-xl sm:text-2xl font-bold tracking-tight hover:text-[#E9C349] transition-all duration-300 cursor-default select-none hover:scale-110 transform"
              style={{ color: 'var(--text-faint)' }}
            >
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
