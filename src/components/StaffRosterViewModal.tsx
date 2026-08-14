/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash, Users, Save, ShieldCheck, CheckCircle2, Key, Users2, Delete, LogOut } from 'lucide-react';
import { Staff, Sale, StaffActivityLog } from '../types';
import { formatDate } from '../utils';
import { useDialog } from '../context/DialogContext';

interface StaffRosterViewModalProps {
  staff: Staff[];
  sales: Sale[];
  settings: {
    requireStaffPin: boolean;
  };
  activityLogs: StaffActivityLog[];
  onClose: () => void;
  onSaveStaff: (data: Partial<Staff>) => void;
  onDeleteStaff: (id: string) => void;
  onToggleRequireStaff: (checked: boolean) => void;
  activeStaffId?: string | null;
  onSelectActiveStaff?: (id: string | null) => void;
}

export const StaffRosterViewModal: React.FC<StaffRosterViewModalProps> = ({
  staff,
  sales,
  settings,
  activityLogs = [],
  onClose,
  onSaveStaff,
  onDeleteStaff,
  onToggleRequireStaff,
  activeStaffId = null,
  onSelectActiveStaff,
}) => {
  const { showAlert } = useDialog();
  const [activeTab, setActiveTab] = useState<'pin' | 'manage' | 'activity'>('pin');
  const [formId, setFormId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [role, setRole] = useState<string>('Cashier');
  const [phone, setPhone] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

  // PIN Pad States
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);

  const activeStaff = staff.find(s => s.id === activeStaffId);

  // Clear inputs when form resets
  const handleOpenForm = (s: Staff | null) => {
    if (s) {
      setFormId(s.id);
      setName(s.name || '');
      setRole(s.role || 'Cashier');
      setPhone(s.phone || '');
      setPin(s.pin || '');
    } else {
      setFormId(null);
      setName('');
      setRole('Cashier');
      setPhone('');
      setPin('');
    }
    setIsFormOpen(true);
  };

  const handleKeyPress = (num: string) => {
    if (pinSuccess) return;
    setPinError(null);
    if (pinInput.length < 4) {
      const newVal = pinInput + num;
      setPinInput(newVal);
      if (newVal.length === 4) {
        // Validate PIN
        const matched = staff.find(s => s.pin === newVal);
        if (matched) {
          setPinSuccess(`Session switched to ${matched.name}!`);
          onSelectActiveStaff?.(matched.id);
          setTimeout(() => {
            onClose();
          }, 800);
        } else {
          setPinError('Invalid PIN. Please try again.');
          // Auto clear after short delay
          setTimeout(() => {
            setPinInput('');
          }, 600);
        }
      }
    }
  };

  const formatDuration = (ms: number | null) => {
    if (ms === null) return 'Active Now';
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  const formatLogTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }) + ' ' + formatDate(d);
    } catch {
      return timeStr;
    }
  };

  const handleBackspace = () => {
    if (pinSuccess) return;
    setPinError(null);
    setPinInput(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (pinSuccess) return;
    setPinError(null);
    setPinInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showAlert('Staff Name is required!', 'Required Field');
      return;
    }
    if (pin.trim() && (pin.trim().length !== 4 || isNaN(Number(pin.trim())))) {
      showAlert('Please enter a valid 4-digit numeric PIN code!', 'Invalid PIN');
      return;
    }

    onSaveStaff({
      id: formId || undefined,
      name: name.trim(),
      role,
      phone: phone.trim(),
      pin: pin.trim() || undefined,
    });
    setIsFormOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1000] flex items-end sm:items-center justify-center p-3 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl w-full max-w-sm max-h-[92vh] overflow-y-auto p-5 shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h3 className="text-base font-extrabold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
              <Users className="w-5 h-5 text-indigo-500" />
              Cashier Staff Roster
            </h3>
            <button
              onClick={onClose}
              className="p-1 text-slate-450 hover:text-slate-600 dark:hover:text-slate-350 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!isFormOpen && (
            /* Tab selector for PIN Pad vs Manage vs Activity */
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('pin')}
                className={`flex-1 py-1.5 text-center text-xs font-black rounded-lg transition-all ${
                  activeTab === 'pin'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                PIN Pad
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manage')}
                className={`flex-1 py-1.5 text-center text-xs font-black rounded-lg transition-all ${
                  activeTab === 'manage'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Directory
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className={`flex-1 py-1.5 text-center text-xs font-black rounded-lg transition-all ${
                  activeTab === 'activity'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Activity
              </button>
            </div>
          )}

          {/* Settings Constraint Toggle in Manage Tab */}
          {activeTab === 'manage' && !isFormOpen && (
            <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3.5 border border-slate-100 dark:border-slate-850 flex justify-between items-center select-none animate-in fade-in duration-100">
              <div className="pr-3">
                <h4 className="text-xs font-black text-slate-850 dark:text-slate-200">Mandate Staff checkout</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 font-bold">Require selecting cashier at checkout</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.requireStaffPin || false}
                  onChange={(e) => onToggleRequireStaff(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-8 h-4.5 bg-slate-350 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>
          )}

          {/* ACTIVE STATE OVERLAYS */}
          {activeTab === 'pin' && !isFormOpen && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* CURRENT ACTIVE USER METADATA CARD */}
              <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 flex justify-between items-center">
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Active POS Session</span>
                  {activeStaff ? (
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {activeStaff.name} ({activeStaff.role})
                    </span>
                  ) : (
                    <span className="text-xs font-black text-slate-400 italic block mt-0.5">No operator clocked in</span>
                  )}
                </div>
                {activeStaff && (
                  <button
                    type="button"
                    onClick={() => onSelectActiveStaff?.(null)}
                    className="flex-shrink-0 p-1.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg active:scale-95 transition-transform"
                    title="Sign out session"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* CHOOSE PIN CODE SECTION */}
              <div className="text-center space-y-4">
                <p className="text-[11px] font-bold text-slate-550 dark:text-slate-350 uppercase tracking-widest leading-none">
                  Enter 4-Digit Security PIN
                </p>

                {/* 4 dots visualization */}
                <div className="flex justify-center gap-3">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full border transition-all ${
                        idx < pinInput.length
                          ? 'bg-indigo-600 dark:bg-indigo-400 border-indigo-600 dark:border-indigo-400 scale-110 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-800'
                      }`}
                    />
                  ))}
                </div>

                {/* Pin success/error feeds */}
                {pinError && (
                  <p className="text-[10px] font-extrabold text-rose-500 tracking-wide select-none leading-none animate-bounce">
                    ❌ {pinError}
                  </p>
                )}
                {pinSuccess && (
                  <p className="text-[10px] font-extrabold text-emerald-500 tracking-wide select-none leading-none animate-pulse">
                    ✔️ {pinSuccess}
                  </p>
                )}
                {!pinError && !pinSuccess && (
                  <p className="text-[9px] text-slate-400 italic select-none leading-none">
                    Session shifts dynamically upon validation
                  </p>
                )}

                {/* GRID NUMERIC BUTTONS PIN PAD */}
                <div className="grid grid-cols-3 gap-2.5 max-w-[210px] mx-auto select-none">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleKeyPress(digit)}
                      className="w-13 h-13 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-150 dark:border-slate-850 active:scale-90 text-sm font-black text-slate-800 dark:text-slate-200 transition-all cursor-pointer"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleClear}
                    className="w-13 h-13 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-150 dark:bg-slate-850 dark:hover:bg-slate-800 active:scale-95 text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeyPress('0')}
                    className="w-13 h-13 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-150 dark:border-slate-850 active:scale-90 text-sm font-black text-slate-800 dark:text-slate-200 transition-all cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="w-13 h-13 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-150 dark:bg-slate-850 dark:hover:bg-slate-800 active:scale-95 text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    <Delete className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MANAGE STAFF TAB SECTION */}
          {activeTab === 'manage' && !isFormOpen && (
            <div className="space-y-3 animate-in fade-in duration-100">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Active Operators ({staff.length})
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenForm(null)}
                  className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/20 px-3 py-1 text-[11px] font-black hover:bg-emerald-100 dark:hover:bg-emerald-950 rounded-lg cursor-pointer transition-colors"
                >
                  + Add Staff
                </button>
              </div>

              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {staff.length > 0 ? (
                  staff.map((s, idx) => {
                    const transactionsCount = sales.filter(sa => sa.staffName === s.name && !sa.voided).length;
                    return (
                      <div
                        key={s.id || `staff-${idx}`}
                        className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-150 dark:border-slate-850 flex justify-between items-center transition-all group"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="text-xs font-black text-slate-850 dark:text-slate-200 flex items-center gap-1.5">
                            {s.name}
                            <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold px-1.5 py-0.5 rounded">
                              {s.role}
                            </span>
                          </div>
                          {s.phone && <p className="text-[9px] text-slate-400 mt-1">📞 {s.phone}</p>}
                          {s.pin ? (
                            <p className="text-[8px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 uppercase tracking-wider leading-none">✔️ PIN Set: {s.pin}</p>
                          ) : (
                            <p className="text-[8px] text-rose-500 dark:text-rose-400 font-extrabold mt-1 uppercase tracking-wider leading-none">⚠️ No PIN Code Set</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenForm(s)}
                            className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 p-1.5 px-2.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400 rounded-lg cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteStaff(s.id)}
                            className="p-1.5 px-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/45 text-rose-600 dark:text-rose-400 rounded-lg active:scale-95 transition-transform cursor-pointer"
                            title="Delete staff operator"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl">
                    <p className="text-xs text-slate-450 dark:text-slate-450 font-bold">No staff added yet</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Define cashiers to audit individual transactions.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ACTIVITY LOGS TAB SECTION */}
          {activeTab === 'activity' && !isFormOpen && (
            <div className="space-y-3 animate-in fade-in duration-100">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Staff Session Audits ({activityLogs.length})
                </span>
              </div>

              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {activityLogs.length > 0 ? (
                  activityLogs.map((log, idx) => (
                    <div
                      key={log.id || `log-${idx}`}
                      className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-150 dark:border-slate-850 flex justify-between items-center"
                    >
                      <div className="min-w-0 flex-1 pr-2 space-y-1">
                        <div className="text-xs font-black text-slate-850 dark:text-slate-200 flex items-center gap-1.5">
                          {log.staffName}
                          {log.logoutTime === null && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 animate-pulse">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-450 dark:text-slate-400 font-semibold space-y-0.5 leading-relaxed">
                          <div>🛫 Login: {formatLogTime(log.loginTime)}</div>
                          {log.logoutTime && <div>🛬 Logout: {formatLogTime(log.logoutTime)}</div>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${
                          log.logoutTime === null 
                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400'
                        }`}>
                          {formatDuration(log.durationMs)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl">
                    <p className="text-xs text-slate-450 dark:text-slate-450 font-bold">No activity recorded</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Staff sign-ins log here automatically.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STAFF FORM PANEL SHEET overlay */}
          {isFormOpen && (
            <form onSubmit={handleSubmit} className="space-y-4 pt-1 animate-fade-in select-none">
              <h4 className="text-xs font-black text-slate-850 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 border border-slate-150 dark:border-slate-850 rounded-lg inline-block leading-none">
                {formId ? '📌 Edit Staff credentials' : '🌱 Register New Operator'}
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Personnel Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. S. Cashier"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Store Role Assignment
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 font-semibold cursor-pointer"
                    >
                      <option value="Cashier">Cashier</option>
                      <option value="Manager">Manager</option>
                      <option value="Owner">Owner</option>
                      <option value="Helper">Helper</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      4-Digit Login PIN *
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      pattern="\d{4}"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 1234"
                      required
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-850 dark:text-slate-100 outline-none focus:border-indigo-500 font-mono font-black text-center tracking-widest"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Contact Mobile
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-755 text-white text-xs font-black uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Member
                </button>
                {formId && (
                  <button
                    type="button"
                    onClick={() => { onDeleteStaff(formId); setIsFormOpen(false); }}
                    className="px-3 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-455 border border-rose-100 dark:border-rose-900/30 rounded-xl active:scale-95 cursor-pointer"
                    title="Delete Staff"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-600 dark:text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
