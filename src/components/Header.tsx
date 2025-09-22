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
    <header className="w-full border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={() => navigate('/')}
        >
          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gradient-hero shadow-soft group-hover:shadow-glow transition-all duration-300">
            <video 
              className="w-full h-full object-cover scale-150 translate-y-1"
              autoPlay
              loop
              muted
              playsInline
              disablePictureInPicture
            >
              <source src="/assets/logo-animation.mp4" type="video/mp4" />
              <div className="w-full h-full bg-gradient-hero flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">🌱</span>
              </div>
            </video>
          </div>
          <span className="text-xl font-bold text-primary group-hover:text-primary-glow transition-colors duration-300">The Garden</span>
        </div>
        
        <nav className="hidden md:flex items-center space-x-8">
          {!user ? (
            <>
              <Button variant="ghost" className="text-foreground hover:text-primary">
                Refer a Friend
              </Button>
              <Button 
                variant="ghost" 
                className="text-foreground hover:text-primary"
                onClick={() => navigate('/auth')}
              >
                Sign Up
              </Button>
              <Button 
                className="bg-gradient-hero hover:opacity-90 text-white"
                onClick={handleAuthAction}
              >
                {user ? 'My Garden' : 'Enter The Garden'}
              </Button>
              {isAdmin && (
                <Button 
                  variant="outline"
                  onClick={() => navigate('/admin')}
                  className="ml-2"
                >
                  Admin
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="ghost" className="text-foreground hover:text-primary">
                Refer a Friend
              </Button>
              <Button 
                variant="default" 
                className="bg-gradient-hero hover:opacity-90 transition-opacity"
                onClick={handleAuthAction}
              >
                {user ? 'My Garden' : 'Enter The Garden'}
              </Button>
              
              {isAdmin && (
                <Button 
                  variant="outline"
                  onClick={() => navigate('/admin')}
                  className="ml-2"
                >
                  Admin
                </Button>
              )}

              <ProfileModal>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {getInitials(user.email || 'User')}
                    </AvatarFallback>
                  </Avatar>
                  <Settings className="h-4 w-4" />
                </Button>
              </ProfileModal>
              
              <Button 
                variant="outline"
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Profile
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </>
          )}
        </nav>

        <div className="md:hidden">
          {user ? (
            <div className="flex items-center gap-2">
              <ProfileModal>
                <Button variant="ghost" size="sm">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {getInitials(user.email || 'User')}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </ProfileModal>
              <Button variant="ghost" size="sm" onClick={handleAuthAction}>
                Garden
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleAuthAction}>
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;