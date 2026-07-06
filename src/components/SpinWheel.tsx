import React, { useState, useEffect } from 'react';
import { Sparkles, HelpCircle, AlertCircle, Play, RefreshCw, Clock, Gift, Info } from 'lucide-react';

interface SpinWheelProps {
  token: string | null;
  onAccessGranted: () => void;
}

interface SpinStatus {
  isExpiredUser: boolean;
  inWindow: boolean;
  pstHour: number;
  hasSpunToday: boolean;
  globalWinnerExists: boolean;
  freeAccessExpiresAt: string | null;
  freeAccessActive: boolean;
  todayStr: string;
}

const SEGMENTS = [
  { label: '₱50.00', color: '#6366f1', text: '#ffffff', isReal: false }, // Slice 0
  { label: 'COME BACK TOMORROW', color: '#f43f5e', text: '#ffffff', isReal: true }, // Slice 1 (Lose)
  { label: '₱100.00', color: '#10b981', text: '#ffffff', isReal: false }, // Slice 2
  { label: '3-HOURS ACCESS', color: '#eab308', text: '#0f172a', isReal: true, isWin: true }, // Slice 3 (Win!)
  { label: '₱250.00', color: '#a855f7', text: '#ffffff', isReal: false }, // Slice 4
  { label: 'COME BACK TOMORROW', color: '#f43f5e', text: '#ffffff', isReal: true }, // Slice 5 (Lose)
  { label: '₱500.00', color: '#3b82f6', text: '#ffffff', isReal: false }, // Slice 6
  { label: '₱1,000.00', color: '#ec4899', text: '#ffffff', isReal: false }, // Slice 7
];

