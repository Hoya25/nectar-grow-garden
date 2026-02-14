import React from 'react';

export const GARDEN_COLORS = {
  garden: '#4ade80',
  gardenDark: '#16a34a',
  gold: '#fbbf24',
  goldDark: '#d97706',
  lime: '#a3e635',
  tiers: {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
    diamond: '#B9F2FF',
  },
} as const;

type LogoVariant = 'orbital' | 'bold' | 'clean';
type ThemeMode = 'dark' | 'light';

interface GardenLogoProps {
  variant?: LogoVariant;
  size?: number;
  showWordmark?: boolean;
  theme?: ThemeMode;
  className?: string;
}

const rad = (a: number) => (a * Math.PI) / 180;

const getColors = (theme: ThemeMode) => ({
  main: theme === 'dark' ? '#4ade80' : '#16a34a',
  gold: theme === 'dark' ? '#fbbf24' : '#d97706',
  center: theme === 'dark' ? '#4ade80' : '#16a34a',
  centerBold: theme === 'dark' ? '#ffffff' : '#16a34a',
});

const R = 28;
const GAP = 40;
const SA = -90;
const EA = SA + (360 - GAP);
const X1 = R * Math.cos(rad(SA));
const Y1 = R * Math.sin(rad(SA));
const X2 = R * Math.cos(rad(EA));
const Y2 = R * Math.sin(rad(EA));
const ARC = `M ${X1.toFixed(2)} ${Y1.toFixed(2)} A ${R} ${R} 0 1 1 ${X2.toFixed(2)} ${Y2.toFixed(2)}`;

export function GardenLogo({
  variant = 'orbital',
  size = 40,
  showWordmark = false,
  theme = 'dark',
  className = '',
}: GardenLogoProps) {
  const colors = getColors(theme);
  const vh = showWordmark ? 200 : 100;
  const cy = showWordmark ? 78 : 50;
  const uid = `gdn-${variant}-${Math.random().toString(36).slice(2, 6)}`;

  return (
    <svg viewBox={`0 0 200 ${vh}`} width={size} height={size * (vh / 200)} className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}-grad`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors.main} />
          <stop offset={variant === 'bold' ? '50%' : '100%'} stopColor={variant === 'bold' ? colors.main : colors.gold} stopOpacity={variant === 'bold' ? 1 : 0.8} />
          {variant === 'bold' && <stop offset="100%" stopColor={colors.gold} />}
        </linearGradient>
        {variant === 'orbital' && (
          <filter id={`${uid}-glow`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        )}
      </defs>

      <g transform={`translate(100,${cy})`}>
        <circle cx="0" cy="0" r={variant === 'bold' ? 26 : R} fill="none" stroke={colors.main} strokeWidth={variant === 'bold' ? 9 : 3.5} opacity={theme === 'dark' ? 0.05 : 0.08} />

        {variant === 'bold' ? (
          <>
            <path d="M -8.06 -24.72 A 26 26 0 1 1 -16.97 -19.64" fill="none" stroke={`url(#${uid}-grad)`} strokeWidth="9" strokeLinecap="round" />
            <path d={`M -12 -24 C -6 -36, -2 -40, -4 -30`} fill="none" stroke={colors.gold} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
          </>
        ) : (
          <path d={ARC} fill="none" stroke={`url(#${uid}-grad)`} strokeWidth={variant === 'clean' ? 5 : 3.5} strokeLinecap="round" />
        )}

        {variant === 'orbital' && (
          <>
            <circle cx={X1} cy={Y1} r="5" fill={colors.main} opacity="0.12" filter={`url(#${uid}-glow)`} />
            <circle cx={X1} cy={Y1} r="3" fill={colors.main}>
              <animate attributeName="r" values="3;4;3" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
            </circle>
            <path d={`M ${X2.toFixed(2)} ${Y2.toFixed(2)} C ${X2 + 4} ${Y2 - 8}, ${X2 - 2} ${Y2 - 10}, ${X2 - 1} ${Y2 - 4}`} fill={colors.gold} opacity="0.5">
              <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2.5s" repeatCount="indefinite" />
            </path>
          </>
        )}

        {variant === 'clean' && (
          <>
            <circle cx={X1} cy={Y1} r="3" fill={colors.main} />
            <circle cx={X2} cy={Y2} r="3" fill={colors.gold} opacity="0.6" />
          </>
        )}

        <text x="1" y={variant === 'bold' ? 5 : 4} textAnchor="middle" dominantBaseline="central" fill={variant === 'bold' ? colors.centerBold : colors.center} fontFamily="Inter,system-ui,sans-serif" fontSize={variant === 'bold' ? 24 : 22} fontWeight={variant === 'bold' ? 900 : 800}>G</text>
      </g>

      {showWordmark && (
        <g>
          <text x="100" y="158" textAnchor="middle" fill={colors.main} opacity="0.5" fontFamily="Inter,system-ui,sans-serif" fontSize="11" fontWeight="500" letterSpacing="4">THE</text>
          <text x="100" y="178" textAnchor="middle" fill={colors.main} fontFamily="Inter,system-ui,sans-serif" fontSize="20" fontWeight="800" letterSpacing="6">GARDEN</text>
        </g>
      )}
    </svg>
  );
}

export default GardenLogo;
