import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

const GardenHero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center overflow-hidden bg-[hsl(var(--nctr-dark))]">
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--nctr-light)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--nctr-light)) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Lime accent glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[hsl(var(--nctr-accent))] opacity-[0.06] blur-[120px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center flex flex-col items-center gap-6">
        <h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white animate-fade-in leading-tight"
          style={{ textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}
        >
          Live Your Life.{' '}
          <span className="text-[hsl(var(--nctr-accent))]">Earn NCTR.</span>
        </h1>

        <p className="text-lg sm:text-xl md:text-2xl text-[hsl(var(--nctr-light))] max-w-2xl animate-fade-in [animation-delay:150ms] opacity-0 [animation-fill-mode:forwards]">
          Shop the brands you love. Earn rewards automatically.
        </p>

        <button
          onClick={() => navigate('/auth')}
          className="mt-4 px-8 py-4 rounded-xl text-lg font-bold bg-[hsl(var(--nctr-accent))] text-[hsl(var(--nctr-dark))] hover:opacity-90 transition-all duration-300 hover:scale-105 shadow-lg animate-fade-in [animation-delay:300ms] opacity-0 [animation-fill-mode:forwards]"
        >
          Start Earning →
        </button>

        {/* Stats bar */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-sm sm:text-base text-[hsl(var(--nctr-light))] animate-fade-in [animation-delay:450ms] opacity-0 [animation-fill-mode:forwards]">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--nctr-accent))]" />
            <strong className="text-white">6,813+</strong> Brands
          </span>
          <span className="hidden sm:inline text-[hsl(var(--nctr-mid))]/50">•</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--nctr-accent))]" />
            <strong className="text-white">50+</strong> Categories
          </span>
          <span className="hidden sm:inline text-[hsl(var(--nctr-mid))]/50">•</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--nctr-accent))]" />
            <strong className="text-white">$2M+</strong> Rewards Paid
          </span>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-[bounce_2s_ease-in-out_infinite] text-[hsl(var(--nctr-light))]/60">
        <span className="text-xs uppercase tracking-widest">Scroll</span>
        <ChevronDown className="w-5 h-5" />
      </div>
    </section>
  );
};

export default GardenHero;
