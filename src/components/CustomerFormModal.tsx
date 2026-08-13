/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, User, Phone, Mail, MapPin, Trash2, Calendar, ClipboardList, CheckCircle, AlertCircle, Save, Edit3, Award } from 'lucide-react';
import { Customer, Sale } from '../types';
import { formatCurrency, generateId, formatDate } from '../utils';

interface CustomerFormModalProps {
  customer: Customer | null; // null means we are adding a new customer
  sales: Sale[];
  onClose: () => void;
  onSave: (customerData: Partial<Customer>) => void;
  onDelete?: (id: string) => void;
  onMarkCreditPaid?: (billId: string) => void;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  customer,
  sales,
  onClose,
  onSave,
  onDelete,
  onMarkCreditPaid,
}) => {
  const isEditMode = !!customer;

  // Form Field States
  const [name, setName] = useState<string>(customer?.name || '');
  const [phone, setPhone] = useState<string>(customer?.phone || '');
  const [email, setEmail] = useState<string>(customer?.email || '');
  const [address, setAddress] = useState<string>(customer?.address || '');

  // UI interaction states
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(!isEditMode);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>('');

  // Settle single ledger check state
  const [settlingBillId, setSettlingBillId] = useState<string | null>(null);

  // Compute stats for current client if editing
  const matchedBills = isEditMode
    ? sales.filter(s => (s.customer === customer.name || s.creditCustId === customer.id) && !s.voided)
    : [];

  const pendingCreditBills = isEditMode
    ? sales.filter(s => s.creditCustId === customer.id && s.paymentMethod === 'credit' && !s.creditPaid && !s.voided)
    : [];

  const totalOutstanding = pendingCreditBills.reduce((sum, s) => sum + s.total, 0);

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setValidationError('Customer Name is required!');
      return;
    }
    setValidationError('');

    onSave({
      ...(customer ? { id: customer.id } : {}),
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
    });
  };

  const handleDeleteClient = () => {
    if (customer && onDelete) {
      onDelete(customer.id);
      onClose();
    }
  };

  const handleClearSingleLedger = (billId: string) => {
    if (onMarkCreditPaid) {
      onMarkCreditPaid(billId);
      // Let parent triggers handle saving, is updated in db state.
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-end sm:items-center justify-center p-3 animate-fade-in"
      onClick={handleOverlayClick}
    >
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative shadow-2xl flex flex-col border border-slate-100 dark:border-slate-800">
        {/* Header Section */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-4 flex justify-between items-center z-10 shrink-0">
          <div>
            <span className="text-[10px] font-black uppercase text-indigo-650 tracking-widest block">
              {isEditMode ? 'Customer Profile Account' : 'New Ledger Client Profile'}
            </span>
            <h3 className="text-sm font-black text-slate-800 mt-1">
              {isEditMode ? customer.name : 'Create Client Profile'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {validationError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-xs font-bold flex gap-2 items-center">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Delete Dialog Overlay (In-App Confirm) */}
          {showDeleteConfirm ? (
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl space-y-3">
              <h4 className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-rose-500 animate-pulse" />
                DANGER: Permanently Delete Client?
              </h4>
              <p className="text-[11px] text-rose-700 leading-relaxed font-semibold">
                You are about to delete <strong>{customer?.name}</strong> from the database. Outstanding credit indices will be delinked. This action is irreversible.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteClient}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer"
                >
                  Delete Account
                </button>
              </div>
            </div>
          ) : null}

          {/* EDITABLE/CREATABLE PROFILE FORM STATE */}
          {isEditingProfile ? (
            <form onSubmit={handleSaveSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Client / Customer Name *
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Mobile Phone (Optional)
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="absolute left-3 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      maxLength={10}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Email Address (Optional)
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. client@mail.com"
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Billing Street Location Address
                </label>
                <div className="relative flex items-center">
                  <MapPin className="absolute left-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street building road locality..."
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {isEditMode && (
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl active:scale-95 transition-transform"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform tracking-wider cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  {isEditMode ? 'Update Client Info' : 'Save New Customer'}
                </button>
              </div>
            </form>
          ) : (
            /* VIEW TAB WITH DETAILED STATS, CREDITS, AND TRANSACTION HISTORIES */
            <div className="space-y-4">
              {/* Detailed indicators box */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 space-y-2.5">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Account info</span>
                    {customer?.phone && (
                      <span className="text-xs font-bold text-slate-750 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-450" /> {customer.phone}
                      </span>
                    )}
                    {customer?.email && (
                      <span className="text-xs font-semibold text-slate-650 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-450" /> {customer.email}
                      </span>
                    )}
                    <span className="text-xs font-medium text-slate-600 flex items-start gap-1.5 max-w-[280px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-450 mt-0.5 shrink-0" />
                      <span>{customer?.address || 'No Address registered'}</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-indigo-650 rounded-xl transition-all cursor-pointer"
                    title="Edit profile"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>

                <div className="border-t border-slate-200 pt-2.5 grid grid-cols-3 gap-2 select-none">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Total sales</span>
                    <span className="text-xs font-extrabold text-slate-800 mt-0.5 block">{matchedBills.length} orders</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Registered</span>
                    <span className="text-xs font-bold text-slate-500 mt-0.5 block flex items-center gap-1 truncate">
                      <Calendar className="w-3 h-3 shrink-0" /> {customer?.createdAt || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Loyalty Reward</span>
                    <span className="text-xs font-extrabold text-amber-600 mt-0.5 block flex items-center gap-0.5 truncate">
                      <Award className="w-3.5 h-3.5 fill-amber-300 text-amber-600 shrink-0" />
                      {(() => {
                        let earned = 0;
                        let redeemed = 0;
                        matchedBills.forEach(s => {
                          earned += Math.floor(s.total / 50);
                          redeemed += s.pointsRedeemed || 0;
                        });
                        return Math.max(0, earned - redeemed);
                      })()} Pts
                    </span>
                  </div>
                </div>
              </div>

              {/* OUTSTANDING CREDIT SECTION */}
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 space-y-3">
                <div className="flex justify-between items-center text-amber-900 font-extrabold">
                  <div>
                    <span className="text-[9px] font-black uppercase text-amber-700 tracking-widest block">Outstanding Ledger balance (Khata)</span>
                    <span className="text-lg font-black text-amber-900 mt-0.5 block">
                      Rs.{formatCurrency(totalOutstanding)}
                    </span>
                  </div>
                  <span className="text-[10px] bg-amber-100 text-amber-805 font-black px-2.5 py-1 rounded-full uppercase tracking-wider select-none">
                    {totalOutstanding > 0 ? `${pendingCreditBills.length} Pending` : 'Clear'}
                  </span>
                </div>

                {totalOutstanding > 0 && customer?.phone && (
                  <div className="bg-white border border-amber-200/80 p-3 rounded-xl space-y-2 animate-fade-in text-slate-800">
                    <span className="text-[9px] font-black uppercase text-amber-700 tracking-wider block">📲 Send Due Reminders</span>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={`https://wa.me/91${customer.phone}?text=Dear%20${encodeURIComponent(customer.name)},%20this%2520is%2520a%2520friendly%2520reminder%2520that%2520your%2520outstanding%2520running%2520balance%2520(Khata/Credit)%2520at%2520our%2520store%2520is%2520Rs.%2520${formatCurrency(totalOutstanding)}.%2520Please%2520settle%2520your%2520due%2520at%252520the%252520earliest.%2520Thank%2520you!`}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-extrabold uppercase text-center flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                      >
                        💬 WhatsApp
                      </a>
                      <a
                        href={`sms:+91${customer.phone}?body=Dear%20${encodeURIComponent(customer.name)},%20your%20outstanding%20running%20balance%20(Khata/Credit)%20at%20our%20store%20is%20Rs.%20${formatCurrency(totalOutstanding)}.%20Please%20settle%20your%20due.%20Thank%20you!`}
                        className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-extrabold uppercase text-center flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                      >
                        📱 SMS Alert
                      </a>
                    </div>
                  </div>
                )}

                {pendingCreditBills.length > 0 ? (
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-0.5">
                    {pendingCreditBills.map(s => (
                      <div 
                        key={s.id} 
                        className="bg-white/80 border border-amber-200/60 p-2.5 rounded-xl flex justify-between items-center text-xs"
                      >
                        <div>
                          <div className="font-extrabold text-slate-850">Bill #{s.billNo} • {formatDate(s.date)}</div>
                          <div className="text-[10px] font-semibold text-slate-450 mt-0.5">Total: Rs.{formatCurrency(s.total)}</div>
                        </div>
                        {onMarkCreditPaid && (
                          <button
                            type="button"
                            onClick={() => {
                              setSettlingBillId(s.id);
                              handleClearSingleLedger(s.id);
                            }}
                            className="bg-amber-500 hover:bg-emerald-600 hover:scale-103 text-white text-[9px] font-black uppercase px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Settle
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-emerald-700 font-bold text-center py-2 bg-emerald-50 rounded-xl flex items-center justify-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    All outstanding balances for this client are fully settled!
                  </p>
                )}
              </div>

              {/* HISTORICAL BILLS SECTION */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1 font-sans">
                  <ClipboardList className="w-4 h-4 text-slate-400" />
                  Order Invoice history
                </h4>

                {matchedBills.length > 0 ? (
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-0.5">
                    {matchedBills.map(s => (
                      <div 
                        key={s.id} 
                        className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl flex justify-between items-center text-xs text-slate-700"
                      >
                        <div>
                          <div className="font-extrabold">Bill #{s.billNo} • {formatDate(s.date)}</div>
                          <div className="text-[10px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wide">
                            Method: {s.paymentMethod} {s.paymentMethod === 'credit' && (s.creditPaid ? '(Settled)' : '(Unpaid)')}
                          </div>
                        </div>
                        <span className="font-extrabold text-slate-900">
                          Rs.{formatCurrency(s.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 font-medium text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No checkout invoice sales linked to this client yet.
                  </p>
                )}
              </div>

              {/* Delete Client Account */}
              {onDelete && (
                <div className="border-t border-slate-100 pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 text-[10px] font-black uppercase rounded-lg flex items-center gap-1 cursor-pointer transition-colors border border-rose-100/40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Client Profile
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
