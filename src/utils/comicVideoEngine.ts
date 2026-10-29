/**
 * Z-ONE COMIC STUDIO — High-Performance Frame-by-Frame Video-to-Comic Processing Engine
 *
 * Implements genuine pixel-level Sobel edge detection (ink contours),
 * multi-level cel-shading (color posterization & quantization),
 * authentic screentone/halftone dot matrices (Manga, Komiks, Cinematic),
 * Z-oneApp futuristic branding frame, and continuous scrolling marquee.
 */

export type ComicStyleId =
  | 'cinematic'
  | 'anime'
  | 'cartoon'
  | 'manga'
  | 'graphic_novel'
  | 'filipino_komiks';

export type ComicAspectRatio = '9:16' | '1:1' | '16:9';

export interface ComicCaptionItem {
  timestampSeconds: number;
  text: string;
  type?: 'narration' | 'dialogue' | 'speech';
}

export interface ComicActionEffect {
  timestampSeconds: number;
  effectWord: string;
  color?: string;
  xPercent?: number;
  yPercent?: number;
}

export interface ComicEngineConfig {
  style: ComicStyleId;
  aspectRatio: ComicAspectRatio;
  inkStrength: number; // 0.0 to 1.0 (controls line thickness and sensitivity)
  halftoneEnabled: boolean;
  actionEffectsEnabled: boolean;
  captionsEnabled: boolean;
  captions: ComicCaptionItem[];
  actionEffects: ComicActionEffect[];
  customTitle?: string;
}

export const COMIC_STYLE_CONFIGS: Record<
  ComicStyleId,
  {
    id: ComicStyleId;
    name: string;
    subtitle: string;
    badge: string;
    accentColor: string;
    inkColor: string;
    description: string;
  }
> = {
  cinematic: {
    id: 'cinematic',
    name: 'Cinematic Comic',
    subtitle: 'Bold ink contours, cyan-amber rim lighting & dynamic cel-shading',
    badge: '⚡ POPULAR',
    accentColor: '#00f2fe',
    inkColor: '#030712',
    description: 'Modern superhero graphic novel lighting with crisp, heavy ink outlines.'
  },
  anime: {
    id: 'anime',
    name: 'Anime Comic',
    subtitle: 'Vibrant Japanese cel-shading & clean lineart contours',
    badge: '🌸 TRENDING',
    accentColor: '#ec4899',
    inkColor: '#090514',
    description: 'Vivid anime palette with clean character edge outlines.'
  },
  cartoon: {
    id: 'cartoon',
    name: 'Colorful Cartoon',
    subtitle: 'Punchy Saturday-morning pop colors & thick playful ink lines',
    badge: '🎨 VIBRANT',
    accentColor: '#f59e0b',
    inkColor: '#170c02',
    description: 'High-energy cartoon vibrancy with rounded bold ink strokes.'
  },
  manga: {
    id: 'manga',
    name: 'Manga (B&W)',
    subtitle: 'Authentic black & white screentone with dramatic ink crosshatch',
    badge: '🍙 CLASSIC',
    accentColor: '#ffffff',
    inkColor: '#000000',
    description: 'Pure monochrome manga page with authentic screentone dot gradients.'
  },
  graphic_novel: {
    id: 'graphic_novel',
    name: 'Graphic Novel',
    subtitle: 'Gritty noir realism, muted earth tones & heavy chiaroscuro',
    badge: '🦇 NOIR',
    accentColor: '#a855f7',
    inkColor: '#05020c',
    description: 'Dark, expressive cinematic noir aesthetic with massive shadow blocks.'
  },
  filipino_komiks: {
    id: 'filipino_komiks',
    name: 'Filipino Komiks',
    subtitle: 'Classic Pinoy newsprint komiks, warm sepia paper & hand-inked crosshatch',
    badge: '🇵🇭 TRADISYON',
    accentColor: '#fbbf24',
    inkColor: '#1a0f05',
    description: 'Golden-era Pinoy komiks feel with vintage warm newsprint and hand-inked flair.'
  }
};

