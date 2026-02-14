import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import nctrNDark from "@/assets/nctr-n-transparent.png";
import nctrNLime from "@/assets/nctr-n-yellow.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <img src={nctrNDark} alt="NCTR" className="block dark:hidden w-16 h-16 object-contain mx-auto mb-6" />
        <img src={nctrNLime} alt="NCTR" className="hidden dark:block w-16 h-16 object-contain mx-auto mb-6" />
        <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/80">
          Return to The Garden
        </a>
      </div>
    </div>
  );
};

export default NotFound;
