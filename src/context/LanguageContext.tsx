"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { t, TranslationKey } from '@/utils/translations';

type LanguageContextType = {
  language: string;
  setLanguage: (lang: string) => void;
  translate: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'English',
  setLanguage: () => {},
  translate: (key) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState('English');
  const supabase = createClient();

  useEffect(() => {
    // Initial fetch
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.user_metadata?.language) {
        setLanguageState(data.user.user_metadata.language);
      }
    });

    // Listen to changes from Settings page
    const handleLangUpdate = (e: any) => {
      if (e.detail && e.detail.language) {
        setLanguageState(e.detail.language);
      }
    };
    
    window.addEventListener('language-updated', handleLangUpdate);
    return () => window.removeEventListener('language-updated', handleLangUpdate);
  }, [supabase]);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    // Optionally trigger something else, but DB update is handled in SettingsClient
  };

  const translate = (key: TranslationKey) => {
    return t(language, key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translate }}>
      {children}
    </LanguageContext.Provider>
  );
}
