import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wallet, 
  AlertCircle, 
  QrCode, 
  Upload, 
  CheckCircle2, 
  RefreshCw, 
  ArrowRight, 
  ExternalLink,
  ShieldCheck,
  Clock,
  Copy
} from 'lucide-react';
import { UserSession } from '../types';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  user: UserSession | null;
  requiredBudget?: number;
  currentAvailableBalance?: number;
  targetPurpose?: 'challenge_budget' | 'mission_budget' | 'wallet';
  targetEntityId?: string;
  onSuccess?: (depositReq?: any) => void;
  triggerNotification?: (msg: string, type: 'success' | 'error' | 'info') => void;
  isTl?: boolean;
  language?: 'tl' | 'en';
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  token,
  user,
  requiredBudget = 0,
  currentAvailableBalance,
  targetPurpose = 'wallet',
  targetEntityId,
  onSuccess,
  triggerNotification,
  isTl: isTlProp,
  language = 'tl'
}) => {
  const isTl = isTlProp !== undefined ? isTlProp : language === 'tl';
  const effectiveAvailable = currentAvailableBalance !== undefined 
    ? currentAvailableBalance 
    : (user?.availableBalance !== undefined ? user.availableBalance : (user?.stats?.balance || 0));

  const shortfall = Math.max(0, Number((requiredBudget - effectiveAvailable).toFixed(2)));

  const [amount, setAmount] = useState<string>(shortfall > 0 ? String(Math.ceil(shortfall)) : '500');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [proofImage, setProofImage] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (shortfall > 0) {
        setAmount(String(Math.ceil(shortfall)));
      }
      setReferenceNo('');
      setProofImage('');
      setSubmittedSuccess(false);
    }
  }, [isOpen, shortfall]);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      triggerNotification?.(isTl ? 'Larawan lamang (JPG, PNG) ang maaaring i-upload.' : 'Please upload an image file.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      triggerNotification?.(isTl ? 'Masyadong malaki ang file (maximum 10MB).' : 'File size exceeds 10MB limit.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setProofImage(e.target?.result as string || '');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 10) {
      triggerNotification?.(isTl ? 'Ang minimum deposit ay ₱10.00.' : 'Minimum deposit amount is ₱10.00.', 'error');
      return;
    }

    if (!referenceNo.trim() || referenceNo.trim().length < 4) {
      triggerNotification?.(isTl ? 'Ilagay ang wastong GCash Reference Number mula sa iyong resibo.' : 'Please provide a valid GCash reference number.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/user/deposit-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: numAmount,
          referenceNo: referenceNo.trim(),
          proofImageUrl: proofImage || undefined,
          targetPurpose,
          targetEntityId
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmittedSuccess(true);
        triggerNotification?.(
          isTl ? '✅ Naipadala ang deposit request! Hinihintay ang pagsusuri ng Admin.' : 'Deposit request submitted for verification.',
          'success'
        );
        onSuccess?.(data.depositRequest);
      } else {
        triggerNotification?.(data.error || 'Failed to submit deposit request', 'error');
      }
    } catch (err) {
      triggerNotification?.(isTl ? 'May problema sa koneksyon. Pakisubukan muli.' : 'Network connection error. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-5 sm:p-6 space-y-5 shadow-2xl animate-scaleUp my-auto">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">
                {isTl ? 'Mag-deposit ng Pondo sa Wallet' : 'Deposit Funds to Wallet'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {targetPurpose === 'challenge_budget'
                  ? (isTl ? 'Pondohan ang Creator Challenge Prize Pool' : 'Fund Creator Challenge Prize Pool')
                  : targetPurpose === 'mission_budget'
                  ? (isTl ? 'Pondohan ang Sponsored Mission Budget' : 'Fund Sponsored Mission Budget')
                  : (isTl ? 'Magdagdag ng balanse via GCash QR' : 'Add balance via GCash QR')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-slate-900 text-lg">
                {isTl ? 'Naisumite ang Deposit Request!' : 'Deposit Request Submitted!'}
              </h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                {isTl 
                  ? 'Ang iyong pondo ay papasok sa available wallet kapag na-verify at naaprubahan na ng Admin ang iyong GCash reference number at resibo.'
                  : 'Your funds will be credited to your available wallet once verified and approved by the Admin.'}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2 max-w-sm mx-auto text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">{isTl ? 'Halaga:' : 'Amount:'}</span>
                <span className="font-black text-emerald-600 font-mono">₱{Number(amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isTl ? 'Reference No:' : 'Ref No:'}</span>
                <span className="font-black text-slate-800 font-mono">{referenceNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isTl ? 'Status:' : 'Status:'}</span>
                <span className="font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-[10px] uppercase">
                  Pending Admin Verification
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-xs cursor-pointer"
            >
              {isTl ? 'Sige, Naintindihan Ko' : 'Got it, Close'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Shortfall / Balance Breakdown Banner (if budget is required) */}
            {requiredBudget > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-900 font-black">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{isTl ? 'Kailangan ng Karagdagang Pondo' : 'Additional Funds Required'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="bg-white/80 p-2 rounded-xl border border-amber-100">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">{isTl ? 'Available' : 'Available'}</span>
                    <span className="font-black text-slate-800 font-mono text-xs">₱{effectiveAvailable.toFixed(2)}</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-amber-100">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">{isTl ? 'Required Budget' : 'Required'}</span>
                    <span className="font-black text-slate-900 font-mono text-xs">₱{requiredBudget.toFixed(2)}</span>
                  </div>
                  <div className="bg-amber-100/90 p-2 rounded-xl border border-amber-300">
                    <span className="text-[10px] text-amber-800 font-bold uppercase block">{isTl ? 'Kulang (Shortfall)' : 'Shortfall'}</span>
                    <span className="font-black text-amber-700 font-mono text-xs">₱{shortfall.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* GCash QR Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black text-slate-900">
                    {isTl ? 'I-scan ang GCash QR Code' : 'Scan Official GCash QR'}
                  </span>
                </div>
                <a
                  href="/admin_gcash_qr.png"
                  download="Z-OneApp_GCash_QR.png"
                  className="text-[11px] font-black text-emerald-600 hover:underline flex items-center gap-1"
                >
                  <span>{isTl ? 'I-download ang QR' : 'Download QR'}</span>
                </a>
              </div>

              <div className="flex items-center justify-center p-2 bg-white rounded-xl border border-slate-200">
                <img
                  src="/admin_gcash_qr.png"
                  alt="Admin GCash QR"
                  className="w-44 h-44 object-contain rounded-lg shadow-xs"
                />
              </div>

              <div className="text-[11px] text-slate-600 leading-relaxed space-y-1">
                <p>1. Buksan ang iyong GCash app at i-scan ang QR code sa itaas.</p>
                <p>2. I-send ang eksaktong halaga at i-save ang screenshot ng transaction receipt.</p>
                <p>3. Kopyahin ang <b>GCash Reference Number</b> at i-paste sa ibaba.</p>
              </div>
            </div>

            {/* Input: Amount */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-slate-700">
                  {isTl ? 'Halaga ng Idiniposito (₱ Amount)' : 'Deposit Amount (₱)'}
                </label>
                {shortfall > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(Math.ceil(shortfall)))}
                    className="text-[10px] font-black text-emerald-600 hover:underline cursor-pointer"
                  >
                    {isTl ? `Itugma sa kulang (₱${Math.ceil(shortfall)})` : `Match shortfall (₱${Math.ceil(shortfall)})`}
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">₱</span>
                <input
                  type="number"
                  min="10"
                  step="any"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Halimbawa: 500"
                  required
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-black text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Input: GCash Reference Number */}
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-700">
                {isTl ? 'GCash Reference Number' : 'GCash Reference Number'}
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={e => setReferenceNo(e.target.value)}
                placeholder="Hal. 1001 2345 6789 o 200389172635"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-black text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Input: Proof of Payment (Image Upload) */}
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-700">
                {isTl ? 'Screenshot / Resibo ng GCash (Proof of Payment)' : 'Payment Receipt Screenshot'}
              </label>
              {proofImage ? (
                <div className="relative border border-slate-200 rounded-xl p-2 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <img
                      src={proofImage}
                      alt="Proof Receipt"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                    />
                    <span className="text-xs text-slate-600 font-bold truncate">Resibo na-upload</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProofImage('')}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg text-xs font-black cursor-pointer"
                  >
                    Palitan
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
                    isDragging ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-600">
                    {isTl ? 'I-drag & drop ang screenshot o mag-click para pumili' : 'Drag & drop screenshot or click to upload'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">JPG o PNG hanggang 10MB</p>
                  <label className="mt-2 inline-block px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-black cursor-pointer shadow-2xs">
                    <span>{isTl ? 'Pumili ng Larawan' : 'Choose File'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Informational Security Notice */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-[11px] text-emerald-900 leading-relaxed flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                {isTl 
                  ? 'Ang iyong pondo ay papasok sa available wallet kapag na-verify at naaprubahan na ng Admin ang iyong GCash reference number at resibo.' 
                  : 'Your funds will be credited to your available wallet once verified and approved by the Admin.'}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-black text-xs hover:bg-slate-50 cursor-pointer"
              >
                {isTl ? 'Kanselahin' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isTl ? 'Isinusumite...' : 'Submitting...'}</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    <span>{isTl ? 'Isumite ang Deposit' : 'Submit Deposit'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
