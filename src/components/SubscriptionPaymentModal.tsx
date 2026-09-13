import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  QrCode,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Smartphone,
  FileText,
  Copy,
  Check,
  RefreshCw,
  ImageIcon,
  Trash2,
  Info
} from 'lucide-react';
import { 
  SUBSCRIPTION_PLANS, 
  SubscriptionPlanDef, 
  SubscriptionPayment, 
  UserSession 
} from '../types';

interface SubscriptionPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlanId: string | null;
  token?: string | null;
  currentUser?: UserSession | null;
  onSuccess?: (payment: SubscriptionPayment) => void;
  triggerNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
  onRefreshProfile?: () => void;
}

export const SubscriptionPaymentModal: React.FC<SubscriptionPaymentModalProps> = ({
  isOpen,
  onClose,
  selectedPlanId,
  token,
  currentUser,
  onSuccess,
  triggerNotification,
  onRefreshProfile
}) => {
  // Find current plan definition
  const plan: SubscriptionPlanDef = 
    SUBSCRIPTION_PLANS.find(p => p.id === selectedPlanId) || 
    SUBSCRIPTION_PLANS.find(p => p.id === '1month') || 
    SUBSCRIPTION_PLANS[0];

  // Helper to format local ISO string for datetime-local input
  const getLocalDatetimeString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localTime = new Date(now.getTime() - offset);
    return localTime.toISOString().slice(0, 16);
  };

  // Form states
  const [gcashAccountName, setGcashAccountName] = useState('');
  const [gcashMobileNumber, setGcashMobileNumber] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentDateTime, setPaymentDateTime] = useState(getLocalDatetimeString());
  const [receiptScreenshot, setReceiptScreenshot] = useState<string>('');
  const [notes, setNotes] = useState('');

  // UI status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedPayment, setSubmittedPayment] = useState<SubscriptionPayment | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [phoneError, setPhoneError] = useState<string>('');
  const [copiedRef, setCopiedRef] = useState(false);
  const [qrTimestamp, setQrTimestamp] = useState<number>(Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if current user already has pending payment for this plan
  useEffect(() => {
    if (isOpen) {
      setQrTimestamp(Date.now());
      // Pre-fill from current user name if available
      if (currentUser?.name && !gcashAccountName) {
        setGcashAccountName(currentUser.name);
      }
      setPaymentDateTime(getLocalDatetimeString());
      setSubmittedPayment(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // Validate Philippine phone number (09XXXXXXXXX or +639XXXXXXXXX)
  const validatePhoneNumber = (num: string): boolean => {
    const cleanNum = num.trim().replace(/\s+/g, '');
    const phMobileRegex = /^(09\d{9}|\+639\d{9})$/;
    return phMobileRegex.test(cleanNum);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setGcashMobileNumber(val);
    if (val.trim() && !validatePhoneNumber(val)) {
      setPhoneError('Dapat ay wastong Philippine number (hal. 09123456789 o +639123456789)');
    } else {
      setPhoneError('');
    }
  };

  // Handle receipt file reading
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      triggerNotification?.('Larawan (image file) lamang ang maaaring i-upload bilang resibo.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      triggerNotification?.('Masyadong malaki ang larawan. Ang maximum file size ay 10MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setReceiptScreenshot(event.target?.result as string || '');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      triggerNotification?.('Kailangan mong mag-login upang magsumite ng payment.', 'error');
      return;
    }

    if (!gcashAccountName.trim()) {
      triggerNotification?.('Mangyaring ilagay ang iyong GCash Account Name.', 'error');
      return;
    }

    if (!gcashMobileNumber.trim() || !validatePhoneNumber(gcashMobileNumber)) {
      setPhoneError('Wastong Philippine mobile number ang kailangan.');
      triggerNotification?.('Pakilagay ang wastong Philippine GCash mobile number (hal. 09123456789).', 'error');
      return;
    }

    if (!referenceNumber.trim() || referenceNumber.trim().length < 5) {
      triggerNotification?.('Pakilagay ang kumpletong GCash Reference Number mula sa iyong resibo.', 'error');
      return;
    }

    if (!paymentDateTime) {
      triggerNotification?.('Pakilagay ang petsa at oras ng iyong pagbabayad.', 'error');
      return;
    }

    if (!receiptScreenshot) {
      triggerNotification?.('Kailangan mag-upload ng screenshot o larawan ng iyong GCash resibo.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/subscription/submit-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          planId: plan.id,
          gcashAccountName: gcashAccountName.trim(),
          gcashMobileNumber: gcashMobileNumber.trim(),
          referenceNumber: referenceNumber.trim(),
          paymentDateTime,
          receiptScreenshot,
          notes: notes.trim() || undefined
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSubmittedPayment(data.payment);
        triggerNotification?.('✅ Natanggap na ang iyong payment submission! Hinihintay ang pagsusuri ng Admin.', 'success');
        onSuccess?.(data.payment);
        onRefreshProfile?.();
      } else {
        triggerNotification?.(data.error || 'Hindi maipadala ang payment submission.', 'error');
      }
    } catch (err) {
      console.error('Error submitting subscription payment:', err);
      triggerNotification?.('May naganap na problema sa koneksyon. Pakisubukan muli.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyRefNumber = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
    triggerNotification?.('Kinopya ang reference number!', 'info');
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div 
        id="subscription-payment-page"
        className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]"
      >
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-none text-white">
                GCash InstaPay Payment
              </h2>
              <p className="text-[11px] text-blue-200 font-semibold mt-1">
                Official Z-oneApp Subscription QR & Submission Portal
              </p>
            </div>
          </div>

          <button
            id="btn-close-subscription-payment"
            onClick={onClose}
            className="zone-btn-icon zone-btn-icon-sm zone-btn-icon-dark text-white cursor-pointer shrink-0"
            title="Isara"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL CONTENT BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 max-h-[calc(95vh-80px)] custom-scrollbar">

          {/* SUBMITTED CONFIRMATION VIEW */}
          {submittedPayment ? (
            <div id="subscription-payment-confirmed-box" className="space-y-5 animate-scaleUp py-2">
              <div className="bg-emerald-50 border-2 border-emerald-500 rounded-3xl p-6 text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                
                <div className="space-y-1">
                  <span className="inline-block bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                    ✅ PAYMENT SUBMITTED
                  </span>
                  <h3 className="text-lg font-black text-slate-900">
                    Natanggap na ang iyong payment submission.
                  </h3>
                  <p className="text-xs text-slate-600 font-medium max-w-md mx-auto">
                    Nasa Admin Verification Queue na ang iyong resibo. Pakihintay ang pagsusuri ng aming Audit Department.
                  </p>
                </div>

                {/* SUMMARY DETAILS CARD */}
                <div className="bg-white rounded-2xl p-4 border border-emerald-200 text-left space-y-2 text-xs shadow-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-bold">Plan:</span>
                    <span className="text-slate-900 font-black">{submittedPayment.planName}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-bold">Amount:</span>
                    <span className="text-emerald-600 font-black font-mono text-sm">
                      ₱{submittedPayment.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-bold">Reference Number:</span>
                    <div className="flex items-center gap-1.5 font-mono font-black text-indigo-700">
                      <span>{submittedPayment.referenceNumber}</span>
                      <button
                        type="button"
                        onClick={() => copyRefNumber(submittedPayment.referenceNumber)}
                        className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                        title="Kopyahin"
                      >
                        {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-bold">GCash Account:</span>
                    <span className="text-slate-800 font-bold">
                      {submittedPayment.gcashAccountName} ({submittedPayment.gcashMobileNumber})
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 font-bold">Status:</span>
                    <span className="bg-amber-100 text-amber-800 border border-amber-300 font-black text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600 animate-spin-slow" />
                      <span>⏳ Pending Admin Verification</span>
                    </span>
                  </div>
                </div>

                {/* STRICT IMPORTANT DISCLAIMER */}
                <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4 text-left space-y-1.5 text-xs text-amber-900">
                  <div className="flex items-center gap-1.5 font-black text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>MAHALAGANG PAALALA:</span>
                  </div>
                  <p className="text-[11px] font-semibold leading-relaxed">
                    Huwag i-activate agad ang subscription. Ang subscription ay magiging active lamang kapag na-verify at na-approve ng authorized admin upang matiyak ang seguridad ng sistema at transaksyon.
                  </p>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  id="btn-refresh-status-after-submit"
                  onClick={() => {
                    onRefreshProfile?.();
                    onClose();
                  }}
                  className="flex-1 zone-btn zone-btn-primary zone-btn-md text-xs cursor-pointer shadow-md"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Subaybayan ang Status sa Aking Account</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="zone-btn zone-btn-secondary zone-btn-md text-xs px-6 cursor-pointer"
                >
                  Isara (Close)
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* SECTION 1: SELECTED PLAN CARD (READ ONLY) */}
              <div id="selected-plan-summary-card" className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-md border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black tracking-wider uppercase text-indigo-300 bg-indigo-500/20 border border-indigo-400/30 px-2.5 py-0.5 rounded-full">
                    NAPILING SUBSCRIPTION PLAN
                  </span>
                  {plan.badge && (
                    <span className="text-[10px] font-black uppercase text-amber-300 bg-amber-500/20 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      {plan.name}
                    </h3>
                    <p className="text-[11px] text-slate-300 font-medium">
                      {plan.desc}
                    </p>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <span className="text-[10px] text-slate-400 uppercase font-black block">
                      Amount to Pay (Eksaktong Halaga)
                    </span>
                    <span className="text-2xl font-black font-mono text-emerald-400 block">
                      ₱{plan.price.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Protektado ng Z-oneApp Anti-Duplicate Security Protocol</span>
                </div>
              </div>

              {/* SECTION 2: GCASH INSTAPAY QR CODE */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 sm:p-6 text-center space-y-4">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full border border-blue-200">
                    <QrCode className="w-3 h-3" />
                    <span>ADMIN CONFIGURED INSTAPAY QR CODE</span>
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    I-scan ang GCash InstaPay QR sa Ibaba
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Gamitin ang GCash App upang i-scan o i-upload ang QR Code na ito.
                  </p>
                </div>

                {/* QR DISPLAY WITH INSTAPAY BADGE */}
                <div className="relative inline-block mx-auto bg-white p-4 rounded-3xl border-2 border-indigo-100 shadow-md group">
                  <img
                    id="admin-active-gcash-qr-image"
                    src={`/admin_gcash_qr.png?t=${qrTimestamp}`}
                    alt="Official Z-oneApp GCash InstaPay QR"
                    className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-2xl mx-auto"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "https://placehold.co/400x400/f8fafc/334155?text=GCash+InstaPay+QR";
                    }}
                  />
                  <div className="absolute top-3 right-3 bg-indigo-600 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-md uppercase tracking-wider">
                    InstaPay
                  </div>
                </div>

                {/* DOWNLOAD QR BUTTON */}
                <div>
                  <a
                    id="btn-download-subscription-qr"
                    href="/admin_gcash_qr.png"
                    download="Z-oneApp_Admin_GCash_QR.png"
                    className="inline-flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer active:scale-95 shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>I-download ang QR Code (Save to Gallery)</span>
                  </a>
                </div>
              </div>

              {/* SECTION 3: GABAY SA PAG-SCAN GAMIT ANG GCASH */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2 text-slate-900 border-b border-slate-200 pb-3">
                  <Smartphone className="w-5 h-5 text-indigo-600 shrink-0" />
                  <h4 className="font-black text-sm">
                    📱 Gabay sa Pag-Scan Gamit ang GCash
                  </h4>
                </div>

                <ol className="list-decimal pl-5 text-xs text-slate-700 font-semibold space-y-2.5 leading-relaxed">
                  <li>
                    Buksan ang <span className="text-blue-600 font-black">GCash app</span>.
                  </li>
                  <li>
                    Piliin ang <span className="text-slate-900 font-black">Scan / Pay QR</span> sa dashboard ng GCash.
                  </li>
                  <li>
                    I-scan ang ipinakitang <span className="text-indigo-600 font-black">InstaPay QR Code</span> (o gamitin ang "Upload from Gallery" kung na-download mo na ang larawan).
                  </li>
                  <li>
                    Siguraduhing tama ang <span className="text-slate-900 font-black">recipient/account details</span> ng merchant bago magpatuloy.
                  </li>
                  <li>
                    Ilagay ang eksaktong amount ng napiling subscription:{' '}
                    <span className="text-emerald-600 font-black font-mono">
                      ₱{plan.price.toFixed(2)}
                    </span>.
                  </li>
                  <li>
                    Kumpletuhin ang payment.
                  </li>
                  <li>
                    Kumuha ng <span className="text-amber-700 font-black">screenshot ng successful transaction/receipt</span> na may malinaw na Reference Number.
                  </li>
                  <li>
                    Bumalik sa <span className="text-indigo-600 font-black">Z-oneApp</span> at isumite ang payment details sa form sa ibaba.
                  </li>
                </ol>

                {/* CLEAR WARNINGS */}
                <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 space-y-2 text-xs font-semibold text-amber-900">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>⚠️ Siguraduhing tama ang recipient details bago magbayad.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>⚠️ Hindi automatic na activated ang subscription pagkatapos mag-scan. Hintayin ang verification at approval ng admin.</span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: PAYMENT SUBMISSION FORM */}
              <form 
                id="form-submit-subscription-payment"
                onSubmit={handleSubmit} 
                className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5"
              >
                <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <h4 className="font-black text-sm sm:text-base text-slate-900">
                      🧾 SUBMIT PAYMENT
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Verification Form
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Selected Plan (Read-only) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Selected Plan (Read-only)
                    </label>
                    <input
                      type="text"
                      value={plan.name}
                      readOnly
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-black text-slate-700 cursor-not-allowed select-none"
                    />
                  </div>

                  {/* Amount to Pay (Read-only) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Amount (Read-only)
                    </label>
                    <input
                      type="text"
                      value={`₱${plan.price.toFixed(2)}`}
                      readOnly
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-black text-emerald-600 font-mono cursor-not-allowed select-none"
                    />
                  </div>

                  {/* GCash Account Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      GCash Account Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="input-gcash-account-name"
                      type="text"
                      required
                      placeholder="Hal. Juan Dela Cruz"
                      value={gcashAccountName}
                      onChange={(e) => setGcashAccountName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>

                  {/* GCash Mobile Number */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      GCash Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="input-gcash-mobile-number"
                      type="tel"
                      required
                      placeholder="09XXXXXXXXX o +639XXXXXXXXX"
                      value={gcashMobileNumber}
                      onChange={handlePhoneChange}
                      className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                        phoneError 
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500' 
                          : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-600'
                      }`}
                    />
                    {phoneError && (
                      <p className="text-[10px] text-rose-500 font-bold mt-0.5">{phoneError}</p>
                    )}
                  </div>

                  {/* Reference Number */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Reference Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="input-gcash-reference-number"
                      type="text"
                      required
                      placeholder="Hal. 1002345678901"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                    <span className="text-[10px] text-slate-400 font-medium block">
                      Tingnan sa iyong GCash transaction receipt.
                    </span>
                  </div>

                  {/* Date & Time of Payment */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Date & Time of Payment <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="input-payment-date-time"
                      type="datetime-local"
                      required
                      value={paymentDateTime}
                      onChange={(e) => setPaymentDateTime(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                {/* Payment Receipt / Screenshot */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Payment Receipt / Screenshot <span className="text-rose-500">*</span>
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {receiptScreenshot ? (
                    <div className="relative border-2 border-emerald-300 bg-emerald-50/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                      <img
                        src={receiptScreenshot}
                        alt="Receipt Preview"
                        className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl border border-emerald-200 shadow-xs shrink-0"
                      />
                      <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Nai-attach ang Resibo!</span>
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Malinaw at handa nang ipadala para sa admin verification.
                        </p>
                        <div className="flex gap-2 justify-center sm:justify-start pt-1">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-bold underline cursor-pointer"
                          >
                            Palitan ang Larawan
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={() => setReceiptScreenshot('')}
                            className="text-rose-600 hover:text-rose-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Alisin</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
                        isDragging 
                          ? 'border-indigo-600 bg-indigo-50/50' 
                          : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 block">
                        I-click o i-drag dito ang screenshot ng iyong GCash Receipt
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        PNG, JPG, JPEG o WEBP (Hanggang 10MB)
                      </span>
                    </div>
                  )}
                </div>

                {/* Optional Notes */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Optional Notes (Karagdagang Paalala o Mensahe sa Admin)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Hal. Nagbayad via GCash kaninang 2:15 PM..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                {/* SUBMIT BUTTON */}
                <div className="pt-2">
                  <button
                    type="submit"
                    id="btn-submit-payment-for-verification"
                    disabled={isSubmitting || !receiptScreenshot || !referenceNumber.trim() || !gcashAccountName.trim() || !gcashMobileNumber.trim()}
                    className="w-full zone-btn zone-btn-success zone-btn-lg text-xs sm:text-sm font-black cursor-pointer shadow-md"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Isinusumite ang Payment...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>✅ SUBMIT PAYMENT FOR VERIFICATION</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-slate-400 font-medium mt-2">
                    🔒 Direktang ipapasa sa Audit Department para sa mabilisang pagsusuri.
                  </p>
                </div>

              </form>
            </>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="flex items-center gap-1 font-semibold text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Z-oneApp Official Verification Gateway</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 font-bold text-[11px] underline cursor-pointer"
          >
            Isara (Close)
          </button>
        </div>

      </div>
    </div>
  );
};
