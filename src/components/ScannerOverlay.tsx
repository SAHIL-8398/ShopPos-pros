/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, X, Play, Zap, HelpCircle, SwitchCamera, RefreshCw, Upload, CheckCircle2, AlertCircle, Video } from 'lucide-react';
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isScannerRunningRef = useRef<boolean>(false);
  const isNativeRef = useRef<boolean>(Capacitor.isNativePlatform());
  const lastScannedBarcodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoCaptureInputRef = useRef<HTMLInputElement>(null);

  const [isNative] = useState<boolean>(Capacitor.isNativePlatform());
  type ScannerEngine = 'inapp_video' | 'google_dialog' | 'native_mlkit';
  const [scannerEngine, setScannerEngine] = useState<ScannerEngine>('inapp_video');
  const [scanStatus, setScanStatus] = useState<string>('Starting camera scanner...');
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string>('');
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [torchSupport, setTorchSupport] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [recentScans, setRecentScans] = useState<{ barcode: string; name: string; timestamp: string }[]>([]);
  const [usingDirectVideo, setUsingDirectVideo] = useState<boolean>(false);

  const continuousScanRef = useRef<boolean>(mode === 'bill' || mode === 'restock');
  const [continuousScan, setContinuousScan] = useState<boolean>(mode === 'bill' || mode === 'restock');
  const isProcessingScanRef = useRef<boolean>(false);

  // Synchronize continuousScanRef with continuousScan state
  useEffect(() => {
    continuousScanRef.current = continuousScan;
  }, [continuousScan]);

  const barcodeProducts = products.filter(p => Boolean(p.barcode));

  // Clean up Web Scanner instances
  const stopWebScannerInstance = useCallback(async () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      } catch (e) {
        console.warn('Error stopping media tracks:', e);
      }
      mediaStreamRef.current = null;
    }

    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn('Error stopping Html5Qrcode scanner:', e);
      }
      scannerRef.current = null;
    }
    isScannerRunningRef.current = false;
  }, []);

  const triggerScanSuccess = useCallback((rawCode: string) => {
    if (isProcessingScanRef.current) return;
    const barcode = String(rawCode || '').trim();
    if (!barcode) return;

    const now = Date.now();
    if (barcode === lastScannedBarcodeRef.current && now - lastScannedTimeRef.current < 2500) {
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

    // If item is unknown or continuous mode is off, close scanner immediately and prevent further scan loops
    const isKnownProduct = Boolean(matchedProd);
    if (!isKnownProduct || !continuousScanRef.current) {
      isProcessingScanRef.current = true;
      if (isNativeRef.current) {
        document.documentElement.classList.remove('barcode-scanner-active');
        document.body.classList.remove('barcode-scanner-active');
        BarcodeScanner.removeAllListeners().catch((err) => console.error('[MLKit] removeAllListeners error:', err));
        BarcodeScanner.stopScan().catch((err) => console.error('[MLKit] stopScan error:', err));
      } else {
        stopWebScannerInstance();
      }
      onScan(barcode, false);
      onClose();
      return;
    }

    // Known product in continuous scan mode
    isProcessingScanRef.current = true;
    playBeepSound('success');
    onScan(barcode, true);

    setTimeout(() => {
      isProcessingScanRef.current = false;
    }, 1200);
  }, [products, onScan, onClose, stopWebScannerInstance]);

  // Direct HTML5 Video Barcode Detector Fallback
  const startDirectVideoFallback = useCallback(async () => {
    try {
      setScanStatus('Starting direct camera stream...');
      setUsingDirectVideo(true);

      const constraints: MediaStreamConstraints = {
        video: selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: { ideal: 'environment' } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        isScannerRunningRef.current = true;
        setHasCamera(true);
        setScanStatus('🟢 Camera active — align barcode in reticle');

        // Check torch
        const track = stream.getVideoTracks()[0];
        const caps = (track?.getCapabilities?.()) as any;
        if (caps && caps.torch) {
          setTorchSupport(true);
        }

        // Use BarcodeDetector if natively supported in browser
        if ('BarcodeDetector' in window) {
          const detector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code', 'itf', 'codabar'],
          });

          const scanLoop = async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) {
              animFrameRef.current = requestAnimationFrame(scanLoop);
              return;
            }
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                triggerScanSuccess(barcodes[0].rawValue);
              }
            } catch {}
            animFrameRef.current = requestAnimationFrame(scanLoop);
          };
          animFrameRef.current = requestAnimationFrame(scanLoop);
        }
      }
    } catch (directErr: any) {
      console.warn('Direct video fallback error:', directErr);
      setHasCamera(false);
      setCameraError(directErr?.message || 'Camera stream blocked. Please grant camera permissions.');
      setScanStatus('⚠️ Camera offline. Use barcode simulator or upload photo below.');
    }
  }, [selectedCameraId, triggerScanSuccess]);

  // Main Web Scanner starter using Html5Qrcode with multiple fallback layers
  const startWebScannerInstance = useCallback(async (cameraIdToUse?: string) => {
    await stopWebScannerInstance();
    setUsingDirectVideo(false);

    try {
      setScanStatus('Connecting to camera...');
      setCameraError('');

      const readerElem = document.getElementById('shoppos-qr-reader');
      if (!readerElem) {
        console.warn('Scanner container element not found, falling back to direct video...');
        await startDirectVideoFallback();
        return;
      }
      readerElem.innerHTML = '';

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

      // Ensure qrbox ALWAYS returns safe positive dimensions (never 0 or negative)
      const config = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const w = viewfinderWidth > 50 ? viewfinderWidth : 320;
          const h = viewfinderHeight > 50 ? viewfinderHeight : 240;
          const minEdge = Math.min(w, h);
          const boxWidth = Math.max(160, Math.min(300, Math.floor(minEdge * 0.8)));
          const boxHeight = Math.max(120, Math.min(220, Math.floor(boxWidth * 0.75)));
          return { width: boxWidth, height: boxHeight };
        },
        aspectRatio: 1.3333,
      };

      // 1. Try with specified camera ID or environment
      let started = false;

      if (cameraIdToUse) {
        try {
          await scanner.start(cameraIdToUse, config, (decoded) => triggerScanSuccess(decoded), () => {});
          started = true;
        } catch (idErr) {
          console.warn('Failed to start with camera ID, falling back:', idErr);
        }
      }

      // 2. Try facingMode: environment (rear camera)
      if (!started) {
        try {
          await scanner.start({ facingMode: 'environment' }, config, (decoded) => triggerScanSuccess(decoded), () => {});
          started = true;
        } catch (envErr) {
          console.warn('Failed to start with environment camera, trying user facing mode:', envErr);
        }
      }

      // 3. Try facingMode: user (front camera / laptop webcam)
      if (!started) {
        try {
          await scanner.start({ facingMode: 'user' }, config, (decoded) => triggerScanSuccess(decoded), () => {});
          started = true;
        } catch (userErr) {
          console.warn('Failed to start with user camera, trying fallback device list:', userErr);
        }
      }

      // 4. Try first enumerated camera device
      if (!started && availableCameras.length > 0) {
        try {
          await scanner.start(availableCameras[0].id, config, (decoded) => triggerScanSuccess(decoded), () => {});
          started = true;
        } catch (firstCamErr) {
          console.warn('Failed to start with first camera device:', firstCamErr);
        }
      }

      if (started) {
        isScannerRunningRef.current = true;
        setHasCamera(true);
        setScanStatus('🟢 Camera active — align barcode in reticle');

        try {
          const capabilities = (scanner as any).getRunningTrackCapabilities?.();
          if (capabilities && capabilities.torch) {
            setTorchSupport(true);
          }
        } catch {}
      } else {
        // If Html5Qrcode couldn't start, switch to Direct HTML5 Video fallback
        console.warn('Html5Qrcode start failed, initiating direct video fallback...');
        await startDirectVideoFallback();
      }
    } catch (err: any) {
      console.warn('Web scanner initialization error:', err);
      // Fallback to direct video
      await startDirectVideoFallback();
    }
  }, [availableCameras, stopWebScannerInstance, startDirectVideoFallback, triggerScanSuccess]);

  // Initial mount scanner orchestration
  useEffect(() => {
    let isMounted = true;

    async function initCamera() {
      try {
        setScanStatus('Requesting camera permissions...');

        // 1. If running natively in Android/iOS APK, request native permissions first
        if (isNativeRef.current) {
          try {
            console.log('[Android Native] Checking & requesting hardware camera permissions...');
            const permStatus = await BarcodeScanner.checkPermissions();
            if (permStatus.camera !== 'granted') {
              const req = await BarcodeScanner.requestPermissions();
              console.log('[Android Native] Permission request result:', req);
              if (req.camera !== 'granted') {
                if (isMounted) {
                  setHasCamera(false);
                  setCameraError('Camera permission was denied in Android device settings. Please grant camera access in Settings > Apps > ShopPOS Pro.');
                  setScanStatus('⚠️ Camera access denied. Grant camera permissions in App Settings.');
                }
                return;
              }
            }
          } catch (nativePermErr) {
            console.warn('[Android Native] Permission check note:', nativePermErr);
          }
        }

        // 2. Request browser / WebView getUserMedia permission
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const tempStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
            tempStream.getTracks().forEach(t => t.stop());
          } catch (permErr: any) {
            console.warn('Initial getUserMedia check note:', permErr);
            if (permErr?.name === 'NotAllowedError' || permErr?.name === 'PermissionDeniedError') {
              if (isMounted) {
                setHasCamera(false);
                setCameraError('Camera permission was blocked. Please grant camera permissions in your device/app settings.');
                setScanStatus('⚠️ Camera access denied. Use Google Dialog or manual simulator below.');
              }
              return;
            }
          }
        }

        // Small delay to ensure DOM is rendered
        await new Promise(resolve => setTimeout(resolve, 150));
        if (!isMounted) return;

        // Query available cameras
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
            await startWebScannerInstance(chosenId);
            return;
          }
        } catch (camListErr) {
          console.warn('Could not enumerate cameras, continuing with defaults:', camListErr);
        }

        if (!isMounted) return;
        await startWebScannerInstance();
      } catch (err: any) {
        console.warn('Camera initialization error:', err);
        if (isMounted) {
          setHasCamera(false);
          setCameraError(err?.message || 'Camera permission denied or device not found.');
          setScanStatus('⚠️ Camera inactive. Use Google Dialog or simulator below.');
        }
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      if (isNativeRef.current) {
        document.documentElement.classList.remove('barcode-scanner-active');
        document.body.classList.remove('barcode-scanner-active');
        BarcodeScanner.removeAllListeners().catch(() => {});
        BarcodeScanner.stopScan().catch(() => {});
      }
      stopWebScannerInstance();
    };
  }, [startWebScannerInstance, stopWebScannerInstance]);

  const handleSwitchToMLKit = async () => {
    if (!isNativeRef.current) return;
    try {
      await stopWebScannerInstance();
      setScannerEngine('native_mlkit');
      setScanStatus('Starting Native MLKit camera...');

      document.documentElement.classList.add('barcode-scanner-active');
      document.body.classList.add('barcode-scanner-active');

      await BarcodeScanner.removeAllListeners();
      await BarcodeScanner.addListener('barcodesScanned', async (result) => {
        const barcode = result?.barcodes?.[0];
        if (barcode && barcode.rawValue) {
          triggerScanSuccess(barcode.rawValue);
        }
      });

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
    } catch (e: any) {
      console.error('MLKit start error:', e);
      document.documentElement.classList.remove('barcode-scanner-active');
      document.body.classList.remove('barcode-scanner-active');
      setScannerEngine('inapp_video');
      await startWebScannerInstance();
    }
  };

  const handleSwitchToInAppVideo = async () => {
    if (isNativeRef.current) {
      document.documentElement.classList.remove('barcode-scanner-active');
      document.body.classList.remove('barcode-scanner-active');
      await BarcodeScanner.removeAllListeners().catch(() => {});
      await BarcodeScanner.stopScan().catch(() => {});
    }
    setScannerEngine('inapp_video');
    await startWebScannerInstance(selectedCameraId || undefined);
  };

  const handleSwitchCamera = async () => {
    if (isNativeRef.current) {
      try {
        console.log('[MLKit] Switching native camera lens...');
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
        console.log('[MLKit] Switched to LensFacing.Front');
      } catch (e) {
        console.error('[MLKit] Lens switch failed:', e);
      }
      return;
    }

    if (availableCameras.length <= 1) return;
    const currentIndex = availableCameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCamera = availableCameras[nextIndex];
    setSelectedCameraId(nextCamera.id);

    await startWebScannerInstance(nextCamera.id);
  };

  const handleRetryCamera = async () => {
    setCameraError('');
    setScanStatus('Retrying camera connection...');
    if (isNativeRef.current) {
      try {
        console.log('[MLKit] Retrying native camera permissions...');
        const req = await BarcodeScanner.requestPermissions();
        console.log('[MLKit] Retry permissions result:', req);
        if (req.camera === 'granted') {
          document.documentElement.classList.add('barcode-scanner-active');
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
          console.log('[MLKit] Native scanner restarted successfully');
          setHasCamera(true);
          setScanStatus('🟢 Native MLKit active — align barcode in reticle');
          return;
        }
      } catch (e: any) {
        console.error('[MLKit] Native retry error:', e);
      }
    }

    await startWebScannerInstance(selectedCameraId || undefined);
  };

  const handleGooglePlayServicesScan = async () => {
    if (!isNativeRef.current) return;
    try {
      setScanStatus('Launching Google Barcode Scanner dialog...');
      console.log('[MLKit] Opening BarcodeScanner.scan() dialog...');
      const result = await BarcodeScanner.scan({
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
      });
      console.log('[MLKit] Google Play Services Scan result:', result);
      const barcode = result?.barcodes?.[0];
      if (barcode && barcode.rawValue) {
        triggerScanSuccess(barcode.rawValue);
      } else {
        setScanStatus('Ready to scan');
      }
    } catch (scanErr: any) {
      console.error('[MLKit] BarcodeScanner.scan() dialog error:', scanErr);
      setScanStatus('⚠️ Scan dialog cancelled or unavailable');
    }
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

    if (mediaStreamRef.current) {
      try {
        const track = mediaStreamRef.current.getVideoTracks()[0];
        const next = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: next }]
        });
        setTorchOn(next);
        return;
      } catch (e) {
        console.warn('Direct stream torch error:', e);
      }
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

  const handleFileUploadScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setScanStatus('Analyzing image for barcode...');
      let tempScanner = scannerRef.current;
      if (!tempScanner) {
        const readerElem = document.getElementById('shoppos-qr-reader');
        if (readerElem) {
          tempScanner = new Html5Qrcode('shoppos-qr-reader', {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.ITF,
              Html5QrcodeSupportedFormats.CODABAR,
            ],
            verbose: false,
          });
        }
      }

      if (tempScanner) {
        const result = await tempScanner.scanFile(file, true);
        triggerScanSuccess(result);
        setScanStatus('✅ Barcode decoded successfully!');
      } else {
        throw new Error('Scanner instance unavailable.');
      }
    } catch (err: any) {
      console.warn('File scan failed:', err);
      playBeepSound('error');
      setScanStatus('❌ No valid barcode detected. Try snapping a clearer photo.');
      setTimeout(() => {
        setScanStatus(hasCamera ? '🟢 Align barcode or QR inside reticle' : '⚠️ Camera offline. Use simulator below.');
      }, 3500);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (photoCaptureInputRef.current) photoCaptureInputRef.current.value = '';
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
    isProcessingScanRef.current = true;
    if (isNativeRef.current) {
      console.log('[MLKit] Closing native scanner...');
      document.documentElement.classList.remove('barcode-scanner-active');
      document.body.classList.remove('barcode-scanner-active');
      BarcodeScanner.removeAllListeners().catch((err) => console.error('[MLKit] removeAllListeners error on close:', err));
      BarcodeScanner.stopScan().catch((err) => console.error('[MLKit] stopScan error on close:', err));
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

          {isNative && (
            <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60">
              <button
                type="button"
                onClick={handleSwitchToInAppVideo}
                className={`px-2 py-1 rounded-lg text-[9px] font-extrabold transition-all cursor-pointer ${
                  scannerEngine === 'inapp_video' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="In-App Live Camera Viewport (Html5/WebRTC)"
              >
                In-App
              </button>
              <button
                type="button"
                onClick={handleGooglePlayServicesScan}
                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-extrabold active:scale-95 transition-all cursor-pointer shadow-xs"
                title="Open Google Play Services bottom-sheet Code Scanner dialog"
              >
                Google Scanner
              </button>
              <button
                type="button"
                onClick={handleSwitchToMLKit}
                className={`px-2 py-1 rounded-lg text-[9px] font-extrabold transition-all cursor-pointer ${
                  scannerEngine === 'native_mlkit' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Native MLKit Camera Feed"
              >
                MLKit
              </button>
            </div>
          )}

          {availableCameras.length > 1 && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-750 flex items-center justify-center text-white active:scale-95 transition-transform shrink-0 border border-slate-700 cursor-pointer"
              title="Switch Camera (Front / Back)"
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
      <div className={`relative flex-1 ${scannerEngine === 'native_mlkit' ? 'bg-transparent' : 'bg-black'} flex items-center justify-center overflow-hidden min-h-[220px]`}>
        {/* Html5Qrcode video container (used on web & in-app WebView) */}
        {scannerEngine === 'inapp_video' && !usingDirectVideo && (
          <div 
            id="shoppos-qr-reader" 
            className="w-full h-full min-h-[220px] flex items-center justify-center object-cover [&_video]:w-full [&_video]:h-full [&_video]:object-cover" 
          />
        )}

        {/* Direct HTML5 video fallback element */}
        {scannerEngine === 'inapp_video' && usingDirectVideo && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover min-h-[220px]"
          />
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

        {/* Camera Inactive / Permission Denied Helper Modal */}
        {!hasCamera && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-25 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Camera className="w-6 h-6" />
            </div>
            <div className="max-w-xs space-y-1.5">
              <h4 className="text-sm font-black text-slate-200 uppercase tracking-wider">Camera Needs Permission or Offline</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {cameraError || 'Please allow camera access in your browser or device settings to use the live barcode scanner.'}
              </p>
              <div className="text-[11px] text-indigo-400 bg-indigo-950/50 border border-indigo-900/60 p-2 rounded-xl text-left mt-2 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
                <span>
                  Tip: Tap <strong>"Snap Barcode Photo"</strong> to use your phone's native camera directly, or choose a product from the quick simulator below.
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleRetryCamera}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Camera
              </button>
              
              <button
                type="button"
                onClick={() => photoCaptureInputRef.current?.click()}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                <Camera className="w-3.5 h-3.5" />
                Snap Barcode Photo
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer border border-slate-700"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Image
              </button>

              {/* Hidden file inputs for direct camera snapshot and file upload */}
              <input
                ref={photoCaptureInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUploadScan}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUploadScan}
                className="hidden"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer / Emulator & Quick Action Controls Pane */}
      <div className="bg-slate-900 p-4 pb-6 border-t border-slate-800 z-10 max-h-[48vh] flex flex-col justify-end overflow-y-auto">
        {/* Quick Camera Snapshot / Upload Toolbar (always accessible) */}
        <div className="flex items-center justify-between gap-2 mb-3 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => photoCaptureInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border border-slate-700 active:scale-95 transition-all cursor-pointer"
            title="Snap a photo of the barcode using your device's native camera app"
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>Snap Photo</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border border-slate-700 active:scale-95 transition-all cursor-pointer"
            title="Upload a saved barcode/QR picture"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Upload Image</span>
          </button>

          {availableCameras.length > 1 && !isNative && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              className="flex items-center justify-center gap-1 py-1.5 px-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-[10px] font-bold border border-slate-700 active:scale-95 transition-all cursor-pointer"
              title="Flip between front and rear cameras"
            >
              <SwitchCamera className="w-3.5 h-3.5 text-sky-400" />
              <span>Flip Cam</span>
            </button>
          )}

          {/* Hidden inputs if not rendered above */}
          {hasCamera && (
            <>
              <input
                ref={photoCaptureInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUploadScan}
                className="hidden"
              />
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
