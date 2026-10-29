import React from 'react';
import { UserSession } from '../types';

interface KiddiePortalProps {
  user: UserSession | null;
  currentUser?: UserSession | null;
  onLogout: () => void;
  onBackToLauncher: () => void;
}

export const KiddiePortal: React.FC<KiddiePortalProps> = ({
  user,
  onLogout,
  onBackToLauncher,
}) => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center bg-slate-900/60 rounded-3xl border border-sky-500/20 max-w-2xl mx-auto my-8">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center text-4xl shadow-lg shadow-sky-500/20 mb-6">
        👶
      </div>
      <h2 className="text-2xl font-black text-white tracking-tight mb-2">
        Z-oneKiddie Safe Community
      </h2>
      <p className="text-slate-300 text-sm max-w-md mb-8">
        Protektado at child-friendly environment para sa mga bata. Ligtas na panonood ng educational videos, cartoons, at family moments.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-xs">
        <button
          type="button"
          onClick={onBackToLauncher}
          className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm shadow-md shadow-sky-500/25 transition cursor-pointer"
        >
          ← Bumalik sa Launcher
        </button>
        {user && (
          <button
            type="button"
            onClick={onLogout}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
          >
            I-logout ang Account
          </button>
        )}
      </div>
    </div>
  );
};
