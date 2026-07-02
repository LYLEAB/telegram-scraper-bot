"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Trash2, MapPin, Image as ImageIcon, Search, Download, 
  Table as TableIcon, Map as MapIcon, Info, Filter, X,
  FileSpreadsheet, Clock, AlertCircle, ChevronUp, ChevronDown,
  ChevronsUpDown, CheckSquare, Square, ArrowUpDown, TrendingUp,
  TrendingDown, Activity, Camera, StickyNote, BarChart3
} from 'lucide-react';
import * as XLSX from 'xlsx';
import PhotoModal from '../PhotoModal';
import ExportModal from './ExportModal';
import SubmissionDetailsModal from '../SubmissionDetailsModal';
import dynamic from 'next/dynamic';
import MultiSelect from '@/components/MultiSelect';
import { useLanguage } from '@/context/LanguageContext';

const AdminMap = dynamic(() => import('../AdminMap'), { 
  ssr: false,
  loading: () => (
    <div className="bg-gray-100 dark:bg-[#0B1437] animate-pulse w-full h-[400px] rounded-xl flex items-center justify-center text-gray-400">
      Loading Map...
    </div>
  )
});

type SortKey = 'date' | 'brand' | 'submitter' | 'province' | 'net_price' | 'basic_price';
type SortDir = 'asc' | 'desc';

// --- Helpers ---
const getPhnomPenhDateStr = (dateVal: string | Date) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  // Format to YYYY-MM-DD in Asia/Phnom_Penh
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Phnom_Penh', year: 'numeric', month: '2-digit', day: '2-digit' });
  return formatter.format(d);
};