export default function SpinWheel({ token, onAccessGranted }: SpinWheelProps) {
  const [status, setStatus] = useState<SpinStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [hasWon, setHasWon] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/user/spin-status', {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to fetch spin status');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error fetching spin status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [token]);

  const handleSpin = async () => {
    if (spinning || !token || !status) return;

    try {
      setSpinning(true);
      setError(null);
      setResultMessage(null);

      const res = await fetch('/api/user/spin-wheel', {
        method: 'POST',
        headers: { 'Authorization': token }
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || 'Something went wrong while spinning.');
        setSpinning(false);
        return;
      }

      const data = await res.json();

      // Determine target slice
      let targetSliceIndex = 1; // Default "Come back tomorrow"
      if (data.won) {
        targetSliceIndex = 3; // "3-Hours Access"
      } else {
        // Randomly pick lose slice index 1 or 5
        targetSliceIndex = Math.random() < 0.5 ? 1 : 5;
      }

      // Calculate new rotation degrees to land on targetSliceIndex
      // Pointer is at the top (270 degrees)
      const numSlices = SEGMENTS.length;
      const degreesPerSlice = 360 / numSlices;
      const extraSpins = 6 + Math.floor(Math.random() * 3); // 6 to 8 full spins
      
      // We want target slice center to be at the top pointer (which is at 270 degrees)
      // Standard angle calculation:
      const sliceCenterOffset = degreesPerSlice / 2;
      const targetAngle = 360 - (targetSliceIndex * degreesPerSlice) - sliceCenterOffset;
      const finalRotation = (extraSpins * 360) + targetAngle;

      setRotation(finalRotation);

      // Wait for spin animation to finish (5 seconds)
      setTimeout(() => {
        setSpinning(false);
        setHasWon(data.won);
        setResultMessage(data.message);
        
        // Update local status representation
        setStatus(prev => {
          if (!prev) return null;
          return {
            ...prev,
            hasSpunToday: true,
            freeAccessActive: data.won,
            freeAccessExpiresAt: data.won ? data.freeAccessExpiresAt : prev.freeAccessExpiresAt
          };
        });

        // If won, trigger refresh on App.tsx so they instantly get active dashboard
        if (data.won) {
          onAccessGranted();
        }
      }, 5000);

    } catch (err) {
      console.error(err);
      setError('Technical network error during spinning.');
      setSpinning(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center text-slate-200 space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-400">Pina-process ang Spin Wheel eligibility...</p>
      </div>
    );
  }

  // Ensure they are expired to see this
  if (!status || !status.isExpiredUser) {
    return null; // Not shown if they have active regular subscription
  }

  // Compute countdown text if active free access
  const getRemainingFreeTimeText = () => {
    if (!status.freeAccessExpiresAt) return '';
    const diff = new Date(status.freeAccessExpiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m natitira`;
  };

  return (
    <div id="expired-spin-wheel-section" className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 rounded-3xl p-6 md:p-8 text-white space-y-6 shadow-2xl relative overflow-hidden max-w-lg mx-auto">
      
      {/* Decorative light beam */}
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER INFO */}
      <div className="text-center space-y-2 relative z-10">
        <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-indigo-500/30">
          🎰 EXPIRED USER SPECIAL EVENT
        </span>
        <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400 bg-clip-text text-transparent">
          Daily Lucky Spin Wheel
        </h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
          Dahil expired na ang iyong access, binibigyan ka ng Z-oneApp ng libreng pagkakataon bawat araw para manalo ng <span className="text-yellow-400 font-extrabold">3-Hours Free Access</span>!
        </p>
      </div>

      {/* RENDER CONDITIONS */}
      {status.freeAccessActive ? (
        // ACTIVE FREE ACCESS BANNER
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-3 relative z-10">
          <div className="h-10 w-10 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Clock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-emerald-400 text-sm">Mayroon kang Aktibong Libreng Access!</h4>
            <p className="text-slate-300 text-[11px] font-medium leading-relaxed">
              Nanalo ka ng 3-Hour access! Buksan na agad ang Homepage at mag-view ng campaigns para hindi masayang ang oras!
            </p>
          </div>
          <div className="bg-slate-900/60 inline-block px-4 py-1.5 rounded-full border border-white/5 font-mono text-xs font-bold text-yellow-300">
            ⏳ Valid Hanggang: {new Date(status.freeAccessExpiresAt || '').toLocaleTimeString('fil-PH', { hour: '2-digit', minute: '2-digit' })} ({getRemainingFreeTimeText()})
          </div>
        </div>
      ) : !status.inWindow ? (
        // OUTSIDE WINDOW ERROR
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 text-center space-y-3 relative z-10">
          <div className="h-10 w-10 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-rose-400 text-sm">Sarado pa ang Spin Wheel</h4>
            <p className="text-slate-300 text-xs font-semibold leading-relaxed">
              Ang Spin Wheel ay lumalabas lamang mula <span className="text-yellow-400 font-extrabold">6:00 AM hanggang 6:00 PM PST</span> araw-araw.
            </p>
            <p className="text-slate-500 text-[10px] font-bold">
              Bumalik muli sa tamang oras upang makasali sa libreng draw!
            </p>
          </div>
        </div>
      ) : status.hasSpunToday && !spinning && !resultMessage ? (
        // ALREADY SPUN TODAY
        <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 text-center space-y-3 relative z-10">
          <div className="h-10 w-10 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Info className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-slate-300 text-sm">Naka-spin ka na Ngayong Araw</h4>
            <p className="text-slate-400 text-xs font-semibold select-none max-w-xs mx-auto leading-relaxed">
              Please come back tomorrow 6am to 6pm. Mayroon ka ulit libreng 1 spin bukas para subukan ang iyong kapalaran!
            </p>
          </div>
        </div>
      ) : (
        // SPIN WHEEL INTERACTIVE SECTION
        <div className="flex flex-col items-center space-y-6 relative z-10">
          
          {/* THE PHYSICAL SPINNING WHEEL */}
          <div className="relative w-[280px] h-[280px] md:w-[310px] md:h-[310px] flex items-center justify-center">
            
            {/* Red Pointer Arrow at the top */}
            <div className="absolute top-[-10px] z-30 flex flex-col items-center">
              <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-rose-500 filter drop-shadow-md" />
              <div className="w-2.5 h-2.5 bg-rose-600 rounded-full -mt-1" />
            </div>

            {/* Glowing outer ring */}
            <div className="absolute inset-0 rounded-full border-8 border-slate-800 bg-slate-950 shadow-[0_0_20px_rgba(99,102,241,0.3)] pointer-events-none" />

            {/* Spinning circle block */}
            <div 
              className="w-[260px] h-[260px] md:w-[290px] md:h-[290px] rounded-full overflow-hidden relative shadow-inner select-none transition-transform duration-[5000ms] cubic-bezier(0.2, 0.8, 0.1, 1)"
              style={{ 
                transform: `rotate(${rotation}deg)`,
                transitionTimingFunction: 'cubic-bezier(0.1, 0.8, 0.1, 1)'
              }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {SEGMENTS.map((seg, index) => {
                  const angle = 360 / SEGMENTS.length;
                  const startAngle = index * angle;
                  const endAngle = startAngle + angle;
                  
                  // Convert polar coordinates to Cartesian for SVG path
                  const radius = 50;
                  const cx = 50;
                  const cy = 50;
                  
                  const rad = (deg: number) => (deg - 90) * Math.PI / 180;
                  const x1 = cx + radius * Math.cos(rad(startAngle));
                  const y1 = cy + radius * Math.sin(rad(startAngle));
                  const x2 = cx + radius * Math.cos(rad(endAngle));
                  const y2 = cy + radius * Math.sin(rad(endAngle));
                  
                  const largeArcFlag = angle > 180 ? 1 : 0;
                  const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                  // Calculate text placement angle
                  const textAngle = startAngle + (angle / 2);
                  const textRad = (textAngle - 90) * Math.PI / 180;
                  const textDist = 32; // Distance from center
                  const tx = cx + textDist * Math.cos(textRad);
                  const ty = cy + textDist * Math.sin(textRad);

                  return (
                    <g key={index}>
                      <path d={pathData} fill={seg.color} stroke="#1e293b" strokeWidth="0.5" />
                      
                      {/* Text label rotated outward from center */}
                      <text
                        x={tx}
                        y={ty}
                        fill={seg.text}
                        fontSize={seg.isReal && seg.isWin ? "2.6" : "3.0"}
                        fontWeight="900"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                        transform={`rotate(${textAngle}, ${tx}, ${ty})`}
                      >
                        {seg.label}
                      </text>
                    </g>
                  );
                })}
                {/* Outer decorative dots */}
                <circle cx="50" cy="50" r="48" fill="none" stroke="#ffffff" strokeWidth="0.5" strokeDasharray="2,2" />
              </svg>
            </div>

            {/* Inner Gold Hub/Spindle (Pressable spin button) */}
            <button
              onClick={handleSpin}
              disabled={spinning || status.hasSpunToday}
              className={`absolute h-16 w-16 md:h-20 md:w-20 rounded-full border-4 border-slate-900 flex flex-col items-center justify-center shadow-xl select-none z-20 transition group cursor-pointer ${
                spinning 
                  ? 'bg-slate-800 text-slate-500 scale-95' 
                  : status.hasSpunToday 
                    ? 'bg-slate-850 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 hover:scale-105 active:scale-95'
              }`}
            >
              {spinning ? (
                <RefreshCw className="w-5 h-5 md:w-6 md:h-6 animate-spin text-slate-400" />
              ) : (
                <div className="text-center">
                  <Play className="w-4 h-4 md:w-5 md:h-5 fill-current mx-auto rotate-90" />
                  <span className="text-[9px] md:text-[10px] font-black tracking-tighter block mt-0.5">SPIN</span>
                </div>
              )}
            </button>
          </div>

          {/* SPIN ERROR OR RESULT BANNER */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold p-3 rounded-xl flex items-center gap-2 max-w-sm text-center">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {resultMessage && (
            <div className={`p-4 rounded-2xl border text-center space-y-2 max-w-sm animate-bounce ${
              hasWon 
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-100' 
                : 'bg-rose-500/10 border-rose-400/20 text-rose-200'
            }`}>
              <div className="flex items-center justify-center gap-1.5 font-black text-sm">
                {hasWon ? '🎉 CONGRATULATIONS!' : '😔 SALAMAT SA PAG SPIN!'}
              </div>
              <p className="text-xs font-bold leading-relaxed">{resultMessage}</p>
              {hasWon && (
                <p className="text-[10px] font-extrabold text-yellow-300 animate-pulse">
                  ⚡ I-refresh ang iyong page o pumunta sa Homepage para magsimulang mag-earn!
                </p>
              )}
            </div>
          )}

          {/* MARKETING DISCLOSURE NOTE */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 flex items-start gap-2.5 max-w-sm text-[10px] text-slate-400 leading-relaxed font-semibold">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-indigo-300 font-extrabold block">Gabay sa Spin Wheel:</span>
              <span>
                Ang cash amounts na nakikita sa gulong ay para lamang sa disenyo at hindi aktwal na premyo. Tanging ang <span className="text-yellow-400 font-black">3-Hours Free Access</span> at <span className="text-rose-400 font-black">Please Come Back Tomorrow</span> ang tunay na lalabas. Sa lahat ng expired users, tanging isang maswerteng tao lang ang makakakuha ng libreng access kada araw!
              </span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
