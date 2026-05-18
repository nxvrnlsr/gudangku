'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Lang = 'en' | 'id';

interface LanguageState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      lang: 'en',          // English is the default
      setLang: (lang) => set({ lang }),
    }),
    {
      name: 'gk_lang',     // localStorage key
    }
  )
);
