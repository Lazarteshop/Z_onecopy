import React, { useState } from 'react';
import { 
  motion, 
  AnimatePresence 
} from 'motion/react';
import { 
  Wallet, 
  Send, 
  CircleAlert, 
  CheckCircle, 
  Clock, 
  Check, 
  AlertTriangle,
  History,
  FileSpreadsheet,
  Coins,
  DollarSign
} from 'lucide-react';
import { WithdrawalRequest, UserStats } from '../types';

interface GCashCashoutProps {
  stats: UserStats;
  withdrawals: WithdrawalRequest[];
  onWithdrawSubmit: (accountName: string, gcashNumber: string, amount: number) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  language?: 'en' | 'tl';
}

export default function GCashCashout({ stats, withdrawals, onWithdrawSubmit, language = 'en' }: GCashCashoutProps) {
  const isTl = language === 'tl';
  const [accountName, setAccountName] = useState('');
  const [gcashNumber, setGcashNumber] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simple format validation helpers
  const validateGcashNumber = (num: string) => {
    // Standard PH number 09XXXXXXXXX (11 digits starting with 09)
    const cleaned = num.replace(/\D/g, '');
    return cleaned.length === 11 && cleaned.startsWith('09');
  };

  const handleWithdrawClick = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Form validation
    if (!accountName.trim()) {
      setErrorMsg(isTl ? '⚠️ Nakalimutang ilagay ang GCash Account Name.' : '⚠️ Please enter GCash Account Name.');
      return;
    }

    if (!gcashNumber.trim()) {
      setErrorMsg(isTl ? '⚠️ Nakalimutang ilagay ang GCash Mobile Number.' : '⚠️ Please enter GCash Mobile Number.');
      return;
    }

    if (!validateGcashNumber(gcashNumber)) {
      setErrorMsg(isTl ? '⚠️ Maling format ng Mobile Number. Dapat ay 11-digit na nagsisimula sa "09" (Hal. 09171234567).' : '⚠️ Invalid Mobile Number. It must be an 11-digit number starting with "09" (e.g. 09171234567).');
      return;
    }

    const value = parseFloat(amountStr);
    if (isNaN(value) || value <= 0) {
      setErrorMsg(isTl ? '⚠️ Maglagay ng tamang sapat na halaga ng pera.' : '⚠️ Please enter a valid withdrawal amount.');
      return;
    }

    if (value < 100) {
      setErrorMsg(isTl ? '⚠️ May limitasyon: Ang minimum na withdrawal ay nagkakahalaga ng ₱100.00.' : '⚠️ Limit: Minimum withdrawal amount is ₱100.00.');
      return;
    }

    if (value > stats.balance) {
      setErrorMsg(isTl ? `⚠️ Hindi sapat ang pondo. Ang kasalukuyang balance mo ay ₱${stats.balance.toFixed(2)}.` : `⚠️ Insufficient funds. Your current balance is ₱${stats.balance.toFixed(2)}.`);
      return;
    }

    // Pass verification and trigger withdrawal flow
    setIsSubmitting(true);
    
    // Simulate real database and secure API payout transfer delay
    setTimeout(async () => {
      try {
        const res = await onWithdrawSubmit(accountName.trim(), gcashNumber.trim(), value);
        setIsSubmitting(false);
        
        if (res.success) {
          setSuccessMsg(res.message);
          // Reset inputs
          setAccountName('');
          setGcashNumber('');
          setAmountStr('');
        } else {
          setErrorMsg(res.message);
        }
      } catch (err) {
        setIsSubmitting(false);
        setErrorMsg(isTl ? '⚠️ May error sa pagkonekta sa network.' : '⚠️ Connection error occurred.');
      }
    }, 1200);
  };

  // Safe preset amount values
  const applyPresetAmount = (preset: number) => {
    if (preset <= stats.balance) {
      setAmountStr(preset.toString());
      setErrorMsg(null);
    } else {
      setErrorMsg(isTl ? `⚠️ Hindi sapat ang pondo para sa preset na ₱${preset}.00` : `⚠️ Insufficient balance for preset ₱${preset}.00`);
    }
  };

  return (
    <div id="gcash-cashout-container" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* LEFT FORM COLUMN */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
        
        {/* Subtle GCash Blue branding header overlay */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-blue-600"></div>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg">{isTl ? "GCash Cash-Out Request" : "GCash Cash-Out Request"}</h3>
            <p className="text-xs text-slate-500">{isTl ? "I-withdraw ang iyong napanalunang totoong premyo rekta sa iyong GCash wallet." : "Withdraw your earned simulated rewards directly to your GCash wallet."}</p>
          </div>
        </div>

        {/* Available Wallet Status widget inside form */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4.5 mb-6 flex justify-between items-center sm:grid sm:grid-cols-2 sm:gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{isTl ? "Kasunod na Maibubulsa" : "Withdrawable Balance"}</p>
            <p className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              ₱{stats.balance.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 sm:text-right">{isTl ? "Minimum na Widthrawal" : "Minimum Withdrawal"}</p>
            <p className="text-sm font-extrabold text-blue-600 mt-0.5 sm:text-right">
              ₱100.00 PHP
            </p>
          </div>
        </div>

        {/* Withdrawal Form */}
        <form onSubmit={handleWithdrawClick} className="space-y-4">
          
          {/* Account Name input */}
          <div className="space-y-1.5">
            <label htmlFor="withdraw-name" className="text-xs font-bold text-slate-700 block">
              {isTl ? "GCash Full Name (Pangalan sa GCash)" : "GCash Registered Full Name"} <span className="text-red-500">*</span>
            </label>
            <input
              id="withdraw-name"
              type="text"
              required
              placeholder={isTl ? "Hal. JUAN DELA CRUZ" : "e.g. JOHN DOE"}
              value={accountName}
              onChange={(e) => setAccountName(e.target.value.toUpperCase())}
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-sm transition outline-none font-semibold uppercase placeholder:normal-case placeholder:font-normal"
            />
            <p className="text-[10px] text-slate-400">{isTl ? "Siguraduhing tugma sa GCash registered name upang maiwasan ang delay sa pagpapadala." : "Please ensure this matches your registered GCash name to prevent delay."}</p>
          </div>

          {/* GCash number input */}
          <div className="space-y-1.5">
            <label htmlFor="withdraw-phone" className="text-xs font-bold text-slate-700 block">
              {isTl ? "GCash Mobile Number (Numero sa GCash)" : "GCash Mobile Number"} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 font-mono">
                🇵🇭
              </span>
              <input
                id="withdraw-phone"
                type="tel"
                required
                maxLength={11}
                placeholder="Hal. 09171234567"
                value={gcashNumber}
                onChange={(e) => setGcashNumber(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl pl-11 pr-4 py-3 text-sm transition outline-none font-mono font-bold tracking-wider"
              />
            </div>
            <p className="text-[10px] text-slate-400">{isTl ? "Magsimula sa \"09\" at pormat na may eksaktong 11-digits." : "Start with \"09\" and enter exactly 11 digits."}</p>
          </div>

          {/* Amount selection group */}
          <div className="space-y-2">
            <label htmlFor="withdraw-amount" className="text-xs font-bold text-slate-700 block">
              {isTl ? "Halaga na Iwi-withdraw (PHP)" : "Withdrawal Amount (PHP)"} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-slate-500">
                ₱
              </span>
              <input
                id="withdraw-amount"
                type="number"
                required
                min="100"
                step="1"
                placeholder={isTl ? "Minimum 100" : "Minimum 100"}
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl pl-8 pr-12 py-3 text-sm font-black text-slate-900 outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                PHP
              </span>
            </div>

            {/* Quick Presets Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[100, 150, 200, 500].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  id={`preset-${preset}`}
                  onClick={() => applyPresetAmount(preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    stats.balance >= preset
                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                      : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                  }`}
                  disabled={stats.balance < preset}
                >
                  ₱{preset}
                </button>
              ))}
              <button
                type="button"
                id="preset-all"
                onClick={() => {
                  if (stats.balance >= 100) {
                    setAmountStr(Math.floor(stats.balance).toString());
                  } else {
                    setErrorMsg(isTl ? '⚠️ Hindi sapat ang pondo upang i-withdraw lahat. Minimum ay ₱100.00.' : '⚠️ Insufficient balance to withdraw all. Minimum is ₱100.00.');
                  }
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition cursor-pointer"
              >
                {isTl ? `I-Max Lahat (₱${Math.floor(stats.balance)})` : `Max All (₱${Math.floor(stats.balance)})`}
              </button>
            </div>
          </div>

          {/* Form Actions feedback */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex gap-2.5 items-start text-xs text-red-800"
              >
                <CircleAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span className="font-semibold">{errorMsg}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex gap-2.5 items-start text-xs text-emerald-800"
              >
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <p className="font-bold">{isTl ? "Ipinaabot na sa GCash System!" : "Sent to GCash System!"}</p>
                  <p className="mt-0.5 leading-relaxed">{successMsg}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Trigger action button */}
          <button
            type="submit"
            id="withdraw-submit-btn"
            disabled={isSubmitting || stats.balance < 100}
            className={`w-full py-3.5 rounded-xl font-bold text-sm text-white shadow-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              stats.balance >= 100
                ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                : 'bg-slate-300 cursor-not-allowed text-slate-500'
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{isTl ? "Pinapadala sa GCash Network..." : "Sending to GCash Network..."}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{isTl ? "Kumpirmahin at I-withdraw ang Pera" : "Confirm and Withdraw Rewards"}</span>
              </>
            )}
          </button>

          <p className="text-center text-[11px] text-slate-400">
            {isTl ? "Ang pag-withdraw ay instant simulated transfer. Karaniwang pumapasok sa loob ng 10-30 segundo sa listahan." : "Withdrawals are processed as simulated real-time transfers within 10-30 seconds."}
          </p>

        </form>

      </div>

      {/* RIGHT SIDE DETAILS AND SIMULATED TX LIST */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        
        {/* GCash Information Note */}
        <div className="bg-gradient-to-br from-blue-700 to-blue-800 rounded-2xl p-5 text-white shadow-sm font-sans">
          <div className="flex justify-between items-start mb-4">
            <span className="font-black tracking-widest text-lg font-mono">G) GCash</span>
            <span className="bg-white/20 text-[9px] font-bold uppercase rounded px-1.5 py-0.5">{isTl ? "Verified Partner" : "Verified Partner"}</span>
          </div>

          <h4 className="font-extrabold text-sm mb-1.5">{isTl ? "Paano maging mabilis ang Transaksyon?" : "How to expedite processing?"}</h4>
          <ul className="space-y-2.5 text-xs text-blue-100 leading-normal">
            <li className="flex gap-2">
              <span className="bg-white/20 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
              <span>{isTl ? "Gamitin ang iyong certified o verified GCash Account upang maiwasan ang anti-spam at bot checks ng aming automatic system." : "Use your registered, certified GCash details to automatically pass the simulated spam filters."}</span>
            </li>
            <li className="flex gap-2">
              <span className="bg-white/20 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
              <span>{isTl ? "Siguraduhing buhay ang inyong telecom signal (Globe/TM/Smart/TNT) sapagkat maaari kayong makatanggap ng simulated SMS confirmation alert." : "Keep your cellular notifications on to receive instant simulated network SMS alerts."}</span>
            </li>
            <li className="flex gap-2">
              <span className="bg-white/20 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
              <span>{isTl ? "Abangan ang reference number na makikita sa listahan para sa kumpirmasyon." : "Confirm matching reference numbers listed in the transaction ledger logs."}</span>
            </li>
          </ul>
        </div>

        {/* Withdrawal History Logs Feed */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex-1 flex flex-col min-h-[280px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              <h4 className="font-bold text-slate-900 text-sm">{isTl ? "Kasaysayan ng Withdrawal" : "Withdrawal History"}</h4>
            </div>
            <span className="text-[10px] text-slate-400 font-mono font-bold">
              Total ({withdrawals.length})
            </span>
          </div>

          {/* List area */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[250px]">
            {withdrawals.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10 text-slate-400">
                <FileSpreadsheet className="w-10 h-10 stroke-1 mb-2 text-slate-350" />
                <p className="text-xs font-semibold">{isTl ? "Wala pang naitatalang Withdrawal." : "No withdrawals logged yet."}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{isTl ? "Magsimula ng pagbisita sa homepage ng mga website upang makatipon ng pondo!" : "Start visiting website homepages to accumulate withdrawable balance!"}</p>
              </div>
            ) : (
              [...withdrawals].reverse().map((req) => (
                <div 
                  key={req.id}
                  id={`withdraw-item-${req.id}`}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 transition flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate uppercase">{req.accountName}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{req.gcashNumber}</p>
                    <p className="text-[9px] text-slate-400 font-mono mt-1">Ref: {req.referenceNo}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-slate-900">-₱{req.amount.toFixed(2)}</p>
                    <div className="mt-1 flex items-center justify-end">
                      {req.status === 'success' ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded px-1.5 py-0.5 flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" />
                          <span>{isTl ? "Success" : "Success"}</span>
                        </span>
                      ) : req.status === 'processing' || req.status === 'pending' ? (
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-bold rounded px-1.5 py-0.5 flex items-center gap-1 animate-pulse">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{isTl ? "Pinoproseso" : "Processing"}</span>
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-800 text-[9px] font-bold rounded px-1.5 py-0.5 flex items-center gap-0.5">
                          <XIcon className="w-2.5 h-2.5" />
                          <span>{isTl ? "Bigo" : "Failed"}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

      </div>

    </div>
  );
}

// Handcrafted quick helper icon for failure to pass ESLint safely
function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
