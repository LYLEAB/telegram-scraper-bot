import { useState } from 'react';
import { X, FileSpreadsheet, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[]; // The filtered array of submissions to export
}

const AVAILABLE_COLUMNS = [
  { id: 'date', label: 'Date' },
  { id: 'channel_label', label: 'Channel' },
  { id: 'category_label', label: 'Category' },
  { id: 'brand', label: 'Brand' },
  { id: 'sku', label: 'SKUs' },
  { id: 'price_source_label', label: 'NCP/ORD' },
  { id: 'basic_price', label: 'Price In' },
  { id: 'scheme', label: 'Scheme' },
  { id: 'foc', label: 'FOC' },
  { id: 'discount', label: 'Discount' },
  { id: 'net_price', label: 'Price after promotion' },
  { id: 'sellout_price_consumer', label: 'To Enconsumer Per Ctn' },
  { id: 'sellout_price_consumer_can', label: 'To Enconsumer Per Can' },
  { id: 'sellout_price_seller', label: 'Sellout to Seller (W/S-Sell)' },
  { id: 'note', label: 'Notes' },
  { id: 'other', label: 'Other' },
  { id: 'submitted_by', label: 'Submitter' },
  { id: 'province_label', label: 'Province' },
  { id: 'district_label', label: 'District' }
];

