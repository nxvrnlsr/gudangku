import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'GudangKu — Sistem Manajemen Stok Gudang',
  description: 'Software manajemen stok gudang untuk distribusi FMCG & sembako skala nasional',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#162033',
              color: '#F1F5F9',
              border: '1px solid #2D4060',
              fontSize: '13px',
              borderRadius: '10px',
            },
            success: { iconTheme: { primary: '#10B981', secondary: '#162033' } },
            error:   { iconTheme: { primary: '#EF4444', secondary: '#162033' } },
          }}
        />
      </body>
    </html>
  );
}
