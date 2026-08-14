import React from 'react';
import { 
  Megaphone, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  Heart, 
  X, 
  ArrowRight, 
  Clock, 
  ShieldCheck, 
  Sparkles 
} from 'lucide-react';

interface WithdrawalPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WithdrawalPolicyModal: React.FC<WithdrawalPolicyModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99990] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-blue-200 overflow-hidden my-auto animate-scaleUp"
        role="dialog"
        aria-modal="true"
      >
        {/* TOP ACCENT GRADIENT */}
        <div className="h-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 w-full" />

        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer z-10"
          title="Isara"
        >
          <X className="w-4 h-4" />
        </button>

        {/* MODAL CONTENT CONTAINER */}
        <div className="p-5 sm:p-7 md:p-8 space-y-6 max-h-[85vh] overflow-y-auto">
          
          {/* HEADER BADGE & TITLE */}
          <div className="space-y-3 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black uppercase tracking-wider">
              <Megaphone className="w-4 h-4 text-blue-600 animate-bounce" />
              <span>Opisyal na Anunsyo (Official Update)</span>
            </div>

            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 leading-tight">
              📢 IMPORTANT ANNOUNCEMENT: Z-ONEAPP WITHDRAWAL POLICY UPDATE
            </h2>
          </div>

          {/* SALUTATION & OPENING */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-2 text-slate-700 text-xs sm:text-sm leading-relaxed">
            <p className="font-extrabold text-slate-900">
              Dear Z-oneApp Assistants and Partners,
            </p>
            <p className="text-slate-600 font-medium">
              Due to the high volume of withdrawal requests we receive everyday, the Administration has decided to implement an updated withdrawal schedule to ensure faster, more organized, and secure processing.
            </p>
          </div>

          {/* NEW WITHDRAWAL RELEASE DATES */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-blue-900 uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>NEW WITHDRAWAL RELEASE DATES:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* DATE 1: EVERY 5TH */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 border-2 border-blue-300 rounded-2xl p-4.5 relative overflow-hidden shadow-xs hover:border-blue-500 transition">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-xs">
                    BATCH 1
                  </span>
                  <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5" /> Monthly
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  1. Every 5th of the month
                </h3>
                <p className="text-xs text-slate-600 font-bold mt-1.5 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-blue-100">
                  Covers all withdrawal requests made from <span className="text-blue-700 font-black">21st to 4th</span> of the month
                </p>
              </div>

              {/* DATE 2: EVERY 20TH */}
              <div className="bg-gradient-to-br from-indigo-50 to-sky-50/60 border-2 border-indigo-300 rounded-2xl p-4.5 relative overflow-hidden shadow-xs hover:border-indigo-500 transition">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs">
                    BATCH 2
                  </span>
                  <span className="text-[11px] font-bold text-indigo-600 flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5" /> Monthly
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  2. Every 20th of the month
                </h3>
                <p className="text-xs text-slate-600 font-bold mt-1.5 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-indigo-100">
                  Covers all withdrawal requests made from <span className="text-indigo-700 font-black">6th to 19th</span> of the month
                </p>
              </div>

            </div>
          </div>

          {/* EXAMPLES SECTION */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 sm:p-5 space-y-3">
            <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>EXAMPLES:</span>
            </h4>
            <div className="space-y-2 text-xs sm:text-sm font-bold text-slate-800">
              <div className="flex items-start gap-2 bg-white/90 p-3 rounded-xl border border-amber-100">
                <span className="text-amber-500 font-black">•</span>
                <span>
                  If you request a withdrawal on <span className="text-amber-900 font-black">August 10</span>{' '}
                  <ArrowRight className="inline w-3.5 h-3.5 text-blue-600 mx-1" />{' '}
                  It will be released on <span className="text-emerald-700 font-black">August 20</span>
                </span>
              </div>
              <div className="flex items-start gap-2 bg-white/90 p-3 rounded-xl border border-amber-100">
                <span className="text-amber-500 font-black">•</span>
                <span>
                  If you request a withdrawal on <span className="text-amber-900 font-black">August 25</span>{' '}
                  <ArrowRight className="inline w-3.5 h-3.5 text-blue-600 mx-1" />{' '}
                  It will be released on <span className="text-emerald-700 font-black">September 5</span>
                </span>
              </div>
            </div>
          </div>

          {/* NOTES SECTION */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-2.5">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>NOTES:</span>
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-700 font-medium">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong className="text-slate-900">1.</strong> Requests submitted on the 5th and 20th will be processed on the same day.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong className="text-slate-900">2.</strong> This policy will take effect starting this month.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong className="text-slate-900">3.</strong> Please make sure your GCash/Bank details are updated to avoid delays.</span>
              </li>
            </ul>
          </div>

          {/* CLOSING REMARKS & SUPPORT */}
          <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-200 pt-4">
            <p>
              We appreciate your understanding and cooperation. This change will help us serve you better and ensure that all withdrawals are processed accurately and on time.
            </p>
            <p className="flex items-center gap-1.5 text-blue-700 font-bold bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
              <span>For questions, please contact our support team via the Z-oneApp Dashboard.</span>
            </p>
          </div>

          {/* SIGNATURE */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div>
              <p className="text-xs text-blue-200 font-semibold">Thank you,</p>
              <p className="text-sm font-black text-white">Z-oneApp Administration</p>
              <p className="text-xs text-sky-300 font-bold flex items-center gap-1 mt-0.5">
                <span>Earning Together, Growing Together</span>
                <Heart className="w-3.5 h-3.5 text-sky-400 fill-sky-400" />
              </p>
            </div>
            <button
              onClick={onClose}
              className="bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-white text-xs font-black px-6 py-2.5 rounded-xl transition shadow-sm text-center cursor-pointer uppercase tracking-wider"
            >
              Naiintindihan Ko (Acknowledge)
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
