import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Gift, 
  Copy, 
  Check, 
  UserPlus, 
  Sparkles,
  RefreshCw,
  Award,
  Download,
  Trophy
} from 'lucide-react';
import { ReferralFriend } from '../types';
import { soundEffects } from '../utils/audio';
import { ReferralWithdrawalModal, ReferralWithdrawalItem } from './ReferralWithdrawalModal';

interface ReferralPanelProps {
  referralCode: string;
  referredFriends: ReferralFriend[];
  token: string | null;
  onRefreshProfile: () => Promise<void>;
  triggerNotification: (message: string, type: 'success' | 'info' | 'error') => void;
  language?: 'en' | 'tl';
}

export default function ReferralPanel({
  referralCode,
  referredFriends,
  token,
  onRefreshProfile,
  triggerNotification,
  language = 'en'
}: ReferralPanelProps) {
  const isTl = language === 'tl';
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState<string | null>(null);
  
  // Modal for Success Withdrawal Banner
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalItems, setWithdrawalItems] = useState<ReferralWithdrawalItem[]>([]);
  const [referrerName, setReferrerName] = useState<string>('');

  const fetchReferralWithdrawals = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/user/referral-withdrawals', {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        const result = await res.json();
        setWithdrawalItems(result.referralWithdrawals || []);
        if (result.referrerName) setReferrerName(result.referrerName);
      }
    } catch (e) {
      console.error('Error fetching referral withdrawals:', e);
    }
  };

  useEffect(() => {
    if (token) {
      fetchReferralWithdrawals();
    }
  }, [token, referredFriends]);

  // Generate unique referral link
  const getReferralLink = () => {
    const origin = window.location.origin || 'https://ais-dev-3ztivd55eegu63xdj47ngy-124896488866.asia-southeast1.run.app';
    return `${origin}/?ref=${referralCode || 'REF-GUEST'}`;
  };

  // Copy handler
  const handleCopy = () => {
    const link = getReferralLink();
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      triggerNotification(isTl ? '📋 Naka-kopya ang Referral link!' : '📋 Referral link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      setCopied(true);
      triggerNotification(isTl ? '📋 Naka-kopya ang Referral link!' : '📋 Referral link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // Simulate inviting a friend via Backend APIs
  const simulateInviteFriend = async () => {
    if (!token) {
      triggerNotification(isTl ? '⚠️ Mangyaring mag-login muna para subukan ang pag-invite.' : '⚠️ Please log in first to simulate referrals.', 'error');
      return;
    }
    setSimulating('invite');
    try {
      const res = await fetch('/api/admin/simulate-mock-friend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ referrerId: token })
      });
      if (res.ok) {
        triggerNotification(isTl ? '🎉 Simula: May bagong sumuporta sa iyo! Pumasok siya gamit ang iyong referral link.' : '🎉 Simulation: A new friend has joined using your referral link.', 'success');
        await onRefreshProfile(); // Sync parents
      } else {
        triggerNotification(isTl ? '⚠️ Failed to simulate friend join.' : '⚠️ Failed to simulate friend join.', 'error');
      }
    } catch (e) {
      console.error(e);
      triggerNotification(isTl ? '⚠️ Connection error.' : '⚠️ Connection error.', 'error');
    } finally {
      setSimulating(null);
    }
  };

  // Simulate friend earning via Backend APIs
  const simulateFriendEarnings = async (friendId: string) => {
    setSimulating(friendId);
    try {
      const res = await fetch('/api/admin/simulate-friend-earnings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ friendId })
      });
      if (res.ok) {
        triggerNotification(isTl ? '💸 +₱150.00 simulation tasks completed by your referred friend!' : '💸 +₱150.00 simulation tasks completed by your referred friend!', 'success');
        await onRefreshProfile(); // reload profile immediately
      } else {
        triggerNotification(isTl ? '⚠️ Failed to add simulated earnings.' : '⚠️ Failed to add simulated earnings.', 'error');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(null);
    }
  };

  // Simulate friend successful withdrawal for generating Success Withdrawal Banner
  const simulateFriendWithdrawal = async (friendId: string) => {
    setSimulating(`with-${friendId}`);
    try {
      const res = await fetch('/api/admin/simulate-friend-withdrawal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ friendId, amount: 500 })
      });
      if (res.ok) {
        triggerNotification(isTl ? '🎉 Simula: Nakapag-withdraw si friend ng ₱500.00! Pwede mo nang i-download ang Success Withdrawal Banner.' : '🎉 Friend withdrawal simulated! You can now download the Success Withdrawal Banner.', 'success');
        await onRefreshProfile();
        await fetchReferralWithdrawals();
        setShowWithdrawalModal(true);
      } else {
        triggerNotification('⚠️ Failed to simulate withdrawal.', 'error');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(null);
    }
  };

  // Claim ₱5.00 reward bonus
  const claimBonus = async (friendId: string) => {
    if (!token) return;
    setSimulating(`claim-${friendId}`);
    try {
      const res = await fetch('/api/user/claim-referral-bonus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ friendId })
      });
      const result = await res.json();
      if (res.ok) {
        soundEffects.playReward();
        triggerNotification(isTl ? `🎁 Tagumpay! Nakuha mo ang iyong +₱5.00 referral bonus!` : `🎁 Success! You have claimed your +₱5.00 referral bonus!`, 'success');
        await onRefreshProfile();
      } else {
        triggerNotification(isTl ? `⚠️ ${result.error || 'Hindi ma-claim.'}` : `⚠️ ${result.error || 'Cannot claim.'}`, 'error');
      }
    } catch (e) {
      console.error(e);
      triggerNotification(isTl ? '⚠️ Connection Error.' : '⚠️ Connection Error.', 'error');
    } finally {
      setSimulating(null);
    }
  };

  return (
    <div id="referrals-panel-sidebar" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="font-extrabold text-slate-900 text-xs tracking-wider uppercase flex items-center gap-1.5 animate-pulse">
          <Users className="w-4 h-4 text-indigo-600" />
          <span>{isTl ? "I-invite ang mga Kaibigan" : "Invite Friends & Earn"}</span>
        </h3>
        <span className="bg-rose-50 border border-rose-100 text-[10px] font-black text-rose-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
          <Gift className="w-3 h-3 text-rose-500" />
          <span>₱5.00 Bonus</span>
        </span>
      </div>

      {/* VALUE PROP TEXT */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100/60 rounded-xl p-3 text-xs leading-relaxed">
        <p className="text-[11px] font-semibold text-slate-700">
          {isTl 
            ? "Ibahagi ang iyong referral link sa ibaba at anyayahan ang iyong mga kaibigan na tuklasin ang mga interactive features ng platform. Kapag nakumpleto nila ang mga kinakailangang aktibidad alinsunod sa aming Terms and Community Guidelines, maaaring magkaroon ng available referral incentives para sa mga kwalipikadong kalahok." 
            : "Ibahagi ang iyong referral link sa ibaba at anyayahan ang iyong mga kaibigan na tuklasin ang mga interactive features ng platform. Kapag nakumpleto nila ang mga kinakailangang aktibidad alinsunod sa aming Terms and Community Guidelines, maaaring magkaroon ng available referral incentives para sa mga kwalipikadong kalahok."}
        </p>
      </div>

      {/* UNIQUE REFERRAL LINK BOX */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block">{isTl ? "Iyong referral link" : "Your Referral Link"}</label>
        <div className="flex gap-2">
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-mono text-slate-650 truncate flex-1 flex items-center select-all w-0">
            {getReferralLink()}
          </div>
          <button
            id="copy-ref-link-btn"
            onClick={handleCopy}
            className={`px-3 py-2 rounded-xl border flex items-center justify-center gap-1 transition-all text-xs font-bold cursor-pointer shrink-0 ${
              copied 
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-50' 
                : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? (isTl ? 'Kopya!' : 'Copied!') : (isTl ? 'Kopya' : 'Copy')}</span>
          </button>
        </div>
      </div>

      {/* SUCCESS WITHDRAWAL BANNER GENERATOR PROMPT BUTTON */}
      <div className="pt-1">
        <button
          onClick={async () => {
            await fetchReferralWithdrawals();
            setShowWithdrawalModal(true);
          }}
          className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-slate-950 font-black p-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition transform active:scale-98 cursor-pointer"
        >
          <Award className="w-4 h-4 text-slate-950 shrink-0" />
          <span>🏆 Success Withdrawal Banner ({withdrawalItems.length})</span>
        </button>
      </div>

      {/* REFERRAL FRIENDS LIST */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block">
            {isTl ? `Mga Na-invite Mo (${referredFriends.length})` : `Your Referrals (${referredFriends.length})`}
          </label>
          <button
            onClick={simulateInviteFriend}
            disabled={simulating !== null}
            className="text-[9px] text-indigo-600 font-bold hover:underline cursor-pointer bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1"
          >
            <UserPlus className="w-2.5 h-2.5" />
            <span>+ Simulate Invite</span>
          </button>
        </div>

        {referredFriends.length === 0 ? (
          <div className="text-center py-5 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs text-semibold">
            {isTl ? "⚠️ Wala pang na-invite na kaibigan. Ibahagi ang link sa itaas!" : "⚠️ No friends referred yet. Share the link above!"}
          </div>
        ) : (
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {referredFriends.map((friend) => {
              const isEligible = friend.currentEarnings >= 100;
              const hasClaimed = friend.bonusClaimed;
              const progressPct = Math.min(100, Math.floor((friend.currentEarnings / 100) * 100));
              const friendWithdrawals = friend.successfulWithdrawals || [];
              const hasWithdrawal = friendWithdrawals.length > 0;

              return (
                <div key={friend.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {friend.avatar && (friend.avatar.startsWith('http') || friend.avatar.startsWith('data:') || friend.avatar.startsWith('blob:')) ? (
                        <img 
                          src={friend.avatar} 
                          alt="Avatar" 
                          className="w-6 h-6 rounded-full object-cover border border-slate-200/60 shadow-xs shrink-0" 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <span className="text-base shrink-0">{friend.avatar || '👤'}</span>
                      )}
                      <div className="min-w-0">
                        <h5 className="font-extrabold text-slate-800 truncate leading-tight">{friend.name}</h5>
                        <p className="text-[9px] text-slate-400 font-semibold">{isTl ? `Joined: ${friend.joinedAt}` : `Joined: ${friend.joinedAt}`}</p>
                      </div>
                    </div>

                    {/* Claim status badge / button */}
                    <div className="shrink-0 font-bold">
                      {hasClaimed ? (
                        <span className="bg-slate-200 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded">
                          {isTl ? "Na-claim na!" : "Claimed!"}
                        </span>
                      ) : isEligible ? (
                        <button
                          onClick={() => claimBonus(friend.id)}
                          disabled={simulating !== null}
                          className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black px-2 py-0.5 rounded transition shadow-sm animate-bounce cursor-pointer flex items-center gap-0.5"
                          title="Claim ₱5.00 Bonus!"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>{isTl ? "Pitasin ₱5" : "Claim ₱5"}</span>
                        </button>
                      ) : (
                        <span className="bg-slate-100 border border-slate-200 text-slate-550 text-[9px] px-2 py-0.5 rounded font-black">
                          ₱{friend.currentEarnings.toFixed(0)} / 100
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Friend progress details */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                      <span>{isTl ? `Kasalukuyang Kita: ₱${friend.currentEarnings.toFixed(2)}` : `Live Earnings: ₱${friend.currentEarnings.toFixed(2)}`}</span>
                      <span>{progressPct}%</span>
                    </div>
                    
                    {/* Tiny Progress Bar */}
                    <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          isEligible ? 'bg-emerald-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* WITHDRAWAL BANNER ACTIONS & SIMULATION */}
                  <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between gap-1">
                    <button
                      onClick={() => simulateFriendWithdrawal(friend.id)}
                      disabled={simulating !== null}
                      className="text-[8px] font-black text-slate-600 hover:text-emerald-600 bg-slate-200/80 hover:bg-emerald-100 px-1.5 py-0.5 rounded transition cursor-pointer"
                    >
                      + Simulate Cashout
                    </button>

                    <button
                      onClick={async () => {
                        if (!hasWithdrawal) {
                          await simulateFriendWithdrawal(friend.id);
                        } else {
                          await fetchReferralWithdrawals();
                          setShowWithdrawalModal(true);
                        }
                      }}
                      className="text-[8px] font-black text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1 border border-amber-300/80"
                    >
                      <Download className="w-2.5 h-2.5 text-amber-600" />
                      <span>{hasWithdrawal ? "Download Success Banner" : "Create Success Banner"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AUTOMATED REAL-TIME INFO HELPER */}
      {token && (
        <div className="pt-2 border-t border-slate-150">
          <p className="text-[9px] text-indigo-500 text-center select-none leading-relaxed font-semibold">
            {isTl 
              ? "💡 Ang na-invite mong mga kaibigan ay awtomatikong magpapakita rito sa real-time kapag sila ay nag-sign up gamit ang iyong link, kasama ang kanilang live na kita." 
              : "💡 Your invited friends will automatically appear here in real-time when they register using your link, showing their live actual earnings."}
          </p>
        </div>
      )}

      {/* SUCCESS WITHDRAWAL BANNER MODAL */}
      <ReferralWithdrawalModal
        isOpen={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        referrerName={referrerName}
        items={withdrawalItems}
      />

    </div>
  );
}
