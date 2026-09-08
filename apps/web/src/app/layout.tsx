import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Toaster } from 'sonner';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'COCO — Autonomous Intelligence Organization',
    template: '%s · COCO',
  },
  description:
    'COCO is an autonomous intelligence organization that accepts human missions, assembles world-class expert agents, and produces verified professional deliverables.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: 'hsl(240 10% 5.9%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'hsl(0 0% 98%)',
            },
          }}
        />
      </body>
    </html>
  );
}
