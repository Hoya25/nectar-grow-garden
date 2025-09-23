import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { User, UserPlus } from 'lucide-react';
import ReferralSystem from '@/components/ReferralSystem';
import ProfileModal from '@/components/ProfileModal';
import MobileDrawer from '@/components/MobileDrawer';

const Header = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

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

  if (isMobile) {
    return (
      <header className="section-highlight backdrop-blur-sm border-b border-section-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <MobileDrawer />
            
            <h1 className="text-xl font-bold nctr-text cursor-pointer" onClick={() => navigate('/')}>
              The Garden
            </h1>
            
            {!user && (
              <Button 
                size="sm"
                onClick={handleAuthAction}
                className="bg-primary hover:bg-primary-glow text-primary-foreground text-sm px-4 py-2 h-10 min-h-[44px] touch-manipulation"
              >
                Sign In
              </Button>
            )}
            
            {user && (
              <ProfileModal>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 border-primary/30 section-text hover:bg-primary/10 hover:text-primary h-10 px-3 min-h-[44px] touch-manipulation"
                >
                  <User className="w-4 h-4" />
                  <span className="text-xs font-medium">
                    {getInitials(user.email || '')}
                  </span>
                </Button>
              </ProfileModal>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="section-highlight backdrop-blur-sm border-b border-section-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        {/* Desktop Navigation */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold nctr-text cursor-pointer" onClick={() => navigate('/')}>
              The Garden
            </h1>
            
            {user && (
              <nav className="flex items-center space-x-6">
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/garden')}
                  className="section-text hover:text-primary transition-colors h-10"
                >
                  My Garden
                </Button>
                
                {/* Invite a Friend with Dialog */}
                <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost"
                      className="section-text hover:text-primary transition-colors h-10"
                    >
                      Invite a Friend
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-md border border-border/50 z-50">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold nctr-text">
                        Invite Friends to The Garden
                      </DialogTitle>
                    </DialogHeader>
                    <ReferralSystem />
                  </DialogContent>
                </Dialog>
              </nav>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {!user ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleAuthAction}
                  className="border-primary/30 section-text hover:bg-primary/10 hover:text-primary h-10"
                >
                  Sign Up
                </Button>
                <Button 
                  onClick={handleAuthAction}
                  className="bg-primary hover:bg-primary-glow text-primary-foreground shadow-soft h-10"
                >
                  Enter The Garden →
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/garden')}
                  className="section-text hover:text-primary transition-colors h-10"
                >
                  My Garden
                </Button>
                
                {isAdmin && (
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate('/admin')}
                    className="section-text hover:text-primary transition-colors h-10"
                  >
                    Admin
                  </Button>
                )}
                
                {/* Profile Access */}
                <ProfileModal>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 border-primary/30 section-text hover:bg-primary/10 hover:text-primary h-10"
                  >
                    <User className="w-4 h-4" />
                    <span className="font-medium">
                      {getInitials(user.email || '')}
                    </span>
                  </Button>
                </ProfileModal>
                
                <Button 
                  variant="ghost" 
                  onClick={handleSignOut}
                  className="section-text hover:text-primary transition-colors h-10"
                >
                  Sign Out
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;