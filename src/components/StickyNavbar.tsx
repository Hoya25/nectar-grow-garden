import { useState, useEffect, useCallback } from 'react';
import { Menu, X, User, ChevronDown } from 'lucide-react';
import nctrLogo from '@/assets/nctr-logo.svg';

/* ── Types ── */
interface NavItem {
  label: string;
  href: string;
}

interface UserData {
  name?: string;
  avatarUrl?: string;
  tier?: string;
}

interface Props {
  platform: 'garden' | 'crescendo';
  user?: UserData | null;
  onNavigate?: (href: string) => void;
  onProfileClick?: () => void;
}

const NAV_ITEMS: Record<string, NavItem[]> = {
  garden: [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/garden?tab=shop' },
    { label: 'Earn', href: '/garden?tab=earn' },
    { label: 'Learn', href: '/learn-and-earn' },
    { label: 'Profile', href: '/profile' },
  ],
  crescendo: [
    { label: 'My Rewards', href: '/crescendo/rewards' },
    { label: 'My Status', href: '/crescendo/status' },
    { label: 'Shop & Earn', href: '/garden?tab=shop' },
    { label: 'Bounties', href: '/crescendo/bounties' },
  ],
};

const StickyNavbar = ({ platform, user, onNavigate, onProfileClick }: Props) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = NAV_ITEMS[platform];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Lock body scroll when mobile menu is open */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleNav = useCallback(
    (href: string) => {
      setMobileOpen(false);
      onNavigate?.(href);
    },
    [onNavigate],
  );

  return (
    <>
      <header
        role="banner"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 'var(--z-sticky)',
          height: 'var(--nav-height)',
          display: 'flex',
          alignItems: 'center',
          padding: `0 var(--space-6)`,
          background: scrolled ? 'var(--nav-bg)' : 'transparent',
          backdropFilter: scrolled ? 'var(--nav-blur)' : 'none',
          WebkitBackdropFilter: scrolled ? 'var(--nav-blur)' : 'none',
          borderBottom: scrolled ? '1px solid var(--color-border)' : '1px solid transparent',
          transition: `background var(--transition-standard), border-color var(--transition-standard), backdrop-filter var(--transition-standard)`,
        }}
      >
        <div
          className="flex items-center justify-between w-full"
          style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}
        >
          {/* ── Logo ── */}
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); handleNav('/'); }}
            className="flex items-center"
            style={{ gap: 'var(--space-3)', textDecoration: 'none' }}
            aria-label="Home"
          >
            <img
              src={nctrLogo}
              alt="NCTR Alliance"
              style={{ height: 28, width: 'auto' }}
            />
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--weight-bold)',
                color: 'var(--color-text-primary)',
                letterSpacing: 'var(--tracking-tight)',
                textTransform: 'uppercase',
              }}
            >
              {platform === 'garden' ? 'The Garden' : 'Crescendo'}
            </span>
            <span
              style={{
                padding: '1px 8px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.625rem',
                fontWeight: 'var(--weight-semibold)',
                letterSpacing: 'var(--tracking-widest)',
                textTransform: 'uppercase',
                background: 'var(--color-accent)',
                color: 'var(--color-text-on-accent)',
                lineHeight: '1.6',
              }}
            >
              Beta
            </span>
          </a>

          {/* ── Desktop Nav ── */}
          <nav
            aria-label="Main navigation"
            className="items-center"
            style={{
              display: 'none',
              gap: 'var(--space-1)',
            }}
            /* Show on desktop via inline media-query workaround */
            ref={(el) => {
              if (el) el.style.display = window.innerWidth >= 768 ? 'flex' : 'none';
            }}
            id="desktop-nav"
          >
            {items.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => { e.preventDefault(); handleNav(item.href); }}
                style={{
                  padding: `var(--space-2) var(--space-4)`,
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--weight-medium)',
                  color: 'var(--color-text-secondary)',
                  textDecoration: 'none',
                  transition: `color var(--transition-fast), background var(--transition-fast)`,
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* ── Right side ── */}
          <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
            {/* Profile button — desktop */}
            <button
              onClick={onProfileClick}
              className="items-center"
              style={{
                display: 'none',
                gap: 'var(--space-2)',
                padding: `var(--space-1) var(--space-1) var(--space-1) var(--space-3)`,
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--color-border)',
                background: 'transparent',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: `border-color var(--transition-fast), color var(--transition-fast)`,
              }}
              ref={(el) => {
                if (el) el.style.display = window.innerWidth >= 768 ? 'flex' : 'none';
              }}
              id="desktop-profile"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent)';
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
              aria-label="Profile menu"
            >
              {user?.name && (
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>
                  {user.name.split(' ')[0]}
                </span>
              )}
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  style={{ width: 30, height: 30, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                />
              ) : (
                <span
                  className="flex items-center justify-center"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--color-bg-surface)',
                  }}
                >
                  <User className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                </span>
              )}
            </button>

            {/* Hamburger — mobile */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-md)',
                background: 'transparent',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                border: 'none',
              }}
              ref={(el) => {
                if (el) el.style.display = window.innerWidth >= 768 ? 'none' : 'flex';
              }}
              id="mobile-menu-btn"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Menu Overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 animate-fade-in"
          style={{
            zIndex: 'var(--z-modal-backdrop)',
            background: 'var(--color-bg-overlay)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={() => setMobileOpen(false)}
        >
          <nav
            aria-label="Mobile navigation"
            className="flex flex-col animate-slide-down"
            style={{
              paddingTop: 'var(--nav-height)',
              padding: `calc(var(--nav-height) + var(--space-6)) var(--space-6) var(--space-8)`,
              gap: 'var(--space-1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item, idx) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => { e.preventDefault(); handleNav(item.href); }}
                className="animate-slide-up"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: `var(--space-4) var(--space-4)`,
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-2xl)',
                  fontWeight: 'var(--weight-bold)',
                  color: 'var(--color-text-primary)',
                  textDecoration: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--tracking-tight)',
                  transition: `background var(--transition-fast)`,
                  animationDelay: `${idx * 60}ms`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {item.label}
              </a>
            ))}

            {/* Mobile profile */}
            <div
              className="animate-slide-up"
              style={{
                marginTop: 'var(--space-6)',
                paddingTop: 'var(--space-6)',
                borderTop: '1px solid var(--color-border)',
                animationDelay: `${items.length * 60}ms`,
              }}
            >
              <button
                onClick={() => { setMobileOpen(false); onProfileClick?.(); }}
                className="flex items-center w-full"
                style={{
                  gap: 'var(--space-3)',
                  padding: `var(--space-3) var(--space-4)`,
                  borderRadius: 'var(--radius-md)',
                  background: 'transparent',
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--weight-medium)',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    style={{ width: 36, height: 36, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                  />
                ) : (
                  <span
                    className="flex items-center justify-center"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--color-bg-surface)',
                    }}
                  >
                    <User className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />
                  </span>
                )}
                <span>{user?.name || 'My Profile'}</span>
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* ── Responsive CSS ── */}
      <style>{`
        @media (min-width: 768px) {
          #desktop-nav { display: flex !important; }
          #desktop-profile { display: flex !important; }
          #mobile-menu-btn { display: none !important; }
        }
        @media (max-width: 767px) {
          #desktop-nav { display: none !important; }
          #desktop-profile { display: none !important; }
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
};

export default StickyNavbar;
