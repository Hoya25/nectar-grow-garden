import React from 'react';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  content: string;
  className?: string;
  size?: number;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ 
  content, 
  className,
  size = 14 
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full",
              "text-muted-foreground hover:text-foreground",
              "transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "cursor-help z-10 relative",
              className
            )}
            aria-label="More information"
            onClick={handleClick}
            onTouchStart={handleTouchStart}
          >
            <Info size={size} />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          className="max-w-xs p-3 text-sm leading-relaxed bg-white text-black border shadow-md z-50"
          side="top"
          sideOffset={5}
        >
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Specific 360LOCK info tooltip with predefined content
export const Lock360InfoTooltip: React.FC<{ className?: string; size?: number }> = ({ 
  className, 
  size = 14 
}) => {
  return (
    <InfoTooltip
      content="360LOCK is a 360‑day commitment of your NCTR that fortifies the Alliance, making NCTR more valuable for everyone. In return, your Wings status increases, unlocking higher multipliers and access."
      className={className}
      size={size}
    />
  );
};

// Specific 90LOCK info tooltip with predefined content
export const Lock90InfoTooltip: React.FC<{ className?: string; size?: number }> = ({ 
  className, 
  size = 14 
}) => {
  return (
    <InfoTooltip
      content="90LOCK is your default anti‑abuse safeguard. Rewards vest over 90 days to keep the game fair and the token resilient. Commit to 360LOCK to level up your Wings status."
      className={className}
      size={size}
    />
  );
};