"use client";

import { useState, useEffect, useRef } from 'react';
import { Menu, Search, Bell, Info, Moon, Sun, Settings, LogOut, Check, X, Camera, Globe, MapPin, Send } from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import SubmissionDetailsModal from '../SubmissionDetailsModal';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
}

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = () => {
      supabase.auth.getUser().then(({ data }) => {
        setUser(data.user);
      });
    };
    fetchUser();
    window.addEventListener('profile-updated', fetchUser);
    return () => window.removeEventListener('profile-updated', fetchUser);
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };
  
  // Sync search with AdminDashboard
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    window.dispatchEvent(new CustomEvent('global-search', { detail: val }));
  };

  useEffect(() => {
    const handleDashboardSearch = (e: any) => {
      if (e.detail !== searchQuery) setSearchQuery(e.detail);
    };
    window.addEventListener('dashboard-search', handleDashboardSearch);
    return () => window.removeEventListener('dashboard-search', handleDashboardSearch);
  }, [searchQuery]);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
    
    // Close dropdowns if clicked outside
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setNotifLoading(true);
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    } finally {
      setNotifLoading(false);
    }
  };

  // Fetch on mount and poll every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = async (notif: any) => {
    // 1. Optimistically mark as read
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, unread: false } : n));
    
    // 2. Persist to DB in the background
    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: notif.id }),
    }).catch(e => console.error(e));

    // 3. Fetch the full submission details to open in the modal
    try {
      const res = await fetch(`/api/submissions/${notif.id}`);
      if (res.ok) {
        const fullSubmission = await res.json();
        setSelectedSubmission(fullSubmission);
        setShowNotifications(false); // Close the dropdown automatically
      } else {
        console.error('Failed to fetch full submission');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    });
  };

  const timeAgo = (str: string) => {
    if (!str) return '';
    const diff = Date.now() - new Date(str).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const pathname = usePathname();
  const pageTitle = pathname.includes('/submissions') ? 'Submissions'
    : pathname.includes('/users') ? 'Users'
    : pathname.includes('/settings') ? 'Settings'
    : 'Main Dashboard';

  return (
    <>
      <header className="sticky top-4 z-30 flex w-full items-center justify-between px-4 py-3 md:px-6 2xl:px-11 transition-all duration-300 bg-white/80 dark:bg-[#0B1437]/80 backdrop-blur-xl rounded-2xl">
      
      {/* Left Side: Mobile Menu + Breadcrumbs & Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSidebarOpen(!sidebarOpen);
          }}
          className="z-50 block rounded-lg border border-gray-200 bg-white dark:bg-navy p-2 shadow-sm lg:hidden"
        >
          <Menu className="w-5 h-5 text-gray-500 dark:text-gray-300" />
        </button>
        
        <div className="flex flex-col justify-center">
          <div className="text-[13px] font-medium text-[#A3AED0] mb-1">
            Pages / {pageTitle}
          </div>
          <h1 className="text-[32px] leading-tight font-extrabold text-navy dark:text-white">
            {pageTitle}
          </h1>
        </div>
      </div>
      
      {/* Right Side: The White Pill */}
      <div className="flex items-center gap-4 bg-white/90 dark:bg-[#111C44]/90 backdrop-blur-md rounded-full p-2.5 shadow-horizon relative">
        {/* Search */}
        <div className="flex items-center rounded-full bg-[#F4F7FE] dark:bg-[#0B1437] px-4 py-2.5">
          <Search className="w-4 h-4 text-horizon-secondary" />
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={handleSearchChange}
            className="bg-transparent border-none outline-none text-sm font-medium text-navy dark:text-white ml-2 w-24 sm:w-32 xl:w-48 placeholder:text-[#A3AED0]" 
          />
        </div>
        
        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
            className="relative flex items-center justify-center text-[#A3AED0] hover:text-navy dark:hover:text-white transition p-1"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 flex h-[14px] w-[14px] items-center justify-center rounded-full bg-brand text-[8px] text-white font-bold border-2 border-white dark:border-[#111C44]">
                {unreadCount}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-4 w-96 rounded-2xl bg-white dark:bg-[#111C44] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden" style={{zIndex:999}}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-navy dark:text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="bg-[#E41E26] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount} new</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={fetchNotifications} className="text-xs text-gray-400 hover:text-navy dark:hover:text-white transition" title="Refresh">
                    <svg className={`w-3.5 h-3.5 ${notifLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </button>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-[#E41E26] font-bold hover:underline">Mark all read</button>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="max-h-[420px] overflow-y-auto">
                {notifLoading && notifications.length === 0 ? (
                  <div className="py-10 flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-[#E41E26] border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-gray-400 font-medium">Loading...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-10 flex flex-col items-center gap-2">
                    <Bell className="w-8 h-8 text-gray-200 dark:text-gray-700" />
                    <p className="text-sm text-gray-400 font-semibold">No notifications</p>
                    <p className="text-xs text-gray-300 dark:text-gray-600">New submissions will appear here</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`flex gap-3 px-5 py-3.5 cursor-pointer transition border-b border-gray-50 dark:border-gray-800 last:border-0 ${
                        notif.unread
                          ? 'bg-red-50/40 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20'
                          : 'hover:bg-[#F4F7FE] dark:hover:bg-[#0B1437]'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-navy dark:text-white truncate">{notif.title}</p>
                          {notif.unread && <span className="w-2 h-2 rounded-full bg-[#E41E26] shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {notif.submitter} · {notif.province}
                          {notif.netPrice ? ` · $${notif.netPrice}` : ''}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] text-gray-400 font-medium">{timeAgo(notif.time)}</p>
                          {notif.hasPhoto && <span className="text-[10px] text-purple-500 font-bold">📷 Photo</span>}
                          {notif.hasNote && <span className="text-[10px] text-amber-500 font-bold">📝 Note</span>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 text-center">
                  <p className="text-xs text-gray-400">Showing last {notifications.length} submissions</p>
                </div>
              )}
            </div>
          )}
        </div>

        <button 
          onClick={() => setShowInfo(true)}
          className="hidden sm:flex items-center justify-center p-1 text-[#A3AED0] hover:text-navy dark:hover:text-white transition"
        >
          <Info className="w-5 h-5" />
        </button>

        <button 
          onClick={toggleTheme}
          className="hidden sm:flex items-center justify-center p-1 text-[#A3AED0] hover:text-navy dark:hover:text-white transition"
        >
          {mounted && theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        
        {/* Avatar Dropdown */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
            className="flex h-10 w-10 overflow-hidden shrink-0 items-center justify-center rounded-full bg-[#11047A] dark:bg-brand text-white font-bold text-sm cursor-pointer hover:opacity-90 transition"
          >
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.email ? user.email.charAt(0).toUpperCase() : 'AP'
            )}
          </button>
          
          {showProfile && (
            <div className="absolute right-0 mt-4 w-56 rounded-2xl bg-white dark:bg-[#111C44] p-2 shadow-xl border border-gray-100 dark:border-gray-800">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 mb-1">
                <p className="text-sm font-bold text-navy dark:text-white line-clamp-1">{user?.user_metadata?.full_name || 'Admin Profile'}</p>
                <p className="text-xs text-[#A3AED0] line-clamp-1">{user?.email || 'admin@khmerbeverages.com'}</p>
              </div>
              <button 
                onClick={() => { router.push('/admin/settings'); setShowProfile(false); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-navy dark:text-white hover:bg-[#F4F7FE] dark:hover:bg-[#0B1437] rounded-lg transition"
              >
                <Settings className="w-4 h-4" /> Profile Settings
              </button>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition mt-1"
              >
                <LogOut className="w-4 h-4" /> Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>

    {/* Info Modal Overlay */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#111C44] rounded-3xl w-full max-w-md p-6 relative shadow-2xl">
            <button 
              onClick={() => setShowInfo(false)}
              className="absolute top-4 right-4 p-2 text-[#A3AED0] hover:text-navy dark:hover:text-white bg-[#F4F7FE] dark:bg-[#0B1437] rounded-full transition"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-2xl font-bold text-navy dark:text-white mb-4">Help & Guide</h2>
            <div className="space-y-4">
              <div className="flex gap-3 items-start">
                <div className="bg-brand/10 p-2 rounded-xl text-brand shrink-0"><Search className="w-5 h-5" /></div>
                <div>
                  <h4 className="font-bold text-navy dark:text-white text-sm">Dashboard Filters</h4>
                  <p className="text-xs text-[#A3AED0] mt-1">Use the toolbar above the table to instantly filter data by date, brand, or province.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="bg-brand/10 p-2 rounded-xl text-brand shrink-0"><Sun className="w-5 h-5" /></div>
                <div>
                  <h4 className="font-bold text-navy dark:text-white text-sm">Dark Mode</h4>
                  <p className="text-xs text-[#A3AED0] mt-1">Toggle between light and dark themes using the moon/sun icon in the header.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="bg-brand/10 p-2 rounded-xl text-brand shrink-0"><Check className="w-5 h-5" /></div>
                <div>
                  <h4 className="font-bold text-navy dark:text-white text-sm">Exporting Data</h4>
                  <p className="text-xs text-[#A3AED0] mt-1">Click the "Export Excel" button to download all currently filtered table data.</p>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setShowInfo(false)}
              className="w-full bg-brand text-white font-bold py-3 rounded-xl mt-6 hover:opacity-90 transition shadow-sm"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Submission Details Modal */}
      {selectedSubmission && (
        <SubmissionDetailsModal
          isOpen={true}
          onClose={() => setSelectedSubmission(null)}
          submission={selectedSubmission}
        />
      )}
      {/* End Modals */}
    </>
  );
}
