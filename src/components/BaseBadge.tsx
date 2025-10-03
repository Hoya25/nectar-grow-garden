import baseLogo from "@/assets/base-horizontal.svg";

interface BaseBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
  className?: string;
}

export const BaseBadge = ({ 
  size = 'md', 
  variant = 'light',
  className = ''
}: BaseBadgeProps) => {
  const sizeClasses = {
    sm: { logo: 'h-4', text: 'text-xs' },
    md: { logo: 'h-5', text: 'text-sm' },
    lg: { logo: 'h-6', text: 'text-base' }
  };

  const filterClasses = variant === 'dark' 
    ? 'brightness-0 invert' 
    : '';

  const sizes = sizeClasses[size];

  return (
    <a 
      href="https://www.base.org/" 
      target="_blank" 
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 opacity-70 hover:opacity-100 transition-all duration-300 group ${className}`}
    >
      <span className={`font-medium ${sizes.text}`}>
        Built on
      </span>
      <img 
        src={baseLogo} 
        alt="Base" 
        className={`w-auto ${sizes.logo} ${filterClasses} transition-all duration-300`}
      />
    </a>
  );
};
