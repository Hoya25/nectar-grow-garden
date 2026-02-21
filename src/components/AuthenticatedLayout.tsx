import { useState } from 'react';
import nctrLogo from '@/assets/nctr-logo.svg';
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
      <header className="sticky top-0 z-50 h-14 bg-white border-b border-[#E5E7EB] backdrop-blur-sm">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          {/* Left: Logo */}
          <button
            onClick={() => navigate('/garden')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <svg className="h-8 w-8" viewBox="0 0 434 434" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M130.444 309.52C128.745 309.52 127.279 308.902 126.044 307.667C124.809 306.432 124.191 304.965 124.191 303.267V209.485C124.191 207.787 124.809 206.32 126.044 205.085C127.279 203.85 128.745 203.233 130.444 203.233H161.473C163.325 203.233 164.483 202.461 164.946 200.917C165.101 200.609 165.178 200.145 165.178 199.528C165.178 198.447 164.869 197.598 164.252 196.981C159.62 192.504 154.603 187.564 149.2 182.161C143.797 176.603 138.548 171.355 133.454 166.415L126.044 158.773C124.809 157.538 124.191 156.072 124.191 154.373V130.523C124.191 128.825 124.809 127.358 126.044 126.123C127.279 124.888 128.745 124.271 130.444 124.271H154.294C155.992 124.271 157.459 124.888 158.694 126.123L256.876 224.073C257.648 224.845 258.497 225.231 259.423 225.231C260.504 225.231 261.353 224.845 261.97 224.073C262.742 223.302 263.128 222.452 263.128 221.526V187.254C263.128 185.556 263.039 177.682 263.039 177.682C263.039 177.682 262.719 174.55 264.676 172.629C266.455 170.778 268.468 170.565 269.373 170.565H301.897C306.063 170.565 309.44 173.942 309.44 178.109V185.332V224.305C309.44 226.003 308.823 227.47 307.588 228.705C306.353 229.94 304.886 230.557 303.188 230.557H272.159C270.307 230.557 269.149 231.329 268.686 232.873C268.531 233.181 268.454 233.645 268.454 234.262C268.454 235.343 268.763 236.192 269.38 236.809C274.012 241.286 279.029 246.303 284.432 251.861C289.835 257.264 295.084 262.435 300.178 267.375L307.588 275.017C308.823 276.252 309.44 277.718 309.44 279.417V303.267C309.44 304.965 308.823 306.432 307.588 307.667C306.353 308.902 304.886 309.52 303.188 309.52H279.337C277.639 309.52 276.173 308.902 274.938 307.667L176.756 209.717C175.984 208.945 175.135 208.559 174.209 208.559C173.128 208.559 172.202 208.945 171.43 209.717C170.812 210.488 170.504 211.338 170.504 212.264V303.267C170.504 304.965 169.886 306.432 168.651 307.667C167.416 308.902 165.95 309.52 164.252 309.52H130.444Z" fill="#323232"/>
            </svg>
            <span className="text-lg font-bold text-[#323232]">The Garden</span>
            <Badge variant="secondary" className="text-[10px] font-semibold px-1.5 py-0 bg-[#E2FF6D] text-[#323232] border-[#E2FF6D]/20">
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
