import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

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
          className="flex items-center space-x-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">🌱</span>
          </div>
          <span className="text-xl font-bold text-primary">The Garden</span>
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
          <Button variant="ghost" size="sm" onClick={handleAuthAction}>
            {user ? 'My Garden' : 'Sign In'}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;