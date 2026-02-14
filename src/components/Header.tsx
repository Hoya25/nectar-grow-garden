import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import nctrNLogo from "@/assets/nctr-n-yellow.png";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Menu, X, Share2, User, LogOut, Settings, ShoppingBag } from "lucide-react";
import ReferralSystem from "@/components/ReferralSystem";


import ProfileModal from "@/components/ProfileModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Header = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const getInitials = (email: string) => {
    return email
      .split('@')[0]
      .split('.')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAuthAction = () => {
    if (user) {
      navigate('/garden');
    } else {
      navigate('/auth');
    }
  };

  const handleSignOut = async () => {
    setMobileMenuOpen(false);
    await signOut();
    navigate('/');
  };

  const handleNavClick = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  return (
    <header className="w-full border-b border-border/30 bg-background/95 backdrop-blur-xl sticky top-0 z-50 shadow-minimal">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <img src={nctrNLogo} alt="NCTR" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold text-foreground hidden md:inline">The Garden</span>
            <span className="text-lg font-bold text-foreground md:hidden">The Garden</span>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-accent-lime text-black">BETA</span>
          </div>
          
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {!user ? (
            <>
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="text-foreground hover:text-primary-glow hover:bg-primary-glow/10 transition-all duration-300 rounded-xl px-6">
                    <Share2 className="w-4 h-4 mr-2" />
                    Invite a Friend
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto mx-4 sm:mx-0">
                  <DialogHeader>
                    <DialogTitle>Invite Friends & Earn Together</DialogTitle>
                  </DialogHeader>
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">Sign up to access your referral program and start inviting friends!</p>
                    <Button onClick={() => { setInviteDialogOpen(false); navigate('/auth'); }} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      Join The Garden
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button 
                variant="ghost" 
                className="text-foreground hover:text-primary-glow hover:bg-primary-glow/10 transition-all duration-300 rounded-xl px-6"
                onClick={() => navigate('/auth')}
              >
                Sign Up
              </Button>
              <Button 
                className="bg-white border-2 border-primary text-foreground hover:bg-section-highlight shadow-soft hover:shadow-glow transition-all duration-500 hover:scale-105 rounded-xl px-8 relative overflow-hidden group"
                onClick={handleAuthAction}
              >
                <span className="relative z-10">Enter The Garden</span>
                <div className="absolute inset-0 bg-section-highlight opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </Button>
              {isAdmin && (
                <Button 
                  variant="outline"
                  onClick={() => navigate('/admin')}
                  className="ml-2 border-primary/30 hover:border-primary hover:bg-primary/5 transition-all duration-300 rounded-xl"
                >
                  Admin
                </Button>
              )}
            </>
          ) : (
            <>
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="text-foreground hover:text-primary-glow hover:bg-primary-glow/10 transition-all duration-300 rounded-xl px-6">
                    <Share2 className="w-4 h-4 mr-2" />
                    Invite a Friend
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto mx-4 sm:mx-0">
                  <DialogHeader>
                    <DialogTitle>Invite Friends & Earn Together</DialogTitle>
                  </DialogHeader>
                  <ReferralSystem />
                </DialogContent>
              </Dialog>
              <Button 
                variant="default" 
                className="bg-white border-2 border-primary text-foreground hover:bg-section-highlight shadow-soft hover:shadow-glow transition-all duration-500 hover:scale-105 rounded-xl px-8 relative overflow-hidden group"
                onClick={handleAuthAction}
              >
                <span className="relative z-10">My Garden</span>
                <div className="absolute inset-0 bg-section-highlight opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </Button>
              
              {isAdmin && (
                <Button 
                  variant="outline"
                  onClick={() => navigate('/admin')}
                  className="ml-2 border-primary/30 hover:border-primary hover:bg-primary/5 transition-all duration-300 rounded-xl"
                >
                  Admin
                </Button>
              )}

              <ProfileModal>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="flex items-center gap-2 hover:bg-primary-glow/10 transition-all duration-300 rounded-xl"
                >
                  <Avatar className="h-8 w-8 ring-2 ring-primary-glow/20 transition-all duration-300 hover:ring-primary-glow/40">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-sm bg-white border-2 border-primary text-foreground font-medium">
                      {getInitials(user.email || 'User')}
                    </AvatarFallback>
                  </Avatar>
                  <Settings className="h-4 w-4" />
                </Button>
              </ProfileModal>
              
              <Button 
                variant="outline"
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 border-primary/30 hover:border-primary hover:bg-primary/5 transition-all duration-300 rounded-xl"
              >
                <User className="h-4 w-4" />
                Profile
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleSignOut}
                className="border-border/50 hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive transition-all duration-300 rounded-xl"
              >
                Sign Out
              </Button>
            </>
          )}
        </nav>

        {/* Mobile: Hamburger */}
        <div className="md:hidden" ref={menuRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-10 w-10"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Mobile slide-down panel */}
          <div
            className={`absolute top-full left-0 right-0 bg-background border-b border-border shadow-lg transition-all duration-300 ease-in-out overflow-hidden ${
              mobileMenuOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
              {user ? (
                <>
                  <Button
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => handleNavClick('/garden')}
                  >
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    My Garden
                  </Button>
                  <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Share2 className="w-4 h-4 mr-2" />
                        Invite a Friend
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-base">Invite Friends & Earn</DialogTitle>
                      </DialogHeader>
                      <ReferralSystem />
                    </DialogContent>
                  </Dialog>
                  <button
                    onClick={() => handleNavClick('/profile')}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleNavClick('/admin')}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Admin
                    </button>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Button
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => handleNavClick('/auth')}
                  >
                    Enter The Garden
                  </Button>
                  <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Share2 className="w-4 h-4 mr-2" />
                        Invite a Friend
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-base">Invite Friends & Earn</DialogTitle>
                      </DialogHeader>
                      <div className="text-center py-6">
                        <p className="text-muted-foreground mb-4 text-sm">Sign up to access your referral program!</p>
                        <Button onClick={() => { setInviteDialogOpen(false); navigate('/auth'); }} className="bg-primary hover:bg-primary/90 text-primary-foreground w-full">
                          Join The Garden
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <button
                    onClick={() => handleNavClick('/auth')}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;