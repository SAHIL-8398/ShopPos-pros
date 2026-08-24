/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Trash, Scan, Sparkles, Image, Tag, MapPin, Percent, IndianRupee, Layers, Camera, Upload } from 'lucide-react';
import { Product, Supplier } from '../types';
import { useDialog } from '../context/DialogContext';
import { isValidHsn } from '../utils';
import { saveProductImageToAppFolder } from '../services/nativeStorage';
import { CameraCaptureModal, optimizeImage } from './CameraCaptureModal';

interface ProductFormModalProps {
  product: Product | null;
  suppliers: Supplier[];
  branches?: { id: string; name: string }[];
  activeBranchId?: string;
  onClose: () => void;
  onSave: (data: Partial<Product>, printBarcodeAfterSave?: boolean) => void;
  onDelete: (id: string) => void;
  onOpenScanner: (field: string) => void;
  scannedBarcode?: string;
  onConsumeScannedBarcode?: () => void;
  defaultSettings: {
    lowStockDefault: number;
    nearExpiryDefault: number;
  };
  products?: Product[];
}

type FormTab = 'basic' | 'pricing' | 'logistics' | 'extra';

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  product,
  suppliers,
  branches = [],
  activeBranchId,
  onClose,
  onSave,
  onDelete,
  onOpenScanner,
  scannedBarcode,
  onConsumeScannedBarcode,
  defaultSettings,
  products = [],
}) => {
  const { showAlert, showConfirm } = useDialog();

  // Core properties
  const [name, setName] = useState<string>('');
  const [barcode, setBarcode] = useState<string>('');
  const [barcodeGenerated, setBarcodeGenerated] = useState<boolean>(false);
  const [category, setCategory] = useState<string>('');
  const [subcategory, setSubcategory] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [variant, setVariant] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');

  // Financials & Taxes
  const [mrp, setMrp] = useState<number>(0);
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [wholesalePrice, setWholesalePrice] = useState<number>(0);
  const [buyPrice, setBuyPrice] = useState<number>(0);
  const [gstPct, setGstPct] = useState<number>(0);
  const [hsn, setHsn] = useState<string>('');

  // Stock, Expiries & Locations
  const [qty, setQty] = useState<number>(0);
  const [unit, setUnit] = useState<string>('pcs');
  const [lowStockAlert, setLowStockAlert] = useState<string>('');
  const [batchCode, setBatchCode] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [mfgDate, setMfgDate] = useState<string>('');
  const [nearExpiryDays, setNearExpiryDays] = useState<string>('');
  const [shelfLocation, setShelfLocation] = useState<string>('');

  // Extended features
  const [notes, setNotes] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [image, setImage] = useState<string>('');

  const [adjustQty, setAdjustQty] = useState<string>('');

  // Alternate Units state
  const [hasAltUnit, setHasAltUnit] = useState<boolean>(false);
  const [altUnitName, setAltUnitName] = useState<string>('box');
  const [altUnitFactor, setAltUnitFactor] = useState<number>(12);
  const [secondaryUnitPrice, setSecondaryUnitPrice] = useState<number | ''>('');

  // BOM/Manufacturing Recipe state
  const [bomItems, setBomItems] = useState<{ productId: string; qtyNeeded: number }[]>([]);
  const [recipeProductId, setRecipeProductId] = useState<string>('');
  const [recipeQty, setRecipeQty] = useState<number>(1);

  // Camera capture modal & file input refs
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const hadBarcodeInitially = Boolean(product?.barcode && product.barcode.trim().length > 0);

  const isSystemGenerated = product && hadBarcodeInitially
    ? (product.isGeneratedBarcode === true ||
       product.barcodeType === 'generated' ||
       (product.isGeneratedBarcode === undefined && product.barcodeType === undefined && Boolean(product.barcode && /^45(\d{8}|\d{5})$/.test(product.barcode.trim()))))
    : false;

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setBarcode(product.barcode || '');
      const hadBc = Boolean(product.barcode && product.barcode.trim().length > 0);
      const isGen = hadBc && (
        product.isGeneratedBarcode === true ||
        product.barcodeType === 'generated' ||
        (product.isGeneratedBarcode === undefined && product.barcodeType === undefined && Boolean(product.barcode && /^45(\d{8}|\d{5})$/.test(product.barcode.trim())))
      );
      setBarcodeGenerated(isGen);
      setCategory(product.category || '');
      setSubcategory(product.subcategory || '');
      setBrand(product.brand || '');
      setVariant(product.variant || '');
      setSupplierId(product.supplierId || '');
      setMrp(product.mrp || 0);
      setSellPrice(product.sellPrice || 0);
      setWholesalePrice(product.wholesalePrice || 0);
      setBuyPrice(product.buyPrice || 0);
      setGstPct(product.gstPct || 0);
      setHsn(product.hsn || '');
      setQty(product.qty || 0);
      setUnit(product.unit || 'pcs');
      setLowStockAlert(product.lowStockAlert !== null ? String(product.lowStockAlert) : '');
      setBatchCode(product.batchCode || '');
      setExpiryDate(product.expiryDate || '');
      setMfgDate(product.mfgDate || '');
      setNearExpiryDays(product.nearExpiryDays !== null ? String(product.nearExpiryDays) : '');
      setShelfLocation(product.shelfLocation || '');
      setNotes(product.notes || '');
      setTags(product.tags || '');
      setIsFavorite(!!product.isFavorite);
      setImage(product.image || '');
      setHasAltUnit(Boolean(product.hasAltUnit || product.secondaryUnitName));
      setAltUnitName(product.altUnitName || product.secondaryUnitName || 'box');
      setAltUnitFactor(product.altUnitFactor || product.conversionFactor || 12);
      setSecondaryUnitPrice(product.secondaryUnitPrice !== undefined ? product.secondaryUnitPrice : '');
      setBomItems(product.bomItems || []);
      setBranchId(product.branchId || '');
    } else {
      setName('');
      setBarcode('');
      setBarcodeGenerated(false);
      setCategory('Other');
      setSubcategory('');
      setBrand('');
      setVariant('');
      setSupplierId('');
      setBranchId(activeBranchId || '');
      setMrp(0);
      setSellPrice(0);
      setWholesalePrice(0);
      setBuyPrice(0);
      setGstPct(0);
      setHsn('');
      setQty(0);
      setUnit('pcs');
      setLowStockAlert(String(defaultSettings.lowStockDefault || 10));
      setBatchCode('');
      setExpiryDate('');
      setMfgDate('');
      setNearExpiryDays(String(defaultSettings.nearExpiryDefault || 30));
      setShelfLocation('');
      setNotes('');
      setTags('');
      setIsFavorite(false);
      setImage('');
      setHasAltUnit(false);
      setAltUnitName('box');
      setAltUnitFactor(12);
      setSecondaryUnitPrice('');
      setBomItems([]);
    }
    setAdjustQty('');
    setRecipeProductId('');
    setRecipeQty(1);
  }, [product, defaultSettings]);

  useEffect(() => {
    if (scannedBarcode) {
      if (!product || !hadBarcodeInitially || !isSystemGenerated) {
        setBarcode(scannedBarcode);
        setBarcodeGenerated(false);
      }
      if (onConsumeScannedBarcode) {
        onConsumeScannedBarcode();
      }
    }
  }, [scannedBarcode, onConsumeScannedBarcode, product, hadBarcodeInitially, isSystemGenerated]);

  const processAndSetImage = async (source: string | File) => {
    try {
      const optimizedBase64 = await optimizeImage(source);
      if (!optimizedBase64) return;
      const saveRes = await saveProductImageToAppFolder(optimizedBase64, name || barcode || 'product');
      setImage(saveRes.imageUri);
    } catch (err) {
      console.error('Error processing product image:', err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processAndSetImage(file);
    e.target.value = '';
  };

  const duplicateProduct = barcode.trim()
    ? products.find(p => p.barcode && p.barcode.trim().toLowerCase() === barcode.trim().toLowerCase() && p.id !== product?.id)
    : null;

  const handleGenerateBarcode = () => {
    let gen = '';
    let attempts = 0;
    do {
      // 8 random digits with '45' prefix = 10 digits total
      const random8Digits = Math.floor(10000000 + Math.random() * 90000000).toString();
      gen = '45' + random8Digits;
      attempts++;
    } while (products.some(p => p.barcode?.trim() === gen) && attempts < 100);
    setBarcode(gen);
    setBarcodeGenerated(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showAlert('Product Name is required!', 'Required Field');
      return;
    }
    const numMrp = Number(mrp);
    if (!mrp || isNaN(numMrp) || numMrp <= 0) {
      showAlert('MRP must be a valid positive number greater than 0!', 'Invalid MRP');
      return;
    }
    const numSell = sellPrice ? Number(sellPrice) : numMrp;
    if (isNaN(numSell) || numSell < 0) {
      showAlert('Selling price must be a valid positive amount!', 'Invalid Price');
      return;
    }
    if (numSell > numMrp) {
      showAlert('Under Legal Metrology Rules, Selling Price cannot exceed the Maximum Retail Price (MRP)!', 'Invalid Selling Price');
      return;
    }
    const numBuy = Number(buyPrice);
    if (buyPrice && (isNaN(numBuy) || numBuy < 0)) {
      showAlert('Purchase / Buy price must be a non-negative number!', 'Invalid Buy Price');
      return;
    }
    const numQty = Number(qty);
    if (isNaN(numQty) || numQty < 0) {
      showAlert('Stock quantity must be a non-negative number!', 'Invalid Quantity');
      return;
    }
    if (hsn.trim() && !isValidHsn(hsn.trim())) {
      showAlert('HSN/SAC Code must be 2, 4, 6, or 8 numeric digits.', 'Invalid HSN');
      return;
    }
    const numGst = Number(gstPct);
    if (isNaN(numGst) || numGst < 0 || numGst > 100) {
      showAlert('GST Rate must be between 0% and 100%!', 'Invalid GST %');
      return;
    }
    if (mfgDate && expiryDate && new Date(expiryDate) < new Date(mfgDate)) {
      showAlert('Expiry Date cannot be earlier than Manufacturing Date (Mfg Date)!', 'Invalid Dates');
      return;
    }
    if (!expiryDate) {
      showAlert('Expiry Date is required for shelf auditing!', 'Required Field');
      return;
    }

    const trimmedBarcode = barcode.trim();
    if (trimmedBarcode) {
      const duplicate = products.find(
        p => p.barcode && p.barcode.trim().toLowerCase() === trimmedBarcode.toLowerCase() && p.id !== product?.id
      );
      if (duplicate) {
        showAlert(`⚠️ Duplicate Barcode: Barcode "${trimmedBarcode}" is already assigned to "${duplicate.name}". Barcodes must be unique to prevent scanning conflicts.`, 'Duplicate Barcode');
        return;
      }
    }

    const finalIsGenerated = (product && hadBarcodeInitially) ? isSystemGenerated : barcodeGenerated;

    let printBarcodeAfter = false;
    if (finalIsGenerated && trimmedBarcode && (!product || !hadBarcodeInitially)) {
      const confirmPrint = await showConfirm(
        `Barcode "${trimmedBarcode}" was generated for "${name.trim()}".\n\nWould you like to print barcode labels for this product now?`,
        'Print Barcode Labels'
      );
      printBarcodeAfter = Boolean(confirmPrint);
    }

    onSave({
      name: name.trim(),
      barcode: trimmedBarcode,
      isGeneratedBarcode: finalIsGenerated,
      barcodeType: trimmedBarcode ? (finalIsGenerated ? 'generated' : 'scanned') : undefined,
      category,
      subcategory: subcategory.trim(),
      brand: brand.trim(),
      variant: variant.trim(),
      supplierId: supplierId || null,
      mrp: Number(mrp),
      sellPrice: sellPrice ? Number(sellPrice) : Number(mrp),
      wholesalePrice: Number(wholesalePrice) || 0,
      buyPrice: Number(buyPrice),
      gstPct: Number(gstPct) || 0,
      hsn: hsn.trim(),
      qty: Number(qty),
      unit,
      lowStockAlert: lowStockAlert !== '' ? Number(lowStockAlert) : null,
      batchCode: batchCode.trim(),
      expiryDate,
      mfgDate,
      nearExpiryDays: nearExpiryDays !== '' ? Number(nearExpiryDays) : null,
      shelfLocation: shelfLocation.trim(),
      notes: notes.trim(),
      tags: tags.trim(),
      isFavorite,
      image,
      hasAltUnit,
      altUnitName: hasAltUnit ? altUnitName.trim() : undefined,
      altUnitFactor: hasAltUnit ? Number(altUnitFactor) : undefined,
      secondaryUnitName: hasAltUnit ? altUnitName.trim() : undefined,
      conversionFactor: hasAltUnit ? Number(altUnitFactor) : undefined,
      secondaryUnitPrice: hasAltUnit && secondaryUnitPrice !== '' ? Number(secondaryUnitPrice) : undefined,
      bomItems: bomItems.length > 0 ? bomItems : undefined,
      branchId: branchId ? branchId : undefined,
    }, printBarcodeAfter);
  };

  const handleAdjustQty = () => {
    const adjNum = Number(adjustQty);
    if (!adjustQty || isNaN(adjNum)) {
      showAlert('Enter a valid adjusted number, e.g. +10 or -5', 'Invalid Number');
      return;
    }
    const newQty = Math.max(0, qty + adjNum);
    setQty(newQty);
    setAdjustQty('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1000] flex items-end sm:items-center justify-center p-3 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl w-full max-w-xl max-h-[92vh] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span 
              onClick={() => setIsFavorite(!isFavorite)}
              className={`text-xl cursor-pointer select-none transition-transform active:scale-125 ${
                isFavorite ? 'scale-110 filter drop-shadow-[0_0_2px_rgba(245,158,11,0.5)]' : 'grayscale opacity-30'
              }`}
              title={isFavorite ? 'Starred Favorite Item' : 'Mark as Favorite Item'}
            >
              ⭐
            </span>
            <h3 className="text-sm font-extrabold text-slate-850 dark:text-slate-100 truncate max-w-[280px]">
              {product ? `Edit details: ${product.name}` : 'New Stock Product'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg bg-slate-100 dark:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* SECTION 1: BASIC INFO */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-1">
              <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                📦 1. Basic Information
              </h4>
            </div>

            {/* Product Image preview & uploader combo */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-150 dark:border-slate-800">
              {/* Hidden file inputs for direct device fallback */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              <div className="relative w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0">
                {image ? (
                  <img src={image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Image className="w-6 h-6 text-slate-400" />
                )}
                {image && (
                  <button
                    type="button"
                    onClick={() => setImage('')}
                    className="absolute top-1 right-1 bg-slate-900/90 text-white w-4 h-4 rounded-full text-[9px] flex items-center justify-center hover:bg-rose-600 transition-colors cursor-pointer"
                    title="Remove Photo"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                  Product Image (Camera / Gallery)
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCameraModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 transition-all shadow-xs"
                    title="Open Camera to snap a product photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Take Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors active:scale-95"
                    title="Select an existing photo from device gallery"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-400" />
                    <span>Choose Gallery</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Barcode / SKU scanning */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Barcode SKU / QR / GTIN Code
                </label>
                {product && hadBarcodeInitially ? (
                  isSystemGenerated ? (
                    <span className="text-[9px] font-extrabold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 flex items-center gap-1 select-none">
                      🔒 System Generated (Locked)
                    </span>
                  ) : (
                    <span className="text-[9px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-700/80 flex items-center gap-1 select-none animate-pulse">
                      📷 Scanned Barcode (Editable)
                    </span>
                  )
                ) : (
                  barcodeGenerated ? (
                    <span className="text-[9px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-300 dark:border-indigo-700/80 flex items-center gap-1 select-none">
                      ⚡ 10-Digit Generated (Locks on save)
                    </span>
                  ) : barcode.trim() ? (
                    <span className="text-[9px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-700/80 flex items-center gap-1 select-none">
                      📷 Custom / Scanned (Editable)
                    </span>
                  ) : product ? (
                    <span className="text-[9px] font-extrabold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-300 dark:border-blue-700/80 flex items-center gap-1 select-none">
                      🆕 No Barcode Set (Add or Gen)
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400 font-medium select-none">
                      Optional (Scan or Gen)
                    </span>
                  )
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={
                    product !== null && hadBarcodeInitially && isSystemGenerated
                      ? "System generated barcode (Locked)"
                      : (!product || !hadBarcodeInitially)
                      ? "Scan SKU, enter barcode, or tap Gen..."
                      : "Scan SKU or key barcode in..."
                  }
                  value={barcode}
                  onChange={(e) => {
                    setBarcode(e.target.value);
                    setBarcodeGenerated(false);
                  }}
                  disabled={product !== null && hadBarcodeInitially && isSystemGenerated}
                  className={`flex-1 border rounded-xl px-3 py-2 text-xs outline-none font-bold transition-all duration-300 ${
                    product !== null && hadBarcodeInitially && isSystemGenerated
                      ? 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                      : product !== null && hadBarcodeInitially && !isSystemGenerated
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-600 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 animate-barcode-highlight'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:border-indigo-500'
                  }`}
                />
                {(!product || !hadBarcodeInitially) && (
                  <button
                    type="button"
                    onClick={handleGenerateBarcode}
                    className="px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center cursor-pointer font-extrabold active:scale-95 transition-all text-[10px] gap-1 shrink-0"
                    title="Auto-Generate unique 10-digit Barcode starting with 45"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Gen</span>
                  </button>
                )}
                {(!product || !hadBarcodeInitially || !isSystemGenerated) && (
                  <button
                    type="button"
                    onClick={() => onOpenScanner('barcode')}
                    className={`px-3 rounded-xl flex items-center justify-center cursor-pointer font-bold active:scale-95 transition-all shrink-0 ${
                      product !== null && hadBarcodeInitially && !isSystemGenerated
                        ? 'bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-500 shadow-sm shadow-emerald-700/20'
                        : 'bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white border dark:border-slate-700'
                    }`}
                    title="Scan with Camera"
                  >
                    <Scan className="w-4 h-4" />
                  </button>
                )}
              </div>
              {product && hadBarcodeInitially && isSystemGenerated && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                  🔒 System-generated barcodes cannot be edited after saving to prevent barcode conflicts.
                </p>
              )}
              {product && hadBarcodeInitially && !isSystemGenerated && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                  ✓ Scanned / Custom Barcode: You can edit this number or tap the camera icon to re-scan.
                </p>
              )}
              {product && !hadBarcodeInitially && (
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mt-1 flex items-center gap-1">
                  💡 This product currently has no barcode. You can scan/type one or tap Gen to create a 10-digit code. Auto-generated barcodes lock upon saving; scanned codes remain editable.
                </p>
              )}
              {!product && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-1">
                  💡 Scan with camera, enter a custom barcode, or click Gen for a unique 10-digit barcode (45XXXXXXXX).
                </p>
              )}
              {duplicateProduct && (
                <p className="text-[11px] text-rose-500 dark:text-rose-400 font-bold mt-1.5 flex items-center gap-1">
                  ⚠️ Duplicate Barcode: Already assigned to &ldquo;{duplicateProduct.name}&rdquo;
                </p>
              )}
            </div>

            {/* Product Name */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Product Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Fortune Mustard Oil 1L"
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-505 font-black"
              />
            </div>

            {/* Brand & Variant */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Brand Name / Mfg
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Fortune"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Variant / size
                </label>
                <input
                  type="text"
                  value={variant}
                  onChange={(e) => setVariant(e.target.value)}
                  placeholder="e.g. Pack of 2, Red"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Category & Subcategory */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Primary Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-505 font-bold"
                >
                  <option value="Dairy">Dairy</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Grains & Pulses">Grains & Pulses</option>
                  <option value="Spices">Spices</option>
                  <option value="Personal Care">Personal Care</option>
                  <option value="Household">Household</option>
                  <option value="Produce">Produce</option>
                  <option value="Medicines">Medicines</option>
                  <option value="Stationery">Stationery</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Subcategory
                </label>
                <input
                  type="text"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder="e.g. Edible Oils"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Vendor supplier select */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Supplier / Supplier Vendor
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 font-semibold"
              >
                <option key="default-supplier" value="">None / Walk-In</option>
                {suppliers.map((s, index) => (
                  <option key={s.id || `supplier-${index}`} value={s.id || ''}>
                    {s.name || 'Unnamed Supplier'}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch Location select (invisible if only one or no branch) */}
            {branches && branches.length > 1 && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  🏢 Branch Location
                </label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 font-bold"
                >
                  <option value="">All Branches (Shared Stock)</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* SECTION 2: PRICING & TAXES */}
          <div className="space-y-4 pt-2">
            <div className="border-b border-slate-100 dark:border-slate-880 pb-1">
              <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                💰 2. Prices & Taxation
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <IndianRupee className="w-3 h-3" />
                  MRP Maximum Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={mrp || ''}
                  onChange={(e) => setMrp(Number(e.target.value))}
                  placeholder="e.g. 150"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 font-black"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1 text-indigo-650 dark:text-indigo-400">
                  <IndianRupee className="w-3 h-3" />
                  Selling Retail Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={sellPrice || ''}
                  onChange={(e) => setSellPrice(Number(e.target.value))}
                  placeholder="= MRP"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  Wholesale Price (Bulk)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={wholesalePrice || ''}
                  onChange={(e) => setWholesalePrice(Number(e.target.value))}
                  placeholder="Bulk price"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1 text-slate-500">
                  Purchase Cost Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={buyPrice || ''}
                  onChange={(e) => setBuyPrice(Number(e.target.value))}
                  placeholder="Dealer cost price"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-150 dark:border-slate-800">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Percent className="w-3 h-3 text-indigo-500" />
                  GST Tax Bracket (%)
                </label>
                <select
                  value={gstPct}
                  onChange={(e) => setGstPct(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-555 font-bold"
                >
                  <option value={0}>0% GST (Tax Exempt)</option>
                  <option value={5}>5% GST</option>
                  <option value={12}>12% GST</option>
                  <option value={18}>18% GST</option>
                  <option value={28}>28% GST</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  HSN Tariffs Code
                </label>
                <input
                  type="text"
                  value={hsn}
                  onChange={(e) => setHsn(e.target.value)}
                  placeholder="e.g. 151219"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {mrp > 0 && buyPrice > 0 && (
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 flex justify-between animate-fade-in">
                <span>Gross Margin Estimate:</span>
                <span className="font-extrabold uppercase">
                  Rs.{((sellPrice || mrp) - buyPrice).toFixed(2)} ({(((sellPrice || mrp) - buyPrice) / (sellPrice || mrp) * 100).toFixed(0)}%)
                </span>
              </div>
            )}
          </div>

          {/* SECTION 3: LOGISTICS & STOCK */}
          <div className="space-y-4 pt-2">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-1">
              <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                ⚙️ 3. Logistics & Stock
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Initial Stock Qty *
                </label>
                <input
                  type="number"
                  min="0"
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Packaging Unit
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-505 font-medium"
                >
                  <option value="pcs">pcs (Pieces)</option>
                  <option value="kg">kg (Kilograms)</option>
                  <option value="g">g (Grams)</option>
                  <option value="L">L (Litres)</option>
                  <option value="ml">ml (Millilitres)</option>
                  <option value="box">box (Boxes)</option>
                  <option value="pack">pack (Packets)</option>
                  <option value="dozen">dozen (Dozens)</option>
                  <option value="bag">bag (Bags)</option>
                  <option value="quintal">quintal (Quintals / 100kg)</option>
                  <option value="bottle">bottle (Bottles)</option>
                  <option value="can">can (Cans)</option>
                  <option value="strip">strip (Strips / Pharma)</option>
                  <option value="bundle">bundle (Bundles)</option>
                  <option value="meter">meter (Meters / Fabric)</option>
                  <option value="roll">roll (Rolls)</option>
                  <option value="set">set (Sets)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  value={lowStockAlert}
                  onChange={(e) => setLowStockAlert(e.target.value)}
                  placeholder="Default 10"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 text-center font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  Shelf / Rack / Bin
                </label>
                <input
                  type="text"
                  value={shelfLocation}
                  onChange={(e) => setShelfLocation(e.target.value)}
                  placeholder="e.g. Rack B, Shelf 2"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Fast Manual Adjustment only for edit mode */}
            {product && (
              <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
                  Fast Stock Adjustment Add/Remove (+/-)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. +24 or -5"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 text-center font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleAdjustQty}
                    className="px-4 py-1.5 bg-slate-900 dark:bg-slate-800 border dark:border-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold active:scale-95 transition-transform"
                  >
                    Apply Update
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3.5: PACKAGING & MANUFACTURING */}
          <div className="space-y-4 pt-2">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-1">
              <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                📦 3.5. Alternate Units & Manufacturing
              </h4>
            </div>

            {/* Alternate / Secondary Unit packaging toggle */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">Enable Secondary / Alternate Selling Unit</span>
                  <span className="text-[10px] text-slate-400 block">Sell in secondary units e.g. Stock in "box", sell in "piece", or stock in "kg", sell in "gram"</span>
                </div>
                <input
                  type="checkbox"
                  checked={hasAltUnit}
                  onChange={(e) => setHasAltUnit(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded cursor-pointer"
                />
              </div>

              {hasAltUnit && (
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Secondary Unit Name
                      </label>
                      <input
                        type="text"
                        value={altUnitName}
                        onChange={(e) => setAltUnitName(e.target.value)}
                        placeholder="e.g. piece, pouch, gram, strip"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Conversion Factor (1 {unit || 'unit'} = X {altUnitName || 'sec'})
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={altUnitFactor}
                        onChange={(e) => setAltUnitFactor(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <IndianRupee className="w-3 h-3 text-indigo-500" />
                        Secondary Unit Price (Optional Override)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={secondaryUnitPrice}
                        onChange={(e) => setSecondaryUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder={`Default: Rs.${((sellPrice || mrp) / (altUnitFactor || 1)).toFixed(2)}`}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 font-bold"
                      />
                    </div>
                    <div className="flex items-center">
                      <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold w-full">
                        ℹ️ 1 {unit || 'unit'} contains {altUnitFactor || 1} {altUnitName || 'sec'}. Selling 1 {altUnitName || 'sec'} deducts {(1 / (altUnitFactor || 1)).toFixed(4)} {unit || 'unit'} from main stock.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* BOM/Manufacturing Setup */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">Manufacturing recipe (BOM)</span>
                <span className="text-[10px] text-slate-400 block">Link raw materials to auto-assemble this product</span>
              </div>

              {/* Add raw material item input */}
              <div className="flex gap-2">
                <select
                  value={recipeProductId}
                  onChange={(e) => setRecipeProductId(e.target.value)}
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 font-semibold"
                >
                  <option value="">-- Select Raw Ingredient --</option>
                  {products
                    .filter(p => p.id !== product?.id)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.qty} {p.unit} in stock)
                      </option>
                    ))}
                </select>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={recipeQty}
                  onChange={(e) => setRecipeQty(Number(e.target.value))}
                  placeholder="Qty"
                  className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 text-center font-bold"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!recipeProductId) return;
                    const exists = bomItems.some(item => item.productId === recipeProductId);
                    if (exists) {
                      showAlert('Ingredient already added to Bill of Materials!', 'Duplicate Item');
                      return;
                    }
                    setBomItems([...bomItems, { productId: recipeProductId, qtyNeeded: recipeQty }]);
                    setRecipeProductId('');
                    setRecipeQty(1);
                  }}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl active:scale-95 transition-all cursor-pointer"
                >
                  Add
                </button>
              </div>

              {bomItems.length > 0 && (
                <div className="space-y-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recipe Compositions:</span>
                  <div className="space-y-1 max-h-[120px] overflow-y-auto">
                    {bomItems.map((item, index) => {
                      const ingProd = products.find(p => p.id === item.productId);
                      return (
                        <div key={item.productId || index} className="flex justify-between items-center text-xs bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800/80">
                          <span className="font-semibold text-slate-700 dark:text-slate-200 truncate pr-2 flex-1">
                            {ingProd ? ingProd.name : 'Unknown Raw Material'}
                          </span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0 text-[11px] pr-2">
                            {item.qtyNeeded} {ingProd?.unit || 'pcs'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setBomItems(bomItems.filter(b => b.productId !== item.productId));
                            }}
                            className="text-rose-500 font-bold hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1 rounded"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: DATE CODES & TEXT METADATA */}
          <div className="space-y-4 pt-2">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-1">
              <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                📅 4. Date Codes & Extras
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Batch Code
                </label>
                <input
                  type="text"
                  value={batchCode}
                  onChange={(e) => setBatchCode(e.target.value)}
                  placeholder="e.g. B-FOR24"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Near Expiry Warning
                </label>
                <input
                  type="number"
                  min="1"
                  value={nearExpiryDays}
                  onChange={(e) => setNearExpiryDays(e.target.value)}
                  placeholder="Default 30 Days"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 text-center"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Manufacturing Date
                </label>
                <input
                  type="date"
                  value={mfgDate}
                  onChange={(e) => setMfgDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Expiration Expiry Date *
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Product Tags (Comma Separated)
              </label>
              <div className="flex bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="organic, fat-free, premium"
                  className="flex-1 bg-transparent border-none outline-none text-xs text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Product Notes / Description
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional stock information or descriptions..."
                rows={2}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 resize-none"
              />
            </div>
          </div>

        </form>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer shadow-md"
          >
            <Save className="w-4 h-4" />
            Save Details
          </button>
          
          {product && (
            <button
              type="button"
              onClick={() => onDelete(product.id)}
              className="w-12 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center active:scale-95 transition-all border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 cursor-pointer"
              title="Remove Product"
            >
              <Trash className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* In-App Live Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={(base64Img) => processAndSetImage(base64Img)}
        productName={name}
      />
    </div>
  );
};
