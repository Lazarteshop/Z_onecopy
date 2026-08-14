import React, { useState } from 'react';
import { 
  Megaphone, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Heart
} from 'lucide-react';

interface WithdrawalPolicyBannerProps {
  onOpenModal?: () => void;
  defaultExpanded?: boolean;
}

export const WithdrawalPolicyBanner: React.FC<WithdrawalPolicyBannerProps> = ({
  onOpenModal,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  return (
    <div className="w-full bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-blue-400/30 overflow-hidden relative">
      
      {/* BACKGROUND DECORATIVE ACCENTS */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <span className="p-2.5 bg-blue-500/20 text-blue-300 rounded-2xl border border-blue-400/40 shrink-0 shadow-inner">
              <Megaphone className="w-5 h-5 animate-bounce" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  Update
                </span>
                <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider">
                  Z-oneApp Official Announcement
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-white leading-snug mt-0.5">
                📢 IMPORTANT ANNOUNCEMENT: Z-ONEAPP WITHDRAWAL POLICY UPDATE
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {onOpenModal && (
              <button
                onClick={onOpenModal}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <span>Buong Anunsyo</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer border border-slate-700 flex items-center gap-1"
              title={isExpanded ? "Itago ang detalye" : "Ipakita ang detalye"}
            >
              <span>{isExpanded ? "I-minimize" : "Schedule Details"}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* QUICK HIGHLIGHT BADGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500/30 border border-blue-400/40 flex items-center justify-center text-blue-300 font-black text-xs shrink-0">
              5th
            </div>
            <div className="text-xs">
              <span className="font-extrabold text-blue-200 block">Every 5th of the month</span>
              <span className="text-[11px] text-slate-300">Withdrawals from 21st to 4th</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 font-black text-xs shrink-0">
              20th
            </div>
            <div className="text-xs">
              <span className="font-extrabold text-indigo-200 block">Every 20th of the month</span>
              <span className="text-[11px] text-slate-300">Withdrawals from 6th to 19th</span>
            </div>
          </div>
        </div>

        {/* EXPANDED COMPLETE POLICY CONTENT */}
        {isExpanded && (
          <div className="space-y-4 pt-3 border-t border-white/10 text-xs sm:text-sm animate-fadeIn">
            
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2 text-slate-200">
              <p className="font-bold text-white">Dear Z-oneApp Assistants and Partners,</p>
              <p className="text-slate-300 text-xs leading-relaxed">
                Due to the high volume of withdrawal requests we receive everyday, the Administration has decided to implement an updated withdrawal schedule to ensure faster, more organized, and secure processing.
              </p>
            </div>

            {/* SCHEDULE CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-blue-950/80 border border-blue-500/40 rounded-2xl p-3.5">
                <span className="text-[10px] uppercase font-black tracking-wider bg-blue-500 text-white px-2 py-0.5 rounded-md inline-block mb-1">
                  Schedule 1
                </span>
                <p className="text-sm font-black text-white">1. Every 5th of the month</p>
                <p className="text-xs text-blue-200 mt-1">Covers all withdrawal requests made from <strong>21st to 4th</strong> of the month</p>
              </div>

              <div className="bg-indigo-950/80 border border-indigo-500/40 rounded-2xl p-3.5">
                <span className="text-[10px] uppercase font-black tracking-wider bg-indigo-500 text-white px-2 py-0.5 rounded-md inline-block mb-1">
                  Schedule 2
                </span>
                <p className="text-sm font-black text-white">2. Every 20th of the month</p>
                <p className="text-xs text-indigo-200 mt-1">Covers all withdrawal requests made from <strong>6th to 19th</strong> of the month</p>
              </div>
            </div>

            {/* EXAMPLES */}
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-3.5 text-xs space-y-2 text-amber-100">
              <p className="font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> EXAMPLES:
              </p>
              <div className="space-y-1.5 pl-1">
                <p className="flex items-center gap-1.5 font-medium">
                  <span className="text-amber-400">•</span> If you request a withdrawal on <strong>August 10</strong> <ArrowRight className="w-3 h-3 text-amber-400 inline" /> It will be released on <strong className="text-emerald-300">August 20</strong>
                </p>
                <p className="flex items-center gap-1.5 font-medium">
                  <span className="text-amber-400">•</span> If you request a withdrawal on <strong>August 25</strong> <ArrowRight className="w-3 h-3 text-amber-400 inline" /> It will be released on <strong className="text-emerald-300">September 5</strong>
                </p>
              </div>
            </div>

            {/* NOTES */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 text-xs space-y-2 text-slate-300">
              <p className="font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> NOTES:
              </p>
              <ul className="space-y-1.5 pl-1">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>1.</strong> Requests submitted on the 5th and 20th will be processed on the same day.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>2.</strong> This policy will take effect starting this month.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>3.</strong> Please make sure your GCash/Bank details are updated to avoid delays.</span>
                </li>
              </ul>
            </div>

            <div className="text-xs text-slate-400 space-y-1 pt-1">
              <p>We appreciate your understanding and cooperation. This change will help us serve you better and ensure that all withdrawals are processed accurately and on time.</p>
              <p className="text-blue-300 font-semibold">For questions, please contact our support team via the Z-oneApp Dashboard.</p>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
              <div>
                <p className="font-extrabold text-white">Z-oneApp Administration</p>
                <p className="text-[11px] text-sky-300 flex items-center gap-1">
                  <span>Earning Together, Growing Together</span>
                  <Heart className="w-3 h-3 text-sky-400 fill-sky-400" />
                </p>
              </div>
              {onOpenModal && (
                <button
                  onClick={onOpenModal}
                  className="text-xs text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
                >
                  Buksan bilang Pop-up
                </button>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
