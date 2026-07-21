import React from 'react';

export default function Partners() {
  const brands = ['EBS TV', 'Fana Broadcasting', 'Walta Media', 'Ethiopian Music', 'Addis Media'];

  return (
    <section className="py-12 bg-[#0E0E0E] border-y border-white/5 relative overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#0E0E0E] to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0E0E0E] to-transparent z-10" />

      <div className="w-full px-6 sm:px-12 max-w-7xl mx-auto">
        <p className="text-center font-sans text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500 mb-8">
          Where Our Graduates Work
        </p>

        {/* Brand alignment with hover highlights */}
        <div className="flex flex-wrap justify-center items-center gap-x-16 gap-y-8 sm:gap-x-24">
          {brands.map((brand) => (
            <span
              key={brand}
              className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-gray-600 hover:text-[#E9C349] transition-all duration-300 cursor-default select-none hover:scale-110 transform"
            >
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