export const EXACT_PROMOTIONAL_MARQUEE =
  'Create your own video at Z-ONEAPP • Visit or search echozoneph on Google';

/**
 * Returns pixel dimensions based on aspect ratio.
 */
export function getDimensionsForRatio(ratio: ComicAspectRatio): { width: number; height: number } {
  switch (ratio) {
    case '9:16':
      return { width: 720, height: 1280 };
    case '1:1':
      return { width: 720, height: 720 };
    case '16:9':
      return { width: 1280, height: 720 };
  }
}

// Reusable offscreen buffers to prevent GC thrashing during 30-60 FPS playback
let _offscreenCanvas: HTMLCanvasElement | null = null;
let _offscreenCtx: CanvasRenderingContext2D | null = null;
let _luminanceBuffer: Uint8Array | null = null;
let _edgeBuffer: Uint8Array | null = null;

function getOffscreenBuffer(width: number, height: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  if (!_offscreenCanvas) {
    _offscreenCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : ({} as any);
  }
  if (_offscreenCanvas.width !== width || _offscreenCanvas.height !== height) {
    _offscreenCanvas.width = width;
    _offscreenCanvas.height = height;
    _offscreenCtx = _offscreenCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (!_offscreenCtx && _offscreenCanvas.getContext) {
    _offscreenCtx = _offscreenCanvas.getContext('2d', { willReadFrequently: true });
  }
  return { canvas: _offscreenCanvas, ctx: _offscreenCtx! };
}

/**
 * Applies genuine Sobel edge detection, cel-shading quantization,
 * and style-specific halftone/screentone directly to pixel ImageData.
 */
export function applyComicStylizationToImageData(
  imgData: ImageData,
  style: ComicStyleId,
  inkStrength = 0.85,
  halftoneEnabled = true
): { edgesCount: number } {
  const { width, height, data } = imgData;
  const totalPixels = width * height;

  if (!_luminanceBuffer || _luminanceBuffer.length < totalPixels) {
    _luminanceBuffer = new Uint8Array(totalPixels);
    _edgeBuffer = new Uint8Array(totalPixels);
  }

  // 1. Compute perceptual luminance for every pixel
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    _luminanceBuffer[j] = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
  }

  // 2. Sobel Edge Detection Pass (3x3 Kernel)
  // Adaptive threshold based on inkStrength
  const edgeThreshold = Math.max(18, Math.round(52 - inkStrength * 28));
  let edgesCount = 0;

  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = row + x;
      const gx =
        -_luminanceBuffer[idx - width - 1] + _luminanceBuffer[idx - width + 1] -
        2 * _luminanceBuffer[idx - 1] + 2 * _luminanceBuffer[idx + 1] -
        _luminanceBuffer[idx + width - 1] + _luminanceBuffer[idx + width + 1];

      const gy =
        -_luminanceBuffer[idx - width - 1] - 2 * _luminanceBuffer[idx - width] - _luminanceBuffer[idx - width + 1] +
        _luminanceBuffer[idx + width - 1] + 2 * _luminanceBuffer[idx + width] + _luminanceBuffer[idx + width + 1];

      const mag = Math.abs(gx) + Math.abs(gy);
      if (mag > edgeThreshold) {
        _edgeBuffer[idx] = 1;
        edgesCount++;
      } else {
        _edgeBuffer[idx] = 0;
      }
    }
  }

  // Edge dilation factor for heavy comic inking
  const shouldDilate = inkStrength >= 0.72;

  // 3. Pixel Transformation Pass
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const idx = row + x;
      const pIdx = idx * 4;

      let isEdge = _edgeBuffer[idx] === 1;
      if (!isEdge && shouldDilate && x > 0 && y > 0) {
        // Thick comic ink contour
        isEdge = _edgeBuffer[idx - 1] === 1 || _edgeBuffer[idx - width] === 1;
      }

      const lum = _luminanceBuffer[idx];
      let r = data[pIdx];
      let g = data[pIdx + 1];
      let b = data[pIdx + 2];

      if (isEdge) {
        // INK OUTLINE PIXEL
        switch (style) {
          case 'manga':
            data[pIdx] = 0;
            data[pIdx + 1] = 0;
            data[pIdx + 2] = 0;
            break;
          case 'filipino_komiks':
            data[pIdx] = 22;
            data[pIdx + 1] = 14;
            data[pIdx + 2] = 8;
            break;
          case 'graphic_novel':
            data[pIdx] = 8;
            data[pIdx + 1] = 4;
            data[pIdx + 2] = 14;
            break;
          case 'anime':
            data[pIdx] = 14;
            data[pIdx + 1] = 8;
            data[pIdx + 2] = 22;
            break;
          default:
            // Cinematic & Cartoon: Deep black comic ink
            data[pIdx] = 6;
            data[pIdx + 1] = 8;
            data[pIdx + 2] = 16;
            break;
        }
        continue;
      }

      // NON-EDGE: STYLE-SPECIFIC CEL-SHADING & HALFTONE
      switch (style) {
        case 'manga': {
          // Pure Black & White Manga page with screentone
          if (lum > 200) {
            // Paper highlight
            r = 255;
            g = 255;
            b = 255;
          } else if (lum < 55) {
            // Solid black ink fill
            r = 12;
            g = 12;
            b = 12;
          } else {
            // Midtones: Real Manga Screentone Dots (4x4 matrix)
            const isDot = (x % 4 === 0 && y % 4 === 0) || ((x + 2) % 4 === 0 && (y + 2) % 4 === 0);
            const isDenseDot = x % 2 === 0 && y % 2 === 0;
            if (lum < 110 && isDenseDot) {
              r = 18;
              g = 18;
              b = 18;
            } else if (lum < 165 && isDot) {
              r = 28;
              g = 28;
              b = 28;
            } else {
              r = 250;
              g = 250;
              b = 250;
            }
          }
          break;
        }

        case 'filipino_komiks': {
          // Classic Pinoy Vintage Newsprint Komiks (#f6f0de base)
          if (lum < 55) {
            // Heavy charcoal shadow
            r = 32;
            g = 22;
            b = 14;
          } else {
            // 4-step quantization tinted with vintage paper tone
            const stepVal = Math.floor(lum / 55) * 55 + 28;
            const paperR = 246;
            const paperG = 240;
            const paperB = 222;

            r = Math.min(255, Math.round((stepVal * 0.5 + r * 0.5) * (paperR / 255)));
            g = Math.min(255, Math.round((stepVal * 0.5 + g * 0.5) * (paperG / 255)));
            b = Math.min(255, Math.round((stepVal * 0.5 + b * 0.5) * (paperB / 255)));

            // Halftone newsprint texture in midtones
            if (halftoneEnabled && lum > 65 && lum < 155) {
              if ((x % 4 === 0 && y % 4 === 0) || ((x + 2) % 4 === 0 && (y + 2) % 4 === 0)) {
                r = Math.round(r * 0.72);
                g = Math.round(g * 0.72);
                b = Math.round(b * 0.72);
              }
            }
          }
          break;
        }

        case 'cinematic': {
          // High-contrast Cinematic Comic: 5-level cel-shading + Cyan-Amber rim
          if (lum < 42) {
            // Crushed comic shadows
            r = 8;
            g = 12;
            b = 22;
          } else {
            // 5-level quantization
            const qR = Math.min(255, Math.floor(r / 50) * 55 + 20);
            const qG = Math.min(255, Math.floor(g / 50) * 55 + 20);
            const qB = Math.min(255, Math.floor(b / 50) * 55 + 20);

            // Boost saturation
            const avg = (qR + qG + qB) / 3;
            r = Math.min(255, Math.max(0, Math.round(avg + (qR - avg) * 1.45)));
            g = Math.min(255, Math.max(0, Math.round(avg + (qG - avg) * 1.45)));
            b = Math.min(255, Math.max(0, Math.round(avg + (qB - avg) * 1.45)));

            // Cinematic color grading: Cyan in shadows, amber in highlights
            if (lum < 115) {
              b = Math.min(255, Math.round(b * 1.25 + 12));
            } else if (lum > 165) {
              r = Math.min(255, Math.round(r * 1.18 + 10));
              g = Math.min(255, Math.round(g * 1.08));
            }

            // Halftone dot texture in shadow-midtones
            if (halftoneEnabled && lum >= 50 && lum <= 105 && x % 5 === 0 && y % 5 === 0) {
              r = Math.round(r * 0.65);
              g = Math.round(g * 0.65);
              b = Math.round(b * 0.65);
            }
          }
          break;
        }

        case 'anime': {
          // Vibrant Japanese Anime Cel-Shading
          if (lum < 38) {
            r = 16;
            g = 12;
            b = 26;
          } else {
            // Boost saturation
            const mean = (r + g + b) / 3;
            r = Math.min(255, Math.max(0, Math.round(mean + (r - mean) * 1.4)));
            g = Math.min(255, Math.max(0, Math.round(mean + (g - mean) * 1.4)));
            b = Math.min(255, Math.max(0, Math.round(mean + (b - mean) * 1.4)));

            // 4-step discrete anime cel bands
            r = Math.min(255, Math.floor(r / 55) * 60 + 15);
            g = Math.min(255, Math.floor(g / 55) * 60 + 15);
            b = Math.min(255, Math.floor(b / 55) * 60 + 15);
          }
          break;
        }

        case 'cartoon': {
          // Bold Pop-Art Saturday Morning Cartoon
          if (lum < 32) {
            r = 10;
            g = 10;
            b = 14;
          } else {
            // 3-step high-saturation quantization
            r = Math.min(255, Math.floor(r / 75) * 85 + 25);
            g = Math.min(255, Math.floor(g / 75) * 85 + 25);
            b = Math.min(255, Math.floor(b / 75) * 85 + 25);

            const avg = (r + g + b) / 3;
            r = Math.min(255, Math.max(0, Math.round(avg + (r - avg) * 1.55)));
            g = Math.min(255, Math.max(0, Math.round(avg + (g - avg) * 1.55)));
            b = Math.min(255, Math.max(0, Math.round(avg + (b - avg) * 1.55)));
          }
          break;
        }

        case 'graphic_novel': {
          // Gritty Noir Graphic Novel with Heavy Chiaroscuro
          if (lum < 75) {
            // Massive pitch-black shadow blocks
            r = 6;
            g = 4;
            b = 12;
          } else if (lum > 215) {
            // Stark blinding highlights
            r = 252;
            g = 250;
            b = 255;
          } else {
            // Desaturated midtones with purple shadow tint
            const gray = Math.round(r * 0.3 + g * 0.59 + b * 0.11);
            r = Math.min(255, Math.round(gray * 0.85 + 8));
            g = Math.min(255, Math.round(gray * 0.75));
            b = Math.min(255, Math.round(gray * 0.95 + 18));

            if (halftoneEnabled && lum < 120 && (x + y) % 6 === 0) {
              r = Math.round(r * 0.45);
              g = Math.round(g * 0.45);
              b = Math.round(b * 0.45);
            }
          }
          break;
        }
      }

      data[pIdx] = r;
      data[pIdx + 1] = g;
      data[pIdx + 2] = b;
    }
  }

  return { edgesCount };
}

