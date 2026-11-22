import { useState } from 'react';
import { Film, Tv } from 'lucide-react';
import { GENERATED_ASSETS } from '../lib/constants';
import type { MediaType } from '../types/media';

interface MediaImageProps {
  src?: string;
  alt: string;
  mediaType?: MediaType;
  variant?: 'poster' | 'backdrop';
  className?: string;
}

export function MediaImage({
  src,
  alt,
  mediaType = 'movie',
  variant = 'poster',
  className = '',
}: MediaImageProps) {
  const [hasError, setHasError] = useState(false);

  const fallbackSrc =
    variant === 'backdrop'
      ? mediaType === 'tv'
        ? GENERATED_ASSETS.noirSpotlight
        : GENERATED_ASSETS.heroBackdrop
      : mediaType === 'tv'
        ? GENERATED_ASSETS.seriesPosterFallback
        : GENERATED_ASSETS.moviePosterFallback;

  const activeSrc = !src || hasError ? fallbackSrc : src;

  if (!activeSrc) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-zinc-900 text-zinc-500 ${className}`}
        aria-label={alt}
      >
        {mediaType === 'tv' ? <Tv className="h-7 w-7 mb-2" /> : <Film className="h-7 w-7 mb-2" />}
        <span className="px-3 text-center text-xs font-medium text-zinc-400 line-clamp-2">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={activeSrc}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        if (!hasError) setHasError(true);
      }}
      className={className}
    />
  );
}
