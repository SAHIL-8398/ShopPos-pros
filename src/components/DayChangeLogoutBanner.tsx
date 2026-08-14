import React from 'react';
import { Clock, AlertTriangle, Moon, LogOut, PauseCircle, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';

interface DayChangeLogoutBannerProps {
  countdownSeconds: number;
  warningMinutes: number;
  cartItemCount: number;
  onSnooze: (minutes: number) => void;
  onLogoutNow: () => void;
  onSuspendCart?: () => void;
  isMinimized: boolean;
  setIsMinimized: (val: boolean) => void;
  isSimulatedTest?: boolean;
  onCloseTest?: () => void;
}

export function DayChangeLogoutBanner({
  countdownSeconds,
  cartItemCount,
  onSnooze,
  onLogoutNow,
  onSuspendCart,
  isMinimized,
  setIsMinimized,
  isSimulatedTest,
  onCloseTest,
}: DayChangeLogoutBannerProps) {
  const mins = Math.floor(Math.max(0, countdownSeconds) / 60);
  const secs = Math.max(0, countdownSeconds) % 60;
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const isUrgent = countdownSeconds <= 120; // under 2 minutes

  if (isMinimized) {
    return (
      <div className="fixed top-3 right-4 z-[99999] animate-in fade-in slide-in-from-top-2 duration-300">
        <button
          onClick={() => setIsMinimized(false)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl shadow-xl border text-xs font-black cursor-pointer transition-all active:scale-95 ${
            isUrgent
              ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-400 shadow-rose-600/30 animate-pulse'
              : 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-300 shadow-amber-500/30'
          }`}
          title="Click to expand Day Change Auto-Logout details"
        >
          <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Midnight Logout: {timeFormatted}</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-0 inset-x-0 z-[99999] px-3 py-2.5 sm:px-6 pointer-events-none animate-in fade-in slide-in-from-top duration-300">
      <div
        className={`pointer-events-auto max-w-4xl mx-auto rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-2xl border transition-all ${
          isUrgent
            ? 'bg-gradient-to-r from-rose-900 via-rose-950 to-slate-950 text-white border-rose-600/70 shadow-rose-950/60 ring-2 ring-rose-500/40'
            : 'bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 text-white border-amber-500/60 shadow-slate-950/80 ring-1 ring-amber-400/30'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left info badge and message */}
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                isUrgent ? 'bg-rose-600 text-white animate-bounce' : 'bg-amber-500 text-slate-950'
              }`}
            >
              {isUrgent ? <AlertTriangle className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </div>

            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black tracking-wide flex items-center gap-1.5">
                  {isSimulatedTest ? '🧪 Notification Test Mode' : '⚠️ Automatic Logout on Date Change'}
                </span>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    isUrgent
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  }`}
                >
                  Midnight Rollover in {timeFormatted}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium leading-tight">
                {isSimulatedTest
                  ? 'This is a preview of the 5-minute advance notification before midnight rollover.'
                  : 'Your cashier session will automatically log out at 12:00 AM midnight to roll over daily accounts. Please finish and save current transactions.'}
              </p>
              {cartItemCount > 0 && (
                <p className="text-[11px] text-amber-300 font-bold flex items-center gap-1 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  You have {cartItemCount} item(s) in active cart. Please complete bill or save to Hold!
                </p>
              )}
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            {cartItemCount > 0 && onSuspendCart && (
              <button
                type="button"
                onClick={onSuspendCart}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-black rounded-xl border border-amber-500/40 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                title="Save current basket to Hold queue so it is not lost"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                Hold Cart
              </button>
            )}

            <button
              type="button"
              onClick={() => onSnooze(15)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl border border-indigo-400/40 shadow-sm flex items-center gap-1 cursor-pointer transition-all active:scale-95"
              title="Extend session by 15 minutes if you are actively assisting a customer"
            >
              <Clock className="w-3.5 h-3.5" />
              Extend +15m
            </button>

            <button
              type="button"
              onClick={isSimulatedTest && onCloseTest ? onCloseTest : onLogoutNow}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              {isSimulatedTest ? 'Close Test' : 'Log Out Now'}
            </button>

            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Minimize warning to top pill"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
