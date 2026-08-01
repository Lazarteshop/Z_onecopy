import React, { useState, useRef } from 'react';
import { X, Trophy, Download, Sparkles, Smartphone, Square, Tv, Crown, CheckCircle2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { UserStats } from '../types';

export interface AdminUserItem {
  id: string;
  email: string;
  name: string;
  avatar: string;
  isAdmin: boolean;
  stats?: UserStats;
}

interface SuccessStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: AdminUserItem[];
}

type AspectRatioMode = 'story' | 'square' | 'landscape';

export const SuccessStoryModal: React.FC<SuccessStoryModalProps> = ({
  isOpen,
  onClose,
  users,
}) => {
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>('story');
  const [downloading, setDownloading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('top_1');
  const cardRef = useRef<HTMLDivElement | null>(null);

  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [generatedImgUrl, setGeneratedImgUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter out admin users and sort descending by wallet balance
  const nonAdminUsers = users.filter((u) => !u.isAdmin);
  const sortedUsers = [...nonAdminUsers].sort(
    (a, b) => (b.stats?.balance || 0) - (a.stats?.balance || 0)
  );

  // Top earner from live database
  const topEarner = sortedUsers.length > 0 ? sortedUsers[0] : null;

  // Selected user or top earner default
  const activeUser =
    selectedUserId === 'top_1' || !selectedUserId
      ? topEarner
      : users.find((u) => u.id === selectedUserId) || topEarner;

  const currentBalance = activeUser?.stats?.balance || 0;
  const displayName = activeUser?.name || activeUser?.email?.split('@')[0] || 'User';

  const handleDownloadImage = async () => {
    setDownloading(true);
    setDownloadError(null);
    const fileName = `Success_Story_${displayName.replace(/\s+/g, '_')}_${aspectRatio}.png`;

    try {
      const generatedUrl = await generateHighResolutionCardImage(
        activeUser,
        aspectRatio,
        currentBalance,
        displayName
      );
      if (generatedUrl) {
        triggerDownload(generatedUrl, fileName);
      } else {
        throw new Error('Canvas render failed');
      }
    } catch (err: any) {
      console.error('Failed to generate success story card image:', err);
      setDownloadError('Hindi maidownload ang litrato. I-long press o mag-screenshot na lamang.');
      setDownloading(false);
    }
  };

  const generateHighResolutionCardImage = (
    user: AdminUserItem | null,
    ratio: AspectRatioMode,
    balance: number,
    name: string
  ): Promise<string> => {
    return new Promise((resolve) => {
      let w = 1080;
      let h = 1080;
      if (ratio === 'story') {
        w = 1080;
        h = 1920;
      } else if (ratio === 'landscape') {
        w = 1920;
        h = 1080;
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      const drawRoundRect = (
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number,
        fillStyle?: string,
        strokeStyle?: string,
        lineWidth?: number
      ) => {
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius);
        if (fillStyle) {
          ctx.fillStyle = fillStyle;
          ctx.fill();
        }
        if (strokeStyle && lineWidth) {
          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        }
      };

      // 1. Dark Background Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, '#030712');
      bgGrad.addColorStop(0.5, '#0B192C');
      bgGrad.addColorStop(1, '#030712');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Radial Glow Effects
      const glow1 = ctx.createRadialGradient(150, 150, 10, 150, 150, 500);
      glow1.addColorStop(0, 'rgba(245, 158, 11, 0.3)');
      glow1.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, w, h);

      const glow2 = ctx.createRadialGradient(w - 150, h - 150, 10, w - 150, h - 150, 500);
      glow2.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
      glow2.addColorStop(1, 'rgba(59, 130, 246, 0)');
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, w, h);

      // 2. Outer Gold Border
      const padding = Math.min(w, h) * 0.04;
      const cardW = w - padding * 2;
      const cardH = h - padding * 2;
      drawRoundRect(padding, padding, cardW, cardH, 44, undefined, '#F59E0B', 14);

      // Avatar Loader Function with CORS handling
      const loadAvatar = (): Promise<HTMLImageElement | null> => {
        return new Promise((res) => {
          if (!user?.avatar) {
            res(null);
            return;
          }
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => res(img);
          img.onerror = () => {
            // Retry without crossOrigin if CORS blocks anonymous fetch
            const imgNoCors = new Image();
            imgNoCors.onload = () => res(imgNoCors);
            imgNoCors.onerror = () => res(null);
            imgNoCors.src = user.avatar;
          };
          img.src = user.avatar;
        });
      };

      loadAvatar().then((avatarImg) => {
        ctx.save();

        // 3. Top Header Section
        const headerY = padding + 60;
        
        // #1 Badge Circle
        ctx.beginPath();
        ctx.arc(padding + 60, headerY, 28, 0, Math.PI * 2);
        ctx.fillStyle = '#F59E0B';
        ctx.fill();
        ctx.fillStyle = '#0F172A';
        ctx.font = '900 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('#1', padding + 60, headerY);

        // Header Text
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#FCD34D';
        ctx.font = '900 32px sans-serif';
        ctx.fillText('SUCCESS STORIES', padding + 105, headerY - 4);

        ctx.fillStyle = '#CBD5E1';
        ctx.font = '800 20px sans-serif';
        ctx.fillText('HIGHEST BALANCE MEMBER', padding + 105, headerY + 22);

        // Verified Badge (Top Right)
        const verW = 170;
        const verX = w - padding - verW - 30;
        drawRoundRect(verX, headerY - 24, verW, 46, 23, 'rgba(245, 158, 11, 0.2)', '#F59E0B', 2);
        ctx.fillStyle = '#FCD34D';
        ctx.font = '900 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✦ VERIFIED', verX + verW / 2, headerY);

        // Divider Line
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(padding + 40, headerY + 48);
        ctx.lineTo(w - padding - 40, headerY + 48);
        ctx.stroke();

        // 4. MAIN BODY (LAYOUT SPECIFIC)
        if (ratio === 'landscape') {
          // YOUTUBE 16:9 LANDSCAPE LAYOUT
          const centerY = h / 2 + 10;
          const avatarCenterX = w * 0.28;
          const avatarRadius = 115;

          // Avatar Gold Ring
          ctx.beginPath();
          ctx.arc(avatarCenterX, centerY, avatarRadius + 10, 0, Math.PI * 2);
          ctx.fillStyle = '#F59E0B';
          ctx.fill();

          ctx.save();
          ctx.beginPath();
          ctx.arc(avatarCenterX, centerY, avatarRadius, 0, Math.PI * 2);
          ctx.clip();
          if (avatarImg) {
            try {
              ctx.drawImage(avatarImg, avatarCenterX - avatarRadius, centerY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
            } catch (e) {
              drawFallbackAvatar(avatarCenterX, centerY, avatarRadius);
            }
          } else {
            drawFallbackAvatar(avatarCenterX, centerY, avatarRadius);
          }
          ctx.restore();

          // Top Earner Badge Pill
          drawRoundRect(avatarCenterX - 85, centerY + avatarRadius - 15, 170, 40, 20, '#F59E0B', '#FFFFFF', 3);
          ctx.fillStyle = '#0F172A';
          ctx.font = '900 18px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('TOP EARNER', avatarCenterX, centerY + avatarRadius + 5);

          // Right Column: Name Box & Balance Box
          const rightX = w * 0.46;
          const rightW = w * 0.46;

          // Name Box
          drawRoundRect(rightX, centerY - 110, rightW, 95, 20, '#0F172A', '#F59E0B', 3);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 34px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(name, rightX + rightW / 2, centerY - 58);

          ctx.fillStyle = '#FCD34D';
          ctx.font = '800 20px sans-serif';
          ctx.fillText('✓ Active Member • Highest Payout', rightX + rightW / 2, centerY - 28);

          // Balance Box
          drawRoundRect(rightX, centerY + 10, rightW, 120, 20, '#FFFFFF', '#F59E0B', 4);
          ctx.fillStyle = '#64748B';
          ctx.font = '800 18px sans-serif';
          ctx.fillText('FINANCIAL PERFORMANCE • BALANSE SA WALLET', rightX + rightW / 2, centerY + 46);

          ctx.fillStyle = '#020617';
          ctx.font = '900 44px sans-serif';
          ctx.fillText(`₱${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightX + rightW / 2, centerY + 102);

        } else {
          // TIKTOK 9:16 STORY & FACEBOOK 1:1 SQUARE VERTICAL LAYOUT
          const avatarCenterX = w / 2;
          const avatarCenterY = ratio === 'story' ? h * 0.34 : h * 0.33;
          const avatarRadius = ratio === 'story' ? 145 : 115;

          // Avatar Gold Ring
          ctx.beginPath();
          ctx.arc(avatarCenterX, avatarCenterY, avatarRadius + 12, 0, Math.PI * 2);
          ctx.fillStyle = '#F59E0B';
          ctx.fill();

          ctx.save();
          ctx.beginPath();
          ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
          ctx.clip();
          if (avatarImg) {
            try {
              ctx.drawImage(avatarImg, avatarCenterX - avatarRadius, avatarCenterY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
            } catch (e) {
              drawFallbackAvatar(avatarCenterX, avatarCenterY, avatarRadius);
            }
          } else {
            drawFallbackAvatar(avatarCenterX, avatarCenterY, avatarRadius);
          }
          ctx.restore();

          // Top Earner Badge Pill
          drawRoundRect(avatarCenterX - 95, avatarCenterY + avatarRadius - 18, 190, 44, 22, '#F59E0B', '#FFFFFF', 3);
          ctx.fillStyle = '#0F172A';
          ctx.font = '900 20px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('TOP EARNER', avatarCenterX, avatarCenterY + avatarRadius + 4);

          // Name Box
          const boxW = Math.min(w * 0.82, 720);
          const nameBoxY = avatarCenterY + avatarRadius + 45;
          drawRoundRect(avatarCenterX - boxW / 2, nameBoxY, boxW, 105, 24, '#0F172A', '#F59E0B', 3);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 38px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(name, avatarCenterX, nameBoxY + 52);

          ctx.fillStyle = '#FCD34D';
          ctx.font = '800 22px sans-serif';
          ctx.fillText('✓ Active Member • Highest Payout', avatarCenterX, nameBoxY + 86);

          // Balance Box
          const balBoxY = nameBoxY + 130;
          const balBoxH = ratio === 'story' ? 175 : 140;
          drawRoundRect(avatarCenterX - boxW / 2, balBoxY, boxW, balBoxH, 24, '#FFFFFF', '#F59E0B', 4);

          ctx.fillStyle = '#64748B';
          ctx.font = '800 22px sans-serif';
          ctx.fillText('FINANCIAL PERFORMANCE • BALANSE SA WALLET', avatarCenterX, balBoxY + 48);

          ctx.fillStyle = '#020617';
          ctx.font = ratio === 'story' ? '900 68px sans-serif' : '900 54px sans-serif';
          ctx.fillText(`₱${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, avatarCenterX, balBoxY + (ratio === 'story' ? 130 : 112));
        }

        // Helper for Avatar Fallback Initial
        function drawFallbackAvatar(cx: number, cy: number, r: number) {
          const blueGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
          blueGrad.addColorStop(0, '#1E40AF');
          blueGrad.addColorStop(1, '#0F172A');
          ctx.fillStyle = blueGrad;
          ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 80px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(name.charAt(0).toUpperCase(), cx, cy);
        }

        // 5. FOOTER SLOGAN
        const footerY = h - padding - 60;
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(padding + 40, footerY - 45);
        ctx.lineTo(w - padding - 40, footerY - 45);
        ctx.stroke();

        ctx.fillStyle = '#FCD34D';
        ctx.font = '900 30px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('TUNAY NA KITA. TUNAY NA PAGBABAGO.', w / 2, footerY - 8);

        ctx.fillStyle = '#E2E8F0';
        ctx.font = '800 22px sans-serif';
        ctx.fillText('IKAW NA ANG SUSUNOD NA SUCCESS STORY!', w / 2, footerY + 28);

        ctx.restore();

        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      });
    });
  };

  const triggerDownload = (url: string, fileName: string) => {
    try {
      setGeneratedImgUrl(url);
      const link = document.createElement('a');
      link.download = fileName;
      link.href = url;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Trigger download link error:', e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn overflow-y-auto">
      {/* POPUP MODAL CONTAINER */}
      <div className="relative w-full max-w-2xl bg-slate-950 border-2 border-amber-400/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[96vh]">
        
        {/* MODAL HEADER WITH COMPACT EXIT BUTTON */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 border-b border-slate-800 bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
              <Trophy className="w-4 h-4 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 truncate leading-tight">
                <span>Top Earner Success Story</span>
                <span className="text-[8px] sm:text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 shrink-0">
                  Live DB
                </span>
              </h3>
              <p className="text-[10px] text-amber-200/70 font-medium truncate leading-tight">
                Live statistics mula sa database ng pinakamataas na balance.
              </p>
            </div>
          </div>

          {/* EXIT BUTTON (X) */}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center font-bold transition cursor-pointer border border-red-400 shadow-md active:scale-95 shrink-0 ml-2"
            title="Isara (Exit)"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* CONTROLS BAR */}
        <div className="p-2 sm:p-3 bg-slate-900/60 border-b border-slate-800 flex flex-col gap-2 shrink-0">
          {/* USER SELECTOR */}
          <div className="flex items-center gap-1.5 w-full min-w-0">
            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-slate-950 border border-amber-500/40 text-amber-300 font-extrabold text-[11px] sm:text-xs px-2 py-1 rounded-lg focus:outline-none focus:border-amber-400 cursor-pointer truncate"
            >
              <option value="top_1" className="bg-slate-950 text-amber-400 font-black">
                🥇 #1 Top Earner: {topEarner?.name || topEarner?.email || 'N/A'} (₱
                {(topEarner?.stats?.balance || 0).toLocaleString()})
              </option>
              {sortedUsers.slice(1).map((u, idx) => (
                <option key={u.id} value={u.id} className="bg-slate-950 text-slate-200">
                  #{idx + 2} {u.name || u.email} (₱{(u.stats?.balance || 0).toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {/* ASPECT RATIO BUTTONS & DOWNLOAD BUTTON */}
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            {/* FRAME ASPECT RATIO SELECTOR */}
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 flex-wrap">
              <button
                onClick={() => setAspectRatio('story')}
                className={`flex items-center gap-1 px-2 py-1 rounded font-black text-[10px] sm:text-[11px] transition cursor-pointer ${
                  aspectRatio === 'story'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="TikTok / Reels 9:16 Frame"
              >
                <Smartphone className="w-3 h-3" />
                <span>TikTok (9:16)</span>
              </button>

              <button
                onClick={() => setAspectRatio('square')}
                className={`flex items-center gap-1 px-2 py-1 rounded font-black text-[10px] sm:text-[11px] transition cursor-pointer ${
                  aspectRatio === 'square'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Facebook 1:1 Square Frame"
              >
                <Square className="w-3 h-3" />
                <span>FB (1:1)</span>
              </button>

              <button
                onClick={() => setAspectRatio('landscape')}
                className={`flex items-center gap-1 px-2 py-1 rounded font-black text-[10px] sm:text-[11px] transition cursor-pointer ${
                  aspectRatio === 'landscape'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="YouTube 16:9 Frame"
              >
                <Tv className="w-3 h-3" />
                <span>YouTube (16:9)</span>
              </button>
            </div>

            {/* DOWNLOAD BUTTON */}
            <button
              onClick={handleDownloadImage}
              disabled={downloading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-[11px] sm:text-xs tracking-wider shadow shadow-amber-500/20 active:scale-95 transition disabled:opacity-50 cursor-pointer shrink-0 ml-auto"
            >
              <Download className="w-3 h-3 text-slate-950" />
              <span>{downloading ? 'Exporting...' : 'Download'}</span>
            </button>
          </div>
        </div>

        {/* MODAL BODY / RESPONSIVE CARD DISPLAY CANVAS AREA */}
        <div className="p-3 sm:p-5 overflow-auto flex items-center justify-center bg-slate-950/90 min-h-[300px] flex-1">
          {activeUser ? (
            <div
              ref={cardRef}
              className={`relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 border-4 border-amber-400 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col justify-between text-white transition-all duration-300 shrink-0 my-auto ${
                aspectRatio === 'story'
                  ? 'w-[270px] sm:w-[310px] aspect-[9/16]'
                  : aspectRatio === 'square'
                  ? 'w-[290px] sm:w-[350px] aspect-square'
                  : 'w-[360px] sm:w-[480px] aspect-[16/9]'
              }`}
            >
              {/* GLOW DECORATIONS */}
              <div className="absolute -top-16 -left-16 w-36 h-36 bg-amber-500/30 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-blue-500/30 rounded-full blur-3xl pointer-events-none" />

              {/* TOP HEADER BADGE */}
              <div className="w-full flex items-center justify-between border-b border-amber-500/30 pb-1.5 relative z-10 shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 flex items-center justify-center font-black text-[9px] sm:text-[10px] shadow-md">
                    #1
                  </div>
                  <div>
                    <h4 className="text-[10px] sm:text-xs font-black text-amber-300 tracking-wider uppercase leading-none">
                      SUCCESS STORIES
                    </h4>
                    <span className="text-[7px] sm:text-[8px] text-slate-300 font-extrabold tracking-wide">HIGHEST BALANCE MEMBER</span>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[7px] sm:text-[8px] font-black uppercase">
                  <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                  <span>Verified</span>
                </div>
              </div>

              {/* MAIN CONTENT AREA - ADAPTIVE BY ASPECT RATIO */}
              {aspectRatio === 'landscape' ? (
                /* YOUTUBE 16:9 LANDSCAPE HORIZONTAL LAYOUT */
                <div className="flex items-center justify-center gap-3 sm:gap-5 my-auto py-1 relative z-10 w-full px-1">
                  {/* LEFT COLUMN: AVATAR */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full border-2 sm:border-3 border-amber-400 p-0.5 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 shadow-xl shadow-amber-500/30 flex items-center justify-center relative">
                      {activeUser.avatar ? (
                        <img
                          src={activeUser.avatar}
                          alt={displayName}
                          className="w-full h-full object-cover rounded-full"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-600 to-slate-900 flex items-center justify-center text-white text-base sm:text-lg font-black">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute -bottom-1.5 bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full font-black text-[7px] sm:text-[8px] uppercase tracking-wider shadow-md border border-amber-100 whitespace-nowrap">
                        Top Earner
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: NAME & BALANCE */}
                  <div className="flex flex-col items-stretch justify-center gap-1.5 min-w-0 flex-1">
                    {/* USER NAME BADGE */}
                    <div className="bg-slate-900/90 border border-amber-400/60 rounded-lg sm:rounded-xl px-2.5 py-1 shadow-lg">
                      <h3 className="text-xs sm:text-sm font-black text-white truncate tracking-wide">
                        {displayName}
                      </h3>
                      <div className="flex items-center gap-1 text-[8px] sm:text-[9px] text-amber-300 font-extrabold truncate">
                        <CheckCircle2 className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                        <span className="truncate">Active Member • Highest Payout</span>
                      </div>
                    </div>

                    {/* WALLET BALANCE DISPLAY BOX */}
                    <div className="bg-white text-slate-950 rounded-lg sm:rounded-xl p-1.5 sm:p-2 shadow-xl border border-amber-400">
                      <span className="block text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-slate-500 text-center">
                        Financial Performance • Balanse sa Wallet
                      </span>
                      <div className="text-sm sm:text-xl font-black text-slate-950 tracking-tight text-center mt-0.5">
                        ₱{currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* TIKTOK 9:16 AND FB 1:1 VERTICAL LAYOUT */
                <div className="flex flex-col items-center text-center my-auto py-1 relative z-10 w-full space-y-1.5 sm:space-y-2.5">
                  {/* PROFILE PICTURE WITH GOLD RING */}
                  <div className="relative shrink-0">
                    <div className={`${
                      aspectRatio === 'square' ? 'w-14 h-14 sm:w-20 sm:h-20' : 'w-16 h-16 sm:w-24 sm:h-24'
                    } rounded-full border-2 sm:border-4 border-amber-400 p-0.5 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 shadow-xl shadow-amber-500/30 flex items-center justify-center relative`}>
                      {activeUser.avatar ? (
                        <img
                          src={activeUser.avatar}
                          alt={displayName}
                          className="w-full h-full object-cover rounded-full"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-600 to-slate-900 flex items-center justify-center text-white text-lg sm:text-xl font-black">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      
                      <div className="absolute -bottom-1.5 bg-amber-400 text-slate-950 px-2 py-0.2 rounded-full font-black text-[7px] sm:text-[8px] uppercase tracking-wider shadow-md border border-amber-100 whitespace-nowrap">
                        Top Earner
                      </div>
                    </div>
                  </div>

                  {/* USER NAME BADGE */}
                  <div className="w-full max-w-[220px] sm:max-w-xs bg-slate-900/90 border border-amber-400/60 rounded-lg sm:rounded-xl px-2 py-0.5 sm:py-1 shadow-lg">
                    <h3 className="text-xs sm:text-base font-black text-white truncate tracking-wide">
                      {displayName}
                    </h3>
                    <div className="flex items-center justify-center gap-1 text-[8px] sm:text-[9px] text-amber-300 font-extrabold">
                      <CheckCircle2 className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                      <span>Active Member • Highest Payout</span>
                    </div>
                  </div>

                  {/* WALLET BALANCE DISPLAY BOX */}
                  <div className="w-full max-w-[220px] sm:max-w-xs bg-white text-slate-950 rounded-lg sm:rounded-xl p-1.5 sm:p-2 shadow-xl border border-amber-400">
                    <span className="block text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-slate-500 text-center">
                      Financial Performance • Balanse sa Wallet
                    </span>
                    <div className={`${aspectRatio === 'square' ? 'text-sm sm:text-xl' : 'text-base sm:text-2xl'} font-black text-slate-950 tracking-tight text-center mt-0.5`}>
                      ₱{currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              )}

              {/* FOOTER SLOGAN */}
              <div className="w-full text-center border-t border-amber-500/30 pt-1 relative z-10 shrink-0">
                <p className="text-[8px] sm:text-[10px] font-black text-amber-300 uppercase tracking-widest">
                  TUNAY NA KITA. TUNAY NA PAGBABAGO.
                </p>
                <p className="text-[7px] sm:text-[8px] font-black text-slate-300 mt-0.5">
                  IKAW NA ANG SUSUNOD NA SUCCESS STORY!
                </p>
              </div>

            </div>
          ) : (
            <div className="text-slate-400 text-sm font-bold">
              Walang nahanap na user sa database.
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-3 py-2 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between text-[11px] text-slate-400 shrink-0 flex-wrap gap-2">
          <span className="text-[10px]">
            Formats: <strong>TikTok (9:16)</strong>, <strong>FB (1:1)</strong>, &amp; <strong>YouTube (16:9)</strong>
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {generatedImgUrl && (
              <a
                href={generatedImgUrl}
                target="_blank"
                rel="noreferrer"
                download={`Success_Story_${displayName.replace(/\s+/g, '_')}_${aspectRatio}.png`}
                className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] sm:text-xs transition cursor-pointer border border-emerald-300 flex items-center gap-1 shadow-md"
              >
                <Download className="w-3 h-3" />
                <span>I-save ang PNG</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-black text-[10px] sm:text-xs transition cursor-pointer border border-red-400 shadow-sm"
            >
              ISARA (EXIT)
            </button>
          </div>
        </div>

        {/* IMAGE PREVIEW MODAL OVERLAY IF DOWNLOAD TRIGGERED */}
        {generatedImgUrl && (
          <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md p-4 flex flex-col items-center justify-center animate-fadeIn">
            <div className="max-w-md w-full bg-slate-900 border-2 border-amber-400 rounded-2xl p-4 text-center shadow-2xl space-y-3">
              <div className="inline-flex items-center gap-2 text-emerald-400 font-black text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Na-generate na ang Success Story Image!</span>
              </div>
              
              <div className="max-h-[300px] overflow-hidden rounded-xl border border-slate-700 bg-slate-950 p-2">
                <img
                  src={generatedImgUrl}
                  alt="Generated Card"
                  className="max-h-[280px] w-auto mx-auto rounded-lg object-contain"
                />
              </div>

              <p className="text-xs text-slate-300 font-medium">
                Kung hindi awtomatikong nag-download sa iyong browser o phone, i-click ang button sa ibaba o i-right click / long-press ang litrato para i-save.
              </p>

              <div className="flex items-center justify-center gap-2 pt-1">
                <a
                  href={generatedImgUrl}
                  download={`Success_Story_${displayName.replace(/\s+/g, '_')}_${aspectRatio}.png`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>I-save / I-download litrato</span>
                </a>

                <button
                  onClick={() => setGeneratedImgUrl(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
                >
                  Bumalik
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
