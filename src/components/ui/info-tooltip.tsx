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
              "cursor-help",
              className
            )}
            aria-label="More information"
          >
            <Info size={size} />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs p-3 text-sm leading-relaxed bg-white text-black border border-gray-200 shadow-lg">
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