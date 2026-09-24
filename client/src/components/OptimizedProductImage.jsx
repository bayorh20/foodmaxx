import React, { useState, useEffect } from 'react';

// In-memory set of already downloaded & decoded image URLs
// Persists across the entire user session so returning to cards is 0ms instant
const _IMAGE_CACHE = new Set();
const _PRELOAD_IN_FLIGHT = new Set();

export const DEFAULT_PRODUCT_FALLBACK = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

/**
 * Transforms CDN image URLs (Unsplash, Cloudinary, etc.) to appropriate
 * thumbnail widths (400px for food cards, 240px for list rows) and modern WebP compression.
 */
export function getOptimizedImageUrl(url, width = 400, quality = 80) {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return DEFAULT_PRODUCT_FALLBACK;
  }
  const cleanUrl = url.trim();

  // Optimize Unsplash CDN parameters
  if (cleanUrl.includes('images.unsplash.com')) {
    const base = cleanUrl.split('?')[0];
    return `${base}?auto=format&fit=crop&w=${width}&q=${quality}`;
  }

  // Optimize Cloudinary CDN parameters
  if (cleanUrl.includes('cloudinary.com') && cleanUrl.includes('/upload/')) {
    return cleanUrl.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_fill/`);
  }

  return cleanUrl;
}

/**
 * Preload and decode an image off the main JavaScript thread
 * into browser memory cache.
 */
export function preloadImage(url, width = 400, quality = 80) {
  const optimized = getOptimizedImageUrl(url, width, quality);
  if (!optimized || _IMAGE_CACHE.has(optimized) || _PRELOAD_IN_FLIGHT.has(optimized)) {
    return Promise.resolve(optimized);
  }

  _PRELOAD_IN_FLIGHT.add(optimized);

  return new Promise((resolve) => {
    const img = new Image();
    img.src = optimized;

    if ('decode' in img && typeof img.decode === 'function') {
      img.decode()
        .then(() => {
          _IMAGE_CACHE.add(optimized);
          _PRELOAD_IN_FLIGHT.delete(optimized);
          resolve(optimized);
        })
        .catch(() => {
          _IMAGE_CACHE.add(optimized);
          _PRELOAD_IN_FLIGHT.delete(optimized);
          resolve(optimized);
        });
    } else {
      img.onload = () => {
        _IMAGE_CACHE.add(optimized);
        _PRELOAD_IN_FLIGHT.delete(optimized);
        resolve(optimized);
      };
      img.onerror = () => {
        _PRELOAD_IN_FLIGHT.delete(optimized);
        resolve(optimized);
      };
    }
  });
}

/**
 * Batched preloader for upcoming dishes in the catalog.
 * Uses requestIdleCallback so it never competes with touch scrolling or UI animations.
 */
export function prefetchCatalogImages(items = [], startIndex = 0, count = 12, width = 400) {
  if (!Array.isArray(items) || items.length === 0) return;

  const slice = items.slice(startIndex, startIndex + count);
  const runPrefetch = () => {
    slice.forEach((item) => {
      const src = item?.image_url || item?.image || item?.img || item?.photo_url || item?.picture || item?.thumbnail;
      if (src) {
        preloadImage(src, width, 80);
      }
    });
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(runPrefetch, { timeout: 1500 });
  } else {
    setTimeout(runPrefetch, 60);
  }
}

/**
 * Production-grade High-Performance Product Image Component
 * Features:
 * - Always mounted with native loading="lazy" and decoding="async" (no IntersectionObserver disconnect drops)
 * - Automatic property fallback and failover to default appetizing dish photo on error
 * - Zero flash if image is already cached
 * - Shimmer skeleton while initial load is taking place
 */
const OptimizedProductImage = React.memo(function OptimizedProductImage({
  src,
  alt = 'FoodMaxx dish',
  className = '',
  imgClassName = '',
  width = 400,
  quality = 80,
  isAvailable = true,
  fallbackSrc = DEFAULT_PRODUCT_FALLBACK
}) {
  const initialResolved = getOptimizedImageUrl(src, width, quality);
  const [currentSrc, setCurrentSrc] = useState(initialResolved);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(() => _IMAGE_CACHE.has(initialResolved));

  // Sync if prop src changes
  useEffect(() => {
    const nextSrc = getOptimizedImageUrl(src, width, quality);
    setCurrentSrc(nextSrc);
    setHasError(false);
    if (_IMAGE_CACHE.has(nextSrc)) {
      setIsLoaded(true);
    }
  }, [src, width, quality]);

  const handleLoad = () => {
    _IMAGE_CACHE.add(currentSrc);
    setIsLoaded(true);
  };

  const handleError = () => {
    if (!hasError && currentSrc !== fallbackSrc) {
      setHasError(true);
      setCurrentSrc(fallbackSrc);
    } else {
      setIsLoaded(true);
    }
  };

  return (
    <div
      className={`relative overflow-hidden w-full h-full bg-slate-100 dark:bg-slate-800 ${className}`}
    >
      {/* Subtle shimmer skeleton placeholder while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 animate-pulse pointer-events-none" />
      )}

      <img
        ref={(el) => {
          if (el && el.complete && el.naturalWidth > 0 && !isLoaded) {
            _IMAGE_CACHE.add(currentSrc);
            setIsLoaded(true);
          }
        }}
        src={currentSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${!isAvailable ? 'grayscale contrast-75' : ''} ${imgClassName}`}
      />
    </div>
  );
});

export default OptimizedProductImage;
