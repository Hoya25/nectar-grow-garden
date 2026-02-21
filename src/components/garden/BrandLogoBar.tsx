const brands = [
  'Cymbiotika',
  'Onda Beauty',
  'Patagonia',
  'Kroma Wellness',
  'Moon Juice',
  'Sun Potion',
  'Four Sigmatic',
  'Golde',
];

const BrandLogoBar = () => {
  // Double the list for seamless loop
  const scrollBrands = [...brands, ...brands];

  return (
    <section className="relative w-full py-8 overflow-hidden bg-[hsl(var(--nctr-dark))] border-y border-[hsl(var(--nctr-mid))]/10">
      {/* Edge fades */}
      <div className="absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-[hsl(var(--nctr-dark))] to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-[hsl(var(--nctr-dark))] to-transparent pointer-events-none" />

      {/* Marquee track */}
      <div className="group flex w-max nctr-animate-marquee hover:[animation-play-state:paused]">
        {scrollBrands.map((name, i) => (
          <div
            key={`${name}-${i}`}
            className="flex items-center justify-center mx-8 sm:mx-12 shrink-0"
          >
            <span className="text-lg sm:text-xl font-semibold tracking-wide text-[hsl(var(--nctr-light))]/40 uppercase whitespace-nowrap select-none transition-colors duration-300 hover:text-[hsl(var(--nctr-accent))]">
              {name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default BrandLogoBar;
