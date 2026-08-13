import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Calculator } from 'lucide-react';

interface CalculatorModalProps {
  onClose: () => void;
}

interface CalcState {
  display: string;
  formula: string;
  prevValue: number | null;
  operator: string | null;
  resetOnNext: boolean;
}

function getNextState(action: { type: string; payload?: string }, state: CalcState): CalcState {
  const { display, formula, prevValue, operator, resetOnNext } = state;

  switch (action.type) {
    case 'DIGIT': {
      const digit = action.payload!;
      if (resetOnNext) {
        if (formula.includes('=')) {
          return {
            display: digit,
            formula: digit,
            prevValue: null,
            operator: null,
            resetOnNext: false,
          };
        } else {
          return {
            ...state,
            display: digit,
            formula: formula + digit,
            resetOnNext: false,
          };
        }
      } else {
        const newDisplay = display === '0' ? digit : display + digit;
        let newFormula = formula;
        if (formula === '' || formula === '0') {
          newFormula = digit;
        } else {
          if (display === '0') {
            newFormula = formula.endsWith('0') ? formula.slice(0, -1) + digit : formula + digit;
          } else {
            newFormula = formula + digit;
          }
        }
        return {
          ...state,
          display: newDisplay,
          formula: newFormula,
        };
      }
    }

    case 'DECIMAL': {
      if (resetOnNext) {
        if (formula.includes('=')) {
          return {
            display: '0.',
            formula: '0.',
            prevValue: null,
            operator: null,
            resetOnNext: false,
          };
        } else {
          return {
            ...state,
            display: '0.',
            formula: formula + '0.',
            resetOnNext: false,
          };
        }
      }
      if (!display.includes('.')) {
        return {
          ...state,
          display: display + '.',
          formula: formula === '' ? '0.' : formula + '.',
        };
      }
      return state;
    }

    case 'OPERATOR': {
      const op = action.payload!;
      const currentVal = parseFloat(display);

      if (operator && !resetOnNext && prevValue !== null) {
        let result = 0;
        switch (operator) {
          case '+': result = prevValue + currentVal; break;
          case '-': result = prevValue - currentVal; break;
          case '×': result = prevValue * currentVal; break;
          case '÷': 
            if (currentVal === 0) {
              return {
                display: 'Error',
                formula: 'Error',
                prevValue: null,
                operator: null,
                resetOnNext: true,
              };
            }
            result = prevValue / currentVal; 
            break;
        }
        const formattedResult = parseFloat(result.toFixed(8)).toString();
        return {
          display: formattedResult,
          formula: `${formattedResult} ${op} `,
          prevValue: result,
          operator: op,
          resetOnNext: true,
        };
      } else {
        if (resetOnNext && operator) {
          const trimmed = formula.trim();
          const parts = trimmed.split(' ');
          let newFormula = formula;
          if (parts.length >= 2) {
            parts[parts.length - 1] = op;
            newFormula = parts.join(' ') + ' ';
          } else {
            newFormula = `${display} ${op} `;
          }
          return {
            ...state,
            operator: op,
            formula: newFormula,
          };
        } else {
          return {
            display,
            formula: `${display} ${op} `,
            prevValue: currentVal,
            operator: op,
            resetOnNext: true,
          };
        }
      }
    }

    case 'EVALUATE': {
      if (!operator || prevValue === null) return state;
      const currentVal = parseFloat(display);
      let result = 0;
      switch (operator) {
        case '+': result = prevValue + currentVal; break;
        case '-': result = prevValue - currentVal; break;
        case '×': result = prevValue * currentVal; break;
        case '÷': 
          if (currentVal === 0) {
            return {
              display: 'Error',
              formula: 'Error',
              prevValue: null,
              operator: null,
              resetOnNext: true,
            };
          }
          result = prevValue / currentVal; 
          break;
      }
      const formattedResult = parseFloat(result.toFixed(8)).toString();
      return {
        display: formattedResult,
        formula: `${prevValue} ${operator} ${currentVal} = ${formattedResult}`,
        prevValue: null,
        operator: null,
        resetOnNext: true,
      };
    }

    case 'BACKSPACE': {
      if (resetOnNext) {
        return {
          ...state,
          display: '0',
          resetOnNext: false,
        };
      }
      if (display.length > 1) {
        const newDisplay = display.slice(0, -1);
        return {
          ...state,
          display: newDisplay,
          formula: formula.length > 1 ? formula.slice(0, -1) : '',
        };
      } else {
        return {
          ...state,
          display: '0',
          formula: formula.length <= 1 ? '' : formula.slice(0, -1) + '0',
        };
      }
    }

    case 'CLEAR': {
      return {
        display: '0',
        formula: '',
        prevValue: null,
        operator: null,
        resetOnNext: false,
      };
    }

    case 'PERCENT': {
      const currentVal = parseFloat(display);
      if (!isNaN(currentVal)) {
        const percentVal = currentVal / 100;
        const formatted = parseFloat(percentVal.toFixed(8)).toString();
        let newFormula = formula;
        if (formula.endsWith(display)) {
          newFormula = formula.slice(0, -display.length) + formatted;
        } else {
          newFormula = formatted;
        }
        return {
          ...state,
          display: formatted,
          formula: newFormula,
        };
      }
      return state;
    }

    case 'TOGGLE_SIGN': {
      const currentVal = parseFloat(display);
      if (!isNaN(currentVal) && currentVal !== 0) {
        const toggled = (currentVal * -1).toString();
        let newFormula = formula;
        if (formula.endsWith(display)) {
          newFormula = formula.slice(0, -display.length) + toggled;
        } else {
          newFormula = toggled;
        }
        return {
          ...state,
          display: toggled,
          formula: newFormula,
        };
      }
      return state;
    }

    default:
      return state;
  }
}