/**
 * Draws an action sound effect burst bubble (e.g. "Z-ONE!", "SWOOSH!", "WHAM!")
 */
function drawComicActionBurst(
  ctx: CanvasRenderingContext2D,
  word: string,
  centerX: number,
  centerY: number,
  baseColor: string,
  scale = 1.0
) {
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);
  ctx.rotate(-0.08);

  const points = 14;
  const outerR = 68;
  const innerR = 36;

  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / points;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  // Burst background
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Inner burst color
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = (i % 2 === 0 ? outerR : innerR) * 0.82;
    const angle = (i * Math.PI) / points;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = baseColor;
  ctx.fill();

  // Action Word Text
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 24px "Impact", "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 8;
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#000000';
  ctx.strokeText(word, 0, 0);
  ctx.fillText(word, 0, 0);

  ctx.restore();
}

/**
 * Draws a comic narration box or dialogue bubble
 */
function drawComicCaptionBox(
  ctx: CanvasRenderingContext2D,
  text: string,
  canvasWidth: number,
  topY: number,
  accentColor: string
) {
  ctx.save();
  const boxWidth = Math.min(canvasWidth - 64, 480);
  const boxHeight = 44;
  const x = (canvasWidth - boxWidth) / 2;
  const y = topY;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(x + 4, y + 4, boxWidth, boxHeight);

  // Background box
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x, y, boxWidth, boxHeight);

  // Border with comic accent
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, boxWidth, boxHeight);

  // Left accent ribbon
  ctx.fillStyle = accentColor;
  ctx.fillRect(x, y, 6, boxHeight);

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 13px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 18, y + boxHeight / 2, boxWidth - 32);

  ctx.restore();
}

