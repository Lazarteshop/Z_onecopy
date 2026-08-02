import React, { useState } from 'react';
import { X, Download, Sparkles, Smartphone, Square, Tv, CheckCircle2, Trophy, Award } from 'lucide-react';

export interface ReferralWithdrawalItem {
  id: string;
  friendId: string;
  friendName: string;
  friendAvatar: string;
  amount: number;
  withdrawalDate: string;
  referenceNo?: string;
}

interface ReferralWithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  referrerName: string;
  items: ReferralWithdrawalItem[];
}

type AspectRatioMode = 'story' | 'square' | 'landscape';

export const ReferralWithdrawalModal: React.FC<ReferralWithdrawalModalProps> = ({
  isOpen,
  onClose,
  referrerName,
  items,
}) => {
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>('story');
  const [downloading, setDownloading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Active item
  const activeItem = items.find((i) => i.id === selectedItemId) || items[0] || null;

  const friendName = activeItem?.friendName || 'Invited Friend';
  const friendAvatar = activeItem?.friendAvatar || '👤';
  const withdrawalAmount = activeItem?.amount || 0;
  const withdrawalDate = activeItem?.withdrawalDate || new Date().toLocaleDateString('fil-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  const referenceNo = activeItem?.referenceNo || 'REF' + Math.floor(1000000000 + Math.random() * 9000000000);

  const handleDownloadImage = async () => {
    if (!activeItem) return;
    setDownloading(true);
    setDownloadError(null);

    const fileName = `Success_Withdrawal_${friendName.replace(/\s+/g, '_')}_${aspectRatio}.png`;

    try {
      const generatedUrl = await generateHighResolutionWithdrawalImage(
        activeItem,
        referrerName,
        aspectRatio
      );
      if (generatedUrl) {
        triggerDownload(generatedUrl, fileName);
      } else {
        throw new Error('Canvas render failed');
      }
    } catch (err: any) {
      console.error('Failed to generate referral withdrawal card image:', err);
      setDownloadError('Hindi maidownload ang litrato. Mangyaring mag-screenshot na lamang.');
      setDownloading(false);
    }
  };

  const generateHighResolutionWithdrawalImage = (
    item: ReferralWithdrawalItem,
    refName: string,
    ratio: AspectRatioMode
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
      const glow1 = ctx.createRadialGradient(200, 200, 10, 200, 200, 550);
      glow1.addColorStop(0, 'rgba(16, 185, 129, 0.35)'); // Emerald Green
      glow1.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, w, h);

      const glow2 = ctx.createRadialGradient(w - 200, h - 200, 10, w - 200, h - 200, 550);
      glow2.addColorStop(0, 'rgba(245, 158, 11, 0.35)'); // Gold
      glow2.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, w, h);

      // 2. Outer Gold Border Frame
      const padding = Math.min(w, h) * 0.04;
      const cardW = w - padding * 2;
      const cardH = h - padding * 2;
      drawRoundRect(padding, padding, cardW, cardH, 44, undefined, '#F59E0B', 14);

      // Load Avatar Image with CORS handling
      const loadAvatar = (): Promise<HTMLImageElement | null> => {
        return new Promise((res) => {
          if (!item.friendAvatar || (!item.friendAvatar.startsWith('http') && !item.friendAvatar.startsWith('data:'))) {
            res(null);
            return;
          }
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => res(img);
          img.onerror = () => {
            const imgNoCors = new Image();
            imgNoCors.onload = () => res(imgNoCors);
            imgNoCors.onerror = () => res(null);
            imgNoCors.src = item.friendAvatar;
          };
          img.src = item.friendAvatar;
        });
      };

      loadAvatar().then((avatarImg) => {
        ctx.save();

        // 3. Top Header Section
        const headerY = padding + 60;

        // Top Badge Icon
        ctx.beginPath();
        ctx.arc(padding + 60, headerY, 28, 0, Math.PI * 2);
        ctx.fillStyle = '#10B981';
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 26px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', padding + 60, headerY);

        // Header Text
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#FCD34D';
        ctx.font = '900 32px sans-serif';
        ctx.fillText('SUCCESSFUL WITHDRAWAL', padding + 105, headerY - 4);

        ctx.fillStyle = '#CBD5E1';
        ctx.font = '800 20px sans-serif';
        ctx.fillText('REFERRAL MEMBER GCASH CASHOUT', padding + 105, headerY + 22);

        // Verified Badge (Top Right)
        const verW = 180;
        const verX = w - padding - verW - 30;
        drawRoundRect(verX, headerY - 24, verW, 46, 23, 'rgba(16, 185, 129, 0.25)', '#10B981', 2);
        ctx.fillStyle = '#34D399';
        ctx.font = '900 19px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✦ VERIFIED', verX + verW / 2, headerY);

        // Header Divider
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(padding + 40, headerY + 48);
        ctx.lineTo(w - padding - 40, headerY + 48);
        ctx.stroke();

        // 4. MAIN BODY DISPLAY (ADAPTIVE BY ASPECT RATIO)
        if (ratio === 'landscape') {
          // YOUTUBE 16:9 LANDSCAPE
          const centerY = h / 2 + 10;
          const avatarCenterX = w * 0.28;
          const avatarRadius = 115;

          // Gold Avatar Ring
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

          // Successful Cashout Badge Pill
          drawRoundRect(avatarCenterX - 105, centerY + avatarRadius - 15, 210, 42, 21, '#10B981', '#FFFFFF', 3);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 17px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('SUCCESSFUL CASHOUT', avatarCenterX, centerY + avatarRadius + 6);

          // Right Column: Name Box & Withdrawal Amount Box
          const rightX = w * 0.46;
          const rightW = w * 0.46;

          // Name Box
          drawRoundRect(rightX, centerY - 120, rightW, 100, 20, '#0F172A', '#F59E0B', 3);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 34px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(item.friendName, rightX + rightW / 2, centerY - 68);

          ctx.fillStyle = '#34D399';
          ctx.font = '800 20px sans-serif';
          ctx.fillText('✓ Active Referred Member • Paid via GCash', rightX + rightW / 2, centerY - 36);

          // Amount Box
          drawRoundRect(rightX, centerY + 5, rightW, 130, 20, '#FFFFFF', '#10B981', 4);
          ctx.fillStyle = '#64748B';
          ctx.font = '800 17px sans-serif';
          ctx.fillText(`AMOUNT WITHDRAWN • PETSA: ${item.withdrawalDate}`, rightX + rightW / 2, centerY + 40);

          ctx.fillStyle = '#020617';
          ctx.font = '900 48px sans-serif';
          ctx.fillText(`₱${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightX + rightW / 2, centerY + 100);

        } else {
          // TIKTOK 9:16 STORY & FACEBOOK 1:1 SQUARE VERTICAL LAYOUT
          const avatarCenterX = w / 2;
          const avatarCenterY = ratio === 'story' ? h * 0.33 : h * 0.32;
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

          // Successful Cashout Badge Pill
          drawRoundRect(avatarCenterX - 110, avatarCenterY + avatarRadius - 18, 220, 44, 22, '#10B981', '#FFFFFF', 3);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 19px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('SUCCESSFUL CASHOUT', avatarCenterX, avatarCenterY + avatarRadius + 4);

          // Name Box
          const boxW = Math.min(w * 0.82, 740);
          const nameBoxY = avatarCenterY + avatarRadius + 45;
          drawRoundRect(avatarCenterX - boxW / 2, nameBoxY, boxW, 105, 24, '#0F172A', '#F59E0B', 3);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 38px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(item.friendName, avatarCenterX, nameBoxY + 52);

          ctx.fillStyle = '#34D399';
          ctx.font = '800 22px sans-serif';
          ctx.fillText('✓ Active Referred Member • Paid via GCash', avatarCenterX, nameBoxY + 86);

          // Amount Box
          const balBoxY = nameBoxY + 130;
          const balBoxH = ratio === 'story' ? 200 : 150;
          drawRoundRect(avatarCenterX - boxW / 2, balBoxY, boxW, balBoxH, 24, '#FFFFFF', '#10B981', 4);

          ctx.fillStyle = '#64748B';
          ctx.font = '800 21px sans-serif';
          ctx.fillText('AMOUNT WITHDRAWN • HALAGA NG NA-WITHDRAW', avatarCenterX, balBoxY + 44);

          ctx.fillStyle = '#020617';
          ctx.font = ratio === 'story' ? '900 68px sans-serif' : '900 54px sans-serif';
          ctx.fillText(`₱${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, avatarCenterX, balBoxY + (ratio === 'story' ? 122 : 106));

          // Date & Ref Box Subtext inside Amount Box
          ctx.fillStyle = '#0F172A';
          ctx.font = '800 20px sans-serif';
          ctx.fillText(`📅 PETSA NG WITHDRAWAL: ${item.withdrawalDate}`, avatarCenterX, balBoxY + (ratio === 'story' ? 168 : 138));
        }

        // Helper for Avatar Fallback
        function drawFallbackAvatar(cx: number, cy: number, r: number) {
          const blueGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
          blueGrad.addColorStop(0, '#047857');
          blueGrad.addColorStop(1, '#064E3B');
          ctx.fillStyle = blueGrad;
          ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 80px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText((item.friendAvatar && item.friendAvatar.length <= 4) ? item.friendAvatar : item.friendName.charAt(0).toUpperCase(), cx, cy);
        }

        // 5. FOOTER SLOGAN & REFERRER ATTRIBUTION
        const footerY = h - padding - 65;
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
        ctx.fillText('TUNAY NA KITA. TUNAY NA PAGBABAGO.', w / 2, footerY - 12);

        ctx.fillStyle = '#E2E8F0';
        ctx.font = '800 22px sans-serif';
        ctx.fillText('IKAW NA ANG SUSUNOD NA SUCCESS STORY!', w / 2, footerY + 22);

        if (refName) {
          ctx.fillStyle = '#10B981';
          ctx.font = 'bold 18px sans-serif';
          ctx.fillText(`Referred & Sponsored by: ${refName}`, w / 2, footerY + 52);
        }

        ctx.restore();

        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      });
    });
  };

  const triggerDownload = (url: string, fileName: string) => {
    try {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl text-white my-auto flex flex-col max-h-[95vh]">
        
        {/* MODAL HEADER */}
        <div className="p-3 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-slate-950 shadow-md">
              <Award className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-1.5 leading-tight">
                <span>Success Withdrawal Banner</span>
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-0.5">
                Congratulations banner para sa na-invite mong kaibigan na nakawithdraw
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTROLS SECTION */}
        <div className="p-3 sm:p-4 bg-slate-900/50 border-b border-slate-800/80 space-y-3 shrink-0">
          
          {/* FRIEND / WITHDRAWAL SELECTOR DROPDOWN */}
          {items.length > 1 && (
            <div>
              <label className="text-[10px] sm:text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                Pumili ng Na-invite na Kaibigan:
              </label>
              <select
                value={activeItem?.id || ''}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs sm:text-sm font-bold focus:outline-none focus:border-emerald-500"
              >
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.friendName} • ₱{item.amount.toFixed(2)} ({item.withdrawalDate})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ASPECT RATIO SELECTOR */}
          <div>
            <label className="text-[10px] sm:text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
              I-format ang Sukat ng Card:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setAspectRatio('story')}
                className={`p-2 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                  aspectRatio === 'story'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-lg'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>TikTok (9:16)</span>
              </button>

              <button
                onClick={() => setAspectRatio('square')}
                className={`p-2 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                  aspectRatio === 'square'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-lg'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Square className="w-4 h-4" />
                <span>FB Post (1:1)</span>
              </button>

              <button
                onClick={() => setAspectRatio('landscape')}
                className={`p-2 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                  aspectRatio === 'landscape'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-lg'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Tv className="w-4 h-4" />
                <span>YouTube (16:9)</span>
              </button>
            </div>
          </div>
        </div>

        {/* MODAL BODY / CARD DISPLAY CANVAS PREVIEW AREA */}
        <div className="p-3 sm:p-5 overflow-auto flex items-center justify-center bg-slate-950/90 min-h-[300px] flex-1">
          {activeItem ? (
            <div
              className={`relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 border-4 border-amber-400 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col justify-between text-white transition-all duration-300 shrink-0 my-auto ${
                aspectRatio === 'story'
                  ? 'w-[270px] sm:w-[310px] aspect-[9/16]'
                  : aspectRatio === 'square'
                  ? 'w-[290px] sm:w-[350px] aspect-square'
                  : 'w-[360px] sm:w-[480px] aspect-[16/9]'
              }`}
            >
              {/* GLOW DECORATIONS */}
              <div className="absolute -top-16 -left-16 w-36 h-36 bg-emerald-500/30 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-amber-500/30 rounded-full blur-3xl pointer-events-none" />

              {/* TOP HEADER BADGE */}
              <div className="w-full flex items-center justify-between border-b border-amber-500/30 pb-1.5 relative z-10 shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center font-black text-[10px] shadow-md">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-[10px] sm:text-xs font-black text-amber-300 tracking-wider">
                      SUCCESSFUL WITHDRAWAL
                    </h4>
                    <span className="text-[7px] sm:text-[8px] text-slate-300 font-extrabold tracking-wide">
                      REFERRAL MEMBER PAYOUT
                    </span>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[7px] sm:text-[8px] font-black uppercase">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-300" />
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
                      {friendAvatar && (friendAvatar.startsWith('http') || friendAvatar.startsWith('data:')) ? (
                        <img
                          src={friendAvatar}
                          alt={friendName}
                          className="w-full h-full object-cover rounded-full"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-700 to-slate-900 flex items-center justify-center text-white text-base sm:text-lg font-black">
                          {friendAvatar && friendAvatar.length <= 4 ? friendAvatar : friendName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute -bottom-1.5 bg-emerald-500 text-white px-1.5 py-0.2 rounded-full font-black text-[7px] sm:text-[8px] uppercase tracking-wider shadow-md border border-emerald-100 whitespace-nowrap">
                        Cashout Success
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: NAME & WITHDRAWAL AMOUNT */}
                  <div className="flex flex-col items-stretch justify-center gap-1.5 min-w-0 flex-1">
                    {/* USER NAME BADGE */}
                    <div className="bg-slate-900/90 border border-amber-400/60 rounded-lg sm:rounded-xl px-2.5 py-1 shadow-lg">
                      <h3 className="text-xs sm:text-sm font-black text-white truncate tracking-wide">
                        {friendName}
                      </h3>
                      <div className="flex items-center gap-1 text-[8px] sm:text-[9px] text-emerald-300 font-extrabold truncate">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                        <span className="truncate">Active Member • GCash Cashout Paid</span>
                      </div>
                    </div>

                    {/* WITHDRAWAL AMOUNT DISPLAY BOX */}
                    <div className="bg-white text-slate-950 rounded-lg sm:rounded-xl p-1.5 sm:p-2 shadow-xl border border-emerald-500">
                      <span className="block text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-slate-500 text-center">
                        Amount Withdrawn • Petsa: {withdrawalDate}
                      </span>
                      <div className="text-sm sm:text-xl font-black text-slate-950 tracking-tight text-center mt-0.5">
                        ₱{withdrawalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                      {friendAvatar && (friendAvatar.startsWith('http') || friendAvatar.startsWith('data:')) ? (
                        <img
                          src={friendAvatar}
                          alt={friendName}
                          className="w-full h-full object-cover rounded-full"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-700 to-slate-900 flex items-center justify-center text-white text-lg sm:text-xl font-black">
                          {friendAvatar && friendAvatar.length <= 4 ? friendAvatar : friendName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      
                      <div className="absolute -bottom-1.5 bg-emerald-500 text-white px-2 py-0.2 rounded-full font-black text-[7px] sm:text-[8px] uppercase tracking-wider shadow-md border border-emerald-100 whitespace-nowrap">
                        Cashout Success
                      </div>
                    </div>
                  </div>

                  {/* USER NAME BADGE */}
                  <div className="w-full max-w-[220px] sm:max-w-xs bg-slate-900/90 border border-amber-400/60 rounded-lg sm:rounded-xl px-2 py-0.5 sm:py-1 shadow-lg">
                    <h3 className="text-xs sm:text-base font-black text-white truncate tracking-wide">
                      {friendName}
                    </h3>
                    <div className="flex items-center justify-center gap-1 text-[8px] sm:text-[9px] text-emerald-300 font-extrabold">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                      <span>Active Member • Paid via GCash</span>
                    </div>
                  </div>

                  {/* WITHDRAWAL AMOUNT DISPLAY BOX */}
                  <div className="w-full max-w-[220px] sm:max-w-xs bg-white text-slate-950 rounded-lg sm:rounded-xl p-1.5 sm:p-2 shadow-xl border border-emerald-500">
                    <span className="block text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-slate-500 text-center">
                      Amount Withdrawn • Halaga ng Na-withdraw
                    </span>
                    <div className={`${aspectRatio === 'square' ? 'text-sm sm:text-xl' : 'text-base sm:text-2xl'} font-black text-slate-950 tracking-tight text-center mt-0.5`}>
                      ₱{withdrawalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span className="block text-[7px] sm:text-[8px] font-extrabold text-emerald-600 text-center mt-0.5">
                      📅 Petsa: {withdrawalDate}
                    </span>
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
                {referrerName && (
                  <p className="text-[6px] sm:text-[7px] font-bold text-emerald-400 mt-0.5">
                    Referred & Sponsored by: {referrerName}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-xs">Wala pang na-invite na kaibigan na may successful withdrawal.</div>
          )}
        </div>

        {/* ERROR MESSAGE IF ANY */}
        {downloadError && (
          <div className="px-4 py-2 bg-rose-500/20 border-t border-rose-500/30 text-rose-300 text-xs font-bold text-center">
            {downloadError}
          </div>
        )}

        {/* FOOTER ACTIONS */}
        <div className="p-3 sm:p-5 border-t border-slate-800 bg-slate-900 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white font-bold text-xs sm:text-sm transition cursor-pointer"
          >
            Isara
          </button>

          <button
            onClick={handleDownloadImage}
            disabled={downloading || !activeItem}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-amber-500 hover:from-emerald-600 hover:to-amber-600 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/20 flex items-center gap-2 transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'I-ne-generate ang Image...' : 'I-download ang Banner (PNG)'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