export default function ExportModal({ isOpen, onClose, data }: ExportModalProps) {
  // Pre-select all columns by default
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(AVAILABLE_COLUMNS.map(c => c.id)));

  if (!isOpen) return null;

  const toggleColumn = (id: string) => {
    setSelectedColumns(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getExportData = (sourceData = data) => {
    // Determine the columns in the exact order they appear in AVAILABLE_COLUMNS
    const activeCols = AVAILABLE_COLUMNS.filter(c => selectedColumns.has(c.id));
    const headers = ['No.', ...activeCols.map(c => c.label)];

    const parseScheme = (schemeString: string) => {
      if (!schemeString) return { scheme: '', foc: '' };
      const plusMatch = schemeString.match(/^(\d+)\s*\+\s*(\d+)$/);
      if (plusMatch) return { scheme: plusMatch[1], foc: plusMatch[2] };
      return { scheme: schemeString, foc: '' };
    };

    const parseBrandAndSku = (fullBrandLabel: string) => {
      if (!fullBrandLabel) return { shortBrand: '', sku: '' };
      const parts = fullBrandLabel.trim().split(' ');
      if (parts.length >= 3) {
        const sku = parts.slice(-2).join(' ');
        const shortBrand = parts.slice(0, -2).join(' ');
        return { shortBrand, sku };
      }
      return { shortBrand: fullBrandLabel, sku: '' };
    };

    const formatPriceSource = (label: string | undefined | null) => {
      if (!label) return 'NCP';
      const lower = label.toLowerCase();
      if (lower === 'company') return 'NCP';
      if (lower === 'wholesale') return 'ORD';
      return label;
    };

    const rows = sourceData.map((sub, i) => {
      const d = new Date(sub.phnom_penh_time || sub.created_at);
      const parsedScheme = parseScheme(sub.scheme);
      const { shortBrand, sku } = parseBrandAndSku(sub.brand_label);
      
      let computedNetPrice = sub.net_price;
      if (!computedNetPrice && sub.basic_price && parsedScheme.scheme && parsedScheme.foc && parsedScheme.scheme !== '—' && parsedScheme.foc !== '—') {
        const s = Number(parsedScheme.scheme);
        const f = Number(parsedScheme.foc);
        if (s > 0 && f > 0) {
          computedNetPrice = ((Number(sub.basic_price) * s) / (s + f)).toFixed(2);
        } else {
          computedNetPrice = sub.basic_price;
        }
      } else if (!computedNetPrice && sub.basic_price) {
        computedNetPrice = sub.basic_price;
      }

      const rowData: any[] = [i + 1];
      
      activeCols.forEach(col => {
        switch (col.id) {
          case 'date': rowData.push(d.toLocaleDateString('en-US', { timeZone: 'UTC' })); break;
          case 'time': rowData.push(d.toLocaleTimeString('en-US', { timeZone: 'UTC' })); break;
          case 'brand': rowData.push(shortBrand || ''); break;
          case 'sku': rowData.push(sku || ''); break;
          case 'price_source_label': rowData.push(formatPriceSource(sub.price_source_label)); break;
          case 'scheme': rowData.push(parsedScheme.scheme || ''); break;
          case 'foc': rowData.push(parsedScheme.foc || ''); break;
          case 'basic_price': rowData.push(sub.basic_price ? `$${sub.basic_price}` : ''); break;
          case 'net_price': rowData.push(computedNetPrice ? `$${computedNetPrice}` : ''); break;
          case 'discount': rowData.push(''); break; // Currently not captured in DB
          case 'other': rowData.push(''); break; // Blank column
          case 'sellout_price_consumer': rowData.push(sub.sellout_price_consumer ? `$${sub.sellout_price_consumer}` : ''); break;
          case 'sellout_price_consumer_can': rowData.push(sub.sellout_price_consumer_can ? `${sub.sellout_price_consumer_can}` : ''); break;
          case 'sellout_price_seller': rowData.push(sub.sellout_price_seller ? `$${sub.sellout_price_seller}` : ''); break;
          default: rowData.push(sub[col.id] || ''); break;
        }
      });
      return rowData;
    });

    return { headers, rows };
  };

  const handleExportExcel = () => {
    const { headers, rows } = getExportData();
    const filename = `MI_Price_Update_${new Date().toISOString().split('T')[0]}.xlsx`;

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/export-excel';
    form.target = '_blank';
    
    const dataInput = document.createElement('input');
    dataInput.type = 'hidden';
    dataInput.name = 'excelData';
    dataInput.value = JSON.stringify([['Weekly Market Price Update'], headers, ...rows]);
    
    const nameInput = document.createElement('input');
    nameInput.type = 'hidden';
    nameInput.name = 'filename';
    nameInput.value = filename;
    
    form.appendChild(dataInput);
    form.appendChild(nameInput);
    document.body.appendChild(form);
    form.submit();
    
    setTimeout(() => document.body.removeChild(form), 100);
    onClose();
  };

  const handleExportCSV = () => {
    const { headers, rows } = getExportData();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Submissions');
    XLSX.writeFile(wb, `MI_Price_Update_${new Date().toISOString().split('T')[0]}.csv`);
    onClose();
  };

  const handleExportPDF = () => {
    const { headers, rows } = getExportData();
    
    // Landscape orientation to fit many columns, use A3 to avoid text wrapping issues
    const doc = new jsPDF({ orientation: 'landscape', format: 'a3' });
    
    // Title
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // Dark slate
    doc.setFont("helvetica", "bold");
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text('Weekly Market Price Update', pageWidth / 2, 22, { align: 'center' });
    
    // AutoTable
    autoTable(doc, {
      startY: 32,
      head: [headers],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 9, fontStyle: 'bold', halign: 'center', valign: 'middle' },
      bodyStyles: { fontSize: 8, cellPadding: 4, textColor: [51, 65, 85], halign: 'center', valign: 'middle' },
      styles: { overflow: 'linebreak', lineWidth: 0.1, lineColor: [226, 232, 240] },
      alternateRowStyles: { fillColor: [248, 250, 252] }, // Clean very light gray
      rowPageBreak: 'avoid',
      columnStyles: {
        0: { cellWidth: 15 } // No. column should be narrow
      }
    });
    
    doc.save(`MI_Price_Update_${new Date().toISOString().split('T')[0]}.pdf`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white dark:bg-[#111C44] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 bg-[#F4F7FE]/50 dark:bg-[#0B1437]/50">
          <div>
            <h2 className="text-xl font-bold text-navy dark:text-white">Export Data</h2>
            <p className="text-sm text-gray-500 mt-1">Select the columns to include in your export ({data.length} record{data.length > 1 ? 's' : ''} selected)</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-navy dark:text-white mb-3">Columns to Export</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {AVAILABLE_COLUMNS.map(col => (
              <label 
                key={col.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none
                  ${selectedColumns.has(col.id) 
                    ? 'border-[#E41E26] bg-red-50 dark:bg-red-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-800'
                  }
                `}
              >
                <div className={`w-5 h-5 rounded flex shrink-0 items-center justify-center border transition-colors
                  ${selectedColumns.has(col.id) 
                    ? 'bg-[#E41E26] border-[#E41E26]' 
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-transparent'
                  }
                `}>
                  {selectedColumns.has(col.id) && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={selectedColumns.has(col.id)} 
                  onChange={() => toggleColumn(col.id)} 
                />
                <span className={`text-sm font-medium leading-none ${selectedColumns.has(col.id) ? 'text-navy dark:text-white' : 'text-gray-500'}`}>
                  {col.label}
                </span>
              </label>
            ))}
            </div>
          </div>

          {/* Live Preview */}
          {selectedColumns.size > 0 && (
            <div>
              <h3 className="text-sm font-bold text-navy dark:text-white mb-3 flex items-center gap-2">
                Data Preview <span className="text-xs font-normal text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">First 3 Rows</span>
              </h3>
              <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden overflow-x-auto bg-gray-50/50 dark:bg-[#0B1437]/30">
                {(() => {
                  const { headers, rows } = getExportData(data.slice(0, 3));
                  return (
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300">
                        <tr>
                          {headers.map((h, i) => (
                            <th key={i} className="px-3 py-2 font-bold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                        {rows.length > 0 ? (
                          rows.map((row, i) => (
                            <tr key={i} className="hover:bg-white dark:hover:bg-[#111C44]/50">
                              {row.map((cell, j) => (
                                <td key={j} className="px-3 py-2 text-gray-600 dark:text-gray-400">{cell || '-'}</td>
                              ))}
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={headers.length} className="px-3 py-4 text-center text-gray-400">No data available for preview</td></tr>
                        )}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-[#F4F7FE]/50 dark:bg-[#0B1437]/50 flex justify-between items-center gap-4">
          <button 
            onClick={() => setSelectedColumns(new Set(AVAILABLE_COLUMNS.map(c => c.id)))}
            className="text-sm font-bold text-gray-500 hover:text-navy dark:hover:text-white transition"
          >
            Select All
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCSV}
              disabled={selectedColumns.size === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 dark:bg-green-700 py-3 px-5 text-sm font-bold text-white hover:bg-green-700 dark:hover:bg-green-600 transition shadow-md shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={handleExportPDF}
              disabled={selectedColumns.size === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-800 dark:bg-gray-700 py-3 px-5 text-sm font-bold text-white hover:bg-black transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4" /> Export PDF
            </button>
            <button
              onClick={handleExportExcel}
              disabled={selectedColumns.size === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E41E26] py-3 px-5 text-sm font-bold text-white hover:bg-[#C21820] transition shadow-md shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
