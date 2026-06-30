"use client";

import { useState, useMemo } from 'react';
import {
  Users, Search, TrendingUp, TrendingDown, Camera, StickyNote,
  MapPin, Tag, Activity, BarChart3, ChevronDown, ChevronUp,
  ChevronsUpDown, X, Star, Award, Clock, CalendarDays,
  FileSpreadsheet, Globe, LayoutGrid, List
} from 'lucide-react';
import * as XLSX from 'xlsx';

type User = {
  name: string;
  totalSubmissions: number;
  lastSubmission: string | null;
  firstSubmission: string | null;
  provinces: string[];
  brands: string[];
  channels: string[];
  photosCount: number;
  notesCount: number;
};

type SortKey = 'name' | 'total' | 'last' | 'photos' | 'provinces' | 'brands';
type SortDir = 'asc' | 'desc';

// Color palette for avatars
const AVATAR_COLORS = [
  'bg-blue-600', 'bg-purple-600', 'bg-green-600', 'bg-amber-500',
  'bg-rose-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-teal-600',
];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const formatDate = (str: string | null) => {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};

const timeAgo = (str: string | null) => {
  if (!str) return '—';
  const diff = Date.now() - new Date(str).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

export default function UsersClient({
  users,
  submissions,
  provinces,
  brands,
}: {
  users: User[];
  submissions: any[];
  provinces: any[];
  brands: any[];
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // KPI Stats
  const stats = useMemo(() => {
    const activeToday = users.filter(u => u.lastSubmission?.startsWith(today)).length;
    const activeYest = users.filter(u => u.lastSubmission?.startsWith(yesterday)).length;
    const topUser = users[0];
    const totalSubmissions = users.reduce((acc, u) => acc + u.totalSubmissions, 0);
    const avgPerUser = users.length > 0 ? (totalSubmissions / users.length).toFixed(1) : '0';
    return { total: users.length, activeToday, activeYest, topUser, totalSubmissions, avgPerUser };
  }, [users, today, yesterday]);

  // Filter + Sort
  const filtered = useMemo(() => {
    let result = users.filter(u =>
      !search || u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.provinces.some(p => p.toLowerCase().includes(search.toLowerCase()))
    );
    result = [...result].sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case 'name': av = a.name; bv = b.name; break;
        case 'total': av = a.totalSubmissions; bv = b.totalSubmissions; break;
        case 'last': av = a.lastSubmission || ''; bv = b.lastSubmission || ''; break;
        case 'photos': av = a.photosCount; bv = b.photosCount; break;
        case 'provinces': av = a.provinces.length; bv = b.provinces.length; break;
        case 'brands': av = a.brands.length; bv = b.brands.length; break;
        default: av = 0; bv = 0;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [users, search, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown className="w-3 h-3 inline ml-1 text-gray-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 inline ml-1 text-[#E41E26]" />
      : <ChevronDown className="w-3 h-3 inline ml-1 text-[#E41E26]" />;
  };

  const handleExport = () => {
    const headers = ['Name', 'Total Submissions', 'Last Active', 'First Submission', 'Provinces Covered', 'Brands Tracked', 'Channels', 'Photos', 'Notes'];
    const rows = filtered.map(u => [
      u.name, u.totalSubmissions,
      formatDate(u.lastSubmission), formatDate(u.firstSubmission),
      u.provinces.join(', '), u.brands.length, u.channels.join(', '),
      u.photosCount, u.notesCount,
    ]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    XLSX.writeFile(wb, `Users_Report_${today}.xlsx`);
  };

  // User detail modal: their submissions
  const userSubmissions = useMemo(() => {
    if (!selectedUser) return [];
    return submissions
      .filter(s => s.submitted_by === selectedUser.name)
      .slice(0, 10);
  }, [selectedUser, submissions]);

  // Activity rank
  const getRank = (user: User) => {
    const idx = users.indexOf(user);
    if (idx === 0) return { label: '🏆 Top Submitter', color: 'text-amber-500' };
    if (idx === 1) return { label: '🥈 2nd Place', color: 'text-gray-400' };
    if (idx === 2) return { label: '🥉 3rd Place', color: 'text-amber-700' };
    const photoRatio = user.totalSubmissions > 0 ? user.photosCount / user.totalSubmissions : 0;
    if (photoRatio > 0.8) return { label: '📸 Photo Pro', color: 'text-purple-500' };
    if (user.provinces.length >= 3) return { label: '🌍 Wide Coverage', color: 'text-blue-500' };
    return null;
  };

  return (
    <div className="space-y-5">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-[16px] bg-white dark:bg-[#111C44] shadow-horizon border-l-[4px] border-blue-600 p-5">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Users</p>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h4 className="text-3xl font-extrabold text-navy dark:text-white mb-2">{stats.total}</h4>
          <p className="text-xs font-medium text-gray-500">Avg <span className="text-blue-600 font-bold">{stats.avgPerUser}</span> submissions each</p>
        </div>

        <div className="rounded-[16px] bg-white dark:bg-[#111C44] shadow-horizon border-l-[4px] border-green-500 p-5">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Active Today</p>
            <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
              <Activity className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h4 className="text-3xl font-extrabold text-navy dark:text-white mb-2">{stats.activeToday}</h4>
          <div className="text-xs font-medium">
            {stats.activeToday > stats.activeYest ? (
              <span className="text-green-600 font-bold flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +{stats.activeToday - stats.activeYest} vs yesterday</span>
            ) : stats.activeToday < stats.activeYest ? (
              <span className="text-red-500 font-bold flex items-center gap-1"><TrendingDown className="w-3 h-3" /> {stats.activeToday - stats.activeYest} vs yesterday</span>
            ) : (
              <span className="text-gray-400">{stats.activeYest} active yesterday</span>
            )}
          </div>
        </div>

        <div className="rounded-[16px] bg-white dark:bg-[#111C44] shadow-horizon border-l-[4px] border-amber-500 p-5">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Top Submitter</p>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
              <Award className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          {stats.topUser ? (
            <>
              <h4 className="text-xl font-extrabold text-navy dark:text-white mb-1 truncate">{stats.topUser.name}</h4>
              <p className="text-xs font-medium text-amber-600 font-bold">{stats.topUser.totalSubmissions} submissions</p>
            </>
          ) : <h4 className="text-2xl font-extrabold text-gray-300">—</h4>}
        </div>

        <div className="rounded-[16px] bg-white dark:bg-[#111C44] shadow-horizon border-l-[4px] border-[#E41E26] p-5">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Submissions</p>
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-[#E41E26]" />
            </div>
          </div>
          <h4 className="text-3xl font-extrabold text-navy dark:text-white mb-2">{stats.totalSubmissions.toLocaleString()}</h4>
          <p className="text-xs font-medium text-gray-500">Across all users</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="rounded-2xl bg-white dark:bg-[#111C44] shadow-horizon p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or province..."
            className="w-full rounded-xl bg-[#F4F7FE] dark:bg-[#0B1437] py-2.5 pl-9 pr-4 text-sm font-medium text-navy dark:text-white outline-none focus:ring-2 focus:ring-[#E41E26]/30 placeholder:text-gray-400"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-[#E41E26] font-bold flex items-center gap-1 hover:underline">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
        <div className="flex bg-[#F4F7FE] dark:bg-[#0B1437] p-1 rounded-xl ml-auto">
          <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-[#111C44] shadow-sm text-navy dark:text-white' : 'text-gray-400'}`}>
            <LayoutGrid className="w-3.5 h-3.5" /> Cards
          </button>
          <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-[#111C44] shadow-sm text-navy dark:text-white' : 'text-gray-400'}`}>
            <List className="w-3.5 h-3.5" /> Table
          </button>
        </div>
        <button onClick={handleExport} className="inline-flex items-center gap-2 rounded-full bg-[#E41E26] py-2.5 px-5 text-sm font-bold text-white hover:bg-[#C21820] transition shadow-sm shadow-red-500/20 shrink-0">
          <FileSpreadsheet className="w-4 h-4" /> Export
        </button>
      </div>

      {/* GRID VIEW */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((user, idx) => {
            const rank = getRank(user);
            const isActiveToday = user.lastSubmission?.startsWith(today);
            const photoRatio = user.totalSubmissions > 0 ? Math.round(user.photosCount / user.totalSubmissions * 100) : 0;

            return (
              <button
                key={user.name}
                onClick={() => setSelectedUser(user)}
                className="text-left rounded-2xl bg-white dark:bg-[#111C44] shadow-horizon border border-gray-100 dark:border-gray-800 p-5 hover:shadow-lg hover:border-[#E41E26]/30 transition-all duration-200 group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl ${getAvatarColor(user.name)} flex items-center justify-center text-white text-lg font-extrabold shadow-sm flex-shrink-0`}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-navy dark:text-white leading-tight group-hover:text-[#E41E26] transition-colors">{user.name}</p>
                      {rank && <p className={`text-xs font-bold ${rank.color} mt-0.5`}>{rank.label}</p>}
                    </div>
                  </div>
                  {isActiveToday && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Active
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-[#F4F7FE] dark:bg-[#0B1437] rounded-xl px-3 py-2 text-center">
                    <p className="text-xl font-extrabold text-navy dark:text-white">{user.totalSubmissions}</p>
                    <p className="text-[10px] text-gray-400 font-medium">Submissions</p>
                  </div>
                  <div className="bg-[#F4F7FE] dark:bg-[#0B1437] rounded-xl px-3 py-2 text-center">
                    <p className="text-xl font-extrabold text-navy dark:text-white">{user.provinces.length}</p>
                    <p className="text-[10px] text-gray-400 font-medium">Provinces</p>
                  </div>
                </div>

                {/* Photo ratio bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><Camera className="w-3 h-3" /> Photo coverage</span>
                    <span className="text-[10px] font-bold text-purple-600">{photoRatio}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all" style={{ width: `${photoRatio}%` }} />
                  </div>
                </div>

                {/* Provinces tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {user.provinces.slice(0, 3).map(p => (
                    <span key={p} className="text-[10px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">{p}</span>
                  ))}
                  {user.provinces.length > 3 && (
                    <span className="text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">+{user.provinces.length - 3}</span>
                  )}
                </div>

                {/* Last active */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {timeAgo(user.lastSubmission)}
                  </span>
                  {user.notesCount > 0 && (
                    <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5">
                      <StickyNote className="w-3 h-3" /> {user.notesCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full py-16 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Users className="w-6 h-6 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-gray-400 font-semibold text-sm">No users found</p>
              {search && <button onClick={() => setSearch('')} className="text-xs text-[#E41E26] font-bold hover:underline">Clear search</button>}
            </div>
          )}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="rounded-2xl bg-white dark:bg-[#111C44] shadow-horizon overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-[#F4F7FE]/60 dark:bg-[#0B1437]/60">
                  <th className="py-3 px-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">#</th>
                  <th className="py-3 px-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-navy dark:hover:text-white transition select-none" onClick={() => handleSort('name')}>
                    User <SortIcon col="name" />
                  </th>
                  <th className="py-3 px-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-navy dark:hover:text-white transition select-none" onClick={() => handleSort('total')}>
                    Submissions <SortIcon col="total" />
                  </th>
                  <th className="py-3 px-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-navy dark:hover:text-white transition select-none" onClick={() => handleSort('provinces')}>
                    Provinces <SortIcon col="provinces" />
                  </th>
                  <th className="py-3 px-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-navy dark:hover:text-white transition select-none" onClick={() => handleSort('brands')}>
                    Brands <SortIcon col="brands" />
                  </th>
                  <th className="py-3 px-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-navy dark:hover:text-white transition select-none" onClick={() => handleSort('photos')}>
                    Photos <SortIcon col="photos" />
                  </th>
                  <th className="py-3 px-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-navy dark:hover:text-white transition select-none" onClick={() => handleSort('last')}>
                    Last Active <SortIcon col="last" />
                  </th>
                  <th className="py-3 px-4 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user, idx) => {
                  const rank = getRank(user);
                  const isActiveToday = user.lastSubmission?.startsWith(today);
                  const photoRatio = user.totalSubmissions > 0 ? Math.round(user.photosCount / user.totalSubmissions * 100) : 0;

                  return (
                    <tr key={user.name} className={`hover:bg-gray-50/50 dark:hover:bg-[#0B1437]/50 transition-colors ${idx < filtered.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''}`}>
                      <td className="py-3 px-4 text-xs font-bold text-gray-300">
                        {idx === 0 ? '🏆' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl ${getAvatarColor(user.name)} flex items-center justify-center text-white text-sm font-extrabold shrink-0`}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-navy dark:text-white">{user.name}</p>
                            {rank && <p className={`text-[10px] font-bold ${rank.color}`}>{rank.label}</p>}
                          </div>
                          {isActiveToday && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Today
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[80px] h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                              style={{ width: `${Math.min(100, (user.totalSubmissions / (users[0]?.totalSubmissions || 1)) * 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-extrabold text-navy dark:text-white">{user.totalSubmissions}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {user.provinces.slice(0, 2).map(p => (
                            <span key={p} className="text-[10px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">{p}</span>
                          ))}
                          {user.provinces.length > 2 && <span className="text-[10px] text-gray-400 font-bold">+{user.provinces.length - 2}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-bold text-navy dark:text-white">{user.brands.length}</span>
                        <span className="text-xs text-gray-400 ml-1">brand{user.brands.length !== 1 ? 's' : ''}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full" style={{ width: `${photoRatio}%` }} />
                          </div>
                          <span className="text-xs font-bold text-purple-600">{photoRatio}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-bold text-navy dark:text-white">{timeAgo(user.lastSubmission)}</p>
                        <p className="text-xs text-gray-400">{formatDate(user.lastSubmission)}</p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-xs font-bold text-[#E41E26] hover:underline"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/50 backdrop-blur-sm p-4" onClick={() => setSelectedUser(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#111C44] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div className={`${getAvatarColor(selectedUser.name)} p-6 text-white`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-extrabold">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold">{selectedUser.name}</h2>
                    {getRank(selectedUser) && (
                      <p className="text-sm font-bold text-white/80 mt-0.5">{getRank(selectedUser)?.label}</p>
                    )}
                    <p className="text-xs text-white/70 mt-1 flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" />
                      Since {formatDate(selectedUser.firstSubmission)}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedUser(null)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Submissions', value: selectedUser.totalSubmissions, icon: <BarChart3 className="w-4 h-4 text-blue-600" />, bg: 'bg-blue-50 dark:bg-blue-900/20' },
                  { label: 'Provinces', value: selectedUser.provinces.length, icon: <MapPin className="w-4 h-4 text-green-600" />, bg: 'bg-green-50 dark:bg-green-900/20' },
                  { label: 'Photos', value: selectedUser.photosCount, icon: <Camera className="w-4 h-4 text-purple-600" />, bg: 'bg-purple-50 dark:bg-purple-900/20' },
                  { label: 'Notes', value: selectedUser.notesCount, icon: <StickyNote className="w-4 h-4 text-amber-500" />, bg: 'bg-amber-50 dark:bg-amber-900/20' },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
                    <div className="flex justify-center mb-2">{s.icon}</div>
                    <p className="text-2xl font-extrabold text-navy dark:text-white">{s.value}</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Provinces */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Coverage Provinces</p>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.provinces.map(p => (
                    <span key={p} className="text-xs font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full">{p}</span>
                  ))}
                </div>
              </div>

              {/* Channels */}
              {selectedUser.channels.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Channels</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.channels.map(c => (
                      <span key={c} className="text-xs font-bold bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 px-3 py-1.5 rounded-full">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent submissions */}
              {userSubmissions.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Recent Submissions</p>
                  <div className="space-y-2">
                    {userSubmissions.map((sub, i) => (
                      <div key={sub.id || i} className="flex items-center justify-between rounded-xl bg-[#F4F7FE] dark:bg-[#0B1437] px-4 py-3">
                        <div>
                          <p className="text-sm font-bold text-navy dark:text-white">{sub.brand_label || sub.brand_code}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{sub.district_label || ''} · {sub.channel_label || ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#E41E26]">${sub.net_price || '—'}</p>
                          <p className="text-xs text-gray-400">{timeAgo(sub.phnom_penh_time || sub.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
