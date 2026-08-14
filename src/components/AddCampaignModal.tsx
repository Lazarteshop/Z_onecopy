import React, { useState } from 'react';
import { 
  PlusCircle, 
  Globe, 
  Coins, 
  Clock, 
  X, 
  Sparkles, 
  FolderPlus, 
  FileText, 
  ExternalLink, 
  CheckCircle2, 
  ShieldAlert,
  HelpCircle,
  Zap
} from 'lucide-react';
import { WebsiteCampaign } from '../types';

interface AddCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onCampaignCreated?: (updatedCampaigns: WebsiteCampaign[]) => void;
  triggerNotification: (message: string, type: 'success' | 'info' | 'error') => void;
}

const CATEGORY_OPTIONS = [
  'E-Services',
  'Technology & AI',
  'Online Shopping',
  'Finance & Banking',
  'News & Media',
  'Gaming & Entertainment',
  'Education & Training',
  'Food & Lifestyle',
  'Business & Marketing'
];

const PRESET_REWARDS = [0.25, 0.50, 0.75, 1.00, 2.00, 5.00];
const PRESET_TIMERS = [5, 10, 15, 30, 60];

export const AddCampaignModal: React.FC<AddCampaignModalProps> = ({
  isOpen,
  onClose,
  token,
  onCampaignCreated,
  triggerNotification
}) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [reward, setReward] = useState('0.75');
  const [timer, setTimer] = useState('15');
  const [category, setCategory] = useState('E-Services');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [heroSubtitle, setHeroSubtitle] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      triggerNotification('⚠️ Pakilagay ang pamagat (Website Title).', 'error');
      return;
    }

    if (!url.trim()) {
      triggerNotification('⚠️ Pakilagay ang URL ng website homepage.', 'error');
      return;
    }

    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    const rewardNum = parseFloat(reward);
    if (isNaN(rewardNum) || rewardNum <= 0) {
      triggerNotification('⚠️ Pakilagay ang wastong reward amount (hal. 0.75).', 'error');
      return;
    }

    const timerNum = parseInt(timer, 10);
    if (isNaN(timerNum) || timerNum < 5) {
      triggerNotification('⚠️ Ang pinakamababang timer ay 5 segundo.', 'error');
      return;
    }

    setIsSubmitting(true);

    const newCampaign: WebsiteCampaign = {
      id: 'custom-' + Date.now(),
      title: title.trim(),
      url: finalUrl,
      reward: rewardNum,
      timer: timerNum,
      completed: false,
      logo: 'Globe',
      category: category || 'E-Services',
      description: description.trim() || `Opisyal na pinagkakatiwalaang partner campaign sa kategoryang ${category}. Manatili sa site upang matanggap ang ₱${rewardNum.toFixed(2)} reward.`,
      mockPageContent: {
        heroTitle: title.trim(),
        heroSubtitle: heroSubtitle.trim() || 'Maligayang pagdating sa aming verified partner portal. Manatili rito para sa automated GCash rewards!',
        primaryColor: '#1E40AF',
        accentColor: '#10B981',
        paragraphs: [
          'Salamat sa pagsuporta at pagbisita sa aming page upang matulungan kaming mai-optimize ang search visibility index.',
          'Ang automated rewards tracking session na ito ay ligtas at direktang naka-link sa iyong aktibong Z-oneApp profile.'
        ],
        features: [
          'SEO Rank Optimization',
          'Automated Traffic Validation',
          'Fast Rewards Payout Credits'
        ]
      }
    };

    try {
      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token || ''
        },
        body: JSON.stringify({ campaign: newCampaign })
      });

      if (res.ok) {
        const result = await res.json();
        if (onCampaignCreated && result.campaigns) {
          onCampaignCreated(result.campaigns);
        }
        triggerNotification(`💡 Tagumpay na naidagdag ang "${newCampaign.title}"! Available na ito para bisitahin ng users.`, 'success');
        
        // Clear fields on success
        setTitle('');
        setUrl('');
        setReward('0.75');
        setTimer('15');
        setDescription('');
        setHeroSubtitle('');
        onClose();
      } else {
        const errData = await res.json();
        triggerNotification(`⚠️ Bigo sa pag-add: ${errData.error || 'Server error'}`, 'error');
      }
    } catch (err) {
      console.error(err);
      triggerNotification('⚠️ Connection error sa server.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[99995] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-slate-950/85 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        // Prevent accidental backdrop closing while typing
        if (e.target === e.currentTarget) {
          // Keep it open to protect user's input, or require clicking X button
        }
      }}
    >
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-indigo-200 overflow-hidden my-auto animate-scaleUp"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP ACCENT STRIP */}
        <div className="h-3 bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 w-full" />

        {/* CLOSE (X) BUTTON */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer z-10 disabled:opacity-50"
          title="Isara (Close)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* MODAL HEADER */}
        <div className="p-6 sm:p-7 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-xs">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">
                Admin Exclusive Window
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug mt-0.5">
                Mag-add ng Bagong Website Campaign
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Ipasok ang link, reward, tagal ng pananatili (timer), at kategorya. Hindi mawawala ang iyong sinusulat habang bukas ang pop-up window na ito.
          </p>
        </div>

        {/* MODAL FORM BODY */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* TITLE & URL INPUTS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Website Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                <span>Pangalan ng Website / Title <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                required
                placeholder="Hal. Shopee Hot Deals / Blog Promo"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold outline-hidden transition shadow-xs"
              />
            </div>

            {/* Website URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                <span>Website Homepage URL <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                required
                placeholder="Hal. shopee.ph o promo.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold outline-hidden transition shadow-xs"
              />
            </div>

          </div>

          {/* REWARD & TIMER & CATEGORY */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Reward (₱) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span>Reward (₱) <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.75"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-black outline-hidden transition shadow-xs"
              />
              {/* Presets */}
              <div className="flex flex-wrap gap-1 pt-1">
                {PRESET_REWARDS.map(p => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setReward(p.toFixed(2))}
                    className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border transition cursor-pointer ${
                      parseFloat(reward) === p 
                        ? 'bg-amber-500 text-white border-amber-600' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                    }`}
                  >
                    ₱{p.toFixed(2)}
                  </button>
                ))}
              </div>
            </div>

            {/* Timer (seconds) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-500" />
                <span>Timer (segundo) <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="number"
                min="5"
                required
                placeholder="15"
                value={timer}
                onChange={(e) => setTimer(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-black outline-hidden transition shadow-xs"
              />
              {/* Presets */}
              <div className="flex flex-wrap gap-1 pt-1">
                {PRESET_TIMERS.map(t => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setTimer(String(t))}
                    className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border transition cursor-pointer ${
                      parseInt(timer, 10) === t 
                        ? 'bg-sky-500 text-white border-sky-600' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                    }`}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FolderPlus className="w-3.5 h-3.5 text-indigo-500" />
                <span>Kategorya (Category)</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold outline-hidden transition shadow-xs cursor-pointer"
              >
                {CATEGORY_OPTIONS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

          </div>

          {/* DESCRIPTION */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Maikling Paglalarawan (Description)</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">Optional</span>
            </label>
            <textarea
              rows={2}
              placeholder="Hal. Isang sikat na platform para sa online discounts at vouchers."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium outline-hidden transition shadow-xs resize-none"
            />
          </div>

          {/* ADVANCED CUSTOMIZATION ACCORDION */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{showAdvanced ? 'Itago ang Advanced Landing Settings' : '+ I-customize ang Simulator Landing Subtitle (Optional)'}</span>
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-2 animate-fadeIn">
                <label className="text-xs font-bold text-indigo-900 block">
                  Custom Hero Subtitle para sa Simulator:
                </label>
                <input
                  type="text"
                  placeholder="Hal. Manatili rito nang 15 segundo upang awtomatikong ma-credit ang reward."
                  value={heroSubtitle}
                  onChange={(e) => setHeroSubtitle(e.target.value)}
                  className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium outline-hidden"
                />
              </div>
            )}
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Lalabas agad sa lahat ng users pagka-save.</span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs transition cursor-pointer disabled:opacity-50"
              >
                Kanselahin
              </button>

              <button
                type="submit"
                id="modal-submit-campaign-btn"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-extrabold text-xs transition shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sinusumite...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>I-save at I-post Campaign</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
