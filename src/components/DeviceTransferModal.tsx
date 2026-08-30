import React, { useState } from 'react';
import { Smartphone, ShieldAlert, Key, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getDeviceAuthHeaders } from '../utils/deviceSecurity';
import { UserSession } from '../types';

interface DeviceTransferModalProps {
  isOpen: boolean;
  userEmail?: string;
  userId?: string;
  token?: string;
  onTransferSuccess?: (updatedUser: UserSession) => void;
  onSuccess?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  triggerNotification?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const DeviceTransferModal: React.FC<DeviceTransferModalProps> = ({
  isOpen,
  userEmail,
  userId,
  onTransferSuccess,
  onSuccess,
  onCancel,
  onClose,
}) => {
  const [otpCode, setOtpCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [resending, setResending] = useState<boolean>(false);
  const [resendSuccess, setResendSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setError('Pakilagay ang 6-digit verification code.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const deviceHeaders = await getDeviceAuthHeaders();

      const res = await fetch('/api/device/transfer-confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...deviceHeaders,
        },
        body: JSON.stringify({
          userId,
          otpCode: otpCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Maling verification code.');
      }

      if (data.user) {
        onTransferSuccess(data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Nabigo ang device transfer.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setResending(true);
      setError('');
      const deviceHeaders = await getDeviceAuthHeaders();

      const res = await fetch('/api/device/transfer-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...deviceHeaders,
        },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Hindi maipadala ang OTP.');
      }

      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-6 animate-in fade-in zoom-in-95">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">Bagong Device Na-detect</h3>
            <p className="text-xs text-slate-400">1 Account Per Registered Device Security</p>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2">
          <p className="leading-relaxed">
            Nagla-log in ka mula sa isang bagong browser o device. Para mapanatiling ligtas ang iyong account at mailipat ang device registration, nagpadala kami ng <strong>6-digit One-Time Code (OTP)</strong> sa:
          </p>
          <p className="font-bold text-amber-400">{userEmail}</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {resendSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Naipadala na muli ang verification code!</span>
          </div>
        )}

        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">6-Digit Security Code</label>
            <input
              type="text"
              maxLength={6}
              placeholder="123456"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center tracking-[0.4em] font-mono text-xl px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400 transition"
              required
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resending}
              className="text-amber-400 hover:underline font-semibold disabled:opacity-50"
            >
              {resending ? 'Ipinapadala...' : 'I-resend ang Code'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Kanselahin
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Bine-verify...</span>
                </>
              ) : (
                <>
                  <span>Kumpirmahin ang Device Transfer</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
