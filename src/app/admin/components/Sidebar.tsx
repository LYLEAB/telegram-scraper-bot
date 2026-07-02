"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Settings, LogOut, FileText, ChevronLeft, ArrowLeft, Send } from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  const { translate } = useLanguage();

  const menuItems = [
    {
      title: translate('dashboard'),
      icon: <LayoutDashboard className="w-5 h-5" />,
      path: '/admin',
    },
    {
      title: translate('submissions'),
      icon: <FileText className="w-5 h-5" />,
      path: '/admin/submissions',
    },
    {
      title: translate('users'),
      icon: <Users className="w-5 h-5" />,
      path: '/admin/users',
    },
    {
      title: translate('settings'),
      icon: <Settings className="w-5 h-5" />,
      path: '/admin/settings',
    }
  ];

  return (
    <aside
      className={`absolute left-0 top-0 z-50 flex h-screen w-72 flex-col overflow-y-hidden bg-white dark:bg-[#111C44] border-r border-transparent dark:border-gray-800 duration-300 ease-linear lg:static lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* SIDEBAR HEADER */}
      <div className="flex items-center justify-between lg:justify-center px-6 pt-10 pb-8">
        <Link href="/admin" className="flex items-center justify-center w-full">
          {/* Using the original wide logo */}
          <Image 
            src="/logo_transparent.png" 
            alt="Khmer Beverages Logo" 
            width={180} 
            height={50} 
            className="object-contain transition-all"
            priority
          />
        </Link>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="block lg:hidden text-horizon-secondary hover:text-navy"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>
      <div className="h-px bg-gray-100 dark:bg-gray-800 mx-6 mb-6"></div>
      {/* SIDEBAR HEADER */}

      {/* Sidebar Menu */}
      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mt-5 py-4 px-4 lg:mt-9 lg:px-6">
          <div>
            <h3 className="mb-4 ml-4 text-sm font-bold text-navy dark:text-white">{translate('menu')}</h3>
            <ul className="mb-6 flex flex-col gap-1.5">
              {menuItems.map((item, index) => {
                const isActive = pathname === item.path;
                return (
                  <li key={index}>
                    <Link
                      href={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`group relative flex items-center gap-2.5 rounded-lg px-4 py-3 font-bold duration-300 ease-in-out hover:bg-horizon-light dark:hover:bg-[#0B1437] ${
                        isActive ? 'text-navy dark:text-white' : 'text-horizon-secondary'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-brand rounded-l-lg"></span>
                      )}
                      <span className={`${isActive ? 'text-brand' : 'text-horizon-secondary'}`}>
                        {item.icon}
                      </span>
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </div>
    </aside>
  );
}
