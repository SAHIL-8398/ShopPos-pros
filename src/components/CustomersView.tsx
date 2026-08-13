/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Users, Search, Plus, Phone, Mail, MapPin, Notebook, CreditCard, ChevronRight, Award } from 'lucide-react';
import { Customer, Sale } from '../types';
import { formatCurrency } from '../utils';
import { useTranslation } from '../context/LocalizationContext';

interface CustomersViewProps {
  customers: Customer[];
  sales: Sale[];
  onOpenCustomerModal: (customerId: string | null) => void;
  onOpenCustomerDetails: (customerId: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  sales,
  onOpenCustomerModal,
  onOpenCustomerDetails,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState<string>('');

  // Search filter
  const cleanSearch = search.toLowerCase().trim();
  const filteredCustomers = customers.filter(c => {
    return (
      c.name.toLowerCase().includes(cleanSearch) ||
      (c.phone && c.phone.includes(cleanSearch)) ||
      (c.email && c.email.toLowerCase().includes(cleanSearch))
    );
  });

  // Calculate global total outstanding credit
  const creditBills = sales.filter(s => s.paymentMethod === 'credit' && !s.creditPaid && !s.voided);
  const totalOutstandingCredit = creditBills.reduce((sum, s) => sum + s.total, 0);

  // Sorting customers alphabetically
  const sortedCustomers = [...filteredCustomers].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-3">
      {/* Search Input and Add Action */}
      <div className="flex gap-2">
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl px-3 py-2.5 flex items-center gap-2 shadow-xs focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder={t('search_customers')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm bg-transparent border-none outline-none focus:ring-0 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
        <button
          onClick={() => onOpenCustomerModal(null)}
          className="px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4 stroke-[3px]" />
          {t('add_new_customer')}
        </button>
      </div>

      {/* Credit Summary Indicator */}
      {totalOutstandingCredit > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl p-4 border border-amber-100 dark:border-amber-900/30 flex justify-between items-center relative overflow-hidden select-none shadow-xs">
          <div className="relative z-10">
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest block">
              Cumulative Ledger credit
            </span>
            <span className="text-xl font-black text-amber-900 dark:text-amber-200 block mt-1">
              Rs.{formatCurrency(totalOutstandingCredit)}
            </span>
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-450 block mt-0.5">
              Outstanding across {creditBills.length} pending checkin bills
            </span>
          </div>
          <Notebook className="w-12 h-12 text-amber-300 dark:text-amber-800 opacity-20 absolute -right-1" />
        </div>
      )}

      {/* Sorted directory listings */}
      <div className="space-y-1.5">
        {sortedCustomers.length > 0 ? (
          sortedCustomers.map(c => {
            // Locate transactions and outstanding stats
            const matchedBills = sales.filter(s => (s.customer === c.name || s.creditCustId === c.id) && !s.voided);
            const customerCreditBills = sales.filter(s => s.creditCustId === c.id && s.paymentMethod === 'credit' && !s.creditPaid && !s.voided);
            const outstanding = customerCreditBills.reduce((sum, s) => sum + s.total, 0);

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onOpenCustomerDetails(c.id)}
                className={`w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805/80 hover:bg-slate-50 dark:hover:bg-slate-850/50 rounded-xl p-3 shadow-xs flex justify-between items-center transition-all cursor-pointer active:scale-[0.99] group ${
                    outstanding > 0 ? 'border-l-4 border-l-amber-500' : 'border-l-slate-200 dark:border-l-slate-800'
                }`}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                    {c.name}
                    {outstanding > 0 && (
                      <span className="text-[9px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        Credit
                      </span>
                    )}
                    {(() => {
                      let earnedPoints = 0;
                      let redeemedPoints = 0;
                      matchedBills.forEach(s => {
                        earnedPoints += Math.floor(s.total / 50);
                        redeemedPoints += s.pointsRedeemed || 0;
                      });
                      const balance = Math.max(0, earnedPoints - redeemedPoints);
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
                      <span className="flex items-center gap-0.5"><Phone className="w-3 h-3 text-slate-400 dark:text-slate-500" />{c.phone}</span>
                    ) : (
                      <span>No contact</span>
                    )}
                    <span>•</span>
                    <span>{matchedBills.length} invoice transactions</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 text-right">
                  {outstanding > 0 ? (
                    <div>
                      <span className="text-xs font-black text-amber-650 dark:text-amber-400 block">
                        Rs.{formatCurrency(outstanding)}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block uppercase">
                        Due
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full uppercase">
                      Clear
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-700 group-hover:text-slate-500 dark:group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            );
          })
        ) : (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <span className="text-4xl">👥</span>
            <h3 className="font-extrabold text-slate-500 dark:text-slate-400 text-xs mt-1">No customers registered</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-550 mt-0.5">
              Type correct queries or click "Add Client" to initiate ledger profiles.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
