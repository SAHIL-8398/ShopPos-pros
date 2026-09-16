/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import { Share2, FileDown, MessageCircle, RefreshCw, X, Check, FolderCheck, Printer, Bluetooth, Star, FileText } from 'lucide-react';
import { Sale, Settings } from '../types';
import { formatCurrency, copyToClipboard, formatDate, generateUpiQrDataUrl, getPdfCurrency } from '../utils';
import { useDialog } from '../context/DialogContext';
import { savePdfToAppFolder, isNativeCapacitor } from '../services/nativeStorage';
import { printPdfDocument, sharePdfDocument, printThermalReceipt } from '../services/printService';
import { printReceiptViaBluetooth, scanAndConnectPrinter, isBluetoothAvailable, getConnectedPrinterInfo } from '../services/bluetoothPrinterService';
import { Share } from '@capacitor/share';
import { BillFormatKey, BILL_FORMATS, getBillFormatConfig } from '../constants/billFormats';
import { generateInvoicePdfDoc } from '../services/invoicePdfService';
import { FormattedInvoiceView } from './FormattedInvoiceView';

const getBarcodeDataURL = (text: string): string => {
  const canvas = document.createElement('canvas');
  try {
    JsBarcode(canvas, text, {
      format: 'CODE128',
      displayValue: true,
      fontSize: 12,
      height: 40,
      width: 2.0,
      margin: 10,
      textMargin: 4,
      background: '#ffffff',
      lineColor: '#000000'
    });
    return canvas.toDataURL('image/png');
  } catch (e) {
    console.warn('Failed to generate barcode data URL', e);
    return '';
  }
};

