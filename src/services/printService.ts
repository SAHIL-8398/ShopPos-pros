/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Capacitor } from '@capacitor/core';
import { Printer } from '@capgo/capacitor-printer';
import { Share } from '@capacitor/share';
import { savePdfToAppFolder } from './nativeStorage';

export interface PrintPdfOptions {
  name?: string;
  landscape?: boolean;
}

/**
 * Send a PDF base64 string or URI directly to Android's Native Print Framework (or browser print on desktop).
 * Android Print Framework routes the print job to any connected Wired/USB, WiFi, Mopria, or Bluetooth system printer.
 *
 * @param pdfBase64 Base64 string of the PDF (with or without data:application/pdf;base64, prefix)
 * @param filename File title displayed in print spooler (e.g. 'Invoice_1001_A4.pdf')
 */
export async function printPdfDocument(
  pdfBase64: string,
  filename: string = 'Invoice.pdf',
  options?: PrintPdfOptions
): Promise<{ success: boolean; error?: string }> {
  const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');

  if (Capacitor.isNativePlatform()) {
    try {
      // 1. Save locally to app documents folder to have a solid filesystem URI
      const saveRes = await savePdfToAppFolder(cleanBase64, filename, 'Invoices');

      // 2. Call native Android print manager
      if (saveRes.uri || saveRes.path) {
        await Printer.printPdf({
          path: saveRes.uri || saveRes.path,
          name: options?.name || filename,
        });
      } else {
        await Printer.printBase64({
          data: cleanBase64,
          name: options?.name || filename,
          mimeType: 'application/pdf',
        });
      }

      return { success: true };
    } catch (err: any) {
      console.warn('[Printer] Native PDF print failed, attempting base64 fallback:', err);
      try {
        await Printer.printBase64({
          data: cleanBase64,
          name: options?.name || filename,
          mimeType: 'application/pdf',
        });
        return { success: true };
      } catch (innerErr: any) {
        return {
          success: false,
          error: innerErr?.message || err?.message || 'Print job failed',
        };
      }
    }
  }

  // Web Browser fallback: Open in hidden iframe and trigger print
  try {
    const blob = base64ToBlob(cleanBase64, 'application/pdf');
    const blobUrl = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl;

    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('Iframe print error:', e);
        }
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(blobUrl);
        }, 60000);
      }, 500);
    };

    return { success: true };
  } catch (webErr: any) {
    return { success: false, error: webErr?.message || 'Browser print failed' };
  }
}

/**
 * Native file and document sharing with WhatsApp and Android share sheet.
 * Uses @capacitor/share on native Android, with fallback to navigator.share on Web.
 */
export async function sharePdfDocument(params: {
  pdfBase64: string;
  filename: string;
  title: string;
  text?: string;
  subfolder?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { pdfBase64, filename, title, text, subfolder = 'Invoices' } = params;
  const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');

  if (Capacitor.isNativePlatform()) {
    try {
      // 1. Ensure file is saved to native filesystem so Android has a real content/file URI
      const saveRes = await savePdfToAppFolder(cleanBase64, filename, subfolder);
      const fileUri = saveRes.uri;

      if (!fileUri) {
        throw new Error('Failed to resolve native storage URI for PDF.');
      }

      // 2. Open Android Native Share Sheet with PDF file attached
      await Share.share({
        title,
        text: text || title,
        url: fileUri,
        dialogTitle: `Share ${filename}`,
      });

      return { success: true };
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes('cancel') || err?.message?.toLowerCase().includes('dismiss')) {
        return { success: true }; // User simply dismissed share sheet
      }
      console.warn('[Share] Native Capacitor share failed:', err);
      return { success: false, error: err?.message || 'Native share failed' };
    }
  }

  // Web Browser fallback
  try {
    const blob = base64ToBlob(cleanBase64, 'application/pdf');
    const file = new File([blob], filename, { type: 'application/pdf' });

    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title,
        text: text || title,
      });
      return { success: true };
    }

    return { success: false, error: 'Web Share API not supported for files on this browser' };
  } catch (err: any) {
    if (err?.name === 'AbortError') return { success: true };
    return { success: false, error: err?.message || 'Sharing failed' };
  }
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteArrays: Uint8Array[] = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays as unknown as BlobPart[], { type: mimeType });
}