/**
 * Draws the Z-oneApp Futuristic Branding Frame
 */
function drawZOneAppBrandingFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  styleName: string,
  accentColor: string
) {
  ctx.save();

  // 1. Futuristic Header Bar (60px high)
  const headerHeight = 60;
  const headerGrad = ctx.createLinearGradient(0, 0, 0, headerHeight);
  headerGrad.addColorStop(0, 'rgba(4, 15, 30, 0.98)');
  headerGrad.addColorStop(1, 'rgba(4, 15, 30, 0.88)');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, width, headerHeight);

  // Header bottom border line with cyan/violet gradient
  const borderGrad = ctx.createLinearGradient(0, 0, width, 0);
  borderGrad.addColorStop(0, '#00f2fe');
  borderGrad.addColorStop(0.5, '#a855f7');
  borderGrad.addColorStop(1, '#00f2fe');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, headerHeight);
  ctx.lineTo(width, headerHeight);
  ctx.stroke();

  // Left: Circular Logo Emblem + Z-ONEAPP COMIC STUDIO Text
  ctx.beginPath();
  ctx.arc(32, headerHeight / 2, 16, 0, Math.PI * 2);
  ctx.fillStyle = '#00f2fe';
  ctx.shadowColor = '#00f2fe';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Inner 'Z' letter
  ctx.fillStyle = '#050b18';
  ctx.font = '900 16px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Z', 32, headerHeight / 2);

  // Brand Name
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 15px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#00f2fe';
  ctx.shadowBlur = 6;
  ctx.fillText('Z-ONEAPP', 56, headerHeight / 2 - 6);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#38bdf8';
  ctx.font = '700 9px "JetBrains Mono", monospace';
  ctx.fillText('COMIC STUDIO', 56, headerHeight / 2 + 8);

  // Right: Style Badge
  const badgeText = styleName.toUpperCase();
  ctx.font = '800 10px "Inter", sans-serif';
  const badgeWidth = ctx.measureText(badgeText).width + 20;
  const badgeX = width - badgeWidth - 16;
  const badgeY = (headerHeight - 24) / 2;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, 24, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accentColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, badgeX + badgeWidth / 2, badgeY + 12);

  // 2. Corner High-Tech Brackets
  const cornerSize = 18;
  const margin = 10;
  ctx.strokeStyle = '#00f2fe';
  ctx.lineWidth = 2.5;

  // Top-Left (below header)
  ctx.beginPath();
  ctx.moveTo(margin, headerHeight + margin + cornerSize);
  ctx.lineTo(margin, headerHeight + margin);
  ctx.lineTo(margin + cornerSize, headerHeight + margin);
  ctx.stroke();

  // Top-Right (below header)
  ctx.beginPath();
  ctx.moveTo(width - margin - cornerSize, headerHeight + margin);
  ctx.lineTo(width - margin, headerHeight + margin);
  ctx.lineTo(width - margin, headerHeight + margin + cornerSize);
  ctx.stroke();

  // Bottom-Left (above marquee)
  const bottomMargin = 44 + margin;
  ctx.beginPath();
  ctx.moveTo(margin, height - bottomMargin - cornerSize);
  ctx.lineTo(margin, height - bottomMargin);
  ctx.lineTo(margin + cornerSize, height - bottomMargin);
  ctx.stroke();

  // Bottom-Right (above marquee)
  ctx.beginPath();
  ctx.moveTo(width - margin - cornerSize, height - bottomMargin);
  ctx.lineTo(width - margin, height - bottomMargin);
  ctx.lineTo(width - margin, height - bottomMargin - cornerSize);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws the Continuous Scrolling Bottom Marquee with EXACT text:
 * "Create your own video at Z-ONEAPP • Visit or search echozoneph on Google"
 */
