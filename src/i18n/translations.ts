// translations — port of lib/translations.dart (en + id). useT() reads the
// current language from the store.
import { useAppStore } from '../state/store';
import type { AppLanguage } from '../models';

type Group = Record<string, string>;
type Dict = Record<'en' | 'id', Record<string, Group>>;

export const translations: Dict = {
  en: {
    sidebar: {
      newSession: 'New Session',
      recentSessions: 'Recent Sessions',
      clearAll: 'Clear All',
      preferences: 'Preferences',
      cancel: 'Cancel',
      delete: 'Delete',
      rename: 'Rename',
      pin: 'Pin',
      signOut: 'Sign Out',
      signOutConfirm: 'Are you sure you want to sign out?',
      memory: 'Memory',
      noMemories: 'No memories yet',
      save: 'Save',
    },
    settings: {
      title: 'Preferences',
      profile: 'User Profile',
      displayName: 'Display Name',
      apiKey: 'Gemini API Key',
      apiPlaceholder: 'Enter your API key...',
      language: 'Language',
      endpoints: 'Custom Endpoints',
      save: 'Save Changes',
      signOut: 'Sign Out',
    },
    chat: {
      placeholder: 'Ask anything or upload a file...',
      thinking: 'Thinking...',
      search: 'Search',
    },
    header: { model: 'Model' },
    tokenUsage: {
      title: 'Token Usage',
      totalTokens: 'Total Tokens',
      inputTokens: 'Input Tokens',
      outputTokens: 'Output Tokens',
      today: 'Today',
      thisWeek: 'This Week',
      thisMonth: 'This Month',
      allTime: 'All Time',
      reset: 'Reset',
      noData: 'No usage data available',
      byModel: 'By Model',
      requests: 'requests',
    },
  },
  id: {
    sidebar: {
      newSession: 'Sesi Baru',
      recentSessions: 'Sesi Terbaru',
      clearAll: 'Hapus Semua',
      preferences: 'Preferensi',
      cancel: 'Batal',
      delete: 'Hapus',
      rename: 'Ubah Nama',
      pin: 'Sematkan',
      signOut: 'Keluar',
      signOutConfirm: 'Apakah Anda yakin ingin keluar?',
      memory: 'Memori',
      noMemories: 'Belum ada memori',
      save: 'Simpan',
    },
    settings: {
      title: 'Preferensi',
      profile: 'Profil Pengguna',
      displayName: 'Nama Tampilan',
      apiKey: 'Kunci API Gemini',
      apiPlaceholder: 'Masukkan kunci API Anda...',
      language: 'Bahasa',
      endpoints: 'Endpoint Kustom',
      save: 'Simpan Perubahan',
      signOut: 'Keluar',
    },
    chat: {
      placeholder: 'Tanya apa saja atau unggah file...',
      thinking: 'Berpikir...',
      search: 'Cari',
    },
    header: { model: 'Model' },
    tokenUsage: {
      title: 'Penggunaan Token',
      totalTokens: 'Total Token',
      inputTokens: 'Token Input',
      outputTokens: 'Token Output',
      today: 'Hari Ini',
      thisWeek: 'Minggu Ini',
      thisMonth: 'Bulan Ini',
      allTime: 'Semua Waktu',
      reset: 'Reset',
      noData: 'Belum ada data penggunaan',
      byModel: 'Per Model',
      requests: 'permintaan',
    },
  },
};

export function translate(language: AppLanguage, group: string, key: string, fallback = ''): string {
  return translations[language]?.[group]?.[key] ?? fallback;
}

export function useT(): (group: string, key: string, fallback?: string) => string {
  const language = useAppStore((s) => s.language);
  return (group, key, fallback = '') => translate(language, group, key, fallback);
}