export default function SubmissionsClient({ 
  initialSubmissions, 
  brands, 
  provinces 
}: { 
  initialSubmissions: any[],
  brands: any[],
  provinces: any[]
}) {
  const { translate } = useLanguage();
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // --- Filters ---
  const [search, setSearch] = useState('');
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [brandFilters, setBrandFilters] = useState<string[]>([]);
  const [skuFilters, setSkuFilters] = useState<string[]>([]);
  const [priceSourceFilters, setPriceSourceFilters] = useState<string[]>([]);
  const [provinceFilters, setProvinceFilters] = useState<string[]>([]);
  const [channelFilters, setChannelFilters] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [onlyWithPhotos, setOnlyWithPhotos] = useState(false);
  const [onlyWithNotes, setOnlyWithNotes] = useState(false);

  // Helper to extract short brand and sku from full brand_label
  // e.g. "ABC Extra Stout Can 330ml" -> shortBrand: "ABC Extra Stout", sku: "Can 330ml"
  const parseBrandAndSku = useCallback((fullBrandLabel: string) => {
    if (!fullBrandLabel) return { shortBrand: '', sku: '' };
    const parts = fullBrandLabel.trim().split(' ');
    if (parts.length >= 3) {
      const sku = parts.slice(-2).join(' ');
      const shortBrand = parts.slice(0, -2).join(' ');
      return { shortBrand, sku };
    }
    // Fallback if it doesn't match the standard format
    return { shortBrand: fullBrandLabel, sku: '' };
  }, []);

  // Format price source for display
  const formatPriceSource = useCallback((label: string | undefined | null) => {
    if (!label) return 'NCP';
    const lower = label.toLowerCase();
    if (lower === 'company') return 'NCP';
    if (lower === 'wholesale') return 'ORD';
    return label;
  }, []);

  // --- Sort ---
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // --- View ---
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // --- Bulk select ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [selectedSubmissionDetails, setSelectedSubmissionDetails] = useState<any>(null);
  const [submissionToDelete, setSubmissionToDelete] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportData, setExportData] = useState<any[]>([]);

  // Listen for search from header
  useEffect(() => {
    const handleGlobalSearch = (e: any) => setSearch(e.detail ?? '');
    window.addEventListener('global-search', handleGlobalSearch);
    return () => window.removeEventListener('global-search', handleGlobalSearch);
  }, []);

  // Unique channels from data
  const channels = useMemo(() => {
    const set = new Set<string>();
    submissions.forEach(s => { if (s.channel_label) set.add(s.channel_label); });
    return Array.from(set).sort();
  }, [submissions]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    submissions.forEach(s => { if (s.category_label) set.add(s.category_label); });
    return Array.from(set).sort();
  }, [submissions]);

  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    submissions.forEach(s => {
      // If categories are selected, filter by category
      if (categoryFilters.length === 0 || categoryFilters.includes(s.category_label)) {
        if (s.brand_label) {
          const { shortBrand } = parseBrandAndSku(s.brand_label);
          if (shortBrand) set.add(shortBrand);
        }
      }
    });
    return Array.from(set).sort();
  }, [submissions, categoryFilters, parseBrandAndSku]);

  const availableSkus = useMemo(() => {
    const set = new Set<string>();
    submissions.forEach(s => {
      const matchCat = categoryFilters.length === 0 || categoryFilters.includes(s.category_label);
      if (!matchCat) return;
      
      const { shortBrand, sku } = parseBrandAndSku(s.brand_label);
      const matchBrand = brandFilters.length === 0 || brandFilters.includes(shortBrand);
      
      if (matchBrand && sku) {
        set.add(sku);
      }
    });
    return Array.from(set).sort();
  }, [submissions, categoryFilters, brandFilters, parseBrandAndSku]);

  const availablePriceSources = useMemo(() => {
    const set = new Set<string>();
    submissions.forEach(s => {
      set.add(formatPriceSource(s.price_source_label));
    });
    return Array.from(set).sort();
  }, [submissions, formatPriceSource]);

  // --- Filter + Sort ---
  const filteredSubmissions = useMemo(() => {
    let result = submissions.filter(sub => {
      const sl = search.toLowerCase();
      const matchSearch = !sl || [sub.submitted_by, sub.brand_label, sub.province_label, sub.district_label, sub.channel_label, sub.dealer_label]
        .some(v => v?.toLowerCase().includes(sl));
      
      const matchCategory = categoryFilters.length === 0 || categoryFilters.includes(sub.category_label);
      
      const { shortBrand, sku } = parseBrandAndSku(sub.brand_label);
      const matchBrand = brandFilters.length === 0 || brandFilters.includes(shortBrand);
      const matchSku = skuFilters.length === 0 || skuFilters.includes(sku);
      
      const formattedPS = formatPriceSource(sub.price_source_label);
      const matchPriceSource = priceSourceFilters.length === 0 || priceSourceFilters.includes(formattedPS);

      const matchProvince = provinceFilters.length === 0 || provinceFilters.includes(sub.province_code);
      const matchChannel = channelFilters.length === 0 || channelFilters.includes(sub.channel_label);

      const dateStr = getPhnomPenhDateStr(sub.created_at);
      const matchFrom = !dateFrom || dateStr >= dateFrom;
      const matchTo = !dateTo || dateStr <= dateTo;

      const matchPhotos = !onlyWithPhotos || !!sub.photo_url;
      const matchNotes = !onlyWithNotes || !!sub.note;

      return matchSearch && matchCategory && matchBrand && matchSku && matchPriceSource && matchProvince && matchChannel && matchFrom && matchTo && matchPhotos && matchNotes;
    });

    // Sort
    result = [...result].sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case 'date':
          av = new Date(a.phnom_penh_time || a.created_at).getTime();
          bv = new Date(b.phnom_penh_time || b.created_at).getTime();
          break;
        case 'brand': av = a.brand_label || ''; bv = b.brand_label || ''; break;
        case 'submitter': av = a.submitted_by || ''; bv = b.submitted_by || ''; break;
        case 'province': av = a.province_label || ''; bv = b.province_label || ''; break;
        case 'net_price': av = Number(a.net_price) || 0; bv = Number(b.net_price) || 0; break;
        case 'basic_price': av = Number(a.basic_price) || 0; bv = Number(b.basic_price) || 0; break;
        default: av = 0; bv = 0;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [submissions, search, categoryFilters, brandFilters, skuFilters, priceSourceFilters, provinceFilters, channelFilters, dateFrom, dateTo, onlyWithPhotos, onlyWithNotes, sortKey, sortDir, parseBrandAndSku, formatPriceSource]);

  useEffect(() => { setCurrentPage(1); setSelectedIds(new Set()); }, [search, categoryFilters, brandFilters, skuFilters, priceSourceFilters, provinceFilters, channelFilters, dateFrom, dateTo, onlyWithPhotos, onlyWithNotes]);

  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const paginatedSubmissions = filteredSubmissions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Price stats for anomaly detection
  const priceStats = useMemo(() => {
    const prices = filteredSubmissions.map(s => Number(s.net_price)).filter(p => p > 0);
    if (!prices.length) return { avg: 0, min: 0, max: 0, stdDev: 0 };
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const stdDev = Math.sqrt(prices.reduce((acc, p) => acc + Math.pow(p - avg, 2), 0) / prices.length);
    return { avg, min: Math.min(...prices), max: Math.max(...prices), stdDev };
  }, [filteredSubmissions]);

  const isPriceAnomaly = (price: number) => {
    if (!price || priceStats.stdDev === 0) return false;
    return Math.abs(price - priceStats.avg) > 2 * priceStats.stdDev;
  };

  // --- Quick Stats ---
  const stats = useMemo(() => {
    // Current time in Phnom Penh
    const now = new Date();
    const todayStr = getPhnomPenhDateStr(now);
    
    // Yesterday in Phnom Penh
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = getPhnomPenhDateStr(yesterday);

    const todayCount = filteredSubmissions.filter(s => getPhnomPenhDateStr(s.created_at) === todayStr).length;
    const withPhotos = filteredSubmissions.filter(s => s.photo_url).length;
    const withNotes = filteredSubmissions.filter(s => s.note).length;
    const avgPrice = priceStats.avg;

    // vs yesterday
    const yesterdayCount = submissions.filter(s => getPhnomPenhDateStr(s.created_at) === yesterdayStr).length;
    const todayGrowth = yesterdayCount > 0 ? ((todayCount - yesterdayCount) / yesterdayCount * 100).toFixed(0) : null;

    return { total: filteredSubmissions.length, todayCount, withPhotos, withNotes, avgPrice, todayGrowth, yesterdayCount };
  }, [filteredSubmissions, submissions, priceStats]);

  const activeFilterCount = categoryFilters.length + brandFilters.length + skuFilters.length + priceSourceFilters.length + provinceFilters.length + channelFilters.length + (dateFrom || dateTo ? 1 : 0) + (search ? 1 : 0) + (onlyWithPhotos ? 1 : 0) + (onlyWithNotes ? 1 : 0);

  const clearFilters = () => {
    setSearch(''); setCategoryFilters([]); setBrandFilters([]); 
    setSkuFilters([]); setPriceSourceFilters([]); setProvinceFilters([]);
    setChannelFilters([]); setDateFrom(''); setDateTo('');
    setOnlyWithPhotos(false); setOnlyWithNotes(false);
  };

  // --- Sort handler ---
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300 inline ml-1" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-[#E41E26] inline ml-1" />
      : <ChevronDown className="w-3.5 h-3.5 text-[#E41E26] inline ml-1" />;
  };

  // --- Bulk select ---
  const pageIds = paginatedSubmissions.map(s => s.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds(prev => { const n = new Set(prev); pageIds.forEach(id => n.delete(id)); return n; });
    } else {
      setSelectedIds(prev => { const n = new Set(prev); pageIds.forEach(id => n.add(id)); return n; });
    }
  };
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // Bulk delete
  const confirmBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    setBulkDeleteConfirm(false);
    for (const id of ids) {
      setIsDeleting(id);
      try { 
        await fetch(`/api/submissions/${id}`, { method: 'DELETE' }); 
        window.dispatchEvent(new CustomEvent('app-notification', { 
          detail: {
            id: `del-${id}`,
            title: 'Submission Deleted',
            message: 'A submission was deleted',
            time: new Date().toISOString(),
            type: 'delete',
            unread: true
          }
        }));
        window.dispatchEvent(new CustomEvent('submission-deleted', { detail: { id } }));
      } catch {}
    }
    setSubmissions(prev => prev.filter(s => !ids.includes(s.id)));
    setSelectedIds(new Set());
    setIsDeleting(null);
  };

  // Export
  const triggerExport = (idsToExport?: string[]) => {
    const data = idsToExport
      ? filteredSubmissions.filter(s => idsToExport.includes(s.id))
      : filteredSubmissions;
    setExportData(data);
    setIsExportModalOpen(true);
  };

  const openPhotos = (urlsString: string) => {
    if (!urlsString) return;
    setSelectedPhotos(urlsString.split(','));
    setIsPhotoModalOpen(true);
  };

  const confirmDelete = async (id: string) => {
    setIsDeleting(id); setSubmissionToDelete(null);
    try {
      const res = await fetch(`/api/submissions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSubmissions(prev => prev.filter(s => s.id !== id));
        window.dispatchEvent(new CustomEvent('app-notification', { 
          detail: {
            id: `del-${id}`,
            title: 'Submission Deleted',
            message: 'A submission was deleted',
            time: new Date().toISOString(),
            type: 'delete',
            unread: true
          }
        }));
        window.dispatchEvent(new CustomEvent('submission-deleted', { detail: { id } }));
      }
    } catch {}
    setIsDeleting(null);
  };

  // ===========================
  // RENDER
  // ===========================
  return (
    <div className="space-y-5">

      {/* KPI Cards — matching Dashboard style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total */}
        <div className="rounded-[16px] bg-white dark:bg-[#111C44] shadow-horizon border-l-[4px] border-blue-600 p-4 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">
              {activeFilterCount > 0 ? 'Filtered Records' : translate('totalRecords')}
            </p>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h4 className="text-3xl font-extrabold text-navy dark:text-white mb-1">{stats.total.toLocaleString()}</h4>
          <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400">
            {activeFilterCount > 0
              ? <span className="text-blue-600 font-bold">{activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</span>
              : <span>{translate('allSubmissionsInDatabase')}</span>
            }
          </div>
        </div>

        {/* Card 2: Today */}
        <div className="rounded-[16px] bg-white dark:bg-[#111C44] shadow-horizon border-l-[4px] border-green-500 p-4 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">{translate('submittedToday')}</p>
            <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
              <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h4 className="text-3xl font-extrabold text-navy dark:text-white mb-1">{stats.todayCount}</h4>
          <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400">
            {stats.todayGrowth !== null ? (
              <span className={`font-bold flex items-center gap-1 ${Number(stats.todayGrowth) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {Number(stats.todayGrowth) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Number(stats.todayGrowth) >= 0 ? '+' : ''}{stats.todayGrowth}% {translate('vsYesterday')}
              </span>
            ) : (
              <span>{stats.yesterdayCount} {translate('vsYesterday')}</span>
            )}
          </div>
        </div>

        {/* Card 3: With Photos */}
        <div className="rounded-[16px] bg-white dark:bg-[#111C44] shadow-horizon border-l-[4px] border-purple-500 p-4 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">{translate('withPhotos')}</p>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
              <Camera className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <h4 className="text-3xl font-extrabold text-navy dark:text-white mb-1">{stats.withPhotos}</h4>
          <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400">
            <span className="font-bold text-purple-600">
              {stats.total > 0 ? Math.round(stats.withPhotos / stats.total * 100) : 0}%
            </span> &nbsp;{translate('photoCoverageRate')}
          </div>
        </div>

        {/* Card 4: Avg Net Price */}
        <div className="rounded-[16px] bg-white dark:bg-[#111C44] shadow-horizon border-l-[4px] border-[#E41E26] p-4 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">{translate('avgNetPrice')}</p>
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-[#E41E26]" />
            </div>
          </div>
          <h4 className="text-3xl font-extrabold text-navy dark:text-white mb-1">
            {stats.avgPrice > 0 ? `$${stats.avgPrice.toFixed(2)}` : '—'}
          </h4>
          <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400">
            {stats.withNotes > 0 && (
              <span className="text-amber-600 font-bold flex items-center gap-1">
                <StickyNote className="w-3 h-3" /> {stats.withNotes} {translate('recordsHaveNotes')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="rounded-2xl bg-white dark:bg-[#111C44] shadow-horizon p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-navy dark:text-white">
            <Filter className="w-4 h-4 text-[#E41E26]" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-[#E41E26] text-white text-xs font-bold px-2 py-0.5 rounded-full">{activeFilterCount}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-[#E41E26] font-bold hover:underline flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Clear all
              </button>
            )}
            {/* View toggle */}
            <div className="flex bg-[#F4F7FE] dark:bg-[#0B1437] p-1 rounded-xl">
              <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-[#111C44] shadow-sm text-navy dark:text-white' : 'text-gray-400'}`}>
                <TableIcon className="w-3.5 h-3.5" /> Table
              </button>
              <button onClick={() => setViewMode('map')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${viewMode === 'map' ? 'bg-white dark:bg-[#111C44] shadow-sm text-navy dark:text-white' : 'text-gray-400'}`}>
                <MapIcon className="w-3.5 h-3.5" /> Map
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search submitter, brand, location..."
            className="w-full rounded-xl bg-[#F4F7FE] dark:bg-[#0B1437] py-2.5 pl-9 pr-4 text-sm font-medium text-navy dark:text-white outline-none focus:ring-2 focus:ring-[#E41E26]/30 placeholder:text-gray-400"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-3">
          <MultiSelect 
            options={categories}
            selectedValues={categoryFilters}
            onChange={(vals) => {
              setCategoryFilters(vals);
              // Clear dependent filters
              setBrandFilters([]);
              setSkuFilters([]);
            }}
            placeholder="All Categories"
          />
          <MultiSelect 
            options={availableBrands}
            selectedValues={brandFilters}
            onChange={(vals) => {
              setBrandFilters(vals);
              // Clear dependent filters
              setSkuFilters([]);
            }}
            placeholder="All Brands"
          />
          <MultiSelect 
            options={availableSkus}
            selectedValues={skuFilters}
            onChange={setSkuFilters}
            placeholder="All SKUs"
          />
          <MultiSelect 
            options={availablePriceSources}
            selectedValues={priceSourceFilters}
            onChange={setPriceSourceFilters}
            placeholder="All NCP/ORD"
          />
          <MultiSelect 
            options={provinces.map(p => p.label)}
            selectedValues={provinceFilters}
            onChange={(labels) => {
              // Convert labels to codes
              const codes = labels.map(l => provinces.find(p => p.label === l)?.code || l);
              setProvinceFilters(codes);
            }}
            placeholder="All Provinces"
          />
          <MultiSelect 
            options={channels}
            selectedValues={channelFilters}
            onChange={setChannelFilters}
            placeholder="All Channels"
          />
        </div>

        {/* Row 2: date range + toggles */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-navy dark:text-white">Date Range:</span>
            <div className="flex items-center gap-2">
              <input type="date" className="rounded-xl bg-[#F4F7FE] dark:bg-[#0B1437] py-2.5 px-4 text-sm font-medium text-navy dark:text-white outline-none focus:ring-2 focus:ring-[#E41E26]/30 cursor-pointer" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span className="text-gray-400 font-medium text-sm">to</span>
              <input type="date" className="rounded-xl bg-[#F4F7FE] dark:bg-[#0B1437] py-2.5 px-4 text-sm font-medium text-navy dark:text-white outline-none focus:ring-2 focus:ring-[#E41E26]/30 cursor-pointer" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setOnlyWithPhotos(v => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border transition-colors ${onlyWithPhotos ? 'bg-purple-600 text-white border-purple-600' : 'bg-white dark:bg-[#0B1437] text-gray-500 border-gray-200 dark:border-gray-700 hover:border-purple-400'}`}
            >
              <Camera className="w-3.5 h-3.5" /> Has Photo
            </button>
            <button
              onClick={() => setOnlyWithNotes(v => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border transition-colors ${onlyWithNotes ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-[#0B1437] text-gray-500 border-gray-200 dark:border-gray-700 hover:border-amber-400'}`}
            >
              <StickyNote className="w-3.5 h-3.5" /> Has Note
            </button>
          </div>
        </div>

        {/* Active filter tags + result count */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            {categoryFilters.map(v => <span key={v} className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">{v}<button onClick={() => setCategoryFilters(prev => prev.filter(x => x !== v))}><X className="w-3 h-3" /></button></span>)}
            {brandFilters.map(v => <span key={v} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">{v}<button onClick={() => setBrandFilters(prev => prev.filter(x => x !== v))}><X className="w-3 h-3" /></button></span>)}
            {skuFilters.map(v => <span key={v} className="text-xs bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">{v}<button onClick={() => setSkuFilters(prev => prev.filter(x => x !== v))}><X className="w-3 h-3" /></button></span>)}
            {priceSourceFilters.map(v => <span key={v} className="text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">{v}<button onClick={() => setPriceSourceFilters(prev => prev.filter(x => x !== v))}><X className="w-3 h-3" /></button></span>)}
            {provinceFilters.map(v => <span key={v} className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">{provinces.find(p => p.code === v)?.label || v}<button onClick={() => setProvinceFilters(prev => prev.filter(x => x !== v))}><X className="w-3 h-3" /></button></span>)}
            {channelFilters.map(v => <span key={v} className="text-xs bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">{v}<button onClick={() => setChannelFilters(prev => prev.filter(x => x !== v))}><X className="w-3 h-3" /></button></span>)}
            {(dateFrom || dateTo) && <span className="text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">{dateFrom || '…'} → {dateTo || '…'}<button onClick={() => { setDateFrom(''); setDateTo(''); }}><X className="w-3 h-3" /></button></span>}
            {search && <span className="text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">"{search}"<button onClick={() => setSearch('')}><X className="w-3 h-3" /></button></span>}
            <span className="text-xs text-gray-400 ml-auto font-medium">{filteredSubmissions.length} of {submissions.length} records</span>
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {someSelected && (
        <div className="rounded-2xl bg-navy dark:bg-[#0B1437] px-5 py-3 flex items-center justify-between shadow-lg">
          <p className="text-sm font-bold text-white">{selectedIds.size} row{selectedIds.size > 1 ? 's' : ''} selected</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => triggerExport(Array.from(selectedIds))}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2 transition"
            >
              <Download className="w-3.5 h-3.5" /> Export Selected
            </button>
            <button
              onClick={() => setBulkDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="text-white/60 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Export All Button */}
      {!someSelected && (
        <div className="flex justify-end">
          <button
            onClick={() => triggerExport()}
            className="inline-flex items-center gap-2 rounded-full bg-[#E41E26] py-2.5 px-5 text-sm font-bold text-white hover:bg-[#C21820] transition shadow-sm shadow-red-500/20"
          >
            <Download className="w-4 h-4" /> Export
            {activeFilterCount > 0 && <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs">{filteredSubmissions.length}</span>}
          </button>
        </div>
      )}

      {/* Table / Map */}
      {viewMode === 'table' ? (
        <div className="rounded-2xl bg-white dark:bg-[#111C44] shadow-horizon overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-[#F4F7FE]/60 dark:bg-[#0B1437]/60">
                  <th className="py-3 px-4 w-10">
                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-[#E41E26] transition">
                      {allPageSelected ? <CheckSquare className="w-4 h-4 text-[#E41E26]" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="py-3 px-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider w-10">#</th>
                  <th className="py-3 px-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider min-w-[90px] cursor-pointer select-none hover:text-navy dark:hover:text-white transition" onClick={() => handleSort('date')}>
                    Date <SortIcon col="date" />
                  </th>
                  <th className="py-3 px-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider min-w-[120px]">
                    Category/Ch.
                  </th>
                  <th className="py-3 px-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider min-w-[140px] cursor-pointer select-none hover:text-navy dark:hover:text-white transition" onClick={() => handleSort('brand')}>
                    Brand/SKU <SortIcon col="brand" />
                  </th>
                  <th className="py-3 px-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider min-w-[100px] cursor-pointer select-none hover:text-navy dark:hover:text-white transition">
                    Pricing
                  </th>
                  <th className="py-3 px-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider min-w-[100px]">Promo</th>
                  <th className="py-3 px-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider min-w-[120px]">Sellout</th>
                  <th className="py-3 px-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider min-w-[140px] cursor-pointer select-none hover:text-navy dark:hover:text-white transition" onClick={() => handleSort('province')}>
                    Details <SortIcon col="province" />
                  </th>
                  <th className="py-3 px-2 text-center font-bold text-gray-500 text-xs w-12 uppercase tracking-wider">Media</th>
                  <th className="py-3 px-2 text-center font-bold text-gray-500 text-xs w-12 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSubmissions.length > 0 ? paginatedSubmissions.map((sub, key) => {
                  const dateObj = new Date(sub.created_at);
                  const photoCount = sub.photo_url ? sub.photo_url.split(',').length : 0;
                  const isSelected = selectedIds.has(sub.id);

                  const formatPriceSource = (label: string | undefined | null) => {
                    if (!label) return 'NCP';
                    const lower = label.toLowerCase();
                    if (lower === 'company') return 'NCP';
                    if (lower === 'wholesale') return 'ORD';
                    return label;
                  };
                  
                  const parseScheme = (schemeString: string) => {
                    if (!schemeString) return { scheme: '—', foc: '—' };
                    const plusMatch = schemeString.match(/^(\d+)\s*\+\s*(\d+)$/);
                    if (plusMatch) return { scheme: plusMatch[1], foc: plusMatch[2] };
                    return { scheme: schemeString, foc: '—' };
                  };

                  const parseBrandAndSku = (fullBrandLabel: string) => {
                    if (!fullBrandLabel) return { shortBrand: '—', sku: '—' };
                    const parts = fullBrandLabel.trim().split(' ');
                    if (parts.length >= 3) {
                      return {
                        shortBrand: parts.slice(0, -2).join(' '),
                        sku: parts.slice(-2).join(' ')
                      };
                    }
                    return { shortBrand: fullBrandLabel, sku: '—' };
                  };

                  const { shortBrand, sku } = parseBrandAndSku(sub.brand_label);
                  const { scheme, foc } = parseScheme(sub.scheme);
                  const source = formatPriceSource(sub.price_source_label);

                  let computedNetPrice = sub.net_price;
                  if (!computedNetPrice && sub.basic_price && scheme !== '—' && foc !== '—') {
                    const s = Number(scheme);
                    const f = Number(foc);
                    if (s > 0 && f > 0) {
                      computedNetPrice = ((Number(sub.basic_price) * s) / (s + f)).toFixed(2);
                    } else {
                      computedNetPrice = sub.basic_price;
                    }
                  } else if (!computedNetPrice && sub.basic_price) {
                    computedNetPrice = sub.basic_price;
                  }

                  const isAnomaly = isPriceAnomaly(Number(computedNetPrice));

                  return (
                    <tr
                      key={sub.id}
                      onClick={() => setSelectedSubmissionDetails(sub)}
                      className={`transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-gray-50/50 dark:hover:bg-[#0B1437]/50'} ${key < paginatedSubmissions.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''}`}
                    >
                      <td className="py-3 px-4 w-10">
                        <button onClick={(e) => { e.stopPropagation(); toggleSelect(sub.id); }} className="text-gray-400 hover:text-[#E41E26] transition">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-[#E41E26]" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-xs font-bold text-gray-300 dark:text-gray-600">{(currentPage - 1) * itemsPerPage + key + 1}</td>
                      <td className="py-3 px-3">
                        <p className="text-sm font-bold text-navy dark:text-white whitespace-nowrap">{dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Phnom_Penh' })}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">{dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Phnom_Penh' })}</p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="text-sm font-bold text-navy dark:text-white leading-tight">{sub.category_label || '—'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{sub.channel_label || '—'}</p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="text-sm font-bold text-navy dark:text-white leading-tight">{shortBrand}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded font-bold">{sku}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${source === 'NCP' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'}`}>{source}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="space-y-1 min-w-[80px]">
                          <div className="flex items-center justify-between text-[11px] bg-gray-50 dark:bg-[#0B1437] px-1.5 py-0.5 rounded">
                            <span className="text-gray-400">In</span>
                            <span className="font-bold text-navy dark:text-white">${sub.basic_price || '—'}</span>
                          </div>
                          <div className={`flex items-center justify-between text-[11px] px-1.5 py-0.5 rounded ${isAnomaly ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-[#0B1437]'}`}>
                            <span className="text-gray-400">Net</span>
                            <span className={`font-bold flex items-center gap-1 ${isAnomaly ? 'text-red-600 dark:text-red-400' : 'text-[#E41E26]'}`}>
                              {isAnomaly && <AlertCircle className="w-2.5 h-2.5" />}
                              ${computedNetPrice || '—'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="space-y-1 min-w-[70px]">
                          <div className="flex items-center justify-between text-[11px] bg-gray-50 dark:bg-[#0B1437] px-1.5 py-0.5 rounded">
                            <span className="text-gray-400">Schm</span>
                            <span className="font-bold text-navy dark:text-white">{scheme}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] bg-gray-50 dark:bg-[#0B1437] px-1.5 py-0.5 rounded">
                            <span className="text-gray-400">FOC</span>
                            <span className="font-bold text-navy dark:text-white">{foc}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="space-y-1 min-w-[90px]">
                          <div className="flex items-center justify-between text-[11px] bg-gray-50 dark:bg-[#0B1437] px-1.5 py-0.5 rounded" title="Sellout to Seller">
                            <span className="text-gray-400 text-[10px]">W/S(Ctn)</span>
                            <span className="font-bold text-navy dark:text-white">{sub.sellout_price_seller ? `$${sub.sellout_price_seller}` : '—'}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] bg-gray-50 dark:bg-[#0B1437] px-1.5 py-0.5 rounded" title="Consumer Price">
                            <span className="text-gray-400 text-[10px]">Cons(Ctn)</span>
                            <span className="font-bold text-navy dark:text-white">{sub.sellout_price_consumer ? `$${sub.sellout_price_consumer}` : '—'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 truncate max-w-[120px]" title={sub.submitted_by}>
                            <p className="text-[11px] font-bold text-navy dark:text-white truncate">{sub.submitted_by}</p>
                            {sub.note && <StickyNote className="w-2.5 h-2.5 text-amber-500 shrink-0" title="Has Note" />}
                          </div>
                          <div className="flex items-center gap-1 truncate max-w-[120px]" title={`${sub.district_label}, ${sub.province_label}`}>
                            <MapPin className="w-2.5 h-2.5 text-gray-400 shrink-0" />
                            <p className="text-[10px] text-gray-400 truncate">{sub.district_label || sub.province_label}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {photoCount > 0 ? (
                          <button onClick={(e) => { e.stopPropagation(); openPhotos(sub.photo_url); }} className="relative inline-flex p-2 rounded-xl bg-[#F4F7FE] dark:bg-[#0B1437] text-[#E41E26] hover:bg-red-50 dark:hover:bg-red-900/20 transition" title={`${photoCount} photo(s)`}>
                            <ImageIcon className="w-4 h-4" />
                            {photoCount > 1 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-[#111C44]">{photoCount}</span>}
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-300 font-bold">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSubmissionToDelete(sub.id); }}
                            disabled={isDeleting === sub.id}
                            className={`p-1.5 rounded-lg transition ${isDeleting === sub.id ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                            title="Delete"
                          >
                            {isDeleting === sub.id ? <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={10} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <Search className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                        </div>
                        <p className="text-gray-400 font-semibold text-sm">No submissions found</p>
                        {activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-[#E41E26] font-bold hover:underline">Clear all filters</button>}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 px-5 py-3">
              <p className="text-sm text-gray-400">
                <span className="font-bold text-navy dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span>–<span className="font-bold text-navy dark:text-white">{Math.min(currentPage * itemsPerPage, filteredSubmissions.length)}</span> of <span className="font-bold text-navy dark:text-white">{filteredSubmissions.length}</span>
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition font-bold">«</button>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium">← Prev</button>
                <span className="px-3 py-1.5 text-sm font-bold text-navy dark:text-white">{currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium">Next →</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition font-bold">»</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden shadow-horizon border border-gray-100 dark:border-gray-800">
          <AdminMap submissions={filteredSubmissions} />
        </div>
      )}

      {/* Modals */}
      <PhotoModal isOpen={isPhotoModalOpen} onClose={() => setIsPhotoModalOpen(false)} photos={selectedPhotos} />
      <SubmissionDetailsModal isOpen={!!selectedSubmissionDetails} onClose={() => setSelectedSubmissionDetails(null)} submission={selectedSubmissionDetails} />
      <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} data={exportData} />

      {/* Single Delete Confirm */}
      {submissionToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111C44] p-6 shadow-xl border border-gray-100 dark:border-gray-800">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-navy dark:text-white mb-2">Delete Submission</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">This permanently removes the record and any associated photos. This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setSubmissionToDelete(null)} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">Cancel</button>
              <button onClick={() => confirmDelete(submissionToDelete)} className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-500/20 transition">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111C44] p-6 shadow-xl border border-gray-100 dark:border-gray-800">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-navy dark:text-white mb-2">Delete {selectedIds.size} Records</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">You are about to permanently delete <strong>{selectedIds.size} submissions</strong> and their photos. This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setBulkDeleteConfirm(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">Cancel</button>
              <button onClick={confirmBulkDelete} className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-500/20 transition">Delete All {selectedIds.size}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
