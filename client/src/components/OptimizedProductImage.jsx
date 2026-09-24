import React, { useState, useEffect, useRef } from 'react';

// In-memory set of already downloaded & decoded image URLs
// Persists across the entire user session so returning to cards is 0ms instant
const _IMAGE_CACHE = new Set();
const _PRELOAD_IN_FLIGHT = new Set();

/**
 * Transforms CDN image URLs (Unsplash, Cloudinary, etc.) to appropriate
 * thumbnail widths (360px for grid cards, 180px for list rows) and modern WebP compression.
 */
export function getOptimizedImageUrl(url, width = 360, quality = 75) {
  if (!url || typeof url !== 'string') {
    return `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=${width}&q=${quality}`;
  }

  // Optimize Unsplash CDN parameters
  if (url.includes('images.unsplash.com')) {
    const base = url.split('?')[0];
    return `${base}?auto=format&fit=crop&w=${width}&q=${quality}`;
  }

  // Optimize Cloudinary CDN parameters
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_fill/`);
  }

  return url;
}

/**
 * Preload and decode an image off the main JavaScript thread
 * into browser memory cache.
 */
export function preloadImage(url, width = 360, quality = 75) {
  const optimized = getOptimizedImageUrl(url, width, quality);
  if (!optimized || _IMAGE_CACHE.has(optimized) || _PRELOAD_IN_FLIGHT.has(optimized)) {
    return Promise.resolve(optimized);
  }

  _PRELOAD_IN_FLIGHT.add(optimized);

  return new Promise((resolve) => {
    const img = new Image();
    img.src = optimized;

    // Use off-thread decoding API if supported by the browser
    if ('decode' in img && typeof img.decode === 'function') {
      img.decode()
        .then(() => {
          _IMAGE_CACHE.add(optimized);
          _PRELOAD_IN_FLIGHT.delete(optimized);
          resolve(optimized);
        })
        .catch(() => {
          // Fallback if decode errors out
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
export function prefetchCatalogImages(items = [], startIndex = 0, count = 12, width = 360) {
  if (!Array.isArray(items) || items.length === 0) return;

  const slice = items.slice(startIndex, startIndex + count);
  const runPrefetch = () => {
    slice.forEach((item) => {
      const src = item?.image_url || item?.image;
      if (src) {
        preloadImage(src, width, 75);
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
 * - 0ms instant render if image is in memory cache (no flash or re-loading)
 * - 450px lookahead buffer via IntersectionObserver to begin loading before entering viewport
 * - Off-thread asynchronous decoding
 * - Prevents native browser lazy-loading scroll-throttle stalls
 * - Subtle shimmering CSS placeholder without layout shift
 */
const OptimizedProductImage = React.memo(function OptimizedProductImage({
  src,
  alt = 'FoodMaxx dish',
  className = '',
  imgClassName = '',
  width = 360,
  quality = 75,
  isAvailable = true,
  fallbackSrc = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=360&q=75'
}) {
  const optimizedSrc = getOptimizedImageUrl(src, width, quality);
  const isAlreadyLoaded = _IMAGE_CACHE.has(optimizedSrc);

  const [isLoaded, setIsLoaded] = useState(isAlreadyLoaded);
  const [isInView, setIsInView] = useState(isAlreadyLoaded);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (isAlreadyLoaded) {
      setIsLoaded(true);
      setIsInView(true);
      return;
    }

    let isMounted = true;
    let observer;

    if (typeof window !== 'undefined' && 'IntersectionObserver' in window && containerRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting || entry.intersectionRatio > 0) {
              if (isMounted) setIsInView(true);

              // Pre-decode off thread
              const img = new Image();
              img.src = optimizedSrc;
              if ('decode' in img && typeof img.decode === 'function') {
                img.decode()
                  .then(() => {
                    _IMAGE_CACHE.add(optimizedSrc);
                    if (isMounted) setIsLoaded(true);
                  })
                  .catch(() => {
                    if (isMounted) setIsLoaded(true);
                  });
              } else {
                img.onload = () => {
                  _IMAGE_CACHE.add(optimizedSrc);
                  if (isMounted) setIsLoaded(true);
                };
              }

              if (observer) observer.disconnect();
            }
          });
        },
        {
          // 450px lookahead margin (about 2 screen heights on mobile)
          rootMargin: '450px 0px 450px 0px',
          threshold: 0
        }
      );

      observer.observe(containerRef.current);
    } else {
      // Fallback if IntersectionObserver is unavailable
      setIsInView(true);
    }

    return () => {
      isMounted = false;
      if (observer) observer.disconnect();
    };
  }, [optimizedSrc, isAlreadyLoaded]);

  const activeSrc = hasError ? fallbackSrc : optimizedSrc;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden w-full h-full bg-slate-100 dark:bg-slate-800 ${className}`}
    >
      {/* Instant placeholder while decoding */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 animate-pulse pointer-events-none" />
      )}

      {/* Render actual image once approaching viewport or cached */}
      {(isInView || isLoaded) && (
        <img
          src={activeSrc}
          alt={alt}
          onLoad={() => {
            _IMAGE_CACHE.add(optimizedSrc);
            setIsLoaded(true);
          }}
          onError={() => {
            setHasError(true);
            setIsLoaded(true);
          }}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${!isAvailable ? 'grayscale contrast-75' : ''} ${imgClassName}`}
          loading="eager"
          decoding="async"
        />
      )}
    </div>
  );
});

export default OptimizedProductImage;
