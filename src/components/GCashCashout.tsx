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
  DollarSign,
  Download,
  Trophy,
  ArrowLeft,
  PlusCircle,
  ArrowUpRight,
  ArrowRight,
  Landmark,
  MoreHorizontal,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { WithdrawalRequest, UserStats } from '../types';
import { RedemptionBannerModal, RedemptionRecordItem } from './RedemptionBannerModal';
import { WithdrawalPolicyBanner } from './WithdrawalPolicyBanner';
import { WithdrawalPolicyModal } from './WithdrawalPolicyModal';

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
  const [activeBanner, setActiveBanner] = useState<RedemptionRecordItem | null>(null);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'gcash' | 'bank' | 'other'>('gcash');

  // Compute total successfully withdrawn from the existing withdrawals list
  const totalWithdrawn = withdrawals
    .filter(w => w.status === 'success')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalPending = withdrawals
    .filter(w => w.status === 'pending' || w.status === 'processing')
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Simple format validation helpers
  const validateGcashNumber = (num: string) => {
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
    
    setTimeout(async () => {
      try {
        const res = await onWithdrawSubmit(accountName.trim(), gcashNumber.trim(), value);
        setIsSubmitting(false);
        
        if (res.success) {
          setSuccessMsg(res.message);
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

  const applyPresetAmount = (preset: number) => {
    if (preset <= stats.balance) {
      setAmountStr(preset.toString());
      setErrorMsg(null);
    } else {
      setErrorMsg(isTl ? `⚠️ Hindi sapat ang pondo para sa preset na ₱${preset}.00` : `⚠️ Insufficient balance for preset ₱${preset}.00`);
    }
  };

  return (
    <div id="modern-wallet-cashout-view" className="max-w-2xl mx-auto space-y-5">
      
      {/* 📢 OFFICIAL WITHDRAWAL POLICY ANNOUNCEMENT BANNER */}
      <WithdrawalPolicyBanner onOpenModal={() => setShowPolicyModal(true)} />

      {/* 👑 ROYAL BLUE WALLET HEADER CARD (Matching Reference Image - Phone 2) */}
      <div className="bg-gradient-to-br from-[#0a356e] via-[#0d4a9b] to-[#1258b5] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
              {isTl ? 'Pondo sa Wallet' : 'My Wallet Balance'}
            </span>
            <span className="bg-white/20 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full border border-white/20">
              GCash Verified
            </span>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-black tracking-tight font-mono text-white">
              ₱ {stats.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* 🔘 4-ACTION QUICK BAR */}
          <div className="grid grid-cols-4 gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                const formEl = document.getElementById('cashout-form-section');
                if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-white/15 hover:bg-white/25 active:scale-95 transition rounded-2xl py-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-blue-200" />
              <span className="text-[10px] font-bold">{isTl ? 'Mag-ipon' : 'Add Funds'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const formEl = document.getElementById('cashout-form-section');
                if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-white/20 hover:bg-white/30 active:scale-95 transition rounded-2xl py-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer border border-white/30"
            >
              <Wallet className="w-4 h-4 text-yellow-300" />
              <span className="text-[10px] font-black">{isTl ? 'Withdraw' : 'Withdraw'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPolicyModal(true)}
              className="bg-white/15 hover:bg-white/25 active:scale-95 transition rounded-2xl py-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4 text-blue-200" />
              <span className="text-[10px] font-bold">{isTl ? 'Transfer' : 'Transfer'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const histEl = document.getElementById('cashout-history-section');
                if (histEl) histEl.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-white/15 hover:bg-white/25 active:scale-95 transition rounded-2xl py-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              <History className="w-4 h-4 text-blue-200" />
              <span className="text-[10px] font-bold">{isTl ? 'History' : 'History'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 📊 WALLET OVERVIEW STATS CARD */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
          {isTl ? 'Buod ng Wallet' : 'Wallet Overview'}
        </h3>

        <div className="space-y-2.5 divide-y divide-slate-100">
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Coins className="w-4 h-4 text-emerald-600" />
              <span>{isTl ? 'Kabuuang Kinita (Total Earnings)' : 'Total Earnings'}</span>
            </div>
            <span className="text-xs font-black text-emerald-600 font-mono">
              ₱ {(stats.lifetimeEarnings || (stats.balance + totalWithdrawn)).toFixed(2)}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Wallet className="w-4 h-4 text-blue-600" />
              <span>{isTl ? 'Kabuuang Na-withdraw (Total Withdrawn)' : 'Total Withdrawn'}</span>
            </div>
            <span className="text-xs font-black text-blue-600 font-mono">
              ₱ {totalWithdrawn.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{isTl ? 'Nakabinbing Halaga (Pending Balance)' : 'Pending Balance'}</span>
            </div>
            <span className="text-xs font-black text-slate-700 font-mono">
              ₱ {totalPending.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* ⚡ QUICK CASHOUT METHOD SELECTION CARDS */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
          {isTl ? 'Mabilisang Cashout (Quick Cashout)' : 'Quick Cashout'}
        </h3>

        <div className="space-y-2">
          {/* GCash Option */}
          <button
            type="button"
            onClick={() => setSelectedMethod('gcash')}
            className={`w-full p-3.5 rounded-xl border transition flex items-center justify-between cursor-pointer ${
              selectedMethod === 'gcash'
                ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                G
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-slate-900">GCash</p>
                <p className="text-[11px] text-slate-500">{isTl ? 'Mag-cash out diretso sa GCash wallet' : 'Cash out via GCash'}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* Bank Transfer Option */}
          <button
            type="button"
            onClick={() => setSelectedMethod('bank')}
            className={`w-full p-3.5 rounded-xl border transition flex items-center justify-between cursor-pointer ${
              selectedMethod === 'bank'
                ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-700 text-white font-black text-xs flex items-center justify-center shadow-xs">
                <Landmark className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-slate-900">{isTl ? 'Bank Transfer' : 'Bank Transfer'}</p>
                <p className="text-[11px] text-slate-500">{isTl ? 'BDO, BPI, UnionBank at iba pa' : 'Cash out via Bank'}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* Other Options */}
          <button
            type="button"
            onClick={() => setSelectedMethod('other')}
            className={`w-full p-3.5 rounded-xl border transition flex items-center justify-between cursor-pointer ${
              selectedMethod === 'other'
                ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-white font-black text-xs flex items-center justify-center shadow-xs">
                <MoreHorizontal className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-slate-900">{isTl ? 'Iba pang Opsyon' : 'Other Options'}</p>
                <p className="text-[11px] text-slate-500">{isTl ? 'Maya, Coins.ph, Padala' : 'More cashout methods'}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* 📝 CASHOUT FORM SECTION */}
      <div id="cashout-form-section" className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-blue-600" />
            <h3 className="font-extrabold text-slate-900 text-sm">
              {selectedMethod === 'gcash' ? 'GCash Cash-Out Form' : selectedMethod === 'bank' ? 'Bank Transfer Details' : 'Payment Method Details'}
            </h3>
          </div>
          <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
            Min: ₱100.00
          </span>
        </div>

        <form onSubmit={handleWithdrawClick} className="space-y-4">
          
          {/* Account Name input */}
          <div className="space-y-1.5">
            <label htmlFor="withdraw-name" className="text-xs font-bold text-slate-700 block">
              {isTl ? "Pangalan sa GCash / Account (Full Name)" : "Registered Full Name"} <span className="text-red-500">*</span>
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
            <p className="text-[10px] text-slate-400">{isTl ? "Siguraduhing tugma sa registered name upang maiwasan ang delay." : "Please ensure this matches your registered name to prevent delay."}</p>
          </div>

          {/* Mobile / Account Number input */}
          <div className="space-y-1.5">
            <label htmlFor="withdraw-phone" className="text-xs font-bold text-slate-700 block">
              {isTl ? "GCash Mobile Number (11-digits)" : "GCash Mobile Number"} <span className="text-red-500">*</span>
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
                placeholder="Minimum 100"
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

          {/* Feedback messages */}
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
        </form>
      </div>

      {/* 📜 WITHDRAWAL HISTORY LEDGER */}
      <div id="cashout-history-section" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <h4 className="font-bold text-slate-900 text-sm">{isTl ? "Kasaysayan ng Withdrawal" : "Withdrawal History"}</h4>
          </div>
          <span className="text-xs text-slate-400 font-mono font-bold">
            Total ({withdrawals.length})
          </span>
        </div>

        <div className="divide-y divide-slate-100 overflow-y-auto max-h-[300px] pr-1">
          {withdrawals.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8 text-slate-400">
              <FileSpreadsheet className="w-10 h-10 stroke-1 mb-2 text-slate-300" />
              <p className="text-xs font-semibold">{isTl ? "Wala pang naitatalang Withdrawal." : "No withdrawals logged yet."}</p>
            </div>
          ) : (
            [...withdrawals].reverse().map((req) => (
              <div 
                key={req.id}
                id={`withdraw-item-${req.id}`}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate uppercase">{req.accountName}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{req.gcashNumber}</p>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">Ref: {req.referenceNo}</p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-slate-900">-₱{req.amount.toFixed(2)}</p>
                  <div className="mt-1 flex items-center justify-end">
                    {req.status === 'success' ? (
                      <div className="flex flex-col items-end gap-1">
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded px-1.5 py-0.5 flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" />
                          <span>Success</span>
                        </span>
                        <button
                          onClick={() => {
                            setActiveBanner({
                              userName: req.accountName || 'User',
                              gcashNumber: req.gcashNumber,
                              amount: req.amount,
                              createdAt: req.createdAt,
                              referenceNo: req.referenceNo
                            });
                            setShowBannerModal(true);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black px-2 py-0.5 rounded transition shadow-xs flex items-center gap-0.5 cursor-pointer"
                        >
                          <Download className="w-2.5 h-2.5" />
                          <span>Banner</span>
                        </button>
                      </div>
                    ) : req.status === 'processing' || req.status === 'pending' ? (
                      <span className="bg-amber-100 text-amber-800 text-[9px] font-bold rounded px-1.5 py-0.5 flex items-center gap-1 animate-pulse">
                        <Clock className="w-2.5 h-2.5" />
                        <span>Processing</span>
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-800 text-[9px] font-bold rounded px-1.5 py-0.5 flex items-center gap-0.5">
                        <XIcon className="w-2.5 h-2.5" />
                        <span>Failed</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <RedemptionBannerModal
        isOpen={showBannerModal}
        onClose={() => setShowBannerModal(false)}
        redemption={activeBanner}
      />

      <WithdrawalPolicyModal
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
      />

    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