function drawContinuousBottomMarquee(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsedSeconds: number
) {
  ctx.save();

  const marqueeHeight = 44;
  const y = height - marqueeHeight;

  // Dark obsidian background bar
  const bgGrad = ctx.createLinearGradient(0, y, 0, height);
  bgGrad.addColorStop(0, 'rgba(5, 12, 28, 0.98)');
  bgGrad.addColorStop(1, 'rgba(2, 6, 18, 1)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, y, width, marqueeHeight);

  // Top glowing divider
  ctx.strokeStyle = '#00f2fe';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();

  // Left static badge: "⚡ Z-ONE"
  const tagWidth = 72;
  ctx.fillStyle = '#00f2fe';
  ctx.fillRect(0, y, tagWidth, marqueeHeight);

  ctx.fillStyle = '#050b18';
  ctx.font = '900 11px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚡ Z-ONE', tagWidth / 2, y + marqueeHeight / 2);

  // Clip the scrolling area between tagWidth and width
  ctx.beginPath();
  ctx.rect(tagWidth + 4, y, width - tagWidth - 4, marqueeHeight);
  ctx.clip();

  // Exact text with separator spacing
  const fullText = `${EXACT_PROMOTIONAL_MARQUEE}      ★      `;
  ctx.font = '700 13px "Inter", "Segoe UI", system-ui, sans-serif';
  const textWidth = ctx.measureText(fullText).width;

  // Continuous smooth horizontal scroll speed (pixels per second)
  const scrollSpeed = 75;
  const totalOffset = (elapsedSeconds * scrollSpeed) % textWidth;

  const startX = tagWidth + 12 - totalOffset;
  const renderY = y + marqueeHeight / 2;

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#00f2fe';
  ctx.shadowBlur = 4;

  for (let xPos = startX; xPos < width + textWidth; xPos += textWidth) {
    ctx.fillText(fullText, xPos, renderY);
  }

  ctx.restore();
}

