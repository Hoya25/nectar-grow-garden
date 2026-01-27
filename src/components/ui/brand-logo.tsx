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

// Generate initials from brand name for fallback display
const getInitials = (name: string): string => {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
};

// Generate a consistent color based on brand name
const getColorFromName = (name: string): string => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
    'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-cyan-500',
    'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-violet-500'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

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

  // Reset state when src changes
  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
    setAspectRatio(null);
  }, [src]);

  // Force hide loading state after timeout (fallback for lazy load issues)
  useEffect(() => {
    if (!src || imageLoaded || imageError) return;
    
    const timeout = setTimeout(() => {
      // If image still hasn't loaded after 3 seconds, check status
      if (imgRef.current) {
        if (imgRef.current.complete && imgRef.current.naturalWidth > 0) {
          setImageLoaded(true);
        } else {
          // Treat as error - image failed to load
          setImageError(true);
          setImageLoaded(true);
        }
      }
    }, 3000);
    
    return () => clearTimeout(timeout);
  }, [src, imageLoaded, imageError]);

  // Check if image is already loaded (from cache)
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setImageLoaded(true);
      if (variant === 'auto') {
        const { naturalWidth, naturalHeight } = imgRef.current;
        setAspectRatio(naturalWidth / naturalHeight);
      }
    }
  }, [src, variant]);

  // Size configurations optimized for different logo types
  const sizeConfig = {
    xs: { 
      container: 'h-6', 
      square: 'w-6 h-6', 
      wide: 'h-6 w-12', 
      auto: 'h-6 max-w-12',
      text: 'text-[8px]'
    },
    sm: { 
      container: 'h-8', 
      square: 'w-8 h-8', 
      wide: 'h-8 w-16', 
      auto: 'h-8 max-w-16',
      text: 'text-[10px]'
    },
    md: { 
      container: 'h-10', 
      square: 'w-10 h-10', 
      wide: 'h-10 w-20', 
      auto: 'h-10 max-w-20',
      text: 'text-xs'
    },
    lg: { 
      container: 'h-12', 
      square: 'w-12 h-12', 
      wide: 'h-12 w-24', 
      auto: 'h-12 max-w-24',
      text: 'text-sm'
    },
    xl: { 
      container: 'h-16', 
      square: 'w-16 h-16', 
      wide: 'h-16 w-32', 
      auto: 'h-16 max-w-32',
      text: 'text-base'
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
    setImageLoaded(true); // Also set loaded to true to hide the skeleton
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
    'relative flex items-center justify-center rounded bg-gray-50 overflow-hidden border border-gray-100',
    sizeConfig[size].container,
    variant === 'auto' && aspectRatio && aspectRatio > 1.5 ? 'w-auto' : 'w-auto',
    className
  );

  const imageClasses = cn(
    'object-contain transition-opacity duration-200',
    getImageClasses(),
    imageLoaded ? 'opacity-100' : 'opacity-0'
  );

  // Render fallback with initials
  const renderFallback = () => {
    if (fallback) return fallback;
    
    const initials = getInitials(alt);
    const bgColor = getColorFromName(alt);
    
    return (
      <div 
        className={cn(
          'flex items-center justify-center text-white font-bold rounded',
          bgColor,
          sizeConfig[size].square,
          sizeConfig[size].text
        )}
      >
        {initials}
      </div>
    );
  };

  if (imageError || !src) {
    return (
      <div className={cn(containerClasses, 'border-0 bg-transparent')}>
        {renderFallback()}
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
      {/* Loading placeholder - only show if not loaded and no error */}
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
          <Building2 
            className={cn(
              'text-gray-400',
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
