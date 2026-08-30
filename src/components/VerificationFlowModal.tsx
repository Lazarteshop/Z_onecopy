import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Lock, AlertCircle, Camera, CheckCircle2, Smartphone, Key, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { UserSession, AccountSafetyStatus } from '../types';
import { getDeviceAuthHeaders } from '../utils/deviceSecurity';

interface VerificationFlowModalProps {
  currentUser?: UserSession;
  user?: UserSession;
  isOpen: boolean;
  onVerificationComplete?: (updatedUser: UserSession) => void;
  onVerified?: (updatedSafetyStatus: any, isMinor: any) => void;
  onLogout?: () => void;
  onClose?: () => void;
  token?: string;
  currentSafetyStatus?: AccountSafetyStatus | string;
  triggerNotification?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const VerificationFlowModal: React.FC<VerificationFlowModalProps> = ({
  currentUser,
  user,
  isOpen,
  onVerificationComplete,
  onVerified,
  onLogout,
  onClose,
  token,
  currentSafetyStatus,
  triggerNotification
}) => {
  const activeUser = currentUser || user || ({} as UserSession);
  const [step, setStep] = useState<'dob_input' | 'liveness_check' | 'processing' | 'result'>('dob_input');
  const [dob, setDob] = useState<string>(activeUser.dateOfBirth || '');
  const [isLivenessSimulating, setIsLivenessSimulating] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string>('');
  const [resultStatus, setResultStatus] = useState<AccountSafetyStatus>((activeUser.accountSafetyStatus || currentSafetyStatus || 'pending_verification') as AccountSafetyStatus);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const calculateAge = (birthDateString: string): number => {
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleDobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dob) {
      setVerificationError('Paki-lagay ang iyong tamang Date of Birth.');
      return;
    }
    const age = calculateAge(dob);
    if (age < 5 || age > 110) {
      setVerificationError('Pakilagay ang wastong petsa ng kapanganakan.');
      return;
    }
    setVerificationError('');
    setStep('liveness_check');
  };

  const handleExecuteVerification = async () => {
    try {
      setLoading(true);
      setIsLivenessSimulating(true);
      setVerificationError('');

      // Get device headers
      const deviceHeaders = await getDeviceAuthHeaders();

      // Submit to server-side privacy-preserving verification endpoint
      const response = await fetch('/api/verification/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...deviceHeaders,
        },
        body: JSON.stringify({
          userId: currentUser.id,
          dateOfBirth: dob,
          method: 'face_liveness_id',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Nabigo ang verification request.');
      }

      setResultStatus(data.status);
      setStep('result');

      if (data.user) {
        onVerificationComplete(data.user);
      }
    } catch (err: any) {
      setVerificationError(err.message || 'Nagka-problema sa verification. Subukang muli.');
      setStep('liveness_check');
    } finally {
      setLoading(false);
      setIsLivenessSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-white tracking-tight">
                  Community Safety & Age Verification
                </h2>
                <p className="text-xs text-slate-400">Proteksyon ng komunidad at pagsusuri ng edad</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {verificationError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{verificationError}</span>
            </div>
          )}

          {step === 'dob_input' && (
            <form onSubmit={handleDobSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Petsa ng Kapanganakan (Date of Birth)
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                  required
                />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  🔒 <strong className="text-slate-300">Zero-Raw Data Privacy:</strong> Ang petsa at age bracket lamang ang gagamitin upang matukoy ang naaangkop na komunidad (Adult Z-oneApp o Z-oneKiddie).
                </p>
              </div>

              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 space-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-2 text-slate-300 font-semibold">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>1 Account Per Registered Device Rule</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Ang iyong kasalukuyang device ay awtomatikong itatali (bind) sa iyong account upang mapigilan ang duplicate o spam accounts.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Mag-logout
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition"
                >
                  <span>Magpatuloy sa Liveness Check</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {step === 'liveness_check' && (
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto">
                  <Camera className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-white">Privacy-Preserving Liveness & Age Check</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Isang mabilis na liveness verification ang isasagawa. Walang raw photos o facial templates na ise-save sa server.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Idineklarang Edad:</span>
                  <span className="font-bold text-white">{calculateAge(dob)} anyos</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Naaangkop na Komunidad:</span>
                  <span className={`font-bold ${calculateAge(dob) >= 18 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {calculateAge(dob) >= 18 ? 'Z-oneApp Adult Community (18+)' : 'Z-oneKiddie Portal (<18)'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Device Binding:</span>
                  <span className="font-bold text-blue-400">Cryptographic Binding Ready</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep('dob_input')}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Bumalik
                </button>
                <button
                  type="button"
                  onClick={handleExecuteVerification}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Kasalukuyang Bine-verify...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simulan ang Verification</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="text-center space-y-4 py-2">
              {resultStatus === 'verified_adult' ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-extrabold text-white">Matagumpay na Na-verify ang Account! 🎉</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Ang iyong account ay ganap nang verified bilang Adult member (18+). Mayroon ka nang buong access sa Feed, DMs, Reels, Stories, at Komunidad.
                  </p>
                </>
              ) : resultStatus === 'minor_restricted' ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-extrabold text-amber-300">Welcome sa Z-oneKiddie Portal! 🎈</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Protektado ang iyong account. May access ka sa child-safe movies, cartoons, at educational content. Naka-block ang adult public posts at DMs para sa iyong kaligtasan.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-extrabold text-white">Verification Under Review</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Kasalukuyang sinusuri ang iyong verification. Makakatanggap ka ng abiso kapag tapos na ang pagsusuri.
                  </p>
                </>
              )}

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => {
                    // Close modal and let state update
                    window.location.reload();
                  }}
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition"
                >
                  Magpatuloy sa App
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
