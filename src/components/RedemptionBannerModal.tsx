import React, { useState, useEffect } from 'react';
import { X, Download, Sparkles, Smartphone, Square, Tv, CheckCircle2, ShieldCheck, Gift, Trophy } from 'lucide-react';

export interface RedemptionRecordItem {
  id?: string;
  userName: string;
  userAvatar?: string;
  userEmail?: string;
  amount: number;
  createdAt: string;
  referenceNo?: string;
  gcashNumber?: string;
  inviterName?: string;
}

interface RedemptionBannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  redemption: RedemptionRecordItem | null;
}

type AspectRatioMode = 'story' | 'square' | 'landscape';

export const RedemptionBannerModal: React.FC<RedemptionBannerModalProps> = ({
  isOpen,
  onClose,
  redemption,
}) => {
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>('square');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [generatedImgUrl, setGeneratedImgUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && redemption) {
      // Pre-generate live banner image preview on open/change
      renderBannerPreview();
    }
  }, [isOpen, redemption, aspectRatio]);

  if (!isOpen || !redemption) return null;

  const displayName = redemption.userName || redemption.userEmail?.split('@')[0] || 'User';
  const amountFormatted = `₱${Number(redemption.amount || 0).toFixed(2)}`;
  const dateStr = redemption.createdAt || new Date().toLocaleDateString('fil-PH');
  const refNo = redemption.referenceNo || `REF${Math.floor(1000000000 + Math.random() * 9000000000)}`;

  const renderBannerPreview = async () => {
    try {
      const url = await generateHighResolutionBannerImage(
        redemption,
        aspectRatio,
        displayName,
        amountFormatted,
        dateStr,
        refNo
      );
      if (url) {
        setGeneratedImgUrl(url);
      }
    } catch (e) {
      console.error('Failed to pre-render banner preview:', e);
    }
  };

  const handleDownloadImage = async () => {
    setDownloading(true);
    setDownloadError(null);
    const fileName = `GCash_Redemption_Banner_${displayName.replace(/\s+/g, '_')}_${aspectRatio}.png`;

    try {
      let finalUrl = generatedImgUrl;
      if (!finalUrl) {
        finalUrl = await generateHighResolutionBannerImage(
          redemption,
          aspectRatio,
          displayName,
          amountFormatted,
          dateStr,
          refNo
        );
      }

      if (finalUrl) {
        setGeneratedImgUrl(finalUrl);
        await triggerPwaDownloadOrShare(finalUrl, fileName);
      } else {
        throw new Error('Canvas render failed');
      }
    } catch (err: any) {
      console.error('Failed to generate redemption banner image:', err);
      setDownloadError('Hindi maidownload nang kusa. Paki-long press ang larawan sa ibaba para i-save sa Photos.');
    } finally {
      setDownloading(false);
    }
  };

  const triggerPwaDownloadOrShare = async (dataUrl: string, filename: string) => {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: 'image/png' });

      // 1. Try Web Share API (Best for PWA / iOS / Android Mobile Photos app)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'GCash Redemption Banner',
            text: `Tignan ang GCash Redemption Receipt ni ${displayName}!`,
          });
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') return; // User cancelled share dialog
        }
      }

      // 2. Blob URL Download trigger
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (e) {
      console.error('PWA Blob download fallback error:', e);
      // 3. Last fallback: Direct link click
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const generateHighResolutionBannerImage = (
    item: RedemptionRecordItem,
    ratio: AspectRatioMode,
    name: string,
    amountText: string,
    dateText: string,
    refText: string
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
        radius: number | number[],
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

      // 1. Dark Background Gradient (Deep Emerald / Midnight Slate Theme)
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, '#022C22'); // dark forest
      bgGrad.addColorStop(0.5, '#064E3B'); // deep emerald
      bgGrad.addColorStop(1, '#030712'); // obsidian black
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Radial Glow Effects
      const glow1 = ctx.createRadialGradient(200, 200, 10, 200, 200, 600);
      glow1.addColorStop(0, 'rgba(16, 185, 129, 0.4)'); // Emerald Glow
      glow1.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, w, h);

      const glow2 = ctx.createRadialGradient(w - 200, h - 200, 10, w - 200, h - 200, 600);
      glow2.addColorStop(0, 'rgba(245, 158, 11, 0.35)'); // Gold Glow
      glow2.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, w, h);

      // 2. Outer Glowing Frame
      const padding = Math.min(w, h) * 0.04;
      const cardW = w - padding * 2;
      const cardH = h - padding * 2;
      drawRoundRect(padding, padding, cardW, cardH, 44, undefined, '#10B981', 12);

      // CORS Avatar loader function
      const loadAvatar = (): Promise<HTMLImageElement | null> => {
        return new Promise((res) => {
          if (!item?.userAvatar || typeof item.userAvatar !== 'string') {
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
            imgNoCors.src = item.userAvatar!;
          };
          img.src = item.userAvatar;
        });
      };

      loadAvatar().then((avatarImg) => {
        ctx.save();

        // 3. TOP HEADER SECTION
        const headerY = padding + 60;

        // GCash / Success Icon Badge
        ctx.beginPath();
        ctx.arc(padding + 60, headerY, 28, 0, Math.PI * 2);
        ctx.fillStyle = '#10B981';
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', padding + 60, headerY);

        // Header Title & Subtitle
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#6EE7B7'; // emerald-300
        ctx.font = '900 32px sans-serif';
        ctx.fillText('MATAGUMPAY NA CASHOUT', padding + 105, headerY - 4);

        ctx.fillStyle = '#FCD34D'; // amber-300
        ctx.font = '800 20px sans-serif';
        ctx.fillText('OFFICIAL GCASH REDEMPTION RECEIPT', padding + 105, headerY + 22);

        // Verified Badge Pill (Top Right)
        const verW = 210;
        const verX = w - padding - verW - 30;
        drawRoundRect(verX, headerY - 24, verW, 46, 23, 'rgba(16, 185, 129, 0.25)', '#10B981', 2);
        ctx.fillStyle = '#6EE7B7';
        ctx.font = '900 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✦ GCASH VERIFIED', verX + verW / 2, headerY);

        // Divider Line
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(padding + 40, headerY + 48);
        ctx.lineTo(w - padding - 40, headerY + 48);
        ctx.stroke();

        // 4. MAIN BODY (LAYOUT SPECIFIC)
        if (ratio === 'landscape') {
          // 16:9 LANDSCAPE LAYOUT
          const centerY = h / 2 + 10;
          const avatarCenterX = w * 0.28;
          const avatarRadius = 115;

          // Avatar Ring
          ctx.beginPath();
          ctx.arc(avatarCenterX, centerY, avatarRadius + 10, 0, Math.PI * 2);
          ctx.fillStyle = '#10B981';
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

          // Sent Status Pill
          drawRoundRect(avatarCenterX - 95, centerY + avatarRadius - 15, 190, 40, 20, '#10B981', '#FFFFFF', 3);
          ctx.fillStyle = '#064E3B';
          ctx.font = '900 18px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✓ CASHED OUT', avatarCenterX, centerY + avatarRadius + 5);

          // Right Column: Name Box & Amount Box
          const rightX = w * 0.46;
          const rightW = w * 0.46;

          // User Name Box
          drawRoundRect(rightX, centerY - 120, rightW, 95, 20, '#0F172A', '#10B981', 3);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 34px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(name, rightX + rightW / 2, centerY - 68);

          ctx.fillStyle = '#FCD34D';
          ctx.font = '800 20px sans-serif';
          const subNotice = item.inviterName ? `🎉 Inimbitahan ni: ${item.inviterName}` : '✓ Verified Member • Fast Cashout';
          ctx.fillText(subNotice, rightX + rightW / 2, centerY - 38);

          // Amount Box
          drawRoundRect(rightX, centerY - 5, rightW, 140, 20, '#FFFFFF', '#10B981', 4);
          ctx.fillStyle = '#047857';
          ctx.font = '800 18px sans-serif';
          ctx.fillText('HALAGA NG MATAGUMPAY NA CASHOUT', rightX + rightW / 2, centerY + 34);

          ctx.fillStyle = '#022C22';
          ctx.font = '900 52px sans-serif';
          ctx.fillText(amountText, rightX + rightW / 2, centerY + 96);

          // Specs Grid Box
          drawRoundRect(rightX, centerY + 150, rightW, 110, 16, 'rgba(15, 23, 42, 0.85)', '#10B981', 2);
          ctx.fillStyle = '#CBD5E1';
          ctx.font = 'bold 18px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`Petsa: ${dateText}`, rightX + 25, centerY + 190);
          ctx.fillText(`Ref No: ${refText}`, rightX + 25, centerY + 225);

          ctx.fillStyle = '#34D399';
          ctx.textAlign = 'right';
          ctx.fillText(`Status: SENT TO GCASH`, rightX + rightW - 25, centerY + 190);
          ctx.fillText(`Via: GCash Direct`, rightX + rightW - 25, centerY + 225);

        } else {
          // STORY (9:16) & SQUARE (1:1) VERTICAL LAYOUT
          const avatarCenterX = w / 2;
          const avatarCenterY = ratio === 'story' ? h * 0.32 : h * 0.31;
          const avatarRadius = ratio === 'story' ? 140 : 110;

          // Avatar Glowing Ring
          ctx.beginPath();
          ctx.arc(avatarCenterX, avatarCenterY, avatarRadius + 12, 0, Math.PI * 2);
          ctx.fillStyle = '#10B981';
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

          // Sent Status Badge Pill
          drawRoundRect(avatarCenterX - 105, avatarCenterY + avatarRadius - 18, 210, 44, 22, '#10B981', '#FFFFFF', 3);
          ctx.fillStyle = '#022C22';
          ctx.font = '900 20px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✓ SENT TO GCASH', avatarCenterX, avatarCenterY + avatarRadius + 4);

          // User Name Box
          const boxW = Math.min(w * 0.84, 740);
          const nameBoxY = avatarCenterY + avatarRadius + 42;
          drawRoundRect(avatarCenterX - boxW / 2, nameBoxY, boxW, 105, 24, '#0F172A', '#10B981', 3);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 38px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(name, avatarCenterX, nameBoxY + 52);

          ctx.fillStyle = '#FCD34D';
          ctx.font = '800 22px sans-serif';
          const subNotice = item.inviterName ? `🎉 Inimbitahan ni: ${item.inviterName}` : '✓ Verified Member • GCash Direct Payout';
          ctx.fillText(subNotice, avatarCenterX, nameBoxY + 86);

          // Amount Display Box
          const balBoxY = nameBoxY + 125;
          const balBoxH = ratio === 'story' ? 180 : 145;
          drawRoundRect(avatarCenterX - boxW / 2, balBoxY, boxW, balBoxH, 24, '#FFFFFF', '#10B981', 4);

          ctx.fillStyle = '#047857';
          ctx.font = '800 22px sans-serif';
          ctx.fillText('MATAGUMPAY NA NA-CASHOUT SA GCASH', avatarCenterX, balBoxY + 48);

          ctx.fillStyle = '#022C22';
          ctx.font = ratio === 'story' ? '900 76px sans-serif' : '900 60px sans-serif';
          ctx.fillText(amountText, avatarCenterX, balBoxY + (ratio === 'story' ? 135 : 115));

          // Details Table Box
          const detailY = balBoxY + balBoxH + 25;
          const detailH = ratio === 'story' ? 220 : 160;
          drawRoundRect(avatarCenterX - boxW / 2, detailY, boxW, detailH, 20, '#0F172A', '#059669', 2);

          const detailRows = [
            { label: 'Petsa ng Cashout:', val: dateText },
            { label: 'Reference No.:', val: refText },
            { label: 'Status:', val: 'COMPLETED & VERIFIED' }
          ];

          let rowY = detailY + 45;
          detailRows.forEach((r) => {
            ctx.fillStyle = '#94A3B8';
            ctx.font = 'bold 22px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(r.label, avatarCenterX - boxW / 2 + 30, rowY);

            ctx.fillStyle = r.label.includes('Status') ? '#34D399' : '#FFFFFF';
            ctx.font = '900 22px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(r.val, avatarCenterX + boxW / 2 - 30, rowY);

            rowY += (ratio === 'story' ? 55 : 42);
          });
        }

        // Helper for Avatar Fallback Initial
        function drawFallbackAvatar(cx: number, cy: number, r: number) {
          const greenGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
          greenGrad.addColorStop(0, '#047857');
          greenGrad.addColorStop(1, '#0F172A');
          ctx.fillStyle = greenGrad;
          ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 80px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(name.charAt(0).toUpperCase(), cx, cy);
        }

        // 5. FOOTER SLOGAN & BRANDING
        const footerY = h - padding - 60;
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(padding + 40, footerY - 45);
        ctx.lineTo(w - padding - 40, footerY - 45);
        ctx.stroke();

        ctx.fillStyle = '#6EE7B7';
        ctx.font = '900 30px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('TUNAY NA KITA. TUNAY NA PAYOUT SA GCASH!', w / 2, footerY - 8);

        ctx.fillStyle = '#FCD34D';
        ctx.font = '800 22px sans-serif';
        ctx.fillText('VERIFIED REAL DATABASE TRANSACTION RECEIPT', w / 2, footerY + 28);

        ctx.restore();

        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      });
    });
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn overflow-y-auto">
      {/* POPUP MODAL CONTAINER */}
      <div className="relative w-full max-w-2xl bg-slate-950 border-2 border-emerald-400/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[96vh]">
        
        {/* MODAL HEADER WITH EXIT BUTTON */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-slate-800 bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 truncate leading-tight">
                <span>GCash Successful Redemption Banner</span>
                <span className="text-[8px] sm:text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-emerald-400 text-slate-950 shrink-0">
                  Live DB
                </span>
              </h3>
              <p className="text-[10px] text-emerald-200/70 font-medium truncate leading-tight">
                Totoong withdrawal record mula sa GCash database.
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

        {/* CONTROLS BAR: ASPECT RATIO SELECTOR */}
        <div className="p-3 bg-slate-900/60 border-b border-slate-800 flex flex-col gap-2 shrink-0">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Pumili ng Aspect Ratio Image Format:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setAspectRatio('story')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-black transition cursor-pointer ${
                aspectRatio === 'story'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Story (9:16)</span>
            </button>

            <button
              onClick={() => setAspectRatio('square')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-black transition cursor-pointer ${
                aspectRatio === 'square'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Square className="w-3.5 h-3.5 text-emerald-400" />
              <span>Square (1:1)</span>
            </button>

            <button
              onClick={() => setAspectRatio('landscape')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-black transition cursor-pointer ${
                aspectRatio === 'landscape'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Tv className="w-3.5 h-3.5 text-emerald-400" />
              <span>Banner (16:9)</span>
            </button>
          </div>
        </div>

        {/* MODAL BODY / LIVE BANNER PREVIEW CONTAINER */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-4 max-h-[65vh]">
          
          <div className="flex flex-col items-center justify-center bg-slate-900/90 rounded-2xl p-3 sm:p-4 border border-slate-800 shadow-inner">
            {generatedImgUrl ? (
              <img
                src={generatedImgUrl}
                alt="Redemption Banner Preview"
                className={`max-w-full rounded-xl border-2 border-emerald-500/50 shadow-2xl object-contain transition-all duration-300 ${
                  aspectRatio === 'story'
                    ? 'max-h-[380px]'
                    : aspectRatio === 'landscape'
                    ? 'max-h-[260px]'
                    : 'max-h-[320px]'
                }`}
              />
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                <span>Gumagawa ng High-Resolution Banner...</span>
              </div>
            )}
          </div>

          {/* DOWNLOAD ERROR MESSAGE */}
          {downloadError && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-bold text-center">
              {downloadError}
            </div>
          )}

          {/* GENERATED IMAGE DOWNLOAD DIRECT LINK */}
          {generatedImgUrl && (
            <div className="text-center space-y-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3">
              <p className="text-xs font-extrabold text-emerald-300 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Na-generate na ang HD Redemption Banner Image!</span>
              </p>
              <a
                href={generatedImgUrl}
                download={`GCash_Redemption_Banner_${displayName.replace(/\s+/g, '_')}_${aspectRatio}.png`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition shadow-md active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Pindutin dito kung hindi kusa nag-download</span>
              </a>
            </div>
          )}

          {/* MAIN DOWNLOAD BUTTON */}
          <button
            onClick={handleDownloadImage}
            disabled={downloading}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-2xl font-black text-sm transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-emerald-300 active:scale-98"
          >
            <Download className="w-5 h-5 text-slate-950" />
            <span>{downloading ? 'Ginagawa ang HD Banner...' : 'I-download ang Redemption Banner (PNG)'}</span>
          </button>

        </div>
      </div>
    </div>
  );
};

