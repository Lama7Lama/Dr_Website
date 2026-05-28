import React from 'react';

import { useProtectedMediaUrl } from '../services/useProtectedMediaUrl';

interface ProtectedImageProps {
  source?: string | null;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

const ProtectedImage: React.FC<ProtectedImageProps> = ({ source, alt, className = '', fallback = null }) => {
  const { url, isLoading } = useProtectedMediaUrl(source);

  if (!source) return <>{fallback}</>;
  if (isLoading && !url) {
    return (
      <div className={`flex items-center justify-center text-sm text-gray-400 ${className}`}>
        Loading image...
      </div>
    );
  }
  if (!url) return <>{fallback}</>;

  return <img src={url} alt={alt} className={className} />;
};

export default ProtectedImage;
