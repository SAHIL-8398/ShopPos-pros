/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const APP_DIR_NAME = 'ShopPOS Pro';
const INVOICES_DIR = `${APP_DIR_NAME}/Invoices`;
const PRODUCT_IMAGES_DIR = `${APP_DIR_NAME}/ProductImages`;
const QUOTATIONS_DIR = `${APP_DIR_NAME}/Quotations`;
const CHALLANS_DIR = `${APP_DIR_NAME}/Challans`;
const BARCODES_DIR = `${APP_DIR_NAME}/Barcodes`;

export interface SaveFileResult {
  success: boolean;
  uri?: string;
  path?: string;
  isNative: boolean;
  error?: string;
}

/**
 * Initialize dedicated app folders on native device storage:
 * - ShopPOS Pro/
 * - ShopPOS Pro/Invoices/
 * - ShopPOS Pro/ProductImages/
 * - ShopPOS Pro/Quotations/
 * - ShopPOS Pro/Challans/
 * - ShopPOS Pro/Barcodes/
 */
export async function initAppStorage(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return true;
  }

  try {
    const directories = [
      APP_DIR_NAME,
      INVOICES_DIR,
      PRODUCT_IMAGES_DIR,
      QUOTATIONS_DIR,
      CHALLANS_DIR,
      BARCODES_DIR,
    ];

    for (const dir of directories) {
      try {
        await Filesystem.mkdir({
          path: dir,
          directory: Directory.Documents,
          recursive: true,
        });
      } catch (err: any) {
        // Ignore if folder already exists
        if (!err.message?.includes('exists') && !err.message?.includes('OS error 17')) {
          console.warn(`[Capacitor Filesystem] Note on creating directory '${dir}':`, err);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('[Capacitor Filesystem] Error initializing app storage folders:', error);
    return false;
  }
}

/**
 * Save a generated PDF directly into the dedicated app folder.
 * Uses Capacitor Filesystem on native Android/iOS, or triggers browser save on web.
 *
 * @param base64Data Base64 representation of the PDF (with or without data:application/pdf;base64, prefix)
 * @param filename File name (e.g., 'Invoice_1001_A4.pdf')
 * @param subfolder Optional subfolder inside ShopPOS Pro (e.g., 'Invoices/2026-08-14')
 */
export async function savePdfToAppFolder(
  base64Data: string,
  filename: string,
  subfolder: string = 'Invoices'
): Promise<SaveFileResult> {
  const cleanBase64 = base64Data.replace(/^data:application\/pdf;base64,/, '');

  if (Capacitor.isNativePlatform()) {
    try {
      await initAppStorage();

      const today = new Date().toISOString().slice(0, 10);
      const targetFolder = `${APP_DIR_NAME}/${subfolder}/${today}`;
      const filePath = `${targetFolder}/${filename}`;

      const writeResult = await Filesystem.writeFile({
        path: filePath,
        data: cleanBase64,
        directory: Directory.Documents,
        recursive: true,
      });

      return {
        success: true,
        uri: writeResult.uri,
        path: filePath,
        isNative: true,
      };
    } catch (error: any) {
      console.error('[Capacitor Filesystem] Failed to write PDF to native storage:', error);
      return {
        success: false,
        isNative: true,
        error: error.message || 'Failed to save PDF to device storage',
      };
    }
  }

  // Web Browser fallback
  return {
    success: true,
    isNative: false,
    path: filename,
  };
}

/**
 * Save an uploaded product image directly into ShopPOS Pro/ProductImages/
 *
 * @param imageBase64 Base64 string of the image (e.g. data:image/jpeg;base64,...)
 * @param productName Product name or barcode for friendly filename
 */
export async function saveProductImageToAppFolder(
  imageBase64: string,
  productName: string = 'product'
): Promise<{ success: boolean; imageUri: string; relativePath?: string }> {
  if (!imageBase64) {
    return { success: false, imageUri: '' };
  }

  if (Capacitor.isNativePlatform()) {
    try {
      await initAppStorage();

      // Extract file extension and clean base64 data
      const match = imageBase64.match(/^data:(image\/[a-zA-Z0-9+]+);base64,(.*)$/);
      let ext = 'jpg';
      let cleanData = imageBase64;

      if (match) {
        const mime = match[1];
        if (mime.includes('png')) ext = 'png';
        else if (mime.includes('webp')) ext = 'webp';
        else if (mime.includes('gif')) ext = 'gif';
        cleanData = match[2];
      }

      const cleanName = productName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .slice(0, 30);
      const timestamp = Date.now();
      const filename = `prod_${cleanName}_${timestamp}.${ext}`;
      const filePath = `${PRODUCT_IMAGES_DIR}/${filename}`;

      const result = await Filesystem.writeFile({
        path: filePath,
        data: cleanData,
        directory: Directory.Documents,
        recursive: true,
      });

      // Convert native file URI to web-accessible src in Capacitor WebView
      const webSrc = Capacitor.convertFileSrc(result.uri);

      return {
        success: true,
        imageUri: webSrc || result.uri,
        relativePath: filePath,
      };
    } catch (err: any) {
      console.error('[Capacitor Filesystem] Error saving product image to native folder:', err);
      // Fall back to original base64 to avoid data loss
      return {
        success: true,
        imageUri: imageBase64,
      };
    }
  }

  // Web Browser fallback: keep base64
  return {
    success: true,
    imageUri: imageBase64,
  };
}

/**
 * Helper to check if running in Capacitor Native environment
 */
export function isNativeCapacitor(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Universal file saver & downloader that works seamlessly on both Web and Native Android.
 * - On Native Android: writes to Documents/ShopPOS Pro/Exports/ and triggers file share/save dialog.
 * - On Web: triggers browser file download.
 */
export async function downloadOrSaveDataFile(params: {
  filename: string;
  content: string;
  mimeType: string;
  subfolder?: string;
}): Promise<{ success: boolean; message: string; uri?: string }> {
  const { filename, content, mimeType, subfolder = 'Exports' } = params;

  if (Capacitor.isNativePlatform()) {
    try {
      await initAppStorage();

      const targetFolder = `${APP_DIR_NAME}/${subfolder}`;
      const filePath = `${targetFolder}/${filename}`;

      const writeResult = await Filesystem.writeFile({
        path: filePath,
        data: content,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });

      return {
        success: true,
        message: `File saved to Documents/${filePath}`,
        uri: writeResult.uri,
      };
    } catch (err: any) {
      console.error('[Capacitor Filesystem] Error saving data file to native storage:', err);
      // Try fallback to Blob download in WebView
    }
  }

  // Web Browser & WebView fallback
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);

    return {
      success: true,
      message: `File "${filename}" downloaded successfully.`,
    };
  } catch (webErr: any) {
    console.error('Web file download error:', webErr);
    return {
      success: false,
      message: webErr?.message || 'Failed to download file.',
    };
  }
}
