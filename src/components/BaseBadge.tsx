import baseLogo from "@/assets/base-horizontal.svg";

interface BaseBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
  className?: string;
  asLink?: boolean;
}

export const BaseBadge = ({ 
  size = 'md', 
  variant = 'light',
  className = '',
  asLink = true
}: BaseBadgeProps) => {
  const sizeClasses = {
    sm: { logo: 'h-5', text: 'text-lg' },
    md: { logo: 'h-6', text: 'text-xl' },
    lg: { logo: 'h-7', text: 'text-2xl' }
  };

  const filterClasses = variant === 'dark' 
    ? 'brightness-0 invert' 
    : '';

  const sizes = sizeClasses[size];

  const content = (
    <>
      <span className={`font-medium ${sizes.text} leading-none`}>
        Built on
      </span>
      <img 
        src={baseLogo} 
        alt="Base" 
        className={`w-auto ${sizes.logo} ${filterClasses} transition-all duration-300`}
      />
    </>
  );

  if (!asLink) {
    return (
      <div className={`inline-flex items-end gap-2 opacity-70 ${className}`}>
        {content}
      </div>
    );
  }

  return (
    <a 
      href="https://x.com/baseapp" 
      target="_blank" 
      rel="noopener noreferrer"
      className={`inline-flex items-end gap-2 opacity-70 hover:opacity-100 transition-all duration-300 group ${className}`}
    >
      {content}
    </a>
  );
};
