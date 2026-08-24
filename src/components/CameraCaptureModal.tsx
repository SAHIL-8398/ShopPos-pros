/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera as CameraIcon, RefreshCw, X, Check, Zap, ZapOff, SwitchCamera, Upload, AlertCircle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
  productName?: string;
}

/**
 * Resizes and compresses an image (base64 or blob) to an optimized JPEG data URL
 */
export async function optimizeImage(
  source: string | Blob,
  maxWidth = 900,
  maxHeight = 900,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    let srcUrl = '';
    let isObjectUrl = false;

    if (typeof source === 'string') {
      srcUrl = source;
    } else {
      srcUrl = URL.createObjectURL(source);
      isObjectUrl = true;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (isObjectUrl) URL.revokeObjectURL(srcUrl);

      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(width, 1);
      canvas.height = Math.max(height, 1);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(typeof source === 'string' ? source : '');
        return;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const optimized = canvas.toDataURL('image/jpeg', quality);
      resolve(optimized);
    };

    img.onerror = (err) => {
      if (isObjectUrl) URL.revokeObjectURL(srcUrl);
      reject(err);
    };

    img.src = srcUrl;
  });
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  productName,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [flashEffect, setFlashEffect] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fallbackFileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryFileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera tracks cleanly
  const stopTracks = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });
      setStream(null);
    }
  }, [stream]);

  // Start live WebRTC camera stream
  const startCamera = useCallback(async (mode: 'environment' | 'user' = facingMode) => {
    stopTracks();
    setErrorMessage('');
    setCapturedImage(null);

    // If native Capacitor, we can optionally use Capacitor Camera, but in-app WebRTC or file picker works across all environments
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Direct camera stream is not supported in this browser. Please use the Device Camera or Gallery button below.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch((e) => {
          console.warn('Video playback autoplay error:', e);
        });
      }

      // Check for torch/flashlight support on track
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities ? (videoTrack.getCapabilities() as any) : {};
        setHasTorch(Boolean(capabilities?.torch));
      }
    } catch (err: any) {
      console.warn('Error accessing userMedia camera:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera access was denied. Please allow camera permissions in your browser or app settings, or choose a file below.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera device found on this system.');
      } else {
        setErrorMessage('Could not open live camera stream. You can still take or select a photo using the buttons below.');
      }
    }
  }, [facingMode, stopTracks]);

  // Toggle rear vs front camera
  const handleSwitchFacing = () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    startCamera(newFacing);
  };

  // Toggle torch / flash
  const handleToggleTorch = async () => {
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack && hasTorch) {
      try {
        const nextState = !torchOn;
        await (videoTrack as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn('Could not toggle torch:', err);
      }
    }
  };

  // Trigger Native Capacitor Camera if on native Android / iOS
  const handleNativeCamera = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const image = await Camera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
        });

        if (image.dataUrl) {
          const optimized = await optimizeImage(image.dataUrl);
          setCapturedImage(optimized);
          stopTracks();
        }
        return;
      } catch (err: any) {
        console.warn('Capacitor native camera error/cancelled:', err);
        // Fallback to in-app stream or file input
      }
    }
    // Web fallback: click fallback file input
    fallbackFileInputRef.current?.click();
  };

  // Capture frame from live video canvas
  const handleSnapPhoto = async () => {
    if (!videoRef.current) return;
    setIsCapturing(true);
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const rawDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const optimized = await optimizeImage(rawDataUrl);
        setCapturedImage(optimized);
        stopTracks();
      }
    } catch (e) {
      console.error('Error snapping photo:', e);
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle file input change (gallery or camera fallback)
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const optimized = await optimizeImage(file);
      setCapturedImage(optimized);
      stopTracks();
    } catch (err) {
      console.error('Error processing uploaded image:', err);
    }
    // Reset file input so same file can be selected again if needed
    e.target.value = '';
  };

  // Confirm photo usage
  const handleUsePhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      handleCloseModal();
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  const handleCloseModal = () => {
    stopTracks();
    setCapturedImage(null);
    setErrorMessage('');
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopTracks();
    }
    return () => {
      stopTracks();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      {/* Hidden file inputs for maximum compatibility */}
      <input
        ref={fallbackFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        ref={galleryFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <CameraIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">
                {capturedImage ? 'Review Photo' : 'Take Product Photo'}
              </h3>
              <p className="text-[10px] text-slate-400 truncate max-w-[240px]">
                {productName ? `Photo for "${productName}"` : 'High-definition photo capture'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseModal}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/80 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Preview Body */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] max-h-[55vh] overflow-hidden">
          {/* Flash animation */}
          {flashEffect && (
            <div className="absolute inset-0 bg-white z-30 pointer-events-none animate-out fade-out duration-200" />
          )}

          {capturedImage ? (
            /* Review Captured Photo */
            <div className="relative w-full h-full flex items-center justify-center bg-slate-950 p-2">
              <img
                src={capturedImage}
                alt="Captured Preview"
                className="max-h-[50vh] max-w-full rounded-xl object-contain shadow-lg border border-slate-800"
              />
              <div className="absolute top-4 left-4 bg-emerald-500/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                <Check className="w-3.5 h-3.5" />
                Photo Captured
              </div>
            </div>
          ) : errorMessage ? (
            /* Error & Fallback View */
            <div className="p-6 text-center max-w-sm space-y-4 text-slate-300">
              <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-800/60 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Camera Stream Notice</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{errorMessage}</p>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleNativeCamera}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                >
                  <CameraIcon className="w-4 h-4" />
                  <span>Launch Device Camera / Chooser</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryFileInputRef.current?.click()}
                  className="w-full bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span>Upload from Gallery</span>
                </button>
              </div>
            </div>
          ) : (
            /* Live Camera Viewfinder */
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Product Frame Guide Overlay */}
              <div className="absolute inset-4 pointer-events-none border-2 border-dashed border-white/40 rounded-2xl flex flex-col justify-between p-3">
                <div className="flex justify-between items-start">
                  <span className="bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md border border-white/20">
                    Product Framing
                  </span>
                </div>
                <div className="text-center">
                  <span className="bg-black/60 backdrop-blur-xs text-slate-300 text-[10px] px-2.5 py-1 rounded-full border border-white/15">
                    Position item inside frame and tap shutter
                  </span>
                </div>
              </div>

              {/* In-viewfinder quick controls */}
              <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                <button
                  type="button"
                  onClick={handleSwitchFacing}
                  className="p-2.5 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-md border border-white/20 transition-transform active:scale-90"
                  title="Switch Camera (Front/Rear)"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>

                {hasTorch && (
                  <button
                    type="button"
                    onClick={handleToggleTorch}
                    className={`p-2.5 rounded-full backdrop-blur-md border transition-all active:scale-90 ${
                      torchOn
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                        : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                    }`}
                    title="Toggle Flash / Torch"
                  >
                    {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/90 shrink-0">
          {capturedImage ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>

              <button
                type="button"
                onClick={handleUsePhoto}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/30 transition-all active:scale-98"
              >
                <Check className="w-4 h-4" />
                <span>Use This Photo</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              {/* Gallery / File Chooser button */}
              <button
                type="button"
                onClick={() => galleryFileInputRef.current?.click()}
                className="px-3 py-2 bg-slate-800/90 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-[11px] font-bold border border-slate-700/80 flex items-center gap-1.5 transition-colors"
                title="Select existing photo from gallery or device"
              >
                <Upload className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Choose</span> Gallery
              </button>

              {/* Shutter Button */}
              <button
                type="button"
                disabled={isCapturing || Boolean(errorMessage)}
                onClick={handleSnapPhoto}
                className={`relative flex items-center justify-center w-14 h-14 rounded-full border-4 border-white/80 transition-all active:scale-90 ${
                  errorMessage
                    ? 'opacity-40 cursor-not-allowed bg-slate-800'
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/40'
                }`}
                title="Take Photo"
              >
                <div className="w-5 h-5 rounded-full bg-white transition-transform" />
              </button>

              {/* Native System Camera Trigger */}
              <button
                type="button"
                onClick={handleNativeCamera}
                className="px-3 py-2 bg-slate-800/90 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-[11px] font-bold border border-slate-700/80 flex items-center gap-1.5 transition-colors"
                title="Launch native system camera app"
              >
                <CameraIcon className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">System</span> Cam
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
