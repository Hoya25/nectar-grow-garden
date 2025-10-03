import baseLogo from "@/assets/base-horizontal.svg";

interface BaseBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
  showText?: boolean;
  className?: string;
}

export const BaseBadge = ({ 
  size = 'md', 
  variant = 'light',
  showText = true,
  className = ''
}: BaseBadgeProps) => {
  const sizeClasses = {
    sm: 'h-4',
    md: 'h-5',
    lg: 'h-6'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const filterClasses = variant === 'dark' 
    ? 'brightness-0 invert' 
    : '';

  return (
    <a 
      href="https://www.base.org/" 
      target="_blank" 
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 opacity-70 hover:opacity-100 transition-all duration-300 group ${className}`}
    >
      {showText && (
        <span className={`font-medium ${textSizeClasses[size]}`}>
          Built on
        </span>
      )}
      <img 
        src={baseLogo} 
        alt="Base" 
        className={`w-auto ${sizeClasses[size]} ${filterClasses} transition-all duration-300`}
      />
    </a>
  );
};
