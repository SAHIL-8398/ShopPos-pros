import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export interface DialogConfig {
  isOpen: boolean;
  type: 'alert' | 'confirm' | 'prompt';
  title: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  resolve?: (val: any) => void;
}

export interface DialogContextType {
  showAlert: (message: string, title?: string) => Promise<void>;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
  showPrompt: (message: string, defaultValue?: string, title?: string, placeholder?: string) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export function useDialog(): DialogContextType {
  const context = useContext(DialogContext);
  if (!context) {
    // Fallback if accessed outside provider
    return {
      showAlert: async (msg: string, title = 'Alert') => {
        window.alert(`${title ? title + '\n\n' : ''}${msg}`);
      },
      showConfirm: async (msg: string, title = 'Confirm Action') => {
        return window.confirm(`${title ? title + '\n\n' : ''}${msg}`);
      },
      showPrompt: async (msg: string, def = '', title = 'Input Required') => {
        return window.prompt(`${title ? title + '\n\n' : ''}${msg}`, def);
      }
    };
  }
  return context;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialogConfig, setDialogConfig] = useState<DialogConfig | null>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);

  const showAlert = useCallback((message: string, title = 'Alert') => {
    return new Promise<void>((resolve) => {
      setDialogConfig({
        isOpen: true,
        type: 'alert',
        title,
        message,
        resolve: () => resolve()
      });
    });
  }, []);

  const showConfirm = useCallback((message: string, title = 'Confirm Action') => {
    return new Promise<boolean>((resolve) => {
      setDialogConfig({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        resolve: (val: boolean) => resolve(val)
      });
    });
  }, []);

  const showPrompt = useCallback((message: string, defaultValue = '', title = 'Input Required', placeholder = 'Type here...') => {
    return new Promise<string | null>((resolve) => {
      setDialogConfig({
        isOpen: true,
        type: 'prompt',
        title,
        message,
        defaultValue,
        placeholder,
        resolve: (val: string | null) => resolve(val)
      });
    });
  }, []);

  const handleClose = (result: any) => {
    if (dialogConfig?.resolve) {
      dialogConfig.resolve(result);
    }
    setDialogConfig(null);
  };

  const isDestructive = dialogConfig
    ? dialogConfig.title.toLowerCase().includes('delete') ||
      dialogConfig.title.toLowerCase().includes('void') ||
      dialogConfig.title.toLowerCase().includes('wipe') ||
      dialogConfig.title.toLowerCase().includes('discard') ||
      dialogConfig.title.toLowerCase().includes('clear') ||
      dialogConfig.title.toLowerCase().includes('remove')
    : false;

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}
      {dialogConfig && (
        <div className="fixed inset-0 bg-slate-950/80 dark:bg-slate-950/90 backdrop-blur-xs z-[99999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1.5">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                {dialogConfig.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-pre-line leading-relaxed">
                {dialogConfig.message}
              </p>
            </div>

            {dialogConfig.type === 'prompt' && (
              <div>
                <input
                  ref={promptInputRef}
                  id="custom-dialog-prompt-input"
                  type="text"
                  defaultValue={dialogConfig.defaultValue || ''}
                  placeholder={dialogConfig.placeholder || 'Type here...'}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 font-medium"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleClose(e.currentTarget.value);
                    }
                  }}
                  autoFocus
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              {dialogConfig.type !== 'alert' && (
                <button
                  type="button"
                  onClick={() => handleClose(dialogConfig.type === 'prompt' ? null : false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-850 hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-black uppercase rounded-xl transition-all cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (dialogConfig.type === 'prompt') {
                    const inputEl = promptInputRef.current || (document.getElementById('custom-dialog-prompt-input') as HTMLInputElement);
                    handleClose(inputEl ? inputEl.value : (dialogConfig.defaultValue || ''));
                  } else {
                    handleClose(true);
                  }
                }}
                className={`px-4 py-2 text-white text-[11px] font-black uppercase rounded-xl transition-all cursor-pointer active:scale-95 ${
                  isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}
