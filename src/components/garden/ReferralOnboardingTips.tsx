import { useState } from 'react';
import { ChevronDown, Copy, Check, MessageCircle, Trophy, Lightbulb, MapPin, Megaphone, Target } from 'lucide-react';
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
    <section
      className="w-full mx-auto animate-fade-in"
      style={{ maxWidth: 'var(--content-narrow)' }}
    >
      <h2
        className="flex items-center gap-2 mb-4"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-xl)',
          fontWeight: 'var(--weight-bold)',
          color: 'var(--color-text-primary)',
          letterSpacing: 'var(--tracking-tight)',
        }}
      >
        <Trophy className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
        Referral Tips
      </h2>

      <div className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
        {sections.map((s, i) => {
          const isOpen = openIndex === i;
          const Icon = s.icon;
          return (
            <div
              key={i}
              className="overflow-hidden"
              style={{
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-raised)',
                transition: `border-color var(--transition-fast), box-shadow var(--transition-fast)`,
                ...(isOpen ? { borderColor: 'var(--color-border-medium)' } : {}),
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(226,255,109,0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = isOpen ? 'var(--color-border-medium)' : 'var(--color-border)')}
            >
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center gap-3 text-left"
                style={{ padding: `var(--space-4) var(--space-5)` }}
              >
                <Icon className="w-5 h-5 shrink-0" style={{ color: 'var(--color-accent)' }} />
                <span
                  className="flex-1"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--weight-semibold)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {s.title}
                </span>
                <ChevronDown
                  className="w-4 h-4 shrink-0"
                  style={{
                    color: 'var(--color-text-muted)',
                    transition: `transform var(--transition-fast)`,
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                  }}
                />
              </button>

              <div
                className="grid"
                style={{
                  transition: `grid-template-rows var(--transition-standard), opacity var(--transition-standard)`,
                  gridTemplateRows: isOpen ? '1fr' : '0fr',
                  opacity: isOpen ? 1 : 0,
                }}
              >
                <div className="overflow-hidden">
                  <div
                    className="flex flex-col"
                    style={{ padding: `var(--space-1) var(--space-5) var(--space-5)`, gap: 'var(--space-2)' }}
                  >
                    {s.hint && (
                      <p
                        style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--color-text-muted)',
                          marginBottom: 'var(--space-2)',
                        }}
                      >
                        {s.hint}
                      </p>
                    )}

                    {s.items?.map((item, j) => (
                      <div
                        key={j}
                        className="flex items-start"
                        style={{
                          gap: 'var(--space-3)',
                          fontSize: 'var(--text-sm)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        <span
                          className="shrink-0"
                          style={{
                            marginTop: '0.4em',
                            width: 6,
                            height: 6,
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--color-accent)',
                          }}
                        />
                        {item}
                      </div>
                    ))}

                    {s.templates &&
                      messageTemplates.map((tmpl, j) => (
                        <button
                          key={j}
                          onClick={() => copyTemplate(tmpl, j)}
                          className="w-full flex items-start text-left group"
                          style={{
                            gap: 'var(--space-3)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--space-3)',
                            fontSize: 'var(--text-sm)',
                            background: 'var(--color-bg-surface)',
                            border: '1px solid var(--color-border)',
                            transition: `border-color var(--transition-fast)`,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(226,255,109,0.3)')}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                        >
                          <MessageCircle
                            className="w-4 h-4 shrink-0"
                            style={{ marginTop: 2, color: 'var(--color-accent)', opacity: 0.6 }}
                          />
                          <span className="flex-1" style={{ color: 'var(--color-text-secondary)' }}>
                            {tmpl}
                          </span>
                          {copiedIdx === j ? (
                            <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--color-accent)' }} />
                          ) : (
                            <Copy className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ReferralOnboardingTips;
