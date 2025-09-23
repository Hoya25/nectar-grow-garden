import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileOptimizedButtonProps extends ButtonProps {
  mobileSize?: "sm" | "default" | "lg";
  mobilePadding?: string;
}

const MobileOptimizedButton = ({ 
  className, 
  mobileSize = "default", 
  mobilePadding = "px-4 py-3",
  children,
  ...props 
}: MobileOptimizedButtonProps) => {
  const isMobile = useIsMobile();
  
  const mobileClasses = isMobile ? 
    `min-h-[44px] ${mobilePadding} text-base touch-manipulation` : 
    "";
    
  return (
    <Button 
      className={cn(mobileClasses, className)} 
      {...props}
    >
      {children}
    </Button>
  );
};

export default MobileOptimizedButton;