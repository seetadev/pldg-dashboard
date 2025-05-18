import './globals.css';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Providers } from '@/components/providers/Providers';
import { ErrorBoundary } from '@/components/ErrorBoundary';

import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Developer Engagement Dashboard',
  description:
    'Track developer engagement, technical progress, and collaboration metrics',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <Providers>
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </Providers>
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  );
}
