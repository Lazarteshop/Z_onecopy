import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trophy, 
  Heart, 
  Play, 
  ExternalLink, 
  UserPlus, 
  LogIn, 
  Sparkles, 
  Share2, 
  CheckCircle2,
  Calendar,
  Eye,
  ArrowRight
} from 'lucide-react';
import { ChallengeEntry, CreatorChallenge, UserSession } from '../types';
import { ChallengeVideoPlayer } from './ChallengeVideoPlayer';

interface PublicEntryLandingModalProps {
  challengeId: string;
  entryId: string;
  inviterId?: string;
  user: UserSession | null;
  token: string | null;
  onClose: () => void;
  onOpenRegister: (attribution?: { sourceEntryId: string; sourceChallengeId: string; inviterParticipantId?: string }) => void;
  onOpenLogin: () => void;
  onNavigateToChallenges: () => void;
  triggerNotification?: (msg: string, type: 'success' | 'error' | 'info') => void;
  isTl?: boolean;
}

export const PublicEntryLandingModal: React.FC<PublicEntryLandingModalProps> = ({
  challengeId,
  entryId,
  inviterId,
  user,
  token,
  onClose,
  onOpenRegister,
  onOpenLogin,
  onNavigateToChallenges,
  triggerNotification,
  isTl = true
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [challenge, setChallenge] = useState<any>(null);
  const [entry, setEntry] = useState<any>(null);
  const [voting, setVoting] = useState<boolean>(false);
  const [hasVoted, setHasVoted] = useState<boolean>(false);

  useEffect(() => {
    const fetchEntryDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/public/challenges/${challengeId}/entries/${entryId}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setChallenge(data.challenge);
          setEntry(data.entry);
        }
      } catch (err) {
        console.error('Error loading shared entry:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEntryDetails();
  }, [challengeId, entryId]);

  const handleVote = async () => {
    if (!token || !user) {
      onOpenLogin();
      return;
    }

    if (user.id === entry?.participantId) {
      triggerNotification?.(isTl ? 'Hindi maaaring bumoto sa sariling entry.' : 'Cannot vote for your own entry.', 'error');
      return;
    }

    setVoting(true);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/entries/${entryId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHasVoted(true);
        if (entry) {
          setEntry({
            ...entry,
            votesCount: (entry.votesCount || 0) + 1,
            score: (entry.score || 0) + (data.addedScore || 10)
          });
        }
        triggerNotification?.(data.message || 'Salamat sa iyong boto!', 'success');
      } else {
        triggerNotification?.(data.error || 'Hindi ma-proseso ang boto', 'error');
      }
    } catch (err) {
      triggerNotification?.('Network error voting', 'error');
    } finally {
      setVoting(false);
    }
  };

  const handleRegisterClick = () => {
    onOpenRegister({
      sourceEntryId: entryId,
      sourceChallengeId: challengeId,
      inviterParticipantId: inviterId || entry?.participantId
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl animate-scaleUp my-auto">
        
        {/* Banner with Challenge Info */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 p-5 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              <span>Creator Challenge</span>
            </span>
            {challenge?.prizePool && (
              <span className="text-xs font-black text-amber-300 font-mono">
                Prize: ₱{challenge.prizePool.toLocaleString()}
              </span>
            )}
          </div>

          <h3 className="font-black text-lg text-white leading-tight">
            {challenge?.title || 'Creator Challenge Entry'}
          </h3>
          {challenge?.sponsorName && (
            <p className="text-xs text-slate-300 font-medium mt-1">
              Sponsored by: <span className="text-amber-300 font-bold">{challenge.sponsorName}</span>
            </p>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-bold space-y-2">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Kinukuha ang mga detalye ng challenge entry...</p>
            </div>
          ) : !entry ? (
            <div className="py-12 text-center text-xs text-slate-400 font-bold">
              Hindi matagpuan ang challenge entry. Maaaring natapos o na-delete na ito.
            </div>
          ) : (
            <>
              {/* Participant Profile Card */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={entry.participantAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.participantName}`}
                    alt={entry.participantName}
                    className="w-11 h-11 rounded-full object-cover border-2 border-indigo-500 shadow-xs"
                  />
                  <div>
                    <h4 className="font-black text-sm text-slate-900">{entry.participantName}</h4>
                    <span className="text-[11px] text-slate-500 font-medium block">
                      Kalahok sa Creator Challenge
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Score / Votes</span>
                  <span className="font-black text-indigo-600 font-mono text-sm">
                    {entry.score || 0} pts ({entry.votesCount || 0} votes)
                  </span>
                </div>
              </div>

              {/* Entry Media Preview */}
              {entry.mediaUrl && (
                <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 relative group flex items-center justify-center">
                  {entry.mediaType === 'video' ? (
                    <ChallengeVideoPlayer
                      mediaUrl={entry.mediaUrl}
                      caption={entry.caption || challenge?.title}
                      isTl={isTl}
                    />
                  ) : (
                    <img
                      src={entry.mediaUrl}
                      alt={entry.caption || 'Challenge Entry Media'}
                      className="max-h-72 w-full object-contain"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60';
                      }}
                    />
                  )}
                </div>
              )}

              {/* Caption */}
              {entry.caption && (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed font-medium">
                  {entry.caption}
                </div>
              )}

              {/* Call to Actions based on authentication status */}
              {user ? (
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleVote}
                    disabled={voting || hasVoted || user.id === entry.participantId}
                    className={`w-full py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer ${
                      hasVoted
                        ? 'bg-emerald-600 text-white'
                        : user.id === entry.participantId
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${hasVoted ? 'fill-white' : ''}`} />
                    <span>
                      {hasVoted 
                        ? 'Naboto Mo Na ang Entry na Ito! 🎉' 
                        : user.id === entry.participantId
                        ? 'Iyong Sariling Entry'
                        : 'Bumoto sa Entry na Ito (+10 Pts)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onNavigateToChallenges();
                      onClose();
                    }}
                    className="w-full py-2.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    <span>Tingnan ang Lahat ng Challenges & Leaderboard</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-100 text-center space-y-2">
                    <div className="flex items-center justify-center gap-1.5 font-black text-xs text-indigo-900">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Gusto mo bang bumoto at manalo rin ng premyo?</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed max-w-sm mx-auto">
                      Gumawa ng libreng Z-OneApp account para bumoto sa entry ni <b>{entry.participantName}</b> at mag-host din ng sarili mong challenges!
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRegisterClick}
                      className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Mag-register para Bumoto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onOpenLogin();
                        onClose();
                      }}
                      className="py-3 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Mag-login</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};
