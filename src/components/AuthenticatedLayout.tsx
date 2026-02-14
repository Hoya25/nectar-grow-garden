import { useState } from 'react';
import nctrNLogo from '@/assets/nctr-n-yellow.png';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNCTRPrice } from '@/hooks/useNCTRPrice';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  ShoppingBag,
  LayoutDashboard,
  BookOpen,
  Users,
  User,
  Power,
  Menu,
  ExternalLink,
  Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Shop', path: '/garden?tab=shop', icon: ShoppingBag, matchPath: '/garden' },
  { label: 'Dashboard', path: '/garden?tab=dashboard', icon: LayoutDashboard, matchPath: '/garden' },
  { label: 'Learn', path: '/learn', icon: BookOpen, matchPath: '/learn' },
  { label: 'Referrals', path: '/referrals', icon: Users, matchPath: '/referrals' },
];

const MOBILE_TABS = [
  { label: 'Shop', path: '/garden?tab=shop', icon: ShoppingBag, matchTab: 'shop' },
  { label: 'Dashboard', path: '/garden?tab=dashboard', icon: LayoutDashboard, matchTab: 'dashboard' },
  { label: 'Learn', path: '/learn', icon: BookOpen },
  { label: 'Invite', path: '/referrals', icon: Users },
  { label: 'Profile', path: '/profile', icon: User },
];

const AuthenticatedLayout = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { currentPrice, formatPrice } = useNCTRPrice();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'shop';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (item: typeof NAV_ITEMS[0]) => {
    if (!location.pathname.startsWith(item.matchPath)) return false;
    // For garden sub-tabs, differentiate shop vs dashboard
    if (item.matchPath === '/garden') {
      if (item.label === 'Shop') return location.pathname === '/garden' && currentTab === 'shop';
      if (item.label === 'Dashboard') return location.pathname === '/garden' && currentTab === 'dashboard';
    }
    return true;
  };

  const isMobileActive = (item: typeof MOBILE_TABS[0]) => {
    if (item.matchTab) {
      return location.pathname === '/garden' && currentTab === item.matchTab;
    }
    return location.pathname === item.path;
  };

  const handleNav = (path: string) => {
    setMobileMenuOpen(false);
    // Parse the path for query params
    if (path.includes('?')) {
      const [pathname, search] = path.split('?');
      navigate(`${pathname}?${search}`);
    } else {
      navigate(path);
    }
  };

  const userInitial = user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Top Navigation Bar */}
      <header className="sticky top-0 z-50 h-14 bg-card border-b border-border backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          {/* Left: Logo */}
          <button
            onClick={() => navigate('/garden')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img src={nctrNLogo} alt="NCTR" className="w-7 h-7 object-contain" />
            <span className="text-lg font-bold text-foreground">The Garden</span>
            <Badge variant="secondary" className="text-[10px] font-semibold px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
              BETA
            </Badge>
          </button>

          {/* Center: Navigation links (desktop only) */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => handleNav(item.path)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  isActive(item)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
            {/* Crescendo external link */}
            <a
              href="https://crescendo.nctr.live"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 text-[#9AB700] hover:bg-[#C8FF00]/10"
            >
              Crescendo
              <ExternalLink className="h-3 w-3" />
            </a>
          </nav>

          {/* Right: NCTR stats + profile + sign out (desktop) */}
          <div className="hidden md:flex items-center gap-3">
            {/* Live Price compact */}
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 text-xs">
              <span className="text-muted-foreground">NCTR</span>
              <span className="font-semibold text-foreground">${formatPrice(currentPrice)}</span>
            </div>

            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin')}
                className="h-8 w-8"
                title="Admin Panel"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}

            {/* Profile avatar */}
            <button
              onClick={() => navigate('/profile')}
              className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"
              title="Profile"
            >
              {userInitial}
            </button>

            {/* Sign out */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              title="Sign Out"
            >
              <Power className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile: Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 pt-12">
                <nav className="flex flex-col gap-1">
                  {NAV_ITEMS.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => handleNav(item.path)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive(item)
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </button>
                  ))}
                  {/* Crescendo */}
                  <a
                    href="https://crescendo.nctr.live"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[#9AB700] hover:bg-[#C8FF00]/10 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ExternalLink className="h-5 w-5" />
                    Crescendo
                  </a>

                  <div className="my-3 border-t border-border" />

                  {isAdmin && (
                    <button
                      onClick={() => handleNav('/admin')}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted"
                    >
                      <Settings className="h-5 w-5" />
                      Admin Panel
                    </button>
                  )}

                  <button
                    onClick={() => handleNav('/profile')}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted"
                  >
                    <User className="h-5 w-5" />
                    Profile
                  </button>

                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10"
                  >
                    <Power className="h-5 w-5" />
                    Sign Out
                  </button>

                  {/* NCTR Price in drawer */}
                  <div className="mt-4 mx-4 p-3 bg-muted/50 rounded-lg text-xs text-center">
                    <span className="text-muted-foreground">NCTR Live Price: </span>
                    <span className="font-semibold text-foreground">${formatPrice(currentPrice)}</span>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main>
        <Outlet />
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-[60px] md:hidden z-50 bg-card border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.05)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around h-full px-1">
          {MOBILE_TABS.map((item) => {
            const active = isMobileActive(item);
            return (
              <button
                key={item.label}
                onClick={() => handleNav(item.path)}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 transition-colors ${
                  active
                    ? 'text-[#9AB700]'
                    : 'text-muted-foreground'
                }`}
              >
                <item.icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom spacer for mobile nav */}
      <div className="h-[60px] md:hidden" />
    </div>
  );
};

export default AuthenticatedLayout;
