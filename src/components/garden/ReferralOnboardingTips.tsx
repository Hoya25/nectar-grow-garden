import { useState } from 'react';
import { ChevronDown, Copy, Check, MessageCircle, Mail, Share2, Trophy, Lightbulb, MapPin, Megaphone, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const messageTemplates = [
  "Hey! I've been earning rewards just by shopping brands I already love. Join me on The Garden — we both get NCTR when you sign up 🌱",
  "I just found a way to earn rewards on 6,800+ brands. No catch. Check out The Garden!",
  "Want free rewards for shopping? The Garden gives you NCTR on every purchase. Use my link and we both earn!",
];

const sections = [
  {
    icon: Lightbulb,
    title: 'How to Share Effectively',
    items: [
      'Lead with the benefit — "Earn rewards on brands you already shop"',
      'Keep it personal — share your own experience and what you\'ve earned',
      'Mention specific brands your friend already shops at',
      'Follow up once — a gentle reminder doubles conversion rates',
    ],
  },
  {
    icon: MapPin,
    title: 'Where to Share Your Link',
    items: [
      'Direct messages to close friends and family',
      'Instagram Stories with a quick screenshot of your rewards',
      'Group chats where you discuss deals or shopping',
      'Email signature for passive, ongoing referrals',
    ],
  },
  {
    icon: Megaphone,
    title: 'What to Say When You Share',
    hint: 'Tap any template below to copy it',
    templates: true,
  },
  {
    icon: Target,
    title: 'Remember: Milestone Rewards',
    items: [
      '3 friends → 150 NCTR bonus',
      '5 friends → 300 NCTR bonus',
      '10 friends → 750 NCTR bonus',
      '25 friends → 2,000 NCTR bonus',
      '50 friends → 5,000 NCTR — Legend status',
    ],
  },
];

const ReferralOnboardingTips = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const { toast } = useToast();

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  const copyTemplate = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast({ title: 'Copied!', description: 'Message template copied to clipboard.' });
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <section className="w-full max-w-2xl mx-auto space-y-3">
      <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-[hsl(var(--nctr-accent))]" />
        Referral Tips
      </h2>

      {sections.map((s, i) => {
        const isOpen = openIndex === i;
        const Icon = s.icon;
        return (
          <div
            key={i}
            className="rounded-xl border border-[hsl(var(--nctr-mid))]/15 bg-[hsl(var(--nctr-mid))]/5 overflow-hidden transition-colors duration-200 hover:border-[hsl(var(--nctr-accent))]/20"
          >
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left"
            >
              <Icon className="w-5 h-5 shrink-0 text-[hsl(var(--nctr-accent))]" />
              <span className="flex-1 font-semibold text-sm text-white">{s.title}</span>
              <ChevronDown
                className={`w-4 h-4 text-[hsl(var(--nctr-light))]/40 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>

            <div
              className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
              <div className="overflow-hidden">
                <div className="px-5 pb-5 pt-1 space-y-2">
                  {s.hint && (
                    <p className="text-xs text-[hsl(var(--nctr-light))]/50 mb-2">{s.hint}</p>
                  )}

                  {s.items?.map((item, j) => (
                    <div
                      key={j}
                      className="flex items-start gap-3 text-sm text-[hsl(var(--nctr-light))]/70"
                    >
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[hsl(var(--nctr-accent))] shrink-0" />
                      {item}
                    </div>
                  ))}

                  {s.templates &&
                    messageTemplates.map((tmpl, j) => (
                      <button
                        key={j}
                        onClick={() => copyTemplate(tmpl, j)}
                        className="w-full flex items-start gap-3 rounded-lg p-3 text-left text-sm bg-[hsl(var(--nctr-mid))]/10 border border-[hsl(var(--nctr-mid))]/10 hover:border-[hsl(var(--nctr-accent))]/30 transition-all duration-200 group"
                      >
                        <MessageCircle className="w-4 h-4 mt-0.5 shrink-0 text-[hsl(var(--nctr-accent))]/60 group-hover:text-[hsl(var(--nctr-accent))]" />
                        <span className="flex-1 text-[hsl(var(--nctr-light))]/70 group-hover:text-[hsl(var(--nctr-light))]">
                          {tmpl}
                        </span>
                        {copiedIdx === j ? (
                          <Check className="w-4 h-4 shrink-0 text-[hsl(var(--nctr-accent))]" />
                        ) : (
                          <Copy className="w-4 h-4 shrink-0 text-[hsl(var(--nctr-light))]/30 group-hover:text-[hsl(var(--nctr-light))]/60" />
                        )}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default ReferralOnboardingTips;
