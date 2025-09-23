import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Menu, Home, User, Settings, LogOut, UserPlus } from 'lucide-react';
import ReferralSystem from '@/components/ReferralSystem';
import ProfileModal from '@/components/ProfileModal';

const MobileDrawer = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setIsOpen(false);
  };

  const handleAuthAction = () => {
    if (user) {
      navigate('/garden');
    } else {
      navigate('/auth');
    }
    setIsOpen(false);
  };

  const getInitials = (email: string): string => {
    return email
      .split('@')[0]
      .split('.')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="md:hidden h-12 w-12 hover:bg-primary/10"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      
      <SheetContent 
        side="left" 
        className="w-80 bg-background/95 backdrop-blur-md border-r border-border/50 z-50"
      >
        <SheetHeader className="text-left pb-6 border-b border-border/20">
          <SheetTitle className="text-2xl font-bold nctr-text">
            The Garden
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col h-full py-6">
          {/* Navigation Items */}
          <nav className="flex-1 space-y-2">
            {user ? (
              <>
                {/* User Profile Section */}
                <div className="pb-6 border-b border-border/20 mb-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                      <span className="text-primary font-bold text-sm">
                        {getInitials(user.email || '')}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{user.email}</p>
                      <p className="text-sm text-muted-foreground">Member</p>
                    </div>
                  </div>
                  
                  <ProfileModal>
                    <Button
                      variant="outline"
                      className="w-full justify-start h-12 text-left"
                    >
                      <User className="mr-3 h-5 w-5" />
                      View Profile
                    </Button>
                  </ProfileModal>
                </div>

                {/* Main Navigation */}
                <Button
                  variant="ghost"
                  className="w-full justify-start h-12 text-lg hover:bg-primary/10"
                  onClick={() => handleNavigation('/garden')}
                >
                  <Home className="mr-3 h-5 w-5" />
                  My Garden
                </Button>

                {/* Invite Friends */}
                <Button
                  variant="ghost"
                  className="w-full justify-start h-12 text-lg hover:bg-primary/10"
                  onClick={() => {
                    setInviteModalOpen(true);
                    setIsOpen(false);
                  }}
                >
                  <UserPlus className="mr-3 h-5 w-5" />
                  Invite Friends
                </Button>

                {/* Admin (if applicable) */}
                {isAdmin && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 text-lg hover:bg-primary/10"
                    onClick={() => handleNavigation('/admin')}
                  >
                    <Settings className="mr-3 h-5 w-5" />
                    Admin Panel
                  </Button>
                )}
              </>
            ) : (
              <>
                {/* Guest Navigation */}
                <Button
                  variant="ghost"
                  className="w-full justify-start h-12 text-lg hover:bg-primary/10"
                  onClick={() => handleNavigation('/')}
                >
                  <Home className="mr-3 h-5 w-5" />
                  Home
                </Button>

                <Button
                  variant="default"
                  className="w-full justify-start h-12 text-lg"
                  onClick={handleAuthAction}
                >
                  <UserPlus className="mr-3 h-5 w-5" />
                  Sign Up
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start h-12 text-lg"
                  onClick={handleAuthAction}
                >
                  Enter The Garden
                </Button>
              </>
            )}
          </nav>

          {/* Sign Out (for authenticated users) */}
          {user && (
            <div className="border-t border-border/20 pt-6">
              <Button
                variant="ghost"
                className="w-full justify-start h-12 text-lg text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
              >
                <LogOut className="mr-3 h-5 w-5" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </SheetContent>

      {/* Invite Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-md border border-border/50 z-50">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold nctr-text">
              Invite Friends to The Garden
            </DialogTitle>
          </DialogHeader>
          <ReferralSystem />
        </DialogContent>
      </Dialog>
    </Sheet>
  );
};

export default MobileDrawer;