export function CalculatorModal({ onClose }: CalculatorModalProps) {
  const [state, setState] = useState<CalcState>({
    display: '0',
    formula: '',
    prevValue: null,
    operator: null,
    resetOnNext: false,
  });

  // Snappy, zero-re-binding keyboard event listener attached once
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      let action: { type: string; payload?: string } | null = null;

      if (key >= '0' && key <= '9') {
        action = { type: 'DIGIT', payload: key };
      } else if (key === '.') {
        action = { type: 'DECIMAL' };
      } else if (key === '+' || key === '-' || key === '*' || key === '/') {
        const mappedOp = key === '*' ? '×' : key === '/' ? '÷' : key;
        action = { type: 'OPERATOR', payload: mappedOp };
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        action = { type: 'EVALUATE' };
      } else if (key === 'Backspace') {
        action = { type: 'BACKSPACE' };
      } else if (key === 'Escape' || key === 'c' || key === 'C') {
        action = { type: 'CLEAR' };
      }

      if (action) {
        setState(prev => getNextState(action!, prev));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleDigit = (digit: string) => {
    setState(prev => getNextState({ type: 'DIGIT', payload: digit }, prev));
  };

  const handleDecimal = () => {
    setState(prev => getNextState({ type: 'DECIMAL' }, prev));
  };

  const handleClear = () => {
    setState(prev => getNextState({ type: 'CLEAR' }, prev));
  };

  const handleBackspace = () => {
    setState(prev => getNextState({ type: 'BACKSPACE' }, prev));
  };

  const handleOperator = (op: string) => {
    setState(prev => getNextState({ type: 'OPERATOR', payload: op }, prev));
  };

  const handleEvaluate = () => {
    setState(prev => getNextState({ type: 'EVALUATE' }, prev));
  };

  const handlePercent = () => {
    setState(prev => getNextState({ type: 'PERCENT' }, prev));
  };

  const handleToggleSign = () => {
    setState(prev => getNextState({ type: 'TOGGLE_SIGN' }, prev));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-950 rounded-2xl w-full max-w-xs p-5 relative border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Quick Calculator
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-205 bg-slate-100 dark:bg-slate-900 rounded-full p-1 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Display area */}
        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-right flex flex-col justify-end min-h-[85px] border border-slate-100 dark:border-slate-800 select-all font-mono">
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-extrabold min-h-[16px] overflow-hidden truncate tracking-wide">
            {state.formula || <span className="text-slate-300 dark:text-slate-600">Start calculating...</span>}
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100 overflow-x-auto whitespace-nowrap scrollbar-none mt-1">
            {state.display}
          </div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-4 gap-2 text-xs font-black">
          {/* Row 1 */}
          <button
            type="button"
            onClick={handleClear}
            className="py-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-955 transition-colors cursor-pointer active:scale-95"
          >
            AC
          </button>
          <button
            type="button"
            onClick={handleToggleSign}
            className="py-3.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
          >
            +/-
          </button>
          <button
            type="button"
            onClick={handlePercent}
            className="py-3.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
          >
            %
          </button>
          <button
            type="button"
            onClick={() => handleOperator('÷')}
            className="py-3.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer active:scale-95 text-sm"
          >
            ÷
          </button>

          {/* Row 2 */}
          <button
            type="button"
            onClick={() => handleDigit('7')}
            className="py-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
          >
            7
          </button>
          <button
            type="button"
            onClick={() => handleDigit('8')}
            className="py-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
          >
            8
          </button>
          <button
            type="button"
            onClick={() => handleDigit('9')}
            className="py-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
          >
            9
          </button>
          <button
            type="button"
            onClick={() => handleOperator('×')}
            className="py-3.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer active:scale-95 text-sm"
          >
            ×
          </button>

          {/* Row 3 */}
          <button
            type="button"
            onClick={() => handleDigit('4')}
            className="py-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
          >
            4
          </button>
          <button
            type="button"
            onClick={() => handleDigit('5')}
            className="py-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
          >
            5
          </button>
          <button
            type="button"
            onClick={() => handleDigit('6')}
            className="py-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-slate-850 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
          >
            6
          </button>
          <button
            type="button"
            onClick={() => handleOperator('-')}
            className="py-3.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer active:scale-95 text-sm"
          >
            -
          </button>

          {/* Row 4 */}
          <button
            type="button"
            onClick={() => handleDigit('1')}
            className="py-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
          >
            1
          </button>
          <button
            type="button"
            onClick={() => handleDigit('2')}
            className="py-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
          >
            2
          </button>
          <button
            type="button"
            onClick={() => handleDigit('3')}
            className="py-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-slate-850 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
          >
            3
          </button>
          <button
            type="button"
            onClick={() => handleOperator('+')}
            className="py-3.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer active:scale-95 text-sm"
          >
            +
          </button>

          {/* Row 5 */}
          <button
            type="button"
            onClick={handleBackspace}
            className="py-3.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
            title="Backspace"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="py-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDecimal}
            className="py-3.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-850 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
          >
            .
          </button>
          <button
            type="button"
            onClick={handleEvaluate}
            className="py-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer active:scale-95 text-sm"
          >
            =
          </button>
        </div>
      </div>
    </div>
  );
}
