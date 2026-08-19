/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Trash, Scan, Sparkles, Image, Tag, MapPin, Percent, DollarSign, Layers, Camera, Upload } from 'lucide-react';
import { Product, Supplier } from '../types';
import { useDialog } from '../context/DialogContext';
import { saveProductImageToAppFolder } from '../services/nativeStorage';

interface ProductFormModalProps {
  product: Product | null;
  suppliers: Supplier[];
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

  // BOM/Manufacturing Recipe state
  const [bomItems, setBomItems] = useState<{ productId: string; qtyNeeded: number }[]>([]);
  const [recipeProductId, setRecipeProductId] = useState<string>('');
  const [recipeQty, setRecipeQty] = useState<number>(1);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setBarcode(product.barcode || '');
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
      setHasAltUnit(!!product.hasAltUnit);
      setAltUnitName(product.altUnitName || 'box');
      setAltUnitFactor(product.altUnitFactor || 12);
      setBomItems(product.bomItems || []);
    } else {
      setName('');
      setBarcode('');
      setCategory('Other');
      setSubcategory('');
      setBrand('');
      setVariant('');
      setSupplierId('');
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
      setBomItems([]);
    }
    setAdjustQty('');
    setRecipeProductId('');
    setRecipeQty(1);
  }, [product, defaultSettings]);

  useEffect(() => {
    if (scannedBarcode) {
      if (!product) {
        setBarcode(scannedBarcode);
      }
      if (onConsumeScannedBarcode) {
        onConsumeScannedBarcode();
      }
    }
  }, [scannedBarcode, onConsumeScannedBarcode, product]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (uploadEvent) => {
      const rawBase64 = uploadEvent.target?.result as string;
      if (!rawBase64) return;
      
      const saveRes = await saveProductImageToAppFolder(rawBase64, name || barcode || 'product');
      setImage(saveRes.imageUri);
    };
    reader.readAsDataURL(file);
  };

  const duplicateProduct = barcode.trim()
    ? products.find(p => p.barcode && p.barcode.trim().toLowerCase() === barcode.trim().toLowerCase() && p.id !== product?.id)
    : null;

  const handleGenerateBarcode = () => {
    let gen = '';
    let attempts = 0;
    do {
      const random5Digits = Math.floor(10000 + Math.random() * 90000).toString();
      gen = '45' + random5Digits;
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
    if (!mrp) {
      showAlert('MRP is required!', 'Required Field');
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

    let printBarcodeAfter = false;
    if (barcodeGenerated && trimmedBarcode) {
      const confirmPrint = await showConfirm(
        `Barcode "${trimmedBarcode}" was generated for "${name.trim()}".\n\nWould you like to print barcode labels for this product now?`,
        'Print Barcode Labels'
      );
      printBarcodeAfter = Boolean(confirmPrint);
    }

    onSave({
      name: name.trim(),
      barcode: trimmedBarcode,
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
      bomItems: bomItems.length > 0 ? bomItems : undefined,
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
                    className="absolute top-1 right-1 bg-slate-900/90 text-white w-4 h-4 rounded-full text-[9px] flex items-center justify-center hover:bg-rose-600 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                  Product Image (Camera / Gallery)
                </span>
                <div className="flex flex-wrap gap-2">
                  <label className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Take Photo</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      onChange={handleImageUpload} 
                      className="hidden" 
                    />
                  </label>

                  <label className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-slate-400" />
                    <span>Choose Gallery</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Barcode / SKU scanning */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Barcode SKU / QR / GTIN Code {product && <span className="text-[9px] text-indigo-500 font-extrabold tracking-normal lowercase">(cannot be changed once product is added)</span>}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Scan SKU or key barcode in..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  disabled={product !== null}
                  className={`flex-1 border rounded-xl px-3 py-2 text-xs outline-none font-bold ${
                    product !== null
                      ? 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:border-indigo-505'
                  }`}
                />
                {!product && (
                  <>
                    <button
                      type="button"
                      onClick={handleGenerateBarcode}
                      className="px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center cursor-pointer font-extrabold active:scale-95 transition-all text-[10px] gap-1 shrink-0"
                      title="Auto-Generate unique 7-digit Barcode starting with 45"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Gen</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenScanner('barcode')}
                      className="px-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white border dark:border-slate-700 rounded-xl flex items-center justify-center cursor-pointer font-bold active:scale-95 transition-all shrink-0"
                      title="Scan with Camera"
                    >
                      <Scan className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
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
                  <DollarSign className="w-3 h-3" />
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
                  <DollarSign className="w-3 h-3" />
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

            {/* Alternate Unit packaging toggle */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">Enable Bulk Packaging Unit</span>
                  <span className="text-[10px] text-slate-400 block">Pieces to Cartons/Boxes conversions (e.g. 1 Box = 12 pcs)</span>
                </div>
                <input
                  type="checkbox"
                  checked={hasAltUnit}
                  onChange={(e) => setHasAltUnit(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded cursor-pointer"
                />
              </div>

              {hasAltUnit && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Packaging Name
                    </label>
                    <input
                      type="text"
                      value={altUnitName}
                      onChange={(e) => setAltUnitName(e.target.value)}
                      placeholder="e.g. Box, Carton"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Ratio (base {unit || 'pcs'} per bulk Unit)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={altUnitFactor}
                      onChange={(e) => setAltUnitFactor(Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 font-bold"
                    />
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
    </div>
  );
};
