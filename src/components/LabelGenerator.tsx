/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer, X, Tag, Sparkles, Plus, Trash } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency, formatDate } from '../utils';

interface LabelGeneratorProps {
  products: Product[];
  shopName: string;
  fssai?: string;
  onClose: () => void;
  initialProductId?: string | null;
  onQuickUpdateBarcode?: (productId: string, barcode: string) => void;
}

const A4_PRESETS = {
  '3x8': { name: '3 x 8 Grid (24 Labels, 70x37mm)', cols: 3, rows: 8, margin: 10, gap: 2, fontSize: '8.5pt', barcodeHeight: 18 },
  '4x10': { name: '4 x 10 Grid (40 Labels, 48.5x25.4mm)', cols: 4, rows: 10, margin: 8, gap: 1.5, fontSize: '7.5pt', barcodeHeight: 14 },
  '5x13': { name: '5 x 13 Grid (65 Labels, 38.1x21.2mm)', cols: 5, rows: 13, margin: 7, gap: 1, fontSize: '6.5pt', barcodeHeight: 10 },
};

const generateBarcodeOnCanvas = (canvas: HTMLCanvasElement, value: string, options: any) => {
  const cleanValue = value.trim();
  const isAllNumeric = /^\d+$/.test(cleanValue);
  
  if (isAllNumeric && cleanValue.length === 13) {
    try {
      JsBarcode(canvas, cleanValue, { ...options, format: 'EAN13' });
      return;
    } catch (e) {
      // Fallback if EAN13 checksum or rendering fails
    }
  }
  if (isAllNumeric && cleanValue.length === 8) {
    try {
      JsBarcode(canvas, cleanValue, { ...options, format: 'EAN8' });
      return;
    } catch (e) {
      // Fallback
    }
  }
  // Default to CODE128
  JsBarcode(canvas, cleanValue, { ...options, format: 'CODE128' });
};

interface BarcodeComponentProps {
  value: string;
  height: number;
  width: number;
  className?: string;
  style?: React.CSSProperties;
}

