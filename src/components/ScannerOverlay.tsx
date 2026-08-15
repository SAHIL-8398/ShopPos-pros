/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { Camera, X, Play, Zap, HelpCircle, SwitchCamera, RefreshCw, Upload, CheckCircle2 } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, CameraDevice } from 'html5-qrcode';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner, BarcodeFormat, LensFacing } from '@capacitor-mlkit/barcode-scanning';
import { Product, Sale } from '../types';
import { playBeepSound } from '../utils';

interface ScannerOverlayProps {
  products: Product[];
  sales?: Sale[];
  mode: 'bill' | 'restock' | 'prod' | 'return_bill';
  onScan: (barcode: string, keepOpen?: boolean) => void;
  onClose: () => void;
}

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({
  products,
  sales = [],
  mode,
  onScan,
  onClose,
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScannerRunningRef = useRef<boolean>(false);
  const isNativeRef = useRef<boolean>(Capacitor.isNativePlatform());
  const lastScannedBarcodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isNative, setIsNative] = useState<boolean>(Capacitor.isNativePlatform());
  const [scanStatus, setScanStatus] = useState<string>('Starting camera scanner...');
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string>('');
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [torchSupport, setTorchSupport] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [recentScans, setRecentScans] = useState<{ barcode: string; name: string; timestamp: string }[]>([]);

  const continuousScanRef = useRef<boolean>(mode === 'bill' || mode === 'restock');
  const [continuousScan, setContinuousScan] = useState<boolean>(mode === 'bill' || mode === 'restock');

  // Synchronize continuousScanRef with continuousScan state
  useEffect(() => {
    continuousScanRef.current = continuousScan;
  }, [continuousScan]);

  const barcodeProducts = products.filter(p => Boolean(p.barcode));

  useEffect(() => {
    let isMounted = true;

    async function initNativeScanner() {
      try {
        setScanStatus('Initializing native barcode scanner...');
        
        // 1. Check & request camera permission on native Android
        const permStatus = await BarcodeScanner.checkPermissions();
        if (permStatus.camera !== 'granted') {
          const req = await BarcodeScanner.requestPermissions();
          if (req.camera !== 'granted') {
            if (isMounted) {
              setHasCamera(false);
              setCameraError('Camera permission was denied in Android settings.');
              setScanStatus('⚠️ Camera access denied. Grant camera permissions in App Settings.');
            }
            return;
          }
        }

        // 2. Check if Google Barcode Scanner MLKit module is downloaded
        try {
          const moduleCheck = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
          if (!moduleCheck.available) {
            setScanStatus('Downloading MLKit scanning models (first time only)...');
            await BarcodeScanner.installGoogleBarcodeScannerModule();
          }
        } catch (mErr) {
          console.warn('[MLKit] Module install check note:', mErr);
        }

        // 3. Check torch capability
        try {
          const torchCheck = await BarcodeScanner.isTorchAvailable();
          if (isMounted && torchCheck.available) {
            setTorchSupport(true);
          }
        } catch {}

        if (!isMounted) return;

        // 4. Enable transparent webview background for native camera feed preview
        document.body.classList.add('barcode-scanner-active');

        // 5. Add barcodes scanned listener
        await BarcodeScanner.addListener('barcodesScanned', async (result) => {
          if (!isMounted) return;
          const barcode = result?.barcodes?.[0];
          if (barcode && barcode.rawValue) {
            triggerScanSuccess(barcode.rawValue);
          }
        });

        // 6. Start scanning
        await BarcodeScanner.startScan({
          formats: [
            BarcodeFormat.Ean13,
            BarcodeFormat.Ean8,
            BarcodeFormat.Code128,
            BarcodeFormat.Code39,
            BarcodeFormat.UpcA,
            BarcodeFormat.UpcE,
            BarcodeFormat.QrCode,
            BarcodeFormat.Itf,
            BarcodeFormat.Codabar,
          ],
          lensFacing: LensFacing.Back,
        });

        isScannerRunningRef.current = true;
        if (isMounted) {
          setHasCamera(true);
          setScanStatus('🟢 Native MLKit active — align barcode in reticle');
        }
      } catch (nativeErr: any) {
        console.error('[MLKit] Native scanner error:', nativeErr);
        document.body.classList.remove('barcode-scanner-active');
        if (isMounted) {
          setHasCamera(false);
          setCameraError(nativeErr?.message || 'Native camera error. You can retry or use simulator below.');
          setScanStatus('⚠️ Native camera offline.');
        }
      }
    }

    async function initWebCamera() {
      try {
        await new Promise(resolve => setTimeout(resolve, 150));
        if (!isMounted) return;

        const readerElem = document.getElementById('shoppos-qr-reader');
        if (!readerElem) return;

        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
        ];

        const scanner = new Html5Qrcode('shoppos-qr-reader', {
          formatsToSupport,
          verbose: false,
        });
        scannerRef.current = scanner;

        try {
          const devices = await Html5Qrcode.getCameras();
          if (isMounted && devices && devices.length > 0) {
            setAvailableCameras(devices);
            const backCam = devices.find(d => 
              d.label.toLowerCase().includes('back') || 
              d.label.toLowerCase().includes('rear') || 
              d.label.toLowerCase().includes('environment')
            );
            const chosenId = backCam ? backCam.id : devices[0].id;
            setSelectedCameraId(chosenId);
          }
        } catch (camListErr) {
          console.warn('Could not enumerate cameras, will use facingMode default:', camListErr);
        }

        if (!isMounted) return;
        await startWebScannerInstance(scanner);
      } catch (err: any) {
        console.warn('Web camera initialization error:', err);
        if (isMounted) {
          setHasCamera(false);
          setCameraError(err?.message || 'Camera permission denied or device not found.');
          setScanStatus('⚠️ Camera inactive. Use simulator or key-in below.');
        }
      }
    }

    if (isNativeRef.current) {
      initNativeScanner();
    } else {
      initWebCamera();
    }

    return () => {
      isMounted = false;
      if (isNativeRef.current) {
        document.body.classList.remove('barcode-scanner-active');
        BarcodeScanner.removeAllListeners();
        BarcodeScanner.stopScan().catch(() => {});
      } else {
        stopWebScannerInstance();
      }
    };
  }, []);

  const startWebScannerInstance = async (scanner: Html5Qrcode, cameraId?: string) => {
    try {
      setScanStatus('Requesting video feed...');
      setCameraError('');

      const config = {
        fps: 12,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdge * 0.75);
          return {
            width: Math.min(320, qrboxSize),
            height: Math.min(220, Math.floor(qrboxSize * 0.7)),
          };
        },
        aspectRatio: 1.0,
      };

      const cameraConstraint = cameraId ? { deviceId: { exact: cameraId } } : { facingMode: 'environment' };

      await scanner.start(
        cameraConstraint,
        config,
        (decodedText: string) => {
          triggerScanSuccess(decodedText);
        },
        () => {}
      );

      isScannerRunningRef.current = true;
      setHasCamera(true);
      setScanStatus('🟢 Align barcode or QR inside reticle');

      try {
        const capabilities = (scanner as any).getRunningTrackCapabilities?.();
        if (capabilities && capabilities.torch) {
          setTorchSupport(true);
        }
      } catch {}
    } catch (startErr: any) {
      console.warn('Failed to start with primary camera constraint, retrying user facing mode:', startErr);
      try {
        await scanner.start(
          { facingMode: 'user' },
          {
            fps: 10,
            qrbox: { width: 240, height: 180 },
          },
          (decodedText: string) => {
            triggerScanSuccess(decodedText);
          },
          () => {}
        );
        isScannerRunningRef.current = true;
        setHasCamera(true);
        setScanStatus('🟢 Camera online (front view) — align barcode');
      } catch (finalErr: any) {
        console.warn('Final camera fallback failed:', finalErr);
        setHasCamera(false);
        setCameraError('Camera access unavailable. Please grant browser camera permissions.');
        setScanStatus('⚠️ Camera offline. Use barcode simulator below.');
      }
    }
  };

  const stopWebScannerInstance = async () => {
    if (scannerRef.current && isScannerRunningRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      isScannerRunningRef.current = false;
    }
  };

  const handleSwitchCamera = async () => {
    if (isNativeRef.current) {
      // Toggle native camera lens facing if available
      try {
        await BarcodeScanner.stopScan();
        await BarcodeScanner.startScan({
          formats: [
            BarcodeFormat.Ean13,
            BarcodeFormat.Ean8,
            BarcodeFormat.Code128,
            BarcodeFormat.Code39,
            BarcodeFormat.UpcA,
            BarcodeFormat.UpcE,
            BarcodeFormat.QrCode,
            BarcodeFormat.Itf,
            BarcodeFormat.Codabar,
          ],
          lensFacing: LensFacing.Front,
        });
      } catch (e) {
        console.warn('Lens switch failed:', e);
      }
      return;
    }

    if (availableCameras.length <= 1 || !scannerRef.current) return;
    const currentIndex = availableCameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCamera = availableCameras[nextIndex];
    setSelectedCameraId(nextCamera.id);

    await stopWebScannerInstance();
    await startWebScannerInstance(scannerRef.current, nextCamera.id);
  };

  const handleRetryCamera = async () => {
    if (isNativeRef.current) {
      try {
        const req = await BarcodeScanner.requestPermissions();
        if (req.camera === 'granted') {
          document.body.classList.add('barcode-scanner-active');
          await BarcodeScanner.startScan({
            formats: [
              BarcodeFormat.Ean13,
              BarcodeFormat.Ean8,
              BarcodeFormat.Code128,
              BarcodeFormat.Code39,
              BarcodeFormat.UpcA,
              BarcodeFormat.UpcE,
              BarcodeFormat.QrCode,
              BarcodeFormat.Itf,
              BarcodeFormat.Codabar,
            ],
            lensFacing: LensFacing.Back,
          });
          setHasCamera(true);
          setScanStatus('🟢 Native MLKit active — align barcode in reticle');
        }
      } catch (e: any) {
        setCameraError(e.message || 'Retry failed.');
      }
      return;
    }

    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode('shoppos-qr-reader');
    }
    await stopWebScannerInstance();
    await startWebScannerInstance(scannerRef.current, selectedCameraId || undefined);
  };

  const toggleTorch = async () => {
    if (isNativeRef.current) {
      try {
        await BarcodeScanner.toggleTorch();
        const enabled = await BarcodeScanner.isTorchEnabled();
        setTorchOn(enabled.enabled);
      } catch (e) {
        console.warn('Native torch toggle error:', e);
      }
      return;
    }

    if (!scannerRef.current || !isScannerRunningRef.current) return;
    try {
      const next = !torchOn;
      await (scannerRef.current as any).applyVideoConstraints({
        advanced: [{ torch: next }]
      });
      setTorchOn(next);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  const triggerScanSuccess = (rawCode: string) => {
    const barcode = String(rawCode || '').trim();
    if (!barcode) return;

    const now = Date.now();
    if (barcode === lastScannedBarcodeRef.current && now - lastScannedTimeRef.current < 1800) {
      return;
    }
    lastScannedBarcodeRef.current = barcode;
    lastScannedTimeRef.current = now;

    // Visual flash animation
    const flash = document.getElementById('scan-flash');
    if (flash) {
      flash.classList.add('opacity-40');
      setTimeout(() => flash.classList.remove('opacity-40'), 150);
    }

    // Capture recent scan log
    const matchedProd = products.find(p => p.barcode === barcode);
    const name = matchedProd ? matchedProd.name : 'Unknown Item / Code';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setRecentScans(prev => [{ barcode, name, timestamp }, ...prev].slice(0, 5));

    playBeepSound('success');

    // Notify parent
    onScan(barcode, continuousScanRef.current);

    if (!continuousScanRef.current) {
      handleClose();
    }
  };

  const handleFileUploadScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setScanStatus('Analyzing uploaded image for barcode...');
      let tempScanner = scannerRef.current;
      if (!tempScanner) {
        tempScanner = new Html5Qrcode('shoppos-qr-reader');
      }
      const result = await tempScanner.scanFile(file, true);
      triggerScanSuccess(result);
    } catch (err: any) {
      console.warn('File scan failed:', err);
      playBeepSound('error');
      setScanStatus('❌ No valid barcode detected in image.');
      setTimeout(() => {
        setScanStatus(hasCamera ? '🟢 Align barcode or QR inside reticle' : '⚠️ Camera offline. Use simulator below.');
      }, 3000);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('manual_code') as HTMLInputElement;
    if (input && input.value.trim()) {
      triggerScanSuccess(input.value.trim());
      input.value = '';
    }
  };

  const handleClose = () => {
    if (isNativeRef.current) {
      document.body.classList.remove('barcode-scanner-active');
      BarcodeScanner.removeAllListeners();
      BarcodeScanner.stopScan().catch(() => {});
    } else {
      stopWebScannerInstance();
    }
    onClose();
  };

  const filteredMockProducts = barcodeProducts.filter(p => 
    p.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
    p.barcode.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredMockSales = sales.filter(s =>
    String(s.billNo).toLowerCase().includes(searchFilter.toLowerCase()) ||
    (s.customer && s.customer.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div className={`fixed inset-0 z-[9000] flex flex-col ${isNative ? 'bg-transparent' : 'bg-black'} select-none`}>
      {/* Visual Flash effect overlay */}
      <div id="scan-flash" className="absolute inset-0 bg-emerald-400 opacity-0 pointer-events-none transition-opacity duration-150 z-50" />

      {/* Header Bar */}
      <div className="bg-slate-900/95 backdrop-blur-md px-4 py-3.5 flex items-center justify-between z-20 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-extrabold text-sm tracking-wide">
                {mode === 'return_bill' 
                  ? 'Scan Bill QR / Barcode' 
                  : mode === 'restock' 
                  ? 'Quick Restock Scanner' 
                  : 'Fast Item Scanner'}
              </h3>
              {isNative && (
                <span className="text-[9px] font-black uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                  Native MLKit
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              {mode === 'return_bill' 
                ? 'Scan printed receipt barcode or QR code to load invoice items' 
                : 'Scans EAN-13, EAN-8, Code-128, UPC, and standard QR codes'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Continuous scanning mode toggle */}
          {(mode === 'bill' || mode === 'restock') && (
            <label className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-700/60 cursor-pointer">
              <input
                type="checkbox"
                checked={continuousScan}
                onChange={(e) => setContinuousScan(e.target.checked)}
                className="w-3.5 h-3.5 accent-indigo-500 rounded cursor-pointer"
              />
              <span className="text-[10px] font-bold text-slate-300">Continuous</span>
            </label>
          )}

          {availableCameras.length > 1 && !isNative && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-750 flex items-center justify-center text-white active:scale-95 transition-transform shrink-0 border border-slate-700 cursor-pointer"
              title="Switch Camera"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-rose-900/60 flex items-center justify-center text-white active:scale-95 transition-transform shrink-0 border border-slate-700 cursor-pointer"
            title="Close Scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Camera Viewport */}
      <div className={`relative flex-1 ${isNative ? 'bg-transparent' : 'bg-black'} flex items-center justify-center overflow-hidden min-h-[220px]`}>
        {/* Html5Qrcode video container (used on web) */}
        {!isNative && (
          <div id="shoppos-qr-reader" className="w-full h-full object-cover [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />
        )}

        {/* Laser scanning aesthetic reticle */}
        {hasCamera && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-[260px] h-[190px] border-2 border-dashed border-emerald-400/80 rounded-2xl flex items-center justify-center">
              <div className="absolute w-6 h-6 rounded-tl-xl border-l-4 border-t-4 border-emerald-400 -top-1 -left-1" />
              <div className="absolute w-6 h-6 rounded-tr-xl border-r-4 border-t-4 border-emerald-400 -top-1 -right-1" />
              <div className="absolute w-6 h-6 rounded-bl-xl border-l-4 border-b-4 border-emerald-400 -bottom-1 -left-1" />
              <div className="absolute w-6 h-6 rounded-br-xl border-r-4 border-b-4 border-emerald-400 -bottom-1 -right-1" />
              
              {/* Laser scanning bar animation */}
              <div className="w-[90%] h-0.5 bg-emerald-400 shadow-[0_0_14px_#34d399] absolute animate-bounce" />
            </div>
          </div>
        )}

        {/* Status Pills / Error Banner */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-20 pointer-events-none">
          <span className="bg-slate-900/90 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-full font-bold border border-slate-700/60 shadow-lg truncate max-w-[85%]">
            {scanStatus}
          </span>
          {torchSupport && (
            <button
              type="button"
              onClick={toggleTorch}
              className="pointer-events-auto w-8 h-8 rounded-full bg-slate-900/90 backdrop-blur-md flex items-center justify-center text-yellow-300 active:scale-95 transition-transform border border-slate-700 shrink-0 cursor-pointer"
              title="Toggle Flashlight"
            >
              <Zap className={`w-4 h-4 ${torchOn ? 'fill-yellow-300' : ''}`} />
            </button>
          )}
        </div>

        {/* Fallback & Retry Button when camera is blocked or inaccessible */}
        {!hasCamera && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-25 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Camera className="w-6 h-6" />
            </div>
            <div className="max-w-xs space-y-1">
              <h4 className="text-sm font-black text-slate-200 uppercase tracking-wider">Camera Inactive</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {cameraError || 'Device camera is blocked by permission settings. You can grant access or use the barcode emulator below.'}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleRetryCamera}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Camera
              </button>
              {!isNative && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer border border-slate-700"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Image
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUploadScan}
                    className="hidden"
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer / Emulator Controls Pane */}
      <div className="bg-slate-900 p-4 pb-6 border-t border-slate-800 z-10 max-h-[48vh] flex flex-col justify-end overflow-y-auto">
        {/* Recent Scans Strip */}
        {recentScans.length > 0 && (
          <div className="mb-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 animate-fade-in shrink-0 overflow-hidden">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Recent Scans ({recentScans.length})
              </span>
              <button
                type="button"
                onClick={() => setRecentScans([])}
                className="text-[9px] font-bold text-slate-500 hover:text-slate-300 uppercase cursor-pointer transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              {recentScans.map((rs, idx) => (
                <div key={idx} className="bg-slate-800/90 border border-slate-700/60 p-2 rounded-lg shrink-0 w-36 flex flex-col justify-between">
                  <span className="text-[10px] font-extrabold text-white line-clamp-1 leading-tight">{rs.name}</span>
                  <div className="flex justify-between items-center mt-1 text-[8px] font-mono text-slate-400">
                    <span className="truncate max-w-[70px]">{rs.barcode}</span>
                    <span>{rs.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual Barcode Input Bar */}
        <form onSubmit={handleManualSubmit} className="mb-3">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
            Manual Barcode / SKU Code Key-in
          </label>
          <div className="flex gap-2">
            <input
              name="manual_code"
              type="text"
              placeholder="Type or paste barcode value..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
            />
            <button
              type="submit"
              className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer shadow-sm shrink-0"
            >
              <Play className="w-3 h-3 fill-white" />
              Scan
            </button>
          </div>
        </form>

        {/* Barcode Emulator Grid */}
        <div className="flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              {mode === 'return_bill' 
                ? `Demo Invoice Bills (${filteredMockSales.length})` 
                : `Store Barcode Simulator (${filteredMockProducts.length})`
              }
            </span>
            <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
              <HelpCircle className="w-3 h-3 text-indigo-400" />
              Tap item to trigger simulated scan
            </span>
          </div>

          <input
            type="text"
            placeholder={mode === 'return_bill' ? "Filter invoice bill number or customer..." : "Filter demo product name or barcode..."}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 mb-2 focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
          />

          <div className="overflow-y-auto max-h-[140px] grid grid-cols-2 gap-1.5 pr-1">
            {mode === 'return_bill' ? (
              filteredMockSales.length > 0 ? (
                filteredMockSales.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => triggerScanSuccess(String(s.billNo))}
                    className="text-left bg-slate-800/80 hover:bg-slate-750 active:scale-95 p-2 rounded-xl border border-slate-700/50 flex flex-col justify-between transition-all cursor-pointer"
                  >
                    <span className="text-white text-xs font-bold line-clamp-1 leading-tight">
                      Invoice #{s.billNo}
                    </span>
                    <div className="flex justify-between items-center mt-1">
                      <span className="font-mono text-[9px] text-slate-400 max-w-[65%] truncate">
                        {s.customer || 'Walk-in'}
                      </span>
                      <span className="text-[9px] font-bold text-emerald-400 font-mono">
                        Rs.{s.total}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="col-span-2 text-center py-4 text-xs text-slate-500">
                  No invoices match your search query.
                </div>
              )
            ) : filteredMockProducts.length > 0 ? (
              filteredMockProducts.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => triggerScanSuccess(p.barcode)}
                  className="text-left bg-slate-800/80 hover:bg-slate-750 active:scale-95 p-2 rounded-xl border border-slate-700/50 flex flex-col justify-between transition-all cursor-pointer"
                >
                  <span className="text-white text-xs font-bold line-clamp-1 leading-tight">
                    {p.name}
                  </span>
                  <div className="flex justify-between items-center mt-1">
                    <span className="font-mono text-[9px] text-slate-400">
                      {p.barcode}
                    </span>
                    <span className="text-[9px] font-bold text-emerald-400">
                      Qty: {p.qty}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-2 text-center py-4 text-xs text-slate-500">
                {barcodeProducts.length === 0 ? (
                  <>
                    No products have barcodes configured.
                    <br />
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Go to "Inventory", edit a product, and enter a Barcode value or scan one!
                    </span>
                  </>
                ) : (
                  'No matching barcodes found.'
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
