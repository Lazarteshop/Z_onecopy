import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Image as ImageIcon,
  Sparkles
} from 'lucide-react';

interface ZoneShopProductGalleryProps {
  mainImage: string;
  images?: string[];
  productName: string;
  category?: string;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=60';

export const ZoneShopProductGallery: React.FC<ZoneShopProductGalleryProps> = ({
  mainImage,
  images,
  productName,
  category
}) => {
  // Consolidate images array (ensuring mainImage is first and duplicates are filtered out)
  const allImages = React.useMemo(() => {
    const list: string[] = [];
    if (mainImage && mainImage.trim()) {
      list.push(mainImage.trim());
    }
    if (Array.isArray(images)) {
      images.forEach(img => {
        if (img && typeof img === 'string' && img.trim() && !list.includes(img.trim())) {
          list.push(img.trim());
        }
      });
    }
    return list.length > 0 ? list : [FALLBACK_IMAGE];
  }, [mainImage, images]);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [imageErrorMap, setImageErrorMap] = useState<Record<number, boolean>>({});

  // Touch swipe state for mobile gesture
  const touchStartXRef = useRef<number>(0);
  const touchEndXRef = useRef<number>(0);

  // Keep index in valid bounds if images change
  useEffect(() => {
    if (currentIndex >= allImages.length) {
      setCurrentIndex(0);
    }
  }, [allImages.length, currentIndex]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % allImages.length);
  }, [allImages.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + allImages.length) % allImages.length);
  }, [allImages.length]);

  // Touch event handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartXRef.current || !touchEndXRef.current) return;
    const diff = touchStartXRef.current - touchEndXRef.current;
    // 50px threshold for swipe
    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
    touchStartXRef.current = 0;
    touchEndXRef.current = 0;
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, handleNext, handlePrev]);

  const currentImageUrl = imageErrorMap[currentIndex] ? FALLBACK_IMAGE : allImages[currentIndex];

  return (
    <div className="space-y-3 w-full">
      {/* MAIN DISPLAY CONTAINER */}
      <div 
        className="relative w-full aspect-square sm:aspect-4/3 max-h-[440px] bg-slate-950/5 rounded-2xl overflow-hidden border border-slate-200 group select-none shadow-xs"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={currentImageUrl}
          alt={`${productName} - Image ${currentIndex + 1}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            setImageErrorMap(prev => ({ ...prev, [currentIndex]: true }));
          }}
          className="w-full h-full object-contain sm:object-cover transition-transform duration-300 group-hover:scale-102"
        />

        {/* CATEGORY PILL */}
        {category && (
          <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-lg tracking-wider pointer-events-none shadow-xs">
            {category}
          </span>
        )}

        {/* IMAGE COUNTER BADGE */}
        {allImages.length > 1 && (
          <span className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-md text-white text-xs font-mono font-bold px-2.5 py-1 rounded-lg pointer-events-none shadow-xs">
            {currentIndex + 1} / {allImages.length}
          </span>
        )}

        {/* FULLSCREEN LIGHTBOX TRIGGER */}
        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          title="Fullscreen Lightbox"
          aria-label="Tingnan sa Buong Screen"
          className="absolute top-3 right-3 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md transition shadow-md cursor-pointer active:scale-95"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* PREV / NEXT NAVIGATION BUTTONS */}
        {allImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              aria-label="Nakaraang Larawan"
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md transition sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer active:scale-90"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              aria-label="Susunod na Larawan"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md transition sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer active:scale-90"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* THUMBNAIL STRIP */}
      {allImages.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-300">
          {allImages.map((imgUrl, idx) => {
            const isSelected = idx === currentIndex;
            const isErr = imageErrorMap[idx];
            const displayThumb = isErr ? FALLBACK_IMAGE : imgUrl;
            return (
              <button
                key={`${imgUrl}-${idx}`}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Piliin ang imahe ${idx + 1}`}
                className={`relative shrink-0 w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden border-2 transition duration-200 cursor-pointer ${
                  isSelected
                    ? 'border-indigo-600 ring-2 ring-indigo-600/30 scale-102 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={displayThumb}
                  alt={`Thumbnail ${idx + 1}`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={() => setImageErrorMap(prev => ({ ...prev, [idx]: true }))}
                  className="w-full h-full object-cover"
                />
                {idx === 0 && (
                  <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[8px] font-black text-white text-center py-0.5 tracking-tighter">
                    MAIN
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 animate-fadeIn"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* TOP BAR */}
          <div className="flex items-center justify-between text-white z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-white/15 px-3 py-1 rounded-full">
                {currentIndex + 1} / {allImages.length}
              </span>
              <p className="text-xs text-slate-300 font-semibold truncate max-w-[200px] sm:max-w-md">
                {productName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* MAIN LIGHTBOX IMAGE */}
          <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
            <img
              src={currentImageUrl}
              alt={`${productName} - Fullscreen view`}
              referrerPolicy="no-referrer"
              className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl transition-transform duration-300 select-none"
            />

            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-2 sm:left-4 p-3 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-sm transition active:scale-90 cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-2 sm:right-4 p-3 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-sm transition active:scale-90 cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* BOTTOM THUMBNAILS IN LIGHTBOX */}
          {allImages.length > 1 && (
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 z-10 max-w-xl mx-auto">
              {allImages.map((imgUrl, idx) => (
                <button
                  key={`lb-${imgUrl}-${idx}`}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition shrink-0 cursor-pointer ${
                    idx === currentIndex ? 'border-white scale-105 shadow-md' : 'border-transparent opacity-50 hover:opacity-90'
                  }`}
                >
                  <img
                    src={imageErrorMap[idx] ? FALLBACK_IMAGE : imgUrl}
                    alt={`Thumb ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
