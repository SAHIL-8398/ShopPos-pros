/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { Camera, X, Play, Zap, HelpCircle } from 'lucide-react';
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScannedBarcodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  const [scanStatus, setScanStatus] = useState<string>('Initializing WebRTC camera...');
  const [hasCamera, setHasCamera] = useState<boolean>(true);
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

  // Dual engine fallback list: products with valid barcodes
  const barcodeProducts = products.filter(p => p.barcode);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Play request interrupted or prevented:', err);
          });
        }
      }

      setScanStatus('🟢 Camera online — align barcode inside square');
      setHasCamera(true);

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && videoTrack.getCapabilities) {
        const caps = videoTrack.getCapabilities() as any;
        if (caps.torch) {
          setTorchSupport(true);
        }
      }

      startScanLoop();
    } catch (err: any) {
      console.warn('Camera inaccessible inside sandboxed context:', err);
      setHasCamera(false);
      setScanStatus('⚠️ Secure camera blocked/inaccessible. Use Barcode Emulator below. 👇');
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startScanLoop = () => {
    const detectBarcode = async () => {
      const video = videoRef.current;
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationFrameRef.current = requestAnimationFrame(detectBarcode);
        return;
      }

      // Check if native BarcodeDetector API exists (Chrome/Android)
      // If not, we will depend on mock selection but keep camera visible
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'],
          });
          
          if (!canvasRef.current) return;
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const symbols = await barcodeDetector.detect(canvas);
            if (symbols && symbols.length > 0) {
              const barcode = symbols[0].rawValue;
              triggerScanSuccess(barcode);
              if (continuousScanRef.current) {
                setTimeout(() => {
                  animationFrameRef.current = requestAnimationFrame(detectBarcode);
                }, 1500);
                return;
              } else {
                return; // Stop scan loop to avoid multi-execution
              }
            }
          }
        } catch (e) {
          // Native detector error
        }
      }

      animationFrameRef.current = requestAnimationFrame(detectBarcode);
    };

    animationFrameRef.current = requestAnimationFrame(detectBarcode);
  };

  const toggleTorch = async () => {
    const stream = streamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      try {
        const nextTorch = !torchOn;
        await videoTrack.applyConstraints({
          advanced: [{ torch: nextTorch } as any],
        });
        setTorchOn(nextTorch);
      } catch (err) {
        console.error('Torch constrain error:', err);
      }
    }
  };

  const triggerScanSuccess = (barcode: string) => {
    const now = Date.now();
    if (barcode === lastScannedBarcodeRef.current && now - lastScannedTimeRef.current < 1500) {
      // Filter out rapid repeat duplicate scans of the exact same code
      return;
    }
    lastScannedBarcodeRef.current = barcode;
    lastScannedTimeRef.current = now;

    // Visual flash animation feedback
    const flash = document.getElementById('scan-flash');
    if (flash) {
      flash.classList.add('opacity-40');
      setTimeout(() => flash.classList.remove('opacity-40'), 150);
    }

    // Capture recent scan
    const matchedProd = products.find(p => p.barcode === barcode);
    const name = matchedProd ? matchedProd.name : 'Unknown SKU/Product';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setRecentScans(prev => {
      const newScan = { barcode, name, timestamp };
      return [newScan, ...prev].slice(0, 5);
    });

    // Play tactile sound response
    const isValid = mode === 'prod' || !!matchedProd;
    if (isValid) {
      playBeepSound('success');
    } else {
      playBeepSound('error');
    }

    onScan(barcode, continuousScanRef.current);
  };

  const handleManualSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const code = String(data.get('manual_code') || '').trim();
    if (code) {
      triggerScanSuccess(code);
    }
  };

  const filteredMockProducts = barcodeProducts.filter(p => {
    const qq = searchFilter.toLowerCase();
    return p.name.toLowerCase().includes(qq) || p.barcode.toLowerCase().includes(qq);
  });

  const filteredMockSales = sales
    .filter(s => !s.voided)
    .filter(s => {
      const qq = searchFilter.toLowerCase();
      return String(s.billNo).toLowerCase().includes(qq) || (s.customer || '').toLowerCase().includes(qq);
    });

  return (
    <div className="fixed inset-0 bg-slate-950 z-[9999] flex flex-col justify-between">
      {/* Target scanning line flash element */}
      <div id="scan-flash" className="absolute inset-0 bg-emerald-400 opacity-0 transition-opacity duration-150 pointer-events-none z-[50]" />

      {/* Header Panel */}
      <div className="p-4 pt-12 flex justify-between items-center bg-slate-900 border-b border-slate-800 text-white z-10 gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-extrabold flex items-center gap-2 truncate">
            <Camera className="w-5 h-5 text-emerald-400 animate-pulse shrink-0" />
            {mode === 'restock' ? 'Inventory Intake Scan' : mode === 'prod' ? 'Attach Product Barcode' : mode === 'return_bill' ? 'Scan Bill to Return' : 'Checkout Billing Scan'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 truncate" id="scan-lbl-desc">
            {mode === 'restock' ? 'Restocking stock quantity levels' : mode === 'return_bill' ? 'Scan the Return Barcode printed on client bill' : 'Searching active products'}
          </p>
        </div>

        {/* Continuous Scan Toggle */}
        {(mode === 'bill' || mode === 'restock') && (
          <button
            type="button"
            onClick={() => setContinuousScan(!continuousScan)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border select-none ${
              continuousScan
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-300'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${continuousScan ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            Continuous: {continuousScan ? 'ON' : 'OFF'}
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white active:scale-95 transition-transform shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Camera Stage / Placeholder Area */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {hasCamera ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Aesthetic Reticle Overlays */}
            <div className="absolute w-[250px] h-[250px] border-2 border-dashed border-emerald-400 rounded-2xl pointer-events-none flex items-center justify-center">
              <div className="absolute w-8 h-8 rounded-tl-xl border-l-4 border-t-4 border-emerald-400 top-[-4px] left-[-4px]" />
              <div className="absolute w-8 h-8 rounded-tr-xl border-r-4 border-t-4 border-emerald-400 top-[-4px] right-[-4px]" />
              <div className="absolute w-8 h-8 rounded-bl-xl border-l-4 border-b-4 border-emerald-400 bottom-[-4px] left-[-4px]" />
              <div className="absolute w-8 h-8 rounded-br-xl border-r-4 border-b-4 border-emerald-400 bottom-[-4px] right-[-4px]" />
              
              {/* Laser scanning bar animation */}
              <div className="w-[90%] h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] absolute animate-bounce" />
            </div>
          </>
        ) : (
          <div className="p-6 text-center text-slate-400 z-10 max-w-md">
            <div className="text-4xl mb-3">🛠️</div>
            <p className="text-sm font-semibold text-slate-300">Sandbox Camera Standby</p>
            <p className="text-xs text-slate-500 mt-1">
              Standard web apps inside secure iframes can't fetch device video. Rest assured, local simulation is fully available below!
            </p>
          </div>
        )}

        {/* Torch & camera info */}
        <div className="absolute top-4 left-4 right-4 flex justify-between z-20 pointer-events-none">
          <span className="bg-slate-900/80 backdrop-blur-md text-white text-[11px] px-3 py-1.5 rounded-full font-medium">
            {scanStatus}
          </span>
          {torchSupport && (
            <button
              onClick={toggleTorch}
              className="pointer-events-auto w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-md flex items-center justify-center text-yellow-300 active:scale-95 transition-transform"
            >
              <Zap className={`w-5 h-5 ${torchOn ? 'fill-yellow-300' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Footer / Simulator Controls Pane */}
      <div className="bg-slate-900 p-4 pb-8 border-t border-slate-800 z-10 max-h-[50vh] flex flex-col justify-end overflow-y-auto">
        {/* Recent Scans Section */}
        {recentScans.length > 0 && (
          <div className="mb-4 bg-slate-950 p-2.5 rounded-xl border border-slate-800 animate-fade-in shrink-0 overflow-hidden">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">⚡ Recent Scans (Last 5)</span>
              <button
                type="button"
                onClick={() => setRecentScans([])}
                className="text-[9px] font-bold text-slate-500 hover:text-slate-350 uppercase cursor-pointer transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {recentScans.map((rs, idx) => (
                <div key={idx} className="bg-slate-800 border border-slate-700/60 p-1.5 rounded-lg shrink-0 w-32 flex flex-col justify-between">
                  <span className="text-[10px] font-extrabold text-white line-clamp-1 leading-tight">{rs.name}</span>
                  <div className="flex justify-between items-center mt-1 text-[8px] font-mono text-slate-400">
                    <span className="truncate max-w-[65px]">{rs.barcode}</span>
                    <span>{rs.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual Code Input Field */}
        <form onSubmit={handleManualSubmit} className="mb-4">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Manual Barcode / SKU Code Key-in
          </label>
          <div className="flex gap-2">
            <input
              name="manual_code"
              type="text"
              placeholder="e.g. 5000112634 or custom sku..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 active:scale-95 transition-transform"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              Scan
            </button>
          </div>
        </form>

        {/* Barcode Emulator Section */}
        <div className="flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {mode === 'return_bill' 
                ? `Demo Invoice Bill Simulator (${filteredMockSales.length})` 
                : `Demo Barcode Simulator (${filteredMockProducts.length})`
              }
            </span>
            <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
              <HelpCircle className="w-3 h-3" />
              Tap item to mock a scan
            </span>
          </div>

          <input
            type="text"
            placeholder={mode === 'return_bill' ? "Search invoice number or customer name..." : "Search demo product to simulate scan..."}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 mb-2 focus:outline-none focus:border-indigo-500"
          />

          <div className="overflow-y-auto max-h-[160px] grid grid-cols-2 gap-1.5 pr-1">
            {mode === 'return_bill' ? (
              filteredMockSales.length > 0 ? (
                filteredMockSales.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => triggerScanSuccess(String(s.billNo))}
                    className="text-left bg-slate-800 hover:bg-slate-755 active:scale-95 p-2 rounded-xl border border-slate-700/50 flex flex-col justify-between transition-all"
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
                <div className="col-span-2 text-center py-6 text-xs text-slate-500">
                  No invoices match your search query.
                </div>
              )
            ) : filteredMockProducts.length > 0 ? (
              filteredMockProducts.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => triggerScanSuccess(p.barcode)}
                  className="text-left bg-slate-800 hover:bg-slate-750 active:scale-95 p-2 rounded-xl border border-slate-700/50 flex flex-col justify-between transition-all"
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
              <div className="col-span-2 text-center py-6 text-xs text-slate-500">
                {barcodeProducts.length === 0 ? (
                  <>
                    No products have barcodes configured.
                    <br />
                    <span className="text-[10px] text-slate-600 block mt-1">
                      Go to "Stock" page, edit a product, and enter a Barcode value!
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
