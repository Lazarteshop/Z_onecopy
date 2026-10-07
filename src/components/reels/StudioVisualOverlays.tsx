import React from 'react';
import { ReelTextOverlay } from '../../types';
import { TEXT_FONT_STYLES } from '../../utils/zoneStudioEngine';

interface StudioVisualOverlaysProps {
  effectPreset?: string;
  textOverlays?: ReelTextOverlay[];
  interactive?: boolean;
  selectedTextId?: string | null;
  onSelectText?: (id: string) => void;
  onMoveText?: (id: string, x: number, y: number) => void;
}

export const StudioVisualOverlays: React.FC<StudioVisualOverlaysProps> = ({
  effectPreset = 'none',
  textOverlays = [],
  interactive = false,
  selectedTextId = null,
  onSelectText
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20 select-none">
      {/* 1. Sparkles / Gold Dust Effect */}
      {(effectPreset === 'sparkles' || effectPreset === 'gold_dust') && (
        <div className="absolute inset-0">
          {[...Array(14)].map((_, i) => {
            const top = `${(i * 19 + 7) % 88}%`;
            const left = `${(i * 23 + 11) % 88}%`;
            const delay = `${(i % 5) * 0.35}s`;
            return (
              <span
                key={i}
                style={{ top, left, animationDelay: delay }}
                className={`absolute text-base sm:text-lg animate-pulse ${
                  effectPreset === 'gold_dust' ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]' : 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]'
                }`}
              >
                {effectPreset === 'gold_dust' ? (i % 2 === 0 ? '✨' : '🪙') : (i % 2 === 0 ? '✨' : '⋆')}
              </span>
            );
          })}
        </div>
      )}

      {/* 2. Bokeh Glow Effect */}
      {effectPreset === 'bokeh' && (
        <div className="absolute inset-0">
          <div className="absolute top-12 left-8 w-28 h-28 rounded-full bg-pink-500/25 blur-xl animate-pulse" />
          <div className="absolute top-1/3 right-6 w-36 h-36 rounded-full bg-cyan-400/20 blur-2xl animate-pulse" />
          <div className="absolute bottom-24 left-1/4 w-32 h-32 rounded-full bg-amber-400/25 blur-xl animate-pulse" />
          <div className="absolute bottom-1/3 right-1/4 w-24 h-24 rounded-full bg-purple-500/25 blur-xl animate-pulse" />
        </div>
      )}

      {/* 3. Heart Rain Effect */}
      {effectPreset === 'hearts' && (
        <div className="absolute inset-0">
          {[...Array(10)].map((_, i) => (
            <span
              key={i}
              style={{
                top: `${(i * 17 + 10) % 82}%`,
                left: `${(i * 29 + 8) % 86}%`,
                animationDelay: `${(i % 4) * 0.4}s`
              }}
              className="absolute text-lg sm:text-xl animate-bounce drop-shadow-md"
            >
              {i % 2 === 0 ? '💖' : '❤️'}
            </span>
          ))}
        </div>
      )}

      {/* 4. VHS Retro Effect */}
      {effectPreset === 'vhs' && (
        <div className="absolute inset-0 border-4 border-amber-400/20">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.18), rgba(255,255,255,0.18) 1px, transparent 1px, transparent 4px)'
            }}
          />
          <div className="absolute top-14 left-4 font-mono text-[11px] font-bold text-amber-300 tracking-widest drop-shadow">
            PLAY ▶ Z-ONE CAM
          </div>
        </div>
      )}

      {/* 5. Neon Pulse Frame */}
      {effectPreset === 'neon_frame' && (
        <div className="absolute inset-2 rounded-2xl border-2 border-pink-500/80 shadow-[inset_0_0_24px_rgba(236,72,153,0.45),0_0_20px_rgba(56,189,248,0.45)] animate-pulse" />
      )}

      {/* 6. Text Overlays */}
      {Array.isArray(textOverlays) &&
        textOverlays.map((item) => {
          if (!item.text || !item.text.trim()) return null;
          const fontConfig = TEXT_FONT_STYLES.find((f) => f.id === item.fontStyle) || TEXT_FONT_STYLES[0];
          const sizeClass =
            item.fontSize === 'sm'
              ? 'text-sm sm:text-base px-2.5 py-1'
              : item.fontSize === 'lg'
              ? 'text-xl sm:text-2xl px-4 py-2'
              : 'text-base sm:text-lg px-3.5 py-1.5';

          const isSelected = interactive && selectedTextId === item.id;

          return (
            <div
              key={item.id}
              onClick={(e) => {
                if (!interactive) return;
                e.stopPropagation();
                if (onSelectText) onSelectText(item.id);
              }}
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: 'translate(-50%, -50%)',
                color: item.color || '#ffffff',
                backgroundColor: item.bgColor && item.bgColor !== 'transparent' ? item.bgColor : 'transparent'
              }}
              className={`absolute max-w-[86%] text-center rounded-xl leading-snug break-words transition-all ${
                fontConfig.className
              } ${sizeClass} ${
                !item.bgColor || item.bgColor === 'transparent' ? 'drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]' : 'shadow-lg backdrop-blur-2xs'
              } ${interactive ? 'pointer-events-auto cursor-pointer active:scale-95' : ''} ${
                isSelected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-black/50' : ''
              }`}
            >
              {item.text}
            </div>
          );
        })}
    </div>
  );
};
