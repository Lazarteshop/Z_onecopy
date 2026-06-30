import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Download, 
  Sparkles, 
  Coins, 
  Eye, 
  Settings, 
  Users, 
  CheckCircle, 
  Clock, 
  ArrowUpRight, 
  Menu, 
  X, 
  ChevronRight, 
  Plus, 
  Trash, 
  Play, 
  Check, 
  AlertCircle,
  ShieldCheck,
  Globe,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import soundEffects from './utils/audio';

// Types
interface Campaign {
  id: string;
  title: string;
  description: string;
  url: string;
  reward: number;
  duration: number; // in seconds
  category: string;
  views: number;
}

interface CashoutRequest {
  id: string;
  name: string;
  number: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
}

interface Referral {
  id: string;
  username: string;
  bonus: number;
  date: string;
}

export default function App() {
  // Global App States
  const [language, setLanguage] = useState<'en' | 'tl'>('tl'); // Default to Tagalog
  const [balance, setBalance] = useState<number>(() => {
    const saved = localStorage.getItem('zone_balance');
    return saved ? parseFloat(saved) : 150.00; // Starter balance
  });
  
  const [completedCampaigns, setCompletedCampaigns] = useState<string[]>(() => {
    const saved = localStorage.getItem('zone_completed_campaigns');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<'earn' | 'withdraw' | 'refer' | 'guide'>('earn');
  
  // Audio state
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Installer state
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'completed'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState('0 KB/s');
  const [downloadedSize, setDownloadedSize] = useState('0 MB');
  const [activePwaGuideTab, setActivePwaGuideTab] = useState<'android' | 'ios' | 'desktop'>('android');

  // Simulated Web Viewer State
  const [activeViewingCampaign, setActiveViewingCampaign] = useState<Campaign | null>(null);
  const [viewerTimeLeft, setViewerTimeLeft] = useState(0);
  const [viewerProgress, setViewerProgress] = useState(100);
  const [isViewerSuccessful, setIsViewerSuccessful] = useState(false);

  // GCash Withdraw Form
  const [gcashName, setGcashName] = useState('');
  const [gcashNumber, setGcashNumber] = useState('');
  const [selectedWithdrawAmount, setSelectedWithdrawAmount] = useState<number>(100);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  // Referral State
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [referrals, setReferrals] = useState<Referral[]>([
    { id: '1', username: 'Khel_09', bonus: 20.00, date: '2026-06-29' },
    { id: '2', username: 'Mariel_Cruz', bonus: 20.00, date: '2026-06-28' },
  ]);

  // Admin Portal State
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminError, setAdminError] = useState('');

  // Campaigns Database
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    const saved = localStorage.getItem('zone_campaigns');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'c1', title: 'GCash Free Promos', description: 'Tingnan ang pinakabagong GCash promos para kumita ng instant points.', url: 'https://www.gcash.com/promos', reward: 8.50, duration: 10, category: 'Promos', views: 423 },
      { id: 'c2', title: 'Shopee Piso Deals', description: 'Tuklasin ang pinakamurang Shopee piso deals ngayon.', url: 'https://shopee.ph/m/piso-deals', reward: 12.00, duration: 15, category: 'Shopping', views: 890 },
      { id: 'c3', title: 'Lazada Free Shipping', description: 'Kolektahin ang mga voucher para sa libreng pagpapadala.', url: 'https://www.lazada.com.ph/free-shipping', reward: 10.50, duration: 12, category: 'Vouchers', views: 561 },
      { id: 'c4', title: 'Smart GigaLife Offers', description: 'Suriin ang mga bagong gigalife internet data packages.', url: 'https://smart.com.ph/gigalife', reward: 9.00, duration: 10, category: 'Telecom', views: 231 },
      { id: 'c5', title: 'Z-one Official Website', description: 'Sponsor website para sa mabilis na high-paying points.', url: 'https://z-one-app.com/rewards', reward: 15.00, duration: 15, category: 'Sponsor', views: 1450 }
    ];
  });

  // Cashout requests history
  const [cashoutHistory, setCashoutHistory] = useState<CashoutRequest[]>(() => {
    const saved = localStorage.getItem('zone_cashout_history');
    return saved ? JSON.parse(saved) : [
      { id: 'wd1', name: 'JUAN DELA CRUZ', number: '09123456789', amount: 100, status: 'approved', date: '2026-06-28' },
      { id: 'wd2', name: 'MARIA SANTOS', number: '09876543210', amount: 250, status: 'pending', date: '2026-06-29' }
    ];
  });

  // Keep localStorage synced
  useEffect(() => {
    localStorage.setItem('zone_balance', balance.toFixed(2));
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('zone_completed_campaigns', JSON.stringify(completedCampaigns));
  }, [completedCampaigns]);

  useEffect(() => {
    localStorage.setItem('zone_campaigns', JSON.stringify(campaigns));
  }, [campaigns]);

  useEffect(() => {
    localStorage.setItem('zone_cashout_history', JSON.stringify(cashoutHistory));
  }, [cashoutHistory]);

  // Audio trigger utility
  const playSfx = (type: 'click' | 'reward' | 'withdraw') => {
    if (!soundEnabled) return;
    if (type === 'click') soundEffects.playClick();
    if (type === 'reward') soundEffects.playReward();
    if (type === 'withdraw') soundEffects.playWithdraw();
  };

  // Start Download Simulator
  const startAutomaticDownload = (platform: 'android' | 'ios' | 'desktop') => {
    playSfx('click');
    setDownloadProgress(0);
    setDownloadState('downloading');

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 8) + 4;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        setDownloadState('completed');
        
        // Trigger actual download of the real APK we downloaded in our public folder!
        const link = document.createElement('a');
        link.href = '/Z-oneApp.apk';
        link.setAttribute('download', 'Z-oneApp.apk');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setDownloadProgress(currentProgress);
      setDownloadedSize(((currentProgress / 100) * 2.4).toFixed(1) + ' MB');
      setDownloadSpeed((Math.random() * 2 + 1.5).toFixed(1) + ' MB/s');
    }, 150);
  };

  // Simulated viewer timer loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeViewingCampaign && viewerTimeLeft > 0) {
      timer = setTimeout(() => {
        const nextTime = viewerTimeLeft - 1;
        setViewerTimeLeft(nextTime);
        setViewerProgress((nextTime / activeViewingCampaign.duration) * 100);
      }, 1000);
    } else if (activeViewingCampaign && viewerTimeLeft === 0) {
      // Completed!
      setIsViewerSuccessful(true);
      setBalance(prev => prev + activeViewingCampaign.reward);
      setCompletedCampaigns(prev => [...prev, activeViewingCampaign.id]);
      
      // Update campaigns view counts
      setCampaigns(prev => prev.map(c => c.id === activeViewingCampaign.id ? { ...c, views: c.views + 1 } : c));
      
      playSfx('reward');
      setActiveViewingCampaign(null);
    }
    return () => clearTimeout(timer);
  }, [activeViewingCampaign, viewerTimeLeft]);

  // GCash Submit Cashout
  const handleCashoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playSfx('click');

    if (!gcashName.trim() || !gcashNumber.trim()) {
      alert(language === 'tl' ? 'Paki-kumpleto ang GCash Name at Number!' : 'Please complete the GCash Name and Number!');
      return;
    }

    if (gcashNumber.length < 11) {
      alert(language === 'tl' ? 'Ang GCash number ay dapat may 11 na numero!' : 'The GCash number must be 11 digits!');
      return;
    }

    if (balance < selectedWithdrawAmount) {
      alert(language === 'tl' ? 'Hindi sapat ang iyong balance!' : 'Insufficient balance!');
      return;
    }

    setIsWithdrawing(true);
    
    // Simulate approval delay
    setTimeout(() => {
      setBalance(prev => prev - selectedWithdrawAmount);
      const newRequest: CashoutRequest = {
        id: 'wd' + Date.now(),
        name: gcashName.toUpperCase(),
        number: gcashNumber,
        amount: selectedWithdrawAmount,
        status: 'pending',
        date: new Date().toISOString().split('T')[0]
      };
      setCashoutHistory(prev => [newRequest, ...prev]);
      setIsWithdrawing(false);
      setWithdrawSuccess(true);
      playSfx('withdraw');
      setGcashName('');
      setGcashNumber('');
    }, 2000);
  };

  // Referral Copy
  const copyReferralLink = () => {
    playSfx('click');
    const link = `${window.location.origin}/?ref=Z${Math.floor(Math.random() * 90000 + 10000)}`;
    navigator.clipboard.writeText(link);
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2000);
  };

  // Authenticate Admin
  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    playSfx('click');
    if (adminPasscode === 'admin123') {
      setIsAdminAuthenticated(true);
      setAdminError('');
    } else {
      setAdminError(language === 'tl' ? 'Maling passcode!' : 'Incorrect passcode!');
    }
  };

  // Add Campaign via Admin
  const [newCampaignTitle, setNewCampaignTitle] = useState('');
  const [newCampaignUrl, setNewCampaignUrl] = useState('');
  const [newCampaignReward, setNewCampaignReward] = useState<number>(5.00);
  const [newCampaignDuration, setNewCampaignDuration] = useState<number>(10);
  const [newCampaignCategory, setNewCampaignCategory] = useState('Promos');

  const handleAddCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    playSfx('click');
    if (!newCampaignTitle || !newCampaignUrl) {
      alert('Paki-punan ang lahat ng fields!');
      return;
    }
    const newCamp: Campaign = {
      id: 'c' + Date.now(),
      title: newCampaignTitle,
      description: `Suriin ang sponsor website na ito upang kumita ng instant cash reward.`,
      url: newCampaignUrl,
      reward: newCampaignReward,
      duration: newCampaignDuration,
      category: newCampaignCategory,
      views: 0
    };
    setCampaigns(prev => [newCamp, ...prev]);
    setNewCampaignTitle('');
    setNewCampaignUrl('');
    alert('Sponsor Campaign matagumpay na naidagdag!');
  };

  const handleDeleteCampaign = (id: string) => {
    playSfx('click');
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  const handleApproveWithdrawal = (id: string) => {
    playSfx('reward');
    setCashoutHistory(prev => prev.map(w => w.id === id ? { ...w, status: 'approved' } : w));
  };

  const handleRejectWithdrawal = (id: string) => {
    playSfx('click');
    setCashoutHistory(prev => prev.map(w => w.id === id ? { ...w, status: 'rejected' } : w));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white font-sans flex flex-col justify-between">
      
      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-indigo-500/10 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-indigo-500 to-pink-500 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <span className="text-xl font-black tracking-tighter">Z</span>
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight bg-gradient-to-r from-white via-indigo-200 to-pink-200 bg-clip-text text-transparent">Z-oneApp</h1>
              <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest">
                {language === 'tl' ? 'PANOOD & KUMITA' : 'WATCH & EARN'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* EN/TL toggle */}
            <button 
              onClick={() => { playSfx('click'); setLanguage(prev => prev === 'en' ? 'tl' : 'en'); }}
              className="bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-white/10 transition cursor-pointer"
            >
              {language === 'en' ? '🇵🇭 Tagalog' : '🇺🇸 English'}
            </button>

            {/* Audio Toggle */}
            <button 
              onClick={() => setSoundEnabled(prev => !prev)}
              className="bg-white/5 hover:bg-white/10 p-1.5 rounded-lg border border-white/10 transition text-indigo-300"
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
          </div>
        </div>
      </header>

      {/* CORE VIEW */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-5 space-y-5">
        
        {/* WALLET BALANCE HERO CARD */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-pink-600 rounded-3xl p-6 shadow-2xl shadow-indigo-600/20 border border-white/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-indigo-100 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" />
                {language === 'tl' ? 'Kasalukuyang Balance' : 'Current Balance'}
              </span>
              <span className="bg-white/20 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-white/10 animate-pulse">
                ₱ {balance >= 100 ? 'READY TO GCASH' : '₱100 MINIMUM'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-4xl font-black tracking-tight flex items-baseline gap-1">
                <span className="text-2xl font-bold">₱</span>
                {balance.toFixed(2)}
              </div>
              <p className="text-[11px] text-indigo-100 font-medium">
                {language === 'tl' 
                  ? '*Simulated rewards sa panonood ng sponsored websites' 
                  : '*Simulated rewards for viewing sponsored websites'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button 
                onClick={() => { playSfx('click'); setActiveTab('withdraw'); }}
                className="bg-white text-slate-950 hover:bg-indigo-50 font-black text-xs uppercase tracking-wider py-2.5 rounded-xl transition transform active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>💳</span>
                <span>{language === 'tl' ? 'GCash Cashout' : 'GCash Cashout'}</span>
              </button>
              <button 
                onClick={() => { playSfx('click'); setActiveTab('guide'); }}
                className="bg-indigo-950/40 hover:bg-indigo-950/60 border border-white/15 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition transform active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>📥</span>
                <span>{language === 'tl' ? 'I-download ang App' : 'Download APK'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 🚀 DIRECT AUTOMATIC PACKAGE INSTALLER DOWNLOADER CARD */}
        <div id="apk-card" className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 text-white border border-indigo-500/30 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-amber-400 text-slate-950 p-1.5 rounded-lg font-black text-xs">APK</div>
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">
                  {language === 'tl' ? 'Direktang Installer (Apk)' : 'Direct App Installer (APK)'}
                </h4>
                <p className="text-[10px] text-slate-300">
                  {language === 'tl' ? 'Ligtas, mabilis, at hindi dadaan sa Play Store' : '100% Safe, fast, bypasses app store restrictions'}
                </p>
              </div>
            </div>
            <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-500/30">
              {language === 'tl' ? 'Inirerekomenda' : 'Recommended'}
            </span>
          </div>

          {downloadState === 'idle' && (
            <button
              onClick={() => startAutomaticDownload(activePwaGuideTab)}
              className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>
                {language === 'tl' ? 'I-DOWNLOAD ANG REAL Z-ONEAPP.APK' : 'DOWNLOAD GENUINE Z-ONEAPP.APK'}
              </span>
            </button>
          )}

          {downloadState === 'downloading' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-indigo-200 animate-pulse flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  {language === 'tl' ? 'Dina-download ang legit package...' : 'Downloading installer package...'}
                </span>
                <span className="text-amber-400 font-black">{downloadProgress}%</span>
              </div>
              
              <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden border border-white/5 p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-emerald-400 rounded-full transition-all duration-150"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-slate-400 font-semibold pt-1">
                <div className="flex gap-1">
                  <span>{language === 'tl' ? 'Bilis:' : 'Speed:'}</span>
                  <span className="text-white font-extrabold">{downloadSpeed}</span>
                </div>
                <div className="flex gap-1">
                  <span>{language === 'tl' ? 'Laki:' : 'Size:'}</span>
                  <span className="text-white font-extrabold">{downloadedSize} / 2.4 MB</span>
                </div>
              </div>
            </div>
          )}

          {downloadState === 'completed' && (
            <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-2xl space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="bg-emerald-500 text-slate-950 p-1.5 rounded-full shadow-lg">
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>
                <div>
                  <h5 className="text-xs font-black text-emerald-400 uppercase tracking-wide">
                    {language === 'tl' ? 'Tapos na ang Download!' : 'Download Successful!'}
                  </h5>
                  <p className="text-[10px] text-emerald-200/80 mt-0.5 font-bold">
                    {language === 'tl' ? 'Nai-save na ang Z-oneApp.apk sa iyong Downloads!' : 'Z-oneApp.apk successfully saved to your downloads folder!'}
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/40 p-3 rounded-xl space-y-1.5 text-[11px] text-slate-300 border border-slate-800 leading-relaxed font-semibold">
                <p className="font-extrabold text-amber-300">
                  {language === 'tl' ? '⚠️ LEGIT INSTALL GUIDE (HINDI MA-PARSING ERROR):' : '⚠️ HOW TO INSTALL CORRECTLY (NO PARSING ERROR):'}
                </p>
                <ul className="list-decimal pl-4 space-y-1 text-slate-300">
                  <li>{language === 'tl' ? 'I-click ang downloaded "Z-oneApp.apk" file sa iyong notification panel o sa File Manager / Downloads folder.' : 'Open the downloaded "Z-oneApp.apk" file from your browser notification panel or Android Files/Downloads app.'}</li>
                  <li>{language === 'tl' ? 'Kapag lumabas ang block o babala, piliin ang "Install Anyway" o i-on ang "Allow from this source" sa iyong Settings.' : 'If prompted with security settings, simply check "Allow installation from unknown sources" or click "Install Anyway".'}</li>
                  <li>{language === 'tl' ? 'I-click ang "Install" at mag-log in gamit ang iyong account para magpatuloy!' : 'Click "Install" to finish and launch the Z-oneApp shortcut directly from your homescreen!'}</li>
                </ul>
              </div>

              <button
                onClick={() => startAutomaticDownload(activePwaGuideTab)}
                className="w-full text-center text-[10px] font-black text-indigo-300 hover:text-indigo-200 transition uppercase tracking-wider border border-indigo-400/20 py-2 rounded-xl bg-indigo-500/5 hover:bg-indigo-500/10 cursor-pointer"
              >
                {language === 'tl' ? '🔄 I-download Muli ang Package' : '🔄 Redownload Installer Package'}
              </button>
            </div>
          )}
        </div>

        {/* NAVIGATION TABS */}
        <div className="bg-slate-900 p-1.5 rounded-2xl border border-white/5 flex gap-1">
          <button 
            onClick={() => { playSfx('click'); setActiveTab('earn'); }}
            className={`flex-1 text-center py-2.5 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'earn' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{language === 'tl' ? 'Manood' : 'Earn'}</span>
          </button>
          <button 
            onClick={() => { playSfx('click'); setActiveTab('withdraw'); }}
            className={`flex-1 text-center py-2.5 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'withdraw' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>{language === 'tl' ? 'Cashout' : 'GCash'}</span>
          </button>
          <button 
            onClick={() => { playSfx('click'); setActiveTab('refer'); }}
            className={`flex-1 text-center py-2.5 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'refer' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{language === 'tl' ? 'Referral' : 'Refer'}</span>
          </button>
        </div>

        {/* VIEW CONDITIONAL BLOCKS */}

        {/* 1. EARN VIEW */}
        {activeTab === 'earn' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-300">
                {language === 'tl' ? 'Mga Available na Sponsor Websites' : 'Available Sponsored Campaigns'}
              </h3>
              <span className="text-[10px] text-slate-400 font-bold">
                {campaigns.length} {language === 'tl' ? 'Website na magagamit' : 'Websites available'}
              </span>
            </div>

            <div className="space-y-3">
              {campaigns.map((camp) => {
                const isDone = completedCampaigns.includes(camp.id);
                return (
                  <div 
                    key={camp.id} 
                    className={`bg-slate-900 p-4 rounded-2xl border transition-all ${
                      isDone ? 'border-emerald-500/20 opacity-70' : 'border-indigo-500/10 hover:border-indigo-500/30'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-indigo-500/10 text-indigo-300 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border border-indigo-500/20">
                            {camp.category}
                          </span>
                          {isDone && (
                            <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-0.5">
                              <CheckCircle className="w-2.5 h-2.5" />
                              {language === 'tl' ? 'TAPOS NA' : 'DONE'}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-black text-white">{camp.title}</h4>
                        <p className="text-xs text-slate-400 leading-normal">{camp.description}</p>
                      </div>

                      <div className="text-right space-y-1 shrink-0">
                        <div className="text-xs text-slate-400 font-bold flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{camp.duration}s</span>
                        </div>
                        <div className="text-sm font-black text-amber-400">
                          + ₱{camp.reward.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/5 text-[10px] text-slate-500 font-bold">
                      <div>👁️ {camp.views} {language === 'tl' ? 'na nanood' : 'viewers'}</div>
                      <button
                        onClick={() => {
                          playSfx('click');
                          setActiveViewingCampaign(camp);
                          setViewerTimeLeft(camp.duration);
                          setViewerProgress(100);
                          setIsViewerSuccessful(false);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 transition ${
                          isDone 
                            ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 cursor-pointer' 
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transform active:scale-95 cursor-pointer'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isDone ? (language === 'tl' ? 'PANOORIN MULI' : 'RE-WATCH') : (language === 'tl' ? 'PANOORIN' : 'VIEW')}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. WITHDRAW PORTAL */}
        {activeTab === 'withdraw' && (
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-indigo-300">
              {language === 'tl' ? 'GCash Cashout Gateway' : 'GCash Cashout Portal'}
            </h3>

            {/* Withdraw Success Alert */}
            {withdrawSuccess && (
              <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-2xl text-center space-y-3">
                <div className="bg-emerald-500 text-slate-950 p-2 rounded-full w-10 h-10 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-emerald-400 uppercase tracking-wide">
                    {language === 'tl' ? 'Matagumpay na Naisumite!' : 'Cashout Request Submitted!'}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    {language === 'tl' 
                      ? 'Ang iyong request ay kasalukuyang pinoproseso ng sponsor at dadating sa iyong GCash sa loob ng 24 oras.' 
                      : 'Your transfer is being processed by the sponsor system and will arrive in your GCash wallet within 24 hours.'}
                  </p>
                </div>
                <button 
                  onClick={() => { playSfx('click'); setWithdrawSuccess(false); }}
                  className="bg-white/5 hover:bg-white/10 text-xs text-indigo-300 font-extrabold tracking-wider uppercase py-2 px-6 rounded-xl border border-white/5 cursor-pointer"
                >
                  {language === 'tl' ? 'OKAY, SALAMAT' : 'DISMISS'}
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCashoutSubmit} className="bg-slate-900 p-5 rounded-2xl border border-white/5 space-y-4">
              <div className="bg-blue-600/10 p-3 rounded-xl border border-blue-500/20 flex items-start gap-2 text-xs leading-relaxed text-blue-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
                <p>
                  {language === 'tl' 
                    ? 'Tiyakin na tama ang iyong impormasyon upang maiwasan ang maling pagpapadala ng simulated GCash.' 
                    : 'Ensure your account details match your GCash registration to prevent transactional failures.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {language === 'tl' ? 'GCash Account Name' : 'GCash Registered Name'}
                </label>
                <input 
                  type="text" 
                  value={gcashName}
                  onChange={(e) => setGcashName(e.target.value)}
                  placeholder="e.g. JUAN DELA CRUZ"
                  required
                  className="w-full bg-slate-950 text-white border border-white/10 px-4 py-3 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {language === 'tl' ? 'GCash Phone Number (11-Digits)' : 'GCash Mobile Number (11-Digits)'}
                </label>
                <input 
                  type="tel" 
                  maxLength={11}
                  value={gcashNumber}
                  onChange={(e) => setGcashNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 09123456789"
                  required
                  className="w-full bg-slate-950 text-white border border-white/10 px-4 py-3 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {language === 'tl' ? 'Halaga na Iwiwithdraw' : 'Select Withdrawal Amount'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[100, 250, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => { playSfx('click'); setSelectedWithdrawAmount(amt); }}
                      className={`py-3 rounded-xl font-black text-xs transition cursor-pointer border ${
                        selectedWithdrawAmount === amt 
                          ? 'bg-gradient-to-r from-indigo-600 to-pink-600 text-white border-transparent' 
                          : 'bg-slate-950 text-slate-300 border-white/5 hover:border-white/20'
                      }`}
                    >
                      ₱{amt}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isWithdrawing || balance < selectedWithdrawAmount}
                className={`w-full text-center font-black text-xs uppercase tracking-wider py-4 rounded-xl transition ${
                  balance < selectedWithdrawAmount
                    ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white cursor-pointer shadow-lg shadow-indigo-600/10 transform active:scale-[0.98]'
                }`}
              >
                {isWithdrawing 
                  ? (language === 'tl' ? 'KASALUKUYANG IPINOPROSESO...' : 'PROCESSING TRANSACTION...') 
                  : (balance < selectedWithdrawAmount 
                    ? (language === 'tl' ? 'HINDI SAPAT ANG BALANCE' : 'INSUFFICIENT BALANCE')
                    : (language === 'tl' ? `I-WITHDRAW ANG ₱${selectedWithdrawAmount}.00` : `WITHDRAW ₱${selectedWithdrawAmount}.00`))}
              </button>
            </form>

            {/* History */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {language === 'tl' ? 'Karanasan sa Pag-withdraw' : 'Recent Transaction Logs'}
              </h4>
              <div className="bg-slate-900 rounded-2xl border border-white/5 overflow-hidden">
                {cashoutHistory.map((item, index) => (
                  <div key={item.id} className={`flex items-center justify-between p-4 ${index > 0 ? 'border-t border-white/5' : ''}`}>
                    <div className="space-y-1">
                      <div className="text-xs font-black text-white">{item.name}</div>
                      <div className="text-[10px] text-slate-500 font-bold">{item.number} • {item.date}</div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-xs font-black text-white">₱{item.amount.toFixed(2)}</div>
                      <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        item.status === 'approved' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : item.status === 'rejected'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                      }`}>
                        {item.status === 'approved' 
                          ? (language === 'tl' ? 'IPINADALA NA' : 'SUCCESS') 
                          : item.status === 'rejected'
                            ? (language === 'tl' ? 'HINDI TINANGGAP' : 'REJECTED')
                            : (language === 'tl' ? 'PINOPROSESO' : 'PENDING')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. REFERRAL */}
        {activeTab === 'refer' && (
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-indigo-300">
              {language === 'tl' ? 'Sistema ng Referral' : 'Referral Commission Engine'}
            </h3>

            <div className="bg-slate-900 p-5 rounded-2xl border border-white/5 text-center space-y-4">
              <div className="bg-indigo-600/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-indigo-400">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-white">
                  {language === 'tl' ? 'Kumita ng ₱20.00 Bawat Imbitasyon' : 'Earn ₱20.00 per Successful Invitation'}
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  {language === 'tl' 
                    ? 'Makakatanggap ka ng komisyon kapag sumali ang iyong kaibigan at nag-download ng official Z-oneApp.' 
                    : 'Commission credits will be added synchronously when your referee completes their app download.'}
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-white/5 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-300 truncate text-left">
                  {window.location.origin}/?ref=Z48293
                </span>
                <button
                  type="button"
                  onClick={copyReferralLink}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-lg cursor-pointer transition shrink-0"
                >
                  {copiedReferral ? (language === 'tl' ? 'NAKOPYA NA!' : 'COPIED!') : (language === 'tl' ? 'KOPYAHIN' : 'COPY')}
                </button>
              </div>
            </div>

            {/* Referrals history list */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {language === 'tl' ? 'Iyong mga Inimbita' : 'Your Successful Invites'}
              </h4>
              <div className="bg-slate-900 rounded-2xl border border-white/5 overflow-hidden">
                {referrals.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <div className="bg-slate-800 p-1.5 rounded-full text-indigo-300 font-extrabold text-xs text-center w-7 h-7">
                        {item.username[0].toUpperCase()}
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-xs font-black text-white">{item.username}</div>
                        <div className="text-[9px] text-slate-500 font-bold">{item.date}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-emerald-400">+ ₱{item.bonus.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* FOOTER & SECRET ADMIN PORTAL TRIGGERS */}
      <footer className="mt-8 bg-slate-950/80 border-t border-indigo-500/5 py-6 text-center space-y-4">
        <div className="max-w-md mx-auto px-4 flex flex-col items-center justify-center gap-2">
          <p className="text-[10px] text-slate-500 font-bold">
            © 2026 Z-oneApp Studio. All rights reserved.
          </p>
          <div className="flex gap-4">
            <button 
              onClick={() => { playSfx('click'); setShowAdminPanel(true); }}
              className="text-[10px] text-slate-600 hover:text-indigo-400 font-bold uppercase tracking-wider underline cursor-pointer"
            >
              {language === 'tl' ? '🛠️ Admin Panel' : '🛠️ Admin Panel'}
            </button>
          </div>
        </div>
      </footer>

      {/* ========================================= */}
      {/* 🚀 SIMULATED WEB VIEWER POPUP OVERLAY */}
      {/* ========================================= */}
      <AnimatePresence>
        {activeViewingCampaign && (
          <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col justify-between">
            {/* Countdown timer bar */}
            <div className="bg-slate-900 border-b border-white/5 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-300">
                    {language === 'tl' ? 'Kasalukuyang Nanonood' : 'Actively Viewing Website'}
                  </h3>
                  <p className="text-[10px] text-slate-500 truncate max-w-[180px] font-semibold">{activeViewingCampaign.url}</p>
                </div>
              </div>

              {/* Countdown counter ring */}
              <div className="flex items-center gap-2 bg-slate-950/50 px-3 py-1.5 rounded-full border border-white/5">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span className="text-sm font-black text-amber-400">{viewerTimeLeft}s</span>
              </div>
            </div>

            {/* Timer linear progress indicator */}
            <div className="h-1 bg-white/10 w-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-1000"
                style={{ width: `${viewerProgress}%` }}
              />
            </div>

            {/* Simulated Website iframe viewport */}
            <div className="flex-1 bg-slate-100 text-slate-900 relative flex flex-col overflow-hidden">
              {/* Fake web browser UI */}
              <div className="bg-slate-200 border-b border-slate-300 px-3 py-2 flex items-center gap-2 text-xs text-slate-500 select-none">
                <div className="flex gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                </div>
                <div className="flex-1 bg-white px-3 py-1 rounded-md text-[11px] font-bold truncate flex items-center gap-1.5 border border-slate-300 text-slate-700">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>{activeViewingCampaign.url}</span>
                </div>
              </div>

              {/* Scrolling Content Canvas */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
                <div className="text-center space-y-2 border-b border-slate-200 pb-5">
                  <span className="bg-indigo-100 text-indigo-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                    Sponsor Web Advertisement
                  </span>
                  <h1 className="text-xl font-black text-slate-950">{activeViewingCampaign.title}</h1>
                  <p className="text-xs text-slate-500 font-bold">
                    {language === 'tl' 
                      ? 'Inirerekomenda ng Z-oneApp Sponsor Solutions' 
                      : 'Recommended by Z-oneApp Sponsor Solutions'}
                  </p>
                </div>

                <div className="space-y-4 text-xs text-slate-700 leading-relaxed font-semibold">
                  <p>
                    {language === 'tl'
                      ? 'Salamat sa pagbisita sa aming partner sponsor. Mangyaring manatili sa pahinang ito hanggang matapos ang countdown timer upang makuha ang iyong simulated GCash rewards credit.'
                      : 'Thank you for visiting our partner sponsor. Please keep this interactive tab active until the countdown ends to securely acquire your reward points.'}
                  </p>
                  
                  {/* Decorative Simulated Interactive Cards */}
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl space-y-2">
                    <h4 className="text-xs font-black text-indigo-950 uppercase flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{language === 'tl' ? 'Espesyal na Promosyon' : 'Exclusive Partner Bonus'}</span>
                    </h4>
                    <p className="text-[11px] text-indigo-800">
                      {language === 'tl' 
                        ? 'Mag-click at mag-scroll sa mga link upang mas mapabilis ang transaksyon!' 
                        : 'Explore this layout and interact with elements to fast track confirmation.'}
                    </p>
                  </div>

                  <div className="space-y-2 pt-4">
                    <h3 className="font-extrabold text-slate-900">{language === 'tl' ? 'Paano Gumagana:' : 'System Instructions:'}</h3>
                    <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                      <li>{language === 'tl' ? 'Huwag isasara ang simulated tab na ito habang tumatakbo ang timer.' : 'Avoid closing or minimizing this viewport while countdown is active.'}</li>
                      <li>{language === 'tl' ? 'Maaari mong i-scroll ang pahinang ito para magbasa.' : 'You can read or browse this layout freely.'}</li>
                      <li>{language === 'tl' ? 'Awtomatikong maidaragdag ang pera kapag natapos ang segundo.' : 'Cash points are deposited synchronously when timer hits zero.'}</li>
                    </ul>
                  </div>
                </div>

                {/* Simulated Content Image blocks */}
                <div className="grid grid-cols-2 gap-3 pt-6">
                  <div className="bg-slate-200 h-24 rounded-xl flex items-center justify-center font-black text-xs text-slate-500 border border-slate-300">
                    Promo Ad Banner A
                  </div>
                  <div className="bg-slate-200 h-24 rounded-xl flex items-center justify-center font-black text-xs text-slate-500 border border-slate-300">
                    Promo Ad Banner B
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="bg-slate-900 border-t border-white/5 px-4 py-4 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {language === 'tl' ? 'Reward:' : 'Reward:'} <span className="text-amber-400 font-black">₱{activeViewingCampaign.reward.toFixed(2)}</span>
              </span>
              
              <button
                onClick={() => {
                  playSfx('click');
                  setActiveViewingCampaign(null);
                }}
                className="bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-widest cursor-pointer"
              >
                {language === 'tl' ? 'I-CANCEL' : 'CANCEL'}
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================= */}
      {/* 🛠️ ADMIN PORTAL POPUP DIALOG */}
      {/* ========================================= */}
      <AnimatePresence>
        {showAdminPanel && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-indigo-500/20 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              
              {/* Header */}
              <div className="p-4 bg-slate-950 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    {language === 'tl' ? 'Admin Controller Portal' : 'Admin Controller Portal'}
                  </h3>
                </div>
                <button 
                  onClick={() => { playSfx('click'); setShowAdminPanel(false); setIsAdminAuthenticated(false); setAdminPasscode(''); }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                
                {/* Auth Screen */}
                {!isAdminAuthenticated ? (
                  <form onSubmit={handleAdminAuth} className="space-y-4">
                    <p className="text-xs text-slate-400 font-medium">
                      {language === 'tl' 
                        ? 'Ipasok ang admin passcode para ma-access ang mga cashout requests at magdagdag ng sponsored campaigns.' 
                        : 'Enter the admin control passcode to manage cashout transactions and add sponsor links.'}
                    </p>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Admin Passcode</label>
                      <input 
                        type="password"
                        placeholder="Default is: admin123"
                        value={adminPasscode}
                        onChange={(e) => setAdminPasscode(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 px-4 py-3 rounded-xl text-xs font-bold text-center focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    {adminError && <p className="text-xs text-red-400 font-bold text-center">{adminError}</p>}
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                    >
                      Authenticate Admin
                    </button>
                  </form>
                ) : (
                  // Admin Authenticated View
                  <div className="space-y-6">
                    
                    {/* Stat Cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-950 p-3 rounded-xl border border-white/5 text-center">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Total Campaigns</div>
                        <div className="text-xl font-black text-white">{campaigns.length}</div>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-white/5 text-center">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Cashouts Queued</div>
                        <div className="text-xl font-black text-white">
                          {cashoutHistory.filter(c => c.status === 'pending').length}
                        </div>
                      </div>
                    </div>

                    {/* Pending Cashouts Manager */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300">
                        Pending Cashout Transfers ({cashoutHistory.filter(c => c.status === 'pending').length})
                      </h4>
                      
                      <div className="space-y-2">
                        {cashoutHistory.filter(c => c.status === 'pending').length === 0 ? (
                          <p className="text-xs text-slate-500 font-bold text-center py-3">Walang nakabinbing requests.</p>
                        ) : (
                          cashoutHistory.filter(c => c.status === 'pending').map((item) => (
                            <div key={item.id} className="bg-slate-950 p-3 rounded-xl border border-white/5 space-y-2">
                              <div className="flex justify-between text-xs">
                                <div>
                                  <span className="font-black text-white">{item.name}</span>
                                  <span className="text-slate-500 block text-[10px] font-bold">{item.number}</span>
                                </div>
                                <span className="font-black text-amber-400">₱{item.amount.toFixed(2)}</span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApproveWithdrawal(item.id)}
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-1.5 rounded-lg text-[10px] font-black uppercase cursor-pointer text-white"
                                >
                                  Approve / Send
                                </button>
                                <button
                                  onClick={() => handleRejectWithdrawal(item.id)}
                                  className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 py-1.5 rounded-lg text-[10px] font-black uppercase cursor-pointer border border-red-500/10"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Add Sponsor Campaign */}
                    <form onSubmit={handleAddCampaign} className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300">
                        Create Sponsor Website Campaign
                      </h4>
                      <input 
                        type="text"
                        placeholder="Campaign Title (e.g. Lazada Deal)"
                        value={newCampaignTitle}
                        onChange={(e) => setNewCampaignTitle(e.target.value)}
                        className="w-full bg-slate-900 border border-white/5 px-3 py-2 rounded-lg text-xs font-bold focus:outline-none"
                        required
                      />
                      <input 
                        type="url"
                        placeholder="Sponsor URL (https://...)"
                        value={newCampaignUrl}
                        onChange={(e) => setNewCampaignUrl(e.target.value)}
                        className="w-full bg-slate-900 border border-white/5 px-3 py-2 rounded-lg text-xs font-bold focus:outline-none"
                        required
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 font-bold uppercase">Reward (₱)</label>
                          <input 
                            type="number"
                            step="0.10"
                            value={newCampaignReward}
                            onChange={(e) => setNewCampaignReward(parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-white/5 px-3 py-2 rounded-lg text-xs font-bold focus:outline-none"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 font-bold uppercase">Timer (sec)</label>
                          <input 
                            type="number"
                            value={newCampaignDuration}
                            onChange={(e) => setNewCampaignDuration(parseInt(e.target.value) || 10)}
                            className="w-full bg-slate-900 border border-white/5 px-3 py-2 rounded-lg text-xs font-bold focus:outline-none"
                            required
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-500 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer"
                      >
                        Add Campaign
                      </button>
                    </form>

                    {/* Delete Campaigns Manager */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300">
                        Manage Campaigns List
                      </h4>
                      <div className="space-y-1.5">
                        {campaigns.map((c) => (
                          <div key={c.id} className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-white/5">
                            <span className="text-xs font-bold truncate pr-3">{c.title} (₱{c.reward.toFixed(2)})</span>
                            <button
                              onClick={() => handleDeleteCampaign(c.id)}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
