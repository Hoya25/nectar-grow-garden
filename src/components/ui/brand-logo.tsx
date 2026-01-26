import React, { useState, useRef, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  src?: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'square' | 'auto' | 'wide';
  className?: string;
  fallback?: React.ReactNode;
  onError?: () => void;
  onLoad?: () => void;
}

const BrandLogo: React.FC<BrandLogoProps> = ({
  src,
  alt,
  size = 'md',
  variant = 'auto',
  className,
  fallback,
  onError,
  onLoad,
}) => {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Size configurations optimized for different logo types
  const sizeConfig = {
    xs: { 
      container: 'h-6', 
      square: 'w-6 h-6', 
      wide: 'h-6 w-12', 
      auto: 'h-6 max-w-12'
    },
    sm: { 
      container: 'h-8', 
      square: 'w-8 h-8', 
      wide: 'h-8 w-16', 
      auto: 'h-8 max-w-16'
    },
    md: { 
      container: 'h-10', 
      square: 'w-10 h-10', 
      wide: 'h-10 w-20', 
      auto: 'h-10 max-w-20'
    },
    lg: { 
      container: 'h-12', 
      square: 'w-12 h-12', 
      wide: 'h-12 w-24', 
      auto: 'h-12 max-w-24'
    },
    xl: { 
      container: 'h-16', 
      square: 'w-16 h-16', 
      wide: 'h-16 w-32', 
      auto: 'h-16 max-w-32'
    },
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    if (imgRef.current && variant === 'auto') {
      const { naturalWidth, naturalHeight } = imgRef.current;
      setAspectRatio(naturalWidth / naturalHeight);
    }
    onLoad?.();
  };

  const handleImageError = () => {
    setImageError(true);
    onError?.();
  };

  // Determine the appropriate sizing based on variant and aspect ratio
  const getImageClasses = () => {
    const config = sizeConfig[size];
    
    if (imageError || !src) {
      return config.square;
    }

    switch (variant) {
      case 'square':
        return config.square;
      case 'wide':
        return config.wide;
      case 'auto':
        if (aspectRatio === null) {
          // Loading state - use square as fallback
          return config.square;
        }
        
        if (aspectRatio > 1.5) {
          // Wide/rectangular logo
          return config.auto;
        } else if (aspectRatio < 0.8) {
          // Tall logo
          return config.container + ' w-auto';
        } else {
          // Square-ish logo
          return config.square;
        }
      default:
        return config.auto;
    }
  };

  const containerClasses = cn(
    'relative flex items-center justify-center rounded bg-muted/30 overflow-hidden border border-border/20',
    sizeConfig[size].container,
    variant === 'auto' && aspectRatio && aspectRatio > 1.5 ? 'w-auto' : 'w-auto',
    className
  );

  const imageClasses = cn(
    'object-contain transition-opacity duration-200',
    getImageClasses(),
    imageLoaded ? 'opacity-100' : 'opacity-0'
  );

  if (imageError || !src) {
    return (
      <div className={containerClasses}>
        {fallback || (
          <Building2 
            className={cn(
              'text-muted-foreground',
              size === 'xs' && 'h-3 w-3',
              size === 'sm' && 'h-4 w-4',
              size === 'md' && 'h-5 w-5',
              size === 'lg' && 'h-6 w-6',
              size === 'xl' && 'h-8 w-8'
            )} 
          />
        )}
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={imageClasses}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="lazy"
      />
      {/* Loading placeholder */}
      {!imageLoaded && !imageError && (
        <div className={cn(
          'absolute inset-0 flex items-center justify-center bg-muted/50 animate-pulse',
        )}>
          <Building2 
            className={cn(
              'text-muted-foreground',
              size === 'xs' && 'h-3 w-3',
              size === 'sm' && 'h-4 w-4', 
              size === 'md' && 'h-5 w-5',
              size === 'lg' && 'h-6 w-6',
              size === 'xl' && 'h-8 w-8'
            )} 
          />
        </div>
      )}
    </div>
  );
};

export { BrandLogo };