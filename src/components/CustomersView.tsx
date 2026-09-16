/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Users, Search, Plus, Phone, Mail, MapPin, Notebook, CreditCard, ChevronRight, Award, MessageCircle, Clock, Send, Check } from 'lucide-react';
import { Customer, Sale, Settings } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { useTranslation } from '../context/LocalizationContext';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface CustomersViewProps {
  customers: Customer[];
  sales: Sale[];
  settings?: Settings;
  onOpenCustomerModal: (customerId: string | null) => void;
  onOpenCustomerDetails: (customerId: string) => void;
  onSendPaymentReminder?: (customerId: string, reminderTimestamp: string) => Promise<void> | void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  sales,
  settings,
  onOpenCustomerModal,
  onOpenCustomerDetails,
  onSendPaymentReminder,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState<string>('');
  const [filterDueOnly, setFilterDueOnly] = useState<boolean>(false);
  const [remindedCustomerId, setRemindedCustomerId] = useState<string | null>(null);

  // Search filter
  const cleanSearch = search.toLowerCase().trim();
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = (
      c.name.toLowerCase().includes(cleanSearch) ||
      (c.phone && c.phone.includes(cleanSearch)) ||
      (c.email && c.email.toLowerCase().includes(cleanSearch))
    );
    if (!matchesSearch) return false;

    if (filterDueOnly) {
      const customerCreditBills = sales.filter(s => s.creditCustId === c.id && s.paymentMethod === 'credit' && !s.creditPaid && !s.voided);
      const outstanding = (c.khataBalance !== undefined && c.khataBalance > 0) 
        ? c.khataBalance 
        : customerCreditBills.reduce((sum, s) => sum + s.total, 0);
      return outstanding > 0;
    }
    return true;
  });

  // Calculate global total outstanding credit
  const creditBills = sales.filter(s => s.paymentMethod === 'credit' && !s.creditPaid && !s.voided);
  const totalOutstandingCredit = creditBills.reduce((sum, s) => sum + s.total, 0);

  // Sorting customers alphabetically
  const sortedCustomers = [...filteredCustomers].sort((a, b) => a.name.localeCompare(b.name));

  const handleSendPaymentReminder = async (e: React.MouseEvent, c: Customer, outstanding: number) => {
    e.stopPropagation();
    const shopName = settings?.shopName || 'Our Store';
    const upiPart = settings?.upiId ? `\n💳 *Pay via UPI:* ${settings.upiId}` : '';
    const reminderMsg = `Namaste ${c.name} ji 🙏,\n\nThis is a friendly payment reminder from *${shopName}* regarding your pending Khata / credit balance of *₹${formatCurrency(outstanding)}*.\n\nKindly clear the pending dues at your earliest convenience.${upiPart}\n\nThank you for choosing ${shopName}!`;

    const nowIso = new Date().toISOString();
    if (onSendPaymentReminder) {
      await onSendPaymentReminder(c.id, nowIso);
    }

    setRemindedCustomerId(c.id);
    setTimeout(() => setRemindedCustomerId(null), 3000);

    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({
          title: `Khata Payment Reminder - ${shopName}`,
          text: reminderMsg,
          dialogTitle: `Send Reminder to ${c.name} via WhatsApp`,
        });
      } else if (c.phone) {
        const cleanPhone = c.phone.replace(/\D/g, '').slice(-10);
        window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(reminderMsg)}`, '_blank', 'noopener,noreferrer');
      } else {
        await navigator.clipboard.writeText(reminderMsg);
        alert(`Reminder message copied to clipboard for ${c.name}!`);
      }
    } catch (err) {
      console.warn('Share dismissed or completed:', err);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-full overflow-x-hidden">
      {/* Search Input and Add Action */}
      <div className="flex flex-col sm:flex-row gap-2 w-full min-w-0">
        <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl px-3 py-2.5 flex items-center gap-2 shadow-xs focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder={t('search_customers')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 text-sm bg-transparent border-none outline-none focus:ring-0 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350 cursor-pointer shrink-0"
            >
              Clear
            </button>
          )}
        </div>
        <button
          onClick={() => onOpenCustomerModal(null)}
          className="px-4 py-2.5 sm:py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-sm shrink-0 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[3px]" />
          <span>{t('add_new_customer')}</span>
        </button>
      </div>

      {/* Credit Summary Indicator */}
      {totalOutstandingCredit > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl p-4 border border-amber-100 dark:border-amber-900/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative overflow-hidden select-none shadow-xs w-full min-w-0">
          <div className="relative z-10 min-w-0 flex-1">
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest block">
              Cumulative Ledger credit
            </span>
            <span className="text-xl font-black text-amber-900 dark:text-amber-200 block mt-1 truncate">
              {settings?.currency || 'Rs.'}{formatCurrency(totalOutstandingCredit)}
            </span>
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-450 block mt-0.5">
              Outstanding across {creditBills.length} pending credit bills
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFilterDueOnly(!filterDueOnly)}
            className={`relative z-10 px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase transition-all shadow-xs cursor-pointer shrink-0 whitespace-nowrap ${
              filterDueOnly 
                ? 'bg-amber-600 text-white shadow-amber-600/30' 
                : 'bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }`}
          >
            {filterDueOnly ? '✓ Showing Dues Only' : 'Filter Dues Pending'}
          </button>
        </div>
      )}

      {/* Sorted directory listings */}
      <div className="space-y-2 w-full min-w-0">
        {sortedCustomers.length > 0 ? (
          sortedCustomers.map(c => {
            // Locate transactions and outstanding stats
            const matchedBills = sales.filter(s => (s.customer === c.name || s.creditCustId === c.id) && !s.voided);
            const customerCreditBills = sales.filter(s => s.creditCustId === c.id && s.paymentMethod === 'credit' && !s.creditPaid && !s.voided);
            const calculatedOutstanding = customerCreditBills.reduce((sum, s) => sum + s.total, 0);
            const outstanding = (c.khataBalance !== undefined && c.khataBalance > 0) ? c.khataBalance : calculatedOutstanding;

            return (
              <div
                key={c.id}
                onClick={() => onOpenCustomerDetails(c.id)}
                className={`w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805/80 hover:bg-slate-50 dark:hover:bg-slate-850/50 rounded-2xl p-3.5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all cursor-pointer group min-w-0 overflow-hidden ${
                    outstanding > 0 ? 'border-l-4 border-l-amber-500' : 'border-l-slate-200 dark:border-l-slate-800'
                }`}
              >
                <div className="min-w-0 flex-1 w-full sm:w-auto pr-0 sm:pr-2">
                  <div className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                    <span className="break-words">{c.name}</span>
                    {outstanding > 0 && (
                      <span className="text-[9px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Khata Due
                      </span>
                    )}
                    {(() => {
                      let earnedPoints = 0;
                      let redeemedPoints = 0;
                      matchedBills.forEach(s => {
                        earnedPoints += Math.floor(s.total / (settings?.loyaltyPointsPerSpend || 50));
                        redeemedPoints += s.pointsRedeemed || 0;
                      });
                      const balance = (c.loyaltyPoints !== undefined) ? c.loyaltyPoints : Math.max(0, earnedPoints - redeemedPoints);
                      return balance > 0 ? (
                        <span className="text-[9px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 font-black px-1.5 py-0.5 rounded-full uppercase flex items-center gap-0.5" title="Available Loyalty Rewards">
                          <Award className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 fill-amber-300 dark:fill-amber-950/25" />
                          {balance} Pts
                        </span>
                      ) : null;
                    })()}
                  </div>
                  
                  <div className="text-[10px] font-semibold text-slate-450 dark:text-slate-500 mt-1 flex flex-wrap gap-2 items-center">
                    {c.phone ? (
                      <span className="flex items-center gap-0.5"><Phone className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />{c.phone}</span>
                    ) : (
                      <span>No contact</span>
                    )}
                    <span>•</span>
                    <span>{matchedBills.length} invoices</span>
                    {c.lastReminderSent && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded-md text-[9px] break-words">
                          <Clock className="w-2.5 h-2.5 shrink-0" />
                          Reminder sent {new Date(c.lastReminderSent).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800 min-w-0">
                  {outstanding > 0 ? (
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto min-w-0">
                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-sm font-black text-amber-650 dark:text-amber-400 block truncate">
                          {settings?.currency || 'Rs.'}{formatCurrency(outstanding)}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                          Pending Due
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleSendPaymentReminder(e, c, outstanding)}
                        className={`px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-xs shrink-0 whitespace-nowrap ${
                          remindedCustomerId === c.id 
                            ? 'bg-emerald-700 text-white' 
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                        title="Send friendly Khata payment reminder on WhatsApp"
                      >
                        {remindedCustomerId === c.id ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Sent!</span>
                          </>
                        ) : (
                          <>
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Send Reminder</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full uppercase shrink-0">
                      Ledger Clear
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-700 group-hover:text-slate-500 dark:group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all hidden sm:block shrink-0" />
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <span className="text-4xl">👥</span>
            <h3 className="font-extrabold text-slate-500 dark:text-slate-400 text-xs mt-1">No customers found</h3>
            <p className="text-[10px] text-slate-450 dark:text-slate-555 mt-0.5">
              {filterDueOnly ? 'No customers currently have outstanding khata balances.' : 'Type correct queries or click "Add Client" to initiate ledger profiles.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
