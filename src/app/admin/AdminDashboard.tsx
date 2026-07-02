"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
  Map as MapIcon, Activity, Package, UserCircle, Info,
  Users, MapPin as MapPinIcon, Tag, ArrowRight,
  ListFilter, Maximize2, ExternalLink, Calendar, Search, MapPin, X, Trash2, Camera, Download, FileText, Image as ImageIcon
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import PhotoModal from './PhotoModal';
import SubmissionDetailsModal from './SubmissionDetailsModal';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/context/LanguageContext';

const AdminMap = dynamic(() => import('./AdminMap'), { 
  ssr: false,
  loading: () => <div className="bg-gray-100 animate-pulse w-full h-[600px] rounded-xl flex items-center justify-center text-gray-500">Loading Map...</div>
});

// Helper to parse Scheme into Scheme and FOC
// e.g. "50+1" -> Scheme: 50, FOC: 1
// "Buy 10 free 2" -> Scheme: 10, FOC: 2
const parseScheme = (schemeString: string) => {
  if (!schemeString) return { scheme: '', foc: '' };
  
  // Very basic parsing for common "+"" notation
  const plusMatch = schemeString.match(/^(\d+)\s*\+\s*(\d+)$/);
  if (plusMatch) {
    return { scheme: plusMatch[1], foc: plusMatch[2] };
  }

  return { scheme: schemeString, foc: '' };
};

const formatPriceSource = (label: string | undefined | null) => {
  if (!label) return 'NCP';
  const lower = label.toLowerCase();
  if (lower === 'company') return 'NCP';
  if (lower === 'wholesale') return 'ORD';
  return label;
};

const getPhnomPenhDateStr = (dateVal: string | Date | undefined) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Phnom_Penh' }).format(d);
};

