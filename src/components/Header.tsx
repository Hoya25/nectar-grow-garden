import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useNavigate } from "react-router-dom";
import ProfileModal from "@/components/ProfileModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Settings } from "lucide-react";

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
          <div className="flex items-center space-x-3 cursor-pointer group"
          onClick={() => navigate('/')}>
            <span className="text-2xl font-bold bg-gradient-premium bg-clip-text text-transparent group-hover:animate-gradient-shift bg-[length:200%_200%] transition-all duration-300">The Garden</span>
          </div>
        
        <nav className="hidden md:flex items-center space-x-8">
          {!user ? (
            <>
              <Button variant="ghost" className="text-foreground hover:text-primary-glow hover:bg-primary-glow/10 transition-all duration-300 rounded-xl px-6">
                Invite a Friend
              </Button>
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
              <Button variant="ghost" className="text-foreground hover:text-primary-glow hover:bg-primary-glow/10 transition-all duration-300 rounded-xl px-6">
                Invite a Friend
              </Button>
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

        <div className="md:hidden">
          {user ? (
            <div className="flex items-center gap-3">
              <ProfileModal>
                <Button variant="ghost" size="sm" className="rounded-xl">
                  <Avatar className="h-8 w-8 ring-2 ring-primary-glow/20">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-sm bg-white border-2 border-primary text-foreground">
                      {getInitials(user.email || 'User')}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </ProfileModal>
              <Button variant="ghost" size="sm" onClick={handleAuthAction} className="rounded-xl">
                Garden
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleAuthAction} className="rounded-xl">
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;