const BarcodeComponent: React.FC<BarcodeComponentProps> = ({
  value,
  height,
  width,
  className = '',
  style,
}) => {
  const [imgSrc, setImgSrc] = React.useState<string>('');

  useEffect(() => {
    if (value) {
      try {
        const canvas = document.createElement('canvas');
        generateBarcodeOnCanvas(canvas, value, {
          displayValue: false,
          height: height * 2.5, // 2.5x multiplier for crisp print line resolution
          width: width * 2.5,   // 2.5x multiplier for crisp print line resolution
          margin: 0,
        });
        setImgSrc(canvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('Barcode generation failed:', err);
      }
    }
  }, [value, height, width]);

  if (!imgSrc) {
    return (
      <div 
        className={`bg-slate-100 dark:bg-slate-800 animate-pulse rounded ${className}`} 
        style={{ height: `${height}px`, width: '100%', ...style }} 
      />
    );
  }

  return (
    <img
      src={imgSrc}
      alt={value}
      className={className}
      style={{
        height: `${height}px`,
        imageRendering: 'pixelated',
        objectFit: 'contain',
        ...style
      }}
      referrerPolicy="no-referrer"
    />
  );
};

export const LabelGenerator: React.FC<LabelGeneratorProps> = ({
  products,
  shopName,
  fssai,
  onClose,
  initialProductId = null,
  onQuickUpdateBarcode,
}) => {
  const [selectedProductId, setSelectedProductId] = React.useState<string>(initialProductId || '');
  const [printQty, setPrintQty] = React.useState<number>(12);
  const [size, setSize] = React.useState<'sm' | 'md' | 'lg'>('md');
  const [showPrice, setShowPrice] = React.useState<boolean>(true);
  const [showMrp, setShowMrp] = React.useState<boolean>(true);
  const [showShopName, setShowShopName] = React.useState<boolean>(false);
  const [showFssai, setShowFssai] = React.useState<boolean>(false);
  const [showExpiry, setShowExpiry] = React.useState<boolean>(false);
  const [showPackingDate, setShowPackingDate] = React.useState<boolean>(false);
  const [packingDate, setPackingDate] = React.useState<string>(new Date().toISOString().split('T')[0]);
  
  // A4 state variables
  const [layoutMode, setLayoutMode] = React.useState<'single' | 'a4'>('single');
  const [a4Preset, setA4Preset] = React.useState<'3x8' | '4x10' | '5x13'>('4x10');
  const [a4StartOffset, setA4StartOffset] = React.useState<number>(0);

  // Bulk state variables
  const [bulkMode, setBulkMode] = React.useState<boolean>(false);
  const [queue, setQueue] = React.useState<{ product: Product; qty: number }[]>([]);
  const [bulkSelectId, setBulkSelectId] = React.useState<string>('');
  const [bulkSelectQty, setBulkSelectQty] = React.useState<number>(10);

  // References to rendered barcode SVGs inside the preview sheet
  const svgContainerRef = useRef<HTMLDivElement>(null);

  // Print-specific filtering & sorting states
  const [showAllProducts, setShowAllProducts] = React.useState<boolean>(false);
  const [printSearchQuery, setPrintSearchQuery] = React.useState<string>('');
  const [printSortOrder, setPrintSortOrder] = React.useState<'none' | 'a-z' | 'z-a'>('none');

  const isScannedBarcode = (barcode: string) => {
    if (!barcode) return false;
    return !(barcode.startsWith('45') && barcode.length === 7 && /^\d+$/.test(barcode));
  };

  const filteredPrintProducts = React.useMemo(() => {
    let list = [...products];

    // 1. By default, don't show products whose barcode is scanned
    if (!showAllProducts) {
      list = list.filter(p => !isScannedBarcode(p.barcode));
    }

    // 2. Search option for search product
    if (printSearchQuery.trim()) {
      const q = printSearchQuery.toLowerCase().trim();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }

    // 3. Sort option as alphabetical order both ways z to a or a to z
    if (printSortOrder === 'a-z') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (printSortOrder === 'z-a') {
      list.sort((a, b) => b.name.localeCompare(a.name));
    }

    return list;
  }, [products, showAllProducts, printSearchQuery, printSortOrder]);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleAddToQueue = () => {
    const prod = products.find(p => p.id === bulkSelectId);
    if (!prod) return;
    
    if (!prod.barcode) {
      alert("This product has no Barcode SKU. Please assign a barcode before adding to the print queue.");
      return;
    }

    const existingIndex = queue.findIndex(item => item.product.id === prod.id);
    if (existingIndex > -1) {
      const newQueue = [...queue];
      newQueue[existingIndex].qty += bulkSelectQty;
      setQueue(newQueue);
    } else {
      setQueue([...queue, { product: prod, qty: bulkSelectQty }]);
    }
    setBulkSelectId('');
  };

  const flatLabelsPreview = React.useMemo(() => {
    const items: Product[] = [];
    if (bulkMode) {
      for (const item of queue) {
        for (let i = 0; i < item.qty; i++) {
          items.push(item.product);
        }
      }
    } else if (selectedProduct) {
      for (let i = 0; i < printQty; i++) {
        items.push(selectedProduct);
      }
    }
    return items;
  }, [bulkMode, queue, selectedProduct, printQty]);

  const handlePrint = () => {
    const itemsToPrint: { product: Product; qty: number }[] = [];
    if (bulkMode) {
      if (queue.length === 0) return;
      itemsToPrint.push(...queue);
    } else {
      if (!selectedProduct || !selectedProduct.barcode) return;
      itemsToPrint.push({ product: selectedProduct, qty: printQty });
    }

    // Dimensions in milimeters for label size styles
    const dims = {
      sm: { w: '38mm', h: '25mm', font: '6pt' },
      md: { w: '50mm', h: '30mm', font: '8pt' },
      lg: { w: '70mm', h: '40mm', font: '10pt' },
    };
    const d = dims[size];

    const getBarcodeImgHTML = (product: Product) => {
      if (!product.barcode) {
        return `<div style="color:red; font-weight:bold; font-size:10px;">No Barcode</div>`;
      }
      try {
        const tempCanvas = document.createElement('canvas');
        const h = layoutMode === 'single'
          ? (size === 'sm' ? 18 : size === 'md' ? 26 : 34)
          : A4_PRESETS[a4Preset].barcodeHeight;

        const w = layoutMode === 'single'
          ? (size === 'sm' ? 1.0 : size === 'md' ? 1.3 : 1.7)
          : (a4Preset === '3x8' ? 1.25 : a4Preset === '4x10' ? 0.95 : 0.7);

        generateBarcodeOnCanvas(tempCanvas, product.barcode, {
          displayValue: false,
          height: h * 3, // 3x multiplier for super crisp high-resolution printing
          width: w * 3,   // 3x multiplier
          margin: 0,
        });
        const url = tempCanvas.toDataURL('image/png');
        return `<img src="${url}" class="barcode-svg barcode-img" style="height:${h}px; image-rendering:pixelated; object-fit:contain;" referrerpolicy="no-referrer" />`;
      } catch (e) {
        console.warn('Barcode render failed:', e);
        return `<div style="color:red; font-weight:bold; font-size:10px;">Barcode Error</div>`;
      }
    };

    let sheetsHTML = '';
    const preset = A4_PRESETS[a4Preset];

    const buildLabelHTML = (prod: Product, svgSrc: string) => {
      let dateParts: string[] = [];
      if (showPackingDate && packingDate) dateParts.push(`Pkg: ${formatDate(packingDate)}`);
      if (showExpiry && prod.expiryDate) dateParts.push(`Exp: ${formatDate(prod.expiryDate)}`);
      const dateLine = dateParts.join(' • ');

      return `
        <div class="label-box">
          ${showShopName && shopName ? `<div class="shop-name">${shopName}</div>` : ''}
          <div class="prod-name" title="${prod.name}">${prod.name}</div>
          <div class="barcode-wrapper">
            ${svgSrc}
            <div class="barcode-text">${prod.barcode || ''}</div>
          </div>
          <div class="price-info">
            ${showPrice ? `<span class="price">Rs.${formatCurrency(prod.sellPrice || prod.mrp)}</span>` : ''}
            ${showMrp && prod.mrp !== prod.sellPrice ? `<span class="mrp">MRP Rs.${formatCurrency(prod.mrp)}</span>` : ''}
          </div>
          ${dateLine ? `<div class="expiry">${dateLine}</div>` : ''}
          ${showFssai && fssai ? `<div class="fssai-num">FSSAI: ${fssai}</div>` : ''}
        </div>
      `;
    };

    if (layoutMode === 'single') {
      let labelsHTML = '';
      for (const item of itemsToPrint) {
        const prod = item.product;
        const svgSrc = getBarcodeImgHTML(prod);
        for (let i = 0; i < item.qty; i++) {
          labelsHTML += buildLabelHTML(prod, svgSrc);
        }
      }
      sheetsHTML = `<div class="sheet">${labelsHTML}</div>`;
    } else {
      const flatLabels: Product[] = [];
      for (const item of itemsToPrint) {
        for (let i = 0; i < item.qty; i++) {
          flatLabels.push(item.product);
        }
      }

      const totalLabels = flatLabels.length;
      const totalSlots = a4StartOffset + totalLabels;
      const itemsPerPage = preset.cols * preset.rows;
      const totalPages = Math.ceil(totalSlots / itemsPerPage);

      for (let page = 0; page < totalPages; page++) {
        sheetsHTML += `<div class="a4-sheet">`;
        for (let slot = 0; slot < itemsPerPage; slot++) {
          const slotIdx = page * itemsPerPage + slot;
          if (slotIdx >= a4StartOffset && slotIdx < totalSlots) {
            const labelProd = flatLabels[slotIdx - a4StartOffset];
            const svgSrc = getBarcodeImgHTML(labelProd);
            sheetsHTML += buildLabelHTML(labelProd, svgSrc);
          } else {
            sheetsHTML += `<div class="label-box empty-slot"></div>`;
          }
        }
        sheetsHTML += `</div>`;
      }
    }

    // Attempt popup printing window or inline media style injection if blocked
    const printWindow = window.open('', '_blank', 'width=800,height=750');
    if (!printWindow) {
      // Bypasses popup block inside sandbox iframes by performing inline printing!
      const styleEl = document.createElement('style');
      styleEl.id = 'inline-barcode-print-style';
      styleEl.innerHTML = `
        @media print {
          body > * {
            display: none !important;
          }
          #inline-barcode-print-wrapper {
            display: block !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          ${layoutMode === 'single' ? `
            .sheet {
              display: flex !important;
              flex-wrap: wrap !important;
              gap: 4mm !important;
              background: #ffffff !important;
              padding: 10mm !important;
            }
            .label-box {
              width: ${d.w} !important;
              height: ${d.h} !important;
              border: 0.1mm solid #000000 !important;
              padding: 2mm 1.5mm 1.5mm 1.5mm !important;
              box-sizing: border-box !important;
              display: inline-flex !important;
              flex-direction: column !important;
              justify-content: center !important;
              align-items: center !important;
              text-align: center !important;
              background: #ffffff !important;
              page-break-inside: avoid !important;
              margin: 2mm !important;
              overflow: hidden !important;
            }
          ` : `
            @page {
              size: A4 portrait;
              margin: 0 !important;
            }
            .a4-sheet {
              width: 210mm !important;
              height: 297mm !important;
              padding: ${preset.margin}mm !important;
              box-sizing: border-box !important;
              display: grid !important;
              grid-template-columns: repeat(${preset.cols}, 1fr) !important;
              grid-template-rows: repeat(${preset.rows}, 1fr) !important;
              gap: ${preset.gap}mm !important;
              page-break-after: always !important;
              background: #ffffff !important;
              overflow: hidden !important;
            }
            .label-box {
              border: 0.1mm dashed #dddddd !important;
              padding: 2mm 1mm 1.5mm 1mm !important;
              box-sizing: border-box !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: center !important;
              align-items: center !important;
              text-align: center !important;
              background: #ffffff !important;
              overflow: hidden !important;
            }
            .empty-slot {
              border: none !important;
              background: transparent !important;
            }
          `}
          .shop-name {
            font-size: ${layoutMode === 'single' ? `calc(${d.font} - 2pt)` : `calc(${preset.fontSize} - 2pt)`} !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            color: #000000 !important;
            line-height: 1.1 !important;
            padding: 0.5mm 0 0 0 !important;
            margin-bottom: 0.5mm !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            width: 100% !important;
            letter-spacing: 0.2px !important;
          }
          .prod-name {
            font-size: ${layoutMode === 'single' ? `calc(${d.font} - 0.5pt)` : `calc(${preset.fontSize} - 0.5pt)`} !important;
            font-weight: 700 !important;
            line-height: 1.15 !important;
            padding: 0 !important;
            margin-bottom: 0.5mm !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 1 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
            width: 100% !important;
            color: #000000 !important;
          }
          .barcode-wrapper {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            width: 100% !important;
            margin-bottom: 0.5mm !important;
          }
          /* Prevent scaling artifacts and force pristine high-contrast fill */
          .barcode-wrapper svg, .barcode-wrapper img {
            display: block !important;
            margin: 0 auto !important;
            max-width: 92% !important;
            height: ${layoutMode === 'single' ? (size === 'sm' ? '15' : size === 'md' ? '22' : '28') : preset.barcodeHeight}px !important;
            image-rendering: pixelated !important;
            image-rendering: -moz-crisp-edges !important;
            image-rendering: crisp-edges !important;
            object-fit: contain !important;
            background-color: #ffffff !important;
          }
          .barcode-text {
            font-size: ${layoutMode === 'single' ? `calc(${d.font} - 2.5pt)` : `calc(${preset.fontSize} - 2.5pt)`} !important;
            font-family: monospace !important;
            font-weight: 700 !important;
            letter-spacing: 0.8px !important;
            margin-top: 0.2mm !important;
            color: #000000 !important;
            line-height: 1 !important;
          }
          .price-info {
            display: flex !important;
            justify-content: center !important;
            gap: 1.5mm !important;
            align-items: baseline !important;
            width: 100% !important;
            margin-top: 0.3mm !important;
            line-height: 1 !important;
          }
          .price {
            font-size: ${layoutMode === 'single' ? d.font : preset.fontSize} !important;
            font-weight: 900 !important;
            color: #000000 !important;
          }
          .mrp {
            font-size: ${layoutMode === 'single' ? `calc(${d.font} - 2pt)` : `calc(${preset.fontSize} - 2pt)`} !important;
            text-decoration: line-through !important;
            color: #444444 !important;
            font-weight: 600 !important;
          }
          .expiry {
            font-size: ${layoutMode === 'single' ? `calc(${d.font} - 2.5pt)` : `calc(${preset.fontSize} - 2.5pt)`} !important;
            color: #222222 !important;
            margin-top: 0.3mm !important;
            font-weight: 600 !important;
            line-height: 1.1 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            max-width: 100% !important;
          }
          .fssai-num {
            font-size: ${layoutMode === 'single' ? `calc(${d.font} - 2.8pt)` : `calc(${preset.fontSize} - 2.8pt)`} !important;
            color: #222222 !important;
            margin-top: 0.2mm !important;
            font-weight: 700 !important;
            line-height: 1.1 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            max-width: 100% !important;
          }
          /* Strip all other backgrounds, shadows, and force exact printing */
          * {
            background-color: transparent !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          html, body, #inline-barcode-print-wrapper, .sheet, .a4-sheet, .label-box {
            background-color: #ffffff !important;
          }
        }
        #inline-barcode-print-wrapper {
          display: none;
        }
      `;
      document.head.appendChild(styleEl);

      const printWrapper = document.createElement('div');
      printWrapper.id = 'inline-barcode-print-wrapper';
      printWrapper.innerHTML = sheetsHTML;
      document.body.appendChild(printWrapper);

      // Wait for all image sources/dataURLs to load/decode in browser before printing
      const imgs = Array.from(printWrapper.querySelectorAll('img'));
      Promise.all(imgs.map(img => {
        return new Promise<void>(resolve => {
          if (img.complete) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        });
      })).then(() => {
        // Yield to browser execution context to fully paint the images onto the canvas/GPU
        setTimeout(() => {
          window.print();
          setTimeout(() => {
            document.getElementById('inline-barcode-print-style')?.remove();
            document.getElementById('inline-barcode-print-wrapper')?.remove();
          }, 1000);
        }, 300);
      });
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Labels - ${bulkMode ? 'Bulk Queue' : selectedProduct?.name}</title>
          <style>
            @media print {
              .no-print { display: none !important; }
              body { margin: 0 !important; background: #ffffff !important; }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              ${layoutMode === 'a4' ? `
                @page {
                  size: A4 portrait;
                  margin: 0 !important;
                }
              ` : ''}
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, system-ui, sans-serif;
              background: #f1f5f9;
              padding: 20px;
              margin: 0;
              color: #000000;
            }
            .no-print {
              background: #0f172a;
              color: white;
              padding: 12px 20px;
              border-radius: 12px;
              display: flex;
              gap: 10px;
              margin-bottom: 20px;
              align-items: center;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .print-btn {
              background: #10b981;
              color: white;
              border: none;
              padding: 8px 16px;
              font-weight: bold;
              border-radius: 8px;
              cursor: pointer;
            }
            .close-btn {
              background: #475569;
              color: white;
              border: none;
              padding: 8px 16px;
              font-weight: bold;
              border-radius: 8px;
              cursor: pointer;
            }
            ${layoutMode === 'single' ? `
              .sheet {
                display: flex;
                flex-wrap: wrap;
                gap: 4mm;
                background: white;
                padding: 10mm;
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                border-radius: 8px;
                width: max-content;
                max-width: 100%;
              }
              .label-box {
                width: ${d.w};
                height: ${d.h};
                border: 0.1mm solid #000000;
                padding: 2mm 1.5mm 1.5mm 1.5mm;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
                background: white;
                page-break-inside: avoid;
                color: #000000;
                overflow: hidden;
              }
            ` : `
              .a4-sheet {
                width: 210mm;
                height: 297mm;
                padding: ${preset.margin}mm;
                display: grid;
                grid-template-columns: repeat(${preset.cols}, 1fr);
                grid-template-rows: repeat(${preset.rows}, 1fr);
                gap: ${preset.gap}mm;
                page-break-after: always;
                background: white;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                margin: 0 auto 20px auto;
              }
              .label-box {
                border: 0.1mm dashed #dddddd;
                padding: 2mm 1mm 1.5mm 1mm;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
                background: white;
                overflow: hidden;
              }
              .empty-slot {
                border: none !important;
                background: transparent !important;
              }
            `}
            .shop-name {
              font-size: ${layoutMode === 'single' ? `calc(${d.font} - 2pt)` : `calc(${preset.fontSize} - 2pt)`};
              font-weight: 800;
              text-transform: uppercase;
              color: #000000;
              line-height: 1.1;
              padding: 0.5mm 0 0 0;
              margin-bottom: 0.5mm;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              width: 100%;
              letter-spacing: 0.2px;
            }
            .prod-name {
              font-size: ${layoutMode === 'single' ? `calc(${d.font} - 0.5pt)` : `calc(${preset.fontSize} - 0.5pt)`};
              font-weight: 700;
              line-height: 1.15;
              padding: 0;
              margin-bottom: 0.5mm;
              display: -webkit-box;
              -webkit-line-clamp: 1;
              -webkit-box-orient: vertical;
              overflow: hidden;
              width: 100%;
              color: #000000;
            }
            .barcode-wrapper {
              display: flex;
              flex-direction: column;
              align-items: center;
              width: 100%;
              margin-bottom: 0.5mm;
            }
            .barcode-wrapper svg, .barcode-wrapper img {
              display: block !important;
              margin: 0 auto !important;
              max-width: 92% !important;
              height: ${layoutMode === 'single' ? (size === 'sm' ? '15' : size === 'md' ? '22' : '28') : preset.barcodeHeight}px !important;
              image-rendering: pixelated !important;
              image-rendering: -moz-crisp-edges !important;
              image-rendering: crisp-edges !important;
              object-fit: contain !important;
              background-color: #ffffff !important;
            }
            .barcode-text {
              font-size: ${layoutMode === 'single' ? `calc(${d.font} - 2.5pt)` : `calc(${preset.fontSize} - 2.5pt)`};
              font-family: monospace;
              font-weight: 700;
              letter-spacing: 0.8px;
              margin-top: 0.2mm;
              color: #000000;
              line-height: 1;
            }
            .price-info {
              display: flex;
              justify-content: center;
              gap: 1.5mm;
              align-items: baseline;
              width: 100%;
              margin-top: 0.3mm;
              line-height: 1;
            }
            .price {
              font-size: ${layoutMode === 'single' ? d.font : preset.fontSize};
              font-weight: 900;
              color: #000000;
            }
            .mrp {
              font-size: ${layoutMode === 'single' ? `calc(${d.font} - 2pt)` : `calc(${preset.fontSize} - 2pt)`};
              text-decoration: line-through;
              color: #444444;
              font-weight: 600;
            }
            .expiry {
              font-size: ${layoutMode === 'single' ? `calc(${d.font} - 2.5pt)` : `calc(${preset.fontSize} - 2.5pt)`};
              color: #222222;
              margin-top: 0.3mm;
              font-weight: 600;
              line-height: 1.1;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 100%;
            }
            .fssai-num {
              font-size: ${layoutMode === 'single' ? `calc(${d.font} - 2.8pt)` : `calc(${preset.fontSize} - 2.8pt)`};
              color: #222222;
              margin-top: 0.2mm;
              font-weight: 700;
              line-height: 1.1;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 100%;
            }
          </style>
        </head>
        <body>
          <div class="no-print">
            <strong>Sticker Labels Printable Sheet Ready</strong>
            <button class="print-btn" onclick="window.print()">🖨️ Print to PDF / Label Printer</button>
            <button class="close-btn" onclick="window.close()">Close Window</button>
          </div>
          ${sheetsHTML}
          <script>
            window.addEventListener('load', () => {
              const imgs = Array.from(document.querySelectorAll('img'));
              Promise.all(imgs.map(img => {
                return new Promise(resolve => {
                  if (img.complete) {
                     resolve();
                  } else {
                     img.onload = () => resolve();
                     img.onerror = () => resolve();
                  }
                });
              })).then(() => {
                setTimeout(() => {
                  window.print();
                }, 350);
              });
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-indigo-500" />
          <h3 className="font-extrabold text-slate-800 text-base">Print Barcode Labels</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl mb-3 border border-slate-200/50 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setBulkMode(false)}
          className={`flex-1 py-1.5 text-center text-xs font-black rounded-lg transition-all cursor-pointer ${
            !bulkMode
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Single Product
        </button>
        <button
          type="button"
          onClick={() => setBulkMode(true)}
          className={`flex-1 py-1.5 text-center text-xs font-black rounded-lg transition-all cursor-pointer ${
            bulkMode
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Bulk Selection Queue
        </button>
      </div>

      {/* Barcode Print Filter and Sort Controls */}
      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-850/60 mb-3 space-y-2.5 select-none">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search product..."
              value={printSearchQuery}
              onChange={(e) => setPrintSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-3 pr-8 py-2 text-xs outline-none focus:border-indigo-500 font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400"
            />
            {printSearchQuery && (
              <button
                type="button"
                onClick={() => setPrintSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ×
              </button>
            )}
          </div>
          <select
            value={printSortOrder}
            onChange={(e) => setPrintSortOrder(e.target.value as 'none' | 'a-z' | 'z-a')}
            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs outline-none focus:border-indigo-500 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value="none">Sort: Default</option>
            <option value="a-z">Alphabetical (A to Z)</option>
            <option value="z-a">Alphabetical (Z to A)</option>
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showAllProducts}
            onChange={(e) => setShowAllProducts(e.target.checked)}
            className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
          />
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
            Show all products (including scanned/vendor barcodes)
          </span>
        </label>
      </div>

      <div className="space-y-3 mb-4">
        {!bulkMode ? (
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Selected Product ({filteredPrintProducts.length} shown)
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500 appearance-none text-slate-800 font-medium"
            >
              <option value="">Select a product...</option>
              {filteredPrintProducts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.barcode ? `(${p.barcode})` : '[No Barcode]'}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">
              Add Products to Print Queue ({filteredPrintProducts.filter(p => p.barcode).length} shown)
            </span>
            <div className="space-y-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Choose Product
                </label>
                <select
                  value={bulkSelectId}
                  onChange={(e) => setBulkSelectId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500 font-semibold text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="">Choose a product...</option>
                  {filteredPrintProducts.filter(p => p.barcode).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.barcode})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Qty of Labels
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={bulkSelectQty}
                    onChange={(e) => setBulkSelectQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-slate-200"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddToQueue}
                  disabled={!bulkSelectId}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-250 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 font-black uppercase text-[10px] tracking-wider rounded-xl transition-all cursor-pointer active:scale-95 text-white shrink-0 h-[38px] flex items-center justify-center gap-1"
                >
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Current Queue List */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Queue ({queue.length} items, {queue.reduce((acc, i) => acc + i.qty, 0)} labels)
                </span>
                {queue.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setQueue([])}
                    className="text-[9px] font-extrabold text-rose-500 hover:text-rose-600 uppercase tracking-wider cursor-pointer bg-transparent border-none"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {queue.length === 0 ? (
                <div className="text-center py-4 text-[11px] text-slate-400 bg-white dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850 p-2">
                  No items in queue. Select a product above to queue.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                  {queue.map((item, index) => (
                    <div
                      key={item.product.id}
                      className="flex items-center justify-between bg-white dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="text-slate-800 dark:text-slate-200 block truncate text-left">{item.product.name}</span>
                        <span className="text-[8.5px] text-slate-400 font-extrabold uppercase tracking-widest font-mono block text-left">
                          {item.product.barcode}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => {
                            const newQty = Math.max(1, parseInt(e.target.value) || 1);
                            const newQueue = [...queue];
                            newQueue[index].qty = newQty;
                            setQueue(newQueue);
                          }}
                          className="w-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 text-center text-xs font-extrabold text-slate-850 dark:text-slate-200 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newQueue = queue.filter((_, i) => i !== index);
                            setQueue(newQueue);
                          }}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 text-rose-500 rounded cursor-pointer transition-colors bg-transparent border-none"
                          title="Remove"
                        >
                          <Trash className="w-3.5 h-3.5 stroke-[2.5px]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {(bulkMode || selectedProduct) ? (
          <>
            {/* Tab Selector Mode */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Print Mode
              </label>
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl mb-3 border border-slate-200/50 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setLayoutMode('single')}
                  className={`flex-1 py-1.5 text-center text-xs font-black rounded-lg transition-all cursor-pointer ${
                    layoutMode === 'single'
                      ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Individual Roll Label
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode('a4')}
                  className={`flex-1 py-1.5 text-center text-xs font-black rounded-lg transition-all cursor-pointer ${
                    layoutMode === 'a4'
                      ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  A4 Sticker Sheet (Print Preview)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {!bulkMode ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Quantity of Labels
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={printQty}
                    onChange={(e) => setPrintQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-slate-200"
                  />
                </div>
              ) : (
                <div className="col-span-1 bg-slate-50 dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1 text-left">Total Labels</span>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-200 leading-none text-left">
                    {queue.reduce((acc, i) => acc + i.qty, 0)} pcs
                  </span>
                </div>
              )}

              {layoutMode === 'single' ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Label Dimensions
                  </label>
                  <select
                    value={size}
                    onChange={(e) => setSize(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500 appearance-none text-slate-800 dark:text-slate-200 font-medium"
                  >
                    <option value="sm">Small (38x25 mm)</option>
                    <option value="md">Medium (50x30 mm)</option>
                    <option value="lg">Large (70x40 mm)</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    A4 Sticker Layout
                  </label>
                  <select
                    value={a4Preset}
                    onChange={(e) => {
                      setA4Preset(e.target.value as any);
                      setA4StartOffset(0); // Reset offset safely
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500 appearance-none text-slate-800 dark:text-slate-200 font-medium"
                  >
                    <option value="3x8">3x8 Grid (24 Labels)</option>
                    <option value="4x10">4x10 Grid (40 Labels)</option>
                    <option value="5x13">5x13 Grid (65 Labels)</option>
                  </select>
                </div>
              )}
            </div>

            {layoutMode === 'a4' && (
              <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3 border border-slate-100 dark:border-slate-900">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Skip Used Stickers (Offset slider)
                  </label>
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                    Skip {a4StartOffset} slots
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={A4_PRESETS[a4Preset].cols * A4_PRESETS[a4Preset].rows - 1}
                  value={a4StartOffset}
                  onChange={(e) => setA4StartOffset(parseInt(e.target.value) || 0)}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <span className="block text-[9px] text-slate-400 mt-1">
                  Perfect for printing on partially-used sheets. Skips the first {a4StartOffset} label cutouts.
                </span>
              </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-900/55 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Formatting Details
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-650 dark:text-slate-350 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  Show Sell Price
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-650 dark:text-slate-350 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showMrp}
                    onChange={(e) => setShowMrp(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  Show MRP Strike
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-650 dark:text-slate-350 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showShopName}
                    onChange={(e) => setShowShopName(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  Show Shop Name
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-650 dark:text-slate-350 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showFssai}
                    onChange={(e) => setShowFssai(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  Show FSSAI Lic No
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-650 dark:text-slate-350 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showExpiry}
                    onChange={(e) => setShowExpiry(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  Show Expiry Date
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-650 dark:text-slate-350 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showPackingDate}
                    onChange={(e) => setShowPackingDate(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  Show Packing Date
                </label>
              </div>

              {showPackingDate && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/60 animate-fade-in flex flex-col gap-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
                    Select Packing Date
                  </label>
                  <input
                    type="date"
                    value={packingDate}
                    onChange={(e) => setPackingDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-slate-200"
                  />
                </div>
              )}
            </div>

            {(!bulkMode && selectedProduct && !selectedProduct.barcode) ? (
              <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-850 dark:text-amber-300 text-xs p-4 rounded-xl border border-amber-200/60 dark:border-amber-900/60 space-y-3">
                <p className="font-bold leading-relaxed">
                  ⚠️ This product has no Barcode SKU assigned yet. Assign a barcode on the product form or create it instantly below:
                </p>
                {onQuickUpdateBarcode && (
                  <button
                    type="button"
                    onClick={() => {
                      const newCode = '20' + Date.now().toString().slice(-10);
                      onQuickUpdateBarcode(selectedProduct.id, newCode);
                    }}
                    className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold uppercase text-[10px] tracking-wider rounded-xl transition-all cursor-pointer active:scale-95 shadow-sm bg-transparent"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate & Assign Barcode SKU
                  </button>
                )}
              </div>
            ) : (
              <div>
                {layoutMode === 'single' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 text-left">
                      Live Sheets Preview (showing up to 6 labels)
                    </label>
                    <div 
                      ref={svgContainerRef}
                      className="bg-slate-100 dark:bg-slate-950 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 justify-center max-h-[220px] overflow-y-auto"
                    >
                      {flatLabelsPreview.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400">No labels to preview</div>
                      ) : (
                        flatLabelsPreview.slice(0, 6).map((prod, idx) => {
                          let dateParts: string[] = [];
                          if (showPackingDate && packingDate) dateParts.push(`Pkg: ${formatDate(packingDate)}`);
                          if (showExpiry && prod.expiryDate) dateParts.push(`Exp: ${formatDate(prod.expiryDate)}`);
                          const dateLine = dateParts.join(' • ');

                          return (
                            <div
                              key={idx}
                              className="bg-white keep-white border border-slate-300 rounded p-2 pt-2.5 flex flex-col items-center justify-center gap-1 shadow-sm text-slate-900 select-none overflow-hidden"
                              style={{
                                width: size === 'sm' ? '100px' : size === 'md' ? '130px' : '160px',
                                height: size === 'sm' ? '70px' : size === 'md' ? '90px' : '110px',
                              }}
                            >
                              {showShopName && shopName && (
                                <div className="text-[7px] font-black text-slate-500 block truncate w-full text-center uppercase leading-none">
                                  {shopName}
                                </div>
                              )}
                              <div className="text-[8.5px] font-extrabold text-slate-900 truncate w-full text-center leading-none">
                                {prod.name}
                              </div>
                              <div className="barcode-wrapper flex flex-col items-center w-full min-h-0 justify-center">
                                <BarcodeComponent
                                  value={prod.barcode}
                                  height={size === 'sm' ? 14 : size === 'md' ? 20 : 26}
                                  width={size === 'sm' ? 1.0 : size === 'md' ? 1.3 : 1.7}
                                  className="barcode-svg max-w-full"
                                />
                                <span className="font-mono text-[6.5px] text-slate-600 font-bold mt-0.5 leading-none">
                                  {prod.barcode}
                                </span>
                              </div>
                              <div className="flex justify-center gap-1.5 items-center w-full leading-none">
                                {showPrice && (
                                  <span className="text-[9.5px] font-black text-slate-900">
                                    Rs.{formatCurrency(prod.sellPrice || prod.mrp)}
                                  </span>
                                )}
                                {showMrp && prod.mrp !== prod.sellPrice && (
                                  <span className="text-[7.5px] line-through text-slate-400">
                                    Rs.{formatCurrency(prod.mrp)}
                                  </span>
                                )}
                              </div>
                              {dateLine && (
                                <div className="text-[7px] font-semibold text-slate-600 leading-none truncate max-w-full">
                                  {dateLine}
                                </div>
                              )}
                              {showFssai && fssai && (
                                <div className="text-[7px] font-bold text-slate-700 leading-none truncate max-w-full">
                                  FSSAI: {fssai}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Interactive A4 Sticker Preview
                      </label>
                      <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded leading-none select-none">
                        Page 1 slots layout
                      </span>
                    </div>

                    <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 flex justify-center">
                      <div 
                        ref={svgContainerRef}
                        className="w-full max-w-[280px] bg-white border border-slate-300 dark:border-slate-800 shadow-xl overflow-hidden p-2 select-none relative"
                        style={{
                          aspectRatio: '1 / 1.414',
                        }}
                      >
                        <div 
                          className="grid h-full"
                          style={{
                            gridTemplateColumns: `repeat(${A4_PRESETS[a4Preset].cols}, 1fr)`,
                            gridTemplateRows: `repeat(${A4_PRESETS[a4Preset].rows}, 1fr)`,
                            gap: '2px',
                          }}
                        >
                          {Array.from({ length: A4_PRESETS[a4Preset].cols * A4_PRESETS[a4Preset].rows }).map((_, idx) => {
                            const totalSlots = a4StartOffset + flatLabelsPreview.length;
                            const isPrinted = idx >= a4StartOffset && idx < totalSlots;
                            const isSkipped = idx < a4StartOffset;
                            const currentProd = isPrinted ? flatLabelsPreview[idx - a4StartOffset] : null;

                            return (
                              <div
                                key={idx}
                                onClick={() => setA4StartOffset(idx)}
                                title={`Click to start printing from cutout #${idx + 1}`}
                                className={`border text-[#000000] cursor-pointer transition-all flex flex-col justify-between p-0.5 overflow-hidden relative ${
                                  isPrinted
                                    ? 'bg-white keep-white border-slate-250 hover:bg-slate-50'
                                    : isSkipped
                                    ? 'border-slate-150 border-dashed hover:bg-slate-100 flex items-center justify-center'
                                    : 'bg-white keep-white border-slate-100 border-dashed opacity-35 hover:opacity-100 flex items-center justify-center'
                                }`}
                                style={{
                                  minHeight: '0',
                                  backgroundImage: isSkipped
                                    ? 'repeating-linear-gradient(45deg, #f8fafc 0px, #f8fafc 6px, #f1f5f9 6px, #f1f5f9 12px)'
                                    : undefined
                                }}
                              >
                                {isPrinted && currentProd ? (() => {
                                  let dateParts: string[] = [];
                                  if (showPackingDate && packingDate) dateParts.push(`Pkg:${formatDate(packingDate)}`);
                                  if (showExpiry && currentProd.expiryDate) dateParts.push(`Exp:${formatDate(currentProd.expiryDate)}`);
                                  const dateLine = dateParts.join(' • ');

                                  return (
                                    <div className="flex flex-col items-center justify-center h-full w-full pointer-events-none py-0.5">
                                      {showShopName && shopName && (
                                        <div className="text-[4px] font-extrabold tracking-tighter truncate w-full text-center uppercase text-slate-500 scale-[0.9] leading-none mb-0.5">
                                          {shopName}
                                        </div>
                                      )}
                                      <div className="text-[5px] font-black text-slate-800 truncate w-full text-center leading-none mb-0.5 scale-[0.95]">
                                        {currentProd.name}
                                      </div>
                                      <div className="barcode-wrapper flex flex-col items-center w-full min-h-0 justify-center">
                                        <BarcodeComponent
                                          value={currentProd.barcode}
                                          height={A4_PRESETS[a4Preset].barcodeHeight}
                                          width={a4Preset === '3x8' ? 1.25 : a4Preset === '4x10' ? 0.95 : 0.7}
                                          className="barcode-svg max-w-full"
                                          style={{ height: `${Math.max(8, A4_PRESETS[a4Preset].barcodeHeight / 1.5)}px` }}
                                        />
                                        <span className="font-mono text-[4px] text-slate-600 font-bold scale-[0.8] tracking-tight truncate leading-none mt-0.5">
                                          {currentProd.barcode}
                                        </span>
                                      </div>
                                      <div className="flex justify-center gap-1 items-center w-full leading-none mt-0.5">
                                        {showPrice && (
                                          <span className="text-[5px] font-black text-slate-900 scale-[0.9]">
                                            Rs.{formatCurrency(currentProd.sellPrice || currentProd.mrp)}
                                          </span>
                                        )}
                                      </div>
                                      {dateLine && (
                                        <div className="text-[3.5px] font-bold text-slate-600 scale-[0.9] leading-none mt-0.5 truncate max-w-full">
                                          {dateLine}
                                        </div>
                                      )}
                                      {showFssai && fssai && (
                                        <div className="text-[3.5px] font-bold text-slate-700 scale-[0.9] leading-none mt-0.5 truncate max-w-full">
                                          FSSAI: {fssai}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })() : (
                                  <span className="text-[7.5px] font-bold text-slate-350 leading-none select-none pointer-events-none">
                                    {idx + 1}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <p className="text-[9.5px] text-slate-450 dark:text-slate-450 text-center mt-2 font-medium">
                      💡 Click any cutout cell above to change starting slot position. Helpful for reusing sheets!
                    </p>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={bulkMode ? queue.length === 0 : !selectedProduct?.barcode}
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-xl transition-all shadow-md active:scale-[0.98] select-none cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              {bulkMode ? (
                `Print Queue Labels (${queue.reduce((acc, i) => acc + i.qty, 0)} total)`
              ) : (
                layoutMode === 'single' 
                  ? `Print Roll Labels (${printQty} count)` 
                  : `Generate Printable A4 Sheet PDF`
              )}
            </button>
          </>
        ) : (
          <div className="text-center py-8 text-xs text-slate-400">
            Please select a product above to customize label formats.
          </div>
        )}
      </div>
    </div>
  );
};
