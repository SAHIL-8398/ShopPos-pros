/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Plus, Trash, CreditCard, DollarSign } from 'lucide-react';
import { Expense } from '../types';
import { formatCurrency, getTodayDateString } from '../utils';
import { useDialog } from '../context/DialogContext';

interface ExpensesModalProps {
  expenses: Expense[];
  onClose: () => void;
  onSaveExpense: (data: { desc: string; amount: number; category: string }) => void;
  onDeleteExpense: (id: string) => void;
}

export const ExpensesModal: React.FC<ExpensesModalProps> = ({
  expenses,
  onClose,
  onSaveExpense,
  onDeleteExpense,
}) => {
  const { showAlert } = useDialog();
  const [desc, setDesc] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('Rent');

  const todayStr = getTodayDateString();

  // Filter today's expenditures to display inside the modal list
  const todayExpenses = expenses.filter(e => e.date === todayStr);
  const totalTodayExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) {
      showAlert('Description is required!', 'Required Field');
      return;
    }
    const numAmt = Number(amount);
    if (!amount || isNaN(numAmt) || numAmt <= 0) {
      showAlert('Enter a valid amount!', 'Invalid Amount');
      return;
    }

    onSaveExpense({
      desc: desc.trim(),
      amount: numAmt,
      category,
    });

    setDesc('');
    setAmount('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1000] flex items-end sm:items-center justify-center p-3 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl w-full max-w-sm max-h-[92vh] overflow-y-auto p-5 shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </span>
              Cash Outflow Expenses
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 mb-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Expense Description *
              </label>
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="e.g. Monthly Electricity Bill"
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:border-indigo-500 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Amount in Rs. *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 1500"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 font-semibold"
                >
                  <option value="Rent">Rent</option>
                  <option value="Electricity">Electricity</option>
                  <option value="Salaries">Salaries</option>
                  <option value="Purchase">Purchase</option>
                  <option value="Transport">Transport</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform shadow-xs"
            >
              <Plus className="w-4 h-4 stroke-[2.5px]" />
              Log Outflow Expense
            </button>
          </form>

          {/* Today's Expense List */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3.5 space-y-2 select-none">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Today's Logged Expenses
              </span>
              {totalTodayExpenses > 0 && (
                <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                  Total: Rs.{formatCurrency(totalTodayExpenses)}
                </span>
              )}
            </div>

            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-0.5">
              {todayExpenses.length > 0 ? (
                todayExpenses.map(e => (
                  <div
                    key={e.id}
                    className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750 p-3 rounded-xl flex justify-between items-center gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-black text-xs text-slate-900 dark:text-slate-100 truncate block">
                        {e.desc}
                      </span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-bold uppercase">
                        {e.category} {e.time ? `• ${e.time}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-black text-xs text-rose-600 dark:text-rose-400">
                        Rs.{formatCurrency(e.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteExpense(e.id)}
                        className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded p-1 cursor-pointer"
                        title="Delete entry"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center py-6">
                  No outflows logged today. Check and log expenses to track profits accurately!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
