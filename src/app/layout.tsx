import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Trip Planner | Plan Your Next Adventure',
  description: 'An interactive premium trip planner using Mapbox and Supabase',
  manifest: '/manifest.json',
  themeColor: '#f97316',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
