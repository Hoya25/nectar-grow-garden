import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

type Platform = 'garden' | 'crescendo';

interface OnboardingGuideModalProps {
  platform: Platform;
  onComplete: () => void;
}

const CONTENT: Record<Platform, { icon: string; title: string; body: string; substeps?: { icon: string; text: string }[] }[]> = {
  garden: [
    {
      icon: '🌱',
      title: 'Welcome to The Garden',
      body: 'The Garden is your home for earning NCTR — just by living your life. Shop, learn, and share to grow your rewards.',
    },
    {
      icon: '🛒',
      title: 'How Earning Works',
      body: 'Browse brands, shop like normal, and earn NCTR automatically. Every purchase builds your Crescendo status.',
      substeps: [
        { icon: '🔍', text: 'Browse 6,800+ brands' },
        { icon: '💳', text: 'Shop like you normally would' },
        { icon: '✨', text: 'Earn NCTR automatically' },
      ],
    },
    {
      icon: '💎',
      title: 'Build Your Status',
      body: 'The more NCTR you commit, the higher your Crescendo tier. Higher tiers unlock exclusive rewards and perks — from Bronze all the way to Diamond.',
    },
  ],
  crescendo: [
    {
      icon: '🎵',
      title: 'Welcome to Crescendo',
      body: 'Crescendo is where your NCTR becomes status. The more you commit, the more you unlock.',
    },
    {
      icon: '🔓',
      title: 'Your Status Unlocks Everything',
      body: 'Each tier — Bronze, Silver, Gold, Platinum, Diamond — opens access to better rewards, higher earn rates, and exclusive drops.',
      substeps: [
        { icon: '🥉', text: 'Bronze — Just getting started' },
        { icon: '🥈', text: 'Silver — Building momentum' },
        { icon: '🥇', text: 'Gold+ — Premium access' },
      ],
    },
    {
      icon: '🔒',
      title: 'Level Up with 360LOCK',
      body: 'Commit your NCTR for 360 days for maximum status boost. The longer you commit, the higher you climb and the better your rewards.',
    },
  ],
};

const STORAGE_KEYS: Record<Platform, string> = {
  garden: 'garden_onboarded',
  crescendo: 'crescendo_onboarded',
};

const OnboardingGuideModal = ({ platform, onComplete }: OnboardingGuideModalProps) => {
  const [step, setStep] = useState(0);
  const steps = CONTENT[platform];
  const current = steps[step];
  const isLast = step === steps.length - 1;

  const finish = () => {
    localStorage.setItem(STORAGE_KEYS[platform], 'true');
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Non-dismissible overlay */}
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 w-full h-full md:h-auto md:max-w-[480px] md:rounded-2xl flex flex-col overflow-hidden bg-[hsl(var(--nctr-dark))]">
        {/* Skip */}
        <button
          onClick={finish}
          className="absolute top-4 right-4 p-2 rounded-lg text-[hsl(var(--nctr-light))]/50 hover:text-[hsl(var(--nctr-light))] hover:bg-[hsl(var(--nctr-mid))]/20 transition-colors"
          aria-label="Skip onboarding"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-10 text-center">
          <span className="text-6xl mb-6 animate-fade-in" key={`icon-${step}`}>
            {current.icon}
          </span>

          {current.substeps && (
            <div className="flex flex-col gap-3 mb-6 w-full max-w-xs animate-fade-in" key={`sub-${step}`}>
              {current.substeps.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-xl px-5 py-3 bg-[hsl(var(--nctr-mid))]/15 border border-[hsl(var(--nctr-mid))]/10"
                >
                  <span className="text-2xl shrink-0">{s.icon}</span>
                  <span className="text-sm font-medium text-left text-[hsl(var(--nctr-light))]">
                    {s.text}
                  </span>
                </div>
              ))}
            </div>
          )}

          <h2
            className="text-2xl md:text-3xl font-bold text-white mb-4 animate-fade-in"
            key={`title-${step}`}
          >
            {current.title}
          </h2>
          <p
            className="text-sm md:text-base leading-relaxed text-[hsl(var(--nctr-light))]/80 max-w-sm mb-8 animate-fade-in"
            key={`body-${step}`}
          >
            {current.body}
          </p>

          {/* Nav buttons */}
          <div className="flex items-center gap-3 w-full max-w-xs">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1 px-4 py-3 rounded-xl text-sm font-medium border border-[hsl(var(--nctr-mid))]/30 text-[hsl(var(--nctr-light))] hover:bg-[hsl(var(--nctr-mid))]/15 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={isLast ? finish : () => setStep(step + 1)}
              className="flex-1 flex items-center justify-center gap-1 px-6 py-3 rounded-xl text-sm font-bold bg-[hsl(var(--nctr-accent))] text-[hsl(var(--nctr-dark))] hover:opacity-90 transition-all hover:scale-[1.02]"
            >
              {isLast ? 'Get Started →' : 'Next'}
              {!isLast && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-6 bg-[hsl(var(--nctr-accent))]'
                  : 'w-2.5 bg-[hsl(var(--nctr-mid))]/40'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default OnboardingGuideModal;