const loadAnyQrCode = (text: string): Promise<string> => {
  return new Promise((resolve) => {
    // Compression: Fetch a smaller 100x100 image which is extremely readable and fast to load
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(text)}`;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        // Compress as JPEG at 0.65 quality to drastically reduce the PDF size
        resolve(canvas.toDataURL('image/jpeg', 0.65));
      } else {
        resolve('');
      }
    };
    img.onerror = () => {
      resolve('');
    };
    img.src = url;
  });
};

const loadQrCode = async (upi: string, name: string, total: number): Promise<string> => {
  if (!upi) return '';
  try {
    return await generateUpiQrDataUrl({
      upiId: upi,
      payeeName: name,
      amount: total,
      width: 150,
    });
  } catch (err) {
    console.error('Error generating receipt UPI QR:', err);
    return '';
  }
};


interface ReceiptViewProps {
  sale: Sale;
  settings: Settings;
  onClose: () => void;
  onNewBill?: () => void;
  showNewBillButton?: boolean;
  onUpdateSettings?: (info: Partial<Settings>) => Promise<void> | void;
}

export function buildReceiptText(sale: Sale, settings: Settings): string {
  const w = 32;
  const line = '-'.repeat(w);
  const ctr = (t: string) => {
    const sp = Math.max(0, Math.floor((w - t.length) / 2));
    return ' '.repeat(sp) + t;
  };
  const lr = (left: string, right: string) => {
    const sp = Math.max(1, w - left.length - right.length);
    return left + ' '.repeat(sp) + right;
  };

  const wrapText = (text: string, maxLen: number): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      if (!word) return;
      if ((currentLine + (currentLine ? ' ' : '') + word).length <= maxLen) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        if (word.length > maxLen) {
          let remaining = word;
          while (remaining.length > maxLen) {
            lines.push(remaining.slice(0, maxLen));
            remaining = remaining.slice(maxLen);
          }
          currentLine = remaining;
        } else {
          currentLine = word;
        }
      }
    });
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  };

  let r = '';
  if (settings.showShopNameOnBill !== false && settings.shopName) {
    settings.shopName.split('\n').forEach(rl => {
      wrapText(rl, w).forEach(l => {
        r += ctr(l) + '\n';
      });
    });
  }
  if (settings.showAddressOnBill !== false && settings.address) {
    settings.address.split('\n').forEach(rl => {
      wrapText(rl, w).forEach(l => {
        r += ctr(l) + '\n';
      });
    });
  }
  if (settings.showPhoneOnBill !== false && settings.phone) {
    r += ctr('Ph: ' + settings.phone) + '\n';
  }
  if (settings.showGstinOnBill !== false && settings.gstin) {
    r += ctr('GSTIN: ' + settings.gstin) + '\n';
  }
  if (settings.showFssaiOnBill !== false && settings.fssai) {
    r += ctr('FSSAI Lic. No: ' + settings.fssai) + '\n';
  }
  
  r += line + '\n';
  r += ctr(`BILL #${sale.billNo}`) + '\n';
  if (settings.showDateOnBill !== false) {
    r += `Date: ${formatDate(sale.date)}  Time: ${sale.time || ''}\n`;
  }
  
  if (settings.showCustomerOnBill !== false && sale.customer) {
    r += `Customer: ${sale.customer}\n`;
    if (sale.customerPhone) {
      r += `Mob: ${sale.customerPhone}\n`;
    }
    if (sale.customerAddress) {
      wrapText(sale.customerAddress, w - 6).forEach((l, idx) => {
        if (idx === 0) {
          r += `Addr: ${l}\n`;
        } else {
          r += `      ${l}\n`;
        }
      });
    }
  }
  if (settings.showStaffOnBill !== false && sale.staffName) {
    r += `Staff: ${sale.staffName}\n`;
  }
  
  r += line + '\n';
  sale.items.forEach(i => {
    r += `${i.name}\n`;
    const cur = getPdfCurrency(settings.currency);
    r += lr(`  ${i.qty}x ${cur}${formatCurrency(i.price)}`, `${cur}${formatCurrency(i.price * i.qty)}`) + '\n';
  });
  
  const cur = getPdfCurrency(settings.currency);
  r += line + '\n';
  r += lr('Subtotal', `${cur}${formatCurrency(sale.subtotal)}`) + '\n';
  
  if (sale.discount > 0) {
    r += lr('Discount', `-${cur}${formatCurrency(sale.discount)}`) + '\n';
  }
  if (sale.gst > 0) {
    r += lr(`GST (${sale.gstPct || 0}%)`, `${cur}${formatCurrency(sale.gst)}`) + '\n';
  }
  
  r += lr('TOTAL', `${cur}${formatCurrency(sale.total)}`) + '\n';
  if (sale.paymentMethod === 'split') {
    const split = sale.splitDetails || { cashAmount: 0, upiAmount: 0 };
    r += lr('Payment', 'SPLIT PAYMENT') + '\n';
    r += lr(' - Cash portion', `${cur}${formatCurrency(split.cashAmount)}`) + '\n';
    r += lr(' - UPI portion', `${cur}${formatCurrency(split.upiAmount)}`) + '\n';
  } else {
    r += lr('Payment', (sale.paymentMethod || 'cash').toUpperCase() + (sale.paymentMethod === 'credit' ? ' (CREDIT)' : '')) + '\n';
  }
  r += line + '\n';
  
  if (settings.showUpiQrOnBill !== false && settings.upi) {
    r += ctr('UPI: ' + settings.upi) + '\n';
  }
  if (settings.showFooterOnBill !== false && settings.footer) {
    r += '\n';
    wrapText(settings.footer, w).forEach(l => {
      r += ctr(l) + '\n';
    });
  }
  if (settings.showTermsOnBill === true && settings.termsTextOnBill) {
    r += '\n' + ctr('TERMS & CONDITIONS') + '\n';
    settings.termsTextOnBill.split('\n').forEach(tl => {
      if (tl.trim()) {
        wrapText(tl.trim(), w).forEach(l => {
          r += ctr(l) + '\n';
        });
      }
    });
  }
  
  return r;
}

export const ReceiptView: React.FC<ReceiptViewProps> = ({
  sale,
  settings,
  onClose,
  onNewBill,
  showNewBillButton = true,
  onUpdateSettings
}) => {
  const { showAlert } = useDialog();
  const [copied, setCopied] = React.useState(false);
  const [paperSize, setPaperSize] = React.useState<'58mm' | '80mm'>(settings.preferredReceiptPaperSize || '58mm');
  const [isPrintingThermal, setIsPrintingThermal] = React.useState(false);
  const [billFormat, setBillFormat] = React.useState<BillFormatKey>(settings.billFormat || 'regular');
  const [viewMode, setViewMode] = React.useState<'formatted' | 'rawText'>('formatted');
  const [isSavingFormatDefault, setIsSavingFormatDefault] = React.useState(false);
  const [savedDefaultNotice, setSavedDefaultNotice] = React.useState(false);
  const [barcodeDataUrl, setBarcodeDataUrl] = React.useState<string>('');
  const [upiQrDataUrl, setUpiQrDataUrl] = React.useState<string>('');

  const activeFormatConfig = React.useMemo(() => getBillFormatConfig(billFormat), [billFormat]);
  const receiptText = buildReceiptText(sale, settings);
  const barcodeRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, String(sale.billNo), {
          format: 'CODE128',
          displayValue: true,
          fontSize: 11,
          height: 42,
          width: 1.8,
          margin: 8,
          background: '#ffffff',
          lineColor: '#000000'
        });
        setBarcodeDataUrl(barcodeRef.current.toDataURL('image/png'));
      } catch (err) {
        console.warn('Bill barcode render error:', err);
      }
    }
  }, [sale.billNo]);

  React.useEffect(() => {
    let isMounted = true;
    if (settings.upi) {
      loadQrCode(settings.upi, settings.shopName || 'ShopPOS Store', sale.total).then(url => {
        if (isMounted && url) {
          setUpiQrDataUrl(url);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [settings.upi, settings.shopName, sale.total]);

  const handleSaveAsDefault = async () => {
    if (!onUpdateSettings) return;
    setIsSavingFormatDefault(true);
    try {
      await onUpdateSettings({ billFormat });
      setSavedDefaultNotice(true);
      setTimeout(() => setSavedDefaultNotice(false), 2500);
    } catch (e: any) {
      showAlert(`Could not save format default: ${e?.message || e}`, 'Settings');
    } finally {
      setIsSavingFormatDefault(false);
    }
  };

  // Keyboard shortcut Ctrl+P / Cmd+P to trigger Thermal Receipt print
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrintThermal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paperSize, sale, settings]);

  const handlePrintThermal = async (chosenSize?: '58mm' | '80mm') => {
    const sizeToUse = chosenSize || paperSize;
    setIsPrintingThermal(true);
    try {
      const barcodeCanvas = barcodeRef.current;
      const barcodeDataUrl = barcodeCanvas ? barcodeCanvas.toDataURL('image/png') : getBarcodeDataURL(String(sale.billNo));

      const res = await printThermalReceipt({
        sale,
        settings,
        paperSize: sizeToUse,
        barcodeDataUrl,
      });

      if (!res.success) {
        showAlert(res.error || 'Could not trigger printer dialog.', 'Thermal Print');
      }
    } catch (err: any) {
      showAlert(`Thermal print error: ${err?.message || err}`, 'Print Error');
    } finally {
      setIsPrintingThermal(false);
    }
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(receiptText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    try {
      if (isNativeCapacitor()) {
        await Share.share({
          title: `Bill #${sale.billNo} - ${settings.shopName || 'ShopPOS'}`,
          text: receiptText,
          dialogTitle: 'Share Invoice Text',
        });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: `Bill #${sale.billNo} from ${settings.shopName || 'ShopPOS'}`,
          text: receiptText,
        });
      } else {
        await handleCopy();
      }
    } catch {
      await handleCopy();
    }
  };

  const [showShareModal, setShowShareModal] = React.useState(false);
  const [isSharing, setIsSharing] = React.useState(false);
  const [autoSavedNotice, setAutoSavedNotice] = React.useState<string | null>(null);

  // Auto-save bill/invoice PDF to dedicated device folder on native Capacitor
  React.useEffect(() => {
    let isMounted = true;
    const autoSaveInvoice = async () => {
      if (!isNativeCapacitor()) return;
      try {
        const doc = await generateA4PDFDoc();
        const base64 = doc.output('datauristring');
        const filename = `Invoice_${sale.billNo}_A4.pdf`;
        const res = await savePdfToAppFolder(base64, filename, 'Invoices');
        if (res.success && isMounted) {
          setAutoSavedNotice(`Saved to: ${res.path}`);
        }
      } catch (err) {
        console.warn('Auto-save invoice to native filesystem failed:', err);
      }
    };
    autoSaveInvoice();
    return () => {
      isMounted = false;
    };
  }, [sale.billNo]);

  const generateThermalPDFDoc = async (is58mm: boolean): Promise<jsPDF> => {
    // Calculate page height dynamically to prevent cut-off or excessive trailing white spacing
    const lineCount = receiptText.split('\n').length;
    let computedHeight = lineCount * (is58mm ? 3.5 : 4) + 12; // base margin
    
    if (settings.showBarcodeOnBill !== false) {
      computedHeight += is58mm ? 42 : 46;
    }
    if (settings.showUpiQrOnBill !== false && settings.upi) {
      computedHeight += is58mm ? 38 : 44;
    }
    
    const finalHeight = Math.max(is58mm ? 120 : 150, computedHeight);

    const doc = new jsPDF({
      unit: 'mm',
      format: [is58mm ? 58 : 80, finalHeight],
      compress: true
    });
    doc.setProperties({
      title: `Secured Thermal Bill - Bill #${sale.billNo}`,
      subject: `Original Digitally Secured Invoice #${sale.billNo} - Non-editable Copy`,
      author: settings.shopName || 'ShopPOS Store',
      creator: 'ShopPOS billing engine',
      keywords: 'invoice, non-editable, locked, secured, authentic'
    });
    doc.setFont('courier', 'normal');
    doc.setFontSize(is58mm ? 6.5 : 8);
    
    let y = is58mm ? 8 : 10;
    receiptText.split('\n').forEach(line => {
      const formattedLine = is58mm && line.length > 32 ? line.slice(0, 31) + '…' : line;
      doc.text(formattedLine, is58mm ? 3 : 5, y);
      y += is58mm ? 3.5 : 4;
    });

    // Render transaction barcode on receipt bottom rolls
    if (settings.showBarcodeOnBill !== false) {
      const barcodeImg = getBarcodeDataURL(String(sale.billNo));
      if (barcodeImg) {
        y += 2;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.line(is58mm ? 3 : 5, y, is58mm ? 55 : 75, y);
        y += is58mm ? 4 : 5;
        doc.text('RETURN SCAN BARCODE & QR:', is58mm ? 3 : 5, y);
        y += 2;
        doc.addImage(barcodeImg, 'PNG', is58mm ? 6 : 12, y, is58mm ? 46 : 56, is58mm ? 11 : 12, undefined, 'FAST');
        y += is58mm ? 13 : 14;

        // Draw Bill QR Code
        const billQrBase64 = await loadAnyQrCode(String(sale.billNo));
        if (billQrBase64) {
          doc.addImage(billQrBase64, 'JPEG', is58mm ? 19 : 28, y, is58mm ? 20 : 24, is58mm ? 20 : 24, undefined, 'FAST');
          y += is58mm ? 22 : 26;
        }
      }
    }

    // Render payment QR on receipt bottom rolls
    if (settings.showUpiQrOnBill !== false && settings.upi) {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(is58mm ? 3 : 5, y, is58mm ? 55 : 75, y);
      y += is58mm ? 4 : 5;
      doc.text('SCAN TO PAY (UPI):', is58mm ? 3 : 5, y);
      y += 2;
      const qrBase64 = await loadQrCode(settings.upi, settings.shopName || 'ShopPOS Store', sale.total);
      if (qrBase64) {
        doc.addImage(qrBase64, 'JPEG', is58mm ? 14 : 22, y, is58mm ? 30 : 36, is58mm ? 30 : 36, undefined, 'FAST');
        y += is58mm ? 32 : 38;
      }
    }

    return doc;
  };

  const generateA4PDFDoc = async (overrideFormat?: BillFormatKey): Promise<jsPDF> => {
    return generateInvoicePdfDoc(sale, settings, overrideFormat || billFormat, receiptText);
  };

  const handleDownloadPDF = async () => {
    try {
      const doc = await generateThermalPDFDoc(false);
      const filename = `Bill_${sale.billNo}_Thermal.pdf`;
      if (isNativeCapacitor()) {
        const base64 = doc.output('datauristring');
        const res = await savePdfToAppFolder(base64, filename, 'Invoices');
        if (res.success) {
          showAlert(`Receipt PDF saved directly to:\n${res.path}`, 'PDF Saved to Device');
        } else {
          showAlert(`Could not save PDF: ${res.error}`, 'Save Error');
        }
      } else {
        doc.save(filename);
      }
    } catch (e: any) {
      showAlert(`Thermal PDF Error: ${e.message}`, 'PDF Error');
    }
  };

  const handleDownload58mmPDF = async () => {
    try {
      const doc = await generateThermalPDFDoc(true);
      const filename = `Bill_${sale.billNo}_Thermal_58mm.pdf`;
      if (isNativeCapacitor()) {
        const base64 = doc.output('datauristring');
        const res = await savePdfToAppFolder(base64, filename, 'Invoices');
        if (res.success) {
          showAlert(`58mm Receipt PDF saved directly to:\n${res.path}`, 'PDF Saved to Device');
        } else {
          showAlert(`Could not save PDF: ${res.error}`, 'Save Error');
        }
      } else {
        doc.save(filename);
      }
    } catch (e: any) {
      showAlert(`Thermal 58mm PDF Error: ${e.message}`, 'PDF Error');
    }
  };

  const handleDownloadA4PDF = async () => {
    try {
      const doc = await generateA4PDFDoc();
      const filename = `Invoice_${sale.billNo}_A4.pdf`;
      if (isNativeCapacitor()) {
        const base64 = doc.output('datauristring');
        const res = await savePdfToAppFolder(base64, filename, 'Invoices');
        if (res.success) {
          showAlert(`A4 Tax Invoice PDF saved directly to:\n${res.path}`, 'Invoice Saved to Device');
        } else {
          showAlert(`Could not save PDF: ${res.error}`, 'Save Error');
        }
      } else {
        doc.save(filename);
      }
    } catch (e: any) {
      showAlert(`A4 PDF Generation Error: ${e.message}`, 'PDF Error');
    }
  };

  const handlePrintA4System = async () => {
    try {
      const doc = await generateA4PDFDoc();
      const filename = `Invoice_${sale.billNo}_A4.pdf`;
      const base64 = doc.output('datauristring');
      const res = await printPdfDocument(base64, filename, { name: `Invoice #${sale.billNo}` });
      if (!res.success) {
        showAlert(res.error || 'Failed to send print job to printer.', 'Print Error');
      }
    } catch (e: any) {
      showAlert(`Print initialization failed: ${e.message}`, 'Print Error');
    }
  };

  const handlePrintThermalSystem = async () => {
    try {
      const doc = await generateThermalPDFDoc(false);
      const filename = `Receipt_${sale.billNo}_Thermal.pdf`;
      const base64 = doc.output('datauristring');
      const res = await printPdfDocument(base64, filename, { name: `Receipt #${sale.billNo}` });
      if (!res.success) {
        showAlert(res.error || 'Failed to send thermal print job.', 'Print Error');
      }
    } catch (e: any) {
      showAlert(`Thermal print error: ${e.message}`, 'Print Error');
    }
  };

  const [isBtPrinting, setIsBtPrinting] = React.useState(false);

  const handleBluetoothThermalPrint = async () => {
    setIsBtPrinting(true);
    try {
      // Connect if not already connected
      const info = getConnectedPrinterInfo();
      if (!info.connected) {
        const conn = await scanAndConnectPrinter();
        if (!conn.success) {
          showAlert(conn.error || 'Failed to connect to Bluetooth printer.', 'Bluetooth Printer');
          return;
        }
      }

      const res = await printReceiptViaBluetooth(receiptText, { is58mm: true });
      if (res.success) {
        const toast = document.getElementById('toast');
        if (toast) {
          toast.innerText = 'Thermal receipt printed via Bluetooth!';
          toast.style.opacity = '1';
          setTimeout(() => { toast.style.opacity = '0'; }, 3000);
        }
      } else {
        showAlert(res.error || 'Bluetooth printing failed.', 'Bluetooth Printer');
      }
    } catch (err: any) {
      showAlert(`Bluetooth printer error: ${err.message || err}`, 'Bluetooth Error');
    } finally {
      setIsBtPrinting(false);
    }
  };

  const handleSharePDFToWhatsApp = async (pdfFormat: 'A4' | 'Thermal' = 'A4') => {
    setIsSharing(true);
    try {
      const doc = pdfFormat === 'A4' ? await generateA4PDFDoc() : await generateThermalPDFDoc(false);
      const filename = `Invoice_${sale.billNo}_${pdfFormat}.pdf`;
      const base64 = doc.output('datauristring');

      const res = await sharePdfDocument({
        pdfBase64: base64,
        filename,
        title: `Invoice #${sale.billNo} - ${settings.shopName || 'ShopPOS'}`,
        text: `Attached is your invoice for Bill #${sale.billNo} from ${settings.shopName || 'ShopPOS Store'}.\nTotal: Rs.${formatCurrency(sale.total)}`,
        subfolder: 'Invoices',
      });

      if (!res.success) {
        // Fallback for browsers
        if (!isNativeCapacitor()) {
          doc.save(filename);
        }
        setShowShareModal(true);
      }
    } catch (err: any) {
      console.warn('Share PDF failed:', err);
      setShowShareModal(true);
    } finally {
      setIsSharing(false);
    }
  };

  const handleWhatsApp = () => {
    let text = receiptText;
    const rawPhone = sale.customerPhone ? sale.customerPhone.trim().replace(/[^0-9]/g, '') : '';
    let formattedPhone = rawPhone;
    if (rawPhone.length === 10) {
      formattedPhone = '91' + rawPhone;
    }
    const url = formattedPhone 
      ? `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 transition-colors shadow-2xl space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                Bill #{sale.billNo}
              </h3>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${activeFormatConfig.tagClass}`}>
                {activeFormatConfig.tag}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-semibold">{formatDate(sale.timestamp)} · ₹{formatCurrency(sale.total)}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {billFormat !== 'thermal' && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setViewMode('formatted')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'formatted'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                A4 View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('rawText')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'rawText'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Slip
              </button>
            </div>
          )}

          <button 
            type="button"
            onClick={handleCopy}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
            title="Copy Receipt text"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 px-1">Copy</span>}
          </button>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
            title="Close Receipt Overlay"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 6 Bill Formats Selector Ribbon (Vyapar Style) */}
      <div className="space-y-1.5 bg-slate-50/80 dark:bg-slate-950/60 p-2.5 rounded-2xl border border-slate-150 dark:border-slate-800/80">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
          <span>Bill Format Template (6 Presets)</span>
          {onUpdateSettings && (
            <div className="flex items-center gap-1.5">
              {savedDefaultNotice ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved as Store Default!
                </span>
              ) : billFormat === (settings.billFormat || 'regular') ? (
                <span className="text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center gap-1">
                  <Star className="w-3 h-3 fill-indigo-600 text-indigo-600" /> Default Store Format
                </span>
              ) : (
                <button
                  type="button"
                  disabled={isSavingFormatDefault}
                  onClick={handleSaveAsDefault}
                  className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-extrabold flex items-center gap-1 cursor-pointer hover:underline disabled:opacity-50"
                  title="Make this the default bill format for all future bills"
                >
                  <Star className="w-3 h-3" /> Set as Default
                </button>
              )}
            </div>
          )}
        </div>

        {/* 6 Format Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pb-1">
          {BILL_FORMATS.map((fmt) => (
            <button
              key={fmt.id}
              type="button"
              onClick={() => {
                setBillFormat(fmt.id);
                if (fmt.id !== 'thermal') {
                  setViewMode('formatted');
                }
              }}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer border ${
                billFormat === fmt.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850'
              }`}
            >
              <span>{fmt.name.split('/')[0].trim()}</span>
            </button>
          ))}
        </div>
      </div>

      {autoSavedNotice && (
        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
          <FolderCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="truncate">{autoSavedNotice}</span>
        </div>
      )}

      {/* PREVIEW CONTAINER */}
      {billFormat !== 'thermal' && viewMode === 'formatted' ? (
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 p-2 max-h-[380px] overflow-y-auto custom-scrollbar shadow-inner">
          <FormattedInvoiceView
            sale={sale}
            settings={settings}
            format={billFormat}
            barcodeDataUrl={barcodeDataUrl}
            upiQrDataUrl={upiQrDataUrl}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Thermal Dimension Selector if thermal */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Thermal Paper Width:
            </span>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setPaperSize('58mm')}
                className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md transition-all cursor-pointer ${
                  paperSize === '58mm'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Switch to 58mm (2-inch standard) receipt format"
              >
                58mm Roll
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('80mm')}
                className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md transition-all cursor-pointer ${
                  paperSize === '80mm'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Switch to 80mm (3-inch wide POS) receipt format"
              >
                80mm Roll
              </button>
            </div>
          </div>

          <pre className="font-mono text-[11px] leading-relaxed bg-slate-50 text-slate-800 rounded-xl p-3 border border-slate-100 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-850 overflow-x-auto max-h-[220px] overflow-y-auto whitespace-pre-wrap select-all transition-colors">
            {receiptText}
          </pre>

          {/* Visual Barcode & Payment QR Code Container */}
          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850 text-center space-y-3">
            <div className="grid grid-cols-2 gap-3 pb-1">
              {/* Barcode */}
              <div className="flex flex-col items-center justify-center p-2.5 bg-white keep-white rounded-xl border border-slate-300 shadow-3xs text-slate-900">
                <span className="text-[9px] font-black uppercase text-indigo-700 tracking-wider mb-1">
                  Linear Barcode
                </span>
                <div className="w-full flex justify-center overflow-hidden bg-white keep-white p-1 rounded">
                  <canvas ref={barcodeRef} className="max-w-full h-11 block bg-white keep-white" />
                </div>
                <span className="text-[8px] font-mono font-bold text-slate-600 mt-1">
                  Bill No: #{sale.billNo}
                </span>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center p-2.5 bg-white keep-white rounded-xl border border-slate-300 shadow-3xs text-slate-900">
                <span className="text-[9px] font-black uppercase text-indigo-700 tracking-wider mb-1">
                  Quick Scan QR
                </span>
                <div className="bg-white keep-white p-1 rounded-lg border border-slate-200 shadow-3xs">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(String(sale.billNo))}`}
                    alt="Bill Re-open QR"
                    className="w-11 h-11 object-contain bg-white keep-white"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="text-[8px] font-mono font-bold text-slate-600 mt-1">
                  Re-Open Transaction
                </span>
              </div>
            </div>

            {/* UPI Checkout Payment QR */}
            {settings.upi && (
              <div className="flex flex-col items-center pt-2.5 border-t border-slate-200/50 dark:border-slate-850/50">
                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider mb-1">
                  Store Payment QR
                </span>
                <div className="bg-white keep-white p-2 rounded-xl inline-block border border-slate-200 shadow-sm relative group overflow-hidden">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(
                      `upi://pay?pa=${settings.upi}&pn=${encodeURIComponent(settings.shopName || 'ShopPOS Store')}&am=${sale.total}&cu=INR`
                    )}`}
                    alt="UPI Store QR"
                    className="w-28 h-28 animate-fade-in keep-white"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-white/95 keep-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1.5 text-center rounded-xl pointer-events-none">
                    <span className="text-[8.5px] font-black text-slate-800 uppercase tracking-tight">
                      Scan to Pay Rs.{formatCurrency(sale.total)}
                    </span>
                  </div>
                </div>
                <div className="mt-1 flex flex-col items-center leading-normal">
                  <span className="text-[10px] font-extrabold text-slate-800 dark:text-slate-200">
                    Amount: Rs.{formatCurrency(sale.total)}
                  </span>
                  <span className="text-[8px] font-mono text-slate-400">
                    UPI: {settings.upi}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACTIONS GRID */}
      <div className="grid grid-cols-6 gap-2 pt-1">
        {/* Primary Print Button tailored to selected format */}
        {billFormat === 'thermal' ? (
          <>
            <button
              type="button"
              disabled={isPrintingThermal}
              onClick={() => handlePrintThermal(paperSize)}
              className="col-span-3 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.98] transition-all cursor-pointer shadow-md tracking-wide disabled:opacity-50"
              title={`Print directly using ${paperSize} thermal receipt dimensions (Ctrl+P)`}
            >
              <Printer className="w-4 h-4" />
              <span>{isPrintingThermal ? 'Formatting...' : `Print ${paperSize} Thermal`}</span>
            </button>

            <button
              type="button"
              onClick={handlePrintA4System}
              className="col-span-3 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-750 active:scale-[0.98] transition-all cursor-pointer shadow-md tracking-wide border border-slate-700"
              title="Print formatted A4 Tax Invoice via system printer dialog"
            >
              <Printer className="w-4 h-4 text-indigo-400" />
              <span>Print A4 Invoice</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handlePrintA4System}
              className="col-span-3 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.98] transition-all cursor-pointer shadow-md tracking-wide border border-indigo-500"
              title={`Print ${activeFormatConfig.name} via printer dialog`}
            >
              <Printer className="w-4 h-4" />
              <span className="truncate">Print {activeFormatConfig.shortName}</span>
            </button>

            <button
              type="button"
              disabled={isPrintingThermal}
              onClick={() => handlePrintThermal(paperSize)}
              className="col-span-3 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-750 active:scale-[0.98] transition-all cursor-pointer shadow-md tracking-wide border border-slate-700 disabled:opacity-50"
              title={`Print compact ${paperSize} thermal receipt (Ctrl+P)`}
            >
              <Printer className="w-4 h-4 text-indigo-400" />
              <span>Print Thermal</span>
            </button>
          </>
        )}

        {/* Secondary Action Row: Bluetooth Thermal & WhatsApp Share */}
        <button
          type="button"
          disabled={isBtPrinting}
          onClick={handleBluetoothThermalPrint}
          className="col-span-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase bg-slate-850 hover:bg-slate-800 text-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 active:scale-[0.98] transition-all cursor-pointer shadow-sm tracking-wide border border-slate-700/60 disabled:opacity-50"
          title="Print directly to 58mm / 80mm ESC/POS Bluetooth Thermal Printer"
        >
          <Bluetooth className="w-4 h-4 text-sky-400" />
          <span>{isBtPrinting ? 'Printing...' : 'BT Thermal'}</span>
        </button>

        <button
          type="button"
          disabled={isSharing}
          onClick={() => handleSharePDFToWhatsApp('A4')}
          className="col-span-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98] transition-all cursor-pointer shadow-md tracking-wider disabled:opacity-50"
          title={`Generate & share ${activeFormatConfig.name} PDF bill directly via WhatsApp`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>{isSharing ? 'Generating...' : 'WhatsApp PDF'}</span>
        </button>

        {/* Download Formats Row */}
        <button
          type="button"
          onClick={handleDownload58mmPDF}
          className="col-span-2 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl text-[9px] font-extrabold bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-850 dark:hover:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-800 active:scale-[0.98] transition-transform cursor-pointer"
          title="Download compact 58mm narrow roll format PDF"
        >
          <FileDown className="w-3.5 h-3.5 text-slate-500" />
          <span>58mm Roll</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadPDF}
          className="col-span-2 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl text-[9px] font-extrabold bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-850 dark:hover:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-800 active:scale-[0.98] transition-transform cursor-pointer"
          title="Download simple 80mm roll format PDF"
        >
          <FileDown className="w-3.5 h-3.5 text-slate-500" />
          <span>80mm Roll</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadA4PDF}
          className="col-span-2 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl text-[9px] font-extrabold bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-850 dark:hover:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-800 active:scale-[0.98] transition-transform cursor-pointer"
          title={`Download formatted ${activeFormatConfig.name} PDF`}
        >
          <FileDown className="w-3.5 h-3.5 text-indigo-500" />
          <span className="truncate max-w-[90%]">Save {activeFormatConfig.shortName}</span>
        </button>

        {/* Text Share Row */}
        <button
          type="button"
          onClick={handleWhatsApp}
          className="col-span-4 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold uppercase bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/40 dark:hover:bg-slate-800 dark:text-slate-350 dark:border-slate-750 active:scale-[0.98] transition-all cursor-pointer"
          title="Send traditional text-format receipt details on WhatsApp"
        >
          <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
          <span>Send Text on WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="col-span-2 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 border border-slate-200 dark:border-slate-700 active:scale-[0.98] transition-transform cursor-pointer"
          title="Share invoice text content using native menu"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share Text</span>
        </button>

        {showNewBillButton && onNewBill && (
          <button
            type="button"
            onClick={onNewBill}
            className="col-span-6 flex items-center justify-center gap-2 py-3 mt-1 rounded-xl text-sm font-extrabold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-900 active:scale-[0.98] transition-transform shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Start Next Bill
          </button>
        )}
      </div>

      {/* Modern fallback sharing instruction dialog */}
      {showShareModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in duration-250 text-slate-800 dark:text-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wide">Share PDF to WhatsApp</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Browser File Sharing Guide</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4 py-1 text-xs">
              <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-955/20 rounded-2xl border border-indigo-100/40 dark:border-indigo-900/30 flex items-start gap-2.5">
                <span className="text-base">📥</span>
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-300">Invoice downloaded successfully!</p>
                  <p className="text-[10.5px] text-slate-555 dark:text-slate-400 font-medium mt-0.5">
                    Your formatted PDF invoice has been saved to your downloads folder.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="font-bold uppercase tracking-wider text-[10px] text-slate-400 dark:text-slate-500">How to share now:</p>
                <ol className="space-y-2 list-decimal pl-4 font-semibold text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  <li>Click the <strong className="text-emerald-650 dark:text-emerald-400">Open WhatsApp chat</strong> button below to open the customer's chat.</li>
                  <li>Click the paperclip or <strong className="text-slate-700 dark:text-slate-300">"+" attachment icon</strong> in WhatsApp.</li>
                  <li>Select <strong className="text-slate-700 dark:text-slate-300">Document</strong> and upload the downloaded PDF file!</li>
                </ol>
              </div>
            </div>

            <div className="flex gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="flex-1 py-3 text-xs font-black uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl active:scale-[0.98] transition-all cursor-pointer text-center"
              >
                Got it
              </button>
              <button
                type="button"
                onClick={() => {
                  handleWhatsApp();
                  setShowShareModal(false);
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded-2xl flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer shadow-md tracking-wider"
              >
                <MessageCircle className="w-4 h-4" />
                Open WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
