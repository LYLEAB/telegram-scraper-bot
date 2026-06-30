"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  User, Mail, Bell, Shield, Globe, MonitorSmartphone, 
  Key, Save, Upload, AlertCircle, Camera, Check, 
  Smartphone, Eye, EyeOff, Sun, Moon
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useTheme } from 'next-themes';

type Tab = 'profile' | 'preferences' | 'security' | 'notifications';

export default function SettingsClient() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [user, setUser] = useState<any>(null);
  
  // Profile State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [phone, setPhone] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Preferences State
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = useState('English');
  const [timezone, setTimezone] = useState('Asia/Phnom_Penh');
  
  // Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Notifications State
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [telegramAlerts, setTelegramAlerts] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        setFullName(data.user.user_metadata?.full_name || '');
        setEmail(data.user.email || '');
        setAvatarUrl(data.user.user_metadata?.avatar_url || '');
        setPhone(data.user.user_metadata?.phone || '');
        setLanguage(data.user.user_metadata?.language || 'English');
        setTimezone(data.user.user_metadata?.timezone || 'Asia/Phnom_Penh');
        setEmailAlerts(data.user.user_metadata?.email_alerts ?? true);
        setTelegramAlerts(data.user.user_metadata?.telegram_alerts ?? true);
        setWeeklyReport(data.user.user_metadata?.weekly_report ?? false);
      }
      setIsLoading(false);
    });
  }, [supabase]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        avatar_url: avatarUrl,
        phone: phone,
      }
    });
    setIsSaving(false);
    if (!error) {
      showSuccess('Profile updated successfully!');
    } else {
      alert(error.message);
    }
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        language,
        timezone,
      }
    });
    setIsSaving(false);
    if (!error) {
      showSuccess('Preferences updated successfully!');
    } else {
      alert(error.message);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        email_alerts: emailAlerts,
        telegram_alerts: telegramAlerts,
        weekly_report: weeklyReport,
      }
    });
    setIsSaving(false);
    if (!error) {
      showSuccess('Notification settings updated!');
    } else {
      alert(error.message);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert("New passwords don't match!");
      return;
    }
    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    setIsSaving(false);
    if (!error) {
      showSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      alert(error.message);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.id);
      const res = await fetch('/api/upload-avatar', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) setAvatarUrl(data.url);
      else alert('Upload failed: ' + data.error);
    } catch (err) {
      alert('Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-[#E41E26] border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-[1200px] mx-auto w-full">
      
      {/* Settings Sidebar */}
      <div className="w-full lg:w-64 shrink-0">
        <div className="rounded-2xl bg-white dark:bg-[#111C44] shadow-horizon p-4 sticky top-24">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Settings Menu</h2>
          <nav className="flex flex-col gap-1">
            <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'profile' ? 'bg-[#F4F7FE] dark:bg-[#0B1437] text-navy dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
              <User className={`w-5 h-5 ${activeTab === 'profile' ? 'text-[#E41E26]' : ''}`} /> My Profile
            </button>
            <button onClick={() => setActiveTab('preferences')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'preferences' ? 'bg-[#F4F7FE] dark:bg-[#0B1437] text-navy dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
              <MonitorSmartphone className={`w-5 h-5 ${activeTab === 'preferences' ? 'text-[#E41E26]' : ''}`} /> Preferences
            </button>
            <button onClick={() => setActiveTab('security')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'security' ? 'bg-[#F4F7FE] dark:bg-[#0B1437] text-navy dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
              <Shield className={`w-5 h-5 ${activeTab === 'security' ? 'text-[#E41E26]' : ''}`} /> Security
            </button>
            <button onClick={() => setActiveTab('notifications')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'notifications' ? 'bg-[#F4F7FE] dark:bg-[#0B1437] text-navy dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
              <Bell className={`w-5 h-5 ${activeTab === 'notifications' ? 'text-[#E41E26]' : ''}`} /> Notifications
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {successMsg && (
          <div className="mb-6 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 flex items-center gap-3 text-green-700 dark:text-green-400 font-bold shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-800/50 flex items-center justify-center shrink-0">
              <Check className="w-5 h-5" />
            </div>
            {successMsg}
          </div>
        )}

        <div className="rounded-2xl bg-white dark:bg-[#111C44] shadow-horizon overflow-hidden">
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="animate-in fade-in">
              <div className="border-b border-gray-100 dark:border-gray-800 px-6 py-5">
                <h3 className="text-xl font-extrabold text-navy dark:text-white">Profile Settings</h3>
                <p className="text-sm text-gray-500 font-medium mt-1">Manage your public profile and personal details.</p>
              </div>
              <div className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
                  <div className="relative group cursor-pointer">
                    <div className="w-24 h-24 rounded-2xl bg-gray-100 dark:bg-[#0B1437] border-4 border-white dark:border-[#111C44] shadow-lg flex items-center justify-center overflow-hidden text-2xl font-extrabold text-[#E41E26]">
                      {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : (fullName?.charAt(0) || '?')}
                    </div>
                    <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 w-8 h-8 bg-navy text-white rounded-xl shadow-md flex items-center justify-center hover:bg-[#E41E26] transition">
                      {isUploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="w-4 h-4" />}
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                  </div>
                  <div>
                    <h4 className="font-bold text-navy dark:text-white text-lg">Profile Picture</h4>
                    <p className="text-xs text-gray-400 font-medium">JPEG, PNG or GIF. Max 5MB.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-navy dark:text-white mb-2">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full rounded-xl bg-[#F4F7FE] dark:bg-[#0B1437] py-3 pl-10 pr-4 text-sm font-bold text-navy dark:text-white outline-none focus:ring-2 focus:ring-[#E41E26]/50 transition" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-navy dark:text-white mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="email" value={email} disabled className="w-full rounded-xl bg-gray-100 dark:bg-gray-800 py-3 pl-10 pr-4 text-sm font-bold text-gray-500 cursor-not-allowed" />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Email cannot be changed.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-navy dark:text-white mb-2">Phone Number</label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+855..." className="w-full rounded-xl bg-[#F4F7FE] dark:bg-[#0B1437] py-3 pl-10 pr-4 text-sm font-bold text-navy dark:text-white outline-none focus:ring-2 focus:ring-[#E41E26]/50 transition" />
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button onClick={handleSaveProfile} disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-[#E41E26] py-3 px-6 text-sm font-bold text-white hover:bg-[#C21820] transition shadow-md shadow-red-500/20 disabled:opacity-70 disabled:cursor-not-allowed">
                    {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PREFERENCES TAB */}
          {activeTab === 'preferences' && (
            <div className="animate-in fade-in">
              <div className="border-b border-gray-100 dark:border-gray-800 px-6 py-5">
                <h3 className="text-xl font-extrabold text-navy dark:text-white">Preferences</h3>
                <p className="text-sm text-gray-500 font-medium mt-1">Customize your app experience.</p>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-navy dark:text-white mb-2">Theme</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <button onClick={() => setTheme('light')} className={`border-2 rounded-2xl p-4 flex flex-col items-center gap-2 transition ${theme === 'light' ? 'border-[#E41E26] bg-red-50 dark:bg-red-900/10' : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'}`}>
                      <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center"><Sun className="w-5 h-5 text-yellow-600" /></div>
                      <span className="font-bold text-navy dark:text-white">Light</span>
                    </button>
                    <button onClick={() => setTheme('dark')} className={`border-2 rounded-2xl p-4 flex flex-col items-center gap-2 transition ${theme === 'dark' ? 'border-[#E41E26] bg-red-50 dark:bg-red-900/10' : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'}`}>
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center"><Moon className="w-5 h-5 text-indigo-600" /></div>
                      <span className="font-bold text-navy dark:text-white">Dark</span>
                    </button>
                    <button onClick={() => setTheme('system')} className={`border-2 rounded-2xl p-4 flex flex-col items-center gap-2 transition ${theme === 'system' ? 'border-[#E41E26] bg-red-50 dark:bg-red-900/10' : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'}`}>
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><MonitorSmartphone className="w-5 h-5 text-gray-600 dark:text-gray-300" /></div>
                      <span className="font-bold text-navy dark:text-white">System</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-navy dark:text-white mb-2">Language</label>
                    <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full rounded-xl bg-[#F4F7FE] dark:bg-[#0B1437] py-3 px-4 text-sm font-bold text-navy dark:text-white outline-none focus:ring-2 focus:ring-[#E41E26]/50 cursor-pointer appearance-none">
                      <option value="English">English</option>
                      <option value="Khmer">Khmer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-navy dark:text-white mb-2">Timezone</label>
                    <select value={timezone} onChange={e => setTimezone(e.target.value)} className="w-full rounded-xl bg-[#F4F7FE] dark:bg-[#0B1437] py-3 px-4 text-sm font-bold text-navy dark:text-white outline-none focus:ring-2 focus:ring-[#E41E26]/50 cursor-pointer appearance-none">
                      <option value="Asia/Phnom_Penh">Asia/Phnom_Penh (GMT+7)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                  <button onClick={handleSavePreferences} disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-[#E41E26] py-3 px-6 text-sm font-bold text-white hover:bg-[#C21820] transition shadow-md shadow-red-500/20 disabled:opacity-70 disabled:cursor-not-allowed">
                    {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="animate-in fade-in">
              <div className="border-b border-gray-100 dark:border-gray-800 px-6 py-5">
                <h3 className="text-xl font-extrabold text-navy dark:text-white">Security</h3>
                <p className="text-sm text-gray-500 font-medium mt-1">Update your password and secure your account.</p>
              </div>
              <div className="p-6">
                <div className="max-w-md space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-navy dark:text-white mb-2">Current Password</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full rounded-xl bg-[#F4F7FE] dark:bg-[#0B1437] py-3 pl-10 pr-10 text-sm font-bold text-navy dark:text-white outline-none focus:ring-2 focus:ring-[#E41E26]/50 transition" />
                      <button onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy dark:hover:text-white">
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-navy dark:text-white mb-2">New Password</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full rounded-xl bg-[#F4F7FE] dark:bg-[#0B1437] py-3 pl-10 pr-10 text-sm font-bold text-navy dark:text-white outline-none focus:ring-2 focus:ring-[#E41E26]/50 transition" />
                      <button onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy dark:hover:text-white">
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-navy dark:text-white mb-2">Confirm New Password</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type={showNewPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full rounded-xl bg-[#F4F7FE] dark:bg-[#0B1437] py-3 pl-10 pr-4 text-sm font-bold text-navy dark:text-white outline-none focus:ring-2 focus:ring-[#E41E26]/50 transition" />
                    </div>
                  </div>
                  <button onClick={handleUpdatePassword} disabled={isSaving || !currentPassword || !newPassword || !confirmPassword} className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-navy py-3 px-6 text-sm font-bold text-white hover:bg-navy/90 transition shadow-md disabled:opacity-70 disabled:cursor-not-allowed">
                    {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Shield className="w-4 h-4" />}
                    Update Password
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="animate-in fade-in">
              <div className="border-b border-gray-100 dark:border-gray-800 px-6 py-5">
                <h3 className="text-xl font-extrabold text-navy dark:text-white">Notification Settings</h3>
                <p className="text-sm text-gray-500 font-medium mt-1">Control how you want to be notified.</p>
              </div>
              <div className="p-6 space-y-6">
                
                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-navy dark:text-white">Email Alerts</h4>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">Receive daily summary emails of new submissions.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={emailAlerts} onChange={e => setEmailAlerts(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#E41E26]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-sky-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.94z"/></svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-navy dark:text-white">Telegram Alerts</h4>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">Receive instant alerts in Telegram group for new submissions.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={telegramAlerts} onChange={e => setTelegramAlerts(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#E41E26]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-navy dark:text-white">Weekly Report</h4>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">Receive a PDF report of pricing trends every Monday.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={weeklyReport} onChange={e => setWeeklyReport(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#E41E26]"></div>
                  </label>
                </div>

                <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                  <button onClick={handleSaveNotifications} disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-[#E41E26] py-3 px-6 text-sm font-bold text-white hover:bg-[#C21820] transition shadow-md shadow-red-500/20 disabled:opacity-70 disabled:cursor-not-allowed">
                    {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Notifications
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
