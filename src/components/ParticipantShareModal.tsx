import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  Trophy, 
  Flame, 
  Eye, 
  Users, 
  Sparkles,
  Smartphone
} from 'lucide-react';
import { ChallengeEntry, CreatorChallenge, UserSession } from '../types';

interface ParticipantShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: ChallengeEntry | null;
  challenge?: CreatorChallenge | null;
  currentUser?: UserSession | null;
  triggerNotification?: (msg: string, type: 'success' | 'error' | 'info') => void;
  isTl?: boolean;
  language?: 'tl' | 'en';
}

export const ParticipantShareModal: React.FC<ParticipantShareModalProps> = ({
  isOpen,
  onClose,
  entry,
  challenge,
  currentUser,
  triggerNotification,
  isTl: isTlProp,
  language = 'tl'
}) => {
  const isTl = isTlProp !== undefined ? isTlProp : language === 'tl';
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen || !entry) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${origin}/?challenge=${entry.challengeId}&entry=${entry.id}&inviter=${entry.participantId}`;
  const shareTitle = `${entry.participantName}'s entry sa "${challenge?.title || 'Creator Challenge'}" | Z-OneApp`;
  const shareText = `Suportahan ang entry ni ${entry.participantName} sa ${challenge?.title || 'Creator Challenge'} sa Z-OneApp! Panoorin, bumoto, at manalo ng premyo:`;

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      triggerNotification?.(
        isTl ? '📋 Na-copy na ang iyong invite link!' : 'Invite link copied to clipboard!',
        'success'
      );
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      triggerNotification?.('Failed to copy link', 'error');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        triggerNotification?.(isTl ? 'Salamat sa pag-share!' : 'Thanks for sharing!', 'success');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-5 sm:p-6 space-y-5 shadow-2xl animate-scaleUp my-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">
                {isTl ? 'I-share ang Iyong Entry' : 'Share Your Entry'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isTl ? 'Mag-imbita ng mga kaibigan para bumoto at sumuporta' : 'Invite friends to vote and support your entry'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Entry Preview Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <img
              src={entry.participantAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.participantName}`}
              alt={entry.participantName}
              className="w-10 h-10 rounded-full object-cover border border-slate-200"
            />
            <div className="min-w-0 flex-1">
              <span className="font-black text-xs text-slate-900 block truncate">{entry.participantName}</span>
              <span className="text-[11px] text-indigo-600 font-bold block truncate">
                {challenge?.title || 'Creator Challenge'}
              </span>
            </div>
          </div>

          {entry.caption && (
            <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-xl border border-slate-100 line-clamp-2">
              "{entry.caption}"
            </p>
          )}

          {/* Quick Viral Stats */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="bg-white p-2 rounded-xl border border-slate-200">
              <span className="text-[10px] font-black text-slate-400 uppercase block">Score</span>
              <span className="font-black text-xs text-indigo-600 font-mono">{entry.score || 0} pts</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-slate-200">
              <span className="text-[10px] font-black text-slate-400 uppercase block">Link Opens</span>
              <span className="font-black text-xs text-slate-800 font-mono">{entry.linkOpensCount || 0}</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-slate-200">
              <span className="text-[10px] font-black text-slate-400 uppercase block">Signups</span>
              <span className="font-black text-xs text-emerald-600 font-mono">{entry.referralRegistrationsCount || 0}</span>
            </div>
          </div>
        </div>

        {/* Share Link Input with Copy */}
        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-700">
            {isTl ? 'Iyong Natatanging Share Link' : 'Your Unique Share Link'}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-600 bg-slate-50 select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className={`px-3.5 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                copied 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? (isTl ? 'Na-copy!' : 'Copied!') : (isTl ? 'Kopyahin' : 'Copy')}</span>
            </button>
          </div>
        </div>

        {/* Viral Sharing Tips */}
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3.5 text-[11px] text-indigo-950 space-y-1.5">
          <div className="flex items-center gap-1.5 font-black text-indigo-700">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Paano Mas Manalo sa Creator Challenge:</span>
          </div>
          <p className="leading-relaxed">
            I-share ang link sa iyong Facebook group, Messenger, TikTok bio, o Viber. Bawat bagong bisita at boto ay nagpapataas ng iyong leaderboard ranking!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleNativeShare}
            className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
          >
            <Smartphone className="w-4 h-4" />
            <span>{isTl ? 'I-share Gamit ang Phone App (Messenger / FB / etc.)' : 'Share via Device Apps'}</span>
          </button>
          
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-black text-xs cursor-pointer"
          >
            {isTl ? 'Isara' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
