import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useNavigate } from "react-router-dom";
import ProfileModal from "@/components/ProfileModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { User, Settings, Share2 } from "lucide-react";
import ReferralSystem from "@/components/ReferralSystem";
import { BaseBadge } from "@/components/BaseBadge";
import { Badge } from "@/components/ui/badge";

const Header = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

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
    await signOut();
    navigate('/');
  };

  return (
    <header className="w-full border-b border-border/30 bg-background/95 backdrop-blur-xl sticky top-0 z-50 shadow-minimal">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate('/')}>
            <span className="text-2xl font-bold text-slate-600 group-hover:text-slate-700 transition-all duration-300">The Garden</span>
            <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
              BETA
            </Badge>
          </div>
          
          {/* Built on Base Badge - Next to logo */}
          <div className="hidden lg:flex">
            <BaseBadge size="sm" variant="light" />
          </div>
        </div>
        
        <nav className="hidden md:flex items-center space-x-8">
          {!user ? (
            <>
              <Dialog>
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
                  {user ? (
                    <ReferralSystem />
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">Sign up to access your referral program and start inviting friends!</p>
              <Button onClick={() => navigate('/auth')} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Join The Garden
              </Button>
                    </div>
                  )}
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
                <span className="relative z-10">{user ? 'My Garden' : 'Enter The Garden'}</span>
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
              <Dialog>
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
                <span className="relative z-10">{user ? 'My Garden' : 'Enter The Garden'}</span>
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

        <div className="md:hidden flex items-center gap-2">
          <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
            BETA
          </Badge>
          {user ? (
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="rounded-xl p-2">
                    <Share2 className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-base">Invite Friends & Earn</DialogTitle>
                  </DialogHeader>
                  <ReferralSystem />
                </DialogContent>
              </Dialog>
              <Button variant="ghost" size="sm" onClick={handleAuthAction} className="rounded-xl px-3 py-2 text-sm">
                Garden
              </Button>
              <ProfileModal>
                <Button variant="ghost" size="sm" className="rounded-xl p-2">
                  <Avatar className="h-7 w-7 ring-2 ring-primary-glow/20">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-xs bg-white border-2 border-primary text-foreground">
                      {getInitials(user.email || 'User')}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </ProfileModal>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="rounded-xl p-2">
                    <Share2 className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-base">Invite Friends & Earn</DialogTitle>
                  </DialogHeader>
                  <div className="text-center py-6">
                    <p className="text-muted-foreground mb-4 text-sm">Sign up to access your referral program!</p>
                    <Button onClick={() => navigate('/auth')} className="bg-primary hover:bg-primary/90 text-primary-foreground w-full">
                      Join The Garden
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="ghost" size="sm" onClick={handleAuthAction} className="rounded-xl px-3 py-2 text-sm">
                Sign In
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;