export default function AdminDashboard({ 
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
  
  // Filters
  const [search, setSearch] = useState('');

  // Handle local search change and sync with Header
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    window.dispatchEvent(new CustomEvent('dashboard-search', { detail: val }));
  };

  // Listen for search changes from Header
  useEffect(() => {
    const handleGlobalSearch = (e: any) => {
      if (e.detail !== search) setSearch(e.detail);
    };
    window.addEventListener('global-search', handleGlobalSearch);
    return () => window.removeEventListener('global-search', handleGlobalSearch);
  }, [search]);

  // Listen for opening submission details from Notifications
  useEffect(() => {
    const handleOpenDetails = (e: any) => {
      setSelectedSubmissionDetails(e.detail);
    };
    window.addEventListener('open-submission-details', handleOpenDetails);
    return () => window.removeEventListener('open-submission-details', handleOpenDetails);
  }, []);

  // Polling for new submissions
  useEffect(() => {
    const seenIds = new Set(initialSubmissions.map((s: any) => s.id));

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/submissions', { cache: 'no-store' });
        const data = await res.json();
        if (data && Array.isArray(data)) {
          const newSubs = data.filter(d => !seenIds.has(d.id));
          
          if (newSubs.length > 0) {
            newSubs.forEach(newSub => {
              seenIds.add(newSub.id);
              window.dispatchEvent(new CustomEvent('app-notification', { 
                detail: {
                  id: `new-${newSub.id}`,
                  title: 'New Submission',
                  message: `New tracking submitted by ${newSub.submitted_by}`,
                  time: 'Just now',
                  unread: true,
                  submission: newSub
                }
              }));
            });
            
            setSubmissions(prev => {
              // Ensure we don't duplicate items in state either
              const uniqueNewSubs = newSubs.filter(d => !prev.find(p => p.id === d.id));
              return [...uniqueNewSubs, ...prev];
            });
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 5000); // 5 seconds polling
    return () => clearInterval(interval);
  }, [initialSubmissions]);

  const [brandFilter, setBrandFilter] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [schemeFilter, setSchemeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [priceSourceFilter, setPriceSourceFilter] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');

  // Photo Modal & Details Modal
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [selectedSubmissionDetails, setSelectedSubmissionDetails] = useState<any>(null);
  const [submissionToDelete, setSubmissionToDelete] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter and Search logic
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      const searchLower = search.toLowerCase();
      const matchSearch = searchLower === '' || (
        sub.submitted_by?.toLowerCase().includes(searchLower) ||
        sub.brand_label?.toLowerCase().includes(searchLower) ||
        sub.category_label?.toLowerCase().includes(searchLower) ||
        sub.province_label?.toLowerCase().includes(searchLower) ||
        sub.district_label?.toLowerCase().includes(searchLower) ||
        sub.channel_label?.toLowerCase().includes(searchLower) ||
        sub.sub_channel_label?.toLowerCase().includes(searchLower) ||
        sub.type_label?.toLowerCase().includes(searchLower) ||
        sub.dealer_label?.toLowerCase().includes(searchLower)
      );

      const matchBrand = brandFilter ? (sub.brand_code === brandFilter || sub.brand_label === brandFilter) : true;
      const matchProvince = provinceFilter ? (sub.province_code === provinceFilter || sub.province_label === provinceFilter) : true;
      const matchChannel = channelFilter ? sub.channel_label === channelFilter : true;
      
      const parsedScheme = parseScheme(sub.scheme);
      const schemeText = parsedScheme.scheme?.trim();
      const shortBrand = sub.brand_label ? sub.brand_label.split(' ')[0] : 'Unknown';
      const fullSchemeName = schemeText ? `${schemeText} (${shortBrand})` : '';
      const matchScheme = schemeFilter ? fullSchemeName === schemeFilter : true;
      
      const formattedSource = formatPriceSource(sub.price_source_label);
      const matchPriceSource = priceSourceFilter ? formattedSource === priceSourceFilter : true;
      
      const dateString = String(sub.phnom_penh_time || sub.submission_date || sub.created_at);
      const matchDate = dateFilter ? dateString.startsWith(dateFilter) : true;

      return matchSearch && matchBrand && matchProvince && matchDate && matchChannel && matchScheme && matchPriceSource;
    });
  }, [submissions, search, brandFilter, provinceFilter, dateFilter, channelFilter, schemeFilter, priceSourceFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, brandFilter, provinceFilter, dateFilter, channelFilter, schemeFilter, priceSourceFilter]);

  // Calculate paginated data
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const paginatedSubmissions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSubmissions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSubmissions, currentPage]);

  // Metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const todayStr = getPhnomPenhDateStr(now);
    
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = getPhnomPenhDateStr(yesterday);

    const todayCount = submissions.filter(s => getPhnomPenhDateStr(s.phnom_penh_time || s.created_at) === todayStr).length;
    const yesterdayCount = submissions.filter(s => getPhnomPenhDateStr(s.phnom_penh_time || s.created_at) === yesterdayStr).length;
    
    let todayTrend = 0;
    if (yesterdayCount === 0) {
      todayTrend = todayCount > 0 ? 100 : 0;
    } else {
      todayTrend = ((todayCount - yesterdayCount) / yesterdayCount) * 100;
    }

    const brandCounts: Record<string, number> = {};
    const submitters = new Set<string>();
    const activeProvinces = new Set<string>();

    submissions.forEach(s => {
      if (s.brand_label) {
        brandCounts[s.brand_label] = (brandCounts[s.brand_label] || 0) + 1;
      }
      if (s.submitted_by) submitters.add(s.submitted_by);
      if (s.province_label) activeProvinces.add(s.province_label);
    });

    const activeSubmittersToday = new Set(submissions.filter(s => getPhnomPenhDateStr(s.phnom_penh_time || s.created_at) === todayStr).map(s => s.submitted_by)).size;

    const sortedBrands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]);
    const topBrand = sortedBrands[0]?.[0] || 'N/A';
    const topBrandCount = sortedBrands[0]?.[1] || 0;
    const topBrandPercent = submissions.length > 0 ? Math.round((topBrandCount / submissions.length) * 100) : 0;
    
    const totalBrands = Object.keys(brandCounts).length;

    return {
      total: submissions.length,
      today: todayCount,
      todayTrend: todayTrend > 0 ? `+${todayTrend.toFixed(1)}%` : `${todayTrend.toFixed(1)}%`,
      todayTrendValue: todayTrend,
      topBrand,
      topBrandPercent,
      totalSubmitters: submitters.size,
      activeSubmittersToday,
      totalProvinces: activeProvinces.size,
      trackedBrands: totalBrands
    };
  }, [submissions]);

  // Chart Data: Submissions by Province (Top 5)
  const provinceChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSubmissions.forEach(s => {
      if (s.province_label) {
        counts[s.province_label] = (counts[s.province_label] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredSubmissions]);

  // Chart Data: Average Net Price by Brand (Top 5)
  const brandPriceData = useMemo(() => {
    const sums: Record<string, { total: number, count: number }> = {};
    filteredSubmissions.forEach(s => {
      if (s.brand_label && s.net_price) {
        if (!sums[s.brand_label]) sums[s.brand_label] = { total: 0, count: 0 };
        sums[s.brand_label].total += Number(s.net_price);
        sums[s.brand_label].count += 1;
      }
    });
    return Object.entries(sums)
      .map(([name, data]) => ({ 
        name, 
        avgPrice: Number((data.total / data.count).toFixed(2)) 
      }))
      .sort((a, b) => b.avgPrice - a.avgPrice)
      .slice(0, 5);
  }, [filteredSubmissions]);

  // Chart Data: Weekly Submissions (Last 7 Days)
  const weeklyChartData = useMemo(() => {
    const last7Days = Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
    
    const counts: Record<string, number> = {};
    last7Days.forEach(date => counts[date] = 0);

    filteredSubmissions.forEach(s => {
      const dateStr = getPhnomPenhDateStr(s.phnom_penh_time || s.created_at);
      if (counts[dateStr] !== undefined) {
        counts[dateStr]++;
      }
    });

    return last7Days.map(date => ({
      date: date.substring(5), // e.g. "06-29"
      fullDate: date,
      submissions: counts[date]
    }));
  }, [filteredSubmissions]);

  // Chart Data: Top Schemes
  const schemeChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSubmissions.forEach(s => {
      const parsedScheme = parseScheme(s.scheme);
      const schemeText = parsedScheme.scheme?.trim();
      const shortBrand = s.brand_label ? s.brand_label.split(' ')[0] : 'Unknown';
      if (schemeText) {
        const key = `${schemeText} (${shortBrand})`;
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredSubmissions]);

  // Chart Data: Submissions by Channel
  const channelPieData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSubmissions.forEach(s => {
      const channel = s.channel_label || 'Unknown';
      counts[channel] = (counts[channel] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredSubmissions]);

  // Chart Data: Weekly Price Source Trend (Last 7 Days)
  const weeklyPriceSourceData = useMemo(() => {
    const last7Days = Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
    
    const counts: Record<string, { ncp: number, ord: number }> = {};
    last7Days.forEach(date => counts[date] = { ncp: 0, ord: 0 });

    filteredSubmissions.forEach(s => {
      const dateStr = s.submission_date ? String(s.submission_date).split('T')[0] : '';
      if (counts[dateStr] !== undefined) {
        const source = formatPriceSource(s.price_source_label);
        if (source === 'NCP') counts[dateStr].ncp++;
        else if (source === 'ORD') counts[dateStr].ord++;
      }
    });

    return last7Days.map(date => ({
      date: date.substring(5), // e.g. "06-29"
      fullDate: date,
      ncp: counts[date].ncp,
      ord: counts[date].ord
    }));
  }, [filteredSubmissions]);
  
  // Chart Data: Submissions by NCP vs ORD
  const ncpOrdPieData = useMemo(() => {
    const counts: Record<string, number> = { NCP: 0, ORD: 0 };
    filteredSubmissions.forEach(s => {
      const source = formatPriceSource(s.price_source_label);
      if (source === 'NCP') counts['NCP']++;
      else if (source === 'ORD') counts['ORD']++;
    });
    return [
      { name: 'NCP', value: counts['NCP'] },
      { name: 'ORD', value: counts['ORD'] }
    ].filter(item => item.value > 0);
  }, [filteredSubmissions]);

  const PIE_COLORS = ['#E41E26', '#00B5D8', '#FFB547', '#4318FF', '#05CD99'];

  const stableChannels = useMemo(() => {
    const counts: Record<string, number> = {};
    submissions.forEach(s => {
      const channel = s.channel_label || 'Unknown';
      counts[channel] = (counts[channel] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
  }, [submissions]);

  const stablePriceSources = useMemo(() => {
    const counts: Record<string, number> = {};
    submissions.forEach(s => {
      const source = formatPriceSource(s.price_source_label);
      counts[source] = (counts[source] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
  }, [submissions]);

  const getChannelColor = (channel: string) => {
    const idx = stableChannels.indexOf(channel);
    return PIE_COLORS[Math.max(0, idx) % PIE_COLORS.length];
  };

  const getPriceSourceColor = (source: string) => {
    const idx = stablePriceSources.indexOf(source);
    return PIE_COLORS[(Math.max(0, idx) + 2) % PIE_COLORS.length]; // Offset by 2 for different shades
  };

  const confirmDelete = async (id: string) => {
    setIsDeleting(id);
    setSubmissionToDelete(null);
    try {
      const response = await fetch(`/api/submissions/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || errData?.details || 'Failed to delete from server');
      }
      
      const deletedSub = submissions.find(s => s.id === id);
      
      setSubmissions(prev => prev.filter(sub => sub.id !== id));
      
      window.dispatchEvent(new CustomEvent('app-notification', { 
        detail: {
          id: `del-${id}`,
          title: 'Submission Deleted',
          message: deletedSub ? `Deleted submission by ${deletedSub.submitted_by}` : 'A submission was deleted',
          time: 'Just now',
          unread: true,
          submission: deletedSub
        }
      }));
    } catch (err: any) {
      alert('Delete error: ' + err.message);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleExportExcel = () => {
    if (filteredSubmissions.length === 0) return;
    
    const headers = [
      'Date', 'Chanel', 'Category', 'Brand', 'SKUs', 'NCP/ORD', 
      'Basic price', 'Price In', 'Scheme', 'FOC', 'Discount', 
      'Price after promotion', 'Enconsumer', 'W/S-Sell Per Carton', 
      'Remark', 'Other'
    ];

    const excelData: any[][] = [
      ['Weekly Market Price Update'],
      headers
    ];

    filteredSubmissions.forEach(sub => {
      const date = sub.phnom_penh_time 
        ? new Date(sub.phnom_penh_time) 
        : new Date(sub.created_at);
        
      const parsedScheme = parseScheme(sub.scheme);
      
      excelData.push([
        date.toLocaleDateString(),           // Date
        sub.channel_label || '',             // Chanel
        sub.category_label || '',            // Category
        sub.brand_label || '',               // Brand
        sub.type_label || '',                // SKUs
        sub.price_source_label || 'NCP',     // NCP/ORD
        sub.basic_price || '',               // Basic price
        sub.basic_price || '',               // Price In
        parsedScheme.scheme,                 // Scheme
        parsedScheme.foc,                    // FOC
        '',                                  // Discount
        sub.net_price || '',                 // Price after promotion
        sub.sellout_price_consumer || '',    // Enconsumer
        sub.sellout_price_seller || '',      // W/S-Sell Per Carton
        sub.note || '',                      // Remark
        `${sub.submitted_by || ''} - ${sub.province_label || ''}, ${sub.district_label || ''}` // Other
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // Merge title
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } });

    // Set column widths
    ws['!cols'] = headers.map((h, i) => {
      if (h === 'Brand') return { wch: 25 };
      if (h === 'Remark' || h === 'Other') return { wch: 30 };
      return { wch: 15 };
    });

    // Add Styles
    for (let R = 0; R < excelData.length; ++R) {
      for (let C = 0; C < headers.length; ++C) {
        const cell_address = {c: C, r: R};
        const cell_ref = XLSX.utils.encode_cell(cell_address);
        if (!ws[cell_ref]) ws[cell_ref] = { t: 's', v: '' }; // Fallback

        if (R === 0) {
          // Title
          ws[cell_ref].s = {
            font: { name: 'Arial', sz: 14, bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "002060" } },
            alignment: { vertical: "center", horizontal: "center" }
          };
        } else if (R === 1) {
          // Headers
          ws[cell_ref].s = {
            font: { name: 'Arial', sz: 10, bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "002060" } },
            alignment: { vertical: "center", horizontal: "center" },
            border: {
              top: { style: 'thin', color: { rgb: "FFFFFF" } },
              bottom: { style: 'thin', color: { rgb: "FFFFFF" } },
              left: { style: 'thin', color: { rgb: "FFFFFF" } },
              right: { style: 'thin', color: { rgb: "FFFFFF" } }
            }
          };
        } else {
          // Data
          const isEven = R % 2 === 0;
          ws[cell_ref].s = {
            font: { name: 'Arial', sz: 10 },
            fill: { fgColor: { rgb: isEven ? "FFF2CC" : "D9E1F2" } },
            alignment: { vertical: "center", horizontal: "center" },
            border: {
              top: { style: 'thin', color: { rgb: "B4C6E7" } },
              bottom: { style: 'thin', color: { rgb: "B4C6E7" } },
              left: { style: 'thin', color: { rgb: "B4C6E7" } },
              right: { style: 'thin', color: { rgb: "B4C6E7" } }
            }
          };
        }
      }
    }

    XLSX.writeFile(wb, `MI_Price_Update_Dashboard_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const openPhotos = (urlsString: string) => {
    if (!urlsString) return;
    setSelectedPhotos(urlsString.split(','));
    setIsPhotoModalOpen(true);
  };

  return (
    <div className="space-y-6">


      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 md:gap-6 2xl:gap-7.5">
        
        {/* Card 1: Total Submissions (Blue) */}
        <div className="rounded-[16px] bg-white dark:bg-[#111C44] shadow-horizon border-l-[4px] border-blue-600 p-4 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">{translate('totalSubmissions')}</p>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h4 className="text-3xl font-extrabold text-navy dark:text-white mb-1">
            {metrics.total.toLocaleString()}
          </h4>
          <div className="flex items-center text-xs font-medium">
            <span className="text-gray-500 dark:text-gray-400">{translate('acrossActiveProvinces')} <span className="font-bold text-navy dark:text-white">{metrics.totalProvinces}</span></span>
          </div>
        </div>

        {/* Card 2: Submitted Today (Green) */}
        <div className="rounded-[16px] bg-white dark:bg-[#111C44] shadow-horizon border-l-[4px] border-teal-500 p-4 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">{translate('submittedToday')}</p>
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
              <Package className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
          </div>
          <h4 className="text-3xl font-extrabold text-navy dark:text-white mb-1">
            {metrics.today.toLocaleString()}
          </h4>
          <div className="flex items-center text-xs font-medium">
            <span className={metrics.todayTrendValue >= 0 ? "text-green-500 font-bold" : "text-red-500 font-bold"}>
              {metrics.todayTrend}
            </span>
            <span className="text-gray-500 dark:text-gray-400 ml-1">{translate('vsYesterday')}</span>
          </div>
        </div>

        {/* Card 3: Total Submitters (Orange) */}
        <div className="rounded-[16px] bg-white dark:bg-[#111C44] shadow-horizon border-l-[4px] border-orange-500 p-4 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">{translate('totalSubmitters')}</p>
            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
              <Users className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <h4 className="text-3xl font-extrabold text-navy dark:text-white mb-1">
            {metrics.totalSubmitters.toLocaleString()}
          </h4>
          <div className="flex items-center text-xs font-medium">
            <span className="text-green-500 font-bold">+{metrics.activeSubmittersToday}</span>
            <span className="text-gray-500 dark:text-gray-400 ml-1">{translate('activeUsersToday')}</span>
          </div>
        </div>

        {/* Card 4: Top Tracked Brand (Red) */}
        <div className="rounded-[16px] bg-white dark:bg-[#111C44] shadow-horizon border-l-[4px] border-[#E41E26] p-4 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">{translate('topBrand')}</p>
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
              <Tag className="w-4 h-4 text-[#E41E26]" />
            </div>
          </div>
          <h4 className="text-2xl font-extrabold text-navy dark:text-white mb-1 line-clamp-2" title={metrics.topBrand}>
            {metrics.topBrand}
          </h4>
          <div className="flex items-center text-xs font-medium">
            <span className="text-red-500 font-bold">{metrics.topBrandPercent}%</span>
            <span className="text-gray-500 dark:text-gray-400 ml-1">{translate('ofAllTracking')}</span>
          </div>
        </div>
      </div>

      {/* Top Charts Row (Line & Pie) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 md:gap-6 2xl:gap-7.5 mb-5 md:mb-6 2xl:mb-7.5">
        
        {/* Weekly Submissions Line Chart (Takes 2 columns) */}
        <div className="rounded-[20px] bg-white dark:bg-[#111C44] p-6 shadow-horizon lg:col-span-2 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-horizon-secondary">{translate('thisWeek')}</p>
              <h3 className="text-2xl font-bold text-navy dark:text-white">{translate('submissionsTrend')}</h3>
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={weeklyChartData} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const selectedDate = e.activePayload[0].payload.fullDate;
                    setDateFilter(prev => prev === selectedDate ? '' : selectedDate);
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A3AED0' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A3AED0' }} />
                <Tooltip 
                  cursor={{ stroke: '#A3AED0', strokeWidth: 1, strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0px 18px 40px rgba(112,144,176,0.12)' }}
                  itemStyle={{ color: '#2B3674', fontWeight: 600 }}
                  labelStyle={{ color: '#A3AED0', fontWeight: 500 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="submissions" 
                  stroke="#E41E26" 
                  strokeWidth={4}
                  dot={{ r: 4, fill: '#E41E26', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#E41E26', strokeWidth: 2, stroke: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Submissions by Channel Pie Chart (Takes 1 column) */}
        <div className="rounded-[20px] bg-white dark:bg-[#111C44] p-6 shadow-horizon min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-navy dark:text-white">{translate('byChannel')}</h3>
            {channelFilter && (
              <button 
                onClick={() => setChannelFilter('')}
                className="text-xs font-bold text-[#E41E26] hover:underline"
              >
                Clear Filter
              </button>
            )}
          </div>
          <div className="h-[250px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  onClick={(data) => { if (data && data.name) setChannelFilter(prev => prev === data.name ? '' : data.name); }}
                  className="cursor-pointer outline-none"
                >
                  {channelPieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getChannelColor(entry.name)} 
                      className="hover:opacity-80 transition-opacity"
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0px 18px 40px rgba(112,144,176,0.12)' }}
                  itemStyle={{ color: '#2B3674', fontWeight: 600 }}
                  labelStyle={{ color: '#A3AED0', fontWeight: 500 }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px', fontWeight: '500', color: '#2B3674', cursor: 'pointer' }}
                  onClick={(e: any) => { if (e && e.value) setChannelFilter(prev => prev === e.value ? '' : e.value); }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Submissions by Price Source Line Chart (Takes 1 column) */}
        <div className="rounded-[20px] bg-white dark:bg-[#111C44] p-6 shadow-horizon min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-navy dark:text-white">{translate('ncpOrdTrend')}</h3>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ncpOrdPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  onClick={(data) => { if (data && data.name) setPriceSourceFilter(prev => prev === data.name ? '' : data.name); }}
                  className="cursor-pointer outline-none"
                >
                  {ncpOrdPieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getPriceSourceColor(entry.name)} 
                      className="hover:opacity-80 transition-opacity"
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0px 18px 40px rgba(112,144,176,0.12)' }}
                  itemStyle={{ color: '#2B3674', fontWeight: 600 }}
                  labelStyle={{ color: '#A3AED0', fontWeight: 500 }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px', fontWeight: '500', color: '#2B3674', cursor: 'pointer' }}
                  onClick={(e: any) => { if (e && e.value) setPriceSourceFilter(prev => prev === e.value ? '' : e.value); }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bar Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6 2xl:gap-7.5">
        
        {/* Chart 1: Submissions by Province */}
        <div className="rounded-[20px] bg-white dark:bg-[#111C44] p-6 shadow-horizon min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-navy dark:text-white">{translate('topProvincesByActivity')}</h3>
            {provinceFilter && (
              <button 
                onClick={() => setProvinceFilter('')}
                className="text-xs font-bold text-[#E41E26] hover:underline"
              >
                Clear Filter
              </button>
            )}
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={provinceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A3AED0' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A3AED0' }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(244, 247, 254, 0.4)' }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0px 18px 40px rgba(112,144,176,0.12)' }}
                  itemStyle={{ color: '#2B3674', fontWeight: 600 }}
                  labelStyle={{ color: '#A3AED0', fontWeight: 500 }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#4318FF" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={40} 
                  onClick={(data) => { if (data && data.name) setProvinceFilter(prev => prev === data.name ? '' : data.name); }}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Average Net Price by Brand */}
        <div className="rounded-[20px] bg-white dark:bg-[#111C44] p-6 shadow-horizon min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-navy dark:text-white">{translate('avgNetPriceByBrand')}</h3>
            {brandFilter && (
              <button 
                onClick={() => setBrandFilter('')}
                className="text-xs font-bold text-[#E41E26] hover:underline"
              >
                Clear Filter
              </button>
            )}
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={brandPriceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A3AED0' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A3AED0' }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(244, 247, 254, 0.4)' }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0px 18px 40px rgba(112,144,176,0.12)' }}
                  itemStyle={{ color: '#2B3674', fontWeight: 600 }}
                  labelStyle={{ color: '#A3AED0', fontWeight: 500 }}
                  formatter={(value) => [`$${value}`, 'Avg Price']}
                />
                <Bar 
                  dataKey="avgPrice" 
                  fill="#00B5D8" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={40} 
                  onClick={(data) => { if (data && data.name) setBrandFilter(prev => prev === data.name ? '' : data.name); }}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Top Schemes */}
        <div className="rounded-[20px] bg-white dark:bg-[#111C44] p-6 shadow-horizon min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-navy dark:text-white">{translate('topSchemes')}</h3>
            {schemeFilter && (
              <button 
                onClick={() => setSchemeFilter('')}
                className="text-xs font-bold text-[#E41E26] hover:underline"
              >
                Clear Filter
              </button>
            )}
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={schemeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A3AED0' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A3AED0' }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(244, 247, 254, 0.4)' }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0px 18px 40px rgba(112,144,176,0.12)' }}
                  itemStyle={{ color: '#2B3674', fontWeight: 600 }}
                  labelStyle={{ color: '#A3AED0', fontWeight: 500 }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#FFB547" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={40} 
                  onClick={(data) => { if (data && data.name) setSchemeFilter(prev => prev === data.name ? '' : data.name); }}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Submissions Preview */}
      <div className="rounded-[20px] bg-white dark:bg-[#111C44] p-6 shadow-horizon">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-navy dark:text-white">Recent Submissions</h3>
          <Link 
            href="/admin/submissions"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#E41E26] hover:text-[#C21820] transition"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {submissions.slice(0, 5).map((sub) => {
            const dateObj = new Date(sub.created_at);
            const timeStr = dateObj.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Phnom_Penh' });
            const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Phnom_Penh' });
            const photoCount = sub.photo_url ? sub.photo_url.split(',').length : 0;
            return (
              <div 
                key={sub.id} 
                className="flex items-center justify-between py-3 gap-4 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-[#0B1437]/50 transition-colors px-2 -mx-2 rounded-xl"
                onClick={() => setSelectedSubmissionDetails(sub)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-navy dark:text-white truncate">{sub.brand_label || sub.brand_code}</p>
                    <p className="text-xs text-gray-400 truncate">{sub.submitted_by} · {sub.province_label || sub.province_code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-8 flex justify-center">
                    {photoCount > 0 && (
                      <div className="relative inline-flex p-2 rounded-xl bg-[#F4F7FE] dark:bg-[#0B1437] text-[#E41E26]" title={`${photoCount} photo(s)`}>
                        <ImageIcon className="w-4 h-4" />
                        {photoCount > 1 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-[#111C44]">{photoCount}</span>}
                      </div>
                    )}
                  </div>
                  <div className="text-right min-w-[70px]">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{dateStr}</p>
                    <p className="text-xs text-gray-400">{timeStr}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Photo Modal */}
      <PhotoModal 
        isOpen={isPhotoModalOpen} 
        onClose={() => setIsPhotoModalOpen(false)} 
        photos={selectedPhotos} 
      />

      <SubmissionDetailsModal
        isOpen={!!selectedSubmissionDetails}
        onClose={() => setSelectedSubmissionDetails(null)}
        submission={selectedSubmissionDetails}
      />
      {/* Delete Confirmation Modal */}
      {submissionToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111C44] p-6 shadow-xl border border-gray-100 dark:border-gray-800">
            <h3 className="text-xl font-bold text-navy dark:text-white mb-2">Delete Submission</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete this submission? This action cannot be undone and will permanently remove associated photos.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSubmissionToDelete(null)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete(submissionToDelete)}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20 transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}