/**
 * Main Frame Processing Engine:
 * Transforms a single video frame into a genuine comic panel,
 * overlays Z-oneApp branding, dynamic speech/sound-effect bursts, and the continuous marquee.
 */
export function renderComicFrameToCanvas(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  config: ComicEngineConfig,
  currentTimeSeconds: number
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = canvas;
  const styleConf = COMIC_STYLE_CONFIGS[config.style] || COMIC_STYLE_CONFIGS.cinematic;

  // 1. Clear with deep cyber background (white for manga)
  ctx.fillStyle = config.style === 'manga' ? '#ffffff' : '#050b18';
  ctx.fillRect(0, 0, width, height);

  // 2. Compute inner video viewport preserving source aspect ratio (safe letterbox/pillarbox)
  const headerH = 60;
  const footerH = 44;
  const viewY = headerH;
  const viewH = height - headerH - footerH;

  const vidW = video.videoWidth || 720;
  const vidH = video.videoHeight || 1280;
  const vidRatio = vidW / vidH;
  const viewRatio = width / viewH;

  let drawW = width;
  let drawH = viewH;
  let drawX = 0;
  let drawY = viewY;

  if (vidRatio > viewRatio) {
    drawH = width / vidRatio;
    drawY = viewY + (viewH - drawH) / 2;
  } else {
    drawW = viewH * vidRatio;
    drawX = (width - drawW) / 2;
  }

  // 3. Process video pixels on offscreen processing buffer
  // Clamp internal processing resolution between 360 and 720 for optimal quality and high framerate
  const pScale = Math.min(1.0, 540 / Math.max(vidW, vidH));
  const pW = Math.max(240, Math.round(vidW * pScale));
  const pH = Math.max(240, Math.round(vidH * pScale));

  const { canvas: procCanvas, ctx: procCtx } = getOffscreenBuffer(pW, pH);

  // Draw current video frame to processing buffer
  procCtx.drawImage(video, 0, 0, pW, pH);

  // Extract pixel buffer
  const imgData = procCtx.getImageData(0, 0, pW, pH);

  // Apply genuine Sobel edge detection & cel-shading to pixels
  applyComicStylizationToImageData(
    imgData,
    config.style,
    config.inkStrength,
    config.halftoneEnabled
  );

  // Write processed comic pixels back
  procCtx.putImageData(imgData, 0, 0);

  // 4. Draw stylized comic panel onto the target output canvas
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(procCanvas, drawX, drawY, drawW, drawH);

  // 5. Action Sound Effect Bursts
  if (config.actionEffectsEnabled && Array.isArray(config.actionEffects)) {
    config.actionEffects.forEach((fx) => {
      const timeDiff = Math.abs(currentTimeSeconds - fx.timestampSeconds);
      if (timeDiff < 1.8) {
        const progress = timeDiff / 1.8;
        const scale = 1.0 + Math.sin(progress * Math.PI) * 0.35;
        const fxX = drawX + ((fx.xPercent ?? 50) / 100) * drawW;
        const fxY = drawY + ((fx.yPercent ?? 40) / 100) * drawH;
        drawComicActionBurst(ctx, fx.effectWord, fxX, fxY, fx.color || styleConf.accentColor, scale);
      }
    });
  }

  // 6. Dynamic Narrative Caption Box
  if (config.captionsEnabled && Array.isArray(config.captions) && config.captions.length > 0) {
    const activeCap = config.captions.find(
      (c) => currentTimeSeconds >= c.timestampSeconds && currentTimeSeconds < c.timestampSeconds + 4.5
    );
    if (activeCap) {
      drawComicCaptionBox(ctx, activeCap.text, width, drawY + drawH - 58, styleConf.accentColor);
    }
  }

  // 7. Futuristic Z-oneApp Branding Frame
  drawZOneAppBrandingFrame(ctx, width, height, styleConf.name, styleConf.accentColor);

  // 8. Continuous Scrolling Bottom Marquee
  drawContinuousBottomMarquee(ctx, width, height, currentTimeSeconds);
}

/**
 * Draws the untransformed source video frame with branding frame and marquee
 * (for before/after split comparison testing)
 */
export function renderOriginalFrameToCanvas(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  aspectRatio: ComicAspectRatio,
  currentTimeSeconds: number
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = canvas;
  ctx.fillStyle = '#050b18';
  ctx.fillRect(0, 0, width, height);

  const headerH = 60;
  const footerH = 44;
  const viewY = headerH;
  const viewH = height - headerH - footerH;

  const vidW = video.videoWidth || 720;
  const vidH = video.videoHeight || 1280;
  const vidRatio = vidW / vidH;
  const viewRatio = width / viewH;

  let drawW = width;
  let drawH = viewH;
  let drawX = 0;
  let drawY = viewY;

  if (vidRatio > viewRatio) {
    drawH = width / vidRatio;
    drawY = viewY + (viewH - drawH) / 2;
  } else {
    drawW = viewH * vidRatio;
    drawX = (width - drawW) / 2;
  }

  ctx.drawImage(video, drawX, drawY, drawW, drawH);
  drawZOneAppBrandingFrame(ctx, width, height, 'ORIGINAL VIDEO', '#94a3b8');
  drawContinuousBottomMarquee(ctx, width, height, currentTimeSeconds);
}
